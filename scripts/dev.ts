/**
 * 开发脚本
 * 执行: bun run scripts/dev.ts
 *
 * 同时启动 Go 后端（端口 3055）和 Vite 前端开发服务器（端口 5173）
 * Vite 通过 proxy 将 /api 和 /ws 请求转发到 Go 后端
 */
import { spawn } from 'child_process'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const ROOT = resolve(import.meta.dir, '..')
const GO_DIR = resolve(ROOT, 'server-go')
const WIKI_DOCS = resolve(ROOT, 'wiki-docs')

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
const version = pkg.version

let viteProc: ReturnType<typeof spawn> | null = null

console.log(`\n🚀 XLXZ Wiki 开发模式 (v${version})\n`)

// 1. 启动 Go 后端（go run，自动编译+运行，注入版本号）
console.log('[Go] 启动后端...')
const goProc = spawn(
  'go',
  ['run', '-ldflags', `"-X main.Version=${version}"`, '.', '-docs', WIKI_DOCS],
  {
    cwd: GO_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  },
)

goProc.stdout.on('data', (data: Buffer) => {
  const text = data.toString().trim()
  if (text) console.log(`[Go] ${text}`)
})

goProc.stderr.on('data', (data: Buffer) => {
  const text = data.toString().trim()
  if (text) console.error(`[Go] ${text}`)
})

goProc.on('exit', (code) => {
  console.log(`[Go] 进程退出 (code: ${code})`)
  // Go 后端退出时也终止 Vite
  viteProc?.kill()
  process.exit(code ?? 1)
})

// 等待 Go 后端启动（简单延迟）
await new Promise((r) => setTimeout(r, 2000))

// 2. 启动 Vite 前端开发服务器
console.log('[Vite] 启动前端开发服务器...')
viteProc = spawn('npx', ['vite'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
})

viteProc.stdout.on('data', (data: Buffer) => {
  const text = data.toString().trim()
  if (text) console.log(`[Vite] ${text}`)
})

viteProc.stderr.on('data', (data: Buffer) => {
  const text = data.toString().trim()
  if (text) console.error(`[Vite] ${text}`)
})

viteProc.on('exit', (code) => {
  console.log(`[Vite] 进程退出 (code: ${code})`)
  goProc?.kill()
  process.exit(code ?? 1)
})

// 优雅退出：Ctrl+C 时同时终止两个进程
function cleanup() {
  console.log('\n🛑 正在停止所有服务...')
  goProc?.kill()
  viteProc?.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
