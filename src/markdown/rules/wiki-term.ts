/**
 * 【词条】引用语法规则
 * 将 【词条名】 转换为 <wiki-term term="词条名"></wiki-term>
 * 注意：不匹配 【词条】：定义 格式（由 wiki-definition 规则处理）
 */
import type MarkdownIt from 'markdown-it'

/** HTML 属性转义 */
function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function wikiTermRule(md: MarkdownIt): void {
  const origText = md.renderer.rules.text

  md.renderer.rules.text = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    let content = token.content || ''
    if (!content) {
      return origText ? origText(tokens, idx, options, env, self) : ''
    }

    // 保护已插入的组件标签，避免嵌套替换
    const placeholders: string[] = []
    content = content.replace(/<wiki-(?:definition|formula)[^>]*>.*?<\/wiki-(?:definition|formula)>/g, (m) => {
      const key = `__PLACEHOLDER_${placeholders.length}__`
      placeholders.push(m)
      return key
    })

    // 匹配 【词条】（不跟冒号，排除已被 definition 规则处理的）
    content = content.replace(/【([^】{}]+)】(?!：)/g, (_m, term: string) => {
      return `<wiki-term term="${escapeAttr(term.trim())}"></wiki-term>`
    })

    // 恢复占位
    content = content.replace(/__PLACEHOLDER_(\d+)__/g, (_m, i: string) => placeholders[Number(i)] || '')

    return content
  }
}
