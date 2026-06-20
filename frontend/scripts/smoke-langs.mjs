// 多语言冒烟测试 v2：容忍 LLM 瞬时失败，更精确的 tab 检查
import { chromium } from 'playwright'

const FRONTEND = 'http://127.0.0.1:5173'

const LANGUAGES = [
  { value: 'python', label: 'Python', expectIn: ['def', 'add'] },
  { value: 'c', label: 'C', expectIn: ['stdio.h', 'main'] },
  { value: 'cpp', label: 'C++', expectIn: ['iostream', 'vector'] },
  { value: 'java', label: 'Java', expectIn: ['public class', 'Main'] }
]

async function runOne(browser, lang) {
  console.log(`\n=== Testing ${lang.label} ===`)
  const page = await (await browser.newContext()).newPage()
  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  let pass = true
  const check = (label, cond, extra = '') => {
    console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
    if (!cond) pass = false
  }

  try {
    await page.goto(FRONTEND, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // 选语言
    await page.locator('.el-select').first().click()
    await page.waitForTimeout(400)
    await page.locator(`.el-select-dropdown__item:has-text("${lang.label}")`).first().click()
    await page.waitForTimeout(800)

    // 加载示例
    await page.click('button:has-text("加载示例")')
    await page.waitForTimeout(600)

    const code = await page.locator('.ed-textarea').inputValue()
    check('示例已加载', code.length > 10, `${code.length} 字符`)
    check(
      '代码含预期关键字',
      lang.expectIn.some((kw) => code.includes(kw))
    )

    // 提交（重试最多 2 次，容忍 LLM 瞬时失败）
    let succeeded = false
    let finalStatus = 'streaming'
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) {
        console.log(`  ↻ 重试第 ${attempt} 次...`)
        await page.click('button:has-text("清空")')
        await page.waitForTimeout(500)
        await page.click('button:has-text("加载示例")')
        await page.waitForTimeout(500)
        await page.click('button:has-text("开始分析")')
      } else {
        await page.click('button:has-text("开始分析")')
      }

      // 等待完成或异常
      for (let i = 0; i < 480; i++) {
        await page.waitForTimeout(500)
        finalStatus = await page.evaluate(() => {
          const tag = document.querySelector('.ws-header-right .el-tag')
          return tag ? tag.textContent.trim() : 'unknown'
        })
        if (finalStatus === '完成' || finalStatus === '异常') break
      }

      if (finalStatus === '完成') {
        succeeded = true
        break
      }
      if (finalStatus === '异常') {
        // LLM 失败：等待下一次重试
        continue
      }
    }

    check('状态 = 完成（非异常）', succeeded && finalStatus === '完成', `实际: ${finalStatus}`)
    if (!succeeded) {
      console.log('  ⚠️  跳过结果检查（LLM 不可用）')
      return pass
    }

    // 给 Vue 留渲染时间
    await page.waitForTimeout(1500)

    // 4 阶段完成
    const badges = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.el-tabs__item .el-tag')).map((t) =>
        t.textContent.trim()
      )
    )
    check('4 阶段全部完成', badges.length === 4 && badges.every((s) => s === '✓'), JSON.stringify(badges))

    // 切到执行 tab，等内容渲染
    await page.click('.el-tabs__item:has-text("执行验证")')
    await page.waitForTimeout(1500)

    // 用 aria-hidden="false" 找激活的 tab pane
    const execPaneText = await page.evaluate(() => {
      const activePane = document.querySelector('.el-tab-pane[aria-hidden="false"]')
      return activePane ? activePane.innerText : ''
    })

    // C/C++/Java 应显示「模拟执行」，Python 应显示「真实执行」
    const expectedMode =
      lang.value === 'python' ? '真实执行' : '模拟'
    check(
      `执行 tab 显示「${expectedMode}」`,
      execPaneText.includes(expectedMode),
      execPaneText.slice(0, 200).replace(/\n/g, ' / ')
    )

    check('无 console 错误', consoleErrors.length === 0, consoleErrors.length ? consoleErrors[0].slice(0, 100) : '')
  } finally {
    await page.close()
  }
  return pass
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  let allPass = true
  for (const lang of LANGUAGES) {
    const ok = await runOne(browser, lang)
    if (!ok) allPass = false
  }
  await browser.close()
  console.log('\n' + (allPass ? '🎉 所有语言全部通过' : '💥 有失败项'))
  process.exit(allPass ? 0 : 1)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})