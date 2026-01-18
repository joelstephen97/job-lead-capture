/**
 * Playwright fixtures for Chrome Extension testing.
 * Optimized for speed.
 */

const { test: base, chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '..');

const test = base.extend({
  context: async ({}, use) => {
    const pathToExtension = EXTENSION_PATH;
    const isHeadless = process.env.HEADLESS !== 'false';
    
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        ...(isHeadless ? ['--headless=new'] : []),
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--disable-default-apps',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });
    
    // Fast service worker wait - 100ms intervals, max 2s
    for (let i = 0; i < 20 && !context.serviceWorkers()[0]; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    
    await use(context);
    await context.close();
  },

  /**
   * The extension's service worker (background script).
   */
  extensionServiceWorker: async ({ context }, use) => {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    await use(serviceWorker);
  },

  /**
   * Extension ID extracted from the service worker URL.
   */
  extensionId: async ({ extensionServiceWorker }, use) => {
    const url = extensionServiceWorker.url();
    // URL format: chrome-extension://<id>/background.js
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    const extensionId = match ? match[1] : null;
    await use(extensionId);
  },

  /**
   * Opens the extension popup page.
   */
  popupPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await page.close();
  },

  /**
   * Opens the extension options page.
   */
  optionsPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await page.close();
  },

  /**
   * Opens the leads management page.
   */
  leadsPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/leads.html`);
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await page.close();
  },
});

module.exports = { test, EXTENSION_PATH };
