import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WikiIndex, FileTreeNode } from '@shared/types'

export const useWikiStore = defineStore('wiki', () => {
  // ─── 状态 ─────────────────────────────────────────────────

  /** 全局索引 */
  const index = ref<WikiIndex>({
    terms: {},
    formulas: {},
    scopes: [],
    buildTime: 0,
  })

  /** 文件树 */
  const fileTree = ref<FileTreeNode[]>([])

  /** 当前查看的文件路径（相对于 wiki-docs/） */
  const currentFile = ref('')

  /** 当前文件的 Markdown 原文 */
  const currentContent = ref('')

  /** 当前作用域 */
  const currentScope = ref('')

  /** 模式：只读 / 编辑 */
  const mode = ref<'readonly' | 'edit' | 'review'>('readonly')

  /** 编辑中的内容（与 currentContent 分离，避免实时同步到只读视图） */
  const editingContent = ref('')

  /** 保存请求计数器（Header 触发 → DocView watch saveRequestId 响应） */
  const saveRequestId = ref(0)

  /** 加载状态 */
  const loading = ref(false)

  /** 前端版本号（构建时注入） */
  const frontendVersion = ref(__APP_VERSION__)

  /** 后端版本号（运行时从 API 获取） */
  const backendVersion = ref('')

  /** 版本不匹配警告 */
  const versionMismatch = computed(() => {
    if (!backendVersion.value) return false
    return frontendVersion.value !== backendVersion.value
  })

  // ─── 计算属性 ─────────────────────────────────────────────

  /** 当前文件名 */
  const currentFileName = computed(() => {
    if (!currentFile.value) return ''
    const parts = currentFile.value.split('/')
    return parts[parts.length - 1]
  })

  // ─── 操作 ─────────────────────────────────────────────────

  /** 从后端获取索引 */
  async function fetchIndex() {
    try {
      const res = await fetch('/api/index')
      index.value = await res.json()
    } catch (err) {
      console.error('[Store] 获取索引失败:', err)
    }
  }

  /** 从后端获取文件树 */
  async function fetchFileTree() {
    try {
      const res = await fetch('/api/files')
      fileTree.value = (await res.json()) ?? []
    } catch (err) {
      console.error('[Store] 获取文件树失败:', err)
    }
  }

  /** 检查后端版本号 */
  async function checkVersion() {
    try {
      const res = await fetch('/api/version')
      const data = await res.json()
      backendVersion.value = data.version
      if (frontendVersion.value !== data.version) {
        console.warn(
          `[Store] 版本不匹配！前端: v${frontendVersion.value}, 后端: v${data.version}`,
        )
      }
    } catch (err) {
      console.error('[Store] 获取后端版本失败:', err)
    }
  }

  /** 加载指定文件的内容 */
  async function loadFile(filePath: string) {
    if (!filePath) return
    loading.value = true
    currentFile.value = filePath
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
      if (res.ok) {
        const text = await res.text()
        currentContent.value = text
        // 从 frontmatter 提取 scope
        currentScope.value = extractScope(text)
      } else {
        currentContent.value = `> 加载失败: ${filePath}`
        currentScope.value = ''
      }
    } catch (err) {
      console.error('[Store] 加载文件失败:', err)
      currentContent.value = `> 加载失败: ${filePath}`
      currentScope.value = ''
    } finally {
      loading.value = false
    }
  }

  /** 从 Markdown 原文中提取 frontmatter scope */
  function extractScope(raw: string): string {
    const trimmed = raw.trimStart()
    if (!trimmed.startsWith('---')) return ''
    const endIndex = trimmed.indexOf('---', 3)
    if (endIndex === -1) return ''
    const frontmatter = trimmed.slice(3, endIndex)
    const match = frontmatter.match(/^scope:\s*(.+)$/m)
    return match ? match[1].trim() : ''
  }

  /** 更新索引（WebSocket 推送时调用） */
  function updateIndex(newIndex: WikiIndex) {
    index.value = newIndex
  }

  /** 请求保存（Header 按钮触发，DocView watch saveRequestId 响应） */
  function requestSave() {
    saveRequestId.value++
  }

  return {
    // 状态
    index,
    fileTree,
    currentFile,
    currentContent,
    currentScope,
    mode,
    editingContent,
    saveRequestId,
    loading,
    frontendVersion,
    backendVersion,
    versionMismatch,
    // 计算属性
    currentFileName,
    // 操作
    fetchIndex,
    fetchFileTree,
    checkVersion,
    loadFile,
    updateIndex,
    requestSave,
  }
})
