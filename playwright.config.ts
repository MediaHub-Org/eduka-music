import { chromium, defineConfig, devices } from '@playwright/test'

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
// Usa el Chromium completo: el headless shell no sirve navegación offline por SW.
const launchOptions = { executablePath: chromiumPath ?? chromium.executablePath() }

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174/eduka-music/',
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
  // El mismo servidor que usa la app instalada en local, no `vite preview`.
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:4174/eduka-music/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
