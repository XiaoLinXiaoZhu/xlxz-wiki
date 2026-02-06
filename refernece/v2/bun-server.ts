// 一个极简的 Bun 静态服务器，用于脱机分发 Wiki 文档
// 目标：对方无需安装 Node.js，只需运行编译后的可执行文件即可本地访问

import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

// 解析 dist 目录（优先使用与可执行文件同级的 dist，其次使用源码相对路径）
function resolveDistDir(): string {
  try {
    const exeDir = path.dirname(process.execPath)
    const distNearExe = path.resolve(exeDir, 'docs/.vuepress/dist')
    if (fs.existsSync(distNearExe)) return distNearExe
  } catch {}
  const distFromSource = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'docs/.vuepress/dist'
  )
  return distFromSource
}

const distDir = resolveDistDir()
const port = Number(process.env.PORT || 3055)

function safeJoin(base: string, requestedPath: string): string {
  const resolved = path.resolve(base, '.' + requestedPath)
  if (!resolved.startsWith(path.resolve(base))) {
    // 防止路径穿越
    return base
  }
  return resolved
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function withIndexFallback(p: string): string {
  if (p.endsWith('/')) return p + 'index.html'
  return p
}

function withHtmlFallback(p: string): string {
  // 若没有后缀，尝试补 .html
  if (!path.extname(p)) return p + '.html'
  return p
}

function contentTypeByExt(ext: string): string | undefined {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'application/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.gif':
      return 'image/gif'
  }
  return undefined
}

function respondFile(filePath: string): Response {
  const file = Bun.file(filePath)
  const type = contentTypeByExt(path.extname(filePath))
  const headers = new Headers()
  if (type) headers.set('content-type', type)
  headers.set('cache-control', 'no-store')
  return new Response(file, { status: 200, headers })
}

async function tryServePath(urlPath: string): Promise<Response | null> {
  // 规范化路径
  let pathname = decodeURIComponent(urlPath)
  if (!pathname.startsWith('/')) pathname = '/' + pathname
  // 先尝试：原样
  let target = safeJoin(distDir, pathname)
  if (await fileExists(target) && (await fsp.stat(target)).isFile()) {
    return respondFile(target)
  }
  // 目录 => index.html
  target = safeJoin(distDir, withIndexFallback(pathname))
  if (await fileExists(target)) {
    return respondFile(target)
  }
  // 无后缀 => .html
  target = safeJoin(distDir, withHtmlFallback(pathname))
  if (await fileExists(target)) {
    return respondFile(target)
  }
  return null
}

const server = Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    // 处理 /favicon.ico
    if (pathname === '/favicon.ico') {
      const icon = safeJoin(distDir, '/favicon.ico')
      if (await fileExists(icon)) return respondFile(icon)
    }
    // 常规静态文件
    const res = await tryServePath(pathname)
    if (res) return res
    // SPA 回退：返回根 index.html
    const indexPath = path.join(distDir, 'index.html')
    if (await fileExists(indexPath)) return respondFile(indexPath)
    return new Response('Not Found', { status: 404 })
  },
})

console.log(`
XLXZ Wiki 本地服务器已启动
- 目录: ${distDir}
- 访问: http://127.0.0.1:${server.port}/
按 Ctrl+C 结束
`)

// Windows 下自动打开浏览器（可选）
try {
  if (process.platform === 'win32') {
    Bun.spawn(['cmd', '/c', 'start', `http://127.0.0.1:${server.port}/`], {
      stdout: 'ignore',
      stderr: 'ignore',
    })
  }
} catch {}


