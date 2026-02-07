<template>
  <div class="markdown-viewer" ref="containerRef">
    <DynamicContent :html="renderedHtml" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { createMarkdownRenderer } from '@/markdown'
import WikiTerm from './WikiTerm.vue'
import WikiDefinition from './WikiDefinition.vue'
import WikiFormula from './WikiFormula.vue'

const props = defineProps<{
  content: string
}>()

const md = createMarkdownRenderer()

/**
 * 手动剥离 frontmatter（避免在浏览器中使用 gray-matter，它依赖 Node.js Buffer）
 */
function stripFrontmatter(raw: string): string {
  const trimmed = raw.trimStart()
  if (!trimmed.startsWith('---')) return raw
  const endIndex = trimmed.indexOf('---', 3)
  if (endIndex === -1) return raw
  return trimmed.slice(endIndex + 3).trimStart()
}

/** 去掉 frontmatter 后渲染 */
const renderedHtml = computed(() => {
  if (!props.content) return ''
  const content = stripFrontmatter(props.content)
  return md.render(content)
})

/**
 * 动态组件：将 HTML 字符串编译为 Vue 模板
 * 这样 <wiki-term>、<wiki-definition>、<wiki-formula> 会映射到真正的 Vue 组件
 */
const DynamicContent = defineComponent({
  props: {
    html: { type: String, default: '' },
  },
  components: {
    'wiki-term': WikiTerm,
    'wiki-definition': WikiDefinition,
    'wiki-formula': WikiFormula,
  },
  render() {
    if (!this.html) return h('div')
    // 使用 Vue 的运行时编译：将 HTML 作为模板
    return h({
      template: `<div>${this.html}</div>`,
      components: {
        'wiki-term': WikiTerm,
        'wiki-definition': WikiDefinition,
        'wiki-formula': WikiFormula,
      },
    })
  },
})
</script>

<style scoped>
.markdown-viewer {
  line-height: 1.7;
  font-size: 15px;
  color: #24292e;
}

.markdown-viewer :deep(h1) { font-size: 2em; margin: 0.67em 0; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-viewer :deep(h2) { font-size: 1.5em; margin: 0.83em 0; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-viewer :deep(h3) { font-size: 1.25em; margin: 1em 0; }
.markdown-viewer :deep(p) { margin: 0.8em 0; }
.markdown-viewer :deep(ul), .markdown-viewer :deep(ol) { padding-left: 2em; margin: 0.5em 0; }
.markdown-viewer :deep(code) { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
.markdown-viewer :deep(pre) { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
.markdown-viewer :deep(pre code) { background: none; padding: 0; }
.markdown-viewer :deep(blockquote) { border-left: 4px solid #dfe2e5; padding: 0 1em; color: #6a737d; margin: 0.5em 0; }
.markdown-viewer :deep(hr) { border: none; border-top: 1px solid #eaecef; margin: 1.5em 0; }
.markdown-viewer :deep(table) { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.markdown-viewer :deep(th), .markdown-viewer :deep(td) { border: 1px solid #dfe2e5; padding: 6px 13px; }
.markdown-viewer :deep(th) { background: #f6f8fa; font-weight: 600; }
</style>
