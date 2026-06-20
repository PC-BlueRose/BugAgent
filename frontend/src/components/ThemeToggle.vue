<template>
  <button
    class="tt"
    :title="`主题：${title}（点击切换）`"
    @click="store.cycleTheme"
  >
    <span class="tt-icon">{{ icon }}</span>
    <span class="tt-mode">{{ mode }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '@/stores/agentStore'

const store = useAgentStore()

const icon = computed(() => {
  if (store.theme === 'light') return '☀'
  if (store.theme === 'dark') return '🌙'
  return '◐' // auto
})

const mode = computed(() => {
  if (store.theme === 'light') return '浅'
  if (store.theme === 'dark') return '深'
  return '自'
})

const title = computed(() => {
  if (store.theme === 'light') return '浅色'
  if (store.theme === 'dark') return '深色'
  return '跟随系统'
})
</script>

<style scoped>
.tt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--border-base);
  border-radius: var(--radius-md);
  font-family: var(--font-system);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tt:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}
.tt-icon {
  font-size: 14px;
  line-height: 1;
}
.tt-mode {
  font-size: 11px;
  letter-spacing: 0.05em;
}
</style>