import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('register, manage a lead, switch accounts and preserve ownership in the browser', async ({
  page,
  context,
}) => {
  const suffix = randomBytes(6).toString('hex');
  const email = `leadflow-e2e-${suffix}@example.org`;
  const secondEmail = `leadflow-e2e-second-${suffix}@example.org`;
  const password = randomBytes(24).toString('base64url');
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(error.message));
  await page.goto('/register');
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Fictional Portfolio User');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByText('Your next connection starts here.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Add lead', exact: true }).click();
  await page.getByLabel('Full name *', { exact: true }).fill('Alex Rowan');
  await page
    .getByLabel('Company', { exact: true })
    .fill('Northlight Fictional Studio');
  await page
    .getByLabel('Email address', { exact: true })
    .fill(`contact-${suffix}@example.org`);
  await page
    .getByLabel('Estimated value (USD)', { exact: true })
    .fill('1200.50');
  await page.getByLabel('Source', { exact: true }).fill('Referral');
  await page
    .getByLabel('Notes', { exact: false })
    .fill('Fictional contact for browser verification.');
  await page.getByRole('button', { name: 'Create lead', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Alex Rowan', exact: true }),
  ).toBeVisible();
  const detailUrl = page.url();
  await page
    .getByRole('textbox', { name: 'Task title', exact: true })
    .fill('Send fictional proposal');
  await page.getByLabel('Due date', { exact: true }).fill('2020-01-02');
  await page
    .getByRole('textbox', { name: 'Task description', exact: true })
    .fill('Fictional follow-up context.');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(
    page.getByText('Task created: Send fictional proposal', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Overdue ·', { exact: false })).toBeVisible();
  await page.goto('/dashboard');
  await expect(
    page.getByRole('region', { name: 'Total leads', exact: true }),
  ).toContainText('1');
  await expect(
    page.getByRole('region', { name: 'Open pipeline value', exact: true }),
  ).toContainText('$1,200.50');
  await expect(
    page.getByRole('region', { name: 'Incomplete follow-ups', exact: true }),
  ).toContainText('1 overdue');
  await expect(
    page.getByRole('link', {
      name: 'Send fictional proposal Alex Rowan',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  const dashboardScreenshots = fileURLToPath(
    new URL('../../.local/screenshots/', import.meta.url),
  );
  await mkdir(dashboardScreenshots, { recursive: true });
  await page.screenshot({
    path: `${dashboardScreenshots}/dashboard-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `${dashboardScreenshots}/dashboard-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page
    .getByRole('link', {
      name: 'Send fictional proposal Alex Rowan',
      exact: true,
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole('checkbox', {
      name: 'Complete Send fictional proposal',
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole('button', {
      name: 'Edit task Send fictional proposal',
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: 'Task title', exact: true })
    .fill('Review fictional proposal');
  await page.getByLabel('Due date', { exact: true }).fill('2030-01-02');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(
    page.getByText('Task updated: Review fictional proposal', { exact: true }),
  ).toBeVisible();
  const completion = page.getByRole('checkbox', {
    name: 'Complete Review fictional proposal',
    exact: true,
  });
  await completion.click();
  await expect(completion).toBeChecked();
  await page.goto('/dashboard');
  await expect(
    page.getByRole('region', { name: 'Incomplete follow-ups', exact: true }),
  ).toContainText('0');
  await page.goto(detailUrl);
  await expect(
    page.getByText('Task completed: Review fictional proposal', {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(completion).toBeChecked();
  await completion.click();
  await expect(completion).not.toBeChecked();
  await expect(
    page.getByText('Task reopened: Review fictional proposal', { exact: true }),
  ).toBeVisible();
  const followupScreenshots = fileURLToPath(
    new URL('../../.local/screenshots/', import.meta.url),
  );
  await mkdir(followupScreenshots, { recursive: true });
  await page.screenshot({
    path: `${followupScreenshots}/followups-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole('button', {
      name: 'Delete task Review fictional proposal',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Keep task', exact: true }).click();
  await expect(completion).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Delete task Review fictional proposal',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Confirm delete task', exact: true })
    .click();
  await expect(
    page.getByText('Task deleted: Review fictional proposal', { exact: true }),
  ).toBeVisible();
  await expect(completion).toHaveCount(0);
  await page.goto('/pipeline');
  const stageSelect = page.getByRole('combobox', {
    name: 'Stage for Alex Rowan',
    exact: true,
  });
  await stageSelect.selectOption('contacted');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Alex Rowan moved to Contacted.' }),
  ).toBeVisible();
  await page.reload();
  await expect(stageSelect).toHaveValue('contacted');
  await page
    .getByRole('button', { name: 'Drag Alex Rowan', exact: true })
    .dragTo(
      page.getByRole('region', { name: 'Interested stage', exact: true }),
    );
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Alex Rowan moved to Interested.' }),
  ).toBeVisible();
  await page.reload();
  await expect(stageSelect).toHaveValue('interested');
  await page.route('**/api/v1/leads/*', async (route) => {
    if (route.request().method() === 'PATCH')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Simulated unavailable database' }),
      });
    else await route.continue();
  });
  await stageSelect.selectOption('won');
  await expect(page.getByRole('alert')).toContainText(
    'Could not confirm the stage change',
  );
  await expect(stageSelect).toHaveValue('interested');
  await page.unroute('**/api/v1/leads/*');
  await stageSelect.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(stageSelect).toHaveValue('proposal_sent');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Alex Rowan moved to Proposal sent.' }),
  ).toBeVisible();
  const pipelineScreenshots = fileURLToPath(
    new URL('../../.local/screenshots/', import.meta.url),
  );
  await mkdir(pipelineScreenshots, { recursive: true });
  await page.screenshot({
    path: `${pipelineScreenshots}/pipeline-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `${pipelineScreenshots}/pipeline-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(detailUrl);
  await page.reload();
  await expect(page.getByText('$1,200.50', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit lead', exact: true }).click();
  await page.getByLabel('Stage', { exact: true }).selectOption('proposal_sent');
  await page
    .getByLabel('Estimated value (USD)', { exact: true })
    .fill('2500.75');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('$2,500.75', { exact: true })).toBeVisible();
  await expect(page.getByText('Proposal sent', { exact: true })).toBeVisible();
  await page.goto('/leads');
  await page
    .getByRole('textbox', { name: 'Search leads', exact: true })
    .fill('no-such-contact');
  await page
    .getByRole('button', { name: 'Apply filters', exact: true })
    .click();
  await expect(page.getByText('No matching connections.')).toBeVisible();
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('link', { name: 'Alex Rowan', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Search leads', exact: true })
    .fill('Northlight');
  await page
    .getByRole('combobox', { name: 'Filter by stage', exact: true })
    .selectOption('proposal_sent');
  await page
    .getByRole('textbox', { name: 'Filter by source', exact: true })
    .fill('Referral');
  await page
    .getByRole('button', { name: 'Apply filters', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: 'Alex Rowan', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Search leads' })).toHaveValue(
    'Northlight',
  );
  await expect(
    page.getByRole('link', { name: 'Alex Rowan', exact: true }),
  ).toBeVisible();

  const screenshots = fileURLToPath(
    new URL('../../.local/screenshots/', import.meta.url),
  );
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({
    path: `${screenshots}/leads-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('link', { name: 'Add lead', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `${screenshots}/leads-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.goto('/register');
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Second Fictional User');
  await page.getByLabel('Email address', { exact: true }).fill(secondEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByText('Your next connection starts here.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Alex Rowan', exact: true }),
  ).toHaveCount(0);
  await page.goto('/pipeline');
  await expect(page.getByRole('heading', { name: 'Pipeline.' })).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Stage for Alex Rowan' }),
  ).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(
    page.getByRole('region', { name: 'Total leads', exact: true }),
  ).toContainText('0');
  await expect(
    page.getByRole('region', { name: 'Open pipeline value', exact: true }),
  ).toContainText('$0.00');
  await page.goto(detailUrl);
  await expect(page.getByRole('alert')).toContainText('Lead not found');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Alex Rowan', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Alex Rowan', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Keep lead', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete lead', exact: true }).click();
  await expect(
    page.getByText('Your next connection starts here.'),
  ).toBeVisible();
  await page.goto('/import');
  const csv = `Contact,Mail,Company,Value\nMorgan Vale,import-${suffix}@example.org,=2+2,120.50\nDuplicate,import-${suffix}@example.org,Fictional,10\nInvalid,not-an-email,Fictional,20\nTaylor Reed,taylor-${suffix}@example.org,Fictional,300\n`;
  await page.getByLabel('CSV file', { exact: true }).setInputFiles({
    name: 'fictional-contacts.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page
    .getByLabel('Column for name', { exact: true })
    .selectOption('Contact');
  await page
    .getByLabel('Column for email', { exact: true })
    .selectOption('Mail');
  await page
    .getByLabel('Column for estimated_value', { exact: true })
    .selectOption('Value');
  await page
    .getByRole('button', { name: 'Validate & preview', exact: true })
    .click();
  await expect(
    page.getByText('2 valid · 1 duplicates · 1 invalid', { exact: true }),
  ).toBeVisible();
  const importButton = page.getByRole('button', {
    name: 'Import 2 valid rows',
    exact: true,
  });
  await expect(importButton).toBeDisabled();
  await page.getByLabel('Confirm reviewed import', { exact: true }).check();
  await expect(importButton).toBeDisabled();
  await page
    .getByLabel('Import valid rows only; reject invalid rows', { exact: true })
    .check();
  await expect(
    page.getByLabel('Confirm reviewed import', { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel('Confirm reviewed import', { exact: true }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `${screenshots}/csv-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await importButton.click();
  await expect(
    page.getByText('2 imported · 1 skipped · 1 rejected', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/csv-desktop.png`,
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export all leads', exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('leadflow-leads.csv');
  const exported = await readFile((await download.path())!, 'utf8');
  expect(exported).toContain('Morgan Vale');
  expect(exported).toContain('Taylor Reed');
  expect(exported).toContain("'=2+2");
  expect(exported).not.toContain('not-an-email');
  await page.getByRole('link', { name: 'View leads', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Morgan Vale', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Taylor Reed', exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Updated Fictional User');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile updated.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    'Updated Fictional User',
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/login-desktop.png`,
    fullPage: true,
  });
  expect(issues).toEqual([]);
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => cookie.name === 'leadflow_session')).toBe(
    false,
  );
});
