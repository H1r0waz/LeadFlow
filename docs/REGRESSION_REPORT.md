# Phase 9 regression review

Date: 2026-10-15. Scope: local demo only. Final results are recorded in RELEASE_REPORT.md.

## Corrections

- Registration/profile names containing NUL returned database errors (503). They now fail schema validation (422), with input redaction and no account/profile changes.
- Non-CSV API writes now count actual streamed body bytes and reject requests above 256 KiB before JSON parsing. CSV retains its 14 MiB JSON transport limit and 2 MiB parsed text limit. This is a per-request memory bound, not concurrency or production denial-of-service protection.
- `.gitattributes` preserves LF text endings so a Windows checkout does not invalidate Prettier checks. Git checkout filters were checked with `core.autocrlf=true` on representative TSX, CSS, browser-test and component-test files.

## Ownership and transaction coverage

| Resource | Evidence |
| --- | --- |
| Profile/session | Two accounts, immutable ownership, session-bound CSRF, rotation/revocation/expiry and logout replay in test_auth.py |
| Leads/list/search | Foreign read/update/delete denied; list/filter totals scoped; direct ownership constraints and transaction rollback in test_leads.py |
| Tasks | Foreign parent, foreign task and same-user wrong-parent denial for CRUD; composite ownership constraints and rollback in test_tasks.py |
| Activity history | Foreign parent denied, read-only API, transactional creation and scoped cascades in test_tasks.py |
| Dashboard | Isolated aggregates and task/lead joins, anonymous denial and exact Decimal/date cases in test_dashboard.py |
| CSV | Owner-only duplicates/export, current-database revalidation, Origin/CSRF, atomic/partial imports and activity rollback in test_csv_transfer.py |
| Real HTTP/browser | Real Uvicorn flow plus Chromium auth, CRUD, task/history, metrics, stage persistence/recovery, upload/download and account switching |

Fresh Alembic upgrade/downgrade/upgrade and model/schema drift checks run on the guarded disposable PostgreSQL database. Database suites and browser suites must run sequentially because they share that test database. Development data is not reset.

## Dependency and tracked-file review

`pip-audit` reports no known vulnerabilities across 67 installed Python packages. `npm audit` reports zero findings across 309 dependencies in its metadata. These include development dependencies and reflect the advisory snapshot at review time. No dependencies or lockfiles changed in this phase.

| Lockfile | SHA-256 |
| --- | --- |
| backend/requirements.lock | 2b2f2c99693566d831d3d960239317771bcecb204bc4f951efe6845417d5c912 |
| frontend/package-lock.json | 5cb59707d07a2aad4a604b61913453d586c7b586fa572e8fa3c52b3f41037680 |

The initial 73 tracked files were checked for common private-key, access-token and credential-bearing PostgreSQL URL patterns; no matches were found. Git ignore checks confirm `.env`, local audit reports, virtualenv, Node dependencies and built files are excluded. This lightweight pattern/source review is not an exhaustive secret-history scan or independent security audit. Raw audit JSON is kept only under ignored `.local/`.

## Remaining boundaries

- Local PostgreSQL trusts loopback clients; local HTTP uses non-Secure cookies. Production hosting is not configured or authorized.
- Auth throttling is process-local; backups, production least-privilege credentials, shared limits, public HTTPS and operational monitoring need separate work before public use.
- No password recovery, email verification, real reminder delivery or real customer data.
- CSV/export processing buffers bounded input or the owner's output in memory; large-account export and concurrent load remain untested.
- Chromium covers the critical flow; other browser engines, physical devices, screen readers and production performance remain unverified.
- The existing Starlette/HTTPX deprecation and Playwright color-environment warnings remain visible.
- At this Phase 9 review, fictional seeding/runbook preparation remained pending. Phase 10 subsequently completed it; see RELEASE_REPORT.md and DEMO_GUIDE.md.
