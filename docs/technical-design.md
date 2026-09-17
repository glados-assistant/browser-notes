# Browser Notes — technical design

## Baseline and tooling

Inspected /workspace before design: only AGENTS.md and docs/implementation/shared-test.md existed; no application, package manifest, tests or Git repository. The shared-test marker is not proof that future workers share this filesystem. Task-specific document paths override the generic AGENTS.md examples. No existing application architecture needs migration.

Verified 2026-09-17 against authoritative npm publisher metadata (`https://registry.npmjs.org/<package>/latest`) and Node release metadata (`https://nodejs.org/dist/index.json`). Search indexes lagged these live metadata responses. Exact choices:

| Dependency | Version |
| --- | --- |
| node | 24.21.0 LTS (Krypton) |
| npm | 11.19.0 (bundled with that Node release) |
| react / react-dom | 19.3.0 / 19.3.0 |
| vite / @vitejs/plugin-react | 8.3.0 / 6.1.1 |
| vitest / jsdom | 5.0.1 / 30.1.0 |
| @playwright/test | 1.63.0 |
| eslint / @eslint/js | 10.10.0 / 10.0.1 |
| eslint-plugin-react-hooks / eslint-plugin-react-refresh | 7.1.1 / 0.5.7 |
| globals | 17.12.0 |
| @testing-library/react / user-event / jest-dom | 16.3.3 / 14.6.7 / 7.0.1 |

Vite's declared Node range is ^20.19.0 || >=22.12.0; Vitest 5 requires ^22.12.0 || ^24.0.0 || >=26.0.0; jsdom 30 requires ^22.22.2 || ^24.15.0 || >=26.0.0. Selected Node satisfies all. Current container Node 20.20.2/npm 10.8.2 does NOT satisfy the complete test stack. Provision the selected runtime before implementation verification. References: https://vite.dev/guide/, https://react.dev/versions, and the exact registry/release URLs above. Versions are observed stable latest tags, not invented future pins.

Use ESM JavaScript/JSX; no TypeScript, router, global state library, CSS framework, React compiler or backend. Include @testing-library/dom at a compatible 10.x exact version. Pin eslint to 10.10.0 and @eslint/js to 10.0.1: these are the current stable published versions, and @eslint/js 10.0.1 declares peer eslint ^10.0.0 while both packages declare Node ^20.19.0 || ^22.13.0 || >=24. The unequal patch versions are intentional because @eslint/js 10.10.0 is not published. The existing flat config remains valid: import @eslint/js and use js.configs.recommended; no lint-rule or config-shape change is required. The selected React lint helpers remain unchanged: eslint-plugin-react-hooks 7.1.1 accepts eslint ^10.0.0 and eslint-plugin-react-refresh 0.5.7 accepts eslint ^10. Check optional versus required plugin peers rather than installing every peer (no compiler/Babel extras unless genuinely required). Pin all direct dependencies exactly, commit package-lock.json lockfileVersion 3, .nvmrc=24.21.0 and packageManager=npm@11.19.0. Use npm ci thereafter; never regenerate lockfile in QA. Declare engines.node >=24.21.0 <25 and engines.npm >=11.19.0 <12. Runtime/tool changes require design amendment and renewed gates. Full installation remains an Engineer gate; registry compatibility is not an installation test.

## Files and boundaries

- index.html: language, title, viewport, root element; no remote assets.
- src/main.jsx: React mount and CSS import.
- src/App.jsx: application state and event transitions; ordinary hooks, no storage effects that write.
- src/components/NoteList.jsx: semantic list of buttons, selected-note indication, timestamps and empty state.
- src/components/NoteEditor.jsx: labelled title input/body textarea, Save and selected-note Delete buttons, validation.
- src/components/StorageNotice.jsx: inline errors/status; role=alert for failures, role=status for successful operations.
- src/styles.css: responsive stacked mobile / two-column desktop, wrapping text, visible focus, usable touch targets.
- src/lib/noteModel.js: pure schema validation, immutable upsert/delete and deterministic ordering.
- src/lib/noteStorage.js: sole localStorage access boundary, dependency-injectable Storage getter.
- src/lib/*.test.js, src/App.test.jsx, tests/e2e/notes.spec.js, tests/e2e/storage.spec.js, tests/e2e/accessibility.spec.js.
- vite.config.js, eslint.config.js, playwright.config.js, src/test/setup.js, package.json, package-lock.json, .nvmrc, .gitignore, README.md.

No network API or server schema. UI accepts dependencies for repository, now() and newId() in tests. Use native confirm for discard/deletion rather than implementing an inaccessible modal. Tests explicitly accept/dismiss dialogs.

## Storage contract

Single key: `browser-notes:notes`. Version is inside the value so future incompatible versions cannot be mistaken for missing data at a different key.

```json
{"version":1,"notes":[{"id":"UUID-v4","title":"Example","body":"","updatedAt":"2026-09-17T08:00:00.000Z"}]}
```

IDs: crypto.randomUUID(), generated once per new draft and kept after failed saves; existing IDs immutable. Support current secure-context browsers and localhost; detect unavailable crypto without crashing, report inability to create rather than weak fallback IDs. Title validation uses trim().length > 0 but preserves the original title string. Body must be string, including empty string. No artificial size cap; quota errors are handled.

Validate the whole envelope before exposing any notes: plain object, version exactly integer 1, notes array; each note is a plain object with exactly id/title/body/updatedAt, unique canonical UUID v4, nonblank title string, body string and valid UTC ISO timestamp whose Date round-trip equals the original. Envelope has exactly version/notes. Reject structural violations, duplicate IDs or unknown fields as invalid data, never silently drop notes. Unknown version is unsupported, not an empty collection. null JSON, empty raw string and invalid timestamps are corrupt/invalid. Missing key alone means an empty valid collection. No migration/reset/repair button in v1.

Sort updatedAt descending; tie-break ascending id. New saves use ISO time from max(now milliseconds, latest saved timestamp + 1ms), guaranteeing the just-saved note is first even for same-tick saves or a backwards local clock. Time is local-device based, not authoritative; validate finite date range and report errors without writes. Display <time dateTime=...> with locale formatting; storage retains the exact ISO timestamp. Delete does not change timestamps of survivors.

Repository API (synchronous, discriminated results):

- createNoteStorage(getStorage = () => window.localStorage).
- load(): {ok:true, notes, token}, or {ok:false, code}. token is the exact raw string, or null when missing.
- commit(notes, expectedToken): {ok:true, token}, or {ok:false, code}.
- codes: unavailable, quota, corrupt, unsupported, conflict, invalid, write-failed.

Catch access to window.localStorage itself, getItem, JSON parse/serialization and setItem. Never probe by setting/removing data at startup. commit validates the outgoing model, reads and validates current storage, and compares exact current raw value to expectedToken before writing. Invalid/unsupported/currently unreadable storage blocks commit without any write. Changed token returns conflict; retain draft, do not merge or retry blindly. This is a best-effort stale-data guard, not a transactional multi-tab promise: races between getItem and setItem remain; simultaneous editing is unsupported. Success means setItem returned normally. QuotaExceededError => quota; SecurityError => unavailable; otherwise generic operation error without including raw note text. Do not clear storage or fall back to volatile saves labelled successful.

## State and transitions

App state: persistedNotes; storageToken; storageState (loading, ready, blocked); selectedId (saved ID or null); draft {id,title,body}; baseline {title,body}; operationError and status. Dirty is exact draft title/body inequality against baseline; draft ID alone is not dirty. Errors/status are never the source of truth. Initial successful load selects the first ordered note, or a blank new draft if empty. Initial load failure shows a blocking notice and no fictional empty collection; blank drafting is allowed, persistence/deletion disabled, text preserved.

Save: validate title, build immutable candidate using saved collection and draft, call commit once. Only on success replace persistedNotes/token/baseline/selection and announce Saved. On any failure retain original selection, collection and all editor text, clear stale success, show error and remain dirty as applicable. Save is disabled for a clean existing note; new blank draft is allowed to submit for title validation. No write in render/useEffect, including StrictMode initialization. Storage write exceptions remain retryable from Save; corrupt/unsupported/conflict errors block mutation until safe reload. No automatic reload that loses a draft. Read errors at boot require user reload after resolving storage access; browser unload warning still applies to dirty draft.

Open another note or New: if dirty, ask 'Discard unsaved changes?'; cancellation changes nothing. Confirmation replaces draft/baseline/selection, clears stale validation/status and focuses title. Clicking the current note is a no-op. New draft alone is never persisted.

Delete only the selected SAVED note. If dirty, first ask discard confirmation; cancellation changes nothing. Then ask final deletion confirmation with note title; cancellation of either dialog retains even dirty text. Do not clear draft at the first confirmation: only a successful commit permits state replacement. On failed delete retain note, selection and draft. Successful delete chooses first remaining ordered note, or blank new draft, updates baseline/token and announces deletion. No global or list-level delete control to complicate dirty semantics.

beforeunload listener exists only while dirty; preventDefault plus returnValue for best-effort browser warning. Browsers control prompt text and may suppress it. Refresh is not guaranteed recovery; do not claim autosave. In-app navigation always uses deterministic confirmation.

## UX, security and operational concerns

Use form labels, native buttons, header/main/section structure, logical tab order, visible focus and descriptive selected status (aria-current). Put focus on title after New/Open/delete selection change, and on title after validation error; Save retains useful focus. Storage failure announcement must not steal typing focus. Layout must work at 375x812 and 1440x900 and 200% zoom; no horizontal scrolling from long titles. Empty state explains creating and explicitly saving a note. No dangerouslySetInnerHTML, eval or Markdown library; React text nodes and textarea values render user input literally. Never log titles, bodies or raw storage to console/telemetry. Generic local errors and accessible status are the only observability needed.

localStorage is synchronous and quota-limited; serialize the collection once per explicit mutation, not keystroke. No arbitrary performance guarantee or pagination. Document origin/browser isolation, unencrypted content, site-data clearing, private browsing, unsupported concurrent tabs and no guaranteed offline app loading. No service worker. Browser target is current stable Chrome/Chromium, Firefox and Safari/WebKit; Playwright engine coverage and viewport emulation are not physical-device certification.

## Test design

Vitest + jsdom + Testing Library cover model/schema, ordering, state transitions and injected throwing storage. Playwright tests run built app via loopback preview in Chromium, Firefox and WebKit. Inject failures with addInitScript before navigation by replacing storage getter/methods; keep tests isolated by browser context and seed raw values explicitly. Verify original raw bytes unchanged for corrupt/unsupported failures and unchanged unrelated keys, no write on load/cancel/invalid title, no false success and draft retention on save AND delete failures. Test same-tick saves, backwards clocks, duplicate IDs, invalid shapes, conflicts and both stages of dirty-delete cancellation.

Literal-content tests use script tags, img/onerror and HTML-looking titles/bodies: assert exact text and absence of execution, reopen and reload. Browser QA includes native dialog cancellation, reload persistence, keyboard-only CRUD, focus/error announcements, long notes, empty state, viewport screenshots and 200% zoom. Test best-effort unload where browser allows user activation, recording limitations rather than claiming universal coverage.

No migration or deployment. Review/test a fixed source revision before publication. Exact phase dependencies and evidence requirements are in implementation/plan.md.
