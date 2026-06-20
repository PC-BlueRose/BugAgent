// 完整端到端：验证三项优化（PDF / 4阶段上下堆叠 / 耗时显示）
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

  console.log('=== 1. 打开页面 + 编辑器 ===')
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const taValue = await page.locator('.ed-textarea').inputValue()
  check('编辑器已渲染', await page.locator('.ed-textarea').count() === 1)
  check('编辑器初始为空', taValue === '')

  console.log('\n=== 2. 加载示例 + 语法高亮 ===')
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)
  const codeAfter = await page.locator('.ed-textarea').inputValue()
  check('编辑器填充示例代码', codeAfter.length > 10, `${codeAfter.length} 字符`)
  const hlSpans = await page.locator('.ed-highlight .hljs-keyword, .ed-highlight .hljs-built_in, .ed-highlight .hljs-string').count()
  check('语法高亮应用', hlSpans > 0, `${hlSpans} 个高亮 span`)

  console.log('\n=== 3. UI：4 阶段上下堆叠布局 ===')
  const stageCount = await page.locator('.stage').count()
  check('页面上有 4 个 stage 块', stageCount === 4, `${stageCount} 个`)
  // 验证它们都在 ws-right 里垂直排列
  const stageLayout = await page.evaluate(() => {
    const stages = Array.from(document.querySelectorAll('.stage'))
    if (stages.length < 2) return null
    const r1 = stages[0].getBoundingClientRect()
    const r2 = stages[1].getBoundingClientRect()
    return r1.top < r2.top
  })
  check('4 阶段上下排列（stage[0].top < stage[1].top）', stageLayout === true)
  // 验证没有 .el-tabs 容器
  const tabCount = await page.locator('.el-tabs').count()
  check('不再使用 el-tabs 分页（只有 1 个可接受 / 0 才符合新设计）', tabCount === 0, `${tabCount} 个 el-tabs`)

  console.log('\n=== 4. 运行中显示已用时 ===')
  // 检查 header 区是否有 ⏱ 已用时 文本（运行中才会出现）
  await page.click('button:has-text("开始分析")')
  await page.waitForTimeout(2000) // 让 SSE 启动
  const runningTimeVisible = await page.evaluate(() => {
    const headerRight = document.querySelector('.ws-header-right')
    return headerRight ? headerRight.textContent : ''
  })
  check(
    '运行中显示已用时',
    runningTimeVisible.includes('已用时') || runningTimeVisible.includes('秒'),
    `header: ${runningTimeVisible.slice(0, 100)}`
  )

  // 等到完成
  console.log('\n=== 5. 等待完成 ===')
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    const s = await page.evaluate(() =>
      document.querySelector('.ws-header-right .el-tag')?.textContent?.trim()
    )
    if (s === '完成') break
  }
  await page.waitForTimeout(1500)

  const finalStatus = await page.evaluate(() =>
    document.querySelector('.ws-header-right .el-tag')?.textContent?.trim()
  )
  check('最终状态 = 完成', finalStatus === '完成')

  console.log('\n=== 6. 完成后显示总耗时 ===')
  const totalTimeText = await page.evaluate(() => {
    const headerRight = document.querySelector('.ws-header-right')
    return headerRight ? headerRight.textContent : ''
  })
  check(
    'header 显示「总耗时 XX 秒」',
    totalTimeText.includes('总耗时') && /\d+\.\d+\s*秒/.test(totalTimeText),
    `header: ${totalTimeText.slice(0, 100)}`
  )

  // 检查 footer 也显示耗时
  const footerText = await page.evaluate(() => document.querySelector('.ws-footer')?.textContent || '')
  check(
    'footer 也显示耗时信息',
    footerText.includes('秒') && /\d/.test(footerText),
    `footer: ${footerText.slice(0, 100)}`
  )

  console.log('\n=== 7. 4 阶段全 ✓ + 内容非空 ===')
  // 每个 stage 内的 ✓ 标签数量
  const stageBadges = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.stage .stage-header')).map((h) => {
      const ok = h.querySelector('.el-tag--success')
      return ok ? '✓' : h.textContent.replace(/\s+/g, ' ').slice(0, 30)
    })
  })
  console.log('   各阶段徽章:', stageBadges.join(' | '))
  check('4 阶段全部显示 ✓', stageBadges.length === 4 && stageBadges.every((b) => b === '✓'))

  // 各 stage body 有内容（高置信度反思 issues 列表可能为空，body 仍有标签等元素）
  const stagesContent = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.stage .stage-body')).map((b) => b.innerText.length)
  })
  console.log('   各阶段内容长度:', stagesContent.join(', '))
  check(
    '4 阶段 body 都有内容',
    stagesContent.length === 4 && stagesContent.every((l) => l > 10),
    stagesContent.join(', ')
  )

  console.log('\n=== 8. PDF 下载 + 视觉内容验证 ===')
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await page.click('button:has-text("生成 PDF 报告")')
  const download = await downloadPromise
  if (!download) {
    check('触发下载', false, 'timeout')
  } else {
    const pdfPath = `${ARTIFACTS}/report-final-e2e.pdf`
    await download.saveAs(pdfPath)
    const size = fs.statSync(pdfPath).size
    check('PDF 下载成功', size > 1000, `${size} bytes`)
    check('PDF 含视觉内容（> 20KB）', size > 20000, `${size} bytes`)

    // 用 PyMuPDF 转 PNG 检查
    const py = `
import pymupdf
doc = pymupdf.open('${pdfPath.replace(/\\/g, '\\\\')}')
print(f'PAGES={len(doc)}')
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=100)
    out = f'${ARTIFACTS.replace(/\\/g, '\\\\')}\\\\report-final-e2e-page-{i+1}.png'
    pix.save(out)
    print(f'PAGE_{i+1}_SIZE={pix.width}x{pix.height}')
`
    const r = spawnSync('py', ['-c', py], { encoding: 'utf-8' })
    console.log(r.stdout)
    const pagesMatch = r.stdout.match(/PAGES=(\d+)/)
    const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0
    check('PDF 有页面', pages >= 1, `${pages} 页`)

    // 检查页面包含非空白内容
    for (let i = 1; i <= pages; i++) {
      const imgPath = `${ARTIFACTS}/report-final-e2e-page-${i}.png`
      if (fs.existsSync(imgPath)) {
        const imgSize = fs.statSync(imgPath).size
        check(`第 ${i} 页图像非空白（>1KB）`, imgSize > 1000, `${imgSize} bytes`)
      }
    }
  }

  await page.screenshot({ path: `${ARTIFACTS}/ui-final.png`, fullPage: true })
  console.log('\nUI 截图保存至 artifacts/ui-final.png')

  await browser.close()
  console.log('\n' + (pass ? '🎉🎉🎉 全部三项优化通过' : '💥 有失败项'))
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})