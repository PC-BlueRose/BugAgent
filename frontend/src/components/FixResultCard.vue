<template>
  <div class="fixcard">
    <template v-if="!store.results.fix && store.stageStatus.fix === 'idle'">
      <p class="muted">// 等待系统分析完成后启动</p>
    </template>
    <template v-else-if="store.stageStatus.fix === 'running'">
      <p class="muted">// 正在生成修复代码...</p>
    </template>
    <template v-else>
      <div v-if="store.results.fix?.explanation" class="explain">
        <span class="explain-label">▌ 说明</span>
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
  font-size: 12px;
}
.muted {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
}
.explain {
  margin-bottom: 8px;
  font-size: 12px;
}
.explain-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--primary);
  margin-bottom: 4px;
  text-shadow: var(--shadow-glow-primary);
}
.explain p {
  margin: 0;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.code-block {
  background: #000;
  color: var(--text-code);
  border: 1px solid var(--border-active);
  padding: 10px 12px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  text-shadow: 0 0 4px rgba(127, 219, 255, 0.5);
  max-height: 320px;
  overflow: auto;
}
</style>