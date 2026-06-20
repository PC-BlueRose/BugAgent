import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElNotification } from 'element-plus'

import { streamAnalyze } from '@/api/stream'
import type {
  AnalysisResult,
  ExecResult,
  FixResult,
  FinalStatus,
  Language,
  ReflectResult,
  SSEEvent,
  StageKey,
  StageStatus
} from '@/types/domain'

const STAGE_KEYS: StageKey[] = ['analysis', 'fix', 'execution', 'reflection']

export const useAgentStore = defineStore('agent', () => {
  // ---------- 主题 ----------
  const THEME_KEY = 'bug-agent-theme'
  type ThemeMode = 'auto' | 'light' | 'dark'
  const theme = ref<ThemeMode>('auto')

  function loadTheme(): ThemeMode {
    try {
      const v = localStorage.getItem(THEME_KEY)
      if (v === 'light' || v === 'dark' || v === 'auto') return v
    } catch {}
    return 'auto'
  }
  function applyTheme(mode: ThemeMode): void {
    theme.value = mode
    try {
      if (mode === 'auto') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, mode)
    } catch {}
    // 写入 html data-theme
    const html = document.documentElement
    if (mode === 'auto') {
      // 跟随系统
      const sys = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      html.setAttribute('data-theme', sys)
    } else {
      html.setAttribute('data-theme', mode)
    }
  }
  function cycleTheme(): void {
    const order: ThemeMode[] = ['light', 'dark', 'auto']
    const idx = order.indexOf(theme.value)
    applyTheme(order[(idx + 1) % order.length])
  }
  theme.value = loadTheme()
  if (typeof document !== 'undefined') applyTheme(theme.value)

  // ---------- 输入 ----------
  const language = ref<Language>('python')
  const originalCode = ref<string>('')

  // ---------- 历史 ----------
  interface HistoryEntry {
    id: string
    code: string
    language: Language
    status: 'streaming' | 'done' | 'error'
    elapsedMs: number
    timestamp: number
  }
  const history = ref<HistoryEntry[]>([])

  // ---------- 状态 ----------
  const currentRound = ref(0)
  const maxRounds = ref(3)
  const startTime = ref<number>(0)
  const endTime = ref<number>(0)
  const stageStatus = ref<Record<StageKey, StageStatus>>({
    analysis: 'idle',
    fix: 'idle',
    execution: 'idle',
    reflection: 'idle'
  })
  const results = ref<{
    analysis: AnalysisResult | null
    fix: FixResult | null
    execution: ExecResult | null
    reflection: ReflectResult | null
  }>({
    analysis: null,
    fix: null,
    execution: null,
    reflection: null
  })
  const finalStatus = ref<FinalStatus>('idle')
  const errorMsg = ref<string>('')
  const abortCtl = ref<AbortController | null>(null)

  // ---------- 计算属性 ----------
  const isStreaming = computed(() => finalStatus.value === 'streaming')
  const canSubmit = computed(
    () =>
      !isStreaming.value &&
      originalCode.value.trim().length > 0
  )
  const canExportPdf = computed(() => finalStatus.value === 'done')

  /** 总耗时（毫秒），仅在 done / error 时有意义 */
  const elapsedMs = computed(() => {
    if (!startTime.value) return 0
    const end = endTime.value || Date.now()
    return end - startTime.value
  })
  /** 格式化的耗时文本，如 "12.34 秒" */
  const elapsedText = computed(() => {
    const ms = elapsedMs.value
    if (!ms) return ''
    if (ms < 1000) return `${ms} 毫秒`
    return `${(ms / 1000).toFixed(2)} 秒`
  })

  // ---------- 内部辅助 ----------
  function reset() {
    originalCode.value = ''
    currentRound.value = 0
    stageStatus.value = {
      analysis: 'idle',
      fix: 'idle',
      execution: 'idle',
      reflection: 'idle'
    }
    startTime.value = 0
    endTime.value = 0
    results.value = {
      analysis: null,
      fix: null,
      execution: null,
      reflection: null
    }
    finalStatus.value = 'idle'
    errorMsg.value = ''
    abortCtl.value?.abort()
    abortCtl.value = null
  }

  function applyEvent(ev: SSEEvent) {
    const p = ev.payload ?? {}

    switch (ev.type) {
      case 'start':
        // 启动新一轮
        stageStatus.value = {
          analysis: 'running',
          fix: 'idle',
          execution: 'idle',
          reflection: 'idle'
        }
        results.value = {
          analysis: null,
          fix: null,
          execution: null,
          reflection: null
        }
        currentRound.value = 0
        break

      case 'analysis':
        results.value.analysis = p as AnalysisResult
        stageStatus.value.analysis = 'done'
        stageStatus.value.fix = 'running'
        break

      case 'fix':
        results.value.fix = p as FixResult
        stageStatus.value.fix = 'done'
        stageStatus.value.execution = 'running'
        currentRound.value = ev.round ?? currentRound.value
        break

      case 'execution':
        results.value.execution = p as ExecResult
        stageStatus.value.execution = 'done'
        stageStatus.value.reflection = 'running'
        break

      case 'reflection': {
        const refl = p as ReflectResult
        results.value.reflection = refl
        stageStatus.value.reflection = 'done'
        break
      }

      case 'retry':
        // 进入下一轮反思循环 — 不要重置 stageStatus，
        // 上一轮 fix/execution/reflection 的结果仍有效，
        // 下一轮对应事件到达时会覆盖更新
        currentRound.value = ev.round ?? currentRound.value
        break

      case 'done':
        finalStatus.value = 'done'
        currentRound.value = (p && p.rounds) || currentRound.value
        endTime.value = Date.now()
        // 确保所有阶段都标记为完成（兜底：处理所有边界情况）
        stageStatus.value = {
          analysis: results.value.analysis ? 'done' : stageStatus.value.analysis,
          fix: results.value.fix ? 'done' : stageStatus.value.fix,
          execution: results.value.execution ? 'done' : stageStatus.value.execution,
          reflection: results.value.reflection ? 'done' : stageStatus.value.reflection
        }
        // 记录到历史
        pushHistory(originalCode.value, language.value, 'done', elapsedMs.value)
        ElNotification.success({
          title: '分析完成',
          message: `共完成 ${currentRound.value} 轮反思循环，耗时 ${elapsedText.value}`
        })
        break

      case 'error':
        finalStatus.value = 'error'
        endTime.value = Date.now()
        errorMsg.value = String(p?.message ?? '未知错误')
        // 把当前正在运行的阶段标为 error
        for (const k of STAGE_KEYS) {
          if (stageStatus.value[k] === 'running') {
            stageStatus.value[k] = 'error'
          }
        }
        // 失败也记录历史
        pushHistory(originalCode.value, language.value, 'error', elapsedMs.value)
        ElNotification.error({
          title: '流水线异常',
          message: errorMsg.value
        })
        break
    }
  }

  async function submit() {
    if (!canSubmit.value) return
    // ⚠️ 必须在 reset 之前快照输入，否则会被清空
    const codeSnapshot = originalCode.value
    const langSnapshot = language.value
    if (!codeSnapshot.trim()) return

    // 清空结果状态但保留用户输入
    currentRound.value = 0
    stageStatus.value = {
      analysis: 'idle',
      fix: 'idle',
      execution: 'idle',
      reflection: 'idle'
    }
    results.value = {
      analysis: null,
      fix: null,
      execution: null,
      reflection: null
    }
    startTime.value = Date.now()
    endTime.value = 0
    finalStatus.value = 'streaming'
    errorMsg.value = ''
    abortCtl.value?.abort()
    const ctl = new AbortController()
    abortCtl.value = ctl

    let eventCount = 0
    try {
      for await (const ev of streamAnalyze(
        { code: codeSnapshot, language: langSnapshot },
        ctl.signal
      )) {
        eventCount++
        applyEvent(ev)
      }
      // 如果流结束但没收到 done/error（例如断流），标记错误
      if (finalStatus.value === 'streaming') {
        finalStatus.value = 'error'
        errorMsg.value = '连接中断，未收到完成事件'
      }
    } catch (e: any) {
      finalStatus.value = 'error'
      errorMsg.value = e?.message || String(e)
      ElNotification.error({ title: '请求失败', message: errorMsg.value })
    } finally {
      abortCtl.value = null
      // 调试：记录收到的事件数
      // eslint-disable-next-line no-console
      console.log('[agentStore] SSE done. events=', eventCount,
        'finalStatus=', finalStatus.value,
        'stages=', JSON.stringify(stageStatus.value),
        'results keys=', Object.keys(results.value).filter(k => results.value[k as keyof typeof results.value]),
        'currentRound=', currentRound.value)
    }
  }

  function stop() {
    abortCtl.value?.abort()
    abortCtl.value = null
    if (finalStatus.value === 'streaming') {
      finalStatus.value = 'idle'
      endTime.value = Date.now()
    }
    ElNotification.info({ title: '已停止' })
  }

  // ---------- 历史记录 ----------
  const HISTORY_KEY = 'bug-agent-history'
  const HISTORY_MAX = 20

  function loadHistory(): void {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) history.value = JSON.parse(raw)
    } catch {
      history.value = []
    }
  }

  function saveHistory(): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    } catch {
      // ignore
    }
  }

  function pushHistory(
    code: string,
    lang: Language,
    status: HistoryEntry['status'],
    elapsed: number
  ): HistoryEntry {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      language: lang,
      status,
      elapsedMs: elapsed,
      timestamp: Date.now()
    }
    history.value = [entry, ...history.value].slice(0, HISTORY_MAX)
    saveHistory()
    return entry
  }

  function removeHistory(id: string): void {
    history.value = history.value.filter((h) => h.id !== id)
    saveHistory()
  }

  function loadHistoryEntry(id: string): HistoryEntry | null {
    return history.value.find((h) => h.id === id) ?? null
  }

  // 初始化加载
  loadHistory()

  return {
    // state
    language,
    originalCode,
    currentRound,
    maxRounds,
    startTime,
    endTime,
    stageStatus,
    results,
    finalStatus,
    errorMsg,
    history,
    theme,
    // getters
    isStreaming,
    canSubmit,
    canExportPdf,
    elapsedMs,
    elapsedText,
    // actions
    submit,
    stop,
    reset,
    applyEvent,
    pushHistory,
    removeHistory,
    loadHistoryEntry,
    applyTheme,
    cycleTheme
  }
})