/**
 * markdown-it 实例配置
 * 注册自定义语法规则，将 Wiki 语法转换为 Vue 组件标签
 */
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import { wikiTermRule } from './rules/wiki-term'
import { wikiDefinitionRule } from './rules/wiki-definition'
import { wikiFormulaRule } from './rules/wiki-formula'
import { mermaidRule } from './rules/mermaid'

/**
 * 给块级元素注入 data-line 属性的插件
 * 利用 markdown-it token 的 map 属性（记录源码行号范围）
 * @param lineOffset frontmatter 占用的行数，用于将正文行号映射回原始文件行号
 */
function injectLineNumbers(md: MarkdownIt, lineOffset: number): void {
  const defaultOpen = (tokens: any[], idx: number, options: any, _env: any, self: any) =>
    self.renderToken(tokens, idx, options)

  // 需要注入行号的块级 token 类型
  const blockTypes = ['paragraph_open', 'heading_open', 'blockquote_open', 'list_item_open', 'table_open', 'hr']

  for (const type of blockTypes) {
    const original = md.renderer.rules[type] || defaultOpen
    md.renderer.rules[type] = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      if (token.map && token.map.length >= 1) {
        // map[0] 是 0-based 的正文行号，加上偏移和 1 得到原始文件的 1-based 行号
        token.attrSet('data-line', String(token.map[0] + lineOffset + 1))
      }
      return original(tokens, idx, options, env, self)
    }
  }
}

/**
 * 创建配置好的 markdown-it 实例
 * @param lineOffset frontmatter 行数偏移（默认 0）
 */
export function createMarkdownRenderer(lineOffset: number = 0): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
  })

  // 注入行号属性（用于跳转定位）
  injectLineNumbers(md, lineOffset)

  // 启用任务列表（checkbox）支持
  md.use(taskLists, { enabled: true, label: true, labelAfter: true })

  // 注册自定义渲染规则（顺序重要：先定义后引用）
  wikiFormulaRule(md)
  wikiDefinitionRule(md)
  wikiTermRule(md)
  mermaidRule(md)

  return md
}
