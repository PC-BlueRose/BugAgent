<template>
  <div class="refcard">
    <template v-if="!store.results.reflection && store.stageStatus.reflection === 'idle'">
      <p class="muted">// 等待执行完成后启动</p>
    </template>
    <template v-else-if="store.stageStatus.reflection === 'running'">
      <p class="muted">// 反思中...</p>
    </template>
    <template v-else>
      <div class="ref-row">
        <span class="ref-label">▌ 修复正确</span>
        <span :class="['ref-tag', store.results.reflection?.is_correct ? 'ok' : 'err']">
          {{ store.results.reflection?.is_correct ? '✓ YES' : '✗ NO' }}
        </span>
      </div>
      <div class="ref-row">
        <span class="ref-label">▌ 置信度</span>
        <div class="conf-bar">
          <div class="conf-track">
            <div
              class="conf-fill"
              :style="{ width: ((store.results.reflection?.confidence ?? 0) * 100) + '%' }"
            ></div>
          </div>
          <span class="conf-val">
            {{ ((store.results.reflection?.confidence ?? 0) * 100).toFixed(1) }}%
          </span>
        </div>
      </div>
      <div class="ref-row">
        <span class="ref-label">▌ 需要重试</span>
        <span :class="['ref-tag', store.results.reflection?.needs_retry ? 'warn' : 'ok']">
          {{ store.results.reflection?.needs_retry ? 'YES' : 'NO' }}
        </span>
      </div>
      <template v-if="store.results.reflection?.issues?.length">
        <div class="issues-block">
          <span class="ref-label">▌ 仍存在的问题</span>
          <ul class="issues">
            <li v-for="(it, idx) in store.results.reflection.issues" :key="idx">{{ it }}</li>
          </ul>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore'

const store = useAgentStore()
</script>

<style scoped>
.refcard {
  font-size: 12px;
}
.muted {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
}
.ref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}
.ref-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  min-width: 100px;
}
.ref-tag {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid;
  letter-spacing: 0.1em;
}
.ref-tag.ok {
  color: var(--accent);
  border-color: var(--accent);
}
.ref-tag.err {
  color: var(--error);
  border-color: var(--error);
}
.ref-tag.warn {
  color: var(--warning);
  border-color: var(--warning);
}
.conf-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.conf-track {
  flex: 1;
  height: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-base);
  position: relative;
  overflow: hidden;
}
.conf-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  box-shadow: var(--shadow-glow-primary);
  transition: width 0.4s ease;
}
.conf-val {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--primary);
  font-weight: 700;
  min-width: 50px;
  text-align: right;
}
.issues-block {
  margin-top: 8px;
}
.issues {
  margin: 4px 0 0;
  padding-left: 20px;
  color: var(--text-primary);
}
.issues li {
  margin-bottom: 2px;
  font-size: 12px;
}
</style>