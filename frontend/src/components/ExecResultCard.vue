<template>
  <div class="execard">
    <template v-if="!store.results.execution && store.stageStatus.execution === 'idle'">
      <p class="muted">等待修复完成后启动</p>
    </template>
    <template v-else-if="store.stageStatus.execution === 'running'">
      <p class="muted">正在执行修复后代码…</p>
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
            {{ store.results.execution?.executed ? '真实执行' : 'LLM 模拟' }}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">超时</span>
          <span :class="['metric-tag', store.results.execution?.timed_out ? 'err' : 'ok']">
            {{ store.results.execution?.timed_out ? '是' : '否' }}
          </span>
        </div>
      </div>

      <div class="io-block">
        <span class="io-label">stdout</span>
        <pre class="io-content">{{ store.results.execution?.stdout || '(empty)' }}</pre>
      </div>
      <div class="io-block">
        <span class="io-label">stderr</span>
        <pre class="io-content">{{ store.results.execution?.stderr || '(empty)' }}</pre>
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
  font-size: 13px;
}
.muted {
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
  font-size: 13px;
}
.metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
}
.metric-label {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
}
.metric-val {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}
.metric-tag {
  font-family: var(--font-system);
  font-weight: 600;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  width: fit-content;
}
.metric-tag.ok {
  color: var(--success);
  background: rgba(52, 199, 89, 0.12);
}
.metric-tag.sim {
  color: var(--primary);
  background: var(--primary-soft);
}
.metric-tag.err {
  color: var(--error);
  background: rgba(255, 59, 48, 0.12);
}
.io-block {
  margin-bottom: 10px;
}
.io-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
  font-weight: 600;
}
.io-content {
  background: var(--bg-code);
  color: var(--text-primary);
  border: 1px solid var(--border-base);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
}
</style>