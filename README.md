# Browser Notes

Browser Notes is a client-only React application for plain-text notes. Notes stay in the current browser and origin. Saving is explicit; the application does not autosave, synchronize, or contact a backend.

## Requirements

- Node.js 24.21.0
- npm 11.19.0
- A current Chromium, Firefox, or WebKit/Safari browser

The exact Node version is recorded in `.nvmrc`, and all direct npm dependencies are pinned exactly.

## Setup

```sh
npm ci
npm run dev
```

Vite prints the loopback development URL. The app contains no remote assets or API calls.

## Scripts

- `npm run dev` — start the Vite development server
- `npm run build` — create the production bundle in `dist/`
- `npm run preview` — preview the production bundle
- `npm run lint` — run ESLint
- `npm test` — run Vitest unit and integration tests once
- `npm run test:watch` — run Vitest in watch mode
- `npm run test:e2e` — run Playwright against a production preview in Chromium, Firefox, and WebKit, serialized with the committed one-worker release-gate configuration

Install Playwright browsers before the first end-to-end run:

```sh
npx playwright install chromium firefox webkit
```

Browser system libraries may also be required. Follow Playwright's installation guidance for the operating system; do not silently narrow the configured browser projects.

## Use

1. Select **New note**.
2. Enter a nonblank title. The body may be empty.
3. Select **Save note**. Success appears only after browser storage accepts the write.
4. Select a saved note in the list to edit it. Saved notes are ordered by most recent save.
5. Select **Delete note** to remove the selected saved note after confirmation.

Browser Notes warns before in-app navigation would discard unsaved edits. Browsers may also show their own best-effort warning when closing or reloading a dirty page.

## Storage and privacy

Data is stored under the single localStorage key `browser-notes:notes` as a strict version-1 JSON envelope. The application validates the complete stored value before displaying or replacing it. Corrupt data, unsupported versions, stale concurrent values, denied storage, quota failures, and generic write failures are reported without claiming success.

Important limitations:

- localStorage is unencrypted. Do not store passwords, credentials, private keys, recovery codes, or other secrets.
- Notes are isolated by browser profile and origin. Clearing site data deletes them.
- Private-browsing persistence varies and may disappear when the private session closes.
- Concurrent editing in multiple tabs is unsupported. A best-effort token check prevents known stale writes, but localStorage is not transactional.
- The app has no accounts, backend, synchronization, import/export, or recovery service.
- Application loading is not guaranteed offline; there is no service worker.
- Browser unload prompts are controlled by the browser and may be suppressed.

## Design and verification

Approved requirements, technical design, implementation plan, and Engineer verification are under `docs/`. Playwright covers the built application on loopback preview; viewport emulation is not physical-device certification.

No deployment or public/private repository publication is performed by the application or its scripts.
