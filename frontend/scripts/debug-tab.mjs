// 调试 tab 激活状态
import { chromium } from 'playwright'

const FRONTEND = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext()).newPage()
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // 加载示例 + 分析
  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)
  await page.click('button:has-text("开始分析")')
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    const s = await page.evaluate(() => document.querySelector('.ws-header-right .el-tag')?.textContent?.trim())
    if (s !== '运行中') break
  }
  await page.waitForTimeout(2000)

  // 切到执行 tab
  await page.click('.el-tabs__item:has-text("执行验证")')
  await page.waitForTimeout(3000)

  // 输出执行 tab pane 的 innerHTML
  const execPaneHtml = await page.evaluate(() => {
    const p = document.querySelector('#pane-execution')
    return p ? p.innerHTML.slice(0, 3000) : 'no exec pane'
  })
  console.log('\n=== Execution pane HTML ===')
  console.log(execPaneHtml)

  // 输出所有 pane 状态
  const panes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.el-tab-pane')).map((p, i) => ({
      i,
      id: p.id,
      classes: p.className,
      hidden: p.hidden,
      ariaHidden: p.getAttribute('aria-hidden'),
      text: p.innerText.slice(0, 300)
    }))
  })
  console.log('=== Panes ===')
  panes.forEach((p) => console.log(JSON.stringify(p, null, 2)))

  // 直接检查 store 内容
  const storeCheck = await page.evaluate(() => {
    // 找到执行 tab pane 的内容
    const pane = document.querySelector('.el-tab-pane')
    return pane?.innerHTML?.slice(0, 2000) || 'no pane'
  })
  console.log('\n=== First pane HTML ===')
  console.log(storeCheck)

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })