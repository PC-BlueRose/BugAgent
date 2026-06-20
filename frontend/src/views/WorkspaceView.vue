<template>
  <div class="workspace">
    <!-- ============= Header (毛玻璃) ============= -->
    <header class="ws-header">
      <div class="ws-header-left">
        <h1 class="ws-title">Bug Agent</h1>
        <span class="ws-subtitle">基于大模型的代码 Bug 自动识别 · 修复 · 验证 · 反思</span>
      </div>
      <div class="ws-header-right">
        <div v-if="store.isStreaming" class="ws-stat">
          <span class="ws-stat-label">已用时</span>
          <span class="ws-stat-value">{{ runningElapsed }}</span>
        </div>
        <div v-else-if="store.elapsedText" class="ws-stat">
          <span class="ws-stat-label">总耗时</span>
          <span class="ws-stat-value">{{ store.elapsedText }}</span>
        </div>
        <span :class="['ws-badge', `is-${store.finalStatus}`]">
          {{ badgeText }}
        </span>
        <ThemeToggle />
      </div>
    </header>

    <!-- ============= Main: 3 Columns ============= -->
    <main class="ws-body">
      <!-- 左栏：历史 -->
      <aside class="ws-col ws-col-left">
        <HistoryPanel />
      </aside>

      <!-- 中栏：代码 + 运行 -->
      <section class="ws-col ws-col-center">
        <header class="ws-col-header">
          <span class="ws-col-title">Source Code</span>
        </header>
        <div class="ws-center-toolbar">
          <el-select v-model="store.language" :disabled="store.isStreaming" size="small" style="width: 130px">
            <el-option v-for="l in LANGUAGES" :key="l.value" :label="l.label" :value="l.value" />
          </el-select>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".py,.c,.cpp,.java,.cc,.cxx"
            :on-change="onFile"
          >
            <button class="ap-btn ap-btn-ghost" :disabled="store.isStreaming">📁 上传文件</button>
          </el-upload>
          <button class="ap-btn ap-btn-ghost" :disabled="store.isStreaming" @click="loadSample">加载示例</button>
          <button class="ap-btn ap-btn-ghost" :disabled="store.isStreaming" @click="onClear">清空</button>
          <span class="ws-char-count">{{ store.originalCode.length }} 字符</span>
        </div>

        <div class="ws-editor">
          <CodeEditor
            v-model="store.originalCode"
            :language="store.language"
            :readonly="store.isStreaming"
          />
        </div>

        <div class="ws-actions">
          <button
            class="ap-btn ap-btn-primary"
            :disabled="!store.canSubmit"
            @click="store.submit"
          >
            <span v-if="store.isStreaming" class="ap-spinner"></span>
            <span v-else>▶</span>
            {{ store.isStreaming ? '运行中…' : '开始分析' }}
          </button>
          <button
            class="ap-btn ap-btn-accent"
            :disabled="!store.isStreaming"
            @click="store.stop"
          >
            ⏹ 停止
          </button>
        </div>
      </section>

      <!-- 右栏：4 阶段 HUD -->
      <aside class="ws-col ws-col-right">
        <header class="ws-col-header">
          <span class="ws-col-title">Analysis Pipeline</span>
          <span v-if="store.currentRound > 0" class="ws-col-round">
            R{{ store.currentRound }}/{{ store.maxRounds }}
          </span>
        </header>
        <div class="ws-stages">
          <StageCard title="系统分析" :status="store.stageStatus.analysis">
            <BugListCard />
          </StageCard>
          <StageCard title="自动修复" :status="store.stageStatus.fix">
            <FixResultCard />
          </StageCard>
          <StageCard title="执行验证" :status="store.stageStatus.execution">
            <ExecResultCard />
          </StageCard>
          <StageCard title="自我反思" :status="store.stageStatus.reflection">
            <ReflectionCard />
          </StageCard>
        </div>
      </aside>
    </main>

    <!-- ============= Footer (毛玻璃) ============= -->
    <footer class="ws-footer">
      <button
        class="ap-btn ap-btn-primary"
        :disabled="!store.canExportPdf"
        @click="exportPdf"
      >
        ⬇ 生成 PDF 报告
      </button>
      <span v-if="store.canExportPdf" class="ws-footer-text">
        点击下载 A4 报告（共 {{ store.currentRound }} 轮，{{ store.elapsedText }}）
      </span>
      <span v-else-if="store.errorMsg" class="ws-footer-text ws-err">
        {{ store.errorMsg }}
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

import HistoryPanel from '@/components/HistoryPanel.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import StageCard from '@/components/StageCard.vue'
import BugListCard from '@/components/BugListCard.vue'
import FixResultCard from '@/components/FixResultCard.vue'
import ExecResultCard from '@/components/ExecResultCard.vue'
import ReflectionCard from '@/components/ReflectionCard.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

import { useAgentStore } from '@/stores/agentStore'
import { exportReportToPdf } from '@/utils/pdf'
import { DEFAULT_SAMPLE_CODE, LANGUAGES } from '@/utils/language'
import type { Language } from '@/types/domain'

const store = useAgentStore()

const tick = ref(0)
let timerId: number | null = null
onMounted(() => {
  timerId = window.setInterval(() => {
    tick.value++
  }, 1000)
})
onUnmounted(() => {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
})

const runningElapsed = computed(() => {
  void tick.value
  if (!store.isStreaming || !store.startTime) return '0.0s'
  const ms = Date.now() - store.startTime
  return `${(ms / 1000).toFixed(1)}s`
})

const badgeText = computed(() => {
  switch (store.finalStatus) {
    case 'streaming':
      return '◉ ANALYZING'
    case 'done':
      return '✓ DONE'
    case 'error':
      return '✗ ERROR'
    default:
      return '○ STANDBY'
  }
})

async function onFile(file: { raw?: File }) {
  const f = file?.raw
  if (!f) return
  if (f.size > 1024 * 64) {
    ElMessage.warning('文件过大（>64KB），建议精简后再上传')
  }
  const text = await f.text()
  store.originalCode = text
  const name = f.name.toLowerCase()
  if (name.endsWith('.py')) store.language = 'python'
  else if (name.endsWith('.c')) store.language = 'c'
  else if (name.endsWith('.cpp') || name.endsWith('.cc') || name.endsWith('.cxx')) store.language = 'cpp'
  else if (name.endsWith('.java')) store.language = 'java'
}

function loadSample() {
  const lang = store.language as Language
  store.originalCode = DEFAULT_SAMPLE_CODE[lang] || ''
  ElMessage.success(`已加载 ${lang} 示例代码`)
}

function onClear() {
  store.reset()
  ElMessage.info('已清空')
}

async function exportPdf() {
  try {
    await exportReportToPdf({
      filename: `bug-agent-report-${Date.now()}.pdf`,
      language: store.language,
      originalCode: store.originalCode,
      analysis: store.results.analysis,
      fix: store.results.fix,
      execution: store.results.execution,
      reflection: store.results.reflection,
      totalRounds: store.currentRound,
      totalElapsedMs: store.elapsedMs
    })
    ElMessage.success('PDF 已下载')
  } catch (e: any) {
    ElMessage.error(`PDF 导出失败: ${e?.message || e}`)
  }
}
</script>

<style scoped>
.workspace {
  display: grid;
  grid-template-rows: 60px 1fr 56px;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}

/* ============= Apple Button 通用类 ============= */
.ap-btn {
  font-family: var(--font-system);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.ap-btn:hover:not(:disabled) {
  background: var(--bg-base);
  border-color: var(--border-strong);
}
.ap-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.ap-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ap-btn-primary {
  background: var(--primary);
  color: var(--primary-text);
  font-weight: 600;
}
.ap-btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.ap-btn-accent {
  background: transparent;
  color: var(--error);
  border-color: var(--error);
}
.ap-btn-accent:hover:not(:disabled) {
  background: var(--error);
  color: #ffffff;
}

.ap-btn-ghost {
  background: transparent;
  border-color: var(--border-base);
  color: var(--text-primary);
}
.ap-btn-ghost:hover:not(:disabled) {
  background: var(--bg-elevated);
}

.ap-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============= Header (毛玻璃) ============= */
.ws-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--border-base);
}
.ws-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ws-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0;
}
.ws-subtitle {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}
.ws-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ws-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  font-size: 12px;
}
.ws-stat-label {
  color: var(--text-secondary);
  font-size: 11px;
}
.ws-stat-value {
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-weight: 600;
}
.ws-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-secondary);
}
.ws-badge.is-streaming {
  background: var(--primary-soft);
  color: var(--primary);
}
.ws-badge.is-done {
  background: rgba(52, 199, 89, 0.12);
  color: var(--success);
}
.ws-badge.is-error {
  background: rgba(255, 59, 48, 0.12);
  color: var(--error);
}

/* ============= Body 3 cols ============= */
.ws-body {
  display: grid;
  grid-template-columns: 200px 1fr 460px;
  gap: 0;
  overflow: hidden;
  min-height: 0;
}
.ws-col {
  background: var(--bg-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.ws-col-left {
  border-right: 1px solid var(--border-base);
}
.ws-col-center {
  border-right: 1px solid var(--border-base);
}

.ws-col-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-base);
  background: var(--bg-panel);
}
.ws-col-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.ws-col-round {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--primary);
  padding: 2px 8px;
  background: var(--primary-soft);
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.ws-center-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-base);
  flex-shrink: 0;
}
.ws-char-count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}

.ws-editor {
  flex: 1;
  min-height: 0;
  padding: 12px 16px;
  overflow: hidden;
}
.ws-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-base);
  flex-shrink: 0;
}

.ws-stages {
  flex: 1;
  overflow: auto;
}

/* ============= Footer (毛玻璃) ============= */
.ws-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--border-base);
}
.ws-footer-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.ws-err {
  color: var(--error);
}
</style>