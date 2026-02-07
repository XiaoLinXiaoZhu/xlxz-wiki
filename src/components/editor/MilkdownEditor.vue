<template>
  <div ref="containerRef">
    <Milkdown />
    <AutocompletePopup
      :editor-dom="editorDom"
      @select="handleAutocompleteSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Milkdown, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { useWikiPlugins } from '@/editor/wiki-nodes'
import { wikiAutocompletePlugin } from '@/editor/wiki-autocomplete'
import AutocompletePopup from './AutocompletePopup.vue'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  'update:content': [content: string]
  save: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const editorDom = ref<HTMLElement | null>(null)

const { get } = useEditor((root) => {
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, stripFrontmatter(props.content))

      // 监听 Markdown 内容变化
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) {
          emit('update:content', markdown)
        }
      })
    })
    .use(commonmark)
    .use(history)
    .use(listener)
    .use(clipboard)

  // 注册 wiki 装饰插件 + 自动补全插件
  return useWikiPlugins(editor).use(wikiAutocompletePlugin)
})

// 等编辑器渲染后获取 ProseMirror DOM
onMounted(() => {
  // Milkdown 异步初始化，用 MutationObserver 等待 .ProseMirror 出现
  const container = containerRef.value
  if (!container) return

  const tryFind = () => container.querySelector('.ProseMirror') as HTMLElement | null

  // 先尝试直接查找
  const found = tryFind()
  if (found) {
    editorDom.value = found
    return
  }

  // 未找到则观察 DOM 变化
  const observer = new MutationObserver(() => {
    const el = tryFind()
    if (el) {
      editorDom.value = el
      observer.disconnect()
    }
  })
  observer.observe(container, { childList: true, subtree: true })
})

/**
 * 处理自动补全选择：替换 【...光标 为 【词条】
 */
function handleAutocompleteSelect(term: string, triggerPos: number) {
  const editor = get()
  if (!editor) return
  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state } = view

    // 替换从 triggerPos（【的位置）到当前光标的内容
    const tr = state.tr.replaceWith(
      triggerPos,
      state.selection.from,
      state.schema.text(`【${term}】`),
    )

    view.dispatch(tr)
    view.focus()
  })
}

// Ctrl+S 保存
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    emit('save')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

/**
 * 剥离 frontmatter（编辑器不编辑 frontmatter）
 */
function stripFrontmatter(raw: string): string {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith('---')) return raw
  const endIndex = trimmed.indexOf('---', 3)
  if (endIndex === -1) return raw
  return trimmed.slice(endIndex + 3).trimStart()
}
</script>

<style>
/* Milkdown 编辑器全局样式 */
.milkdown {
  outline: none;
  padding: 0;
}

.milkdown .editor {
  outline: none;
  padding: 0;
  line-height: 1.7;
  font-size: 15px;
  color: #24292e;
}

.milkdown .editor h1 { font-size: 2em; margin: 0.67em 0; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.milkdown .editor h2 { font-size: 1.5em; margin: 0.83em 0; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.milkdown .editor h3 { font-size: 1.25em; margin: 1em 0; }
.milkdown .editor p { margin: 0.8em 0; }
.milkdown .editor ul, .milkdown .editor ol { padding-left: 2em; margin: 0.5em 0; }
.milkdown .editor code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
.milkdown .editor pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
.milkdown .editor pre code { background: none; padding: 0; }
.milkdown .editor blockquote { border-left: 4px solid #dfe2e5; padding: 0 1em; color: #6a737d; margin: 0.5em 0; }
.milkdown .editor hr { border: none; border-top: 1px solid #eaecef; margin: 1.5em 0; }
.milkdown .editor table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.milkdown .editor th, .milkdown .editor td { border: 1px solid #dfe2e5; padding: 6px 13px; }
.milkdown .editor th { background: #f6f8fa; font-weight: 600; }

/* Wiki 语法装饰样式（Decoration） */
.wiki-term-highlight {
  color: #0366d6;
  background: #f1f8ff;
  padding: 1px 2px;
  border-radius: 3px;
}

.wiki-definition-highlight {
  color: #6f42c1;
  background: #f5f0ff;
  padding: 1px 2px;
  border-radius: 3px;
}

.wiki-formula-highlight {
  color: #e36209;
  background: #fff8f0;
  padding: 1px 2px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
