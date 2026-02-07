<template>
  <Teleport to="body">
    <div
      v-if="visible && filteredItems.length > 0"
      ref="popupRef"
      class="wiki-autocomplete-popup"
      :style="popupStyle"
      @mousedown.prevent
    >
      <div
        v-for="(item, idx) in filteredItems"
        :key="item"
        class="wiki-autocomplete-item"
        :class="{ 'wiki-autocomplete-item--active': idx === selectedIndex }"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = idx"
      >
        <span class="wiki-autocomplete-item__name">{{ item }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useWikiStore } from '@/stores/wiki'
import { match as pinyinMatch } from 'pinyin-pro'
import type { AutocompleteState } from '@/editor/wiki-autocomplete'

const MAX_VISIBLE = 20

const props = defineProps<{
  /** 编辑器 .ProseMirror 元素，用于监听 CustomEvent */
  editorDom: HTMLElement | null
}>()

const emit = defineEmits<{
  /** 用户选中了一个词条 */
  select: [term: string, triggerPos: number]
}>()

const wikiStore = useWikiStore()

// ─── 状态 ─────────────────────────────────────────────────

const visible = ref(false)
const query = ref('')
const triggerPos = ref(0)
const coords = ref<{ left: number; top: number; bottom: number } | null>(null)
const selectedIndex = ref(0)
const popupRef = ref<HTMLElement | null>(null)

// ─── 计算属性 ─────────────────────────────────────────────

/** 所有词条名（去重后的 alias 列表） */
const allTerms = computed(() => Object.keys(wikiStore.index.terms).sort())

/** 根据 query 过滤候选项（支持中文 + 拼音匹配） */
const filteredItems = computed(() => {
  const q = query.value.trim()
  if (!q) return allTerms.value.slice(0, MAX_VISIBLE)

  const qLower = q.toLowerCase()
  return allTerms.value
    .filter((term) => {
      // 1. 中文包含匹配
      if (term.toLowerCase().includes(qLower)) return true
      // 2. 拼音匹配（支持首字母、全拼、部分拼音）
      return pinyinMatch(term, qLower, { precision: 'start', insensitive: true }) !== null
    })
    .slice(0, MAX_VISIBLE)
})

/** 弹窗定位样式 */
const popupStyle = computed(() => {
  if (!coords.value) return { display: 'none' }
  return {
    position: 'fixed' as const,
    left: `${coords.value.left}px`,
    top: `${coords.value.bottom + 4}px`,
    zIndex: 2000,
  }
})

// ─── 事件处理 ─────────────────────────────────────────────

/** 监听编辑器派发的 wiki-autocomplete 事件 */
function handleAutocompleteEvent(e: Event) {
  const detail = (e as CustomEvent<AutocompleteState>).detail
  visible.value = detail.active
  query.value = detail.query
  triggerPos.value = detail.triggerPos
  coords.value = detail.cursorCoords

  if (detail.active) {
    // query 变化时重置选中索引
    selectedIndex.value = 0
  }
}

/**
 * 键盘导航：在 capture 阶段拦截，防止事件传递到编辑器
 */
function handleKeydown(e: KeyboardEvent) {
  if (!visible.value || filteredItems.value.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      e.stopPropagation()
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        filteredItems.value.length - 1,
      )
      scrollToSelected()
      break

    case 'ArrowUp':
      e.preventDefault()
      e.stopPropagation()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      scrollToSelected()
      break

    case 'Enter':
    case 'Tab':
      e.preventDefault()
      e.stopPropagation()
      selectItem(filteredItems.value[selectedIndex.value])
      break

    case 'Escape':
      e.preventDefault()
      e.stopPropagation()
      visible.value = false
      break
  }
}

/** 选中词条 */
function selectItem(term: string) {
  emit('select', term, triggerPos.value)
  visible.value = false
}

/** 滚动到选中项 */
function scrollToSelected() {
  nextTick(() => {
    const popup = popupRef.value
    if (!popup) return
    const activeEl = popup.querySelector(
      '.wiki-autocomplete-item--active',
    ) as HTMLElement | null
    activeEl?.scrollIntoView({ block: 'nearest' })
  })
}

// ─── 过滤结果变化时重置选中 ─────────────────────────────

watch(filteredItems, () => {
  selectedIndex.value = 0
})

// ─── 生命周期 ─────────────────────────────────────────────

onMounted(() => {
  // 监听编辑器 DOM 上的自定义事件
  props.editorDom?.addEventListener('wiki-autocomplete', handleAutocompleteEvent)
  // capture 阶段拦截键盘事件
  window.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  props.editorDom?.removeEventListener(
    'wiki-autocomplete',
    handleAutocompleteEvent,
  )
  window.removeEventListener('keydown', handleKeydown, true)
})

// editorDom 可能在 mount 后才赋值，需要 watch
watch(
  () => props.editorDom,
  (newEl, oldEl) => {
    oldEl?.removeEventListener('wiki-autocomplete', handleAutocompleteEvent)
    newEl?.addEventListener('wiki-autocomplete', handleAutocompleteEvent)
  },
)
</script>

<style>
.wiki-autocomplete-popup {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-height: 260px;
  overflow-y: auto;
  min-width: 180px;
  max-width: 320px;
  padding: 4px 0;
  font-size: 14px;
}

.wiki-autocomplete-item {
  padding: 6px 12px;
  cursor: pointer;
  color: #24292e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiki-autocomplete-item:hover,
.wiki-autocomplete-item--active {
  background: #f0f7ff;
  color: #0366d6;
}

.wiki-autocomplete-item__name {
  font-weight: 500;
}
</style>
