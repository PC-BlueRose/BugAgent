<template>
  <div class="hp">
    <header class="hp-header">
      <span class="hp-num">▌</span>
      <span class="hp-title">HISTORY</span>
      <span class="hp-count">{{ store.history.length }}</span>
    </header>
    <div v-if="store.history.length === 0" class="hp-empty">
      <p class="muted">暂无历史记录</p>
      <p class="muted-sm">完成分析后将自动记录</p>
    </div>
    <ul v-else class="hp-list">
      <li
        v-for="h in store.history"
        :key="h.id"
        :class="['hp-item', `is-${h.status}`]"
        @click="onPick(h)"
        :title="h.code.slice(0, 200)"
      >
        <div class="hp-row1">
          <span class="hp-status">
            <template v-if="h.status === 'streaming'">◉</template>
            <template v-else-if="h.status === 'done'">✓</template>
            <template v-else>✗</template>
          </span>
          <span class="hp-lang">{{ langLabel(h.language) }}</span>
          <button class="hp-del" @click.stop="onDel(h.id)" title="删除">×</button>
        </div>
        <div class="hp-row2 muted-sm">
          <span>{{ formatTime(h.timestamp) }}</span>
          <span class="hp-time">{{ formatElapsed(h.elapsedMs) }}</span>
        </div>
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

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
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
  border: 1px solid var(--border-base);
  overflow: hidden;
}
.hp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-base);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--text-secondary);
}
.hp-num {
  color: var(--primary);
}
.hp-title {
  flex: 1;
  color: var(--primary);
  text-shadow: var(--shadow-glow-primary);
  font-weight: 700;
}
.hp-count {
  font-size: 10px;
  color: var(--text-muted);
  padding: 1px 6px;
  border: 1px solid var(--border-base);
}

.hp-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}
.muted {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 0;
}
.muted-sm {
  color: var(--text-muted);
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
  gap: 4px;
}
.hp-item {
  background: var(--bg-elevated);
  border: 1px solid transparent;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}
.hp-item:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow-primary);
}
.hp-item.is-streaming {
  border-left: 2px solid var(--primary);
}
.hp-item.is-done {
  border-left: 2px solid var(--accent);
}
.hp-item.is-error {
  border-left: 2px solid var(--error);
}

.hp-row1 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.hp-status {
  font-family: var(--font-mono);
  font-weight: 700;
}
.is-streaming .hp-status {
  color: var(--primary);
  animation: pulse-dot 1s ease-in-out infinite;
}
.is-done .hp-status {
  color: var(--accent);
}
.is-error .hp-status {
  color: var(--error);
}
.hp-lang {
  flex: 1;
  color: var(--text-primary);
}
.hp-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}
.hp-del:hover {
  color: var(--error);
}
.hp-row2 {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
}
.hp-time {
  color: var(--primary);
}
</style>