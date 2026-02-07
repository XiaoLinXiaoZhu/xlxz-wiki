/**
 * 【词条】：定义 语法规则
 * 将 【词条名】：定义内容 转换为 <wiki-definition> 组件标签
 */
import type MarkdownIt from 'markdown-it'

/** HTML 属性转义 */
function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function wikiDefinitionRule(md: MarkdownIt): void {
  // 在 core 阶段处理，在 text 渲染之前将定义行替换
  md.core.ruler.after('inline', 'wiki-definition', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue

      const newChildren: typeof blockToken.children = []

      for (const token of blockToken.children) {
        if (token.type !== 'text' || !token.content) {
          newChildren.push(token)
          continue
        }

        let content = token.content
        // 匹配 【词条】：定义内容（中文冒号或英文冒号）
        const regex = /【([^】]+)】：(.+?)(?=【[^】]+】：|$)/g
        let lastIndex = 0
        let match

        while ((match = regex.exec(content)) !== null) {
          // 匹配前的文本
          if (match.index > lastIndex) {
            const before = new state.Token('text', '', 0)
            before.content = content.slice(lastIndex, match.index)
            newChildren.push(before)
          }

          // 插入组件标签
          const htmlToken = new state.Token('html_inline', '', 0)
          const term = match[1].trim()
          const definition = match[2].trim()
          htmlToken.content = `<wiki-definition term="${escapeAttr(term)}" definition="${escapeAttr(definition)}"></wiki-definition>`
          newChildren.push(htmlToken)

          lastIndex = regex.lastIndex
        }

        if (lastIndex === 0) {
          // 没有匹配，保留原 token
          newChildren.push(token)
        } else if (lastIndex < content.length) {
          // 剩余文本
          const after = new state.Token('text', '', 0)
          after.content = content.slice(lastIndex)
          newChildren.push(after)
        }
      }

      blockToken.children = newChildren
    }
  })
}
