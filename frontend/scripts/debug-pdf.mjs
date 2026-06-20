// 完全模拟 pdf.ts 流程，在浏览器内执行
import { chromium } from 'playwright'

const FRONTEND = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()

  page.on('console', (m) => console.log(`[${m.type()}]`, m.text()))
  page.on('pageerror', (e) => console.log('[PAGE ERROR]', e.message))

  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 加载示例 + 分析
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)
  await page.click('button:has-text("开始分析")')
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    const s = await page.evaluate(() => document.querySelector('.ws-header-right .el-tag')?.textContent?.trim())
    if (s === '完成') break
  }

  // 直接复用应用内的 pdf.ts（点击按钮触发）
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(() => null)
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  if (!download) {
    console.log('No download triggered')
    process.exit(1)
  }
  const path = 'e:/Code/LEC06-1/frontend/scripts/artifacts/report-debug.pdf'
  await download.saveAs(path)
  console.log('PDF saved to', path)

  // 用 Python 解析 PDF
  const { spawnSync } = await import('node:child_process')
  const r = spawnSync('py', ['-c', `
from pypdf import PdfReader
r = PdfReader('${path.replace(/\\/g, '\\\\')}')
print(f'PAGES={len(r.pages)}')
all_text = ''
for p in r.pages:
    all_text += (p.extract_text() or '')
print(f'TEXT_LEN={len(all_text)}')
print(f'TEXT_PREVIEW={all_text[:300]!r}')
print(f'PDF_SIZE={__import__("os").path.getsize("${path.replace(/\\/g, '\\\\')}")}')
`], { encoding: 'utf-8' })
  console.log('---')
  console.log(r.stdout)
  if (r.stderr) console.log('stderr:', r.stderr.slice(0, 300))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })