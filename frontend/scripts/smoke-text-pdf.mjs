// 测试：生成的 PDF 是否是矢量文字（可搜索、可复制）
import { chromium } from 'playwright'
import fs from 'node:fs'

const FRONTEND = 'http://127.0.0.1:5173'
const ARTIFACTS = 'e:/Code/LEC06-1/frontend/scripts/artifacts'

fs.mkdirSync(ARTIFACTS, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext({ acceptDownloads: true })).newPage()

  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[BROWSER ERROR]', m.text())
    if (m.text().includes('[pdf]')) console.log('[pdf log]', m.text())
  })

  console.log('1. Open page + load sample + analyze...')
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)
  await page.click('button:has-text("开始分析")')

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    const s = await page.evaluate(() =>
      document.querySelector('.ws-header-right .el-tag')?.textContent?.trim()
    )
    if (s === '完成') break
  }
  await page.waitForTimeout(1500)
  console.log('  Analysis done')

  console.log('2. Click 生成 PDF 报告 (may download Chinese font first time)...')
  const startTime = Date.now()
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  const downloadTime = Date.now() - startTime
  console.log(`  Download received in ${downloadTime}ms`)

  const pdfPath = `${ARTIFACTS}/report-text.pdf`
  await download.saveAs(pdfPath)
  const size = fs.statSync(pdfPath).size
  console.log(`  PDF size: ${size} bytes`)

  await browser.close()

  // 用 PyMuPDF 检查：1) 文本是否可提取  2) 字体是否嵌入
  console.log('\n3. Verify PDF text is real vector text (not image)...')
  const { spawnSync } = await import('node:child_process')
  const py = `
import pymupdf, os
doc = pymupdf.open('${pdfPath.replace(/\\/g, '\\\\')}')
all_text = ''
for i, p in enumerate(doc):
    t = p.get_text() or ''
    all_text += t
    print(f'PAGE {i+1}: {len(t)} chars')
print(f'TOTAL_TEXT: {len(all_text)} chars')
print(f'PDF_SIZE: {os.path.getsize("${pdfPath.replace(/\\/g, '\\\\')}")} bytes')

# 抽 5 个关键词验证
keywords = ['Bug Agent', '代码修复报告', 'Bug', 'Python', '反思']
for kw in keywords:
    print(f'KEYWORD[{kw}]: {"FOUND" if kw in all_text else "MISSING"}')

# 提取第一页文本的前 300 字看效果
print('--- FIRST PAGE TEXT (first 300 chars) ---')
print(all_text[:300])
`
  const r = spawnSync('py', ['-c', py], {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
  })
  console.log(r.stdout)
  if (r.stderr) console.log('stderr:', r.stderr.slice(0, 300))

  // 关键验证：是否有真实文字
  const totalTextMatch = r.stdout.match(/TOTAL_TEXT: (\d+) chars/)
  const textLen = totalTextMatch ? parseInt(totalTextMatch[1]) : 0

  console.log('\n=== 判定 ===')
  let pass = true
  const check = (label, cond, extra = '') => {
    console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
    if (!cond) pass = false
  }
  check('PDF 下载成功', size > 1000, `${size} bytes`)
  check('PDF 含真实文字（> 200 字符）', textLen > 200, `${textLen} 字符`)
  check('PDF 文字含关键中文（"Bug Agent"）', r.stdout.includes('KEYWORD[Bug Agent]: FOUND'))
  check('PDF 文字含关键中文（"代码修复报告"）', r.stdout.includes('KEYWORD[代码修复报告]: FOUND'))
  check('PDF 文字含关键中文（"反思"）', r.stdout.includes('KEYWORD[反思]: FOUND'))

  console.log('\n' + (pass ? '🎉 矢量文字 PDF 验证通过' : '💥 失败'))
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})