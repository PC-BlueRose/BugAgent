// Cyberpunk UI 端到端测试
import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const FRONTEND = 'http://127.0.0.1:5173'
const ARTIFACTS = 'e:/Code/LEC06-1/frontend/scripts/artifacts'
fs.mkdirSync(ARTIFACTS, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()

  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[BROWSER ERROR]', m.text())
  })

  let pass = true
  const check = (label, cond, extra = '') => {
    console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
    if (!cond) pass = false
  }

  console.log('=== 1. 打开页面 + 三列布局 ===')
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 三列布局
  const colCount = await page.locator('.ws-col').count()
  check('页面有 3 个 ws-col 列', colCount === 3, `${colCount} 列`)

  // 左栏 HistoryPanel
  const historyExists = await page.locator('.hp').count()
  check('左栏 HistoryPanel 存在', historyExists === 1)

  // 中栏 CodeEditor
  const editorExists = await page.locator('.ce-pre[contenteditable]').count()
  check('中栏 CodeEditor 存在 (contenteditable pre)', editorExists === 1)

  // 右栏 StageCard
  const stageCount = await page.locator('.sc').count()
  check('右栏有 4 个 StageCard', stageCount === 4, `${stageCount} 个`)

  // CRT 扫描线
  const scanlineExists = await page.locator('.ce-scanline').count()
  check('代码编辑器有 CRT 扫描线', scanlineExists === 1)

  console.log('\n=== 2. 加载示例 + 编辑器同步 ===')
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)
  const editorText = await page.locator('.ce-pre[contenteditable]').innerText()
  check('编辑器填充示例代码', editorText.length > 10, `${editorText.length} 字符`)

  // 字符计数显示
  const charCount = await page.evaluate(() => {
    const els = document.querySelectorAll('.ws-char-count')
    return els.length ? els[0].textContent : null
  })
  check('字符计数器显示', charCount && /\d+/.test(charCount), charCount)

  console.log('\n=== 3. 编辑器可手动输入 ===')
  await page.locator('.ce-pre[contenteditable]').click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.keyboard.type('print("hello cyberpunk")')
  await page.waitForTimeout(300)
  const typedText = await page.locator('.ce-pre[contenteditable]').innerText()
  check('手动输入同步到 store', typedText.includes('cyberpunk'), typedText)

  // 重新加载示例
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)

  console.log('\n=== 4. 赛博风头部与状态徽章 ===')
  const titleText = await page.locator('.ws-title').innerText()
  check('标题含 BUG//AGENT', titleText.includes('BUG') && titleText.includes('AGENT'), titleText.trim())

  const badgeText = await page.evaluate(() => {
    const el = document.querySelector('.ws-badge')
    return el ? el.textContent.trim() : null
  })
  check('状态徽章存在', badgeText && badgeText.length > 0, badgeText)

  console.log('\n=== 5. 运行中显示已用时 + 阶段进行中状态 ===')
  await page.click('button:has-text("开始分析")')
  await page.waitForTimeout(1500)
  // 检查计时器显示
  const runningTime = await page.evaluate(() => {
    const el = document.querySelector('.ws-stat-value')
    return el ? el.textContent.trim() : null
  })
  check('运行中显示已用时', /\d+\.\ds/.test(runningTime || ''), runningTime)

  // 至少一个 stage 是 running 状态
  const runningStages = await page.locator('.sc-running').count()
  check('至少 1 个 stage 进入 running 状态', runningStages >= 1, `${runningStages} 个`)

  console.log('\n=== 6. 等待完成 ===')
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    const s = await page.evaluate(() => {
      const el = document.querySelector('.ws-badge')
      return el ? el.textContent.trim() : ''
    })
    if (s.includes('DONE') || s.includes('ERROR')) break
  }
  await page.waitForTimeout(1500)

  const finalBadge = await page.evaluate(() => {
    const el = document.querySelector('.ws-badge')
    return el ? el.textContent.trim() : null
  })
  check('最终状态 = DONE', finalBadge && finalBadge.includes('DONE'), finalBadge)

  console.log('\n=== 7. 完成后显示总耗时 + 4 阶段全 done ===')
  const totalTime = await page.evaluate(() => {
    const el = document.querySelector('.ws-stat-value')
    return el ? el.textContent.trim() : null
  })
  check('完成显示总耗时', /\d+\.\d+\s*(s|秒)/.test(totalTime || ''), totalTime)

  const doneStages = await page.locator('.sc-done').count()
  check('4 个 stage 全部 done', doneStages === 4, `${doneStages} 个`)

  console.log('\n=== 8. PDF 下载与视觉验证 ===')
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  if (!download) {
    check('触发下载', false, 'timeout')
  } else {
    const pdfPath = `${ARTIFACTS}/cyber-report.pdf`
    await download.saveAs(pdfPath)
    const size = fs.statSync(pdfPath).size
    check('PDF 下载成功', size > 5000, `${size} bytes`)
    check('PDF 大小合理（>20KB）', size > 20000, `${size} bytes`)

    // 转 PNG 视觉验证
    const py = `
import pymupdf, os
doc = pymupdf.open('${pdfPath.replace(/\\/g, '\\\\')}')
print(f'PAGES={len(doc)}')
for i, p in enumerate(doc):
    pix = p.get_pixmap(dpi=150)
    out = f'${ARTIFACTS.replace(/\\/g, '\\\\')}\\\\cyber-pdf-p{i+1}.png'
    pix.save(out)
    print(f'PAGE_{i+1}={pix.width}x{pix.height}')
print(f'SIZE={os.path.getsize("${pdfPath.replace(/\\/g, '\\\\')}")}')
`
    const r = spawnSync('py', ['-c', py], { encoding: 'utf-8' })
    console.log(r.stdout)
    const pagesMatch = r.stdout.match(/PAGES=(\d+)/)
    const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0
    check('PDF 有页面', pages >= 1, `${pages} 页`)
  }

  console.log('\n=== 9. HistoryPanel 记录了本次历史 ===')
  const historyItems = await page.locator('.hp-item').count()
  check('左栏有历史记录', historyItems >= 1, `${historyItems} 条`)

  console.log('\n=== 10. 全屏截图（验证视觉） ===')
  await page.screenshot({ path: `${ARTIFACTS}/cyber-ui.png`, fullPage: true })
  const screenshotSize = fs.statSync(`${ARTIFACTS}/cyber-ui.png`).size
  check('全屏截图生成', screenshotSize > 10000, `${screenshotSize} bytes`)

  await browser.close()
  console.log('\n' + (pass ? '🎉🎉🎉 赛博风 UI 全部测试通过' : '💥 有失败项'))
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})