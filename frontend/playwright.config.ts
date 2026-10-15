import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  loadEnv('test', projectRoot, '').TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error('Start scripts/database.ps1 start before browser tests.');
const parsed = new URL(
  databaseUrl.replace('postgresql+psycopg:', 'postgresql:'),
);
if (
  !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
  parsed.port !== '55433' ||
  parsed.pathname !== '/leadflow_test'
) {
  throw new Error(
    'Browser tests require the dedicated loopback leadflow_test database on 55433.',
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: 'list',
  use: {
    actionTimeout: 10000,
    baseURL: 'http://localhost:5174',
    browserName: 'chromium',
    viewport: { width: 1440, height: 960 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: [
    {
      command:
        '"../.venv/Scripts/python.exe" -m alembic -c ../backend/alembic.ini upgrade head && "../.venv/Scripts/python.exe" -m uvicorn app.main:create_app --factory --app-dir ../backend --host 127.0.0.1 --port 8001',
      url: 'http://127.0.0.1:8001/api/v1/health',
      env: {
        DATABASE_URL: databaseUrl,
        FRONTEND_ORIGIN: 'http://localhost:5174',
        AUTH_RATE_LIMIT: '1000',
      },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npx vite --host localhost --port 5174 --strictPort',
      url: 'http://localhost:5174',
      env: { LEADFLOW_API_TARGET: 'http://127.0.0.1:8001' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
