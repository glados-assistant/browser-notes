# Browser Notes — approved requirements

Status: user-approved scope, recorded by Technical Lead for task t_eea32927. Ilham authorized a NEW PRIVATE repository `glados-assistant/browser-notes`, but publication only after implementation, independent Technical Lead review and QA pass. No deployment or production merge is authorized. This is a new application, not the earlier documentation-only exercise.

## Scope

R1. Client-only React application, modern JavaScript (not TypeScript), semantic HTML/CSS and current stable tooling. Persistence is localStorage in the same browser/origin. No backend, accounts, analytics, API integrations or synchronization.

R2. Create, list, open, edit and delete plain-text notes with titles and bodies. Titles must contain non-whitespace characters; bodies may be empty. Save is explicit, never autosave. Show success only after successful localStorage write. Order most recently saved first, show last-updated timestamps and select the saved note.

R3. Saved titles, bodies and timestamps survive reload. Confirm deletion; warn before switching notes, creating a new note or deleting when edits are unsaved. Provide a best-effort unload warning. Failed persistence retains editor text and never claims success.

R4. Handle blocked storage, quota exhaustion, malformed JSON and unsupported stored-data versions with clear, non-destructive errors. Never automatically overwrite corrupt/unsupported stored data.

R5. Responsive mobile/desktop layout, useful empty state, labelled controls, visible focus and keyboard usability. Render titles and bodies literally, never as HTML.

R6. Document that localStorage is unencrypted, unsuitable for secrets, removed by clearing site data and subject to private-browsing persistence differences. Multi-tab concurrent editing is unsupported; document that limitation.

R7. README documents setup, scripts, storage and limitations. Requirements, design, implementation breakdown, QA test plan and QA results live under docs/. Clean lockfile install, lint, automated tests and production build must pass; QA must execute real browser tests and record evidence, commands and limitations.

R8. Independent Technical Lead review and QA must pass on the final source revision before private GitHub publication. Verify remote visibility and exact commit. Source fixes require renewed relevant review/testing. Publication is not permission to deploy or merge into production.

## Exclusions

No rich text, Markdown rendering, attachments, tags, search, export/import, cloud sync, authentication, collaboration, PWA, guaranteed offline application loading or hosting deployment.

## Acceptance criteria

A1. Create two distinct notes; reopen/edit either and delete one without altering the other. Cancelled deletion preserves data.
A2. Reload restores saved titles/bodies/timestamps. Blank-title rejection and empty-body support are verified.
A3. In-app navigation cannot silently discard dirty edits; failed persistence preserves edits.
A4. Denied/full/corrupt/unsupported storage cases are tested without destructive replacement or false success.
A5. HTML/script-like input displays literally and does not execute.
A6. QA verifies keyboard operation and representative mobile/desktop browser viewports.
A7. Clean lockfile installation, lint, automated tests and production build pass. Real browser QA includes commands, acceptance mappings, evidence and limitations; compilation alone is insufficient.
A8. README and all required docs are present.
A9. Independent review and QA pass for the final source revision; only that source is published to the approved private repository, with remote visibility and commit verified. Fixes renew relevant gates.

The technical design resolves implementation details without expanding this scope. Product changes require Head of Engineering escalation and approval.
