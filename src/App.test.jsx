import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { createNoteStorage, STORAGE_KEY } from './lib/noteStorage.js'

const FIRST_ID = '123e4567-e89b-42d3-a456-426614174000'
const SECOND_ID = '223e4567-e89b-42d3-a456-426614174000'
const FIRST = { id: FIRST_ID, title: 'First', body: 'one', updatedAt: '2026-09-17T08:00:00.000Z' }
const SECOND = { id: SECOND_ID, title: 'Second', body: 'two', updatedAt: '2026-09-17T09:00:00.000Z' }

function memoryStorage(notes = []) {
  let value = notes.length ? JSON.stringify({ version: 1, notes }) : null
  return {
    getItem: vi.fn((key) => key === STORAGE_KEY ? value : null),
    setItem: vi.fn((key, next) => { if (key === STORAGE_KEY) value = next }),
    get value() { return value },
  }
}

function renderApp({ notes = [], repository, ids = [FIRST_ID, SECOND_ID], times = ['2026-09-17T10:00:00.000Z'] } = {}) {
  const storage = memoryStorage(notes)
  const resolvedRepository = repository ?? createNoteStorage(() => storage)
  let idIndex = 0
  let timeIndex = 0
  render(
    <App
      repository={resolvedRepository}
      newId={() => ids[Math.min(idIndex++, ids.length - 1)]}
      now={() => new Date(times[Math.min(timeIndex++, times.length - 1)])}
    />,
  )
  return { storage, repository: resolvedRepository }
}

function editor() {
  return {
    title: screen.getByRole('textbox', { name: 'Title' }),
    body: screen.getByRole('textbox', { name: 'Body' }),
    save: screen.getByRole('button', { name: 'Save note' }),
  }
}

describe('Browser Notes application', () => {
  it('renders an accessible empty scaffold without a startup write', () => {
    const { storage } = renderApp()
    expect(screen.getByRole('heading', { name: 'Browser Notes' })).toBeInTheDocument()
    expect(screen.getByText(/no saved notes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
    expect(editor().save).toBeEnabled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('rejects a blank title, focuses it, and saves an empty body only after commit', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp()
    await user.click(editor().save)
    expect(screen.getByRole('alert')).toHaveTextContent(/title/i)
    expect(editor().title).toHaveFocus()
    expect(storage.setItem).not.toHaveBeenCalled()

    await user.type(editor().title, '  Literal <script>alert(1)</script>  ')
    await user.click(editor().save)
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(JSON.parse(storage.value).notes[0]).toMatchObject({ title: '  Literal <script>alert(1)</script>  ', body: '' })
    expect(screen.getByRole('button', { name: /Literal <script>alert\(1\)<\/script>/ })).toBeInTheDocument()
  })

  it('keeps exact draft text and clears stale success when a save fails', async () => {
    const user = userEvent.setup()
    const repository = {
      load: () => ({ ok: true, notes: [FIRST], token: 'before' }),
      commit: vi.fn(() => ({ ok: false, code: 'quota' })),
    }
    renderApp({ repository })
    await user.type(editor().body, ' unsaved')
    await user.click(editor().save)
    expect(screen.getByRole('alert')).toHaveTextContent(/storage.*full/i)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(editor().body).toHaveValue('one unsaved')
    expect(screen.getByRole('button', { name: /^First/ })).toHaveAttribute('aria-current', 'true')
  })

  it('does not switch notes or create a new draft when dirty discard is cancelled', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderApp({ notes: [SECOND, FIRST] })
    await user.type(editor().body, ' dirty')
    await user.click(screen.getByRole('button', { name: /^First/ }))
    expect(editor().title).toHaveValue('Second')
    await user.click(screen.getByRole('button', { name: 'New note' }))
    expect(editor().title).toHaveValue('Second')
    expect(confirm).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })

  it('preserves dirty state through both delete cancellations and a failed delete', async () => {
    const user = userEvent.setup()
    const repository = {
      load: () => ({ ok: true, notes: [SECOND, FIRST], token: 'before' }),
      commit: vi.fn(() => ({ ok: false, code: 'write-failed' })),
    }
    const confirm = vi.spyOn(window, 'confirm')
    renderApp({ repository })
    await user.type(editor().body, ' dirty')

    confirm.mockReturnValueOnce(false)
    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(repository.commit).not.toHaveBeenCalled()
    expect(editor().body).toHaveValue('two dirty')

    confirm.mockReturnValueOnce(true).mockReturnValueOnce(false)
    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(repository.commit).not.toHaveBeenCalled()
    expect(editor().body).toHaveValue('two dirty')

    confirm.mockReturnValueOnce(true).mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(repository.commit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be written/i)
    expect(editor().body).toHaveValue('two dirty')
    expect(screen.getByRole('button', { name: /^Second/ })).toHaveAttribute('aria-current', 'true')
    confirm.mockRestore()
  })

  it('blocks persistence after a load error while preserving typed text', async () => {
    const user = userEvent.setup()
    const repository = { load: () => ({ ok: false, code: 'corrupt' }), commit: vi.fn() }
    renderApp({ repository })
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid or corrupted/i)
    expect(editor().save).toBeDisabled()
    await user.type(editor().body, 'still editable')
    expect(editor().body).toHaveValue('still editable')
    expect(repository.commit).not.toHaveBeenCalled()
  })

  it('installs a beforeunload guard only for a dirty draft', async () => {
    const user = userEvent.setup()
    renderApp({ notes: [FIRST] })
    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)
    await user.type(editor().body, ' dirty')
    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })

  it('does not write during StrictMode initialization', () => {
    const storage = memoryStorage([FIRST])
    const repository = createNoteStorage(() => storage)
    render(<StrictMode><App repository={repository} newId={() => SECOND_ID} now={() => new Date()} /></StrictMode>)
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(within(screen.getByRole('main')).getByDisplayValue('First')).toBeInTheDocument()
  })
})
