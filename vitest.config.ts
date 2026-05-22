import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Dedicated Vitest config — deliberately omits the PWA plugin (service worker
// generation is irrelevant to tests and slows them down).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/lib/scoring.ts', 'src/lib/teamCompetition.ts', 'src/lib/sideGames.ts'],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
})
