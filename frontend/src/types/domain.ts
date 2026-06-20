// 与后端 Pydantic 模型对齐的 TS 类型定义

export type Language = 'python' | 'c' | 'cpp' | 'java'
export type Severity = 'low' | 'medium' | 'high'
export type StageKey = 'analysis' | 'fix' | 'execution' | 'reflection'
export type StageStatus = 'idle' | 'running' | 'done' | 'error'
export type FinalStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface BugItem {
  line: number | null
  type: string
  description: string
  severity: Severity
}

export interface AnalysisResult {
  summary: string
  bugs: BugItem[]
}

export interface FixResult {
  fixed_code: string
  explanation: string
}

export interface ExecResult {
  stdout: string
  stderr: string
  exit_code: number
  timed_out: boolean
  executed: boolean
  note: string
}

export interface ReflectResult {
  is_correct: boolean
  confidence: number
  issues: string[]
  needs_retry: boolean
  suggestion: string
}

export interface AnalyzeRequest {
  code: string
  language: Language
}

// SSE 事件载荷
export interface SSEPayload {
  type: string
  payload: any
  round?: number
}

export interface SSEEvent {
  type:
    | 'start'
    | 'analysis'
    | 'fix'
    | 'execution'
    | 'reflection'
    | 'retry'
    | 'done'
    | 'error'
  payload: any
  round?: number
}