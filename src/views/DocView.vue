<template>
  <div class="doc-view">
    <div v-if="store.loading" class="doc-view__loading">加载中...</div>
    <div v-else-if="!store.currentFile" class="doc-view__empty">
      <h2>👋 欢迎使用 XLXZ Wiki v4</h2>
      <p>请从左侧文件树中选择一个文档查看。</p>
    </div>
    <div v-else class="doc-view__content">
      <!-- 只读模式 -->
      <MarkdownViewer
        v-if="store.mode === 'readonly'"
        :content="store.currentContent"
      />
      <!-- 编辑模式 -->
      <MarkdownEditor
        v-else
        :content="store.currentContent"
        @update:content="store.editingContent = $event"
        @save="handleSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWikiStore } from '@/stores/wiki'
import MarkdownViewer from '@/components/viewer/MarkdownViewer.vue'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'

const route = useRoute()
const store = useWikiStore()

watch(
  () => route.params.path,
  (path) => {
    if (path) {
      const filePath = Array.isArray(path) ? path.join('/') : path
      // 切换文件时退出编辑模式
      store.mode = 'readonly'
      store.loadFile(filePath)
    }
  },
  { immediate: true },
)

// 进入编辑模式时，复制当前内容
watch(
  () => store.mode,
  (mode) => {
    if (mode === 'edit') {
      store.editingContent = store.currentContent
    }
  },
)

// Header 的保存按钮通过 store.saveRequestId 触发
watch(
  () => store.saveRequestId,
  () => {
    if (store.mode === 'edit') {
      handleSave()
    }
  },
)

/** 保存文件 */
async function handleSave() {
  if (!store.currentFile || !store.editingContent) return

  // 保存时需要保留 frontmatter
  const frontmatter = extractFrontmatter(store.currentContent)
  const content = frontmatter
    ? `${frontmatter}\n${store.editingContent}`
    : store.editingContent

  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(store.currentFile)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (res.ok) {
      // 更新 store 中的内容并切回只读模式
      store.currentContent = content
      store.mode = 'readonly'
    } else {
      console.error('[DocView] 保存失败:', await res.text())
    }
  } catch (err) {
    console.error('[DocView] 保存失败:', err)
  }
}

/** 提取 frontmatter 部分（包含 --- 分隔符） */
function extractFrontmatter(raw: string): string {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith('---')) return ''
  const endIndex = trimmed.indexOf('---', 3)
  if (endIndex === -1) return ''
  return trimmed.slice(0, endIndex + 3)
}
</script>

<style scoped>
.doc-view {
  max-width: 800px;
}

.doc-view__loading {
  color: #6a737d;
  font-size: 14px;
}

.doc-view__empty {
  color: #586069;
}

.doc-view__empty h2 {
  font-weight: 600;
  color: #24292e;
}
</style>
