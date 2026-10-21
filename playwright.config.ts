import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the static web export (run `npm run export:web` first).
 * WebKit is the engine behind Safari on every iPhone; Chromium alone missed a blank
 * page there once, so both engines run, at phone and desktop width.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'webkit-phone', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 860 } } },
    { name: 'chromium-phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node e2e/serve.mjs dist 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
