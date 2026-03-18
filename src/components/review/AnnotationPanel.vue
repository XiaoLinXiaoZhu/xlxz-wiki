<template>
  <aside class="annotation-panel">
    <div class="annotation-panel__header">
      <h3 class="annotation-panel__title">
        📝 批注
        <span v-if="annotationStore.openCount > 0" class="annotation-panel__badge">
          {{ annotationStore.openCount }}
        </span>
      </h3>
      <div class="annotation-panel__filters">
        <button
          v-for="f in filters"
          :key="f.value"
          class="annotation-panel__filter-btn"
          :class="{ 'annotation-panel__filter-btn--active': filter === f.value }"
          @click="filter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <div class="annotation-panel__list" v-if="filteredAnnotations.length > 0">
      <div
        v-for="annotation in filteredAnnotations"
        :key="annotation.id"
        class="annotation-card"
        :class="{
          'annotation-card--resolved': annotation.status === 'resolved',
          'annotation-card--rejected': annotation.status === 'rejected',
          'annotation-card--active': activeAnnotationId === annotation.id,
        }"
        @click="$emit('highlight', annotation)"
      >
        <div class="annotation-card__quote">
          "{{ truncate(annotation.selectedText, 60) }}"
        </div>
        <div class="annotation-card__comment">{{ annotation.comment }}</div>
        <div class="annotation-card__meta">
          <span class="annotation-card__time">{{ formatTime(annotation.createdAt) }}</span>
          <span
            class="annotation-card__status"
            :class="`annotation-card__status--${annotation.status}`"
          >
            {{ statusLabel[annotation.status] }}
          </span>
        </div>
        <div class="annotation-card__actions">
          <button
            v-if="annotation.status === 'open'"
            class="annotation-card__action-btn annotation-card__action-btn--resolve"
            title="标记为已解决"
            @click.stop="annotationStore.updateAnnotation(annotation.id, { status: 'resolved' })"
          >
            ✓
          </button>
          <button
            v-if="annotation.status === 'open'"
            class="annotation-card__action-btn annotation-card__action-btn--reject"
            title="驳回"
            @click.stop="annotationStore.updateAnnotation(annotation.id, { status: 'rejected' })"
          >
            ✗
          </button>
          <button
            v-if="annotation.status !== 'open'"
            class="annotation-card__action-btn annotation-card__action-btn--reopen"
            title="重新打开"
            @click.stop="annotationStore.updateAnnotation(annotation.id, { status: 'open' })"
          >
            ↺
          </button>
          <button
            class="annotation-card__action-btn annotation-card__action-btn--delete"
            title="删除"
            @click.stop="annotationStore.removeAnnotation(annotation.id)"
          >
            🗑
          </button>
        </div>
      </div>
    </div>

    <div v-else class="annotation-panel__empty">
      <p>暂无批注</p>
      <p class="annotation-panel__hint">选中文本后即可添加批注</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnnotationStore } from '@/stores/annotation'
import type { Annotation } from '@shared/types'

defineProps<{
  activeAnnotationId?: string
}>()

defineEmits<{
  highlight: [annotation: Annotation]
}>()

const annotationStore = useAnnotationStore()

const filter = ref<'all' | 'open' | 'resolved'>('all')

const filters = [
  { label: '全部', value: 'all' as const },
  { label: '未解决', value: 'open' as const },
  { label: '已解决', value: 'resolved' as const },
]

const statusLabel: Record<string, string> = {
  open: '待处理',
  resolved: '已解决',
  rejected: '已驳回',
}

const filteredAnnotations = computed(() => {
  const list = annotationStore.sortedAnnotations
  if (filter.value === 'all') return list
  if (filter.value === 'resolved') return list.filter(a => a.status !== 'open')
  return list.filter(a => a.status === filter.value)
})

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.annotation-panel {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #e2e8f0;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.annotation-panel__header {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.annotation-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #24292e;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.annotation-panel__badge {
  font-size: 11px;
  background: #0366d6;
  color: #fff;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.annotation-panel__filters {
  display: flex;
  gap: 4px;
}

.annotation-panel__filter-btn {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  background: #fff;
  color: #586069;
  cursor: pointer;
  transition: all 0.15s;
}

.annotation-panel__filter-btn:hover {
  background: #f6f8fa;
}

.annotation-panel__filter-btn--active {
  background: #0366d6;
  color: #fff;
  border-color: #0366d6;
}

.annotation-panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.annotation-card {
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.annotation-card:hover {
  border-color: #0366d6;
  box-shadow: 0 1px 3px rgba(3, 102, 214, 0.1);
}

.annotation-card--active {
  border-color: #0366d6;
  box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.2);
}

.annotation-card--resolved {
  opacity: 0.6;
}

.annotation-card--rejected {
  opacity: 0.5;
}

.annotation-card__quote {
  font-size: 12px;
  color: #6a737d;
  font-style: italic;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: #f6f8fa;
  border-left: 3px solid #dfe2e5;
  border-radius: 2px;
  word-break: break-all;
}

.annotation-card__comment {
  font-size: 13px;
  color: #24292e;
  margin-bottom: 6px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.annotation-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.annotation-card__time {
  color: #959da5;
}

.annotation-card__status {
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.annotation-card__status--open {
  background: #fff8c5;
  color: #735c0f;
}

.annotation-card__status--resolved {
  background: #dcffe4;
  color: #22863a;
}

.annotation-card__status--rejected {
  background: #ffeef0;
  color: #cb2431;
}

.annotation-card__actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

.annotation-card__action-btn {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.annotation-card__action-btn:hover {
  background: #f6f8fa;
}

.annotation-card__action-btn--resolve:hover {
  background: #dcffe4;
  border-color: #34d058;
}

.annotation-card__action-btn--reject:hover {
  background: #ffeef0;
  border-color: #cb2431;
}

.annotation-card__action-btn--reopen:hover {
  background: #fff8c5;
  border-color: #f9c513;
}

.annotation-card__action-btn--delete:hover {
  background: #ffeef0;
  border-color: #cb2431;
}

.annotation-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #959da5;
  font-size: 14px;
}

.annotation-panel__hint {
  font-size: 12px;
  margin-top: 4px;
}
</style>
