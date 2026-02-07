/**
 * 词条解析器
 * 处理 scope 优先级排序和近似匹配
 */
import type { WikiTerm, WikiIndex } from '@shared/types'

/** 解析结果 */
export interface ResolveResult {
  /** 按优先级排序的匹配定义 */
  definitions: WikiTerm[]
  /** 是否精确匹配 */
  exact: boolean
  /** 近似匹配建议（仅当 exact=false 时有值） */
  suggestions: SuggestionItem[]
}

export interface SuggestionItem {
  term: string
  distance: number
  sources: WikiTerm[]
}

/**
 * 解析词条，按 scope 优先级排序
 *
 * 优先级：
 *   1. 文件内定义（当前文件中 【词条】：定义）
 *   2. 当前 scope 的区域定义
 *   3. 全局定义（scope 为空）
 *   4. 其他 scope 的定义（不主动显示，但显式引用 【scope/词条】 时显示）
 *
 * @param termName 词条名（可能包含 scope 前缀，如 "game2/NPC"）
 * @param index 全局索引
 * @param currentScope 当前文件的 scope
 * @param currentFile 当前文件路径
 */
export function resolveTerm(
  termName: string,
  index: WikiIndex,
  currentScope: string,
  currentFile: string,
): ResolveResult {
  // 处理显式 scope 引用：【scope/词条】
  let explicitScope: string | null = null
  let lookupName = termName

  const slashIndex = termName.indexOf('/')
  if (slashIndex > 0) {
    explicitScope = termName.slice(0, slashIndex)
    lookupName = termName.slice(slashIndex + 1)
  }

  const allDefs = index.terms?.[lookupName]
  if (!allDefs || allDefs.length === 0) {
    // 未找到精确匹配，尝试近似匹配
    return {
      definitions: [],
      exact: false,
      suggestions: findSuggestions(lookupName, index),
    }
  }

  // 按优先级排序
  const sorted = sortByPriority(allDefs, explicitScope, currentScope, currentFile)

  return {
    definitions: sorted,
    exact: true,
    suggestions: [],
  }
}

/**
 * 按 scope 优先级排序定义列表
 */
function sortByPriority(
  defs: WikiTerm[],
  explicitScope: string | null,
  currentScope: string,
  currentFile: string,
): WikiTerm[] {
  return [...defs].sort((a, b) => {
    const pa = getPriority(a, explicitScope, currentScope, currentFile)
    const pb = getPriority(b, explicitScope, currentScope, currentFile)
    return pa - pb // 数字越小优先级越高
  })
}

/**
 * 计算单个定义的优先级数值（越小越高）
 */
function getPriority(
  def: WikiTerm,
  explicitScope: string | null,
  currentScope: string,
  currentFile: string,
): number {
  // 1. 文件内定义（当前文件）
  if (def.definitionType === 'inline' && def.filePath === currentFile) {
    return 0
  }

  // 如果有显式 scope 引用
  if (explicitScope !== null) {
    if (def.scope === explicitScope) return 1
    if (def.scope === '') return 2
    return 3
  }

  // 2. 当前 scope 的区域定义
  if (currentScope && def.scope === currentScope) {
    return 1
  }

  // 3. 全局定义
  if (def.scope === '') {
    return 2
  }

  // 4. 其他 scope 的定义
  return 3
}

/**
 * 过滤定义：根据 scope 规则决定哪些定义应该显示
 *
 * 规则：
 * - 显式引用 【scope/词条】 → 显示该 scope + 全局
 * - 普通引用 【词条】 → 显示文件内定义 + 当前 scope + 全局（不显示其他 scope）
 */
export function filterByScope(
  defs: WikiTerm[],
  explicitScope: string | null,
  currentScope: string,
  currentFile: string,
): WikiTerm[] {
  if (explicitScope !== null) {
    // 显式引用：显示指定 scope + 全局
    return defs.filter(d =>
      d.scope === explicitScope || d.scope === ''
    )
  }

  // 普通引用：文件内定义 + 当前 scope + 全局
  return defs.filter(d =>
    (d.definitionType === 'inline' && d.filePath === currentFile) ||
    (currentScope && d.scope === currentScope) ||
    d.scope === ''
  )
}

// ─── 近似匹配 ─────────────────────────────────────────────

/** 最大建议数量 */
const MAX_SUGGESTIONS = 5

/** 最大编辑距离阈值（超过此值不作为建议） */
const MAX_DISTANCE = 3

/**
 * 查找近似匹配的词条
 */
function findSuggestions(
  query: string,
  index: WikiIndex,
): SuggestionItem[] {
  if (!index.terms) return []

  const candidates: SuggestionItem[] = []

  for (const [alias, terms] of Object.entries(index.terms)) {
    const dist = levenshteinDistance(query, alias)
    if (dist > 0 && dist <= MAX_DISTANCE) {
      candidates.push({ term: alias, distance: dist, sources: terms })
    }
  }

  // 按编辑距离排序，取前 N 个
  candidates.sort((a, b) => a.distance - b.distance)
  return candidates.slice(0, MAX_SUGGESTIONS)
}

/**
 * Levenshtein 编辑距离
 * 支持中文字符（按字符计算，非字节）
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length

  // 快速路径
  if (m === 0) return n
  if (n === 0) return m
  if (a === b) return 0

  // 使用单行 DP 优化空间
  const prev = new Array<number>(n + 1)
  const curr = new Array<number>(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,      // 删除
        curr[j - 1] + 1,  // 插入
        prev[j - 1] + cost // 替换
      )
    }
    // 交换 prev 和 curr
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }

  return prev[n]
}
