# Security and operating boundaries

LeadFlow is a local personal demonstration using fictional data. It has no configured public deployment, external integration or paid resource. This document records implemented controls and limits; it is not an independent security certification.

## Authentication and access

- Passwords are hashed using Argon2id. Opaque random session/CSRF tokens are stored as digests, with expiry, login rotation and logout revocation.
- Session cookies are HttpOnly, host-only and SameSite=Lax; Secure is configurable for future HTTPS. No browser token persistence is enabled.
- Every resource read/write includes authenticated ownership. Foreign/missing IDs return the same 404. Composite lead/owner foreign keys prevent cross-account task/history attachment.
- Writes require exact configured Origin; authenticated writes additionally require session-bound CSRF. Credentialed CORS is restricted. Login/register throttling has bounded process-local storage.
- Server schemas reject unknown fields/ownership assignment and invalid values. Registration/profile names and stored CRM text reject NUL. Errors omit submitted input; database errors are generic and SQL parameters hidden.

## Transactions and file handling

Lead/task changes and activity entries are atomic; edits lock the owned lead/parent. Tests inject history failures and verify rollback. Dashboard aggregates and task joins are owner-scoped; responses are no-store and UI caches clear at account boundaries.

Normal API writes are limited to 256 KiB before JSON parsing, measured from actual body bytes. CSV POST retains a 14 MiB JSON transport cap, 2 MiB UTF-8 text cap, 5,000 records and 32 columns. Mapping/headers/rows are validated on the server. Preview never writes; confirmation revalidates current duplicates and requires explicit partial-import choice when rows are invalid. Existing contacts are not overwritten.

CSV export excludes IDs/ownership/foreign accounts, quotes cells and prefixes spreadsheet formula-like text with an apostrophe. The apostrophe is retained on reimport. Spreadsheet-specific application compatibility and large-account output remain untested.

The opt-in seed is authenticated and CSRF-protected. It locks the owner, refuses any existing lead and commits fictional leads/tasks/history together. It creates no account/password, never resets work and preserves edits on repeat refusal. User consent is required by the UI; ownership and empty-workspace rules remain authoritative on the server.

## Configuration and dependencies

Secrets/configuration belong only in ignored .env or environment variables. No credentials or real personal records are supplied. Test credentials are generated at runtime; traces are disabled. Selected repository screenshots contain fictional seed data only.

The latest pip-audit/npm audit runs reported no known vulnerabilities across the installed Python/npm snapshot, including development dependencies. This is time-specific advisory evidence, not proof of absence. A lightweight tracked-file credential-pattern/ignore review found no common secret patterns; no exhaustive repository-history scan or independent audit is claimed. See [regression evidence](docs/REGRESSION_REPORT.md) and [release report](RELEASE_REPORT.md).

## Local-only boundaries

The isolated PostgreSQL cluster on 127.0.0.1:55433 trusts loopback clients and has a broad local administrator role. Any local process can access it. Do not expose it or use real data. Current HTTP cookies are not Secure; real TLS behavior is untested. Rate limits reset on restart and are not shared across workers.

Before public use: configure production hosting/TLS, least-privilege database credentials, backups/recovery, shared throttling and operational monitoring. Also assess concurrent load, large exports and broader browser/assistive-technology behavior. Password recovery, email verification, reminders and team accounts are not delivered.

Publishing, production deployment, paid resources or introducing credentials require explicit user authorization. Report suspected vulnerabilities privately to the owner without credentials or personal records.
