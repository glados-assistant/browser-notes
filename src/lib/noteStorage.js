import { validateNotes } from './noteModel.js'

export const STORAGE_KEY = 'browser-notes:notes'
const ENVELOPE_FIELDS = ['notes', 'version']

function errorCode(error) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'quota'
  if (error instanceof DOMException && error.name === 'SecurityError') return 'unavailable'
  return 'write-failed'
}

function decode(raw) {
  if (raw === null) return { ok: true, notes: [], token: null }
  let envelope
  try {
    envelope = JSON.parse(raw)
  } catch {
    return { ok: false, code: 'corrupt' }
  }
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) return { ok: false, code: 'corrupt' }
  if (envelope.version !== 1) return Number.isInteger(envelope.version)
    ? { ok: false, code: 'unsupported' }
    : { ok: false, code: 'corrupt' }
  if (Object.keys(envelope).sort().join() !== ENVELOPE_FIELDS.join()) return { ok: false, code: 'corrupt' }
  const validation = validateNotes(envelope.notes)
  if (!validation.ok) return { ok: false, code: 'corrupt' }
  return { ok: true, notes: validation.notes, token: raw }
}

export function createNoteStorage(getStorage = () => window.localStorage) {
  function readCurrent() {
    let storage
    try {
      storage = getStorage()
      const raw = storage.getItem(STORAGE_KEY)
      return { storage, raw, decoded: decode(raw) }
    } catch (error) {
      return { error: errorCode(error) }
    }
  }

  return {
    load() {
      const current = readCurrent()
      return current.error ? { ok: false, code: current.error } : current.decoded
    },

    commit(notes, expectedToken) {
      const validation = validateNotes(notes)
      if (!validation.ok) return { ok: false, code: 'invalid' }

      let serialized
      try {
        serialized = JSON.stringify({ version: 1, notes })
      } catch {
        return { ok: false, code: 'invalid' }
      }

      const current = readCurrent()
      if (current.error) return { ok: false, code: current.error }
      if (!current.decoded.ok) return current.decoded
      if (current.raw !== expectedToken) return { ok: false, code: 'conflict' }

      try {
        current.storage.setItem(STORAGE_KEY, serialized)
      } catch (error) {
        return { ok: false, code: errorCode(error) }
      }
      return { ok: true, token: serialized }
    },
  }
}
