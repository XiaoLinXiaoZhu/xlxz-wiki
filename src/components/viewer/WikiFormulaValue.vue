<template>
  <span
    ref="valueRef"
    class="wiki-formula-value"
    :class="[
      `wiki-formula-value--${type}`,
      { 'wiki-formula-value--has-def': hasDef }
    ]"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >{{ bracket[0] }}{{ name }}{{ bracket[1] }}</span>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { useWikiStore } from '@/stores/wiki'
import { useHoverCards } from '@/composables/useHoverCards'
import { resolveTerm } from '@/utils/term-resolver'

const props = defineProps<{
  /** 值名称（不含括号） */
  name: string
  /** 类型：calc=计算值 [xxx], design=设计值 <xxx> */
  type: 'calc' | 'design'
}>()

const store = useWikiStore()
const hoverCards = useHoverCards()
const valueRef = ref<HTMLElement>()

const parentCardId = inject<string | null>('hoverCardId', null)
let currentCardId: string | null = null

const bracket = computed(() =>
  props.type === 'calc' ? ['[', ']'] : ['<', '>']
)

/** 使用 term-resolver 检查是否有词条定义 */
const hasTermDef = computed(() => {
  const result = resolveTerm(props.name, store.index, store.currentScope, store.currentFile)
  return result.exact
})

/** 检查是否有公式定义 */
const hasFormulaDef = computed(() => {
  return !!(store.index.formulas && store.index.formulas[props.name])
})

/** 是否有任何可展示的定义 */
const hasDef = computed(() => hasTermDef.value || hasFormulaDef.value)

function onEnter() {
  if (!valueRef.value || !hasDef.value) return
  currentCardId = hoverCards.openCard(props.name, valueRef.value, parentCardId)
}

function onLeave() {
  if (currentCardId) {
    hoverCards.requestClose(currentCardId)
    currentCardId = null
  }
}
</script>

<style scoped>
.wiki-formula-value {
  cursor: default;
  transition: color 0.15s;
}

.wiki-formula-value--calc {
  color: #0550ae;
  font-weight: 600;
}

.wiki-formula-value--design {
  color: #8250df;
  font-weight: 600;
}

.wiki-formula-value--has-def {
  cursor: pointer;
  border-bottom: 1px dashed currentColor;
}

.wiki-formula-value--has-def:hover {
  filter: brightness(0.8);
}
</style>
