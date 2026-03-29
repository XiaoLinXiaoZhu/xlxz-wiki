/**
 * 审校批注 Store
 *
 * 管理当前文档的批注数据，提供 CRUD 操作并与后端 API 同步持久化。
 * 批注以 JSON 文件形式存储在 wiki-docs/.annotations/ 目录下。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Annotation, AnnotationFile } from '@shared/types'

export const useAnnotationStore = defineStore('annotation', () => {
  // ─── 状态 ─────────────────────────────────────────────────

  /** 当前文档路径 */
  const currentFilePath = ref('')

  /** 当前文档的批注列表 */
  const annotations = ref<Annotation[]>([])

  /** 加载状态 */
  const loading = ref(false)

  // ─── 计算属性 ─────────────────────────────────────────────

  /** 未解决的批注数量 */
  const openCount = computed(() =>
    annotations.value.filter(a => a.status === 'open').length,
  )

  /** 按行号排序的批注列表 */
  const sortedAnnotations = computed(() =>
    [...annotations.value].sort((a, b) => a.startOffset - b.startOffset),
  )

  // ─── 操作 ─────────────────────────────────────────────────

  /** 加载指定文档的批注 */
  async function loadAnnotations(filePath: string) {
    currentFilePath.value = filePath
    loading.value = true
    try {
      const res = await fetch(`/api/annotations?path=${encodeURIComponent(filePath)}`)
      if (res.ok) {
        const data: AnnotationFile = await res.json()
        annotations.value = data.annotations
      } else if (res.status === 404) {
        // 该文档尚无批注
        annotations.value = []
      } else {
        console.error('[Annotation] 加载批注失败:', res.statusText)
        annotations.value = []
      }
    } catch (err) {
      console.error('[Annotation] 加载批注失败:', err)
      annotations.value = []
    } finally {
      loading.value = false
    }
  }

  /** 添加批注 */
  async function addAnnotation(
    selectedText: string,
    comment: string,
    startOffset: number,
    endOffset: number,
    anchorLine: number | null,
  ) {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: generateId(),
      selectedText,
      comment,
      startOffset,
      endOffset,
      anchorLine,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }
    annotations.value.push(annotation)
    await saveAnnotations()
    return annotation
  }

  /** 更新批注内容 */
  async function updateAnnotation(id: string, updates: Partial<Pick<Annotation, 'comment' | 'status'>>) {
    const annotation = annotations.value.find(a => a.id === id)
    if (!annotation) return
    if (updates.comment !== undefined) annotation.comment = updates.comment
    if (updates.status !== undefined) annotation.status = updates.status
    annotation.updatedAt = new Date().toISOString()
    await saveAnnotations()
  }

  /** 删除批注 */
  async function removeAnnotation(id: string) {
    annotations.value = annotations.value.filter(a => a.id !== id)
    await saveAnnotations()
  }

  /** 保存批注到后端 */
  async function saveAnnotations() {
    if (!currentFilePath.value) return
    const data: AnnotationFile = {
      version: 1,
      filePath: currentFilePath.value,
      annotations: annotations.value,
    }
    try {
      await fetch(`/api/annotations?path=${encodeURIComponent(currentFilePath.value)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (err) {
      console.error('[Annotation] 保存批注失败:', err)
    }
  }

  /** 清空当前文档批注（切换文件时调用） */
  function clear() {
    currentFilePath.value = ''
    annotations.value = []
  }

  return {
    // 状态
    currentFilePath,
    annotations,
    loading,
    // 计算属性
    openCount,
    sortedAnnotations,
    // 操作
    loadAnnotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clear,
  }
})

/** 生成短随机 ID */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
