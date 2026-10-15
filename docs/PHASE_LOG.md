# Phase log

## Phase 10 — 2026-10-15

Completed the local MVP with opt-in authenticated fictional seeding: 12 leads/two per stage, eight dated tasks and 20 truthful creation entries. Owner locking, session/Origin/CSRF, atomic rollback and refusal of any populated workspace preserve existing work. UI requires consent and exposes the result/dashboard link; no default account/password or destructive reset exists. Added an exercised CSV fixture, final current-state documentation, bilingual portfolio copy, presentation guide and four real fictional-data screenshots.

Demo backend agent implemented router/six focused tests; principal reviewed/integrated frontend, wrappers, browser tests and docs. Full scripts/verify.ps1 passed: 183 backend, 34 frontend, Ruff/format/dependency consistency, ESLint/Prettier/build, advisory audits and three Chromium journeys. Runtime database start/migrations and the actual Vite/API route checks passed. Initial RTL option typecheck and PowerShell npm argument forwarding were corrected; the explicit frontend test helper reran with 34 passing tests, and the focused demo journey passed after screenshot normalization. No dependency/migration/credential/connector/paid resource or deployment. All local definition-of-done boxes complete; production and broader platform/browser/assistive-technology work remain outside this delivery. See RELEASE_REPORT.md for exact commands/results and limits.

## Phase 9 — 2026-10-15

Completed local regression, dependency advisory review and focused robustness fixes. Names containing NUL in registration/profile now fail validation without database changes. Normal API writes have a streamed 256 KiB body cap; CSV keeps its separate 14 MiB JSON transport bound. Added LF Git attributes after reproducing Windows checkout/Prettier drift. No dependency/migration/frontend behavior change.

Evidence: baseline 171 backend tests; six new regression cases initially reproduced five failures, then the focused CSV/regression suite passed 39. Final full backend: 177 passed with one known warning; Ruff/27-file formatting/dependency consistency passed. Frontend: 31 tests, lint/format/build passed. Both Chromium journeys passed in 39.2 seconds including temporary servers. pip-audit (67 packages) and npm audit (309 dependency entries) reported zero known vulnerabilities. Tracked-file credential-pattern and ignored-file checks passed. Verified project API restarted; real Vite proxy returns health 200, anonymous auth 401 and oversized write 413. Principal performed this phase without independent-agent/security audit; boundaries and lock hashes are in docs/REGRESSION_REPORT.md. Next: Phase 10 fictional seed, runbook and final release evidence.

## Phase 8 — 2026-10-15

Delivered higher-contrast copy/stage labels, readable mobile type, larger controls, visible keyboard focus, focusable labeled scroll regions, linked form help/errors, route titles/focus/scroll reset and a reliable skip target. A new Chromium journey reviews eleven screens at 320/768/1440, long content, keyboard scrolling/navigation, sampled contrast, loading/empty/error recovery and reduced motion. Fixed the desktop long-name detail header overflow exposed by that test.

Principal implemented and reviewed this phase. Verification: 31 frontend tests; ESLint, formatting and TypeScript/Vite build passed. Both Chromium journeys passed, including the original full CRM flow. Screenshots reviewed at desktop/mobile/tablet sizes; actual Vite/API health returns JSON 200. Backend/dependencies unchanged, prior 171-test result remains Phase 7. Full assistive-technology/other-browser coverage is not claimed. See RELEASE_REPORT.md for initial failures and limits. Next: Phase 9 regression/hardening/dependency review.

## Phase 7 — 2026-10-15

Delivered CSV upload, custom mapping, inspection/preview, per-record validation and duplicate reports, explicit atomic/partial import consent and owned CSV export with formula neutralization. Backend shares LeadCreate validation, bounds request/file/record sizes and commits lead/history changes atomically after revalidation. Frontend provides report pagination, errors, confirmation reset and cache invalidation. No new dependency or migration.

csv_backend implemented backend and 33 focused tests; principal integrated frontend and ran complete verification: 171 backend tests, 31 frontend tests, Ruff/format/dependency consistency, ESLint/Prettier and TypeScript/Vite build passed. Full Chromium CRM flow passed with file upload, mapping, partial confirmation, persisted imported contacts and actual download. Desktop/mobile screenshots reviewed, 390px document overflow check passed. Verified local API restarted; localhost:5173 health returns JSON 200 and anonymous auth 401. Limits and initial test-parameter path failure are recorded in RELEASE_REPORT.md. Next: Phase 8 visual/responsive/accessibility review.

## Phase 6 — 2026-10-15

Delivered database dashboard aggregates, exact Decimal totals/conversion, six stages, incomplete/overdue/today task counts and five next follow-ups. UI includes metric cards, Recharts stage/outcome charts, exact values table, linked follow-ups and loading/empty/error/retry states. Recharts loads only on the dashboard route. Lead/task mutations invalidate owner-scoped dashboard caches.

dashboard_backend implemented endpoint and 13 focused PostgreSQL tests, then reviewed frontend read-only without finding concrete issues. Principal integrated and ran the full backend suite: 138 passed with one known warning; Ruff/format/dependency consistency passed. Frontend: 28 passed, lint/build passed, npm audit zero known vulnerabilities. Explicit accessible task-link naming fixed the initial component mismatch; mobile nav wrapping addressed browser overflow. Next: CSV mapping/preview/import/export.

## Phase 5 — 2026-10-15

Delivered task model/migration0003, nested owner-scoped CRUD, due dates and read-only paginated history. Each mutation/history event commits atomically; notes have distinct events. UI provides creation/editing/completion/reopening, inline delete confirmation, overdue/calendar rendering and pagination. No reminder delivery or dependencies added.

followups_backend implemented backend and reviewed the principal's frontend in read-only mode. It found missing description-validation feedback; fixed. Principal integrated everything and tested PostgreSQL and Chromium. Full backend: 125 passed with one known Starlette warning, Ruff/format/dependency consistency passed. Frontend: 25 passed, lint/format/build passed. Browser task flow initially used a synchronous checkbox check; changed to click plus async server-confirmed assertion, then full flow passed. Existing auth, isolation and Kanban browser coverage still passes. Development database migrated and verified API restarted. Next: Phase 6 dashboard metrics/charts.

## Phase 4 — 2026-10-15

Delivered six-stage owner-scoped Kanban, native drag handles, keyboard/touch stage selectors, per-column paginated loading and mutation recovery. Moves are serialized while saving; successful updates refresh shared lead queries/detail cache, while failed writes remove the optimistic move and reload authoritative stages with an error notice. Native HTML drag avoids an extra library; manual within-column ordering and touch drag are outside this slice.

Verification: 23 frontend tests, ESLint, formatting and build passed. Full Chromium auth/CRM flow passed with actual drag, reload persistence, keyboard stage changes, simulated 503 recovery and a second account's empty pipeline. Desktop screenshot reviewed; mobile screenshot and 390px overflow assertion passed. Backend/schema/dependencies unchanged; prior 97-test backend evidence remains Phase 2. No independent agent review or deployment claimed. Next: tasks, deadlines and activity history.

## Phase 0 — 2026-10-15

Environment: Windows PowerShell; empty workspace; no initial Git repository. Available: Git, Node/npm, Python 3.14 and PostgreSQL 18. Docker/uv unavailable. Existing PostgreSQL service responds on 5432; application access is not verified.

Delivered: architecture, phase gates, contributor and ownership rules, local environment template, ignore rules, security/test strategy and draft portfolio/case-study/release documentation. Principal owns integration; independent architecture review is recorded below after completion.

Independent read-only architecture review by the architecture_review subagent completed. Its eight recommendations were incorporated: opaque sessions, same-origin development, relational ownership, transactional activities, validated CSV, explicit export scope, PostgreSQL integration tests and real browser evidence.

Verification: documentation assertions passed for all 12 required nonempty files, local links, UTF-8, reserved directories and empty database configuration. Git ignore checks passed for environment, virtualenv and Node dependency paths. Local Git repository initialized on main; a small Phase 0 documentation/setup commit records this boundary.

Application implementation and testing are deferred to Phase 1 onwards. No existing database or personal configuration was modified.

## Phase 1 — 2026-10-15

Implemented backend users/session models, PostgreSQL migration, auth/profile endpoints and request security. Principal prepared isolated loopback-only local PostgreSQL, guarded database fixtures, integration tests and PowerShell run/setup/check commands. backend_auth implemented backend application files; auth_review independently reviewed them without finding important reproducible issues.

Evidence: 35 tests passed, including Alembic upgrade/downgrade/upgrade and drift check, two-user profile/session isolation, expiration/revocation and real Uvicorn HTTP flow. Ruff lint/format and dependency consistency passed. Dependency audit initially reported project-local pip advisories; upgrading to 26.2.1 removed known findings. The validated environment is pinned.

Fixed initial pytest import configuration and a false test assertion; corrected local .env encoding and added explicit Alembic path separator. One upstream Starlette/HTTPX deprecation warning remains visible. Local trust database and process-local throttle are development-only limitations; no production or browser verification is claimed. Phase 2 is leads CRUD and owner isolation.

## Phase 2 — 2026-10-15

Implemented lead create/list/detail/update/delete, search, status/source filters, allowlisted sorting, stable paginated results, normalized per-owner unique emails, numeric validation and immutable ownership. Added migration 0002 with lead/activity constraints and indexes. Lead mutations and internal activity entries are transactional; owner-scoped edits/deletes lock rows. Database deletion cascades only dependent activities. History API and tasks remain scheduled for Phase 5.

leads_backend implemented application/migration files. Principal integrated the work, wrote tests and documented contracts. leads_review independently confirmed owner/transaction behavior and found NUL text/large page validation gaps. PostgreSQL tests reproduced 503 responses for those invalid inputs; fixes now return 422. Case-insensitive name/company sorting was corrected after its failing integration test.

Evidence: 97 full-suite tests passed (71.93 seconds), including migration preservation of existing accounts/sessions, real Uvicorn CRUD with two users, direct database ownership constraints and activity failure rollback. Ruff lint/format passed on 18 Python files, pip dependency consistency passed and the unchanged dependency audit reported no known vulnerabilities. One upstream Starlette/HTTPX warning remains. Frontend is next in Phase 3; no production deployment or browser CRM flow is claimed.

## Phase 3 — 2026-10-15

Post-phase correction: reproduced HTML fallback for `/api` on the actual localhost:5173 Vite process despite a correct proxy in resolved disk configuration. Restarted the verified project process; JSON 401/auth and 200/health returned. Exact prior runtime config loss is unconfirmed. Added guarded JSON parsing and a component regression for HTML response/retry. Chromium verified the actual registration page without alerts/errors. No backend/database change.

Delivered React/TypeScript/Vite shell, routing, registration/login/logout, owner-scoped query state, contact table/search/filter/sort/pagination, create/edit/detail/notes, native deletion confirmation and profile settings. React Hook Form/Zod handle input validation; amounts remain decimal strings. No fake dashboard or future-feature navigation was introduced. Added npm lockfile, lint/format/build scripts, component tests, isolated Chromium flow and PowerShell frontend commands.

frontend_app implemented the UI and reported source typecheck/lint before its final completion signal was interrupted by an agent usage limit. The independent frontend_review agent also stopped at that limit without a review result; no independent completed review is claimed for this phase. Principal inspected and integrated the files and ran all final verification.

Evidence: 19 component/schema tests passed; ESLint, Prettier, TypeScript/Vite build and npm audit passed. Chromium flow passed end to end, including two accounts, persistence/reload, foreign-ID denial and modal keyboard focus/cancellation/restoration. Screenshots visually reviewed at 1440px and 390px. Initial two component-test failures were mock/selector problems; browser QA then exposed field names contaminated by help/select text and modal focus timing. Stable accessible field names and explicit focus after showModal fixed those cases. Backend code and database migrations were unchanged; its Phase 2 result remains 97 passing tests. Pipeline is next in Phase 4.
