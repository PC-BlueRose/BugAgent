<template>
  <div :class="['sc', `sc-${status}`]">
    <header class="sc-header">
      <span class="sc-num">{{ num }}</span>
      <span class="sc-title">{{ title }}</span>
      <span class="sc-status">
        <template v-if="status === 'running'">
          <span class="sc-dot"></span> RUNNING
        </template>
        <template v-else-if="status === 'done'">
          <span class="sc-check">✓</span> DONE
        </template>
        <template v-else-if="status === 'error'">
          <span class="sc-x">✗</span> ERROR
        </template>
        <template v-else>
          <span class="sc-pending">○</span> IDLE
        </template>
      </span>
    </header>
    <div class="sc-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  num: string
  title: string
  status: 'idle' | 'running' | 'done' | 'error'
}>()
</script>

<style scoped>
.sc {
  position: relative;
  background: var(--bg-panel);
  border: 1px solid var(--border-base);
  margin-bottom: 10px;
  transition: all 0.3s ease;
  overflow: hidden;
}
.sc::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--border-base);
  transition: background 0.3s ease;
}
.sc-idle::before {
  background: var(--border-base);
}
.sc-running {
  border-color: var(--primary);
  animation: pulse-glow 2s ease-in-out infinite;
}
.sc-running::before {
  background: var(--primary);
}
.sc-done {
  border-color: var(--accent);
  box-shadow: var(--shadow-glow-accent);
  animation: glow-flash 0.6s ease-out 1;
}
.sc-done::before {
  background: var(--accent);
}
.sc-error {
  border-color: var(--error);
  box-shadow: 0 0 12px rgba(255, 56, 96, 0.5);
}
.sc-error::before {
  background: var(--error);
}

.sc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 18px;
  border-bottom: 1px solid var(--border-base);
  background: rgba(255, 255, 255, 0.02);
}
.sc-num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}
.sc-title {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-primary);
  text-transform: uppercase;
}
.sc-running .sc-title {
  color: var(--primary);
  text-shadow: var(--shadow-glow-primary);
}
.sc-done .sc-title {
  color: var(--accent);
  text-shadow: var(--shadow-glow-accent);
}

.sc-status {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.sc-running .sc-status {
  color: var(--primary);
}
.sc-done .sc-status {
  color: var(--accent);
}
.sc-error .sc-status {
  color: var(--error);
}
.sc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 1s ease-in-out infinite;
}
.sc-check {
  color: var(--accent);
  font-weight: 700;
}
.sc-x {
  color: var(--error);
  font-weight: 700;
}

.sc-body {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-primary);
}
</style>