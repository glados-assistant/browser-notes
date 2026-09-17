import { describe, expect, it, vi } from 'vitest'
import { createNoteStorage, STORAGE_KEY } from './noteStorage.js'

const NOTE = { id: '123e4567-e89b-42d3-a456-426614174000', title: 'Title', body: '', updatedAt: '2026-09-17T08:00:00.000Z' }
const raw = (notes = [NOTE]) => JSON.stringify({ version: 1, notes })
function fakeStorage(initial = null) {
  let value = initial
  return { getItem: vi.fn(() => value), setItem: vi.fn((_key, next) => { value = next }), get value() { return value } }
}

describe('note storage', () => {
  it('loads a missing key as an empty collection without writing', () => {
    const storage = fakeStorage()
    expect(createNoteStorage(() => storage).load()).toEqual({ ok: true, notes: [], token: null })
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it.each([
    ['', 'corrupt'], ['null', 'corrupt'], ['{"version":2,"notes":[]}', 'unsupported'], ['{"version":1,"notes":{}}', 'corrupt'],
    [JSON.stringify({ version: 1, notes: [NOTE, NOTE] }), 'corrupt'],
  ])('blocks malformed or unsupported input without writing', (input, code) => {
    const storage = fakeStorage(input)
    expect(createNoteStorage(() => storage).load()).toEqual({ ok: false, code })
    expect(storage.value).toBe(input)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('maps denied reads and unavailable storage', () => {
    expect(createNoteStorage(() => { throw new DOMException('denied', 'SecurityError') }).load()).toEqual({ ok: false, code: 'unavailable' })
    expect(createNoteStorage(() => ({ getItem() { throw new Error('read') } })).load()).toEqual({ ok: false, code: 'write-failed' })
  })
  it('commits only to the namespaced key when the exact token still matches', () => {
    const storage = fakeStorage(raw())
    const repository = createNoteStorage(() => storage)
    const result = repository.commit([NOTE], storage.value)
    expect(result).toEqual({ ok: true, token: raw() })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, raw())
  })
  it('rejects conflict and invalid outgoing data without writing', () => {
    const storage = fakeStorage(raw())
    const repository = createNoteStorage(() => storage)
    expect(repository.commit([NOTE], null)).toEqual({ ok: false, code: 'conflict' })
    expect(repository.commit([{ ...NOTE, title: ' ' }], storage.value)).toEqual({ ok: false, code: 'invalid' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('never overwrites corrupt current data', () => {
    const storage = fakeStorage('{bad')
    expect(createNoteStorage(() => storage).commit([NOTE], '{bad')).toEqual({ ok: false, code: 'corrupt' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('maps quota, security, serialization and generic write failures', () => {
    for (const [error, code] of [[new DOMException('full', 'QuotaExceededError'), 'quota'], [new DOMException('denied', 'SecurityError'), 'unavailable'], [new Error('failed'), 'write-failed']]) {
      const storage = fakeStorage(null); storage.setItem.mockImplementation(() => { throw error })
      expect(createNoteStorage(() => storage).commit([NOTE], null)).toEqual({ ok: false, code })
    }
  })
})
