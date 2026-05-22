import { test, expect, type Page } from '@playwright/test'

// Offline/demo-mode smoke suite (no Supabase). Verifies the critical
// player-facing paths render and persist on small iPhone viewports.

// Playwright gives each test a fresh browser context (empty localStorage),
// so no manual clear is needed — and clearing via addInitScript would wrongly
// wipe storage on the reloads these tests rely on.

/** Walk the 3-step onboarding (welcome → select name → confirm) as Matt Shamus. */
async function onboard(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Enter Tournament/i }).click()
  await page.getByRole('button', { name: /Matt Shamus/i }).click()
  await page.getByRole('button', { name: /Continue as/i }).click()
  await page.getByRole('button', { name: /That's Me/i }).click()
  await expect(page.getByRole('button', { name: 'Individual' })).toBeVisible()
}

test('onboarding → select player → leaderboard', async ({ page }) => {
  await onboard(page)
  await expect(page.getByRole('button', { name: 'Teams' })).toBeVisible()
})

test('bottom nav moves between Leaderboard / Scores / Info', async ({ page }) => {
  await onboard(page)

  await page.getByRole('link', { name: 'Scores' }).click()
  await expect(page).toHaveURL(/\/scores$/)
  await expect(page.getByText(/Score Entry/i).first()).toBeVisible()

  await page.getByRole('link', { name: 'Info' }).click()
  await expect(page).toHaveURL(/\/info$/)
})

test('player identity persists across reload (localStorage)', async ({ page }) => {
  await onboard(page)

  await page.reload()
  // No re-onboarding: leaderboard shown directly, not the welcome screen
  await expect(page.getByRole('button', { name: 'Individual' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Enter Tournament/i })).toHaveCount(0)
})

test('a score entered offline survives a reload', async ({ page }) => {
  await onboard(page)

  // Write a score via the offline-first context hook, then confirm it persists
  // through a reload (localStorage is the source of truth offline).
  await page.evaluate(() => (window as unknown as { __ec_submitScore: (r: string, p: string, h: number, g: number) => void }).__ec_submitScore('r1', 'p2', 1, 5))
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ec-scores') || '[]').length)).toBeGreaterThan(0)

  await page.reload()
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('ec-scores') || '[]'))
  expect(persisted.some((s: { id: string }) => s.id === 's-r1-p2-1')).toBe(true)
})

test('PWA manifest is served', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const m = await res.json()
  expect(m.name).toBe('Egerer Classic 2026')
  expect(m.display).toBe('standalone')
})
