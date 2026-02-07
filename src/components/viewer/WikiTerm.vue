<template>
  <span
    ref="termRef"
    class="wiki-term"
    :class="{ 'wiki-term--missing': !hasDef }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >【{{ term }}】</span>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { useWikiStore } from '@/stores/wiki'
import { useHoverCards } from '@/composables/useHoverCards'

const props = defineProps<{
  term: string
}>()

const store = useWikiStore()
const hoverCards = useHoverCards()
const termRef = ref<HTMLElement>()

// 从父级 HoverCard 注入的 cardId（如果在卡片内则非 null）
const parentCardId = inject<string | null>('hoverCardId', null)

let currentCardId: string | null = null

const hasDef = computed(() => {
  return !!(store.index.terms && store.index.terms[props.term])
})

function onEnter() {
  if (!termRef.value) return
  currentCardId = hoverCards.openCard(props.term, termRef.value, parentCardId)
}

function onLeave() {
  if (currentCardId) {
    hoverCards.requestClose(currentCardId)
    currentCardId = null
  }
}
</script>

<style scoped>
.wiki-term {
  color: #0969da;
  cursor: pointer;
  border-bottom: 1px dashed #0969da;
  transition: color 0.15s, border-color 0.15s;
}

.wiki-term:hover {
  color: #0550ae;
  border-bottom-color: #0550ae;
}

.wiki-term--missing {
  color: #cf222e;
  border-bottom-color: #cf222e;
}

.wiki-term--missing:hover {
  color: #a40e26;
  border-bottom-color: #a40e26;
}
</style>
