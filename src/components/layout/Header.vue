<template>
  <header class="wiki-header">
    <div class="wiki-header__title">
      <span v-if="store.currentFile" class="wiki-header__path">{{ store.currentFile }}</span>
      <span v-else class="wiki-header__path">XLXZ Wiki v4</span>
    </div>
    <div class="wiki-header__actions">
      <span class="wiki-header__mode">{{ store.mode === 'readonly' ? '只读' : '编辑' }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useWikiStore } from '@/stores/wiki'

const store = useWikiStore()
</script>

<style scoped>
.wiki-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  background: #fafbfc;
  min-height: 40px;
}

.wiki-header__path {
  font-size: 14px;
  color: #586069;
}

.wiki-header__mode {
  font-size: 12px;
  color: #6a737d;
  padding: 2px 8px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
}
</style>
