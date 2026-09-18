import { expect, test } from '@playwright/test'

const KEY = 'browser-notes:notes'
const NOTE = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  title: 'Stored',
  body: 'original',
  updatedAt: '2026-09-17T08:00:00.000Z',
}
const RAW = JSON.stringify({ version: 1, notes: [NOTE] })

async function installWriteFailure(page, raw = RAW, errorName = 'QuotaExceededError') {
  await page.addInitScript(({ key, seeded, name }) => {
    const original = Storage.prototype.setItem
    if (seeded === null) localStorage.removeItem(key)
    else original.call(localStorage, key, seeded)
    original.call(localStorage, 'unrelated', 'keep')
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value(storageKey, value) {
        if (storageKey === key) throw new DOMException('injected failure', name)
        return original.call(this, storageKey, value)
      },
    })
  }, { key: KEY, seeded: raw, name: errorName })
}

test('corrupt and unsupported startup stay editable without showing a fictional empty collection', async ({ page }) => {
  for (const [raw, message] of [['{bad', /invalid or corrupted/i], ['{"version":2,"notes":[]}', /unsupported version/i]]) {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: raw })
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText(message)
    await expect(page.getByText(/no saved notes yet/i)).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Title' })).toBeEditable()
    await expect(page.getByRole('textbox', { name: 'Body' })).toBeEditable()
    await page.getByRole('textbox', { name: 'Title' }).fill('Unsaved draft')
    await page.getByRole('textbox', { name: 'Body' }).fill('still editable')
    await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled()
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(raw)
  }
})

test('denied startup stays editable without showing a fictional empty collection or changing bytes', async ({ page }) => {
  await page.addInitScript(({ key, raw }) => {
    const storage = window.localStorage
    Storage.prototype.setItem.call(storage, key, raw)
    Storage.prototype.setItem.call(storage, 'unrelated', 'keep')
    window.__readOriginalStorage = (storageKey) => Storage.prototype.getItem.call(storage, storageKey)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('injected denial', 'SecurityError') },
    })
  }, { key: KEY, raw: RAW })

  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText(/storage is unavailable/i)
  await expect(page.getByText(/no saved notes yet/i)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Title' })).toBeEditable()
  await expect(page.getByRole('textbox', { name: 'Body' })).toBeEditable()
  await page.getByRole('textbox', { name: 'Title' }).fill('Unsaved draft')
  await page.getByRole('textbox', { name: 'Body' }).fill('still editable')
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled()
  expect(await page.evaluate((key) => window.__readOriginalStorage(key), KEY)).toBe(RAW)
  expect(await page.evaluate(() => window.__readOriginalStorage('unrelated'))).toBe('keep')
})

test('quota failure retains a new draft and never reports success', async ({ page }) => {
  await installWriteFailure(page, null)
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Title' }).fill('Unsaved')
  await page.getByRole('textbox', { name: 'Body' }).fill('keep this text')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByRole('alert')).toContainText(/storage is full/i)
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('keep this text')
  await expect(page.getByRole('button', { name: 'Save note' })).toBeFocused()
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep')
})

test('failed delete preserves selection, draft, original bytes, and unrelated keys', async ({ page }) => {
  await installWriteFailure(page)
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Body' }).fill('dirty text')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete note' }).click()
  await expect(page.getByRole('alert')).toContainText(/storage is full/i)
  await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('dirty text')
  await expect(page.getByRole('button', { name: /^Stored/ })).toHaveAttribute('aria-current', 'true')
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(RAW)
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep')
})

test('an exact-token conflict keeps the draft and external bytes', async ({ page }) => {
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw: RAW })
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Body' }).fill('my draft')
  const external = JSON.stringify({ version: 1, notes: [{ ...NOTE, body: 'external', updatedAt: '2026-09-17T09:00:00.000Z' }] })
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: external })
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByRole('alert')).toContainText(/another tab/i)
  await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('my draft')
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Delete note' })).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(external)
})

test('a delete conflict retains the visible list, selection, exact draft, and external bytes', async ({ page }) => {
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw: RAW })
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Body' }).fill('conflict delete draft')
  const external = JSON.stringify({ version: 1, notes: [{ ...NOTE, body: 'external', updatedAt: '2026-09-17T09:00:00.000Z' }] })
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: external })
  page.on('dialog', (dialog) => dialog.accept())

  await page.getByRole('button', { name: 'Delete note' }).click()

  await expect(page.getByRole('alert')).toContainText(/another tab/i)
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('conflict delete draft')
  await expect(page.getByRole('button', { name: /^Stored/ })).toHaveAttribute('aria-current', 'true')
  await expect(page.getByText(/saved notes are unavailable/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Delete note' })).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(external)
})
