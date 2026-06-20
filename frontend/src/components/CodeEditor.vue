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
    <!-- 扫描线装饰 -->
    <div class="ce-scanline" aria-hidden="true"></div>
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
    placeholder: '// 粘贴或输入代码\n// 也可点击「上传文件」或「加载示例」'
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const preEl = ref<HTMLPreElement | null>(null)

function setText(text: string): void {
  if (!preEl.value) return
  // 仅在内容不同时设置（避免 caret 跳动）
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
  (val) => {
    setText(val || '')
  }
)
</script>

<style scoped>
.ce-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-code);
  border: 1px solid var(--border-active);
  box-shadow: var(--shadow-glow-primary);
  overflow: hidden;
}
.ce-pre {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 16px 18px 16px 18px;
  background: transparent;
  color: var(--text-code);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.65;
  caret-color: var(--primary);
  text-shadow: 0 0 4px rgba(127, 219, 255, 0.55);
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: auto;
  cursor: text;
}
.ce-pre:empty::before {
  content: attr(placeholder);
  color: var(--text-muted);
  font-style: italic;
  text-shadow: none;
  pointer-events: none;
}
.ce-scanline {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    rgba(0, 240, 255, 0.025) 2px,
    rgba(0, 240, 255, 0.025) 4px
  );
}
.ce-scanline::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 240, 255, 0.06) 50%,
    transparent
  );
  animation: scan-line 8s linear infinite;
}
</style>