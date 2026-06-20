<template>
  <div class="bugcard">
    <template v-if="!store.results.analysis && store.stageStatus.analysis === 'idle'">
      <p class="muted">等待系统分析启动</p>
    </template>
    <template v-else-if="store.stageStatus.analysis === 'running'">
      <p class="muted">正在扫描代码…</p>
    </template>
    <template v-else>
      <p class="summary">{{ store.results.analysis?.summary || '—' }}</p>
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
      <p v-else class="muted">无 Bug</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore'

const store = useAgentStore()
</script>

<style scoped>
.bugcard {
  font-size: 13px;
  color: var(--text-primary);
}
.muted {
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
  font-size: 13px;
}
.summary {
  background: var(--primary-soft);
  border-left: 3px solid var(--primary);
  padding: 10px 14px;
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-primary);
  white-space: pre-wrap;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.bug-table {
  border: 1px solid var(--border-base);
  border-radius: var(--radius-md);
  overflow: hidden;
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
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.bug-cell {
  padding: 8px 10px;
  border-right: 1px solid var(--border-base);
  font-size: 12px;
}
.bug-cell:last-child {
  border-right: none;
}
.bug-line {
  color: var(--primary);
  font-family: var(--font-mono);
  font-weight: 600;
}
.bug-desc {
  color: var(--text-secondary);
}
.sev {
  display: inline-block;
  padding: 1px 8px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
}
.sev-high {
  color: #ffffff;
  background: var(--error);
}
.sev-medium {
  color: #ffffff;
  background: var(--warning);
}
.sev-low {
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-base);
}
</style>