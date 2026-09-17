import { useEffect, useRef, useState } from 'react'
import NoteEditor from './components/NoteEditor.jsx'
import NoteList from './components/NoteList.jsx'
import StorageNotice from './components/StorageNotice.jsx'
import { deleteNote, orderNotes, saveDraft } from './lib/noteModel.js'
import { createNoteStorage } from './lib/noteStorage.js'

function browserNewId() {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') throw new Error('randomUUID unavailable')
  return globalThis.crypto.randomUUID()
}

function blankDraft(newId) {
  try {
    return { draft: { id: newId(), title: '', body: '' }, error: null }
  } catch {
    return { draft: { id: null, title: '', body: '' }, error: 'id-unavailable' }
  }
}

function draftFrom(note) {
  return { id: note.id, title: note.title, body: note.body }
}

function baselineFrom(draft) {
  return { title: draft.title, body: draft.body }
}

export default function App({ repository = createNoteStorage(), now = () => new Date(), newId = browserNewId }) {
  const [state, setState] = useState(() => {
    const loaded = repository.load()
    if (!loaded.ok) {
      const blank = blankDraft(newId)
      return {
        persistedNotes: [], storageToken: null, storageState: 'blocked', selectedId: null,
        draft: blank.draft, baseline: { title: '', body: '' }, operationError: loaded.code,
        status: '', focusRevision: 0,
      }
    }
    const notes = orderNotes(loaded.notes)
    if (notes.length) {
      const draft = draftFrom(notes[0])
      return {
        persistedNotes: notes, storageToken: loaded.token, storageState: 'ready', selectedId: notes[0].id,
        draft, baseline: baselineFrom(draft), operationError: null, status: '', focusRevision: 0,
      }
    }
    const blank = blankDraft(newId)
    return {
      persistedNotes: [], storageToken: loaded.token, storageState: 'ready', selectedId: null,
      draft: blank.draft, baseline: { title: '', body: '' }, operationError: blank.error,
      status: '', focusRevision: 0,
    }
  })
  const titleRef = useRef(null)
  const dirty = state.draft.title !== state.baseline.title || state.draft.body !== state.baseline.body

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (state.focusRevision > 0) titleRef.current?.focus()
  }, [state.focusRevision])

  function updateDraft(field, value) {
    setState((current) => ({
      ...current,
      draft: { ...current.draft, [field]: value },
      operationError: current.operationError === 'invalid-title' ? null : current.operationError,
      status: '',
    }))
  }

  function requestDiscard() {
    return !dirty || window.confirm('Discard unsaved changes?')
  }

  function openNote(id) {
    if (id === state.selectedId || !requestDiscard()) return
    const note = state.persistedNotes.find((candidate) => candidate.id === id)
    if (!note) return
    const draft = draftFrom(note)
    setState((current) => ({
      ...current, selectedId: id, draft, baseline: baselineFrom(draft),
      operationError: null, status: '', focusRevision: current.focusRevision + 1,
    }))
  }

  function startNew() {
    if (!requestDiscard()) return
    const blank = blankDraft(newId)
    setState((current) => ({
      ...current, selectedId: null, draft: blank.draft, baseline: { title: '', body: '' },
      operationError: blank.error, status: '', focusRevision: current.focusRevision + 1,
    }))
  }

  function save(event) {
    event.preventDefault()
    if (state.storageState !== 'ready') return
    if (!state.draft.id) {
      setState((current) => ({ ...current, operationError: 'id-unavailable', status: '' }))
      titleRef.current?.focus()
      return
    }
    const candidate = saveDraft(state.persistedNotes, state.draft, now())
    if (!candidate.ok) {
      setState((current) => ({ ...current, operationError: candidate.code, status: '' }))
      if (candidate.code === 'invalid-title') titleRef.current?.focus()
      return
    }
    const committed = repository.commit(candidate.notes, state.storageToken)
    if (!committed.ok) {
      setState((current) => ({ ...current, operationError: committed.code, status: '' }))
      return
    }
    const savedDraft = draftFrom(candidate.note)
    setState((current) => ({
      ...current, persistedNotes: candidate.notes, storageToken: committed.token,
      selectedId: candidate.note.id, draft: savedDraft, baseline: baselineFrom(savedDraft),
      operationError: null, status: 'Saved',
    }))
  }

  function removeSelected() {
    if (!state.selectedId || state.storageState !== 'ready') return
    if (!requestDiscard()) return
    const selected = state.persistedNotes.find((note) => note.id === state.selectedId)
    if (!selected || !window.confirm(`Delete “${selected.title}”?`)) return
    const candidate = deleteNote(state.persistedNotes, state.selectedId)
    const committed = repository.commit(candidate, state.storageToken)
    if (!committed.ok) {
      setState((current) => ({ ...current, operationError: committed.code, status: '' }))
      return
    }
    const next = candidate[0]
    const blank = next ? null : blankDraft(newId)
    const nextDraft = next ? draftFrom(next) : blank.draft
    setState((current) => ({
      ...current, persistedNotes: candidate, storageToken: committed.token,
      selectedId: next?.id ?? null, draft: nextDraft, baseline: baselineFrom(nextDraft),
      operationError: blank?.error ?? null, status: 'Deleted', focusRevision: current.focusRevision + 1,
    }))
  }

  return (
    <div className="app-shell">
      <header><h1>Browser Notes</h1><p>Plain-text notes saved only in this browser.</p></header>
      <StorageNotice error={state.operationError} status={state.status} />
      <main>
        <NoteList notes={state.persistedNotes} selectedId={state.selectedId} onOpen={openNote} onNew={startNew} />
        <NoteEditor
          ref={titleRef}
          draft={state.draft}
          selectedId={state.selectedId}
          dirty={dirty}
          blocked={state.storageState !== 'ready'}
          onChange={updateDraft}
          onSave={save}
          onDelete={removeSelected}
        />
      </main>
      <footer>Notes are unencrypted and are removed when this site’s browser data is cleared.</footer>
    </div>
  )
}
