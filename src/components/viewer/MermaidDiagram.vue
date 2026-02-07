<template>
  <div class="mermaid-diagram" ref="containerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import mermaid from 'mermaid'

const props = defineProps<{
  code: string
}>()

const containerRef = ref<HTMLElement>()

// 初始化 mermaid 配置
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
})

// 解码 HTML 实体
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

async function renderDiagram() {
  if (!containerRef.value || !props.code) return
  
  // 清空容器
  containerRef.value.innerHTML = ''
  
  try {
    // 使用随机 ID 确保唯一性
    const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
    const decodedCode = decodeHtmlEntities(props.code)
    const { svg } = await mermaid.render(id, decodedCode)
    containerRef.value.innerHTML = svg
  } catch (err) {
    console.error('Mermaid render error:', err)
    containerRef.value.innerHTML = `<pre class="mermaid-error">Mermaid 语法错误:\n${props.code}</pre>`
  }
}

onMounted(renderDiagram)
watch(() => props.code, renderDiagram)
</script>

<style scoped>
.mermaid-diagram {
  margin: 1em 0;
  text-align: center;
}

.mermaid-diagram :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-diagram :deep(.mermaid-error) {
  background: #fff5f5;
  border: 1px solid #feb2b2;
  color: #c53030;
  padding: 1em;
  border-radius: 4px;
  text-align: left;
  white-space: pre-wrap;
}
</style>
