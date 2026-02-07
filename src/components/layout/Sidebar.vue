<template>
  <nav class="sidebar">
    <div class="sidebar__header">
      <h2 class="sidebar__title">📖 XLXZ Wiki</h2>
    </div>
    <div class="sidebar__tree">
      <div v-if="store.fileTree.length === 0" class="sidebar__empty">
        加载中...
      </div>
      <FileTreeItem
        v-for="node in store.fileTree"
        :key="node.path"
        :node="node"
        :depth="0"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useWikiStore } from '@/stores/wiki'
import FileTreeItem from './FileTreeItem.vue'

const store = useWikiStore()

onMounted(() => {
  store.fetchFileTree()
  store.fetchIndex()
})
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f6f8fa;
}

.sidebar__header {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #24292e;
}

.sidebar__tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar__empty {
  padding: 16px;
  color: #6a737d;
  font-size: 14px;
}
</style>
