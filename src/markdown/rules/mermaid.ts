/**
 * markdown-it 规则：将 mermaid 代码块转换为 <mermaid-diagram> 组件
 * 
 * 语法：
 * ```mermaid
 * graph TD
 *   A --> B
 * ```
 */
import type MarkdownIt from 'markdown-it'

export function mermaidRule(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options)
  }

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info.trim()

    // 只处理 mermaid 代码块
    if (info === 'mermaid') {
      const code = token.content.trim()
      // 转义代码内容，防止 XSS 和模板解析问题
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      return `<mermaid-diagram code="${escapedCode}"></mermaid-diagram>\n`
    }

    // 其他代码块使用默认渲染
    return defaultFence(tokens, idx, options, env, self)
  }
}
