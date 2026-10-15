# Public portfolio demonstration

The owner authorized Render Free and Neon Free on 2026-10-15. No paid resources were requested. Source: https://github.com/H1r0waz/LeadFlow. **Live demo: https://leadflow-tcdh.onrender.com**. Create your own account and use Settings to load fictional data.

## Runtime

- One Render Docker web service in Virginia. Node 24 builds the existing React SPA; Python 3.14 serves FastAPI and static assets under one origin. The final container runs as an unprivileged OS user.
- One isolated Neon PostgreSQL 18 project in AWS US East 1. Existing projects and local databases are not reused.
- `DATABASE_URL`: secret `postgresql+psycopg` connection for the limited `leadflow_app` role, with TLS. `MIGRATION_DATABASE_URL`: separate secret direct connection for the migration owner. Never commit either value.
- Render supplies `RENDER_EXTERNAL_URL` and `PORT`; optionally set `FRONTEND_ORIGIN` for a custom HTTPS domain. The hosted entry point forces Secure cookies and one Uvicorn worker.
- Automatic deployment is disabled. Publish a reviewed source change, then trigger a manual deployment for this service. Documentation-only updates do not require a restart.
- Startup applies existing Alembic migrations before binding `0.0.0.0:$PORT`. This startup migration shortcut is for this single-instance demo; use a serialized release migration job before scaling instances.
- Static navigation routes fall back to the SPA. Missing API routes/assets stay 404. Database health is `/api/v1/health`; process health is `/health`.

## Limits

Render Free sleeps after inactivity and may take about a minute to wake. Free usage quotas are shared with the workspace's other services; no paid upgrade is authorized. Neon Free also has usage/storage limits. This is a fictional-data portfolio demo, with no uptime commitment. Rate limits are process-local and reset on restart. Email verification, password recovery, backup/restore drills, shared throttling and load testing are not delivered. Do not enter real customer data or reuse a password from another service.

## Verification

Verified on 2026-10-15:

- Four focused local PostgreSQL hosting tests passed: SPA/static routing, unknown API 404s, HTTPS/Secure-cookie requirements, authenticated registration and migration/runtime credential separation. Ruff lint/format checks and the frontend production build passed. The pre-existing full suites were not rerun for this deployment wrapper.
- Render built the Docker image successfully and reported deployment `dep-db8f6aks728c7396vnq0` live, running source commit `07ee039ef250f71a6289d950c1fbe5cfa6f73375`.
- Thirty checks passed against the actual HTTPS endpoint: process/database health, deep-link SPA navigation, unknown API 404, anonymous denial, registration, Secure cookies, session, missing-CSRF/foreign-origin denial, fictional seed/repeat refusal, leads, pipeline/notes, task creation/completion, history/dashboard, CSV preview/import/export, logout/revocation, login, persistence and second-owner isolation.
- Chromium browser login loaded the persisted 13-contact QA workspace; dashboard charts and values rendered after a full page reload. All data was fictional. Generated QA passwords were not committed or supplied as a shared demo login.
- A Render error-log query returned no error-level entries after these checks.

The QA workspace has 13 contacts because it includes one CSV import in addition to the 12 seeded contacts. New visitor accounts remain empty until they opt into seeding. Docker was built on Render; no local Docker installation was used. Load/availability testing, an inactivity wake-up drill and independent restore testing were not performed.

Platform references: [Render Free limitations](https://render.com/docs/free), [Neon Free plan](https://neon.com/docs/introduction/plans).

The public source history uses GitHub noreply addresses. Original local history is preserved separately and must not be pushed publicly. Update the public tree without publishing the old local commits.
