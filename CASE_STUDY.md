# LeadFlow case study

## Problem

Independent professionals often track prospects, conversations and next actions across separate notes and spreadsheets. LeadFlow explores a focused workspace for that workflow. This is a personal demonstration: no client commission, customer research or business-outcome measurement is claimed.

## Solution and features

User-isolated lead management, search/filter/sort/pagination, a six-stage pipeline, notes, dated tasks and activity history share one workspace. A database dashboard reports counts/value, outcomes, conversion and next follow-ups. CSV mapping, row validation, duplicates and partial-import consent are visible before writes. Settings offers an opt-in fictional seed restricted to empty workspaces.

The green/ivory visual system emphasizes clear navigation and readable forms. Tables/board deliberately scroll horizontally on narrow screens. Keyboard alternatives support stage changes, scrolling, modal cancellation and main-content navigation.

## Architecture

React/TypeScript/Vite supplies presentation, React Router navigation, TanStack Query server state and React Hook Form/Zod validation. FastAPI authorizes and validates operations. SQLAlchemy/Alembic and PostgreSQL provide migrations, constraints and transactions. Recharts loads only on the dashboard route. No external API, queue or hosting provider is required.

Opaque revocable sessions avoid browser-stored tokens. Composite ownership constraints protect related tasks/history. Decimal/NUMERIC preserves monetary precision. Changes and their activity entries commit atomically. Separate lead/task aggregates prevent join multiplication in metrics.

## Decisions and tradeoffs

- Native drag handles/selects avoided another dependency and support keyboard/touch; touch drag gestures and manual ordering are not implemented.
- One normalized contact email per owner supplies an explicit MVP identity rule. Multiple opportunities per contact require a future model.
- CSV preview is read-only; confirmation revalidates current data. Export neutralization adds an apostrophe retained on reimport.
- Seeding refuses populated accounts rather than resetting or overwriting edits. It creates no demo password and records truthful creation history.
- A separate loopback cluster and guarded disposable database protect unrelated local database services during development/testing.

## Implementation and evidence

Delivered through eleven local phase boundaries, with backend/frontend/QA delegation where useful and principal integration. Commands, failures, corrections and limits are recorded in docs/PHASE_LOG.md and RELEASE_REPORT.md. Reproduced corrections include NUL/oversized input errors, API HTML fallback handling, modal focus timing, long-name desktop overflow and Git/Prettier line-ending drift.

Final local verification: 183 backend tests, 34 frontend tests and three Chromium journeys passed. Coverage includes migration rollback/drift, session lifecycle, owner denial, exact metrics, transaction rollback, CSV, seed consent/refusal, real drag, upload/download and responsive/keyboard behavior. Dependency advisory checks reported no known vulnerabilities in the reviewed snapshot. Screenshots are actual local renders of fictional fixture data.

## Limitations

This is a local portfolio MVP. Loopback database trust, HTTP cookies and process-local throttling require production configuration/replacement before public operation. Hosting/TLS, backups, monitoring, physical-device/other-browser/screen-reader coverage and load performance remain unverified. There is no password recovery, email verification, team account or reminder delivery. Fictional sales estimates are not revenue or measured results.

## Possible improvements

Production infrastructure/least-privilege credentials, shared throttling, password recovery/email verification, broader browser/assistive-technology coverage, search/export performance, multiple opportunities per contact and optional reminders/integrations. These are future options, not delivered commitments.
