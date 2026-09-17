import { expect, test } from '@playwright/test'

async function clean(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

test('keyboard-only create and edit flow uses labelled controls and visible focus', async ({ page }) => {
  await clean(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'New note' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('textbox', { name: 'Title' })).toBeFocused()
  await page.keyboard.type('Keyboard note')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('textbox', { name: 'Body' })).toBeFocused()
  await page.keyboard.type('Keyboard body')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Save note' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Saved')
  await expect(page.getByRole('button', { name: /^Keyboard note/ })).toHaveAttribute('aria-current', 'true')
})

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`fits long content at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await clean(page)
    await page.getByRole('textbox', { name: 'Title' }).fill(`Long-${'unbroken'.repeat(30)}`)
    await page.getByRole('button', { name: 'Save note' }).click()
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth)
    await expect(page.getByRole('button', { name: /^Long-/ })).toBeVisible()
  })
}

test('layout remains usable at 200 percent CSS zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await clean(page)
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await expect(page.getByRole('button', { name: 'New note' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible()
})
