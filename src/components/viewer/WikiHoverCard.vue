<template>
  <div
    ref="cardRef"
    class="wiki-hover-card"
    :class="[`wiki-hover-card--${position.placement}`]"
    :style="cardStyle"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <!-- 精确匹配：显示定义 + 关联公式 -->
    <div v-if="resolved.exact && (filteredDefs.length > 0 || relatedFormulas.length > 0)" class="wiki-hover-card__body">
      <div
        v-for="(def, i) in filteredDefs"
        :key="'def-' + i"
        class="wiki-hover-card__definition"
      >
        <div class="wiki-hover-card__source">
          来自 <a class="wiki-hover-card__source-link" href="#" @click.prevent="navigateToSource(def.filePath, def.line)">{{ def.filePath }}<span v-if="def.line" class="wiki-hover-card__line">:{{ def.line }}</span></a>
          <span v-if="def.scope" class="wiki-hover-card__scope">（{{ def.scope }}）</span>
          <span v-if="def.definitionType === 'inline'" class="wiki-hover-card__inline">文件内定义</span>
        </div>
        <div class="wiki-hover-card__content">
          <HoverCardContent :content="def.definition" />
        </div>
        <div v-if="def.hasMore" class="wiki-hover-card__more">
          <span class="wiki-hover-card__more-icon">📄</span>
          <a class="wiki-hover-card__more-link" href="#" @click.prevent="navigateToSource(def.filePath, def.line)">查看完整内容…</a>
        </div>
        <hr v-if="i < filteredDefs.length - 1 || relatedFormulas.length > 0" class="wiki-hover-card__divider" />
      </div>

      <!-- 关联的公式表达式 -->
      <div
        v-for="(formula, i) in relatedFormulas"
        :key="'formula-' + i"
        class="wiki-hover-card__formula"
      >
        <div class="wiki-hover-card__source">
          公式 · 来自 <a class="wiki-hover-card__source-link" href="#" @click.prevent="navigateToSource(formula.filePath, formula.line)">{{ formula.filePath }}<span v-if="formula.line" class="wiki-hover-card__line">:{{ formula.line }}</span></a>
          <span v-if="formula.scope" class="wiki-hover-card__scope">（{{ formula.scope }}）</span>
        </div>
        <div class="wiki-hover-card__formula-expr">
          <FormulaContent :formula="formula.expression" />
        </div>
        <hr v-if="i < relatedFormulas.length - 1" class="wiki-hover-card__divider" />
      </div>
    </div>

    <!-- 未找到定义：显示近似匹配建议 -->
    <div v-else class="wiki-hover-card__empty">
      <div class="wiki-hover-card__empty-header">
        <span class="wiki-hover-card__empty-icon">⚠️</span>
        <span>【{{ lookupName }}】的定义未找到，请检查拼写或定义是否存在。</span>
      </div>
      <div v-if="resolved.suggestions.length > 0" class="wiki-hover-card__suggestions">
        <hr class="wiki-hover-card__divider" />
        <div class="wiki-hover-card__suggestions-title">下面是近似的定义：</div>
        <ul class="wiki-hover-card__suggestions-list">
          <li v-for="s in resolved.suggestions" :key="s.term">
            <span class="wiki-hover-card__suggestion-term">【{{ s.term }}】</span>
            <span class="wiki-hover-card__suggestion-source">：来自 {{ s.sources[0]?.filePath }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, provide, defineComponent, h, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useHoverCards } from '@/composables/useHoverCards'
import { useWikiStore } from '@/stores/wiki'
import { resolveTerm, filterByScope } from '@/utils/term-resolver'
import type { WikiFormula as WikiFormulaType } from '@shared/types'

import WikiTermComp from './WikiTerm.vue'
import WikiDefinition from './WikiDefinition.vue'
import WikiFormulaComp from './WikiFormula.vue'
import WikiFormulaValue from './WikiFormulaValue.vue'
import { createMarkdownRenderer } from '@/markdown'

const router = useRouter()

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

// 向子组件提供当前卡片 ID
provide('hoverCardId', props.id)

// ─── 解析 scope 前缀 ─────────────────────────────────────

const explicitScope = computed<string | null>(() => {
  const slashIndex = props.term.indexOf('/')
  if (slashIndex > 0) return props.term.slice(0, slashIndex)
  return null
})

const lookupName = computed(() => {
  const slashIndex = props.term.indexOf('/')
  if (slashIndex > 0) return props.term.slice(slashIndex + 1)
  return props.term
})

// ─── 使用 term-resolver 解析词条 ──────────────────────────

const resolved = computed(() => {
  return resolveTerm(
    props.term,
    store.index,
    store.currentScope,
    store.currentFile,
  )
})

/** 按 scope 过滤后的定义 */
const filteredDefs = computed(() => {
  if (!resolved.value.exact) return []
  return filterByScope(
    resolved.value.definitions,
    explicitScope.value,
    store.currentScope,
    store.currentFile,
  )
})

// ─── 查询关联公式 ─────────────────────────────────────────

const relatedFormulas = computed<WikiFormulaType[]>(() => {
  const formulas = store.index.formulas?.[lookupName.value]
  if (!formulas || formulas.length === 0) return []
  return formulas
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

/** 点击来源文件链接，跳转到对应文件并定位到行 */
function navigateToSource(filePath: string, line?: number) {
  // 关闭所有悬停卡片
  hoverCards.closeAll()
  // 构建路由路径（filePath 中的 / 不需要编码，各段分别编码）
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const hash = line ? `#L${line}` : ''
  router.push(`/doc/${encodedPath}${hash}`)
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
    'wiki-formula': WikiFormulaComp,
  },
  render() {
    if (!this.content) return h('div')
    const html = md.render(this.content)
    return h({
      template: `<div class="hover-card-md">${html}</div>`,
      components: {
        'wiki-term': WikiTermComp,
        'wiki-definition': WikiDefinition,
        'wiki-formula': WikiFormulaComp,
      },
    })
  },
})

// ─── 卡片内公式渲染子组件 ─────────────────────────────────

const FormulaContent = defineComponent({
  props: {
    formula: { type: String, default: '' },
  },
  components: {
    'wiki-formula-value': WikiFormulaValue,
  },
  render() {
    if (!this.formula) return h('div')
    const escaped = escapeHtml(this.formula)
    let html = escaped
    html = html.replace(
      /\[([^\]]+)\]/g,
      '<wiki-formula-value name="$1" type="calc"></wiki-formula-value>'
    )
    html = html.replace(
      /&lt;([^&]+)&gt;/g,
      '<wiki-formula-value name="$1" type="design"></wiki-formula-value>'
    )
    return h({
      template: `<span class="hover-card-formula">${html}</span>`,
      components: {
        'wiki-formula-value': WikiFormulaValue,
      },
    })
  },
})

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
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

.wiki-hover-card__source-link {
  color: #0969da;
  text-decoration: none;
  cursor: pointer;
  border-bottom: 1px dashed #0969da;
}

.wiki-hover-card__source-link:hover {
  color: #0550ae;
  border-bottom-style: solid;
}

.wiki-hover-card__line {
  color: #8b949e;
  font-size: 11px;
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

.wiki-hover-card__more {
  margin-top: 8px;
  padding: 6px 10px;
  background: #f6f8fa;
  border-radius: 4px;
  font-size: 12px;
  color: #57606a;
}

.wiki-hover-card__more-icon {
  margin-right: 4px;
}

.wiki-hover-card__more-link {
  color: #0969da;
  text-decoration: none;
  cursor: pointer;
}

.wiki-hover-card__more-link:hover {
  text-decoration: underline;
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

.wiki-hover-card__formula-expr {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  background: #f0f4f8;
  border-left: 3px solid #0969da;
  padding: 6px 10px;
  border-radius: 0 4px 4px 0;
  margin: 4px 0;
}

.wiki-hover-card__empty {
  font-size: 13px;
}

.wiki-hover-card__empty-header {
  color: #cf222e;
}

.wiki-hover-card__empty-icon {
  margin-right: 4px;
}

.wiki-hover-card__suggestions {
  margin-top: 4px;
}

.wiki-hover-card__suggestions-title {
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 4px;
}

.wiki-hover-card__suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.wiki-hover-card__suggestions-list li {
  padding: 2px 0;
  font-size: 13px;
}

.wiki-hover-card__suggestion-term {
  color: #0969da;
  font-weight: 500;
}

.wiki-hover-card__suggestion-source {
  color: #8b949e;
  font-size: 12px;
}
</style>
