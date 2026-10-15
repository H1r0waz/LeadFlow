# LeadFlow contributor instructions

## Scope and ownership

- Build the personal demo described in ROADMAP.md. Do not represent it as real client work.
- Product UI and project documentation are in English. User progress reports are in Spanish. PORTFOLIO_DESCRIPTION.md includes Spanish and English.
- Inspect existing work and preserve unrelated changes. Keep changes within the current phase unless an earlier dependency needs repair.
- Preserve configured model and reasoning effort. Prefer compact Ponytail/Caveman workflows. Graphify is only for large-repository or dependency analysis. Security tooling is only for security reviews or sensitive changes. Context7 is only for current library documentation.
- For OpenAI product questions, consult the configured OpenAI Developer Docs MCP first. Do not use, connect or authorize other external connectors without an explicit user request. Do not add heavy redundant workflows.

## Implementation

- Use React/TypeScript/Vite and FastAPI/SQLAlchemy 2/PostgreSQL. Document any stack change and its reason.
- Frontend owns presentation and client validation; backend owns authorization, validation, metrics and CSV import decisions.
- Every user resource query must be scoped to the authenticated owner. Never trust a client-supplied user_id.
- Use Alembic for schema changes. Use PostgreSQL for backend integration tests and an isolated disposable test database with an explicit test database name check before resetting it.
- Do not hardcode secrets, demo passwords or personal information. Use only fictional seed data.
- Run the smallest relevant verification after each change and phase. Never claim unexecuted tests passed.

## Delegation and Git

- The principal agent integrates and verifies all delegated work.
- Backend agent owns backend/. Frontend agent owns frontend/. QA can review both but coordinates edits first. Principal owns root configuration and documentation.
- Agents sharing this checkout must not run Git mutations concurrently or edit the same files. Principal manages commits. Use separate worktrees only when actual concurrent changes require them.
- Main is the stable integration branch. Implement one phase at a time on phase branches and integrate only after its checks pass. Make small descriptive local commits at stable phase boundaries.
- Explicit permission is required before publishing, production deployment, paid resources/APIs/plans, introducing credentials, exposing personal information or deleting substantial existing work.

## Completion evidence

- Update ROADMAP.md, docs/PHASE_LOG.md and RELEASE_REPORT.md at each phase boundary.
- Record what ran, what passed, what failed and what remains untested.
- No release claim until the full definition of done in ROADMAP.md is satisfied.
