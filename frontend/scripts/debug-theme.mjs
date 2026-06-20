// 检查 ThemeToggle 是否被正确绑定
import { chromium } from 'playwright'

const FRONTEND = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(FRONTEND, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // 1. 检查按钮存在
  const btnInfo = await page.evaluate(() => {
    const btn = document.querySelector('.tt')
    if (!btn) return null
    return {
      tagName: btn.tagName,
      disabled: btn.disabled,
      hasClick: btn.onclick !== null || btn.getAttributeNames().some(n => n.startsWith('on')),
      rect: btn.getBoundingClientRect()
    }
  })
  console.log('Button info:', btnInfo)

  // 2. 验证点击事件能触发
  await page.evaluate(() => {
    const btn = document.querySelector('.tt')
    btn?.addEventListener('click', () => {
      console.log('!! CLICK DETECTED on .tt')
    })
  })

  // 监听 console
  page.on('console', (m) => {
    if (m.text().includes('CLICK DETECTED')) console.log('  >>>', m.text())
  })

  // 3. 点击 5 次，每次记录 data-theme
  for (let i = 0; i < 5; i++) {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    // 用 evaluate 直接 dispatch 点击事件，确保只触发一次
    await page.evaluate(() => document.querySelector('.tt')?.click())
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    console.log(`  ${i+1}: ${before} → ${after}`)
  }

  await browser.close()
}

main().catch(console.error)