/**
 * %% 公式 %% 语法规则
 * 将 %% 表达式 %% 转换为 <wiki-formula> 组件标签
 *
 * 难点：markdown-it 在 html:true 模式下，会将 <CostUnit> 等类似 HTML 标签的内容
 * 拆分为独立的 html_inline token，导致 %% ... %% 内容被分散到多个 token 中。
 * 本规则在处理前先将 children 合并为完整文本，匹配后重新生成 token 序列。
 */
import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'

/** HTML 属性转义 */
function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function wikiFormulaRule(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'wiki-formula', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue

      // 将所有 children 合并为一个完整的文本，记录每个 token 的边界
      const children = blockToken.children
      const fullText = children.map(t => t.content || '').join('')

      // 快速检查：如果完整文本中不包含 %% 模式则跳过
      if (!fullText.includes('%%')) continue

      // 在合并后的文本上匹配公式
      const formulaRegex = /%%\s*([^%]+?)\s*%%/g
      const formulaRanges: { start: number; end: number; formula: string }[] = []
      let match: RegExpExecArray | null

      while ((match = formulaRegex.exec(fullText)) !== null) {
        formulaRanges.push({
          start: match.index,
          end: match.index + match[0].length,
          formula: match[1].trim(),
        })
      }

      if (formulaRanges.length === 0) continue

      // 重建 token 序列：将公式范围替换为 wiki-formula 组件标签
      const newChildren: Token[] = []
      let pos = 0 // 在 fullText 中的当前位置
      let rangeIdx = 0
      let tokenPos = 0 // 在 children 数组中的当前位置
      let tokenOffset = 0 // 在当前 token 内的偏移

      // 计算每个 token 在 fullText 中的起止位置
      const tokenBounds: { start: number; end: number }[] = []
      let offset = 0
      for (const t of children) {
        const len = (t.content || '').length
        tokenBounds.push({ start: offset, end: offset + len })
        offset += len
      }

      /**
       * 将 fullText 中 [from, to) 范围的内容作为原始 token 输出
       * 需要还原为对应的原始 token 类型（text / html_inline 等）
       */
      function emitOriginalTokens(from: number, to: number) {
        if (from >= to) return
        for (let i = 0; i < children.length; i++) {
          const tb = tokenBounds[i]
          // 计算与 [from, to) 的交集
          const overlapStart = Math.max(from, tb.start)
          const overlapEnd = Math.min(to, tb.end)
          if (overlapStart >= overlapEnd) continue

          const child = children[i]
          const childContent = child.content || ''

          if (overlapStart === tb.start && overlapEnd === tb.end) {
            // 完整输出原 token
            newChildren.push(child)
          } else {
            // 部分输出：截取内容
            const sliceStart = overlapStart - tb.start
            const sliceEnd = overlapEnd - tb.start
            const clone = new state.Token(child.type, child.tag, child.nesting)
            clone.content = childContent.slice(sliceStart, sliceEnd)
            if (clone.content) {
              newChildren.push(clone)
            }
          }
        }
      }

      // 按公式范围分段输出
      let currentPos = 0
      for (const range of formulaRanges) {
        // 公式前的原始内容
        emitOriginalTokens(currentPos, range.start)

        // 公式本身
        const htmlToken = new state.Token('html_inline', '', 0)
        htmlToken.content = `<wiki-formula formula="${escapeAttr(range.formula)}"></wiki-formula>`
        newChildren.push(htmlToken)

        currentPos = range.end
      }

      // 最后剩余的原始内容
      emitOriginalTokens(currentPos, fullText.length)

      blockToken.children = newChildren
    }
  })
}
