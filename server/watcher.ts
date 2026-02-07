/**
 * 文件监听器
 * 使用 chokidar 监听 wiki-docs/ 目录变更，触发索引更新和 WebSocket 广播
 */
import { watch } from 'chokidar'
import { broadcast } from './routes/ws'
import type { WikiIndexer } from './indexer/indexer'

let watcher: ReturnType<typeof watch> | null = null

/**
 * 启动文件监听
 * @param wikiDocsDir wiki-docs 目录的绝对路径
 * @param indexer WikiIndexer 实例，用于增量更新索引
 */
export function startWatcher(wikiDocsDir: string, indexer: WikiIndexer) {
  if (watcher) {
    console.warn('[Watcher] 已在运行，跳过重复启动')
    return
  }

  watcher = watch(`${wikiDocsDir}/**/*.md`, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  })

  watcher.on('add', async (filePath) => {
    const relativePath = toRelativePath(wikiDocsDir, filePath)
    console.log(`[Watcher] 新增文件: ${relativePath}`)
    const index = await indexer.updateFile(relativePath)
    broadcast({ type: 'file-changed', payload: { path: relativePath, action: 'create' } })
    broadcast({ type: 'index-updated', payload: index })
  })

  watcher.on('change', async (filePath) => {
    const relativePath = toRelativePath(wikiDocsDir, filePath)
    console.log(`[Watcher] 文件变更: ${relativePath}`)
    const index = await indexer.updateFile(relativePath)
    broadcast({ type: 'file-changed', payload: { path: relativePath, action: 'update' } })
    broadcast({ type: 'index-updated', payload: index })
  })

  watcher.on('unlink', (filePath) => {
    const relativePath = toRelativePath(wikiDocsDir, filePath)
    console.log(`[Watcher] 文件删除: ${relativePath}`)
    const index = indexer.removeFile(relativePath)
    broadcast({ type: 'file-changed', payload: { path: relativePath, action: 'delete' } })
    broadcast({ type: 'index-updated', payload: index })
  })

  console.log(`[Watcher] 开始监听: ${wikiDocsDir}`)
}

/** 停止文件监听 */
export async function stopWatcher() {
  if (watcher) {
    await watcher.close()
    watcher = null
    console.log('[Watcher] 已停止')
  }
}

/** 将绝对路径转为相对于 wikiDocsDir 的路径，统一使用 / 分隔符 */
function toRelativePath(base: string, filePath: string): string {
  return filePath
    .replace(base, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '')
}
