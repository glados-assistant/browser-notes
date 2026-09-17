import { expect, test } from '@playwright/test'

const title = (page) => page.getByRole('textbox', { name: 'Title' })
const body = (page) => page.getByRole('textbox', { name: 'Body' })

async function openClean(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

async function saveNote(page, noteTitle, noteBody = '') {
  await title(page).fill(noteTitle)
  await body(page).fill(noteBody)
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved')
}

test('creates, isolates, edits, reloads, and safely deletes notes', async ({ page }) => {
  await openClean(page)
  await saveNote(page, 'First', '')
  await page.getByRole('button', { name: 'New note' }).click()
  await saveNote(page, 'Second', 'second body')

  await page.getByRole('button', { name: /^First/ }).click()
  await expect(body(page)).toHaveValue('')
  await body(page).fill('first edited')
  await page.getByRole('button', { name: 'Save note' }).click()
  await page.reload()
  await expect(title(page)).toHaveValue('First')
  await expect(body(page)).toHaveValue('first edited')
  await expect(page.getByRole('button', { name: /^Second/ })).toBeVisible()

  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Delete note' }).click()
  await expect(title(page)).toHaveValue('First')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete note' }).click()
  await expect(page.getByRole('status')).toHaveText('Deleted')
  await expect(title(page)).toHaveValue('Second')
  await expect(page.getByRole('button', { name: /^First/ })).toHaveCount(0)
})

test('dirty navigation is cancellable and confirmed navigation focuses title', async ({ page }) => {
  await openClean(page)
  await saveNote(page, 'Keep me', 'baseline')
  await body(page).fill('dirty draft')

  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'New note' }).click()
  await expect(body(page)).toHaveValue('dirty draft')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'New note' }).click()
  await expect(title(page)).toHaveValue('')
  await expect(title(page)).toBeFocused()
})

test('blank titles do not write, empty bodies save, and HTML-looking content stays literal', async ({ page }) => {
  await openClean(page)
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter a title')
  await expect(title(page)).toBeFocused()

  const literalTitle = '<img src=x onerror="window.__browserNotesXss=1">'
  const literalBody = '<script>window.__browserNotesXss=2</script>'
  await saveNote(page, literalTitle, literalBody)
  await page.reload()
  await expect(title(page)).toHaveValue(literalTitle)
  await expect(body(page)).toHaveValue(literalBody)
  expect(await page.evaluate(() => window.__browserNotesXss)).toBeUndefined()
  await expect(page.locator('main img, main script')).toHaveCount(0)
})
