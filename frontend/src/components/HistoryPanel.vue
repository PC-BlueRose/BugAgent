<template>
  <div class="hp">
    <header class="hp-header">
      <span class="hp-title">History</span>
      <span class="hp-count">{{ store.history.length }}</span>
    </header>
    <div v-if="store.history.length === 0" class="hp-empty">
      <p class="muted">暂无历史记录</p>
      <p class="muted-sm">完成分析后自动记录</p>
    </div>
    <ul v-else class="hp-list">
      <li
        v-for="h in store.history"
        :key="h.id"
        :class="['hp-item', `is-${h.status}`]"
        @click="onPick(h)"
        :title="h.code.slice(0, 200)"
      >
        <span class="hp-icon">
          <template v-if="h.status === 'done'">✓</template>
          <template v-else-if="h.status === 'error'">✗</template>
          <template v-else>○</template>
        </span>
        <span class="hp-lang">{{ langLabel(h.language) }}</span>
        <span class="hp-time">{{ formatElapsed(h.elapsedMs) }}</span>
        <button class="hp-del" @click.stop="onDel(h.id)" title="删除">×</button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore'
import { languageLabel } from '@/utils/language'

const store = useAgentStore()

function langLabel(lang: string): string {
  return languageLabel(lang as any)
}

function formatElapsed(ms: number): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function onPick(h: { id: string }) {
  if (store.isStreaming) return
  const entry = store.loadHistoryEntry(h.id)
  if (entry) {
    store.language = entry.language
    store.originalCode = entry.code
  }
}

function onDel(id: string) {
  store.removeHistory(id)
}
</script>

<style scoped>
.hp {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-base);
  overflow: hidden;
}
.hp-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-base);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
}
.hp-title {
  flex: 1;
  color: var(--text-primary);
}
.hp-count {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 1px 6px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
}

.hp-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}
.muted {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}
.muted-sm {
  color: var(--text-tertiary);
  font-size: 11px;
  margin: 4px 0 0;
}

.hp-list {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.12s ease;
  font-size: 13px;
  color: var(--text-primary);
}
.hp-item:hover {
  background: var(--bg-elevated);
}
.hp-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}
.is-done .hp-icon {
  color: var(--success);
}
.is-error .hp-icon {
  color: var(--error);
}
.hp-lang {
  flex: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hp-time {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}
.hp-del {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
}
.hp-del:hover {
  color: var(--error);
}
</style>