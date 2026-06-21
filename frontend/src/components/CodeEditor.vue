<template>
  <div class="ce-wrap">
    <!-- 显示层：highlight.js 着色（pointer-events: none）-->
    <pre
      ref="displayEl"
      class="ce-display"
      :data-lang="language"
      aria-hidden="true"
    ><code :class="`language-${language} hljs`" v-html="highlightedHtml"></code></pre>

    <!-- 编辑层：textarea，透明文字 + 可见光标（z-index 在上）-->
    <textarea
      ref="inputEl"
      class="ce-input"
      :value="modelValue"
      :placeholder="placeholder"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      :readonly="readonly"
      @input="onInput"
      @keydown="onKeydown"
      @scroll="onScroll"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'

hljs.registerLanguage('python', python)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', cpp) // C 用 cpp 高亮
hljs.registerLanguage('java', java)

const props = withDefaults(
  defineProps<{
    modelValue: string
    language: string
    readonly?: boolean
    placeholder?: string
  }>(),
  {
    readonly: false,
    placeholder: '// 在此粘贴或输入代码\n// 也可点击「上传文件」或「加载示例」'
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const inputEl = ref<HTMLTextAreaElement | null>(null)
const displayEl = ref<HTMLPreElement | null>(null)

const SUPPORTED = ['python', 'c', 'cpp', 'java']

const highlightedHtml = computed(() => {
  const text = props.modelValue || ''
  if (!text) return ''
  try {
    const lang = SUPPORTED.includes(props.language) ? props.language : 'plaintext'
    return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(text)
  }
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = e.target as HTMLTextAreaElement
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const v = ta.value
    const newVal = v.slice(0, start) + '    ' + v.slice(end)
    ta.value = newVal
    ta.selectionStart = ta.selectionEnd = start + 4
    emit('update:modelValue', newVal)
  }
}

function onScroll() {
  // 同步 display 与 input 的滚动位置
  const ta = inputEl.value
  const pre = displayEl.value
  if (ta && pre) {
    pre.scrollTop = ta.scrollTop
    pre.scrollLeft = ta.scrollLeft
  }
}

onMounted(async () => {
  await nextTick()
})
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

.ce-display,
.ce-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 14px 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: auto;
  box-sizing: border-box;
  border: none;
}

.ce-display {
  pointer-events: none;
  color: var(--text-primary);
  background: transparent;
  z-index: 1;
  margin: 0;
}
.ce-display code {
  font-family: inherit;
  background: transparent;
  padding: 0;
  display: block;
}

.ce-input {
  z-index: 2;
  background: transparent;
  color: transparent;
  caret-color: var(--primary);
  outline: none;
  resize: none;
}
.ce-input:focus {
  outline: none;
}
.ce-input::placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}
.ce-input::selection {
  background: var(--primary-soft);
}
</style>