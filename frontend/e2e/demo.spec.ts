import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('load the fictional demo, keep it unchanged on repeat, and display real metrics', async ({
  page,
}) => {
  const suffix = randomBytes(6).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(error.message));
  await page.goto('/register');
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Fictional Demo Presenter');
  await page
    .getByLabel('Email address', { exact: true })
    .fill(`presenter-${suffix}@example.org`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByText('Your next connection starts here.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const button = page.getByRole('button', {
    name: 'Load fictional demo',
    exact: true,
  });
  await expect(button).toBeDisabled();
  await page
    .getByRole('checkbox', {
      name: 'Add fictional demo data to my empty workspace',
    })
    .check();
  await button.click();
  await expect(page.getByRole('status')).toContainText(
    '12 fictional leads and 8 tasks added.',
  );
  await page
    .getByRole('link', { name: 'Explore dashboard', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Total leads', exact: true }),
  ).toContainText('12');
  await expect(
    page.getByRole('region', { name: 'Open leads', exact: true }),
  ).toContainText('8');
  await expect(
    page.getByRole('region', { name: 'Open pipeline value', exact: true }),
  ).toContainText('$12,400.00');
  await expect(
    page.getByRole('region', { name: 'Won value', exact: true }),
  ).toContainText('$4,400.00');
  await expect(
    page.getByRole('region', { name: 'Conversion rate', exact: true }),
  ).toContainText('50.00%');
  const screenshots = fileURLToPath(
    new URL('../../.local/screenshots/', import.meta.url),
  );
  await mkdir(screenshots, { recursive: true });
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/demo-dashboard-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `${screenshots}/demo-dashboard-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('link', { name: 'Pipeline', exact: true }).click();
  await expect(page.locator('.pipeline-card')).toHaveCount(12);
  await page.screenshot({
    path: `${screenshots}/demo-pipeline-desktop.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Mara Vale', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mara Vale', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Fictional demo lead created in its initial stage', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByText(/workspace already has contacts/)).toBeVisible();
  await expect(button).toBeDisabled();
  await page.reload();
  await expect(button).toBeDisabled();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Total leads', exact: true }),
  ).toContainText('12');
  await page.goto('/import');
  await page
    .getByLabel('CSV file', { exact: true })
    .setInputFiles(
      fileURLToPath(new URL('../../demo/contacts.csv', import.meta.url)),
    );
  await page
    .getByLabel('Column for name', { exact: true })
    .selectOption('Contact');
  await page
    .getByLabel('Column for status', { exact: true })
    .selectOption('Stage');
  await page
    .getByLabel('Column for estimated_value', { exact: true })
    .selectOption('Value');
  await page
    .getByRole('button', { name: 'Validate & preview', exact: true })
    .click();
  await expect(
    page.getByText('2 valid · 1 duplicates · 1 invalid', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${screenshots}/demo-import-desktop.png`,
    fullPage: true,
  });
  expect(issues).toEqual([]);
});
