<template>
  <div :class="['sc', `is-${status}`]">
    <span class="sc-icon" :aria-label="status">
      <template v-if="status === 'done'">✓</template>
      <template v-else-if="status === 'running'">⏳</template>
      <template v-else-if="status === 'error'">✗</template>
      <template v-else>○</template>
    </span>
    <div class="sc-body">
      <div class="sc-title">{{ title }}</div>
      <div class="sc-desc">
        <template v-if="status === 'done'">完成</template>
        <template v-else-if="status === 'running'">运行中…</template>
        <template v-else-if="status === 'error'">出错</template>
        <template v-else>等待中</template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  status: 'idle' | 'running' | 'done' | 'error'
}>()
</script>

<style scoped>
.sc {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-base);
  transition: background 0.15s ease;
}
.sc:last-child {
  border-bottom: none;
}
.sc:hover {
  background: var(--bg-elevated);
}

.sc-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  background: var(--bg-elevated);
  color: var(--text-tertiary);
  transition: all 0.2s ease;
}
.is-done .sc-icon {
  background: var(--success);
  color: #ffffff;
}
.is-running .sc-icon {
  background: var(--primary-soft);
  color: var(--primary);
  animation: spin 2s linear infinite;
}
.is-error .sc-icon {
  background: var(--error);
  color: #ffffff;
}

.sc-body {
  flex: 1;
  min-width: 0;
}
.sc-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}
.sc-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

@keyframes spin {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>