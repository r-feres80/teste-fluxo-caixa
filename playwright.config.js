// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium',
    },
  },
  webServer: {
    command: 'npx http-server -p 4173 -c-1 .',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
