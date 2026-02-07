<template>
  <div class="wiki-formula">
    <span class="wiki-formula__content" v-html="highlightedFormula"></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  formula: string
}>()

/** 高亮公式中的计算值和设计值 */
const highlightedFormula = computed(() => {
  let result = escapeHtml(props.formula)
  // 计算值 [xxx]
  result = result.replace(/\[([^\]]+)\]/g, '<span class="wiki-formula__calc">[$1]</span>')
  // 设计值 <xxx>（已被转义为 &lt;xxx&gt;）
  result = result.replace(/&lt;([^&]+)&gt;/g, '<span class="wiki-formula__design">&lt;$1&gt;</span>')
  return result
})

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<style scoped>
.wiki-formula {
  display: block;
  background: #f0f4f8;
  border-left: 3px solid #0969da;
  padding: 8px 12px;
  margin: 8px 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  border-radius: 0 4px 4px 0;
}

.wiki-formula :deep(.wiki-formula__calc) {
  color: #0550ae;
  font-weight: 600;
}

.wiki-formula :deep(.wiki-formula__design) {
  color: #8250df;
  font-style: italic;
}
</style>
