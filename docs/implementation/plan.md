# Browser Notes — implementation and gated handoff plan

Planning only: no application code, repository publication or deployment in this task. Head of Engineering inspects this plan and creates downstream cards; no cards were created here. Roles below are responsibilities, not claims about installed profile names.

## Preflight and dispatch gate P0 (Head of Engineering)

Observed: HERMES_KANBAN_WORKSPACE and HERMES_HOME unset inside Docker; initial /workspace contains AGENTS.md and a shared-test marker, not a source repository. Host task/profile directories do not exist inside this container. gh and hermes are absent from PATH; git, Node 20.20.2 and npm 10.8.2 exist. Therefore gh auth status/account, private target existence/access and installed profiles cannot be verified here. This does NOT invalidate the user's host login. AGENTS.md names engineer/qa/techlead/hoe, but installed profiles must still be verified through `hermes profile list` in an accessible operator context before assignment. No guessing or secret requests in chat.

Provision Node 24.21.0/npm 11.19.0 and writable npm cache before builds. Initial npm view failed at root-owned /.npm; registry HTTP metadata was fetched successfully with Python instead. Do not chown unrelated host/profile directories. This container's command classifier also rejected npm view as long-lived; report tooling errors distinctly from dependency failures.

Mandatory transport acceptance before implementation dispatch: retrieve the attached documentation archive or shared source workspace from the actual downstream execution environment, verify the manifest/hashes, extract only expected relative paths, and record evidence. Host attachment paths alone are not a handoff. The planner provides a ZIP archive with the actual Markdown files and a SHA-256 manifest, at /workspace/browser-notes-plan.zip and as a durable task attachment. Test independent worker retrieval of that archive through /workspace; if inaccessible, the operator must transfer attachment bytes or mount a shared workspace. A same-container round-trip alone is insufficient evidence of worker accessibility. If the target environment still cannot retrieve it, block dispatch and arrange a shared mount or operator-mediated archive transfer. Do not create a public scratch repository or upload to a third-party paste service.

Engineer must initialize a dedicated Browser Notes Git repository after P0, not publish the software-factory workspace or unrelated AGENTS.md/shared-test files. Store source plus docs in a portable full Git bundle for every phase when there is no proven shared working copy. Recipient runs git bundle verify, clones the bundle into a fresh directory and checks `git rev-parse HEAD` against handoff SHA before work. Sender supplies SHA-256 of bundle and exact source commit. Transport via an accessible shared mount or attachment bytes. The operator must provide a tested retrieval bridge if attachment bytes cannot be read. Every phase records recipient retrieval/commit verification before claiming readiness.

Publication authentication is not a reason to stop planning/implementation after source transport is proven, but remains a hard publication prerequisite: authorized environment with gh and the user's existing login, `gh auth status` (no token output), `gh api user --jq .login`, and `gh repo view glados-assistant/browser-notes --json nameWithOwner,visibility,isPrivate,url`. A not-found response may mean missing permission, not necessarily absent repository. Escalate ambiguity; never expose tokens. If target already contains history/content, obtain HoE decision before pushing; never overwrite unrelated work.

## Dependency graph and implementation cards

P0 -> E1 -> E2 -> E3 -> E4 -> R1 -> Q2 -> P1.
Q1 depends on P0 and approved docs, can run alongside E1-E4; Q2 depends on Q1 AND R1. Failed R1/Q2 returns to Engineer; changed source is re-reviewed and relevant QA rerun before P1. Do not publish simply because compilation passes.

### E1 — Engineer: scaffold and deterministic toolchain

Create dedicated Git repository, import the three approved docs, add JavaScript React/Vite scaffold with toolchain pins from technical-design.md, config files, lockfile, .gitignore and README skeleton. No starter logos/demo assets or TypeScript. Exclude node_modules, dist, coverage, .env, browser artifacts and caches from source. Scripts: dev=vite; build=vite build; preview=vite preview; lint=eslint .; test=vitest run; test:watch=vitest; test:e2e=playwright test. Set test environment jsdom and jest-dom setup. Playwright webServer uses built Vite preview on 127.0.0.1:4173, no external exposure. Configure Chromium, Firefox and WebKit projects with isolated contexts; do not reuse an unknown existing preview server in QA.

Acceptance: selected runtime versions recorded, fresh npm ci succeeds, no invalid required peers, lint/test harness/build execute. Add a real scaffold render test rather than an empty test command. Report exact helper dependency pins and relevant peer resolution. Registry checks are not substitutes for running installation. Handoff source SHA plus retrievable bundle/shared path and transport hash.

### E2 — Engineer: model and persistence boundary, tests first

Implement src/lib/noteModel.js and noteStorage.js per fixed schema/API. Write failing tests then minimal implementation for absent/read-denied/corrupt/versioned/duplicate-ID/invalid timestamp data; whitespace validation, literal string retention, stable ordering, immutable update/delete, single-key writes, quotas and generic exceptions, expected-token conflicts. Inject storage getter, time and ID factories rather than global fragile mocks. No writes during load, no reset/repair feature, no partial acceptance of corrupt collections.

Acceptance: unit tests assert both return values and side effects (zero writes on prohibited paths, byte preservation and other-key preservation). Failed saves/deletes do not mutate input collection; no secret/raw payload in error strings. Test same-tick/backwards time and two distinct IDs.

### E3 — Engineer: editor workflow and accessible responsive UI

Implement App and small components/CSS with exact dirty/baseline transitions in design. Save success follows commit only; selection and ordering update only after successful mutation. Confirm dirty Open/New; two-stage dirty Delete must retain draft until final persistence succeeds. Include storage notices, title validation, native dialogs, conditional beforeunload, labelled semantic controls, timestamps and empty state. Content stays literal. No autosave effects.

Acceptance: Testing Library integration tests cover two-note isolation, blank title/empty body, cancel paths, selected-note behavior, failure recovery, dirty draft retention, write-disabled corrupt boot, no false success and StrictMode no startup write. Keyboard focus is intentional. No scope additions.

### E4 — Engineer: browser tests, docs, self-review and candidate freeze

Add the Playwright files identified in design. Cover all acceptance criteria feasible automatically, built-app reload, failure injection BEFORE startup, keyboard and representative viewports. Complete README setup/scripts/privacy/storage/limitations, and keep design/plan consistent with implemented interfaces. Include localStorage unsupported concurrency and no offline-load guarantee. Do not publish yet.

Run and record: node --version; npm --version; npm ci; npm run lint; npm test; npm run build; npx playwright install chromium firefox webkit; npm run test:e2e. Install browser system dependencies only when authorized/capable; if unavailable, report an execution blocker rather than skip silently. Engineer results go in docs/implementation/verification.md with source revision/tree, commands, exit statuses and limitations. Freeze source commit S and send clean Git bundle plus transport/hash evidence. No claims that these commands ran during planning.

### R1 — independent Technical Lead: review fixed source candidate

Reviewer must not be its implementer. Retrieve and verify source S; inspect requirements, design, diff, lockfile, UI, persistence validation, failure/dirty transitions, literal rendering and tests. Run clean-install/lint/unit/build and enough browser failure paths to independently substantiate critical claims. Verify test assertions measure non-destruction rather than merely visible errors. Record APPROVED, APPROVED WITH FOLLOW-UP (non-blocking only) or CHANGES REQUIRED with file/issue/impact/correction in docs/reviews/technical-review.md and Kanban handoff. Blocking correctness/security/accessibility gaps return to Engineer, not QA-pass by exception. Approval binds source commit/tree; include limitations. No source fixes by reviewer.

### Q1 — QA: test documentation (before execution)

Create docs/qa/test-plan.md with fixtures, setup/runtime/browser versions, acceptance IDs A1-A9, exact automated/manual steps, expected results, failure injection, keyboard flow, 375x812 and 1440x900 viewports, 200% zoom, screenshot/trace plan, and environment limitations. Include both native dialog cancel points, saved-note isolation, failed DELETE as well as failed Save, unsupported/corrupt raw-byte retention, HTML execution sentinel and best-effort unload behavior. Define no pass without real browser execution. A9 publication verification belongs to P1; QA marks it pending publication, not falsely passed.

### Q2 — QA: independent execution after R1

Retrieve exact reviewed source S plus Q1, verify commit/tree before testing, use fresh install and clean browser contexts. Run full commands above and real Chromium/Firefox/WebKit tests against production build. Keyboard-only create/open/edit/save/cancel/delete plus focus, native dialog and error/status checks require explicit evidence, not just a screenshot. Mobile viewport emulation is not real-device Safari testing; disclose that boundary. Report any unavailable browser as a limitation requiring resolution/HoE approval rather than quietly narrowing coverage. No production code fixes in QA.

Write docs/qa/results.md: candidate SHA/source tree, environment versions, each command/exit status, A1-A9 mapping with pass/fail/pending, test counts actually observed, manual keyboard observations, viewport evidence filenames, traces/screenshots for failures, limitations and verdict. Store evidence in durable task attachments and cite names/hashes under docs/qa/evidence/manifest.md (do not commit sensitive note contents). R1 and Q2 pass must refer to the same source tree; source/lockfile/config/test fixes require re-review and relevant test reruns. Documentation-only evidence commits are permitted but cannot quietly include app changes.

### P1 — authorized publisher / Head of Engineering: private publication

Dependencies: R1 approval, Q2 pass, tested transport, resolved authentication/repository access. Consolidate requirements/design/plan/README/Q1/Q2/review documents into final commit F. R1 and QA must explicitly attest F has identical source, tests, toolchain and build configuration to tested S, using git diff; record the F SHA in Kanban handoffs (avoid self-referential report commit hashes). If any executable content differs, rerun relevant gates against F. This attestation is required even when F only adds reports.

In authorized gh environment verify identity and target first. If confirmed absent and account can create it, create `glados-assistant/browser-notes` explicitly PRIVATE and empty (no auto README/license/history). Recheck visibility before pushing. Use branch main for initial publication; do not force push. Push only approved F from clean dedicated repo, never extra local branches/tags or unrelated files. Verify gh repo view reports exact name and PRIVATE/isPrivate=true, and `git ls-remote <approved remote> refs/heads/main` equals F; fresh remote clone must resolve F and include docs. Record docs/implementation/publication.md as a publication report artifact or Kanban attachment (not an unreviewed extra remote commit). Any later committed report requires a new attested final revision. No deployment, releases with binaries, Pages enabling or production merge. A9 closes only with verified visibility and remote commit evidence.

## Risks and unresolved prerequisites

- Storage has no transactions or encryption; multi-tab races and private-mode persistence are documented limitations, not hidden implementation promises.
- User confirmation/unload behavior varies by browser; native in-app confirmations remain mandatory and deterministic.
- Entire collection serialization is synchronous; no performance claims beyond a modest personal note app. Quota failure must preserve data.
- Corrupt/version-mismatched data is intentionally read/write blocked; no destructive repair/migration in scope.
- Workspace/attachment visibility and source transfer must be proven per recipient. CLI/profile/auth absence in Docker remains an operational prerequisite, not evidence of invalid host credentials.
- There is no evidence yet of authenticated target visibility/account or installed Engineer/QA profiles. HoE must verify these in an appropriate environment. No new product decisions are unresolved; escalate scope changes to HoE.

Planning artifacts are requirements.md, technical-design.md and this plan. Subsequent review/QA/publication documents are assigned above, not fabricated results.
