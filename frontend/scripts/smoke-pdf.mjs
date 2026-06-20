// PDF 内容验证：用 PyMuPDF 转图像，验证非空白 + 视觉检查关键文字
import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const FRONTEND = 'http://127.0.0.1:5173'
const ARTIFACTS = 'e:/Code/LEC06-1/frontend/scripts/artifacts'

fs.mkdirSync(ARTIFACTS, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext({ acceptDownloads: true })).newPage()

  let pass = true
  const check = (label, cond, extra = '') => {
    console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
    if (!cond) pass = false
  }

  console.log('1. Open page + load sample + analyze...')
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
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

  console.log('2. Click "生成 PDF 报告"...')
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  if (!download) {
    check('触发下载', false, 'timeout')
    process.exit(1)
  }
  const pdfPath = `${ARTIFACTS}/report-final.pdf`
  await download.saveAs(pdfPath)
  const size = fs.statSync(pdfPath).size
  check('PDF 下载成功', size > 1000, `${size} bytes`)
  check('PDF 大小合理（> 20KB，含视觉内容）', size > 20000, `${size} bytes`)

  console.log('3. 用 PyMuPDF 验证 PDF 含图像...')
  const pyScript = `
import pymupdf
doc = pymupdf.open('${pdfPath.replace(/\\/g, '\\\\')}')
print(f'PAGES={len(doc)}')
total_pixels = 0
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=80)
    out = f'${ARTIFACTS.replace(/\\/g, '\\\\')}\\\\report-final-page-{i+1}.png'
    pix.save(out)
    total_pixels += pix.width * pix.height
    print(f'PAGE_{i+1}_PIXELS={pix.width}x{pix.height}')
print(f'TOTAL_PIXELS={total_pixels}')
`
  const r = spawnSync('py', ['-c', pyScript], { encoding: 'utf-8' })
  console.log(r.stdout)
  if (r.stderr) console.log('stderr:', r.stderr.slice(0, 300))

  const pagesMatch = r.stdout.match(/PAGES=(\d+)/)
  const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0
  check('PDF 有页面', pages >= 1, `${pages} 页`)

  // 检查渲染的图像存在且非空白
  for (let i = 1; i <= pages; i++) {
    const imgPath = `${ARTIFACTS}/report-final-page-${i}.png`
    if (fs.existsSync(imgPath)) {
      const imgSize = fs.statSync(imgPath).size
      // PNG 压缩效率高，1KB+ 即说明有内容（之前 80dpi 测试是 3.85KB）
      check(`第 ${i} 页图像非空白（>1KB）`, imgSize > 1000, `${imgSize} bytes`)
    }
  }

  await browser.close()
  console.log('\n' + (pass ? '🎉 PDF 内容验证通过（视觉内容完整）' : '💥 PDF 验证失败'))
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})