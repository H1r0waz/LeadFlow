# Public portfolio demonstration

The owner authorized Render Free and Neon Free on 2026-10-15. No paid resources were requested. Source: https://github.com/H1r0waz/LeadFlow. Live URL and final verification are pending the first deployment.

## Runtime

- One Render Docker web service in Virginia. Node 24 builds the existing React SPA; Python 3.14 serves FastAPI and static assets under one origin. The final container runs as an unprivileged OS user.
- One isolated Neon PostgreSQL 18 project in AWS US East 1. Existing projects and local databases are not reused.
- `DATABASE_URL`: secret `postgresql+psycopg` connection for the limited `leadflow_app` role, with TLS. `MIGRATION_DATABASE_URL`: separate secret direct connection for the migration owner. Never commit either value.
- Render supplies `RENDER_EXTERNAL_URL` and `PORT`; optionally set `FRONTEND_ORIGIN` for a custom HTTPS domain. The hosted entry point forces Secure cookies and one Uvicorn worker.
- Startup applies existing Alembic migrations before binding `0.0.0.0:$PORT`. This startup migration shortcut is for this single-instance demo; use a serialized release migration job before scaling instances.
- Static navigation routes fall back to the SPA. Missing API routes/assets stay 404. Database health is `/api/v1/health`; process health is `/health`.

## Limits

Render Free sleeps after inactivity and may take about a minute to wake. Free usage quotas are shared with the workspace's other services; no paid upgrade is authorized. Neon Free also has usage/storage limits. This is a fictional-data portfolio demo, with no uptime commitment. Rate limits are process-local and reset on restart. Email verification, password recovery, backup/restore drills, shared throttling and load testing are not delivered. Do not enter real customer data or reuse a password from another service.

## Verification

Local frontend production build passed. A PostgreSQL hosting integration test passed for SPA routing, static assets, unknown API 404s, registration, authenticated session and Secure cookie attributes. Ruff passed. Docker is unavailable locally, so the container build and real TLS/authenticated flow must be verified on Render before declaring the demo live.

The public source history uses GitHub noreply addresses. Original local history is preserved separately and must not be pushed publicly. Update the public tree without publishing the old local commits.
