/**
 * 全局悬停卡片栈管理
 * 管理嵌套悬停卡片的打开/关闭、层级、延迟关闭
 */
import { ref, type Ref } from 'vue'

export interface HoverCardState {
  /** 唯一标识 */
  id: string
  /** 词条名 */
  term: string
  /** 触发元素的位置 */
  triggerRect: DOMRect
  /** 嵌套层级（从 0 开始） */
  level: number
  /** 父卡片 ID（null 表示顶层） */
  parentId: string | null
}

export interface HoverCardPosition {
  x: number
  y: number
  placement: 'top' | 'bottom'
}

// ─── 全局单例状态 ─────────────────────────────────────────

/** 卡片栈 */
const cards: Ref<HoverCardState[]> = ref([])

/** 当前鼠标悬停的卡片 ID 集合 */
const hoveringCardIds = new Set<string>()

/** 延迟关闭定时器 */
const closeTimers = new Map<string, number>()

/** ID 计数器 */
let idCounter = 0

/** 关闭延迟（ms） */
const CLOSE_DELAY = 150

/** 最大嵌套层级 */
const MAX_LEVEL = 5

/** 基础 z-index */
const BASE_Z_INDEX = 1000

// ─── 内部工具 ─────────────────────────────────────────────

function generateId(): string {
  return `hc-${++idCounter}`
}

/** 获取卡片的所有后代 ID */
function getDescendantIds(cardId: string): Set<string> {
  const descendants = new Set<string>()
  const queue = [cardId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const card of cards.value) {
      if (card.parentId === current && !descendants.has(card.id)) {
        descendants.add(card.id)
        queue.push(card.id)
      }
    }
  }

  return descendants
}

/** 检查卡片或其后代是否正在被悬停 */
function isHoveringCardOrDescendants(cardId: string): boolean {
  if (hoveringCardIds.has(cardId)) return true

  const descendants = getDescendantIds(cardId)
  for (const id of descendants) {
    if (hoveringCardIds.has(id)) return true
  }

  return false
}

/** 关闭卡片及其所有后代 */
function closeCardAndDescendants(cardId: string): void {
  const descendants = getDescendantIds(cardId)
  const toClose = new Set([cardId, ...descendants])

  // 清理定时器和悬停状态
  for (const id of toClose) {
    const timer = closeTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      closeTimers.delete(id)
    }
    hoveringCardIds.delete(id)
  }

  cards.value = cards.value.filter(c => !toClose.has(c.id))
}

// ─── 公开 API ─────────────────────────────────────────────

export function useHoverCards() {
  /**
   * 打开一个悬停卡片
   * @returns 新卡片的 ID，如果超过最大层级则返回 null
   */
  function openCard(
    term: string,
    triggerEl: HTMLElement,
    parentCardId: string | null = null
  ): string | null {
    // 计算层级
    let level = 0
    if (parentCardId) {
      const parent = cards.value.find(c => c.id === parentCardId)
      if (parent) {
        level = parent.level + 1
      }
    }

    // 超过最大层级，不打开
    if (level >= MAX_LEVEL) return null

    // 如果同一个父卡片下已经有打开的卡片，先关闭它们
    // （同一层级只保留一个卡片）
    const siblingsToClose = cards.value.filter(
      c => c.parentId === parentCardId && c.level === level
    )
    for (const sibling of siblingsToClose) {
      closeCardAndDescendants(sibling.id)
    }

    const id = generateId()
    const triggerRect = triggerEl.getBoundingClientRect()

    cards.value.push({
      id,
      term,
      triggerRect,
      level,
      parentId: parentCardId,
    })

    return id
  }

  /**
   * 请求关闭卡片（延迟执行，可被取消）
   */
  function requestClose(cardId: string): void {
    if (closeTimers.has(cardId)) return

    const timer = window.setTimeout(() => {
      closeTimers.delete(cardId)
      if (!isHoveringCardOrDescendants(cardId)) {
        closeCardAndDescendants(cardId)
      }
    }, CLOSE_DELAY)

    closeTimers.set(cardId, timer)
  }

  /**
   * 取消关闭请求（鼠标进入卡片时调用）
   */
  function cancelClose(cardId: string): void {
    const timer = closeTimers.get(cardId)
    if (timer) {
      clearTimeout(timer)
      closeTimers.delete(cardId)
    }
    // 同时取消所有祖先的关闭请求
    let current = cards.value.find(c => c.id === cardId)
    while (current?.parentId) {
      const parentTimer = closeTimers.get(current.parentId)
      if (parentTimer) {
        clearTimeout(parentTimer)
        closeTimers.delete(current.parentId)
      }
      current = cards.value.find(c => c.id === current!.parentId)
    }
  }

  /**
   * 标记鼠标进入卡片
   */
  function enterCard(cardId: string): void {
    hoveringCardIds.add(cardId)
    cancelClose(cardId)
  }

  /**
   * 标记鼠标离开卡片
   */
  function leaveCard(cardId: string): void {
    hoveringCardIds.delete(cardId)
    requestClose(cardId)
  }

  /**
   * 关闭所有卡片
   */
  function closeAll(): void {
    for (const [, timer] of closeTimers) {
      clearTimeout(timer)
    }
    closeTimers.clear()
    hoveringCardIds.clear()
    cards.value = []
  }

  /**
   * 计算卡片位置（处理边界翻转）
   */
  function calculatePosition(
    triggerRect: DOMRect,
    cardWidth: number,
    cardHeight: number
  ): HoverCardPosition {
    const MARGIN = 8
    const vpWidth = window.innerWidth
    const vpHeight = window.innerHeight

    // 默认显示在下方
    let placement: 'top' | 'bottom' = 'bottom'
    let x = triggerRect.left
    let y = triggerRect.bottom + MARGIN

    // 下方空间不足 → 翻转到上方
    if (y + cardHeight > vpHeight && triggerRect.top - cardHeight - MARGIN > 0) {
      placement = 'top'
      y = triggerRect.top - cardHeight - MARGIN
    }

    // 水平边界处理
    if (x + cardWidth > vpWidth - MARGIN) {
      x = vpWidth - cardWidth - MARGIN
    }
    if (x < MARGIN) {
      x = MARGIN
    }

    return { x, y, placement }
  }

  /**
   * 获取卡片的 z-index
   */
  function getZIndex(level: number): number {
    return BASE_Z_INDEX + level
  }

  return {
    cards,
    openCard,
    requestClose,
    cancelClose,
    enterCard,
    leaveCard,
    closeAll,
    calculatePosition,
    getZIndex,
  }
}
