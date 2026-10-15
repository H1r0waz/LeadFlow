import { test, expect, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const screenshots = fileURLToPath(
  new URL('../../.local/screenshots/', import.meta.url),
);

async function fits(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

async function descriptionsExist(page: Page) {
  expect(
    await page
      .locator('[aria-describedby]')
      .evaluateAll((elements) =>
        elements.flatMap((element) =>
          (element.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter((id) => id && !document.getElementById(id)),
        ),
      ),
  ).toEqual([]);
}

async function contrast(page: Page, selector: string) {
  const values = await page.locator(selector).evaluateAll((elements) => {
    function luminance(color: string) {
      const rgb = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    return elements.map((element) => {
      let ancestor: Element | null = element;
      let background = 'rgb(255, 255, 255)';
      while (ancestor) {
        const candidate = getComputedStyle(ancestor).backgroundColor;
        if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') {
          background = candidate;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      const foreground = getComputedStyle(element).color;
      const a = luminance(foreground),
        b = luminance(background);
      return {
        text: element.textContent?.trim().slice(0, 70),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
  });
  expect(values.length).toBeGreaterThan(0);
  expect(values.filter((value) => value.ratio < 4.5)).toEqual([]);
}

test('responsive pages, keyboard focus, descriptions, contrast and recovery', async ({
  page,
}) => {
  await mkdir(screenshots, { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const suffix = randomBytes(6).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const longName = `Fictional${'LongName'.repeat(12)}`;
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(error.message));

  let releaseSession!: () => void;
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await sessionGate;
    await route.continue();
  });
  await page.goto('/login');
  try {
    await expect(page.getByRole('status')).toContainText(
      'Loading your workspace',
    );
    await expect(page.locator('.spinner')).toHaveCSS('animation-name', 'none');
  } finally {
    releaseSession();
  }
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.unroute('**/api/v1/auth/me');

  for (const path of ['/login', '/register']) {
    await page.goto(path);
    await expect(
      page.getByRole('button', {
        name: path === '/login' ? 'Sign in' : 'Create account',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('main h1')).toHaveCount(1);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await fits(page);
    }
  }
  await page.setViewportSize({ width: 320, height: 900 });
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page.getByLabel('Full name', { exact: true })).toBeFocused();
  await expect(
    page.getByLabel('Full name', { exact: true }),
  ).toHaveAccessibleDescription('Enter your name');
  await descriptionsExist(page);
  await contrast(
    page,
    '.auth-card .muted, .auth-switch, .demo-note p, .auth-card .eyebrow',
  );
  await page.screenshot({
    path: `${screenshots}/register-validation-mobile.png`,
    fullPage: true,
  });
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Fictional Accessibility User');
  await page
    .getByLabel('Email address', { exact: true })
    .fill(`accessibility-${suffix}@example.org`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByText('Your next connection starts here.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'A fresh start, ready for your first connection.',
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/dashboard-empty-320.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Add lead', exact: true }).click();
  await expect(page).toHaveTitle('New lead | LeadFlow');
  await expect(page.locator('main')).toBeFocused();
  await page.getByLabel('Full name *', { exact: true }).fill(longName);
  await page
    .getByLabel('Company', { exact: true })
    .fill(`Fictional${'Studio'.repeat(15)}`);
  await page
    .getByLabel('Notes', { exact: true })
    .fill(`Fictional ${'context'.repeat(45)}`);
  await page.getByRole('button', { name: 'Create lead', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: longName, exact: true }),
  ).toBeVisible();
  const detailPath = new URL(page.url()).pathname;
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(
    page.getByLabel('Task title', { exact: true }),
  ).toHaveAccessibleDescription('Enter a task title');
  await expect(
    page.getByLabel('Due date', { exact: true }),
  ).toHaveAccessibleDescription('Choose a due date');
  await descriptionsExist(page);

  const statuses = ['contacted', 'interested', 'proposal_sent', 'won', 'lost'];
  for (const status of statuses) {
    const result = await page.evaluate(async (stage) => {
      const csrf = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('leadflow_csrf='))
        ?.split('=')[1];
      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': decodeURIComponent(csrf || ''),
        },
        body: JSON.stringify({ name: `Fictional ${stage}`, status: stage }),
      });
      return response.status;
    }, status);
    expect(result).toBe(201);
  }
  const routes = [
    '/leads',
    '/leads/new',
    detailPath,
    `${detailPath}/edit`,
    '/pipeline',
    '/dashboard',
    '/import',
    '/settings',
    '/missing-page',
  ];
  for (const path of routes) {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveCount(1);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await fits(page);
      expect(
        await page
          .locator('.button.primary, .sidebar nav a')
          .evaluateAll((elements) =>
            elements
              .filter((element) => element.getBoundingClientRect().height < 44)
              .map((element) => element.textContent?.trim()),
          ),
      ).toEqual([]);
      await page.screenshot({
        path: `${screenshots}/review-${path === detailPath ? 'detail' : path.endsWith('/edit') ? 'edit' : path.split('/').at(-1)}-${width}.png`,
        fullPage: true,
      });
    }
    await descriptionsExist(page);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/leads');
  const table = page.getByRole('region', {
    name: 'Leads table, scroll horizontally for more columns',
  });
  await expect(page.locator('.stage')).toHaveCount(6);
  await contrast(
    page,
    '.stage, th:not(:empty), .contact-cell > div > span, .section-title p, .page-heading .muted',
  );
  await table.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => table.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.locator('main')).toBeFocused();
  await expect(page).toHaveTitle('Settings | LeadFlow');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Full name', { exact: true })).toBeFocused();

  await page.route('**/api/v1/dashboard?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Fictional service interruption' }),
    }),
  );
  await page.goto('/dashboard');
  await expect(page.getByRole('alert')).toContainText(
    'Fictional service interruption',
  );
  await fits(page);
  await page.unroute('**/api/v1/dashboard?*');
  await page
    .getByRole('button', { name: 'Retry dashboard', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Dashboard.' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.goto('/pipeline');
  const board = page.getByRole('region', {
    name: 'Sales pipeline',
    exact: true,
  });
  await board.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => board.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(board).toHaveAccessibleDescription(/scroll across the board/);
  expect(issues).toEqual([]);
});
