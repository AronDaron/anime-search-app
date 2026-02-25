const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()))
  page.on('pageerror', (error) => console.log('BROWSER ERROR:', error.message))
  page.on('requestfailed', (request) =>
    console.log('NETWORK ERROR:', request.url(), request.failure().errorText)
  )

  console.log('Navigating to http://localhost:5173/')
  await page.goto('http://localhost:5173/')

  // Wait a bit for Home to load
  await page.waitForTimeout(2000)

  console.log('Typing in search bar...')
  await page.fill('input.search-input', 'Jujutsu Kaisen')

  // Wait for debounce and search query
  await page.waitForTimeout(3000)

  await browser.close()
})()
