import { defineConfig, devices } from '@playwright/test'

// E2E runs against a PRODUCTION build served by `vite preview`, built with
// EMPTY Supabase env so the app runs in offline/demo mode — the e2e suite
// never touches the live tournament database.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
  projects: [
    { name: 'iPhone 14 Pro', use: { ...devices['iPhone 14 Pro'] } },
    { name: 'iPhone SE', use: { ...devices['iPhone SE'] } },
  ],
})
