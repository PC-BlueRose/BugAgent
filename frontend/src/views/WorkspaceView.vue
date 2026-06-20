<template>
  <div class="workspace">
    <!-- ============= Header ============= -->
    <header class="ws-header">
      <div class="ws-header-left">
        <span class="ws-title">
          <span class="ws-title-bar">▓▓▓</span>
          BUG<span class="ws-title-sep">//</span>AGENT
          <span class="ws-title-version">v2.4</span>
          <span class="ws-title-bar">▓▓▓</span>
        </span>
        <span class="ws-subtitle">基于大模型的代码 Bug 自动识别 · 修复 · 验证 · 反思</span>
      </div>
      <div class="ws-header-right">
        <div class="ws-stat" v-if="store.isStreaming">
          <span class="ws-stat-label">▌ ⏱ 已用时</span>
          <span class="ws-stat-value">{{ runningElapsed }}</span>
        </div>
        <div class="ws-stat" v-else-if="store.elapsedText">
          <span class="ws-stat-label">▌ ✓ 总耗时</span>
          <span class="ws-stat-value">{{ store.elapsedText }}</span>
        </div>
        <span :class="['ws-badge', `is-${store.finalStatus}`]">
          <template v-if="store.finalStatus === 'streaming'">◉ ANALYZING</template>
          <template v-else-if="store.finalStatus === 'done'">✓ DONE</template>
          <template v-else-if="store.finalStatus === 'error'">✗ ERROR</template>
          <template v-else>○ STANDBY</template>
        </span>
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
          <span class="ws-col-num">▌</span>
          <span class="ws-col-title">INPUT :: SOURCE CODE</span>
        </header>
        <div class="ws-center-toolbar">
          <el-select v-model="store.language" :disabled="store.isStreaming" size="small" style="width: 130px">
            <el-option v-for="l in LANGUAGES" :key="l.value" :label="l.label" :value="l.value" />
          </el-select>
          <el-upload :auto-upload="false" :show-file-list="false" accept=".py,.c,.cpp,.java,.cc,.cxx"
            :on-change="onFile" v-slot="{ }">
            <CyberButton variant="ghost" :disabled="store.isStreaming">
              <template #icon>📁</template>
              上传文件
            </CyberButton>
          </el-upload>
          <CyberButton variant="ghost" :disabled="store.isStreaming" @click="loadSample">
            加载示例
          </CyberButton>
          <CyberButton variant="ghost" :disabled="store.isStreaming" @click="onClear">
            清空
          </CyberButton>
          <span class="ws-char-count">{{ store.originalCode.length }} CHARS</span>
        </div>

        <div class="ws-editor">
          <CodeEditor
            v-model="store.originalCode"
            :language="store.language"
            :readonly="store.isStreaming"
          />
        </div>

        <div class="ws-actions">
          <CyberButton
            variant="primary"
            :disabled="!store.canSubmit"
            :loading="store.isStreaming"
            @click="store.submit"
          >
            ▶ 开始分析
          </CyberButton>
          <CyberButton
            variant="accent"
            :disabled="!store.isStreaming"
            @click="store.stop"
          >
            ⏹ 停止
          </CyberButton>
        </div>
      </section>

      <!-- 右栏：4 阶段 HUD -->
      <aside class="ws-col ws-col-right">
        <header class="ws-col-header">
          <span class="ws-col-num">▌</span>
          <span class="ws-col-title">AGENT :: PIPELINE</span>
          <span class="ws-col-round" v-if="store.currentRound > 0">
            R{{ store.currentRound }}/{{ store.maxRounds }}
          </span>
        </header>
        <div class="ws-stages">
          <StageCard num="01" title="SYSTEM ANALYSIS" :status="store.stageStatus.analysis">
            <BugListCard />
          </StageCard>
          <StageCard num="02" title="AUTO FIX" :status="store.stageStatus.fix">
            <FixResultCard />
          </StageCard>
          <StageCard num="03" title="EXECUTION VERIFY" :status="store.stageStatus.execution">
            <ExecResultCard />
          </StageCard>
          <StageCard num="04" title="REFLECTION" :status="store.stageStatus.reflection">
            <ReflectionCard />
          </StageCard>
        </div>
      </aside>
    </main>

    <!-- ============= Footer ============= -->
    <footer class="ws-footer">
      <CyberButton variant="accent" :disabled="!store.canExportPdf" @click="exportPdf">
        <template #icon>⬇</template>
        生成 PDF 报告
      </CyberButton>
      <span v-if="store.canExportPdf" class="ws-footer-text">
        点击后浏览器将下载 A4 报告（共 {{ store.currentRound }} 轮，{{ store.elapsedText }}）
      </span>
      <span v-else-if="store.errorMsg" class="ws-footer-text ws-err">
        {{ store.errorMsg }}
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'

import HistoryPanel from '@/components/HistoryPanel.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import StageCard from '@/components/StageCard.vue'
import BugListCard from '@/components/BugListCard.vue'
import FixResultCard from '@/components/FixResultCard.vue'
import ExecResultCard from '@/components/ExecResultCard.vue'
import ReflectionCard from '@/components/ReflectionCard.vue'
import CyberButton from '@/components/CyberButton.vue'

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
  // suppress unused warning
  void ElNotification
}
</script>

<style scoped>
.workspace {
  display: grid;
  grid-template-rows: 56px 1fr 56px;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}

/* ============= Header ============= */
.ws-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: linear-gradient(180deg, #111726 0%, var(--bg-base) 100%);
  border-bottom: 1px solid var(--primary);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
  position: relative;
}
.ws-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  animation: pulse-glow 3s ease-in-out infinite;
}

.ws-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ws-title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--primary);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
}
.ws-title-bar {
  color: var(--accent);
  margin: 0 8px;
  text-shadow: 0 0 6px rgba(255, 0, 128, 0.5);
}
.ws-title-sep {
  color: var(--accent);
  margin: 0 2px;
}
.ws-title-version {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 6px;
  font-weight: 400;
  text-shadow: none;
}
.ws-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.ws-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ws-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-base);
  font-family: var(--font-mono);
  font-size: 13px;
}
.ws-stat-label {
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
}
.ws-stat-value {
  color: var(--primary);
  font-weight: 700;
  text-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
}

.ws-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  border: 1px solid;
}
.ws-badge.is-idle {
  color: var(--text-muted);
  border-color: var(--border-base);
}
.ws-badge.is-streaming {
  color: var(--primary);
  border-color: var(--primary);
  box-shadow: var(--shadow-glow-primary);
}
.ws-badge.is-done {
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: var(--shadow-glow-accent);
}
.ws-badge.is-error {
  color: var(--error);
  border-color: var(--error);
}

/* ============= Body 3 cols ============= */
.ws-body {
  display: grid;
  grid-template-columns: 200px 1fr 460px;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  min-height: 0;
}
.ws-col {
  background: var(--bg-panel);
  border: 1px solid var(--border-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.ws-col-left {
  /* HistoryPanel manages its own padding */
}
.ws-col-center {
  /* gap between toolbar, editor, actions */
}
.ws-col-right {
  /* stages scroll */
}

.ws-col-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-base);
  background: rgba(0, 240, 255, 0.03);
}
.ws-col-num {
  color: var(--primary);
  text-shadow: var(--shadow-glow-primary);
}
.ws-col-title {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--primary);
  flex: 1;
}
.ws-col-round {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent);
  padding: 1px 6px;
  border: 1px solid var(--accent);
  text-shadow: var(--shadow-glow-accent);
}

/* 中栏：toolbar / editor / actions */
.ws-center-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-base);
  flex-shrink: 0;
}
.ws-char-count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

.ws-editor {
  flex: 1;
  min-height: 0;
  padding: 12px 14px;
}
.ws-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid var(--border-base);
  flex-shrink: 0;
}

/* 右栏：stages */
.ws-stages {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

/* ============= Footer ============= */
.ws-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  background: linear-gradient(0deg, #111726 0%, var(--bg-base) 100%);
  border-top: 1px solid var(--primary);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
  position: relative;
}
.ws-footer::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  animation: pulse-glow 3s ease-in-out infinite;
}
.ws-footer-text {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}
.ws-err {
  color: var(--error);
}
</style>