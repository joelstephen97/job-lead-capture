// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright configuration for Chrome Extension testing.
 * Optimized for parallel execution while maintaining reliability.
 * 
 * Note: Each test file gets its own browser context/extension instance,
 * enabling file-level parallelism. Tests within a file run serially
 * since they share the extension context.
 */
module.exports = defineConfig({
  testDir: './tests',
  // Enable file-level parallelism - each file gets separate browser
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // Run test files in parallel - each file spawns its own browser
  workers: 7,
  reporter: process.env.CI ? 'dot' : 'list',
  timeout: 20000,
  expect: {
    timeout: 5000,
  },
  
  use: {
    trace: 'off',
    video: 'off',
    actionTimeout: 8000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
