export default function NoteList({ notes, selectedId, blocked, onOpen, onNew }) {
  return (
    <section className="notes-panel" aria-labelledby="notes-heading">
      <div className="panel-heading">
        <h2 id="notes-heading">Notes</h2>
        <button type="button" onClick={onNew}>New note</button>
      </div>
      {blocked ? (
        <p className="blocked-state">Saved notes are unavailable while browser storage cannot be read.</p>
      ) : notes.length === 0 ? (
        <p className="empty-state">No saved notes yet. Create one, add a title, and select Save note.</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="note-list-item"
                aria-current={note.id === selectedId ? 'true' : undefined}
                onClick={() => onOpen(note.id)}
              >
                <span>{note.title}</span>
                <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleString()}</time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
