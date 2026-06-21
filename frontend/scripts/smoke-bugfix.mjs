// 验证 Bug 修复：
// Bug 1: StageCard 应该渲染 slot 内容（BugListCard 等）
// Bug 2: CodeEditor 应该应用 syntax highlighting
import { chromium } from 'playwright'

const FRONTEND = 'http://127.0.0.1:5173'
const ARTIFACTS = 'e:/Code/LEC06-1/frontend/scripts/artifacts'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext()).newPage()
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  let pass = true
  const check = (label, cond, extra = '') => {
    console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
    if (!cond) pass = false
  }

  console.log('=== 1. Bug 2: 代码语法高亮（无需分析）===')
  // 加载示例后立即检查 hljs 标记
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)

  // 检查 display 层的 hljs 着色
  const hljsInfo = await page.evaluate(() => {
    const code = document.querySelector('.ce-display code')
    if (!code) return { exists: false }
    return {
      exists: true,
      html: code.innerHTML.slice(0, 200),
      hasHljsKeyword: !!code.querySelector('.hljs-keyword'),
      hasHljsBuiltin: !!code.querySelector('.hljs-built_in'),
      hasHljsString: !!code.querySelector('.hljs-string'),
      hasHljsFunction: !!code.querySelector('.hljs-function, .hljs-title'),
      tokenCount: code.querySelectorAll('[class^="hljs-"]').length
    }
  })
  check('hljs code 元素存在', hljsInfo.exists)
  check('hljs-keyword 标记存在（def/return等）', hljsInfo.hasHljsKeyword, `${hljsInfo.tokenCount} tokens`)
  check('hljs-built_in 标记存在（print等）', hljsInfo.hasHljsBuiltin)
  check('hljs-function 或 hljs-title 标记存在', hljsInfo.hasHljsFunction)
  // hljs-string 仅在代码含字符串字面量时存在。Python 示例无字符串，跳过严格检查
  console.log(`  注: hljs-string ${hljsInfo.hasHljsString ? '存在' : '不存在（示例代码无字符串）'}`)
  console.log('  hljs HTML 前 200 字符:', hljsInfo.html)

  // 验证 textarea 在 display 层之上（可输入）
  const editable = await page.evaluate(() => {
    const ta = document.querySelector('.ce-input')
    return ta && !ta.disabled && ta.tagName === 'TEXTAREA'
  })
  check('textarea 编辑层存在且可编辑', editable)

  // 测试输入同步到 store
  await page.locator('.ce-input').click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.keyboard.type('def hello():\n    print("hi")')
  await page.waitForTimeout(300)
  const typedText = await page.evaluate(() => document.querySelector('.ce-input')?.value)
  check('手动输入同步到 modelValue', typedText?.includes('hello()'), typedText)

  // 重新加载示例
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)

  console.log('\n=== 2. Bug 1: StageCard slot 内容渲染 ===')
  // 在分析之前，stage body 可能为空
  const beforeAnalysis = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.sc-slot'))
    return slots.map((s) => ({
      empty: s.children.length === 0,
      innerTextLen: s.innerText.trim().length
    }))
  })
  console.log('  分析前 4 个 slot:', JSON.stringify(beforeAnalysis))

  // 跑分析
  await page.click('button:has-text("开始分析")')

  // 等待所有 stage 完成
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    const done = await page.locator('.sc.is-done').count()
    if (done >= 4) break
  }
  await page.waitForTimeout(1500)

  // 验证 4 个 stage slot 都有内容（分析详情）
  const afterAnalysis = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.sc-slot'))
    return slots.map((s) => ({
      empty: s.children.length === 0,
      innerTextLen: s.innerText.trim().length,
      preview: s.innerText.trim().slice(0, 80)
    }))
  })
  console.log('  分析后 4 个 slot:')
  afterAnalysis.forEach((s, i) => {
    console.log(`    [${i}] empty=${s.empty} len=${s.innerTextLen} preview="${s.preview}"`)
  })
  check('分析后 4 个 stage slot 全部非空', afterAnalysis.every((s) => !s.empty && s.innerTextLen > 0))

  // 验证每个 slot 包含对应的卡片内容
  const slotHasAnalysis = afterAnalysis[0]?.innerTextLen > 30
  const slotHasFix = afterAnalysis[1]?.innerTextLen > 30
  const slotHasExec = afterAnalysis[2]?.innerTextLen > 0
  const slotHasReflection = afterAnalysis[3]?.innerTextLen > 0
  check('① 系统分析 slot 有内容', slotHasAnalysis, `${afterAnalysis[0]?.innerTextLen} chars`)
  check('② 自动修复 slot 有内容', slotHasFix, `${afterAnalysis[1]?.innerTextLen} chars`)
  check('③ 执行验证 slot 有内容', slotHasExec, `${afterAnalysis[2]?.innerTextLen} chars`)
  check('④ 自我反思 slot 有内容', slotHasReflection, `${afterAnalysis[3]?.innerTextLen} chars`)

  // Bug 列表包含关键词（用完整 slot 文本，避免 preview 截断）
  const allSlotTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.sc-slot'))
      .map((s) => s.innerText)
      .join('\n')
  })
  check('Bug 列表含 SyntaxError', allSlotTexts.includes('SyntaxError'))
  check('Bug 列表含 high 徽章', /high/i.test(allSlotTexts))

  console.log('\n=== 3. 截图（验证视觉）===')
  await page.screenshot({ path: `${ARTIFACTS}/apple-bugfix-light.png`, fullPage: true })
  console.log(`  截图: apple-bugfix-light.png (${(await import('node:fs')).statSync(`${ARTIFACTS}/apple-bugfix-light.png`).size} bytes)`)

  await browser.close()
  console.log('\n' + (pass ? '🎉🎉🎉 两个 Bug 都修复了' : '💥 还有问题'))
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})