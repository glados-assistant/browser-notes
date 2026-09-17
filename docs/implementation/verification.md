# Engineer verification

Verified at 2026-09-17T09:32:50Z in the assigned Debian 13 container.

## Candidate under test

- Tested source commit: `d4024d2846d3a0ac86d89fccfa7dc4be585c8ced`
- Tested source tree: `677decb1722dd85c621b31947e92c515a34ae91f`
- Runtime: Node `v24.21.0`, npm `11.19.0`
- Lockfile: npm lockfileVersion 3
- Direct dependency resolution: all exact pins in `package.json`; `npm ls --depth=0` resolved one copy of each direct package, including `eslint@10.10.0` with `@eslint/js@10.0.1`

This report is the only file added after the tested source commit. The final handoff records the containing documentation commit and its tree.

## Commands and outcomes

| Command | Exit | Outcome |
| --- | ---: | --- |
| `sha256sum /workspace/browser-notes-plan.zip` | 0 | `80ee8cc99c7c25621d32a696313023da95cc6a409209efcaa96fad42de0ba851`; matches the amended Tech Lead handoff. |
| `unzip -Z1 /workspace/browser-notes-plan.zip` plus relative-path inspection | 0 | Four expected relative entries; no absolute, drive-prefixed, or `..` path. |
| selected `node --version` / `npm --version` | 0 | `v24.21.0` / `11.19.0`. |
| `npm install --ignore-scripts` | 0 | Lockfile created; 219 packages installed; 0 reported vulnerabilities. |
| RED: `npm test` before model/storage implementation | 1 expected | Both suites failed because `noteModel.js` and `noteStorage.js` did not exist. |
| GREEN: `npm test` after model/storage implementation | 0 | 21 model/storage tests passed. |
| RED: `npx vitest run src/App.test.jsx` before UI implementation | 1 expected | Failed because `App.jsx` did not exist. |
| GREEN: `npm test` after UI implementation | 0 | 29 unit/integration tests passed. |
| `./node_modules/.bin/playwright install chromium firefox webkit` | 0 | Chromium 153, Firefox 155, and WebKit 26.6 bundles downloaded. Playwright reported missing host libraries. |
| final clean `npm ci` | 0 | 219 packages installed from lockfile; 0 reported vulnerabilities. |
| final `npm run lint` | 0 | No ESLint findings. |
| final `npm test` | 0 | 3 files, 29 tests passed. |
| final `npm run build` | 0 | Vite 8.3.0 production build passed; 21 modules transformed. |
| `npm run test:e2e -- --project=chromium` with the local Playwright browser path and locally extracted Debian libraries | 0 | 11/11 Chromium tests passed against Vite preview. |
| full `npm run test:e2e` with all three configured projects | 1 | 11 Chromium tests passed; 11 Firefox and 11 WebKit tests could not start in this container. Firefox reported user-namespace `EPERM` and profile startup failure. WebKit launched but closed before opening a page. |
| `git diff --check` before the source commit | 0 | No whitespace errors. |

No line/branch coverage percentage is claimed because the approved dependency set does not include a Vitest coverage provider. Behavioral coverage is recorded below.

## Behavioral coverage

- Strict version-1 envelope, exact fields, canonical UUID-v4 IDs, unique IDs, nonblank titles, string bodies, and canonical UTC timestamps.
- Missing, blocked, malformed, corrupt, unsupported, duplicate-ID, conflict, quota, and generic write paths.
- No startup write, exact-token stale-write guard, namespaced single-key commits, raw-byte retention on prohibited writes, and unrelated-key retention in browser tests.
- Immutable save/delete, most-recent ordering, deterministic ID tie break, same-tick/backwards-clock monotonic timestamp behavior, invalid clocks, and empty bodies.
- Explicit Save; blank-title validation and focus; dirty Open/New confirmation; both dirty Delete cancellation points; failed Save/Delete draft, selection, and collection retention; successful delete selection.
- Conditional `beforeunload` registration in jsdom. Browser-controlled prompt wording/suppression is not claimed.
- Reload persistence, two-note isolation, literal HTML/script-like content, absence of execution, keyboard-only creation, selected state, mobile/desktop viewports, long unbroken titles, and 200% CSS zoom in real Chromium.
- StrictMode initialization performs no storage write.

## Limitations and environment evidence

The container runs as uid 1001 and cannot install host packages globally. Browser bundles were downloaded to `/workspace/browser-notes-playwright`. Debian packages were downloaded and extracted without root to `/workspace/browser-notes-sysroot`, and browser binaries were given local runtime search paths so Chromium could be exercised. Those environment-only directories are outside the repository and are not part of the handoff.

Firefox remained blocked by the container's disabled user namespaces (`CanCreateUserNamespace() clone() failure: EPERM`) and then could not initialize its temporary profile. Disabling Firefox content/GMP/RDD sandbox environment switches did not resolve it. WebKit resolved its libraries after the local extraction but its WPE process closed before `browserContext.newPage`. The full run therefore correctly exits nonzero: 11 passed, 22 environment-startup failures. No Firefox/WebKit application behavior is claimed by the Engineer. Independent review/QA must run those projects in a browser-capable environment before cross-browser acceptance.

Viewport tests are emulation, not physical-device or real Safari certification. Multi-tab simultaneous writes remain unsupported by design; only exact-token conflict detection is tested. localStorage remains synchronous, quota-limited, origin-specific, and unencrypted.

## Deviations

The approved Tech Lead amendment is implemented exactly: `eslint@10.10.0` and `@eslint/js@10.0.1`. No product or architecture deviation was made. The only verification limitation is the container-level Firefox/WebKit startup failure described above; tests and projects remain enabled and were not narrowed or skipped in configuration.
