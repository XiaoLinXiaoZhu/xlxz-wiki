/** 词条定义 */
export interface WikiTerm {
  /** 词条的规范名称 */
  term: string
  /** 所有别名（包含 term 本身） */
  aliases: string[]
  /** 定义内容（Markdown 格式） */
  definition: string
  /** 作用域（空字符串表示全局） */
  scope: string
  /** 来源文件路径（相对于 wiki-docs/） */
  filePath: string
  /** 定义类型 */
  definitionType: 'file' | 'inline'
  /** 定义所在行号（原始文件中的行号，1-based） */
  line?: number
  /** 是否有更多内容（文件定义模式下，存在 <!-- more --> 标记时为 true） */
  hasMore?: boolean
}

/** 策划公式 */
export interface WikiFormula {
  /** 原始表达式 */
  expression: string
  /** 计算值列表（[xxx] 中的 xxx） */
  calculatedValues: string[]
  /** 设计值列表（<xxx> 中的 xxx） */
  designValues: string[]
  /** 作用域 */
  scope: string
  /** 来源文件路径 */
  filePath: string
  /** 公式所在行号（原始文件中的行号，1-based） */
  line?: number
}

/** 全局索引 */
export interface WikiIndex {
  /** 词条索引：alias → WikiTerm[]（可能有多个来源） */
  terms: Record<string, WikiTerm[]>
  /** 公式索引：计算值名称 → WikiFormula[] */
  formulas: Record<string, WikiFormula[]>
  /** 所有已知的 scope */
  scopes: string[]
  /** 索引构建时间 */
  buildTime: number
}

/** WebSocket 消息 */
export type WsMessage =
  | { type: 'file-changed'; payload: { path: string; action: 'create' | 'update' | 'delete' } }
  | { type: 'index-updated'; payload: WikiIndex }
  | { type: 'refresh-index' }

/** 文件树节点 */
export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
  /** 当存在同名文件夹和同名 .md 文件时，该字段记录被合并的 .md 文件路径 */
  readmePath?: string
}

/** ─── 审校批注 ─────────────────────────────────────────── */

/** 单条批注 */
export interface Annotation {
  /** 唯一标识 */
  id: string
  /** 选中的原文文本 */
  selectedText: string
  /** 批注/建议内容 */
  comment: string
  /** 选区在文档中的起始偏移（基于纯文本） */
  startOffset: number
  /** 选区在文档中的结束偏移（基于纯文本） */
  endOffset: number
  /** 选区所在的最近块级元素的 data-line 行号 */
  anchorLine: number | null
  /** 批注状态 */
  status: 'open' | 'resolved' | 'rejected'
  /** 创建时间（ISO 8601） */
  createdAt: string
  /** 更新时间（ISO 8601） */
  updatedAt: string
}

/** 单个文档的批注集合（持久化 JSON 格式） */
export interface AnnotationFile {
  /** JSON schema 版本，便于后续升级 */
  version: 1
  /** 文档路径（相对于 wiki-docs/） */
  filePath: string
  /** 批注列表 */
  annotations: Annotation[]
}
