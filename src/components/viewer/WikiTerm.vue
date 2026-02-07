<template>
  <span
    class="wiki-term"
    :class="{ 'wiki-term--missing': !hasDef }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >【{{ term }}】</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWikiStore } from '@/stores/wiki'

const props = defineProps<{
  term: string
}>()

const store = useWikiStore()

const hasDef = computed(() => {
  return !!(store.index.terms && store.index.terms[props.term])
})

function onEnter() {
  // TODO: Week 2 Day 3 — WikiHoverCard 悬停卡片
}

function onLeave() {
  // TODO: Week 2 Day 3 — WikiHoverCard 悬停卡片
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
