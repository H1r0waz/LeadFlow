# Architecture

LeadFlow is a React SPA, a FastAPI API and PostgreSQL in one repository. No queue, cache server, external API or generic repository framework is required. The hosted Docker entry point serves the built SPA and API from one HTTPS origin on Render, backed by an isolated Neon PostgreSQL database. SPA navigation falls back to index.html; unknown API routes and missing assets retain 404 responses. Local Vite development is unchanged. See docs/DEPLOYMENT.md for deployment evidence and limits.

## Frontend

Routes: /login, /register, /leads, /leads/new, /leads/:id, /leads/:id/edit, /pipeline, /dashboard, /import and /settings. Root redirects to leads. A protected shell loads the session before owner data. React Hook Form/Zod validate forms; the server remains authoritative. Applied filters are URL state. Amounts remain decimal strings.

TanStack Query keys include owner/resource IDs. Writes invalidate related caches; account changes cancel queries and clear private state. Actual 401 responses return to login; failed session checks show retry. No tokens/contact data persist in localStorage/sessionStorage. Dashboard/Recharts and CSV screens load as separate route chunks.

Pipeline stages have independently paginated queries (20/page). Native drag payloads contain IDs resolved against loaded cards; native selects support keyboard/touch. Moves are serialized, persisted with PATCH and recovered/refetched on failure. Route changes update titles, main focus and scroll; native deletion dialogs contain keyboard focus and restore it on cancellation.

Vite localhost:5173 proxies /api to 127.0.0.1:8000, preserving Origin. Browser tests use temporary ports 5174/8001.

## Authentication and request handling

Opaque random sessions use an HttpOnly, host-only, SameSite=Lax cookie scoped to /api/v1. PostgreSQL stores only its SHA-256 digest, owner, CSRF digest and expiry. Passwords use Argon2id. Login rotates the presented session; logout revokes it. A readable leadflow_csrf cookie at / and the auth response supply the session-bound write token. Secure cookies are configurable for future HTTPS use.

All API writes require exact configured Origin; authenticated writes also require CSRF. Credentialed CORS is allowlisted. Login/register have bounded process-local throttling. Normal API writes are capped at 256 KiB of streamed body bytes before JSON parsing; CSV POST transport is capped at 14 MiB. Validation errors omit submitted values; safe 503 errors hide SQL parameters. Resource responses are no-store.

## Data and ownership

| Model | Important fields/constraints |
| --- | --- |
| User | UUID, unique normalized email, password hash, name, created_at |
| Session | token digest, user_id, CSRF digest, expiry, created_at |
| Lead | UUID, user_id, contact fields, stage, NUMERIC(14,2) estimate, notes, timestamps; unique (user_id,email) and (id,user_id) |
| Task | UUID, lead_id/user_id, title/description, DATE deadline, strict completion boolean, created_at |
| Activity | UUID, lead_id/user_id, type/description, created_at; read-only API |

Every resource query includes authenticated ownership. Missing/foreign IDs return the same 404. Composite task/activity foreign keys reference (lead_id,user_id) and cascade with the lead. Owner/stage, owner/created and owner/deadline indexes support access paths. Timestamps use UTC; calendar deadlines display without timezone shifts.

Lead/task mutations and history share transactions. Lead edits/deletion lock the owned row; task changes lock the parent. No-op changes produce no events; notes have distinct history. Contact email is normalized and unique per owner; null emails may repeat. Multiple opportunities per contact need a separate future model.

## API contract

Routes are under /api/v1. All resources require a session; authenticated writes require Origin/CSRF.

| Resource | Routes |
| --- | --- |
| Auth | POST /auth/register, /auth/login, /auth/logout; GET/PATCH /auth/me |
| Leads | GET/POST /leads; GET/PATCH/DELETE /leads/{id} |
| Tasks | GET/POST /leads/{id}/tasks; PATCH/DELETE /leads/{id}/tasks/{task_id} |
| History | GET /leads/{id}/activities |
| Dashboard | GET /dashboard?today=YYYY-MM-DD |
| CSV | POST /csv/inspect, /csv/preview, /csv/import; GET /csv/export |
| Fictional seed | POST /demo/seed; 201 counts or 409 for a populated workspace |

Lists return items,total,page,page_size; default size 20, maximum 100. Pages are positive and capped at 2147483647. Lead q searches literal case-insensitive name/company/email/phone substrings; source is exact case-insensitive; stage filters use fixed slugs. Sort fields are allowlisted, name/company are case-insensitive and UUID breaks ties. SQL parameters are bound and LIKE metacharacters escaped.

Lead limits: name 1–150, company 200, email 254, phone 50, source 100, notes 10,000; nonnegative USD estimate up to 12 integer/two decimal digits. Only email accepts explicit null. Empty PATCH/unknown fields are rejected. Task title 1–200, description 2,000, strict YYYY-MM-DD deadline; past dates are allowed. IDs/ownership/timestamps are server-managed.

## Metrics

Stages: new, contacted, interested, proposal_sent, won, lost. Open excludes won/lost. Conversion is won/(won+lost)*100, zero with none closed, rounded using Decimal HALF_UP. Lead/task aggregates run separately to prevent join multiplication. The stage table includes zeros. All incomplete tasks contribute to counters; the next-task join lists the earliest five, including overdue. UI uses its local calendar date; API default is UTC. No invented history, weighted forecasts or collected-revenue metrics.

## CSV and seed writes

CSV uses the standard parser/shared LeadCreate validation: UTF-8/BOM, commas, 2 MiB text, 5,000 logical records and 32 columns. Mapping requires name and distinct supported fields/headers. Inspection/preview never write; logical row numbers start at 2. Invalid rows block saving unless partial import is explicit. Owned/earlier valid file emails are skipped without overwriting. Confirmation locks the owner, revalidates current emails and commits valid leads/history atomically. Unique-email races return 409. Export includes all owned lead fields without IDs and prefixes formula-like cells with an apostrophe retained on reimport.

The seed locks the owner and refuses any existing lead. It creates 12 validated fictional leads, eight tasks and 20 truthful creation events atomically; it creates no account/credential. Repeated requests are refused, preserving edits. Deadlines are relative to the server UTC loading day. No migration or reset operation is needed.

## Runtime and verification

Local PostgreSQL listens on loopback:55433. Tests require the exact disposable leadflow_test URL before cleanup. Alembic has users/sessions, leads/activities and tasks migrations; tests run upgrade/downgrade/upgrade and drift checks. The verification script keeps backend/browser suites sequential. Dependencies use Python/npm lockfiles. See SECURITY.md for public-operation boundaries and RELEASE_REPORT.md for evidence.
