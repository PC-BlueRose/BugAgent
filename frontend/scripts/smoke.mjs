// Playwright 端到端冒烟测试 v2
// 验证：1. 加载示例按钮 → textarea 出现代码  2. SSE 全流程  3. 反思阶段完成  4. PDF 导出按钮可点

import { chromium } from 'playwright'
import fs from 'node:fs'

const FRONTEND = 'http://127.0.0.1:5173'
const ARTIFACTS = 'e:/Code/LEC06-1/frontend/scripts/artifacts'

fs.mkdirSync(ARTIFACTS, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()

  const consoleLogs = []
  const consoleErrors = []
  page.on('console', (m) => {
    consoleLogs.push(`[${m.type()}] ${m.text()}`)
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  const apiRequests = []
  page.on('request', (req) => {
    if (req.url().includes('/api/analyze-stream')) {
      try {
        apiRequests.push({ url: req.url(), body: req.postData() })
      } catch {}
    }
  })

  let pass = true
  const check = (label, cond, extra = '') => {
    console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
    if (!cond) pass = false
  }

  console.log('\n=== 1. Open page ===')
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // 初始状态：textarea 应该存在且为空
  const initialTaValue = await page.locator('.ed-textarea').inputValue()
  check('textarea 已渲染', await page.locator('.ed-textarea').count() === 1)
  check('初始为空', initialTaValue === '')

  console.log('\n=== 2. 点击「加载示例」 ===')
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)

  const taValueAfterLoad = await page.locator('.ed-textarea').inputValue()
  check('textarea 已填充样例代码', taValueAfterLoad.length > 10, `${taValueAfterLoad.length} 字符`)
  check('样例包含 Python Bug', taValueAfterLoad.includes('def add') || taValueAfterLoad.includes('print'))

  // 检查高亮叠层
  const highlightSpans = await page.locator('.ed-highlight .hljs-keyword, .ed-highlight .hljs-string, .ed-highlight .hljs-built_in').count()
  check('highlight.js 已应用语法高亮', highlightSpans > 0, `${highlightSpans} 个高亮 span`)

  // 检查 char count
  const charCountText = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s*字符/)
    return m ? m[1] : null
  })
  check('字符计数器显示正确', charCountText && parseInt(charCountText) === taValueAfterLoad.length, `${charCountText}`)

  await page.screenshot({ path: `${ARTIFACTS}/01-after-load.png` })

  console.log('\n=== 3. 点击「开始分析」 ===')
  await page.click('button:has-text("开始分析")')

  // 轮询状态
  let finalStatus = 'streaming'
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    finalStatus = await page.evaluate(() => {
      const tag = document.querySelector('.ws-header-right .el-tag')
      return tag ? tag.textContent.trim() : 'unknown'
    })
    if (finalStatus !== '运行中') break
  }

  check('状态变为完成（而非中断）', finalStatus === '完成', `实际: ${finalStatus}`)

  // 检查所有 4 阶段 tab 都有 ✓
  const stageBadges = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.el-tabs__item .el-tag')).map((t) => t.textContent.trim())
  })
  console.log('   阶段徽章:', stageBadges.join(', '))
  check('4 个阶段全部完成', stageBadges.length === 4 && stageBadges.every((s) => s === '✓'), JSON.stringify(stageBadges))

  // 检查请求体
  check('请求体含 code 字段', apiRequests[0]?.body?.includes('"code"') && apiRequests[0]?.body?.includes('def add'))
  console.log('   请求体:', apiRequests[0]?.body?.slice(0, 120))

  await page.screenshot({ path: `${ARTIFACTS}/02-after-analysis.png`, fullPage: true })

  console.log('\n=== 4. 检查各阶段结果内容 ===')

  // 切到分析 tab
  await page.click('.el-tabs__item:has-text("系统分析")')
  await page.waitForTimeout(300)
  const analysisText = await page.locator('.card').first().innerText()
  check('分析 tab 有内容', analysisText.length > 30, `${analysisText.length} 字符`)

  // 切到修复 tab
  await page.click('.el-tabs__item:has-text("自动修复")')
  await page.waitForTimeout(300)
  const fixCode = await page.locator('.code').first().innerText()
  check('修复 tab 有代码', fixCode.includes('def') || fixCode.includes('print'))

  // 切到执行 tab
  await page.click('.el-tabs__item:has-text("执行验证")')
  await page.waitForTimeout(300)
  const execText = await page.locator('.card').first().innerText()
  check('执行 tab 含 stdout=3', execText.includes('3'))

  // 切到反思 tab
  await page.click('.el-tabs__item:has-text("自我反思")')
  await page.waitForTimeout(300)
  const reflText = await page.locator('.card').first().innerText()
  check('反思 tab 有内容', reflText.length > 20)

  console.log('\n=== 5. 测试 PDF 导出 ===')
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  if (download) {
    const path = `${ARTIFACTS}/report.pdf`
    await download.saveAs(path)
    const stats = fs.statSync(path)
    check('PDF 下载成功', stats.size > 1000, `${stats.size} bytes`)
  } else {
    check('PDF 下载成功', false, '未触发下载事件')
  }

  console.log('\n=== 6. Console errors ===')
  if (consoleErrors.length) {
    console.log('   ⚠️  ' + consoleErrors.length + ' 个错误:')
    consoleErrors.forEach((e) => console.log('     ' + e.slice(0, 150)))
  } else {
    console.log('   ✅ 无错误')
  }

  console.log('\n' + (pass ? '🎉 全部通过' : '💥 有失败项'))
  await browser.close()
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})