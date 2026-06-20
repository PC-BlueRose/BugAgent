<template>
  <div class="execard">
    <template v-if="!store.results.execution && store.stageStatus.execution === 'idle'">
      <p class="muted">// 等待修复完成后启动</p>
    </template>
    <template v-else-if="store.stageStatus.execution === 'running'">
      <p class="muted">// 正在执行修复后代码...</p>
    </template>
    <template v-else>
      <div class="metric-row">
        <div class="metric">
          <span class="metric-label">退出码</span>
          <span class="metric-val">{{ store.results.execution?.exit_code ?? '-' }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">方式</span>
          <span :class="['metric-tag', store.results.execution?.executed ? 'ok' : 'sim']">
            {{ store.results.execution?.executed ? 'REAL' : 'SIM' }}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">超时</span>
          <span :class="['metric-tag', store.results.execution?.timed_out ? 'err' : 'ok']">
            {{ store.results.execution?.timed_out ? 'YES' : 'NO' }}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">耗时</span>
          <span class="metric-val muted">—</span>
        </div>
      </div>

      <div class="io-block">
        <span class="io-label">stdout</span>
        <pre class="io-content stdout">{{ store.results.execution?.stdout || '(empty)' }}</pre>
      </div>
      <div class="io-block">
        <span class="io-label">stderr</span>
        <pre class="io-content stderr">{{ store.results.execution?.stderr || '(empty)' }}</pre>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore'

const store = useAgentStore()
</script>

<style scoped>
.execard {
  font-size: 12px;
}
.muted {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
}
.metric-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-base);
}
.metric-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
}
.metric-val {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--primary);
  font-size: 13px;
}
.metric-tag {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.1em;
  padding: 1px 6px;
  border: 1px solid;
  width: fit-content;
}
.metric-tag.ok {
  color: var(--accent);
  border-color: var(--accent);
}
.metric-tag.sim {
  color: var(--primary);
  border-color: var(--primary);
}
.metric-tag.err {
  color: var(--error);
  border-color: var(--error);
}
.io-block {
  margin-bottom: 8px;
}
.io-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin-bottom: 3px;
  text-transform: uppercase;
}
.io-content {
  background: #000;
  color: var(--text-code);
  border: 1px solid var(--border-base);
  padding: 8px 10px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
}
.io-content.stdout {
  border-color: var(--primary);
  text-shadow: 0 0 3px rgba(127, 219, 255, 0.45);
}
.io-content.stderr {
  border-color: var(--error);
  color: var(--error);
}
</style>