/**
 * XLXZ Wiki v4 — 后端服务器入口
 *
 * Hono HTTP Server + Bun WebSocket
 * - 静态文件服务（编译模式从内嵌资源读取，开发模式从 dist/ 读取）
 * - REST API（/api/*）
 * - WebSocket（/ws）— 文件变更实时推送
 */
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

import { api, setWikiDocsDir, setIndexer } from './routes/api'
import { addClient, removeClient, handleMessage } from './routes/ws'
import { startWatcher } from './watcher'
import { WikiIndexer } from './indexer/indexer'
import { embeddedAssets, IS_EMBEDDED } from './embedded-assets'

// ─── 路径解析 ───────────────────────────────────────────────

// 编译模式：使用 process.cwd()
// 开发模式：使用 import.meta.dir
const ROOT_DIR = IS_EMBEDDED
  ? resolve(process.cwd())
  : resolve(import.meta.dir, '..')

const WIKI_DOCS_DIR = resolve(ROOT_DIR, 'wiki-docs')
const DIST_DIR = resolve(ROOT_DIR, 'dist')
const PORT = Number(process.env.PORT || 3055)

// 打印内嵌资源信息
if (IS_EMBEDDED) {
  console.log(`[内嵌资源] 已加载 ${embeddedAssets.size} 个前端文件`)
}

// ─── 初始化 WikiIndexer ────────────────────────────────────

const indexer = new WikiIndexer(WIKI_DOCS_DIR)

// 注入依赖到路由模块
setWikiDocsDir(WIKI_DOCS_DIR)
setIndexer(indexer)

// ─── Hono 应用 ──────────────────────────────────────────────

const app = new Hono()

// REST API 路由
app.route('/api', api)

// 静态文件服务
if (IS_EMBEDDED) {
  // 编译模式：从内嵌资源读取（使用 Bun.file）
  app.get('/*', async (c) => {
    // 跳过 API 路由
    if (c.req.path.startsWith('/api')) return c.notFound()
    
    let path = c.req.path.slice(1) || 'index.html' // 去掉开头的 /
    
    // 尝试获取请求的文件
    let assetPath = embeddedAssets.get(path)
    
    // 如果没找到且不是静态资源请求，返回 index.html（SPA 回退）
    if (!assetPath && !path.includes('.')) {
      assetPath = embeddedAssets.get('index.html')
    }
    
    if (assetPath) {
      const file = Bun.file(assetPath)
      return new Response(file)
    }
    
    // 最后尝试 SPA 回退
    const indexPath = embeddedAssets.get('index.html')
    if (indexPath) {
      return new Response(Bun.file(indexPath))
    }
    
    return c.text('资源未找到', 404)
  })
} else {
  // 开发模式：从文件系统读取
  if (existsSync(DIST_DIR)) {
    app.use('/*', serveStatic({ root: './dist' }))
  }

  // SPA 回退：所有未匹配的路由返回 index.html
  app.get('*', async (c) => {
    const indexPath = resolve(DIST_DIR, 'index.html')
    if (existsSync(indexPath)) {
      const html = await readFile(indexPath, 'utf-8')
      return c.html(html)
    }
    return c.text('XLXZ Wiki — 前端资源未构建，请先运行 pnpm build', 404)
  })
}

// ─── Bun 服务器启动（HTTP + WebSocket） ─────────────────────

Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket 升级
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req)
      if (upgraded) return undefined as unknown as Response
      return new Response('WebSocket 升级失败', { status: 400 })
    }

    // 其余请求交给 Hono 处理
    return app.fetch(req)
  },
  websocket: {
    open(ws) {
      addClient(ws)
    },
    close(ws) {
      removeClient(ws)
    },
    message(ws, message) {
      handleMessage(ws, String(message))
    },
  },
})

// ─── 构建索引 + 启动文件监听 ────────────────────────────────

await indexer.buildIndex()
startWatcher(WIKI_DOCS_DIR, indexer)

// ─── 启动信息 ───────────────────────────────────────────────

const frontendInfo = IS_EMBEDDED 
  ? '内嵌于可执行文件' 
  : (existsSync(DIST_DIR) ? DIST_DIR : '未构建（开发模式请用 pnpm dev）')

console.log(`
╔══════════════════════════════════════════╗
║         XLXZ Wiki v4 服务器已启动         ║
╠══════════════════════════════════════════╣
║  地址: http://127.0.0.1:${PORT}
║  文档: ${WIKI_DOCS_DIR}
║  前端: ${frontendInfo}
╚══════════════════════════════════════════╝
`)

// Windows 下自动打开浏览器
try {
  if (process.platform === 'win32') {
    Bun.spawn(['cmd', '/c', 'start', `http://127.0.0.1:${PORT}/`], {
      stdout: 'ignore',
      stderr: 'ignore',
    })
  }
} catch {}
