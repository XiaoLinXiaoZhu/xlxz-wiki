/**
 * Wiki 编辑器插件：纯 Decoration 方案
 *
 * 文档中存储纯文本（【词条】、【词条】：定义、%% 公式 %%），
 * 通过 ProseMirror Decoration 提供视觉高亮。
 *
 * 优势：
 * - 文本完全可编辑，无 IME 输入问题
 * - 序列化无需额外处理（文本本身就是原始语法）
 * - 装饰实时跟随文本变化
 */
import { $prose } from '@milkdown/kit/utils'
import { Editor } from '@milkdown/kit/core'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { Node as PmNode } from '@milkdown/kit/prose/model'

const wikiDecorationKey = new PluginKey('wiki-decoration')

/**
 * 扫描文档中的所有文本节点，为匹配的 Wiki 语法创建 Decoration
 */
function buildDecorations(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return

    const text = node.text

    // 快速跳过不包含任何自定义语法的文本
    if (!text.includes('【') && !text.includes('%%')) return

    // 记录已被覆盖的范围，避免重复装饰
    const covered: Array<[number, number]> = []

    // 1. 公式 %% ... %%
    const formulaRe = /%%\s*([^%]+?)\s*%%/g
    let match: RegExpExecArray | null
    while ((match = formulaRe.exec(text)) !== null) {
      const from = pos + match.index
      const to = from + match[0].length
      decorations.push(
        Decoration.inline(from, to, {
          class: 'wiki-formula-highlight',
        }),
      )
      covered.push([from, to])
    }

    // 2. 定义 【词条】：定义内容
    const defRe = /【([^】]+)】：([^\n【]+)/g
    while ((match = defRe.exec(text)) !== null) {
      const from = pos + match.index
      const to = from + match[0].length
      decorations.push(
        Decoration.inline(from, to, {
          class: 'wiki-definition-highlight',
        }),
      )
      covered.push([from, to])
    }

    // 3. 词条引用 【词条】（不跟冒号）
    const termRe = /【([^】{}]+)】(?!：)/g
    while ((match = termRe.exec(text)) !== null) {
      const from = pos + match.index
      const to = from + match[0].length
      // 检查是否已被定义或公式覆盖
      const alreadyCovered = covered.some(
        ([cf, ct]) => from >= cf && to <= ct,
      )
      if (!alreadyCovered) {
        decorations.push(
          Decoration.inline(from, to, {
            class: 'wiki-term-highlight',
          }),
        )
      }
    }
  })

  return DecorationSet.create(doc, decorations)
}

/**
 * ProseMirror 插件：为 Wiki 语法提供实时视觉装饰
 */
export const wikiDecorationPlugin = $prose(() => {
  return new Plugin({
    key: wikiDecorationKey,
    state: {
      init(_, state) {
        return buildDecorations(state.doc)
      },
      apply(tr, decorations, _oldState, newState) {
        if (tr.docChanged) {
          return buildDecorations(newState.doc)
        }
        return decorations.map(tr.mapping, tr.doc)
      },
    },
    props: {
      decorations(state) {
        return this.getState(state)
      },
    },
  })
})

/** 注册所有 Wiki 编辑器插件 */
export function useWikiPlugins(editor: ReturnType<typeof Editor.make>) {
  return editor.use(wikiDecorationPlugin)
}
