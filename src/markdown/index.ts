/**
 * markdown-it 实例配置
 * 注册自定义语法规则，将 Wiki 语法转换为 Vue 组件标签
 */
import MarkdownIt from 'markdown-it'
import { wikiTermRule } from './rules/wiki-term'
import { wikiDefinitionRule } from './rules/wiki-definition'
import { wikiFormulaRule } from './rules/wiki-formula'

/**
 * 创建配置好的 markdown-it 实例
 */
export function createMarkdownRenderer(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
  })

  // 注册自定义渲染规则（顺序重要：先定义后引用）
  wikiFormulaRule(md)
  wikiDefinitionRule(md)
  wikiTermRule(md)

  return md
}
