<template>
  <div>
    <div
      class="tree-item"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      :class="{
        'tree-item--dir': node.isDirectory,
        'tree-item--file': !node.isDirectory,
        'tree-item--active': !node.isDirectory && store.currentFile === node.path,
      }"
      @click="handleClick"
    >
      <span class="tree-item__icon">{{ node.isDirectory ? (expanded ? '📂' : '📁') : '📄' }}</span>
      <span class="tree-item__name">{{ node.name }}</span>
    </div>
    <div v-if="node.isDirectory && expanded && node.children">
      <FileTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWikiStore } from '@/stores/wiki'
import type { FileTreeNode } from '@shared/types'

const props = defineProps<{
  node: FileTreeNode
  depth: number
}>()

const store = useWikiStore()
const router = useRouter()
const expanded = ref(props.node.isDirectory)

function handleClick() {
  if (props.node.isDirectory) {
    expanded.value = !expanded.value
  } else {
    router.push(`/doc/${props.node.path}`)
  }
}
</script>

<style scoped>
.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #24292e;
  user-select: none;
}

.tree-item:hover {
  background: #e1e4e8;
}

.tree-item--active {
  background: #dbeafe;
  color: #1d4ed8;
}

.tree-item__icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tree-item__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
