<template>
  <div class="refcard">
    <template v-if="!store.results.reflection && store.stageStatus.reflection === 'idle'">
      <p class="muted">等待执行完成后启动</p>
    </template>
    <template v-else-if="store.stageStatus.reflection === 'running'">
      <p class="muted">反思中…</p>
    </template>
    <template v-else>
      <div class="ref-row">
        <span class="ref-label">修复正确</span>
        <span :class="['ref-tag', store.results.reflection?.is_correct ? 'ok' : 'err']">
          {{ store.results.reflection?.is_correct ? '✓ 是' : '✗ 否' }}
        </span>
      </div>
      <div class="ref-row">
        <span class="ref-label">置信度</span>
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
        <span class="ref-label">需要重试</span>
        <span :class="['ref-tag', store.results.reflection?.needs_retry ? 'warn' : 'ok']">
          {{ store.results.reflection?.needs_retry ? '是' : '否' }}
        </span>
      </div>
      <template v-if="store.results.reflection?.issues?.length">
        <div class="issues-block">
          <span class="ref-label">仍存在的问题</span>
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
  font-size: 13px;
}
.muted {
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
  font-size: 13px;
}
.ref-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 13px;
}
.ref-label {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  min-width: 80px;
  font-weight: 500;
}
.ref-tag {
  font-family: var(--font-system);
  font-weight: 600;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.04em;
}
.ref-tag.ok {
  color: var(--success);
  background: rgba(52, 199, 89, 0.12);
}
.ref-tag.err {
  color: var(--error);
  background: rgba(255, 59, 48, 0.12);
}
.ref-tag.warn {
  color: var(--warning);
  background: rgba(255, 149, 0, 0.12);
}
.conf-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.conf-track {
  flex: 1;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}
.conf-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.4s ease;
}
.conf-val {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}
.issues-block {
  margin-top: 12px;
}
.issues {
  margin: 6px 0 0;
  padding-left: 20px;
  color: var(--text-primary);
}
.issues li {
  margin-bottom: 4px;
  font-size: 13px;
}
</style>