# Verification

Final local checks: **183 backend tests, 34 frontend tests and three Chromium journeys passed**. The supported verification environment is Windows/PowerShell, Python 3.14.4, Node 24.14.1/npm 11.11.0 and PostgreSQL 18.6.

## Run all checks

Install dependencies, start the project database and install Chromium if needed (npx playwright install chromium in frontend/), then run from the root:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1
~~~

The script stops on failure and runs these helpers in order:

1. backend.ps1 test — full PostgreSQL/API/migration/live-HTTP suite.
2. backend.ps1 check — Ruff lint/format and pip dependency consistency.
3. backend.ps1 audit — installed Python dependency advisories.
4. frontend.ps1 test — Vitest/React Testing Library via the explicit test:run script.
5. frontend.ps1 check — ESLint, Prettier, TypeScript/Vite build and npm audit.
6. frontend.ps1 browser — all Chromium journeys with isolated temporary servers.

Audit steps need advisory-service network access. Individual helpers can run separately; do not overlap database/browser suites.

## Database safety

Tests require postgresql+psycopg, exact database leadflow_test, loopback host and port 55433 before any reset. Fixtures apply Alembic upgrade/downgrade/upgrade and drift checks, then truncate only that disposable database. Do not place work you want to retain there. Development data is not reset. SQLite is not substituted for PostgreSQL constraints, transactions or NUMERIC behavior.

Browser tests use the same guarded test database on temporary API/Vite ports 8001/5174, one worker and no server reuse. Account identifiers/passwords are random runtime fixtures. Traces are disabled; screenshots and test artifacts remain ignored except selected fictional presentation images.

## Coverage

| Area | Important checks |
| --- | --- |
| Sessions/auth | Hash/digest storage, rotation, expiry/revocation/replay, Origin/CSRF/CORS, throttling, profile isolation, redacted errors |
| Leads | CRUD/defaults/validation, exact USD values, filters/sort/pages, escaped search, unique owner email, foreign denials, locks/history rollback/cascades |
| Follow-ups/history | Nested owner/parent checks, strict dates/booleans, CRUD/complete/reopen, no-op events, pagination, composite constraints and rollback |
| Dashboard | Six-stage zeros, exact Decimal totals/conversion, no task multiplication, deadline boundaries, stable earliest five and owner isolation |
| CSV | UTF-8/BOM/quoting/multiline, mapping/limits, invalid rows, duplicates, current-data revalidation, atomic/partial writes, rollback, safe export/round trip |
| Hardening | NUL registration/profile inputs, normal/streamed body caps, maximum escaped notes and protected test database |
| Fictional demo | 12/8/20 counts, stages/value/date metrics, owner isolation, auth/CSRF, repeat/existing-data refusal, preserved edits and atomic rollback |
| Frontend | Auth/cache/expired session, forms/table/filters, pending/empty/errors, pipeline recovery/pagination, metrics, CSV confirmation and seed consent/conflict |
| Real HTTP/browser | Uvicorn session/CRUD flow; full CRM/CSV/account switching; responsive/keyboard review; seed presentation and repository CSV fixture |

## Browser/visual review

The responsive journey checks login/register plus nine protected views at 320, 768 and 1440 pixels, long unbroken content, no whole-document overflow, field descriptions, main headings, route title/focus, skip activation, keyboard table/board scrolling, dashboard 503 retry, empty metrics and reduced-motion loading. Sampled solid-background copy/table/stage colors meet a tested 4.5 contrast ratio; primary/navigation heights are at least 44px.

The CRM journey checks real native drag, reload persistence, keyboard stage changes, simulated failed-write recovery, task/history changes, actual upload/download and two-account isolation. The demo journey loads 12 fictional leads/eight tasks through Settings, verifies live metrics, reload/refusal and demo/contacts.csv preview (two valid/one duplicate/one invalid).

Selected dashboard/mobile/pipeline/import images are actual browser captures reviewed visually. JSDOM mocks scrollTo and Recharts rendering only; browser tests use real scrolling/charts.

## Limits and provenance

A complete assistive-technology, real-device, browser-zoom, Firefox/WebKit or production-load/TLS audit was not performed. Clean-machine installation and other operating systems remain unverified. The existing Starlette/HTTPX deprecation and Playwright color-environment warnings remain visible.

Phase history, initial failures and exact final commands/results are in [RELEASE_REPORT.md](RELEASE_REPORT.md) and [docs/PHASE_LOG.md](docs/PHASE_LOG.md). Phase 9 ownership/audit lockfile evidence is in [docs/REGRESSION_REPORT.md](docs/REGRESSION_REPORT.md). Passing tests and advisory checks are bounded evidence, not a production safety guarantee.
