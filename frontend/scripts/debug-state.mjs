// 调试脚本：直接读取 Pinia store 状态
import { chromium } from 'playwright'

const FRONTEND = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext()).newPage()

  page.on('console', (m) => console.log(`[browser ${m.type()}]`, m.text()))

  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // 切到 C 语言
  await page.locator('.el-select').first().click()
  await page.waitForTimeout(400)
  await page.locator('.el-select-dropdown__item:has-text("C")').first().click()
  await page.waitForTimeout(800)

  await page.click('button:has-text("加载示例")')
  await page.waitForTimeout(500)

  await page.click('button:has-text("开始分析")')

  // 轮询直到 完成
  for (let i = 0; i < 240; i++) {
    await page.waitForTimeout(500)
    const status = await page.evaluate(() => {
      const tag = document.querySelector('.ws-header-right .el-tag')
      return tag ? tag.textContent.trim() : '?'
    })
    if (status !== '运行中') break
  }

  // 等 Vue 渲染
  await page.waitForTimeout(3000)

  // 输出 tab 状态
  const tabInfo = await page.evaluate(() => {
    const items = document.querySelectorAll('.el-tabs__item')
    return Array.from(items).map((it) => it.innerText.replace(/\s+/g, ' '))
  })
  console.log('\n=== Tab labels ===')
  tabInfo.forEach((t, i) => console.log(`  [${i}]`, t))

  // 直接通过 window.__APP__ 拿到 store
  const storeState = await page.evaluate(() => {
    // @ts-ignore
    const app = window.__APP__ || null
    if (!app) return 'no app handle'
    return 'have app'
  })
  console.log('\nStore handle:', storeState)

  // 读取 el-tabs 内部数据
  const tabPaneInfo = await page.evaluate(() => {
    const panes = document.querySelectorAll('.el-tab-pane')
    return Array.from(panes).map((p, i) => ({
      i,
      active: p.classList.contains('is-active'),
      text: p.innerText.slice(0, 100)
    }))
  })
  console.log('\n=== Tab panes ===')
  tabPaneInfo.forEach((p) =>
    console.log(`  [${p.i}] active=${p.active} | ${p.text.replace(/\n/g, ' / ')}`)
  )

  // 抓取 .el-tabs__nav 的 innerHTML 看看
  const navHtml = await page.evaluate(() => {
    const nav = document.querySelector('.el-tabs__nav')
    return nav ? nav.outerHTML.slice(0, 2000) : 'no nav'
  })
  console.log('\n=== Tabs nav HTML (2000 chars) ===')
  console.log(navHtml)

  await browser.close()
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})