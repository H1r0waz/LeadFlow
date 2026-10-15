# Local demo guide

## Prepare

Follow the two-terminal startup commands in [README.md](../README.md). The current Windows environment has been exercised; a fresh-machine installation and other operating systems have not. Open http://localhost:5173, register with a password of your choice and keep all information fictional. No shared/default password is supplied.

In Settings, tick **Add fictional demo data to my empty workspace**, then **Load fictional demo**. Select **Explore dashboard**. This creates 12 leads, eight tasks and 20 creation-history entries for the signed-in account. It refuses any account that already has leads and never resets data or user edits. Reloading/retrying does not duplicate the seed. To repeat the original presentation, use an empty workspace; there is no bulk-reset action.

## Five-minute walkthrough

1. **Dashboard:** show 12 total leads, eight open, two won, two lost, USD 12,400 open value, USD 4,400 won value and 50% conversion. These are fictional estimates; conversion is won divided by closed leads.
2. **Pipeline:** two contacts start in each of six stages. Drag Mara Vale to Contacted, or use the stage selector. Reload to show persistence. Moving between open stages leaves the total open value unchanged.
3. **Lead detail:** open Mara Vale. Edit notes, add or complete a task and inspect history. Seed history describes creation in an initial stage; it does not invent earlier conversations. Task dates are relative to the UTC loading day and do not move on later visits.
4. **Leads table:** search a fictional name/company, filter by stage/source and change sort. Clear filters to return to all leads. On narrow screens, focus the table and use arrow keys or horizontal scrolling for more columns.
5. **CSV:** open Import & export and upload [demo/contacts.csv](../demo/contacts.csv). Map name to Contact, status to Stage and estimated_value to Value. Company/Email/Source/Notes match automatically. Preview should show **2 valid, 1 duplicate and 1 invalid** in an unmodified seeded workspace. Preview writes nothing. Select partial import and review/confirm only if you want the two valid rows; the total then becomes 14. Download Export all leads to inspect owned data.
6. **Account boundary:** sign out. A separate newly registered account starts empty and cannot see this workspace. Do not use real personal/client data.

Selected [screenshots](images/) are actual seeded local renders. Browser tests reproduce seeding, metrics, persistence/refusal and this sample CSV preview. Existing CRM coverage verifies task changes, real drag, export/download and account isolation.

## Expected seed snapshot

| Stage | Leads | Estimated USD value |
| --- | --- | --- |
| New | 2 | 2,050.00 |
| Contacted | 2 | 3,000.00 |
| Interested | 2 | 2,750.00 |
| Proposal sent | 2 | 4,600.00 |
| Won | 2 | 4,400.00 |
| Lost | 2 | 1,600.00 |

Eight tasks include one completed task; seven remain incomplete. On the seed's UTC date, one incomplete task is overdue and one due today. Browser-local dates can change those labels around midnight. Metrics reflect later edits; loading the page does not restore original values.

## Troubleshooting

- **Port 5173/8000 occupied:** inspect the process before stopping it; do not kill an unrelated service. The frontend requires its exact configured origin. This project's database uses 55433, leaving another PostgreSQL service alone.
- **Database unavailable / 503:** start scripts/database.ps1 start, check /api/v1/health and run migrations. Logs are under ignored .local/. Do not print configuration containing credentials.
- **HTML instead of API JSON:** restart the project's Vite/API terminals, then verify http://localhost:5173/api/v1/health returns JSON. This symptom was previously reproduced with a stale Vite process.
- **Demo button disabled:** the workspace contains contacts, availability is pending or consent is not ticked. Existing work is preserved. Retry an explicit availability error; there is no seed reset.
- **CSV rejected:** use UTF-8, commas and headers within 2 MiB/5,000 records/32 columns. Map name and fix errors or explicitly permit valid rows only. Exported formula-like cells gain a literal apostrophe.
- **Chromium missing:** from frontend/, run npx playwright install chromium, then scripts/verify.ps1 from the root. Do not run backend/browser database suites concurrently.

## Stop

Use Ctrl+C in each API/frontend terminal. Stop the project database with powershell -NoProfile -ExecutionPolicy Bypass -File scripts/database.ps1 stop. Stopping does not delete data. No production deployment or paid service is part of this demo.
