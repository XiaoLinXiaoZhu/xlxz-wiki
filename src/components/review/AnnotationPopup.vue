<template>
  <div
    v-if="visible"
    class="annotation-popup"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    @mousedown.stop
  >
    <div class="annotation-popup__arrow"></div>
    <div class="annotation-popup__quote">
      "{{ truncate(selectedText, 80) }}"
    </div>
    <textarea
      ref="textareaRef"
      v-model="comment"
      class="annotation-popup__input"
      placeholder="输入你的建议…"
      rows="3"
      @keydown.enter.ctrl="handleSubmit"
      @keydown.escape="handleCancel"
    ></textarea>
    <div class="annotation-popup__footer">
      <span class="annotation-popup__hint">Ctrl+Enter 提交 · Esc 取消</span>
      <div class="annotation-popup__btns">
        <button class="annotation-popup__btn annotation-popup__btn--cancel" @click="handleCancel">
          取消
        </button>
        <button
          class="annotation-popup__btn annotation-popup__btn--submit"
          :disabled="!comment.trim()"
          @click="handleSubmit"
        >
          添加批注
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  selectedText: string
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  submit: [comment: string]
  cancel: []
}>()

const comment = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      comment.value = ''
      await nextTick()
      textareaRef.value?.focus()
    }
  },
)

function handleSubmit() {
  if (!comment.value.trim()) return
  emit('submit', comment.value.trim())
  comment.value = ''
}

function handleCancel() {
  comment.value = ''
  emit('cancel')
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}
</script>

<style scoped>
.annotation-popup {
  position: fixed;
  z-index: 1000;
  width: 320px;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 12px;
  transform: translateX(-50%);
}

.annotation-popup__arrow {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: #fff;
  border-left: 1px solid #e1e4e8;
  border-top: 1px solid #e1e4e8;
}

.annotation-popup__quote {
  font-size: 12px;
  color: #6a737d;
  font-style: italic;
  padding: 6px 8px;
  background: #f6f8fa;
  border-left: 3px solid #0366d6;
  border-radius: 2px;
  margin-bottom: 8px;
  word-break: break-all;
}

.annotation-popup__input {
  width: 100%;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}

.annotation-popup__input:focus {
  border-color: #0366d6;
  box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.15);
}

.annotation-popup__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.annotation-popup__hint {
  font-size: 11px;
  color: #959da5;
}

.annotation-popup__btns {
  display: flex;
  gap: 6px;
}

.annotation-popup__btn {
  font-size: 12px;
  padding: 4px 12px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.annotation-popup__btn--cancel {
  background: #fff;
  color: #586069;
}

.annotation-popup__btn--cancel:hover {
  background: #f6f8fa;
}

.annotation-popup__btn--submit {
  background: #0366d6;
  color: #fff;
  border-color: #0366d6;
}

.annotation-popup__btn--submit:hover {
  background: #0256b9;
}

.annotation-popup__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
