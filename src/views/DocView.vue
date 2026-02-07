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
import { watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useWikiStore } from '@/stores/wiki'
import MarkdownViewer from '@/components/viewer/MarkdownViewer.vue'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'

const route = useRoute()
const store = useWikiStore()

watch(
  () => route.params.path,
  async (path) => {
    if (path) {
      const filePath = Array.isArray(path) ? path.join('/') : path
      // 切换文件时退出编辑模式
      store.mode = 'readonly'
      await store.loadFile(filePath)
      // 文件加载完成后，处理行号 hash 跳转
      await nextTick()
      scrollToLine()
    }
  },
  { immediate: true },
)

// 监听 hash 变化（同一文件内跳转到不同行）
watch(
  () => route.hash,
  async () => {
    await nextTick()
    scrollToLine()
  },
)

/**
 * 根据 URL hash（#L行号）滚动到对应行
 * 查找 data-line 属性最接近且 ≤ 目标行号的元素
 */
function scrollToLine() {
  const hash = route.hash
  if (!hash) return
  const match = hash.match(/^#L(\d+)$/)
  if (!match) return
  const targetLine = parseInt(match[1], 10)
  if (isNaN(targetLine)) return

  // 查找所有带 data-line 的元素
  const elements = document.querySelectorAll<HTMLElement>('[data-line]')
  if (elements.length === 0) return

  // 找到 data-line ≤ targetLine 且最接近的元素
  let bestEl: HTMLElement | null = null
  let bestLine = -1
  for (const el of elements) {
    const line = parseInt(el.getAttribute('data-line') || '0', 10)
    if (line <= targetLine && line > bestLine) {
      bestLine = line
      bestEl = el
    }
  }

  if (bestEl) {
    bestEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 短暂高亮效果
    bestEl.classList.add('line-highlight')
    setTimeout(() => bestEl!.classList.remove('line-highlight'), 2000)
  }
}

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
  // 反转义 Milkdown commonmark 序列化器添加的反斜杠
  let cleanedContent = unescapeMarkdown(store.editingContent)
  // 防止 Milkdown 输出中意外包含 frontmatter（避免重复拼接）
  cleanedContent = stripFrontmatter(cleanedContent)
  const content = frontmatter
    ? `${frontmatter}\n${cleanedContent}`
    : cleanedContent

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

/**
 * 反转义 Milkdown commonmark 序列化器添加的反斜杠
 * 只处理 %% %% 内部和 【】 相关的转义，避免破坏用户有意的转义
 */
function unescapeMarkdown(text: string): string {
  // 反转义 %% ... %% 内部的内容
  let result = text.replace(/%%([^%]+?)%%/g, (_match, inner: string) => {
    // 还原 \[ → [, \] → ], \* → *, \< → <, \> → >
    const unescaped = inner
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\*/g, '*')
      .replace(/\\</g, '<')
      .replace(/\\>/g, '>')
    return `%%${unescaped}%%`
  })

  // 反转义 【...】 内部的 \* 等
  result = result.replace(/【([^】]+)】/g, (_match, inner: string) => {
    const unescaped = inner
      .replace(/\\\*/g, '*')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
    return `【${unescaped}】`
  })

  return result
}

/** 剥离 frontmatter，返回正文部分 */
function stripFrontmatter(raw: string): string {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith('---')) return raw
  const endIndex = trimmed.indexOf('---', 3)
  if (endIndex === -1) return raw
  return trimmed.slice(endIndex + 3).trimStart()
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
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
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

/* 行号跳转高亮效果 */
:deep(.line-highlight) {
  background-color: #fff8c5;
  border-radius: 4px;
  transition: background-color 2s ease;
}
</style>
