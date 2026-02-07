/**
 * REST API 路由
 * 提供文件读写、索引查询、文件树等接口
 */
import { Hono } from 'hono'
import { readFile, writeFile } from 'fs/promises'
import { resolve, join, extname } from 'path'
import { existsSync, statSync, readdirSync } from 'fs'
import type { FileTreeNode } from '../../shared/types'
import type { WikiIndexer } from '../indexer/indexer'

/** wiki-docs 根目录 */
let wikiDocsDir = ''
/** WikiIndexer 实例 */
let indexer: WikiIndexer | null = null

export function setWikiDocsDir(dir: string) {
  wikiDocsDir = dir
}

export function setIndexer(instance: WikiIndexer) {
  indexer = instance
}

const api = new Hono()

/**
 * GET /api/index
 * 返回完整的 WikiIndex JSON
 */
api.get('/index', (c) => {
  if (!indexer) {
    return c.json({ terms: {}, formulas: {}, scopes: [], buildTime: 0 })
  }
  return c.json(indexer.getIndex())
})

/**
 * GET /api/file?path=角色系统/滑移.md
 * 返回文件的原始 Markdown 内容
 */
api.get('/file', async (c) => {
  const filePath = c.req.query('path')
  if (!filePath) {
    return c.json({ error: '缺少 path 参数' }, 400)
  }

  const fullPath = resolve(wikiDocsDir, filePath)

  // 安全检查：防止路径穿越
  if (!fullPath.startsWith(resolve(wikiDocsDir))) {
    return c.json({ error: '非法路径' }, 403)
  }

  if (!existsSync(fullPath)) {
    return c.json({ error: '文件不存在' }, 404)
  }

  try {
    const content = await readFile(fullPath, 'utf-8')
    const stat = statSync(fullPath)
    return c.text(content, 200, {
      'Last-Modified': stat.mtime.toUTCString(),
      'Content-Type': 'text/markdown; charset=utf-8',
    })
  } catch {
    return c.json({ error: '读取文件失败' }, 500)
  }
})

/**
 * POST /api/file?path=角色系统/滑移.md
 * 写入文件内容（阶段二编辑器使用，阶段一预留）
 */
api.post('/file', async (c) => {
  const filePath = c.req.query('path')
  if (!filePath) {
    return c.json({ error: '缺少 path 参数' }, 400)
  }

  const fullPath = resolve(wikiDocsDir, filePath)

  // 安全检查
  if (!fullPath.startsWith(resolve(wikiDocsDir))) {
    return c.json({ error: '非法路径' }, 403)
  }

  try {
    const body = await c.req.json<{ content: string }>()
    await writeFile(fullPath, body.content, 'utf-8')
    return c.json({ success: true })
  } catch {
    return c.json({ error: '写入文件失败' }, 500)
  }
})

/**
 * GET /api/files
 * 返回文件树结构 FileTreeNode[]
 */
api.get('/files', (c) => {
  const tree = buildFileTree(wikiDocsDir, '')
  return c.json(tree)
})

/**
 * GET /api/search?q=滑移
 * 搜索词条，返回匹配的 WikiTerm[]
 */
api.get('/search', (c) => {
  const query = c.req.query('q')
  if (!query) {
    return c.json({ error: '缺少 q 参数' }, 400)
  }

  if (!indexer) {
    return c.json([])
  }

  const index = indexer.getIndex()
  const results: unknown[] = []
  const queryLower = query.toLowerCase()

  for (const [key, terms] of Object.entries(index.terms)) {
    if (key.toLowerCase().includes(queryLower)) {
      results.push(...terms)
    }
  }

  return c.json(results)
})

/**
 * 递归构建文件树
 */
function buildFileTree(baseDir: string, relativePath: string): FileTreeNode[] {
  const fullPath = relativePath ? join(baseDir, relativePath) : baseDir
  if (!existsSync(fullPath)) return []

  const entries = readdirSync(fullPath, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  for (const entry of entries) {
    // 跳过隐藏文件
    if (entry.name.startsWith('.')) continue

    const entryRelPath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: entryRelPath,
        isDirectory: true,
        children: buildFileTree(baseDir, entryRelPath),
      })
    } else if (extname(entry.name) === '.md') {
      nodes.push({
        name: entry.name,
        path: entryRelPath,
        isDirectory: false,
      })
    }
  }

  // 目录在前，文件在后；同类按名称排序
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })

  return nodes
}

export { api }
