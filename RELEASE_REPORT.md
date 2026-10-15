# Release report

## Final local MVP — Phase 10

All roadmap phases and local definition-of-done checks are complete. LeadFlow is a personal portfolio demonstration, not commissioned client work. The delivered scope includes registration/session authentication, user-isolated leads, searchable/filterable/sortable tables, persisted six-stage Kanban with real native drag and keyboard selectors, notes, dated tasks, history, PostgreSQL metrics/charts, CSV preview/import/export, profile settings and an opt-in fictional seed.

### Demo delivery

Settings can add 12 fictional leads, eight tasks and 20 truthful creation-history entries to the current user's empty workspace. Origin/session/CSRF, owner locking and atomic writes are enforced. Any existing lead causes 409; repeated loading preserves edits and cannot silently reset or duplicate work. Seeding creates no account/password. Dates are relative to server UTC loading day. Initial fixture metrics are 12 total/eight open/two won/two lost, USD 12,400 open value, USD 4,400 won value and 50% conversion; these are not business outcomes.

README, architecture, security, testing, bilingual portfolio description and case study now describe the final implementation rather than obsolete phase plans. docs/DEMO_GUIDE.md gives startup, a five-minute presentation, expected totals and troubleshooting. demo/contacts.csv is an exercised fixture with two valid rows, one duplicate and one invalid row. Four selected screenshots under docs/images show actual local desktop/mobile dashboard, pipeline and CSV preview using fictional data only. Nothing was published.

### Executed final verification

| Command/check | Result |
| --- | --- |
| Focused backend demo suite by demo_backend | Six PostgreSQL tests passed; lint/format passed |
| scripts/database.ps1 start | Existing dedicated project cluster verified ready; configuration/data preserved |
| scripts/backend.ps1 migrate | Current development schema at head, no new migration needed |
| scripts/verify.ps1 | Completed successfully; backend and browser database suites ran sequentially |
| Full backend within verify | 183 passed in 98.78 seconds; one existing Starlette/HTTPX warning |
| Backend check/audit within verify | Ruff, 29-file formatting, dependency consistency passed; no known vulnerabilities |
| Frontend tests within verify | 34 passed |
| Frontend check within verify | ESLint, Prettier, TypeScript/Vite build and npm audit passed; zero advisory findings |
| Full Chromium within verify | Three journeys passed: 9.4s responsive, 13.1s CRM, 5.3s demo; 38.5s including servers |
| Corrected frontend.ps1 test wrapper | Explicit test:run command rerun: 34 passed without npm's forwarded-option warning |
| Focused demo Chromium after screenshot scroll normalization | Passed, 5.7s body / 16.3s including servers |
| Actual localhost:5173 API after verified project API restart | Health JSON 200, OpenAPI seed route present, anonymous seed 401 |
| Screenshot review | Actual seeded desktop/mobile dashboard, pipeline and import preview reviewed |
| Final documentation/script checks | 11 UTF-8 documents, 20 local links, complete definition of done, PowerShell parse checks and lightweight credential-pattern review passed |

Backend seed tests prove counts/stages/Decimal totals, relative deadlines, truthful history, two-owner scope, Origin/CSRF/session enforcement, existing-work/refused-repeat preservation and complete rollback after activity failure. Three new component cases verify explicit consent, populated-workspace disablement and conflict recovery. The demo browser journey seeds through Settings, verifies real dashboard metrics and 12 cards, reloads/refuses a repeat, visits history and previews the repository CSV. Existing journeys retain auth/CRUD/tasks/history, real drag/recovery, CSV download, two-account isolation and keyboard/responsive checks.

### Corrections and integration

The backend subagent implemented demo router/tests; principal reviewed and integrated frontend, fixtures, commands, screenshots and documentation. An initial frontend build rejected a Playwright-only exact option in a React Testing Library assertion; removing that unsupported option fixed typecheck, and the final build passed. The first unified verification exposed PowerShell consuming npm's argument separator: tests passed but emitted a forwarded-option warning. An explicit test:run npm script and corrected helper were subsequently exercised successfully. Screenshot capture was normalized to the page top and the focused browser journey rerun.

The established Python/npm dependency sets were unchanged; no credentials, migration, external connector, paid service, remote push or production deployment was introduced. Prior phase entries below are historical evidence and do not supersede this final scope.

### Not tested / operating limits

Verified on the existing Windows/Python 3.14.4/Node 24.14.1/PostgreSQL 18.6 environment, not a clean machine or another OS. No public hosting, real HTTPS cookie flow, production backups/recovery, shared throttling, least-privilege hosted database, load testing, physical devices, Firefox/WebKit or real screen-reader audit was performed. Local PostgreSQL trusts loopback clients; current HTTP cookies are not Secure. Do not use real personal/client data. Advisory checks are a time-specific snapshot, not a security guarantee. Existing Starlette/HTTPX and Playwright color-environment warnings remain.

No password recovery, email verification, team workspace, reminder delivery, touch drag, manual card ordering, weighted forecasting or measured business results are claimed. CSV is bounded UTF-8/comma input; export buffers owned output in memory and apostrophe neutralization survives reimport. The seed is refused on populated accounts and deadlines are not silently refreshed. Publishing/production/costs or new credentials require separate explicit authorization.

## Historical Phase 9 scope

Local regression, dependency checks and focused robustness review are complete. Registration/profile names containing NUL now return validation 422 rather than database 503, without creating/changing records. Ordinary API write bodies are counted and limited to 256 KiB before JSON parsing; CSV POST retains 14 MiB transport and 2 MiB text bounds. Git text normalization now preserves LF across Windows checkouts, avoiding a reproducible Prettier failure after branch integration. No dependency or schema change.

| Executed check | Result |
| --- | --- |
| Baseline backend suite | 171 passed in 98.20 seconds |
| New regression reproduction before fixes | Five failed, one passed; failures reproduced name 503s and absent ordinary body bounds |
| Focused regression plus CSV after fixes | 39 passed in 22.12 seconds |
| scripts/backend.ps1 test after fixes | 177 passed in 104.26 seconds, one existing Starlette/HTTPX warning |
| scripts/backend.ps1 check | Ruff, 27 Python files formatted and dependency consistency passed |
| npm run test -- --run | 31 passed |
| npm run lint, npm run format:check, npm run build | Passed after line-ending correction |
| pip-audit JSON report | Zero known vulnerabilities across 67 installed Python packages |
| npm audit JSON report | Zero findings; metadata lists 309 dependencies |
| npm run test:e2e | Both Chromium journeys passed, 39.2 seconds including servers |
| Tracked-file pattern / ignore checks | No common credential patterns in initial 73 tracked files; local configuration/runtime/build paths ignored |
| Git checkout filters with core.autocrlf=true | Four representative frontend files retain LF |
| Live localhost:5173 proxy after verified API restart | Health JSON 200, anonymous auth 401, oversized ordinary write 413 |

Six new tests cover registration/profile NUL rejection with preserved data, oversized ordinary POST/PATCH, streamed body rejection and valid 10,000-character escaped notes. Existing suites cover multiuser ownership, exact metrics, atomic task/activity and CSV changes, migrations and real HTTP. Browser regression retains complete CRM/CSV/account switching and the multi-width keyboard/visual journey. Dependency lock hashes and the endpoint ownership evidence matrix are in [docs/REGRESSION_REPORT.md](docs/REGRESSION_REPORT.md).

Initial frontend format verification failed after Git had converted phase-8 files to CRLF on checkout. This was a reproducibility defect, not a new content change. .gitattributes plus frontend formatting restored passing checks; no frontend product code changed in Phase 9. The initial six-case backend run deliberately preceded implementation to establish the five failures; all final checks pass. Existing upstream Starlette/HTTPX and Playwright color-environment warnings remain visible. No independent agent/security audit, external connector or production deployment was performed.

Remaining release work: Phase 10 repeatable fictional seed and final demo/runbook documentation. Production TLS, least-privilege credentials, backups, shared throttling, physical devices, other browser engines, screen readers and production load remain unverified. Advisory checks are a time-specific snapshot, not a guarantee of safety. This remains a local personal portfolio demo.

## Historical Phase 8 scope

Improved muted text and all six stage badge palettes, increased small type, enlarged primary/navigation controls, preserved visible keyboard focus and added labeled focusable scroll regions for tables/pipeline. CSV reports keep enough column width for readable errors. Form help/errors now have explicit associations in auth, lead notes/stage, profile and follow-up forms. Authentication's main heading describes the form. Route changes update the browser title, reset scroll and move focus to main content; skip links target a focusable main landmark and are clipped when unfocused.

| Executed command/check | Result |
| --- | --- |
| git switch -c phase-8-accessibility | Clean phase branch created |
| npm run test -- --run | 31 passed; registration descriptions checked |
| npm run lint, npm run build, npm run format:check | Passed |
| npm run test:e2e | Both Chromium journeys passed, 35.6 seconds including servers |
| Focused responsive review | Eleven screens at 320/768/1440; long text, keyboard, descriptions, states and contrast checks passed |
| Actual localhost:5173/api/v1/health | JSON 200 |

The new browser journey covers login, registration, leads, create, detail, edit, pipeline, dashboard, CSV, settings and not-found views. It verifies no whole-document horizontal overflow, descriptive route titles, main focus, skip-link Enter activation, Tab into settings, ArrowRight scrolling for the leads table/pipeline, field descriptions, sampled solid-background text contrast of at least 4.5, primary/navigation heights of at least 44px, reduced-motion spinner, empty metrics and recovery from an injected dashboard 503. The existing journey continues to verify real auth/CRUD/tasks/dashboard/drag/CSV/two-account ownership/logout. Desktop/mobile/tablet screenshots are captured under ignored .local/screenshots; representative auth, leads, detail, dashboard and settings captures were visually reviewed.

Initial browser review reproduced horizontal overflow with an unbroken 105-character contact name at desktop width: a flex child retained its minimum content width and pushed action buttons offscreen. Allowing the child to shrink and keeping actions separate fixed the cause; the same multi-width regression then passed. An initial local npm invocation used the repository root instead of frontend/ and failed with ENOENT; all checks were rerun from the correct directory. JSDOM lacks scrollTo, so component tests mock that browser method; real scrolling is checked in Chromium. No test failure is hidden or marked expected.

No dependencies, backend changes, migration, external connector or deployment. Backend's last full verification remains Phase 7: 171 passed; it was not rerun for presentation-only changes. No independent agent review was performed in this phase. This is not a complete accessibility audit: real screen readers, physical touch devices, browser zoom modes, Firefox/WebKit, production TLS and performance remain unverified. Tables and pipeline intentionally scroll horizontally. Next is Phase 9 regression, hardening and dependency review.

## Historical Phase 7 scope

CSV transfer is available at `/import`: UTF-8 upload, column mapping, read-only preview, per-row errors/duplicates, explicit confirmation and optional partial import. Existing leads are never overwritten. The API revalidates against owned emails at confirmation, serializes imports per owner and commits all valid leads with their activities in one transaction. Export downloads all owned lead fields, independent of filters, with BOM and formula neutralization. No migration or dependency was added.

| Executed check | Result |
| --- | --- |
| Focused CSV PostgreSQL tests by csv_backend | 33 passed |
| scripts/backend.ps1 test | 171 passed in 100.77 seconds; one known Starlette/HTTPX warning |
| scripts/backend.ps1 check | Ruff, formatting of 26 files and dependency consistency passed |
| npm run test -- --run | 31 passed |
| npm run lint, npm run build, npm run format:check | Passed |
| npm run test:e2e | Full Chromium flow passed: 14.7 seconds test body / 26.4 seconds including servers |
| Actual localhost:5173 proxy after verified API restart | Health 200 JSON; anonymous auth 401 |
| Screenshots at 1440px and 390px | Captured and visually reviewed; whole-document overflow assertion passed |

Browser verification uses a real uploaded CSV with custom mappings, two valid records, one duplicate and one invalid email. It checks the partial-import gate, confirmation reset, success counts, persisted contacts and a downloaded CSV whose formula-like company value is escaped. Existing registration/lead/task/dashboard/pipeline/two-account/logout checks also pass. Backend tests cover owner isolation, BOM/multiline quoting, mapping/limits, malformed files, no-email behavior, atomic rollback when history fails and export/reimport. Component tests cover mapping/confirmation, explicit partial consent and inspection errors.

csv_backend implemented and tested backend files; principal implemented/integrated frontend, browser checks and documentation. A first Windows test run failed because generated parameter IDs exceeded path limits; short IDs fixed the harness and all 33 CSV tests passed. No product failure remained in final verification. No independent security audit or external connector was used.

Limits: CSV is comma-separated UTF-8, 2 MiB, 5,000 logical data records and 32 columns; JSON transport is bounded at 14 MiB. Contacts without emails have no reliable deduplication. Exported formula-like cells gain a literal apostrophe retained on reimport. Processing/export buffer data in memory; production-scale load, spreadsheet application compatibility, Firefox/WebKit, screen readers and real HTTPS remain unverified. Existing upstream Starlette/HTTPX and Playwright color-environment warnings remain. Phase 8 is visual, responsive and accessibility review; this is not a final release.

Date: 2026-10-15 (America/Argentina/Buenos_Aires).

## Historical Phase 4 scope

Kanban is implemented at `/pipeline` with six owner-scoped stages, native HTML drag handles, accessible stage selectors, per-stage server totals and paginated loading. Native drag and drop plus selectors avoids another dependency; touch drag gestures and manual within-stage ordering are not supported. Existing PATCH transactions persist each stage with its activity. No backend/schema/dependency change was needed.

Executed from frontend/: `npm run test -- --run` → 23 passed; `npm run lint` → passed; `npm run format:check` → passed; `npm run build` → TypeScript/Vite passed. `npm run test:e2e` → one full Chromium flow passed (latest run 8.9 seconds test body, 21.3 seconds including temporary servers). It verifies real drag, reload persistence, stage selection by keyboard, simulated PATCH 503 recovery, and no foreign contact card in the second account's pipeline. Existing auth/CRUD/profile browser checks still pass. Backend's prior 97 tests were not rerun because backend code is unchanged.

Three new component cases cover persisted status-only PATCH, failure recovery and loading more than the first page. An initial ESLint check rejected a ref prop name; it was renamed to dragRef and lint passed. One local Python editing command hit Windows' default encoding; rerunning explicitly as UTF-8 succeeded. No independent-agent review was performed in this phase.

Desktop pipeline screenshot was visually reviewed; Chromium also captured mobile layout and asserted no whole-document overflow at 390px. Horizontal board scrolling is intentional at all widths where six columns do not fit. Firefox/WebKit, touch drag, screen readers, load performance and production remain unverified. Native selectors are the touch/keyboard alternative. Final runtime health and proxy checks are recorded before commit. Tasks/history API, dashboard and CSV remain pending; next is Phase 5.

## Historical Phase 6 scope

Dashboard is implemented at /dashboard with a read-only owner-scoped API, sales metric cards, stage-count chart, outcome distribution, exact stage table and five linked next follow-ups. Values come from PostgreSQL, not browser fixtures. Open excludes won/lost; conversion is won/(won+lost) × 100 with two-place HALF_UP Decimal rounding, zero when none are closed. Amounts are unweighted USD estimates, not collected revenue. Incomplete tasks include overdue items; counts cover all tasks while the list is limited to five. Frontend sends the local calendar date; API default is UTC. Lead/task writes invalidate the owner's cached dashboard.

| Executed command/check | Result |
| --- | --- |
| git switch -c phase-6-dashboard | Clean phase branch created |
| npm install recharts in frontend/ | Requested chart dependency installed, lockfile updated |
| Focused Pytest backend/tests/test_dashboard.py by dashboard_backend | 13 PostgreSQL tests passed |
| scripts/backend.ps1 test | Full suite: 138 passed, one known warning, 85.34 seconds |
| scripts/backend.ps1 check | Ruff, 24 Python files formatted and dependency consistency passed |
| npm run test -- --run in frontend/ | 28 passed; three new metric/empty/error cases |
| npm run lint, npm run format:check, npm run build | Passed; dashboard lazy chunk approximately 381 kB / 109 kB gzip, separate from main application |
| npm audit | Zero known vulnerabilities in installed snapshot |
| npm run test:e2e | Full Chromium CRM flow passed, 13.3 seconds test body / 25.2 seconds including servers |
| Actual localhost:5173 API requests after verified API restart | Health JSON 200, anonymous dashboard JSON 401 |

Backend tests cover six-stage zeros, exact 0.10+0.20 sums, aggregate correctness without task multiplication, two-wins/one-loss conversion of 66.67%, overdue/today/future/completed task boundaries, stable earliest-five ordering, malformed dates, anonymous denial and two-user isolation. Chromium verifies populated metrics, real SVG charts, next-task navigation, dashboard refresh after completion, zero metrics for a second user, and existing auth/CRUD/task/Kanban behavior. Screenshots were captured and visually reviewed at 1440 and 390 pixels.

An initial component test exposed a follow-up link name with concatenated text; an explicit accessible label corrected it. Mobile QA prompted navigation wrapping, then still measured chart width before ResizeObserver completed; polling the layout condition instead of reading it synchronously verified the settled layout without suppressing overflow checks. Recharts is mocked in component tests only; browser tests use the real library. dashboard_backend implemented API/tests and reviewed frontend read-only without concrete findings. Principal integrated and ran final checks.

No schema migration, external connector, paid service or production deployment was needed. Historical trends, weighted forecasts, revenue collection, other browsers, real TLS, assistive-technology audit and load performance remain unverified/out of scope. The existing Starlette/HTTPX and Playwright color-environment warnings remain. CSV mapping/preview/import/export is the next functional phase.

## Historical Phase 5 scope

Dated follow-up tasks and activity history are implemented on contact detail. Backend nested APIs enforce parent and owner scope, calendar dates, title/description limits, strict completion booleans and immutable IDs. Task changes and activity records share a transaction and lock the parent lead. Notes generate distinct history events. UI supports create/edit/complete/reopen, cancel/confirm deletion, overdue labels and paginated task/history loading. No reminder delivery is implemented.

Commands executed from repository root unless frontend/ is stated:

| Command | Result |
| --- | --- |
| `git switch -c phase-5-followups` | Phase branch created from clean main |
| `python -m pytest -c backend/pyproject.toml backend/tests/test_tasks.py -q --tb=short` using .venv Python | 28 new tests passed, 1 upstream warning, 18.78 seconds |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 test` | Full suite: 125 passed, 1 known Starlette/HTTPX warning, 92.29 seconds |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 check` | Ruff passed, 22 Python files formatted, dependency consistency passed |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 migrate` | Development database upgraded to 0003_tasks |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 run` | Verified project API restarted at 127.0.0.1:8000 |
| `npm run test -- --run` in frontend/ | 25 passed across two files |
| `npm run lint`, `npm run format:check`, `npm run build` in frontend/ | Passed; final build JS 457.98 kB (gzip 141.31 kB), CSS 25.68 kB |
| `npm run test:e2e` in frontend/ | Full Chromium CRM flow passed, including new task/history behavior; initial passing run 8.8 seconds test body, 19.8 including servers |

New backend tests verify task CRUD/completion/reopening, overdue date acceptance, invalid dates and types, owner assignment rejection, no-op history, filtered/stable pagination, note/stage history, cross-user and wrong-parent denials, composite owner constraints, Origin/CSRF, cascade scope and rollback of create/update/delete when activity persistence fails. Existing backend regression tests and migration upgrade/downgrade/drift checks pass. Chromium covers task create/edit, overdue label, completion and reload, reopen, delete cancellation and confirmed deletion with retained history, alongside existing auth/lead/Kanban flows. Frontend tests prove date-string requests, persisted completion and input preservation after failure.

followups_backend supplied backend changes and a read-only frontend review. The review found missing description validation feedback; it is fixed. The initial browser test expected the checkbox to change synchronously, but the UI intentionally waits for a server-confirmed write; click plus awaited assertion now verifies that contract. Ruff corrected the new test's initial import/one-line formatting. No dependency, credential, paid service or remote deployment was introduced.

Limits: no email/push reminders, global task list, browser notifications, screen-reader audit, real TLS or production validation. Dates and overdue labels use the current browser calendar. Read-only activity remains until its parent lead is deleted. Dashboard/metrics/charts and CSV are still pending. Next is Phase 6.

Desktop follow-up/history screenshot was reviewed. A global label layout initially stacked the task checkbox above its title; explicit row layout and checkbox sizing corrected it. Chromium was rerun after that CSS correction. Actual localhost:5173 proxy returned JSON 401 for anonymous auth and JSON 200 for health; documentation links/UTF-8 and Git whitespace checks passed. No production claims or exhaustive secret audit are made.

## Post-Phase 3 local proxy correction

User screenshot showed `Unexpected token '<'` on registration. HTTP reproduction against the actual development server confirmed that localhost:5173 returned the SPA HTML with status 200 for `/api/v1/auth/me` and `/api/v1/health`, while FastAPI at 127.0.0.1:8000 correctly returned JSON. Vite's resolved on-disk configuration contained the correct proxy. Restarting only the verified project Vite process restored JSON responses (401 for anonymous `/auth/me`, 200 for health). The exact earlier runtime configuration loss was not established; no backend/authentication defect was reproduced.

The frontend now checks successful API response content type and catches unreadable JSON, displaying a safe actionable error instead of a raw parser exception. A regression component test covers HTML fallback and recovery via retry. Chromium checked the actual localhost:5173/register page after restart: no alert or page error, registration form rendered, and proxied auth request returned JSON 401. The frontend unit suite now contains 20 tests. No dependency, database schema or backend change was made. An initial formatting command used repository-relative paths incorrectly; rerunning from frontend/ succeeded.

## Historical Phase 3 scope

React authentication, lead list/forms/detail and profile settings are implemented against the local API. Pipeline, tasks/history endpoints, dashboard and CSV remain pending. This is a personal demonstration, not a production release.

## Phase 3 delivered and tested

- React/TypeScript/Vite, React Router, TanStack Query, React Hook Form, Zod and Lucide icons; package-lock.json records exact dependencies.
- Login/register, protected routing, cookie/CSRF requests, owner-keyed queries, cache cancellation/clearing and explicit loading/error/retry behavior.
- Lead table with server search/filter/sort/pagination, forms, detail/notes, deletion confirmation and profile-name settings.
- Original local CSS with responsive sidebar/navigation and a mobile horizontally scrollable table; no external fonts or assets.
- PowerShell frontend setup/run/test/check/browser commands. The normal frontend serves localhost:5173; temporary browser-test servers use 5174/8001 with the dedicated guarded test database.

| Executed command | Result |
| --- | --- |
| `git switch -c phase-3-frontend` | Created phase branch from clean main |
| `npm install` runtime/development packages, then `npm install zod@^4` in frontend | Installed the requested stack and test/lint/build tools; selected Zod 4 to match its API usage |
| `npm run format` | Applied Prettier to frontend source/config/tests |
| `npm run test -- --run` | 19 passed in two files; final run 8.91 seconds |
| `npm run lint` | ESLint passed with max-warnings 0 |
| `npm run format:check` | All matched files use Prettier style |
| `npm run build` | TypeScript and Vite passed; final JS 444.12 kB, gzip 137.38 kB; CSS 22.56 kB |
| `npm audit` | Zero known vulnerabilities in the installed dependency snapshot |
| `npm run test:e2e` | One Chromium scenario passed; 6.1 seconds test body, 20.9 seconds including temporary servers |
| `npm run dev` | Frontend served at http://localhost:5173 for local use |

The browser scenario registered an account, created a fictional lead, reloaded persisted data, edited stage/value, applied/cleared filters, registered a second account, verified empty data and foreign-ID denial, returned to the first account, cancelled deletion with Escape and restored focus, confirmed deletion, edited/reloaded the profile, and logged out. No browser page errors were observed and the final session cookie was absent. Credentials are generated at runtime; traces are disabled. Browser artifacts and screenshots remain ignored.

Screenshots of login/list at desktop and list at 390px were visually reviewed. Whole-document mobile overflow was absent; table columns intentionally scroll horizontally. This is evidence for the current pages, not a complete Phase 8 audit.

## Phase 3 corrections and review limits

The initial component run had 17 passing and two failing tests: the logout mock incorrectly continued to return a valid session and a label selector changed when a validation message appeared. Both tests were corrected. Browser runs then exposed field accessible names that included help text/select contents; stable names were added. Another run exposed native-dialog focus timing; focus is now explicitly moved to Keep lead after showModal and restored on close. The full Chromium journey then passed.

frontend_app supplied the source and reported source typecheck/lint; its final signal was interrupted by the agent usage limit. frontend_review also stopped without producing a review. The principal inspected, integrated and verified the work. No completed independent review is claimed. No backend code, migration or Python dependency changed; the 97 backend tests are the prior Phase 2 result, not a new test run.

## Current limits and next phase

Only Chromium was tested. Real TLS, Firefox/WebKit, screen readers, deployed SPA routing, production hosting and performance under load were not verified. Broad accessibility/contrast/responsive review remains Phase 8. Native table horizontal scrolling is intentional on narrow screens. Process-local auth throttling and local PostgreSQL trust remain development-only limits. Starlette/HTTPX has its previously documented upstream warning; Playwright emitted harmless FORCE_COLOR/NO_COLOR environment warnings. No deployment, external connector or paid resource was used.

Next: Phase 4, persisted Kanban with drag and drop, keyboard stage controls and failed-update recovery.

## Historical Phase 2 scope

Authentication and lead CRUD are implemented and verified locally. This is not a full CRM or production release. Frontend, pipeline interaction, tasks/history endpoints, metrics and CSV remain pending.

## Phase 2 delivered

- Owner-scoped lead create/list/detail/patch/delete API with search, status/source filters, allowlisted sorting and stable pagination.
- Validated names, emails, text lengths, stages, nonnegative USD decimals, immutable server fields, partial updates and no-op behavior.
- Normalized email uniqueness per user; duplicate mutations return 409 without overwriting records. Different users may use the same contact email, and multiple null emails are permitted.
- PostgreSQL migration 0002_leads_activities, owner/status and owner/creation indexes, database status/value constraints and composite activity-owner foreign key.
- Creation/edit/status history recorded internally in the same transaction as each mutation, owner-scoped row locking for updates/deletion, and database cascading of deleted lead activities.
- No-store headers for all private API resource responses.
- Backend implementation delegated to leads_backend; principal integrated it and added tests. leads_review performed read-only cross-review and reviewed the fixes below.

## Phase 2 executed commands and results

| Command/check | Result |
| --- | --- |
| `git switch -c phase-2-leads` | Phase branch created from clean main |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/database.ps1 status` | Dedicated project cluster running |
| `.\.venv\Scripts\python.exe -m pytest -c backend/pyproject.toml backend/tests/test_leads.py -q` | Initial run: 55 passed, 1 failed on case-sensitive name order |
| `.\.venv\Scripts\python.exe -m pytest -c backend/pyproject.toml backend/tests/test_leads.py -q -k 'validation or invalid_list' --tb=short` | Reproduced 5 invalid-input regressions before fixing NUL and oversized offsets; 25 passed |
| `.\.venv\Scripts\python.exe -m ruff check backend --fix` and `-m ruff format backend` | Imports and formatting corrected |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 test` | **97 passed, 1 upstream warning in 71.93 seconds** |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 check` | Ruff passed, 18 Python files formatted, no broken dependency requirements |
| `.\.venv\Scripts\python.exe -m pip_audit --format json --output .local/dependency-audit.json` | No known vulnerabilities; dependencies unchanged |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 migrate` | Development database upgraded to 0002_leads_activities |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 run` | Restarted the verified project API process; local server running on 127.0.0.1:8000 |
| Live HTTP and OpenAPI assertions | Health/readiness/docs returned 200; lead CRUD routes present; anonymous list denied with 401 and no-store |
| `psql -X -w -h 127.0.0.1 -p 55433 -U leadflow_local -d leadflow -Atc "SELECT version_num FROM alembic_version; SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"` | Revision 0002_leads_activities; users, sessions, leads, activities and Alembic version tables present |

The full suite includes the original authentication checks, 61 lead tests and a dedicated migration-preservation test. The real Uvicorn TCP flow now covers lead creation, stage persistence, filtered lookup, foreign-user read/update/delete denial and owner deletion, then logout/replay rejection. PostgreSQL tests also prove email conflict rollback, explicit-null handling, direct database constraints, cascade scope and rollback of a lead change when its activity cannot be inserted. The migration test upgrades existing users/sessions from Phase 1 without losing them. The session fixture independently exercises upgrade/downgrade/upgrade and schema drift checking.

## Phase 2 corrections

An initial integration test showed that text ordering put uppercase names first under the local collation. Name/company sorts now use lowercased expressions plus a stable UUID tie-breaker. Independent review found that PostgreSQL rejects embedded NUL and that arbitrary page values could overflow its offset parameter. These cases were reproduced against PostgreSQL as 503 responses. Create/patch text and search/source parameters now reject NUL; page has an explicit upper bound. Invalid requests now return 422 before SQL. Follow-up static review found no new issue in these corrections.

## Current limits and next phase

Frontend/browser UX, actual drag and drop, tasks/history endpoints, dashboard and CSV are not implemented. Stage changes and internal history are verified only through the API/database; this does not complete the future pipeline/history UI phases. UI deletion confirmation is pending with the frontend. No performance/load claim, real TLS verification or production deployment is made. Local PostgreSQL trust, process-local throttling and one Starlette/HTTPX warning remain as documented. No dependencies, secrets, paid services or remote publication were introduced in this phase.

Next: Phase 3, React shell, authentication screens, lead table/forms/detail and component verification.

Documentation link/UTF-8 checks and Git whitespace checks passed. Tracked-file heuristic credential checks found no private-key, password-bearing database URL or OpenAI-style key patterns; this is not an exhaustive secret audit. Local configuration and runtime data remain ignored.

## Historical Phase 1 record

The following Phase 1 evidence records its original scope; the current Phase 2 results above supersede its status counts and pending-work list.

## Phase 1 delivered

- FastAPI factory, environment validation, SQLAlchemy 2 models and Alembic users/session migration.
- Registration, login, session rotation, current profile read/update and logout/revocation.
- Argon2id, session/CSRF token digests, expiration, strict Origin checks, CSRF, exact credentialed CORS, cookie attributes and bounded authentication throttling.
- Input validation and mass-assignment rejection; validation/database errors omit submitted values and internal database details.
- Separate local PostgreSQL cluster on 127.0.0.1:55433 with development and guarded disposable test databases. No existing PostgreSQL service was modified and no password/production credential was introduced.
- Repeatable PowerShell setup, migrate, run, test, check, audit and database commands; pinned local development dependencies.
- Backend implementation delegated to backend_auth; principal integrated and tested it. A separate auth_review agent performed static review and found no important reproducible issue. Its review did not claim test execution.

## Phase 1 executed commands and results

Commands run from the repository root. The wrapper commands below were actually executed, not just proposed.

| Command | Result |
| --- | --- |
| `git switch -c phase-1-auth` | Isolated phase branch created |
| `python -m venv .venv` | Local Python 3.14.4 environment created |
| `.\.venv\Scripts\python.exe -m pip install fastapi 'sqlalchemy>=2,<3' pydantic-settings alembic 'psycopg[binary]' argon2-cffi email-validator 'uvicorn[standard]' pytest httpx ruff pip-audit` | Dependencies installed without changing stack or global Python |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/database.ps1 start` | Created dedicated cluster, leadflow/leadflow_test and ignored local .env; later repeated to verify restart |
| `.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head` | Development schema applied |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 migrate` | Repeated upgrade successfully with existing schema |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 setup` | Pinned environment installation completed; packages already satisfied |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/database.ps1 stop` | Dedicated project cluster stopped; start succeeded afterward |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 run` | Uvicorn started at 127.0.0.1:8000 and was left running for local use |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 test` | 35 passed, 1 upstream deprecation warning; 18.65 seconds on the recorded run |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 check` | Ruff lint, 13 Python files formatted and pip consistency checks passed |
| `.\.venv\Scripts\python.exe -m pip_audit --format json --output .local/dependency-audit.json` | Initially 8 advisory entries for project-local pip 26.0.1; after update, no known vulnerabilities |
| `.\.venv\Scripts\python.exe -m pip install 'pip==26.2.1'` | Updated only the virtual environment's pip; full environment pinned in requirements.lock |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend.ps1 audit` | Confirmed no known vulnerabilities after locking dependencies |
| `psql -X -w -h 127.0.0.1 -p 55433 -U leadflow_local -d leadflow -Atc "SELECT version_num FROM alembic_version; SELECT count(*) FROM users; SHOW listen_addresses;"` | Revision 0001_users_sessions, no development users, loopback-only listener |

The tests execute Alembic upgrade → downgrade to base → upgrade → drift check on the guarded test database. They cover password/digest storage, normalized duplicate emails, validation/redaction, mass assignment, Origin/CSRF rejection, two-user profile isolation, session rotation/expiry/replay/logout, throttling/expiry, CORS, secure cookie attributes, unavailable database responses and environment configuration. A subprocess Uvicorn test exercises register → current profile → profile update → logout → rejected session replay over real TCP.

Final documentation link/UTF-8 assertions and Git whitespace/ignore checks passed. `.env`, virtualenv and PostgreSQL data stay ignored. The local development server health/readiness and OpenAPI endpoints were checked after the database restart.

The Alembic revision template was generated and compiled in an ignored temporary versions directory. A heuristic review of tracked files found no private-key, password-bearing PostgreSQL URL or OpenAI-style key patterns; this is not an exhaustive secret scanner. Initial staged trailing blank lines in three configuration files were removed before the successful whitespace check.

## Historical Phase 1 corrections during verification

The initial pytest collection failed because app imports needed the backend Python path; pytest configuration now sets it explicitly. One initial test used `short` as an invalid password and matched the error type `too_short`; the test value was corrected. The initial environment file encoding was normalized to UTF-8 without BOM, and the PowerShell writer now uses ASCII for the ASCII-only local template. Ruff import/format findings were corrected before the passing run.

## Historical Phase 1 limits and untested work

- No frontend, browser user journey, real TLS, CRM resources, CSV or production deployment has been tested or delivered.
- Cross-user isolation is verified for the existing profile/session API, not future lead/task/activity endpoints.
- The current test suite emits one Starlette warning about deprecating its HTTPX test adapter. It is not suppressed and does not fail the tests.
- PostgreSQL trust authentication permits any local process to access the demo cluster, including its local administrator. Use fictional data only. It is unsuitable for production.
- Authentication throttling is process-local, IP-based and reset on restart; multiple workers/shared limits are not implemented.
- Only Windows/Python 3.14.4/PostgreSQL 18.6 were tested. The lock includes development/audit tools; a production deployment dependency set has not been prepared.
- No password recovery, email verification, production secret/backup setup, publishing or paid service was introduced.

## Historical Phase 1 next phase

Phase 2: owner-scoped leads CRUD, search/filter/sort/pagination and PostgreSQL isolation tests. Frontend work begins in Phase 3.

## Historical Phase 0 scope

The following baseline records describe Phase 0 before application implementation; they do not supersede the current release evidence above.

## Completed

- Inspected an empty workspace and applicable contributor instructions.
- Defined application structure, data ownership, session/CSV/metric contracts and phase gates.
- Added roadmap, contributor rules, architecture, security/test plans and honest portfolio documentation.
- Reserved frontend/backend directories and added ignored local configuration patterns.

## Executed environment checks

| Command/check | Result |
| --- | --- |
| `Get-ChildItem -Force` and applicable AGENTS.md inspection | Workspace initially empty; no project guidance files found in its ancestor paths |
| `git --version` | 2.55.0.windows.5 |
| `node --version` | v24.14.1 |
| `npm --version` | 11.11.0 |
| `python --version`, `py -0p` | Python 3.14.4; one registered runtime |
| `psql --version`, `pg_ctl --version` | PostgreSQL 18.6 |
| `Get-Command` tool discovery | Git, Node/npm, Python and PostgreSQL tools available; Docker and uv unavailable |
| `Get-Service -Name '*postgres*'` | postgresql-x64-18 running |
| `pg_isready -h 127.0.0.1 -p 5432` | Accepting connections; does not establish authorized application access |
| `pg_isready -h 127.0.0.1 -p 55432` | No response |
| Initial `git status` / `git rev-parse --show-toplevel` | Not a Git repository; expected before initialization |

## Repository verification

- `git init -b main`: initialized a local repository. Git author configuration is present; its values were not printed.
- Python assert-based documentation check: passed for 12 nonempty required files, existing local Markdown links, UTF-8 integrity, frontend/backend directories and empty database URL placeholders.
- `git check-ignore .env .env.production backend/.env .venv/test node_modules/test`: all five paths are ignored. No secret files were created.
- Independent architecture_review subagent: completed read-only review; its eight recommendations are incorporated in ARCHITECTURE.md and the testing/security plans.
- Staged whitespace and file review: performed before the Phase 0 commit; see Git history for the local commit.

## Historical Phase 0 untested work

No dependency install, frontend build, backend startup, auth, CRUD, user isolation, migrations, tasks, pipeline, dashboard, CSV, responsive browser review or dependency advisory audit has occurred. No app tests exist or passed. No PostgreSQL application database or credentials were created. No remote, hosting, production deployment or paid resource was configured.

## Historical Phase 0 next step

Phase 1: verify dependency compatibility; configure a local virtual environment and PostgreSQL development/test databases without touching existing databases; implement migrations and session authentication; run real PostgreSQL auth/ownership checks. Credential introduction requires explicit authorization under the user's rules.
