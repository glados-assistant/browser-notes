const NOTE_FIELDS = ['body', 'id', 'title', 'updatedAt']
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isCanonicalUtcTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const milliseconds = Date.parse(value)
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value
}

function isValidNote(note) {
  if (!isPlainObject(note) || Object.keys(note).sort().join() !== NOTE_FIELDS.join()) return false
  return UUID_V4.test(note.id)
    && typeof note.title === 'string'
    && note.title.trim().length > 0
    && typeof note.body === 'string'
    && isCanonicalUtcTimestamp(note.updatedAt)
}

export function validateNotes(notes) {
  if (!Array.isArray(notes)) return { ok: false, code: 'invalid' }
  const ids = new Set()
  for (const note of notes) {
    if (!isValidNote(note) || ids.has(note.id)) return { ok: false, code: 'invalid' }
    ids.add(note.id)
  }
  return { ok: true, notes }
}

export function orderNotes(notes) {
  return [...notes].sort((left, right) => {
    const timestampOrder = right.updatedAt.localeCompare(left.updatedAt)
    return timestampOrder || left.id.localeCompare(right.id)
  })
}

export function saveDraft(notes, draft, now = new Date()) {
  if (validateNotes(notes).ok === false) return { ok: false, code: 'invalid' }
  if (!isPlainObject(draft)
      || !UUID_V4.test(draft.id)
      || typeof draft.title !== 'string'
      || typeof draft.body !== 'string') return { ok: false, code: 'invalid' }
  if (draft.title.trim().length === 0) return { ok: false, code: 'invalid-title' }

  const nowMilliseconds = now instanceof Date ? now.getTime() : Number.NaN
  if (!Number.isFinite(nowMilliseconds)) return { ok: false, code: 'invalid' }
  const latestMilliseconds = notes.reduce(
    (latest, note) => Math.max(latest, Date.parse(note.updatedAt)),
    Number.NEGATIVE_INFINITY,
  )
  const timestampMilliseconds = Math.max(nowMilliseconds, latestMilliseconds + 1)
  let updatedAt
  try {
    updatedAt = new Date(timestampMilliseconds).toISOString()
  } catch {
    return { ok: false, code: 'invalid' }
  }

  const savedNote = { id: draft.id, title: draft.title, body: draft.body, updatedAt }
  const notesWithoutDraft = notes.filter((note) => note.id !== draft.id)
  return { ok: true, notes: orderNotes([savedNote, ...notesWithoutDraft]), note: savedNote }
}

export function deleteNote(notes, id) {
  return notes.filter((note) => note.id !== id)
}
