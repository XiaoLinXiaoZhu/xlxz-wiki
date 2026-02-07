/**
 * Go 版本发布脚本
 * 执行: bun run scripts/release-go.ts
 * 
 * 步骤:
 * 1. 构建前端 (vite build)
 * 2. 生成嵌入资源 (generate-embedded.ts)
 * 3. 复制 dist 到 server-go/dist
 * 4. 编译 Go 可执行文件
 */
import { execSync } from 'child_process'
import { cpSync, rmSync, existsSync } from 'fs'

const ROOT = process.cwd()
const DIST_DIR = './dist'
const GO_DIR = './server-go'
const GO_DIST_DIR = './server-go/dist'

function run(cmd: string, cwd: string = ROOT) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function main() {
  console.log('=== Go 版本发布脚本 ===\n')

  // 1. 构建前端
  console.log('[1/4] 构建前端...')
  run('pnpm build')

  // 2. 生成嵌入资源 (给 Bun 版本用)
  console.log('\n[2/4] 生成嵌入资源...')
  run('bun run scripts/generate-embedded.ts')

  // 3. 复制 dist 到 server-go/dist
  console.log('\n[3/4] 复制 dist 到 server-go/dist...')
  if (existsSync(GO_DIST_DIR)) {
    rmSync(GO_DIST_DIR, { recursive: true })
  }
  cpSync(DIST_DIR, GO_DIST_DIR, { recursive: true })
  console.log(`已复制 ${DIST_DIR} -> ${GO_DIST_DIR}`)

  // 4. 编译 Go
  console.log('\n[4/4] 编译 Go 可执行文件...')
  run('go build -o xlxz-wiki.exe', GO_DIR)

  console.log('\n=== 发布完成 ===')
  console.log(`输出: ${GO_DIR}/xlxz-wiki.exe`)
}

main()
