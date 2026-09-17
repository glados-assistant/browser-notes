const ERROR_MESSAGES = {
  unavailable: 'Browser storage is unavailable. Your text is kept here, but it cannot be saved.',
  quota: 'Browser storage is full. Your note was not saved.',
  corrupt: 'Stored notes are invalid or corrupted. They were not changed.',
  unsupported: 'Stored notes use an unsupported version. They were not changed.',
  conflict: 'Stored notes changed in another tab. Your draft was kept; reload only after copying it somewhere safe.',
  invalid: 'The note data is invalid and was not written.',
  'invalid-title': 'Enter a title containing at least one non-whitespace character.',
  'write-failed': 'Browser storage could not be written. Your changes were kept in the editor.',
  'id-unavailable': 'A secure note identifier could not be created in this browser.',
}

export default function StorageNotice({ error, status }) {
  return (
    <div className="notice-area" aria-live="polite">
      {error ? <p className="notice error" role="alert">{ERROR_MESSAGES[error] ?? 'The operation could not be completed.'}</p> : null}
      {status ? <p className="notice success" role="status">{status}</p> : null}
    </div>
  )
}
