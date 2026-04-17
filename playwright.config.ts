import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3000)
const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim()
const shouldManageWebServer = !explicitBaseURL && process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1'
const baseURL = explicitBaseURL || `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: shouldManageWebServer
    ? {
        command: 'npx next start -H 0.0.0.0',
        url: `http://127.0.0.1:${PORT}/auth/login`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
