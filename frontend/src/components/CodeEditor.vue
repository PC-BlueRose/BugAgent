<template>
  <div class="ce-wrap">
    <pre
      ref="preEl"
      class="ce-pre"
      :data-lang="language"
      contenteditable="true"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      :placeholder="placeholder"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
    ></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { Language } from '@/types/domain'

const props = withDefaults(
  defineProps<{
    modelValue: string
    language: Language
    readonly?: boolean
    placeholder?: string
  }>(),
  {
    readonly: false,
    placeholder: '// 在此粘贴或输入代码\n// 也可点击「上传文件」或「加载示例」'
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const preEl = ref<HTMLPreElement | null>(null)

function setText(text: string): void {
  if (!preEl.value) return
  if (preEl.value.innerText !== text) {
    preEl.value.innerText = text
  }
}

function onInput(): void {
  if (!preEl.value) return
  emit('update:modelValue', preEl.value.innerText)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '    ')
  }
}

function onPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
}

onMounted(async () => {
  await nextTick()
  setText(props.modelValue)
})

watch(
  () => props.modelValue,
  (val) => setText(val || '')
)
</script>

<style scoped>
.ce-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-code);
  border: 1px solid var(--border-base);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color 0.15s ease;
}
.ce-wrap:focus-within {
  border-color: var(--primary);
}
.ce-pre {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 14px 16px;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  caret-color: var(--primary);
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: auto;
  cursor: text;
}
.ce-pre:empty::before {
  content: attr(placeholder);
  color: var(--text-tertiary);
  font-style: italic;
  pointer-events: none;
}
</style>