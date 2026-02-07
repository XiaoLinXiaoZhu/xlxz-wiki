<template>
  <div class="doc-view">
    <div v-if="store.loading" class="doc-view__loading">加载中...</div>
    <div v-else-if="!store.currentFile" class="doc-view__empty">
      <h2>👋 欢迎使用 XLXZ Wiki v4</h2>
      <p>请从左侧文件树中选择一个文档查看。</p>
    </div>
    <div v-else class="doc-view__content">
      <MarkdownViewer :content="store.currentContent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWikiStore } from '@/stores/wiki'
import MarkdownViewer from '@/components/viewer/MarkdownViewer.vue'

const route = useRoute()
const store = useWikiStore()

watch(
  () => route.params.path,
  (path) => {
    if (path) {
      const filePath = Array.isArray(path) ? path.join('/') : path
      store.loadFile(filePath)
    }
  },
  { immediate: true }
)
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
