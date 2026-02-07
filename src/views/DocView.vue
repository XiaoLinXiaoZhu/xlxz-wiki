<template>
  <div class="doc-view">
    <div v-if="store.loading" class="doc-view__loading">加载中...</div>
    <div v-else-if="!store.currentFile" class="doc-view__empty">
      <h2>👋 欢迎使用 XLXZ Wiki v4</h2>
      <p>请从左侧文件树中选择一个文档查看。</p>
    </div>
    <div v-else class="doc-view__content">
      <pre class="doc-view__raw">{{ store.currentContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWikiStore } from '@/stores/wiki'

const route = useRoute()
const store = useWikiStore()

// 监听路由变化，加载对应文件
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

.doc-view__raw {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #24292e;
}
</style>
