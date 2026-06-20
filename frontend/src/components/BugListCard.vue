<template>
  <div class="bugcard">
    <template v-if="!store.results.analysis && store.stageStatus.analysis === 'idle'">
      <p class="muted">// 等待系统分析启动</p>
    </template>
    <template v-else-if="store.stageStatus.analysis === 'running'">
      <p class="muted">// 正在扫描代码...</p>
    </template>
    <template v-else>
      <p class="summary-text">{{ store.results.analysis?.summary || '—' }}</p>
      <div v-if="store.results.analysis?.bugs?.length" class="bug-table">
        <div class="bug-row bug-header">
          <span class="bug-cell" style="flex: 0.5">#</span>
          <span class="bug-cell" style="flex: 1.5">类型</span>
          <span class="bug-cell" style="flex: 0.8">严重</span>
          <span class="bug-cell" style="flex: 3">描述</span>
        </div>
        <div
          v-for="(b, i) in store.results.analysis.bugs"
          :key="i"
          class="bug-row"
        >
          <span class="bug-cell bug-line" style="flex: 0.5">{{ b.line ?? '-' }}</span>
          <span class="bug-cell" style="flex: 1.5">{{ b.type }}</span>
          <span class="bug-cell">
            <span :class="['sev', `sev-${b.severity}`]">{{ b.severity }}</span>
          </span>
          <span class="bug-cell bug-desc" style="flex: 3">{{ b.description }}</span>
        </div>
      </div>
      <p v-else class="muted">// 无 Bug</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore'
import type { Severity } from '@/types/domain'

const store = useAgentStore()

function severityType(_s: Severity) {
  return _s // keep
}
</script>

<style scoped>
.bugcard {
  font-size: 12px;
  color: var(--text-primary);
}
.muted {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
}
.summary-text {
  background: rgba(0, 240, 255, 0.05);
  border-left: 2px solid var(--primary);
  padding: 8px 12px;
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.bug-table {
  border: 1px solid var(--border-base);
}
.bug-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border-base);
}
.bug-row:last-child {
  border-bottom: none;
}
.bug-header {
  background: var(--bg-elevated);
  font-weight: 700;
  color: var(--primary);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.bug-cell {
  padding: 6px 8px;
  border-right: 1px solid var(--border-base);
  font-size: 12px;
}
.bug-cell:last-child {
  border-right: none;
}
.bug-line {
  color: var(--primary);
  font-family: var(--font-mono);
  font-weight: 700;
}
.bug-desc {
  color: var(--text-secondary);
}
.sev {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border: 1px solid;
}
.sev-high {
  color: var(--error);
  border-color: var(--error);
  background: rgba(255, 56, 96, 0.1);
}
.sev-medium {
  color: var(--warning);
  border-color: var(--warning);
}
.sev-low {
  color: var(--text-secondary);
  border-color: var(--border-base);
}
</style>