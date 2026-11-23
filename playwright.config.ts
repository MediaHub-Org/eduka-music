import { chromium, defineConfig, devices } from '@playwright/test'

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
// Usa el Chromium completo: el headless shell no sirve navegación offline por SW.
const launchOptions = { executablePath: chromiumPath ?? chromium.executablePath() }

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], launchOptions },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
