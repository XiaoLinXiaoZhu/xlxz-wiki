/**
 * Wiki 自定义节点：wiki_term（词条引用）、wiki_definition（文件内定义）、wiki_formula（策划公式）
 *
 * 每个节点定义包含：
 * - ProseMirror NodeSpec（toDOM / parseDOM / attrs）
 * - parseMarkdown — 从 MDAST 自定义节点 → ProseMirror 节点
 * - toMarkdown — 从 ProseMirror 节点 → Markdown 文本
 *
 * 使用 ProseMirror Plugin 实时检测并替换文本中的自定义语法（解决 IME 输入问题）
 */
import { $node, $remark, $prose } from '@milkdown/kit/utils'
import { Editor } from '@milkdown/kit/core'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { NodeSchema } from '@milkdown/kit/transformer'
import type { Node as PmNode } from '@milkdown/kit/prose/model'
import { remarkWikiSyntax } from './remark-wiki-syntax'

// ─── Remark 插件注册 ─────────────────────────────────────────

/** 注册 remark 插件，在 MDAST 层面解析自定义语法 */
export const wikiRemarkPlugin = $remark('wiki-syntax', () => remarkWikiSyntax)

// ─── wiki_term 节点 ──────────────────────────────────────────

export const wikiTermNode = $node('wiki_term', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    term: { default: '' },
  },
  toDOM: (node) => [
    'span',
    {
      class: 'wiki-term-editor',
      'data-type': 'wiki-term',
      'data-term': node.attrs.term,
      contenteditable: 'false',
    },
    `【${node.attrs.term}】`,
  ],
  parseDOM: [
    {
      tag: 'span[data-type="wiki-term"]',
      getAttrs: (dom) => ({
        term: (dom as HTMLElement).getAttribute('data-term') || '',
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'wikiTerm',
    runner: (state, node, type) => {
      const term = (node as any).data?.term || ''
      state.addNode(type, { term })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'wiki_term',
    runner: (state, node) => {
      state.addNode('text', undefined, `【${node.attrs.term}】`)
    },
  },
} satisfies NodeSchema))

// ─── wiki_definition 节点 ────────────────────────────────────

export const wikiDefinitionNode = $node('wiki_definition', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    term: { default: '' },
    definition: { default: '' },
  },
  toDOM: (node) => [
    'span',
    {
      class: 'wiki-definition-editor',
      'data-type': 'wiki-definition',
      'data-term': node.attrs.term,
      'data-definition': node.attrs.definition,
      contenteditable: 'false',
    },
    `【${node.attrs.term}】：${node.attrs.definition}`,
  ],
  parseDOM: [
    {
      tag: 'span[data-type="wiki-definition"]',
      getAttrs: (dom) => ({
        term: (dom as HTMLElement).getAttribute('data-term') || '',
        definition: (dom as HTMLElement).getAttribute('data-definition') || '',
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'wikiDefinition',
    runner: (state, node, type) => {
      const data = (node as any).data || {}
      state.addNode(type, { term: data.term || '', definition: data.definition || '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'wiki_definition',
    runner: (state, node) => {
      state.addNode('text', undefined, `【${node.attrs.term}】：${node.attrs.definition}`)
    },
  },
} satisfies NodeSchema))

// ─── wiki_formula 节点 ───────────────────────────────────────

export const wikiFormulaNode = $node('wiki_formula', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    formula: { default: '' },
  },
  toDOM: (node) => [
    'span',
    {
      class: 'wiki-formula-editor',
      'data-type': 'wiki-formula',
      'data-formula': node.attrs.formula,
      contenteditable: 'false',
    },
    `%% ${node.attrs.formula} %%`,
  ],
  parseDOM: [
    {
      tag: 'span[data-type="wiki-formula"]',
      getAttrs: (dom) => ({
        formula: (dom as HTMLElement).getAttribute('data-formula') || '',
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'wikiFormula',
    runner: (state, node, type) => {
      const formula = (node as any).data?.formula || ''
      state.addNode(type, { formula })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'wiki_formula',
    runner: (state, node) => {
      state.addNode('text', undefined, `%% ${node.attrs.formula} %%`)
    },
  },
} satisfies NodeSchema))

// ─── 实时替换插件（替代 InputRule，解决 IME 输入问题） ──────────

/**
 * ProseMirror 插件：在每次事务后扫描文本节点，
 * 将匹配的 Wiki 语法替换为对应的自定义节点。
 *
 * 这比 InputRule 更可靠，因为：
 * 1. 不依赖 input 事件（IME 输入法兼容）
 * 2. 在任何文本变更后都会检查（粘贴、撤销等）
 */
const wikiReplaceKey = new PluginKey('wiki-replace')

export const wikiReplacePlugin = $prose(() => {
  return new Plugin({
    key: wikiReplaceKey,
    appendTransaction(transactions, _oldState, newState) {
      // 只在文档内容变更时处理
      const docChanged = transactions.some(tr => tr.docChanged)
      if (!docChanged) return null

      const { tr, schema } = newState
      let modified = false

      // 扫描所有文本节点
      newState.doc.descendants((node: PmNode, pos: number) => {
        if (!node.isText || !node.text) return

        const text = node.text

        // 跳过不包含任何自定义语法的文本
        if (!text.includes('【') && !text.includes('%%')) return

        // 按优先级匹配：公式 > 定义 > 词条引用
        // 找到第一个匹配并替换（每次事务只替换一个，避免位置偏移问题）
        const patterns: Array<{
          regex: RegExp
          create: (match: RegExpExecArray) => PmNode | null
        }> = [
          {
            // %% 公式 %%
            regex: /%%\s*([^%]+?)\s*%%/,
            create: (m) => {
              const formula = m[1].trim()
              return schema.nodes.wiki_formula?.create({ formula }) ?? null
            },
          },
          {
            // 【词条】：定义（中文冒号）
            regex: /【([^】]+)】：([^\n【]+)/,
            create: (m) => {
              const term = m[1].trim()
              const definition = m[2].trim()
              return schema.nodes.wiki_definition?.create({ term, definition }) ?? null
            },
          },
          {
            // 【词条】（不跟冒号）
            regex: /【([^】{}]+)】(?!：)/,
            create: (m) => {
              const term = m[1].trim()
              return schema.nodes.wiki_term?.create({ term }) ?? null
            },
          },
        ]

        for (const { regex, create } of patterns) {
          const match = regex.exec(text)
          if (match) {
            const newNode = create(match)
            if (newNode) {
              const from = pos + match.index
              const to = from + match[0].length
              tr.replaceWith(from, to, newNode)
              modified = true
              return false // 停止遍历，因为位置已经变了
            }
          }
        }
      })

      return modified ? tr : null
    },
  })
})

// ─── 导出所有插件（供编辑器 .use() 注册） ─────────────────────

/** 注册所有 Wiki 自定义插件到编辑器 */
export function useWikiPlugins(editor: ReturnType<typeof Editor.make>) {
  return editor
    .use(wikiRemarkPlugin)
    .use(wikiTermNode)
    .use(wikiDefinitionNode)
    .use(wikiFormulaNode)
    .use(wikiReplacePlugin)
}
