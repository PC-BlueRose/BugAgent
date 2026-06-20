// PDF 导出：html2canvas 转图 + jsPDF addImage 嵌入
// 不依赖 html2pdf.js（其 PDF 容器格式与 Edge 不兼容）
// jsPDF 直接 addImage 是最广泛兼容的方案

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import type {
  AnalysisResult,
  ExecResult,
  FixResult,
  Language,
  ReflectResult
} from '@/types/domain'
import { languageLabel } from '@/utils/language'

export interface PdfOptions {
  filename?: string
  language: Language
  originalCode: string
  analysis: AnalysisResult | null
  fix: FixResult | null
  execution: ExecResult | null
  reflection: ReflectResult | null
  totalRounds: number
  totalElapsedMs: number
}

interface ReportInput {
  language: Language
  originalCode: string
  analysis: AnalysisResult | null
  fix: FixResult | null
  execution: ExecResult | null
  reflection: ReflectResult | null
  totalRounds: number
  totalElapsedMs: number
}

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_MM = 10

/**
 * 导出 Bug Agent 报告为 PDF（图片嵌入方案）
 */
export async function exportReportToPdf(opts: PdfOptions): Promise<void> {
  const {
    filename = 'bug-agent-report.pdf',
    language,
    originalCode,
    analysis,
    fix,
    execution,
    reflection,
    totalRounds,
    totalElapsedMs
  } = opts

  const container = document.createElement('div')

  const styleEl = document.createElement('style')
  styleEl.id = 'bug-agent-pdf-style'
  styleEl.textContent = getReportCss()
  document.getElementById('bug-agent-pdf-style')?.remove()
  document.head.appendChild(styleEl)

  container.innerHTML = buildReportHtml({
    language,
    originalCode,
    analysis,
    fix,
    execution,
    reflection,
    totalRounds,
    totalElapsedMs
  })
  container.style.cssText = `
    position: fixed;
    left: -100000px;
    top: 0;
    z-index: -1;
    background: #fff;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    width: 210mm;
    min-height: 100mm;
    pointer-events: none;
  `
  document.body.appendChild(container)
  void container.offsetHeight
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
      width: container.scrollWidth,
      height: container.scrollHeight
    })

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas 截图失败')
    }

    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    })

    const usableWidth = A4_WIDTH_MM - MARGIN_MM * 2
    const usableHeight = A4_HEIGHT_MM - MARGIN_MM * 2

    const imgRatio = canvas.height / canvas.width
    const renderWidth = usableWidth
    const renderHeight = renderWidth * imgRatio

    if (renderHeight <= usableHeight) {
      pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, renderWidth, renderHeight)
    } else {
      // 多页切片
      const pageImgHeightPx = (usableHeight / renderWidth) * canvas.width
      let yOffsetPx = 0
      let isFirstPage = true

      while (yOffsetPx < canvas.height) {
        const sliceHeightPx = Math.min(pageImgHeightPx, canvas.height - yOffsetPx)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceHeightPx
        const sctx = sliceCanvas.getContext('2d')
        if (!sctx) throw new Error('无法创建 canvas context')
        sctx.fillStyle = '#ffffff'
        sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        sctx.drawImage(
          canvas,
          0, yOffsetPx, canvas.width, sliceHeightPx,
          0, 0, sliceCanvas.width, sliceCanvas.height
        )
        const sliceDataUrl = sliceCanvas.toDataURL('image/png')

        if (!isFirstPage) pdf.addPage()
        isFirstPage = false

        const sliceRenderHeight = (sliceHeightPx / canvas.width) * renderWidth
        pdf.addImage(
          sliceDataUrl, 'PNG', MARGIN_MM, MARGIN_MM, renderWidth, sliceRenderHeight
        )
        yOffsetPx += sliceHeightPx
      }
    }

    pdf.save(filename)
  } finally {
    container.remove()
    document.getElementById('bug-agent-pdf-style')?.remove()
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getReportCss(): string {
  return `
    .bug-agent-page {
      padding: 16mm 14mm;
      background: #0a0e1a;
      color: #e0e6ed;
      width: 210mm;
      box-sizing: border-box;
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    }
    .bug-agent-page .banner {
      border: 1px solid #00f0ff;
      padding: 14pt 16pt;
      background: linear-gradient(135deg, rgba(0,240,255,0.06), rgba(255,0,128,0.04));
      box-shadow: 0 0 14px rgba(0, 240, 255, 0.4);
      margin-bottom: 14pt;
    }
    .bug-agent-page .title {
      font-size: 24pt;
      margin: 0 0 4pt;
      color: #00f0ff;
      letter-spacing: 0.1em;
      text-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
    }
    .bug-agent-page .meta {
      color: #8b96a8;
      font-size: 9pt;
      margin: 0;
      letter-spacing: 0.06em;
    }
    .bug-agent-page h2 {
      font-size: 13pt;
      margin: 16pt 0 6pt;
      padding-left: 8pt;
      border-left: 3px solid #ff0080;
      color: #ff0080;
      letter-spacing: 0.1em;
      text-shadow: 0 0 6px rgba(255, 0, 128, 0.5);
    }
    .bug-agent-page h3 {
      font-size: 11pt;
      margin: 10pt 0 4pt;
      color: #00f0ff;
      letter-spacing: 0.08em;
    }
    .bug-agent-page hr {
      border: 0;
      border-top: 1px dashed #2a3149;
      margin: 14pt 0;
    }
    .bug-agent-page p { margin: 4pt 0; font-size: 10pt; }
    .bug-agent-page .summary {
      background: rgba(0, 240, 255, 0.05);
      border-left: 2px solid #00f0ff;
      padding: 8pt 12pt;
      margin: 6pt 0;
      white-space: pre-wrap;
    }
    .bug-agent-page .t {
      width: 100%;
      border-collapse: collapse;
      margin: 6pt 0;
      font-size: 9pt;
      border: 1px solid #2a3149;
    }
    .bug-agent-page .t th,
    .bug-agent-page .t td {
      border: 1px solid #2a3149;
      padding: 4pt 6pt;
      text-align: left;
      vertical-align: top;
      color: #e0e6ed;
    }
    .bug-agent-page .t th {
      background: rgba(0, 240, 255, 0.1);
      color: #00f0ff;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 8pt;
    }
    .bug-agent-page .t tr:nth-child(even) td {
      background: rgba(255, 255, 255, 0.02);
    }
    .bug-agent-page .t.kv th { width: 28%; color: #00f0ff; }
    .bug-agent-page .t.kv td { color: #e0e6ed; }
    .bug-agent-page .sev {
      display: inline-block;
      padding: 1px 6pt;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      border: 1px solid;
    }
    .bug-agent-page .sev-high {
      color: #ff3860;
      border-color: #ff3860;
      background: rgba(255, 56, 96, 0.1);
    }
    .bug-agent-page .sev-medium {
      color: #ffe600;
      border-color: #ffe600;
    }
    .bug-agent-page .sev-low {
      color: #8b96a8;
      border-color: #2a3149;
    }
    .bug-agent-page .code {
      background: #000;
      color: #7fdbff;
      padding: 8pt 10pt;
      margin: 4pt 0;
      font-family: 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
      font-size: 9pt;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid #00f0ff;
      box-shadow: inset 0 0 10px rgba(0, 240, 255, 0.15);
      text-shadow: 0 0 3px rgba(127, 219, 255, 0.5);
    }
    .bug-agent-page .out {
      padding: 6pt 10pt;
      margin: 4pt 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid #2a3149;
      background: #000;
    }
    .bug-agent-page .stdout {
      color: #7fdbff;
      border-color: #00f0ff;
    }
    .bug-agent-page .stderr {
      color: #ff3860;
      border-color: #ff3860;
    }
    .bug-agent-page ul {
      padding-left: 22pt;
      margin: 4pt 0;
      color: #e0e6ed;
      font-size: 10pt;
    }
    .bug-agent-page ul li {
      margin: 2pt 0;
    }
    .bug-agent-page .footer {
      text-align: center;
      color: #4a5568;
      font-size: 8pt;
      margin-top: 20pt;
      letter-spacing: 0.1em;
    }
  `
}

function buildReportHtml(input: ReportInput): string {
  const {
    language,
    originalCode,
    analysis,
    fix,
    execution,
    reflection,
    totalRounds,
    totalElapsedMs
  } = input
  const now = new Date().toLocaleString('zh-CN')
  const elapsed = totalElapsedMs > 0 ? `${(totalElapsedMs / 1000).toFixed(2)} 秒` : '-'

  const bugsHtml = analysis?.bugs?.length
    ? `<table class="t">
        <thead>
          <tr><th>#</th><th>类型</th><th>严重</th><th>描述</th></tr>
        </thead>
        <tbody>
          ${analysis.bugs
            .map(
              (b) =>
                `<tr><td>${b.line ?? '-'}</td><td>${esc(b.type)}</td><td><span class="sev sev-${b.severity}">${esc(b.severity)}</span></td><td>${esc(b.description)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '<p>// 无 Bug</p>'

  const issuesHtml =
    reflection?.issues?.length
      ? `<ul>${reflection.issues.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`
      : '<p>// 无</p>'

  return `
    <div class="bug-agent-page">
      <div class="banner">
        <h1 class="title">▓▓▓ BUG//AGENT REPORT v2.4 ▓▓▓</h1>
        <p class="meta">
          生成时间：${now} &nbsp;|&nbsp; 语言：${languageLabel(language)} &nbsp;|&nbsp;
          反思轮次：${totalRounds} &nbsp;|&nbsp; 总耗时：${elapsed}
        </p>
      </div>

      <h2>▌ 01. ANALYSIS SUMMARY</h2>
      <p class="summary">${esc(analysis?.summary || '—')}</p>

      <h2>▌ 02. BUG LIST (${analysis?.bugs?.length ?? 0})</h2>
      ${bugsHtml}

      <h2>▌ 03. ORIGINAL CODE</h2>
      <pre class="code">${esc(originalCode)}</pre>

      <h2>▌ 04. FIXED CODE</h2>
      ${fix?.explanation ? `<p><strong>说明：</strong>${esc(fix.explanation)}</p>` : ''}
      <pre class="code">${esc(fix?.fixed_code || '—')}</pre>

      <h2>▌ 05. EXECUTION RESULT</h2>
      <table class="t kv">
        <tbody>
          <tr><th>退出码</th><td>${execution?.exit_code ?? '-'}</td></tr>
          <tr><th>执行方式</th><td>${execution?.executed ? '真实执行' : 'LLM 模拟'}</td></tr>
          <tr><th>超时</th><td>${execution?.timed_out ? '是' : '否'}</td></tr>
          <tr><th>备注</th><td>${esc(execution?.note || '-')}</td></tr>
        </tbody>
      </table>
      <h3>▌ stdout</h3>
      <pre class="out stdout">${esc(execution?.stdout || '(empty)')}</pre>
      <h3>▌ stderr</h3>
      <pre class="out stderr">${esc(execution?.stderr || '(empty)')}</pre>

      <h2>▌ 06. REFLECTION</h2>
      <table class="t kv">
        <tbody>
          <tr><th>修复正确</th><td>${reflection?.is_correct ? '✓ 是' : '✗ 否'}</td></tr>
          <tr><th>置信度</th><td>${((reflection?.confidence ?? 0) * 100).toFixed(1)}%</td></tr>
          <tr><th>需要重试</th><td>${reflection?.needs_retry ? '是' : '否'}</td></tr>
        </tbody>
      </table>
      <h3>▌ 仍存在的问题</h3>
      ${issuesHtml}
      <h3>▌ 改进建议</h3>
      <p>${esc(reflection?.suggestion || '// 无')}</p>

      <hr/>
      <p class="footer">▓▓▓ BUG//AGENT v2.4 ▓▓▓ &nbsp;|&nbsp; AUTO-GENERATED REPORT &nbsp;|&nbsp; 请人工复核修复结果</p>
    </div>
  `
}