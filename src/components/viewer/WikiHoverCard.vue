<template>
  <div
    ref="cardRef"
    class="wiki-hover-card"
    :class="[`wiki-hover-card--${position.placement}`]"
    :style="cardStyle"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <!-- 多个定义按来源分组显示 -->
    <div v-if="definitions.length > 0" class="wiki-hover-card__body">
      <div
        v-for="(def, i) in definitions"
        :key="i"
        class="wiki-hover-card__definition"
      >
        <div class="wiki-hover-card__source">
          来自 {{ def.filePath }}
          <span v-if="def.scope" class="wiki-hover-card__scope">（{{ def.scope }}）</span>
          <span v-if="def.definitionType === 'inline'" class="wiki-hover-card__inline">文件内定义</span>
        </div>
        <div class="wiki-hover-card__content">
          <HoverCardContent :content="def.definition" />
        </div>
        <hr v-if="i < definitions.length - 1" class="wiki-hover-card__divider" />
      </div>
    </div>

    <!-- 未找到定义 -->
    <div v-else class="wiki-hover-card__empty">
      <span class="wiki-hover-card__empty-icon">⚠️</span>
      <span>【{{ term }}】的定义未找到</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, provide, defineComponent, h, nextTick } from 'vue'
import { useHoverCards } from '@/composables/useHoverCards'
import { useWikiStore } from '@/stores/wiki'
import type { WikiTerm as WikiTermType } from '@shared/types'

import WikiTermComp from './WikiTerm.vue'
import WikiDefinition from './WikiDefinition.vue'
import WikiFormula from './WikiFormula.vue'
import { createMarkdownRenderer } from '@/markdown'

const props = defineProps<{
  id: string
  term: string
  triggerRect: DOMRect
  level: number
}>()

const hoverCards = useHoverCards()
const store = useWikiStore()
const cardRef = ref<HTMLElement>()
const cardSize = ref({ width: 320, height: 100 })

// 向子组件提供当前卡片 ID，让嵌套的 WikiTerm 知道自己在哪个卡片内
provide('hoverCardId', props.id)

// ─── 查询词条定义 ─────────────────────────────────────────

const definitions = computed<WikiTermType[]>(() => {
  const terms = store.index.terms?.[props.term]
  if (!terms || terms.length === 0) return []
  return terms
})

// ─── 位置计算 ─────────────────────────────────────────────

const position = computed(() =>
  hoverCards.calculatePosition(
    props.triggerRect,
    cardSize.value.width,
    cardSize.value.height
  )
)

const cardStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  zIndex: hoverCards.getZIndex(props.level),
  maxWidth: '420px',
  minWidth: '240px',
}))

// ─── 鼠标事件 ─────────────────────────────────────────────

function onEnter() {
  hoverCards.enterCard(props.id)
}

function onLeave() {
  hoverCards.leaveCard(props.id)
}

// ─── 挂载后更新尺寸 ───────────────────────────────────────

onMounted(async () => {
  await nextTick()
  if (cardRef.value) {
    const rect = cardRef.value.getBoundingClientRect()
    cardSize.value = { width: rect.width, height: rect.height }
  }
})

// ─── 卡片内 Markdown 渲染子组件 ───────────────────────────

const md = createMarkdownRenderer()

const HoverCardContent = defineComponent({
  props: {
    content: { type: String, default: '' },
  },
  components: {
    'wiki-term': WikiTermComp,
    'wiki-definition': WikiDefinition,
    'wiki-formula': WikiFormula,
  },
  render() {
    if (!this.content) return h('div')
    const html = md.render(this.content)
    return h({
      template: `<div class="hover-card-md">${html}</div>`,
      components: {
        'wiki-term': WikiTermComp,
        'wiki-definition': WikiDefinition,
        'wiki-formula': WikiFormula,
      },
    })
  },
})
</script>

<style scoped>
.wiki-hover-card {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #24292e;
  max-height: 360px;
  overflow-y: auto;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.wiki-hover-card--bottom {
  transform-origin: top left;
}

.wiki-hover-card--top {
  transform-origin: bottom left;
}

.wiki-hover-card__source {
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 4px;
}

.wiki-hover-card__scope {
  color: #8250df;
}

.wiki-hover-card__inline {
  background: #ddf4ff;
  color: #0969da;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  margin-left: 4px;
}

.wiki-hover-card__content {
  color: #24292e;
}

.wiki-hover-card__content :deep(p) {
  margin: 0.4em 0;
}

.wiki-hover-card__content :deep(h1),
.wiki-hover-card__content :deep(h2),
.wiki-hover-card__content :deep(h3) {
  font-size: 1em;
  margin: 0.5em 0 0.3em;
  border: none;
  padding: 0;
}

.wiki-hover-card__content :deep(ul),
.wiki-hover-card__content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.3em 0;
}

.wiki-hover-card__divider {
  border: none;
  border-top: 1px solid #eaecef;
  margin: 8px 0;
}

.wiki-hover-card__empty {
  color: #cf222e;
  font-size: 13px;
}

.wiki-hover-card__empty-icon {
  margin-right: 4px;
}
</style>
