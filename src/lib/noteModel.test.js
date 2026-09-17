import { describe, expect, it } from 'vitest'
import { validateNotes, orderNotes, saveDraft, deleteNote } from './noteModel.js'

const A = { id: '123e4567-e89b-42d3-a456-426614174000', title: ' Alpha ', body: '', updatedAt: '2026-09-17T08:00:00.000Z' }
const B = { id: '223e4567-e89b-42d3-a456-426614174000', title: 'Beta', body: 'body', updatedAt: '2026-09-17T08:00:00.000Z' }

describe('note model', () => {
  it('validates strict notes while preserving literal strings', () => expect(validateNotes([A])).toEqual({ ok: true, notes: [A] }))
  it.each([
    [{ ...A, title: '   ' }],
    [{ ...A, id: 'not-a-uuid' }],
    [{ ...A, updatedAt: '2026-09-17' }],
    [{ ...A, extra: true }],
    [A, { ...A }],
  ])('rejects an invalid collection', (...notes) => expect(validateNotes(notes)).toEqual({ ok: false, code: 'invalid' }))
  it('sorts newest first and breaks timestamp ties by id', () => expect(orderNotes([B, A]).map((note) => note.id)).toEqual([A.id, B.id]))
  it('immutably saves with a monotonic timestamp despite a backwards clock', () => {
    const result = saveDraft([A], { ...B, title: 'Beta' }, new Date('2020-01-01T00:00:00Z'))
    expect(result.ok).toBe(true)
    expect(result.notes[0].updatedAt).toBe('2026-09-17T08:00:00.001Z')
    expect(result.notes).not.toBe([A])
  })
  it('rejects blank titles and invalid clocks without changing input', () => {
    expect(saveDraft([A], { ...B, title: ' ' }, new Date())).toEqual({ ok: false, code: 'invalid-title' })
    expect(saveDraft([A], B, new Date('invalid'))).toEqual({ ok: false, code: 'invalid' })
  })
  it('deletes immutably without changing survivor timestamps', () => expect(deleteNote([A, B], A.id)).toEqual([B]))
})
