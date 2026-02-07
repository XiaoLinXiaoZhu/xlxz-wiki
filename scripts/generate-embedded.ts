/**
 * 构建脚本：生成内嵌资源的导入文件
 * 
 * 由于 Bun 不支持 glob import，需要在构建时：
 * 1. 扫描 dist/ 目录
 * 2. 生成 server/embedded-assets.ts，包含所有文件的显式 import
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'fs'
import { join, relative } from 'path'

const DIST_DIR = './dist'
const OUTPUT_FILE = './server/embedded-assets.ts'

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = []
  
  if (!existsSync(dir)) {
    return files
  }
  
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir))
    } else {
      // 获取相对于 dist 的路径
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/')
      files.push(relativePath)
    }
  }
  
  return files
}

function generateEmbeddedAssets() {
  const files = getAllFiles(DIST_DIR)
  
  if (files.length === 0) {
    console.log('[embed] dist/ 目录为空，跳过生成')
    writeFileSync(OUTPUT_FILE, `// 空的内嵌资源（dist/ 未构建）
export const embeddedAssets = new Map<string, string>()
export const IS_EMBEDDED = false
`)
    return
  }
  
  // 生成导入语句
  const imports: string[] = []
  const mapEntries: string[] = []
  
  files.forEach((file, index) => {
    const varName = `file${index}`
    // 使用 with { type: "file" } 语法内嵌文件
    imports.push(`// @ts-ignore\nimport ${varName} from "../dist/${file}" with { type: "file" };`)
    mapEntries.push(`  ["${file}", ${varName}]`)
  })
  
  const code = `/**
 * 自动生成的内嵌资源文件
 * 由 scripts/generate-embedded.ts 生成，请勿手动编辑
 */

${imports.join('\n')}

export const embeddedAssets = new Map<string, string>([
${mapEntries.join(',\n')}
])

export const IS_EMBEDDED = true
`
  
  writeFileSync(OUTPUT_FILE, code)
  console.log(`[embed] 已生成 ${OUTPUT_FILE}，包含 ${files.length} 个文件`)
}

generateEmbeddedAssets()
