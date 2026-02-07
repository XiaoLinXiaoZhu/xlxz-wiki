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
}
