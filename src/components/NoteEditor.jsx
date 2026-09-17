import { forwardRef } from 'react'

const NoteEditor = forwardRef(function NoteEditor(
  { draft, selectedId, dirty, blocked, onChange, onSave, onDelete },
  titleRef,
) {
  return (
    <section className="editor-panel" aria-labelledby="editor-heading">
      <h2 id="editor-heading">{selectedId ? 'Edit note' : 'New note'}</h2>
      <form onSubmit={onSave}>
        <label htmlFor="note-title">Title</label>
        <input
          ref={titleRef}
          id="note-title"
          name="title"
          value={draft.title}
          onChange={(event) => onChange('title', event.target.value)}
          autoComplete="off"
        />
        <label htmlFor="note-body">Body</label>
        <textarea
          id="note-body"
          name="body"
          rows="14"
          value={draft.body}
          onChange={(event) => onChange('body', event.target.value)}
        />
        <div className="editor-actions">
          <button type="submit" disabled={blocked || (selectedId !== null && !dirty)}>Save note</button>
          <button type="button" className="danger" disabled={blocked || selectedId === null} onClick={onDelete}>Delete note</button>
        </div>
      </form>
    </section>
  )
})

export default NoteEditor
