<template>
  <div class="markdown-editor">
    <MilkdownProvider>
      <MilkdownEditor
        :content="content"
        @update:content="$emit('update:content', $event)"
        @save="$emit('save')"
      />
    </MilkdownProvider>
  </div>
</template>

<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{
  content: string
}>()

defineEmits<{
  'update:content': [content: string]
  save: []
}>()
</script>

<style scoped>
.markdown-editor {
  min-height: 300px;
}
</style>
