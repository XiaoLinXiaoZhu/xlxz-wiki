/**
 * .md 文件解析器
 * 解析 frontmatter（alias, scope）和正文（文件内定义、策划公式）
 */
import matter from 'gray-matter'
import type { WikiTerm, WikiFormula } from '../../shared/types'

/** 单个文件的解析结果 */
export interface ParseResult {
  /** 文件级词条（来自 frontmatter alias） */
  terms: WikiTerm[]
  /** 文件内定义（【词条】：定义） */
  inlineTerms: WikiTerm[]
  /** 策划公式 */
  formulas: WikiFormula[]
  /** 作用域 */
  scope: string
}

/**
 * 解析单个 .md 文件
 * @param content 文件原始内容
 * @param filePath 相对于 wiki-docs/ 的路径
 */
export function parseFile(content: string, filePath: string): ParseResult {
  const { data: frontmatter, content: markdownContent } = matter(content)

  const scope: string = (frontmatter as Record<string, unknown>).scope as string || ''
  const aliases: string[] = (frontmatter as Record<string, unknown>).alias as string[] || []

  // 计算 frontmatter 占用的行数（用于将正文行号映射回原始文件行号）
  const frontmatterLineCount = getFrontmatterLineCount(content)

  const terms = parseAliasTerms(markdownContent, filePath, scope, aliases, frontmatterLineCount)
  const inlineTerms = parseInlineTerms(markdownContent, filePath, scope, frontmatterLineCount)
  const formulas = parseFormulas(markdownContent, filePath, scope, frontmatterLineCount)

  return { terms, inlineTerms, formulas, scope }
}

/**
 * 计算 frontmatter 占用的行数（包含两行 ---）
 * 如果没有 frontmatter 则返回 0
 */
function getFrontmatterLineCount(content: string): number {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('---')) return 0
  const endIndex = trimmed.indexOf('---', 3)
  if (endIndex === -1) return 0
  const frontmatterBlock = trimmed.slice(0, endIndex + 3)
  return frontmatterBlock.split('\n').length
}

/**
 * 从 frontmatter alias 解析文件级词条
 * 使用全文（去除标题/空行/内联定义行）作为定义内容
 * 支持 <!-- more --> 标记截断摘要
 */
function parseAliasTerms(
  content: string,
  filePath: string,
  scope: string,
  aliases: string[],
  frontmatterLineCount: number,
): WikiTerm[] {
  if (aliases.length === 0) return []

  const lines = content.split('\n')
  // 找到第一行有效内容的行号（用于定位）
  let firstContentLine = -1
  const contentLines: string[] = []
  let hasMore = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 检查 <!-- more --> 标记（支持多种格式）
    if (line.trim().match(/^<!--\s*more\s*-->$/i)) {
      hasMore = true
      break
    }
    
    if (
      !line.startsWith('#') &&
      !line.startsWith('---') &&
      line.trim().length > 0 &&
      !line.match(/【[^】]+】：/)
    ) {
      contentLines.push(line)
      if (firstContentLine === -1) {
        firstContentLine = i
      }
    }
  }
  const definition = contentLines.join('\n').trim()
  if (!definition) return []

  const term: WikiTerm = {
    term: aliases[0],
    aliases,
    definition,
    scope,
    filePath,
    definitionType: 'file',
    line: firstContentLine >= 0 ? frontmatterLineCount + firstContentLine + 1 : undefined,
    hasMore,
  }

  return [term]
}

/**
 * 解析文件内定义：【词条】：定义内容
 * 跳过代码块内的内容
 */
function parseInlineTerms(
  content: string,
  filePath: string,
  scope: string,
  frontmatterLineCount: number,
): WikiTerm[] {
  const terms: WikiTerm[] = []
  const lines = content.split('\n')
  let inFence = false
  let fenceMarker = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 处理围栏代码块
    if (toggleFence(line.trim(), { inFence, fenceMarker })) {
      inFence = !inFence
      if (inFence) {
        const match = line.trim().match(/^([`~]{3,})/)
        fenceMarker = match ? match[1][0] : ''
      } else {
        fenceMarker = ''
      }
      continue
    }
    if (inFence) continue

    // 移除行内代码后匹配
    const cleaned = line.replace(/`[^`]*`/g, '')
    const match = cleaned.match(/【([^】]+)】：(.+)/)
    if (match) {
      terms.push({
        term: match[1],
        aliases: [match[1]],
        definition: match[2].trim(),
        scope,
        filePath,
        definitionType: 'inline',
        line: frontmatterLineCount + i + 1,
      })
    }
  }

  return terms
}

/**
 * 解析策划公式：%% 表达式 %%
 * 提取计算值 [xxx] 和设计值 <xxx>
 */
function parseFormulas(
  content: string,
  filePath: string,
  scope: string,
  frontmatterLineCount: number,
): WikiFormula[] {
  const formulas: WikiFormula[] = []
  const lines = content.split('\n')
  let inFence = false
  let fenceMarker = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (toggleFence(line.trim(), { inFence, fenceMarker })) {
      inFence = !inFence
      if (inFence) {
        const match = line.trim().match(/^([`~]{3,})/)
        fenceMarker = match ? match[1][0] : ''
      } else {
        fenceMarker = ''
      }
      continue
    }
    if (inFence) continue

    const cleaned = line.replace(/`[^`]*`/g, '')
    const formulaRegex = /%%\s*([^%]+)\s*%%/g
    let match
    while ((match = formulaRegex.exec(cleaned)) !== null) {
      const expression = match[1].trim()
      formulas.push({
        expression,
        calculatedValues: extractCalculatedValues(expression),
        designValues: extractDesignValues(expression),
        scope,
        filePath,
        line: frontmatterLineCount + i + 1,
      })
    }
  }

  return formulas
}

/** 提取计算值 [xxx] */
export function extractCalculatedValues(formula: string): string[] {
  const matches: string[] = []
  const regex = /\[([^\]]+)\]/g
  let match
  while ((match = regex.exec(formula)) !== null) {
    matches.push(match[1])
  }
  return matches
}

/** 提取设计值 <xxx> */
export function extractDesignValues(formula: string): string[] {
  const matches: string[] = []
  const regex = /<([^>]+)>/g
  let match
  while ((match = regex.exec(formula)) !== null) {
    matches.push(match[1])
  }
  return matches
}

/**
 * 检测围栏代码块的开始/结束
 * 返回 true 表示当前行是围栏标记行
 */
function toggleFence(
  line: string,
  state: { inFence: boolean; fenceMarker: string },
): boolean {
  const fenceMatch = line.match(/^([`~]{3,})/)
  if (!fenceMatch) return false

  const marker = fenceMatch[1][0]
  if (!state.inFence) {
    return true // 进入围栏
  } else if (marker === state.fenceMarker) {
    return true // 离开围栏
  }
  return false
}
