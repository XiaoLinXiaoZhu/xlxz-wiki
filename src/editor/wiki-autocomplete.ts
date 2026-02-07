/**
 * Wiki 自动补全插件
 *
 * 检测用户输入「【」后，通过 CustomEvent 通知 Vue 组件弹出补全菜单。
 * 使用 Transaction 监听（view.update）而非 handleTextInput，确保 IME 输入兼容。
 */
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

export const autocompletePluginKey = new PluginKey('wiki-autocomplete')

const TRIGGER_CHAR = '【'
const CLOSE_CHAR = '】'

/** 自动补全状态（通过 CustomEvent 传递给 Vue 组件） */
export interface AutocompleteState {
  active: boolean
  /** 【后面用户继续输入的过滤文本 */
  query: string
  /** 【字符在文档中的绝对位置 */
  triggerPos: number
  /** 光标的屏幕坐标，用于定位弹窗 */
  cursorCoords: { left: number; top: number; bottom: number } | null
}

/**
 * 检测光标前是否处于自动补全状态：
 * 光标前存在未闭合的「【」，且中间无换行
 */
function detectAutocomplete(
  view: EditorView,
): Omit<AutocompleteState, 'cursorCoords'> | null {
  const { state } = view
  const { selection } = state

  // 只处理光标（非选区）
  if (!selection.empty) return null

  const $pos = selection.$from
  const parentOffset = $pos.parentOffset

  // 获取光标前最多 50 个字符
  const lookBack = Math.min(parentOffset, 50)
  const textBefore = $pos.parent.textBetween(
    parentOffset - lookBack,
    parentOffset,
    null,
    '\ufffc',
  )

  // 查找最后一个【
  const triggerIndex = textBefore.lastIndexOf(TRIGGER_CHAR)
  if (triggerIndex === -1) return null

  const afterTrigger = textBefore.slice(triggerIndex + TRIGGER_CHAR.length)

  // 如果【后面已有】，说明已闭合，不触发
  if (afterTrigger.includes(CLOSE_CHAR)) return null

  // 如果【后面有换行，不触发
  if (afterTrigger.includes('\n')) return null

  // 计算【在文档中的绝对位置
  const absoluteTriggerPos =
    $pos.pos - (textBefore.length - triggerIndex)

  return {
    active: true,
    query: afterTrigger,
    triggerPos: absoluteTriggerPos,
  }
}

/** 上一次派发的状态，避免重复派发相同事件 */
let lastActive = false
let lastQuery = ''

/**
 * ProseMirror 插件：检测【触发并派发 CustomEvent
 */
export const wikiAutocompletePlugin = $prose(() => {
  return new Plugin({
    key: autocompletePluginKey,

    view() {
      return {
        update(view: EditorView) {
          const result = detectAutocomplete(view)

          if (!result) {
            if (lastActive) {
              lastActive = false
              lastQuery = ''
              dispatchState(view, {
                active: false,
                query: '',
                triggerPos: 0,
                cursorCoords: null,
              })
            }
            return
          }

          // 只在状态变化时派发
          if (result.active === lastActive && result.query === lastQuery) {
            return
          }

          lastActive = result.active
          lastQuery = result.query

          // 获取光标屏幕坐标
          const coords = view.coordsAtPos(view.state.selection.from)

          dispatchState(view, {
            active: true,
            query: result.query,
            triggerPos: result.triggerPos,
            cursorCoords: {
              left: coords.left,
              top: coords.top,
              bottom: coords.bottom,
            },
          })
        },

        destroy() {
          lastActive = false
          lastQuery = ''
        },
      }
    },
  })
})

/** 通过 CustomEvent 将状态传递给 Vue 组件 */
function dispatchState(view: EditorView, state: AutocompleteState) {
  view.dom.dispatchEvent(
    new CustomEvent('wiki-autocomplete', {
      detail: state,
      bubbles: true,
    }),
  )
}
