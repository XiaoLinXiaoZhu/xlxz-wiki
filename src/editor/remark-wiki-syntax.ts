/**
 * Remark 插件：解析 Wiki 自定义语法到 MDAST 节点
 *
 * 处理三种语法：
 * 1. 【词条】：定义内容  → wikiDefinition 节点
 * 2. 【词条】            → wikiTerm 节点
 * 3. %% 公式 %%         → wikiFormula 节点
 *
 * 使用 @milkdown/kit/transformer 的类型，避免直接依赖 mdast/unified
 */
import type { RemarkPluginRaw, MarkdownNode } from '@milkdown/kit/transformer'

/**
 * 遍历 MDAST 树，对文本节点执行 visitor
 */
function visitTextNodes(
  node: MarkdownNode,
  visitor: (textNode: MarkdownNode, index: number, parent: MarkdownNode) => void,
): void {
  if (node.children && Array.isArray(node.children)) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]
      if (child.type === 'text') {
        visitor(child, i, node)
      } else {
        visitTextNodes(child, visitor)
      }
    }
  }
}

/**
 * 将文本中的自定义语法拆分为混合节点数组
 */
function splitTextToNodes(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = []
  let remaining = text

  while (remaining.length > 0) {
    // 三种模式的正则
    const formulaRe = /%%\s*([^%]+?)\s*%%/
    const defRe = /【([^】]+)】：([^\n【]+)/
    const termRe = /【([^】{}]+)】(?!：)/

    const formulaMatch = formulaRe.exec(remaining)
    const defMatch = defRe.exec(remaining)
    const termMatch = termRe.exec(remaining)

    // 找最早出现的匹配
    interface Candidate { type: string; index: number; length: number; groups: string[] }
    const candidates: Candidate[] = []

    if (formulaMatch) {
      candidates.push({
        type: 'formula',
        index: formulaMatch.index,
        length: formulaMatch[0].length,
        groups: [formulaMatch[1].trim()],
      })
    }
    if (defMatch) {
      candidates.push({
        type: 'definition',
        index: defMatch.index,
        length: defMatch[0].length,
        groups: [defMatch[1].trim(), defMatch[2].trim()],
      })
    }
    if (termMatch) {
      candidates.push({
        type: 'term',
        index: termMatch.index,
        length: termMatch[0].length,
        groups: [termMatch[1].trim()],
      })
    }

    if (candidates.length === 0) {
      if (remaining) {
        nodes.push({ type: 'text', value: remaining } as MarkdownNode)
      }
      break
    }

    candidates.sort((a, b) => a.index - b.index)
    const best = candidates[0]

    // 匹配前的文本
    if (best.index > 0) {
      nodes.push({ type: 'text', value: remaining.slice(0, best.index) } as MarkdownNode)
    }

    // 创建自定义节点
    if (best.type === 'formula') {
      nodes.push({
        type: 'wikiFormula',
        value: `%% ${best.groups[0]} %%`,
        data: { formula: best.groups[0] },
      } as unknown as MarkdownNode)
    } else if (best.type === 'definition') {
      nodes.push({
        type: 'wikiDefinition',
        value: `【${best.groups[0]}】：${best.groups[1]}`,
        data: { term: best.groups[0], definition: best.groups[1] },
      } as unknown as MarkdownNode)
    } else {
      nodes.push({
        type: 'wikiTerm',
        value: `【${best.groups[0]}】`,
        data: { term: best.groups[0] },
      } as unknown as MarkdownNode)
    }

    remaining = remaining.slice(best.index + best.length)
  }

  return nodes
}

/**
 * Remark 插件：将文本中的 Wiki 语法解析为自定义 MDAST 节点
 */
export const remarkWikiSyntax: RemarkPluginRaw<Record<string, never>> = () => {
  return (tree) => {
    visitTextNodes(tree as MarkdownNode, (textNode, index, parent) => {
      const text = textNode.value as string | undefined
      if (!text) return

      // 快速检查
      if (!text.includes('【') && !text.includes('%%')) return

      const newNodes = splitTextToNodes(text)

      // 没有变化则跳过
      if (newNodes.length === 1 && newNodes[0].type === 'text' && (newNodes[0] as any).value === text) {
        return
      }

      // 替换原节点
      parent.children!.splice(index, 1, ...newNodes)
    })
  }
}
