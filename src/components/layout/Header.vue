<template>
  <header class="wiki-header">
    <div class="wiki-header__title">
      <span v-if="store.currentFile" class="wiki-header__path">{{ store.currentFile }}</span>
      <span v-else class="wiki-header__path">XLXZ Wiki v4</span>
    </div>
    <div class="wiki-header__actions">
      <template v-if="store.currentFile">
        <button
          v-if="store.mode === 'readonly'"
          class="wiki-header__btn wiki-header__btn--edit"
          @click="store.mode = 'edit'"
        >
          ✏️ 编辑
        </button>
        <template v-else>
          <button
            class="wiki-header__btn wiki-header__btn--save"
            @click="store.requestSave()"
          >
            💾 保存
          </button>
          <button
            class="wiki-header__btn wiki-header__btn--cancel"
            @click="store.mode = 'readonly'"
          >
            ✕ 取消
          </button>
        </template>
      </template>
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

.wiki-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wiki-header__mode {
  font-size: 12px;
  color: #6a737d;
  padding: 2px 8px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
}

.wiki-header__btn {
  font-size: 13px;
  padding: 4px 12px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
  color: #24292e;
  transition: background 0.15s;
}

.wiki-header__btn:hover {
  background: #f6f8fa;
}

.wiki-header__btn--edit {
  color: #0366d6;
  border-color: #0366d6;
}

.wiki-header__btn--edit:hover {
  background: #f1f8ff;
}

.wiki-header__btn--save {
  color: #22863a;
  border-color: #22863a;
}

.wiki-header__btn--save:hover {
  background: #f0fff4;
}

.wiki-header__btn--cancel {
  color: #cb2431;
  border-color: #e1e4e8;
}

.wiki-header__btn--cancel:hover {
  background: #ffeef0;
}
</style>
