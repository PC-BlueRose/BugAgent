// Apple 风格 UI 端到端测试
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

  console.log('=== 1. 打开页面 + 三列 + 主题 ===')
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 三列布局
  const colCount = await page.locator('.ws-col').count()
  check('页面有 3 个 ws-col 列', colCount === 3, `${colCount} 列`)

  // 左栏 History
  const histExists = await page.locator('.hp').count()
  check('左栏 HistoryPanel 存在', histExists === 1)

  // 中栏 CodeEditor
  const editorExists = await page.locator('.ce-pre[contenteditable]').count()
  check('中栏 CodeEditor 存在', editorExists === 1)

  // 右栏 StageCard
  const stageCount = await page.locator('.sc').count()
  check('右栏 4 个 StageCard', stageCount === 4, `${stageCount} 个`)

  // ThemeToggle
  const themeToggle = await page.locator('.tt').count()
  check('ThemeToggle 存在', themeToggle === 1)

  // 默认主题
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  check('默认主题已设置 (data-theme 属性)', ['light', 'dark'].includes(initialTheme || ''), initialTheme)

  console.log('\n=== 2. 主题切换（浅 → 深 → 跟随系统）===')
  // 初始
  const startTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  // cycle: light → dark → auto → light → ...
  await page.click('.tt')
  await page.waitForTimeout(300)
  const theme2 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await page.click('.tt')
  await page.waitForTimeout(300)
  const theme3 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await page.click('.tt')
  await page.waitForTimeout(300)
  const theme4 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  // 4 次点击应至少看到 2 种不同的主题值
  const distinct = new Set([startTheme, theme2, theme3, theme4]).size
  check('4 次点击覆盖 ≥ 2 种主题', distinct >= 2, `${startTheme} → ${theme2} → ${theme3} → ${theme4}`)
  // 切换到浅色固定方便后续测试
  while (await page.evaluate(() => document.documentElement.getAttribute('data-theme')) !== 'light') {
    await page.click('.tt')
    await page.waitForTimeout(200)
  }

  console.log('\n=== 3. 加载示例 + 编辑器同步 ===')
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)
  const editorText = await page.locator('.ce-pre[contenteditable]').innerText()
  check('编辑器填充示例代码', editorText.length > 10, `${editorText.length} 字符`)

  console.log('\n=== 4. 编辑器可手动输入 ===')
  await page.locator('.ce-pre[contenteditable]').click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.keyboard.type('print("hello apple")')
  await page.waitForTimeout(300)
  const typed = await page.locator('.ce-pre[contenteditable]').innerText()
  check('手动输入同步', typed.includes('apple'), typed)

  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)

  console.log('\n=== 5. 运行中显示已用时 + 阶段状态 ===')
  await page.click('button:has-text("开始分析")')
  // 短间隔轮询 status，等出现第一个 running stage
  let sawRunning = false
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150)
    const n = await page.locator('.sc.is-running').count()
    if (n >= 1) {
      sawRunning = true
      break
    }
  }
  check('至少 1 个 stage 进入 running', sawRunning, sawRunning ? '已捕获' : '始终 0 个')

  const runningTime = await page.evaluate(() => {
    const el = document.querySelector('.ws-stat-value')
    return el ? el.textContent.trim() : null
  })
  check('运行中显示已用时', /\d+\.\d+(s|秒)/.test(runningTime || ''), runningTime)

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

  console.log('\n=== 7. 4 阶段全 done + 计时 ===')
  const doneStages = await page.locator('.sc.is-done').count()
  check('4 个 stage 全部 done', doneStages === 4, `${doneStages} 个`)

  const totalTime = await page.evaluate(() => {
    const el = document.querySelector('.ws-stat-value')
    return el ? el.textContent.trim() : null
  })
  // 用更宽松的匹配：数字 . 数字 + 任意空白 + 秒
  check(
    '完成显示总耗时',
    /\d+\.\d+\s*(s|秒|sec)/.test(totalTime || '') || /\d+(\.\d+)?\s*(s|秒|sec)/.test(totalTime || ''),
    `[${totalTime}] (codes: ${totalTime?.split('').map(c => c.charCodeAt(0)).join(',')})`
  )

  console.log('\n=== 8. PDF 下载 ===')
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  if (!download) {
    check('触发下载', false, 'timeout')
  } else {
    const pdfPath = `${ARTIFACTS}/apple-report.pdf`
    await download.saveAs(pdfPath)
    const size = fs.statSync(pdfPath).size
    check('PDF 下载成功', size > 5000, `${size} bytes`)

    const py = `
import pymupdf, os
doc = pymupdf.open('${pdfPath.replace(/\\/g, '\\\\')}')
print(f'PAGES={len(doc)}')
for i, p in enumerate(doc):
    pix = p.get_pixmap(dpi=150)
    out = f'${ARTIFACTS.replace(/\\/g, '\\\\')}\\\\apple-pdf-p{i+1}.png'
    pix.save(out)
print(f'SIZE={os.path.getsize("${pdfPath.replace(/\\/g, '\\\\')}")}')
`
    const r = spawnSync('py', ['-c', py], { encoding: 'utf-8' })
    console.log(r.stdout)
    const pagesMatch = r.stdout.match(/PAGES=(\d+)/)
    const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0
    check('PDF 有页面', pages >= 1, `${pages} 页`)
  }

  console.log('\n=== 9. HistoryPanel 记录 ===')
  const historyItems = await page.locator('.hp-item').count()
  check('左栏有历史记录', historyItems >= 1, `${historyItems} 条`)

  console.log('\n=== 10. 截图（Apple 浅色）===')
  await page.screenshot({ path: `${ARTIFACTS}/apple-light.png`, fullPage: true })
  check('浅色截图', fs.statSync(`${ARTIFACTS}/apple-light.png`).size > 10000)

  // 切到深色：从 light 状态需要点 2 次（light→dark→auto→light），
  // 或从 auto 状态点 2 次（auto→light→dark）。所以需要切到 dark 后再点一次。
  // 简单做法：循环点直到 data-theme='dark'。
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    if (cur === 'dark') break
    await page.click('.tt')
    await page.waitForTimeout(300)
  }
  const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (isDark === 'dark') {
    await page.screenshot({ path: `${ARTIFACTS}/apple-dark.png`, fullPage: true })
    check('深色截图', fs.statSync(`${ARTIFACTS}/apple-dark.png`).size > 10000)
  } else {
    check('切到深色主题', false, `当前 data-theme=${isDark}`)
  }

  await browser.close()
  console.log('\n' + (pass ? '🎉🎉🎉 Apple UI 全部测试通过' : '💥 有失败项'))
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})