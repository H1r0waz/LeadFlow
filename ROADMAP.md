# LeadFlow roadmap

Phases 0–10 are complete. Authentication, CRM, dashboard and CSV transfer are verified locally through React, API and PostgreSQL. Focused visual, responsive and keyboard review is complete in Chromium. Local regression and dependency review are complete. Safe fictional seeding, a demo guide, final portfolio copy and release evidence are complete. The result is a verified local portfolio MVP; public deployment is not part of this delivery.

| Phase | Scope | Exit evidence | State |
| --- | --- | --- | --- |
| 0 | Audit, architecture, setup, agent ownership | Tool audit, reviewed design, tracked repository and phase documentation | Complete |
| 1 | Backend configuration, PostgreSQL migration, registration and sessions | Fresh migration/rollback, startup, auth/session/CSRF tests on PostgreSQL | Complete |
| 2 | Leads CRUD, search, filters, sort, pagination and owner isolation | CRUD, validation and two-user denial tests on every lead resource operation | Complete |
| 3 | React shell, routing, auth, lead forms/table/detail | Typecheck/build, lint, 19 component/schema tests and real Chromium flow | Complete |
| 4 | Persisted Kanban and drag and drop | Stage/activity transaction tests, UI rollback and real browser drag plus keyboard alternative | Complete |
| 5 | Notes, tasks, deadlines and activity history | Cross-user task/activity tests and completion/history UI checks | Complete |
| 6 | Database dashboard metrics and charts | Fixture-based metric assertions and dashboard loading/empty/error tests | Complete |
| 7 | CSV upload, mapping, preview, validation, import and export | Malformed rows, duplicates, owner scope, safe export and round-trip tests | Complete |
| 8 | Visual polish, responsive and accessibility | Browser review at mobile/desktop widths, keyboard navigation and state review | Complete |
| 9 | Regression, hardening and dependency review | Full relevant tests/lint/build, dependency audit and critical browser flow | Complete |
| 10 | Fictional seed, demo instructions, portfolio and final report | Repeatable local launch and evidence-based release documentation | Complete |

## Working strategy

The main branch is the stable integration point. Use one local `phase-N-short-name` branch per implementation phase. The principal integrates stable phase commits. Backend and frontend agents own separate directories; QA reviews implementation and test evidence. Only the principal mutates Git in a shared checkout. Independent read-only reviews may run concurrently. No remote or production deployment is configured.

## Definition of done

- [x] Frontend compiles and backend starts against PostgreSQL.
- [x] Fresh migrations and rollback/upgrade work for the current users/session/lead/activity schema.
- [x] Registration, login, logout and expired/revoked sessions work at the API level.
- [x] Every resource endpoint has tested multiuser isolation.
- [x] Complete leads CRUD, search, filtering and sorting work at the API level.
- [x] Pipeline stage changes persist; real drag and drop works in Chromium.
- [x] Notes, activities, tasks and deadlines work.
- [x] Dashboard/chart values come from verified database queries.
- [x] CSV mapping, preview, row validation, duplicate handling, import and export work.
- [x] Fictional seed is repeatable and cannot silently reset existing work.
- [x] Responsive UI, keyboard operation and loading/empty/error states are reviewed.
- [x] Backend/frontend critical tests, lint, formatting and build pass.
- [x] Dependencies and tracked files are reviewed for vulnerabilities and secrets.
- [x] Documentation describes reproducible startup, evidence and remaining limits.

Each phase ends with tests, corrections and an update to docs/PHASE_LOG.md and RELEASE_REPORT.md. A missing prerequisite is reported explicitly, never replaced with a fabricated passing result.
