<template>
  <button
    :type="type"
    :class="['cb', `cb-${variant}`, { 'is-disabled': disabled || loading }]"
    :disabled="disabled || loading"
    @click="onClick"
  >
    <span v-if="loading" class="cb-dot" aria-hidden="true"></span>
    <span v-else-if="$slots.icon" class="cb-icon">
      <slot name="icon" />
    </span>
    <span class="cb-label">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'ghost' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false, loading: false }
)
const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
function onClick(ev: MouseEvent) {
  emit('click', ev)
}
</script>

<style scoped>
.cb {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 18px;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.05em;
  background: transparent;
  border: 1px solid var(--border-base);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
  white-space: nowrap;
}
.cb:hover:not(.is-disabled) {
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: var(--shadow-glow-primary);
}
.cb:active:not(.is-disabled) {
  transform: scale(0.98);
}
.cb.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Primary: 青蓝填充 */
.cb-primary {
  background: var(--primary);
  color: var(--bg-base);
  border-color: var(--primary);
  font-weight: 700;
}
.cb-primary:hover:not(.is-disabled) {
  background: var(--primary);
  color: var(--bg-base);
  box-shadow: var(--shadow-glow-strong);
  filter: brightness(1.1);
}

/* Accent: 品红 */
.cb-accent {
  background: transparent;
  color: var(--accent);
  border-color: var(--accent);
  font-weight: 700;
}
.cb-accent:hover:not(.is-disabled) {
  background: var(--accent);
  color: var(--bg-base);
  box-shadow: var(--shadow-glow-accent);
}

/* Ghost: 仅文字 */
.cb-ghost {
  border-color: transparent;
  background: transparent;
}
.cb-ghost:hover:not(.is-disabled) {
  border-color: var(--border-base);
  background: var(--bg-elevated);
}

/* Danger: 红色 */
.cb-danger {
  border-color: var(--error);
  color: var(--error);
}
.cb-danger:hover:not(.is-disabled) {
  background: var(--error);
  color: var(--bg-base);
  box-shadow: 0 0 12px rgba(255, 56, 96, 0.6);
}

.cb-label {
  position: relative;
  z-index: 1;
}
.cb-icon,
.cb-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cb-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 1s ease-in-out infinite;
}
</style>