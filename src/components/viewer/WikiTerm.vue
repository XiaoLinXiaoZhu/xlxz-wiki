<template>
  <span
    ref="termRef"
    class="wiki-term"
    :class="{ 'wiki-term--missing': !resolved.exact }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >【{{ displayName }}】</span>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { useWikiStore } from '@/stores/wiki'
import { useHoverCards } from '@/composables/useHoverCards'
import { resolveTerm } from '@/utils/term-resolver'

const props = defineProps<{
  term: string
}>()

const store = useWikiStore()
const hoverCards = useHoverCards()
const termRef = ref<HTMLElement>()

// 从父级 HoverCard 注入的 cardId（如果在卡片内则非 null）
const parentCardId = inject<string | null>('hoverCardId', null)

let currentCardId: string | null = null

/** 解析显示名称（去掉 scope 前缀） */
const displayName = computed(() => {
  const slashIndex = props.term.indexOf('/')
  if (slashIndex > 0) return props.term.slice(slashIndex + 1)
  return props.term
})

/** 使用 term-resolver 解析词条 */
const resolved = computed(() => {
  return resolveTerm(
    props.term,
    store.index,
    store.currentScope,
    store.currentFile,
  )
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
