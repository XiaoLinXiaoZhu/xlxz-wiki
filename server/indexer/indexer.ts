/**
 * WikiIndexer — 内存索引管理
 * 扫描 wiki-docs/ 下所有 .md 文件，构建词条和公式索引
 * 支持增量更新（单文件变更时只重新解析该文件）
 */
import { readFile, readdir } from 'fs/promises'
import { resolve, join, extname } from 'path'
import { existsSync } from 'fs'
import { parseFile } from './parser'
import type { WikiIndex, WikiTerm, WikiFormula } from '../../shared/types'

export class WikiIndexer {
  /** 词条索引：alias → WikiTerm[] */
  private terms = new Map<string, WikiTerm[]>()
  /** 公式索引：计算值名称 → WikiFormula[] */
  private formulas = new Map<string, WikiFormula[]>()
  /** 所有已知的 scope */
  private scopes = new Set<string>()
  /** 索引构建时间 */
  private buildTime = 0
  /** wiki-docs 根目录 */
  private readonly rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
  }

  /**
   * 全量构建索引
   * 扫描所有 .md 文件并解析
   */
  async buildIndex(): Promise<WikiIndex> {
    // 完全重置
    this.terms.clear()
    this.formulas.clear()
    this.scopes.clear()

    const files = await this.getMarkdownFiles(this.rootDir)
    console.log(`[WikiIndexer] 开始构建索引，共找到 ${files.length} 个文件`)

    for (const filePath of files) {
      const relativePath = filePath
        .replace(this.rootDir, '')
        .replace(/\\/g, '/')
        .replace(/^\//, '')
      await this.indexFile(relativePath)
    }

    this.buildTime = Date.now()
    const index = this.getIndex()
    console.log(`[WikiIndexer] 索引构建完成: ${this.terms.size} 个词条, ${this.formulas.size} 个公式, ${this.scopes.size} 个 scope`)
    return index
  }

  /**
   * 增量更新：重新索引单个文件
   * 先移除该文件的所有旧条目，再重新解析
   */
  async updateFile(relativePath: string): Promise<WikiIndex> {
    this.removeFileEntries(relativePath)
    await this.indexFile(relativePath)
    this.buildTime = Date.now()
    console.log(`[WikiIndexer] 文件已更新: ${relativePath}`)
    return this.getIndex()
  }

  /**
   * 移除单个文件的所有索引条目
   */
  removeFile(relativePath: string): WikiIndex {
    this.removeFileEntries(relativePath)
    this.buildTime = Date.now()
    console.log(`[WikiIndexer] 文件已移除: ${relativePath}`)
    return this.getIndex()
  }

  /**
   * 获取当前索引的序列化形式（用于 API 返回）
   */
  getIndex(): WikiIndex {
    return {
      terms: Object.fromEntries(this.terms),
      formulas: Object.fromEntries(this.formulas),
      scopes: Array.from(this.scopes),
      buildTime: this.buildTime,
    }
  }

  // ─── 内部方法 ─────────────────────────────────────────────

  /**
   * 索引单个文件
   */
  private async indexFile(relativePath: string): Promise<void> {
    const fullPath = resolve(this.rootDir, relativePath)
    if (!existsSync(fullPath)) return

    try {
      const content = await readFile(fullPath, 'utf-8')
      const result = parseFile(content, relativePath)

      if (result.scope) {
        this.scopes.add(result.scope)
      }

      // 添加文件级词条（来自 frontmatter alias）
      for (const term of result.terms) {
        for (const alias of term.aliases) {
          this.addTerm(alias, term)
        }
      }

      // 添加文件内定义
      for (const term of result.inlineTerms) {
        this.addTerm(term.term, term)
      }

      // 添加公式
      for (const formula of result.formulas) {
        for (const cv of formula.calculatedValues) {
          this.addFormula(cv, formula)
        }
      }
    } catch (err) {
      console.error(`[WikiIndexer] 解析文件失败: ${relativePath}`, err)
    }
  }

  /**
   * 移除指定文件的所有索引条目
   */
  private removeFileEntries(relativePath: string): void {
    // 移除词条
    for (const [key, terms] of this.terms) {
      const filtered = terms.filter(t => t.filePath !== relativePath)
      if (filtered.length === 0) {
        this.terms.delete(key)
      } else {
        this.terms.set(key, filtered)
      }
    }

    // 移除公式
    for (const [key, formulas] of this.formulas) {
      const filtered = formulas.filter(f => f.filePath !== relativePath)
      if (filtered.length === 0) {
        this.formulas.delete(key)
      } else {
        this.formulas.set(key, filtered)
      }
    }

    // 重建 scopes（简单起见，从剩余条目中重新收集）
    this.scopes.clear()
    for (const terms of this.terms.values()) {
      for (const t of terms) {
        if (t.scope) this.scopes.add(t.scope)
      }
    }
    for (const formulas of this.formulas.values()) {
      for (const f of formulas) {
        if (f.scope) this.scopes.add(f.scope)
      }
    }
  }

  private addTerm(key: string, term: WikiTerm): void {
    const existing = this.terms.get(key)
    if (existing) {
      existing.push(term)
    } else {
      this.terms.set(key, [term])
    }
  }

  private addFormula(key: string, formula: WikiFormula): void {
    const existing = this.formulas.get(key)
    if (existing) {
      existing.push(formula)
    } else {
      this.formulas.set(key, [formula])
    }
  }

  /**
   * 递归获取目录下所有 .md 文件
   */
  private async getMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    if (!existsSync(dir)) return files

    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        const subFiles = await this.getMarkdownFiles(fullPath)
        files.push(...subFiles)
      } else if (extname(entry.name) === '.md') {
        files.push(fullPath)
      }
    }
    return files
  }
}
