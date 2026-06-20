// SSE 客户端：fetch + ReadableStream 解析（POST 请求 EventSource 不支持）
// 关键：兼容 \r\n\r\n、\n\n、\r\r 等多种行尾（sse-starlette 默认输出 \r\n）

import type { AnalyzeRequest, SSEEvent } from '@/types/domain'

/**
 * 流式调用 `/api/analyze-stream`，逐事件 yield。
 *
 * @throws Error 当网络/HTTP 错误时
 */
export async function* streamAnalyze(
  body: AnalyzeRequest,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const resp = await fetch('/api/analyze-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify(body),
    signal
  })

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '')
    throw new Error(`HTTP ${resp.status}: ${text || resp.statusText}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    // 先把 CRLF / CR 统一规范成 LF，再按 \n\n 切分
    let chunk = decoder.decode(value, { stream: true })
    chunk = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    buffer += chunk

    let sepIndex: number
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)
      const ev = parseSSEFrame(frame)
      if (ev) yield ev
    }
  }

  // 处理残余 buffer
  const tail = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (tail) {
    const ev = parseSSEFrame(tail)
    if (ev) yield ev
  }
}

function parseSSEFrame(frame: string): SSEEvent | null {
  // 去掉前导冒号（sse-starlette 注释行 ":"）+ 拆分多 data: 行
  let eventName = 'message'
  const dataParts: string[] = []

  for (const rawLine of frame.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trim())
    }
  }

  if (!dataParts.length) return null

  const dataLine = dataParts.join('\n')

  try {
    const parsed = JSON.parse(dataLine)
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      return {
        type: parsed.type || eventName,
        payload: parsed.payload ?? {},
        round: parsed.round
      }
    }
    return { type: eventName as SSEEvent['type'], payload: parsed }
  } catch (e) {
    console.error('[stream] JSON parse failed:', dataLine.slice(0, 200), e)
    return null
  }
}