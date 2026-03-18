/**
 * 发布脚本
 * 执行: bun run scripts/release.ts
 * 
 * 步骤:
 * 1. 构建前端 (vite build)
 * 2. 复制 dist 到 server-go/dist
 * 3. 编译 Go 可执行文件到项目根目录
 */
import { execSync } from 'child_process'
import { cpSync, rmSync, existsSync, readFileSync } from 'fs'

const ROOT = process.cwd()
const DIST_DIR = './dist'
const GO_DIR = './server-go'
const GO_DIST_DIR = './server-go/dist'

function run(cmd: string, cwd: string = ROOT) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function main() {
  const isDebug = process.argv.includes('--debug')
  const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
  const version = pkg.version
  console.log(`版本: v${version}`)
  console.log('=== 发布脚本 ===\n')

  // 1. 构建前端
  console.log(`[1/3] 构建前端${isDebug ? '（debug 模式：不压缩不混淆）' : ''}...`)
  run(isDebug ? 'pnpm build:debug' : 'pnpm build')

  // 2. 复制 dist 到 server-go/dist
  console.log('\n[2/3] 复制 dist 到 server-go/dist...')
  if (existsSync(GO_DIST_DIR)) {
    rmSync(GO_DIST_DIR, { recursive: true })
  }
  cpSync(DIST_DIR, GO_DIST_DIR, { recursive: true })
  console.log(`已复制 ${DIST_DIR} -> ${GO_DIST_DIR}`)

  // 3. 编译 Go
  console.log('\n[3/3] 编译 Go 可执行文件...')
  run(`go build -ldflags "-X main.Version=${version}" -o ../xlxz-wiki.exe`, GO_DIR)

  console.log('\n=== 发布完成 ===')
  console.log('输出: xlxz-wiki.exe')
  if (isDebug) {
    console.log('（debug 模式：未压缩未混淆，便于定位问题）')
  }
}

main()
