<template>
  <div class="wiki-formula">
    <span class="wiki-formula__content">
      <template v-for="(seg, i) in segments" :key="i">
        <WikiFormulaValue
          v-if="seg.type === 'calc' || seg.type === 'design'"
          :name="seg.text"
          :type="seg.type"
        />
        <span v-else>{{ seg.text }}</span>
      </template>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiFormulaValue from './WikiFormulaValue.vue'

const props = defineProps<{
  formula: string
}>()

interface Segment {
  type: 'text' | 'calc' | 'design'
  text: string
}

/**
 * 将公式字符串拆分为文本段、计算值段、设计值段
 * 例如 "[伤害] = <攻击力> * <冲击系数>"
 * → [{calc,"伤害"}, {text," = "}, {design,"攻击力"}, {text," * "}, {design,"冲击系数"}]
 */
const segments = computed<Segment[]>(() => {
  const result: Segment[] = []
  const formula = props.formula
  // 匹配 [xxx] 或 <xxx>
  const regex = /\[([^\]]+)\]|<([^>]+)>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(formula)) !== null) {
    // 前面的纯文本
    if (match.index > lastIndex) {
      result.push({ type: 'text', text: formula.slice(lastIndex, match.index) })
    }

    if (match[1] !== undefined) {
      // 计算值 [xxx]
      result.push({ type: 'calc', text: match[1] })
    } else if (match[2] !== undefined) {
      // 设计值 <xxx>
      result.push({ type: 'design', text: match[2] })
    }

    lastIndex = regex.lastIndex
  }

  // 尾部纯文本
  if (lastIndex < formula.length) {
    result.push({ type: 'text', text: formula.slice(lastIndex) })
  }

  return result
})
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
</style>
