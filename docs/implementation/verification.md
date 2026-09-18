# Engineer verification

Initial implementation verified at 2026-09-17T09:32:50Z and R1-01 rework reverified at 2026-09-17T19:16:23Z in the assigned Debian 13 container. QA-01 through QA-04 corrections were verified on 2026-09-18 with the approved runtime and all three browser engines.

## QA-01 through QA-04 correction candidate

- Prior reviewed candidate: `c401086e640e3e659e2f5eb971a98c670e2822d1` / tree `0100eda732a77d7fbd3ca45a12c17f811c5c2d45`
- Tested correction source commit: `5eb34d0600fd7f1687a7c1b32dea52752137ad5b` / tree `94e79cdf177d8e617101b1d72fbdf57902881d1d`
- Runtime: Node `v24.21.0`, npm `11.19.0`; the official Linux x64 archive matched SHA-256 `fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6`.
- Scope: removed the zoom-amplified body minimum width; deliberately focused Title after successful Save; separated blocked-startup list rendering from mutation-blocked retained in-memory lists; committed Playwright `workers: 1` without removing, skipping, retrying, or narrowing any browser project/test.

### TDD evidence

| Cycle | RED | GREEN |
| --- | --- | --- |
| Successful Save focus | Focus regression failed: Title expected, disabled Save button focused. | Focus regression passed after successful saves incremented the existing focus revision. |
| Conflict Delete visible state | Regression failed because the selected `Second` list button was absent and the blocked-startup message replaced the list. | Conflict Delete plus denied/corrupt/unsupported startup regressions passed (4 tests). |
| 375x812 at 200% CSS zoom | Chromium production-browser regression measured `scrollWidth=640`, `clientWidth=375`. | Same regression passed after removing `body`'s `min-width: 320px`. |
| Exact default E2E configuration | Config regression failed with `workers` undefined instead of `1`. | Config regression passed with all project names still exactly Chromium, Firefox, and WebKit. |

### Correction verification commands and outcomes

| Command | Exit | Outcome |
| --- | ---: | --- |
| selected `node --version`; `npm --version` | 0 | `v24.21.0`; `11.19.0` |
| clean `npm ci` with writable external cache | 0 | 219 packages installed; 220 audited; 0 vulnerabilities |
| `npm run lint` | 0 | No ESLint findings |
| `npm test` | 0 | 4 files; 37/37 tests passed |
| `npm run build` | 0 | Vite 8.3.0; 21 modules transformed |
| targeted Chromium matrix: keyboard Save focus, failed-Save focus, conflict Delete, and 375x812/200% long-content reflow | 0 | 4/4 passed against production preview |
| exact `npm run test:e2e` | 0 | 39/39 passed with committed one-worker default: Chromium 13, Firefox 13, WebKit 13; 3.5 minutes |
| `git diff --check` before correction commit | 0 | No whitespace errors |

The exact default browser command covered normal 375x812 and 1440x900 long-content conditions plus 375x812 at 200% CSS zoom in every project. It also covered successful Save focus, failed-Save focus retention, conflict Delete visible list/selection/draft/external-byte retention, and denied/corrupt/unsupported startup regressions. Viewports remain emulated rather than physical-device or real Safari certification. Browser-controlled beforeunload prompts and non-transactional multi-tab races retain the previously documented limitations. No QA report or evidence was edited, and no publication or deployment was performed.

## Candidate under test

- Tested R1-01 source commit: `38f55f82525497b9908351083c1018f6aa4c4e04`
- Tested R1-01 source tree: `3c789c15931b23bc99ae3d71fd95d240619409d7`
- Runtime: Node `v24.21.0`, npm `11.19.0`
- Lockfile: npm lockfileVersion 3
- Direct dependency resolution: all exact pins in `package.json`; `npm ls --depth=0` resolved one copy of each direct package, including `eslint@10.10.0` with `@eslint/js@10.0.1`

This report is the only file changed after the tested R1-01 source commit. The final handoff records the containing documentation commit and its tree.

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
| GREEN: `npm test` after UI implementation | 0 | 29 unit/integration tests passed before independent review; review-driven blocking-state regressions increased the final count to 33. |
| `./node_modules/.bin/playwright install chromium firefox webkit` | 0 | Chromium 153, Firefox 155, and WebKit 26.6 bundles downloaded. Playwright reported missing host libraries. |
| R1-01 RED: `npm test -- src/App.test.jsx -t "renders blocked"` | 1 expected | All three denied/corrupt/unsupported cases failed because ordinary `No saved notes yet` wording was still present. |
| R1-01 GREEN: `npm test -- src/App.test.jsx -t "renders blocked"` | 0 | All 3 blocked-startup regression cases passed. |
| final clean `npm ci` | 0 | 219 packages installed from lockfile; 0 reported vulnerabilities. |
| final `npm run lint` | 0 | No ESLint findings. |
| final `npm test` | 0 | 3 files, 35 tests passed. |
| final `npm run build` | 0 | Vite 8.3.0 production build passed; 21 modules transformed. |
| `npm run test:e2e -- --project=chromium` with `PLAYWRIGHT_BROWSERS_PATH=/workspace/browser-notes-playwright` | 0 | 12/12 Chromium tests passed against the production Vite preview, including denied/corrupt/unsupported blocked-startup regressions. |
| `npm run test:e2e -- --project=firefox` with the same browser path | 1 | 12/12 cases could not start because required host libraries were unavailable; no Firefox application pass is claimed. |
| `npm run test:e2e -- --project=webkit` with the same browser path | 1 | 12/12 cases could not start because required host libraries were unavailable; no WebKit application pass is claimed. |
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
- Denied, corrupt and unsupported startup render a distinct unavailable-list state rather than the ordinary empty-collection message; title/body drafting remains enabled, mutation controls remain disabled, and stored bytes remain unchanged.

## Limitations and environment evidence

The container runs as uid 1001 and cannot install host packages globally. Browser bundles were downloaded to `/workspace/browser-notes-playwright`. Debian packages were downloaded and extracted without root to `/workspace/browser-notes-sysroot`, and browser binaries were given local runtime search paths so Chromium could be exercised. Those environment-only directories are outside the repository and are not part of the handoff.

The R1-01 rework attempts used the downloaded Playwright browsers without modifying host library loading. Firefox reported missing X11/GTK/audio/DBus libraries and WebKit reported missing GTK4/GStreamer/graphics/media libraries, so each 12-test project exited nonzero before application execution. No Firefox/WebKit application behavior is claimed by the Engineer. Independent review/QA must run those projects in a browser-capable environment before cross-browser acceptance. Earlier implementation attempts with locally extracted libraries also remained environment-blocked as recorded in the prior candidate history.

Viewport tests are emulation, not physical-device or real Safari certification. Multi-tab simultaneous writes remain unsupported by design; only exact-token conflict detection is tested. localStorage remains synchronous, quota-limited, origin-specific, and unencrypted.

## Deviations

The approved Tech Lead amendment is implemented exactly: `eslint@10.10.0` and `@eslint/js@10.0.1`. No product or architecture deviation was made. The only verification limitation is the container-level Firefox/WebKit startup failure described above; tests and projects remain enabled and were not narrowed or skipped in configuration.
