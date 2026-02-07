/**
 * %% 公式 %% 语法规则
 * 将 %% 表达式 %% 转换为 <wiki-formula> 组件标签
 */
import type MarkdownIt from 'markdown-it'

/** HTML 属性转义 */
function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function wikiFormulaRule(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'wiki-formula', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue

      const newChildren: typeof blockToken.children = []

      for (const token of blockToken.children) {
        if (token.type !== 'text' || !token.content) {
          newChildren.push(token)
          continue
        }

        let content = token.content
        const regex = /%%\s*([^%]+?)\s*%%/g
        let lastIndex = 0
        let match

        while ((match = regex.exec(content)) !== null) {
          if (match.index > lastIndex) {
            const before = new state.Token('text', '', 0)
            before.content = content.slice(lastIndex, match.index)
            newChildren.push(before)
          }

          const htmlToken = new state.Token('html_inline', '', 0)
          const formula = match[1].trim()
          htmlToken.content = `<wiki-formula formula="${escapeAttr(formula)}"></wiki-formula>`
          newChildren.push(htmlToken)

          lastIndex = regex.lastIndex
        }

        if (lastIndex === 0) {
          newChildren.push(token)
        } else if (lastIndex < content.length) {
          const after = new state.Token('text', '', 0)
          after.content = content.slice(lastIndex)
          newChildren.push(after)
        }
      }

      blockToken.children = newChildren
    }
  })
}
