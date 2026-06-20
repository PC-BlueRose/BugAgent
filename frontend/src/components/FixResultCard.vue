<template>
  <div class="fixcard">
    <template v-if="!store.results.fix && store.stageStatus.fix === 'idle'">
      <p class="muted">等待系统分析完成后启动</p>
    </template>
    <template v-else-if="store.stageStatus.fix === 'running'">
      <p class="muted">正在生成修复代码…</p>
    </template>
    <template v-else>
      <div v-if="store.results.fix?.explanation" class="explain">
        <span class="explain-label">说明</span>
        <p>{{ store.results.fix.explanation }}</p>
      </div>
      <pre class="code-block">{{ store.results.fix?.fixed_code || '—' }}</pre>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore'

const store = useAgentStore()
</script>

<style scoped>
.fixcard {
  font-size: 13px;
}
.muted {
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
  font-size: 13px;
}
.explain {
  margin-bottom: 10px;
  font-size: 13px;
}
.explain-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
  font-weight: 600;
}
.explain p {
  margin: 0;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.code-block {
  background: var(--bg-code);
  color: var(--text-primary);
  border: 1px solid var(--border-base);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 360px;
  overflow: auto;
}
</style>