/**
 * Core extension tests.
 * Tests the basic functionality of LeadingLeads extension.
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Extension Loading', () => {
  test('should load extension successfully', async ({ extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
  });

  test('service worker should be active', async ({ extensionServiceWorker }) => {
    expect(extensionServiceWorker).toBeTruthy();
    const url = extensionServiceWorker.url();
    expect(url).toContain('background.js');
  });
});

test.describe('Popup UI', () => {
  test('should display popup with correct title', async ({ popupPage }) => {
    const title = await popupPage.locator('.title').textContent();
    expect(title).toBe('LeadingLeads');
  });

  test('should display subtitle', async ({ popupPage }) => {
    const subtitle = await popupPage.locator('.subtitle').textContent();
    expect(subtitle).toContain('Capture leads');
  });

  test('should have scan button', async ({ popupPage }) => {
    const scanBtn = popupPage.locator('#scanBtn');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText('Scan this page');
  });

  test('should have refresh button', async ({ popupPage }) => {
    const refreshBtn = popupPage.locator('#refreshBtn');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toHaveText('Refresh');
  });

  test('should have lead count display', async ({ popupPage }) => {
    const leadCount = popupPage.locator('#leadCount');
    await expect(leadCount).toBeVisible();
    const count = await leadCount.textContent();
    expect(count).toBe('0');
  });

  test('should have view all button', async ({ popupPage }) => {
    const viewAllBtn = popupPage.locator('#openLeadsBtn');
    await expect(viewAllBtn).toBeVisible();
    await expect(viewAllBtn).toHaveText('View All');
  });

  test('should have gmail button', async ({ popupPage }) => {
    const gmailBtn = popupPage.locator('#gmailBtn');
    await expect(gmailBtn).toBeVisible();
    await expect(gmailBtn).toHaveText('Open in Gmail');
  });

  test('should have action buttons', async ({ popupPage }) => {
    await expect(popupPage.locator('#copyBccBtn')).toBeVisible();
    await expect(popupPage.locator('#gmailBtn')).toBeVisible();
    await expect(popupPage.locator('#exportCsvBtn')).toBeVisible();
    await expect(popupPage.locator('#clearBtn')).toBeVisible();
  });

  test('should have correct action button labels', async ({ popupPage }) => {
    await expect(popupPage.locator('#copyBccBtn')).toHaveText('Copy BCC');
    await expect(popupPage.locator('#exportCsvBtn')).toHaveText('Export CSV');
    await expect(popupPage.locator('#clearBtn')).toHaveText('Clear All');
  });

  test('should have manual add section', async ({ popupPage }) => {
    await expect(popupPage.locator('#manualEmail')).toBeVisible();
    await expect(popupPage.locator('#manualCompany')).toBeVisible();
    await expect(popupPage.locator('#manualAddBtn')).toBeVisible();
  });

  test('should have section title for captured leads', async ({ popupPage }) => {
    const sectionTitle = popupPage.locator('.sectionTitle').first();
    await expect(sectionTitle).toContainText('Captured Leads');
  });

  test('should have section title for manual add', async ({ popupPage }) => {
    const sectionTitles = await popupPage.locator('.sectionTitle').allTextContents();
    expect(sectionTitles.some(t => t.includes('Add Manually'))).toBe(true);
  });

  test('should have extract emails section', async ({ popupPage }) => {
    await expect(popupPage.locator('#manualText')).toBeVisible();
    await expect(popupPage.locator('#extractEmailsBtn')).toBeVisible();
    await expect(popupPage.locator('#clearTextBtn')).toBeVisible();
  });

  test('should navigate to options page', async ({ popupPage, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      popupPage.locator('a[href="options.html"]').click()
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('options.html');
    await newPage.close();
  });
});

test.describe('Options Page', () => {
  test('should display options title', async ({ optionsPage }) => {
    const title = await optionsPage.locator('.title').textContent();
    expect(title).toContain('Options');
  });

  test('should have keyword textarea', async ({ optionsPage }) => {
    const keywords = optionsPage.locator('#keywords');
    await expect(keywords).toBeVisible();
  });

  test('should have default keywords', async ({ optionsPage }) => {
    await optionsPage.waitForTimeout(100);
    const keywords = await optionsPage.locator('#keywords').inputValue();
    expect(keywords).toContain('sales');
  });

  test('should have require email checkbox', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#requireEmail')).toBeVisible();
  });

  test('should have clear after gmail checkbox', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#clearAfterGmail')).toBeVisible();
  });

  test('should have auto-scan checkbox', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#autoScanEnabled')).toBeVisible();
  });

  test('should have auto-scan visible only checkbox', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#autoScanVisibleOnly')).toBeVisible();
  });

  test('should have badge enabled checkbox', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#badgeEnabled')).toBeVisible();
  });

  test('should have theme selector', async ({ optionsPage }) => {
    const theme = optionsPage.locator('#theme');
    await expect(theme).toBeVisible();
    const options = await theme.locator('option').allTextContents();
    expect(options).toContain('System');
    expect(options).toContain('Dark');
    expect(options).toContain('Light');
  });

  test('should have max leads input', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#maxLeads')).toBeVisible();
  });

  test('should have save button with correct label', async ({ optionsPage }) => {
    const saveBtn = optionsPage.locator('#saveBtn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveText('Save Changes');
  });

  test('should have reset button with correct label', async ({ optionsPage }) => {
    const resetBtn = optionsPage.locator('#resetBtn');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveText('Reset Defaults');
  });

  test('should have permission grant buttons', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#grantAllSitesBtn')).toBeVisible();
    await expect(optionsPage.locator('#revokeAllSitesBtn')).toBeVisible();
  });

  test('should save settings', async ({ optionsPage }) => {
    const requireEmail = optionsPage.locator('#requireEmail');
    const wasChecked = await requireEmail.isChecked();
    await requireEmail.click();
    
    await optionsPage.locator('#saveBtn').click();
    await optionsPage.waitForTimeout(100);
    const status = await optionsPage.locator('#status').textContent();
    expect(status).toBe('Saved.');
    
    // Restore original state
    if (wasChecked !== await requireEmail.isChecked()) {
      await requireEmail.click();
      await optionsPage.locator('#saveBtn').click();
    }
  });

  test('should not mention any specific job boards in permission text', async ({ optionsPage }) => {
    const permText = await optionsPage.locator('.cardInset .hint').textContent();
    expect(permText.toLowerCase()).not.toContain('linkedin');
  });

  test('should have privacy and terms section', async ({ optionsPage }) => {
    const sectionTitles = await optionsPage.locator('.sectionTitle').allTextContents();
    expect(sectionTitles.some(t => t.includes('Privacy'))).toBe(true);
  });

  test('should have how scanning works section', async ({ optionsPage }) => {
    const sectionTitles = await optionsPage.locator('.sectionTitle').allTextContents();
    expect(sectionTitles.some(t => t.includes('scanning'))).toBe(true);
  });
});

test.describe('Leads Page', () => {
  test('should display leads page title', async ({ leadsPage }) => {
    const title = await leadsPage.locator('.title').textContent();
    expect(title).toContain('Leads');
  });

  test('should show empty state initially', async ({ leadsPage }) => {
    await leadsPage.waitForTimeout(100);
    const tbody = await leadsPage.locator('#tbody').textContent();
    expect(tbody).toContain('No leads');
  });

  test('should have search input', async ({ leadsPage }) => {
    const search = leadsPage.locator('#search');
    await expect(search).toBeVisible();
    const placeholder = await search.getAttribute('placeholder');
    expect(placeholder).toContain('Search');
  });

  test('should have source filter', async ({ leadsPage }) => {
    await expect(leadsPage.locator('#sourceFilter')).toBeVisible();
  });

  test('should have page size selector', async ({ leadsPage }) => {
    const pageSize = leadsPage.locator('#pageSize');
    await expect(pageSize).toBeVisible();
    const options = await pageSize.locator('option').allTextContents();
    expect(options).toContain('25 / page');
    expect(options).toContain('50 / page');
    expect(options).toContain('100 / page');
  });

  test('should have refresh button', async ({ leadsPage }) => {
    await expect(leadsPage.locator('#refreshBtn')).toBeVisible();
  });

  test('should have select all checkbox', async ({ leadsPage }) => {
    await expect(leadsPage.locator('#selectAllPage')).toBeVisible();
  });

  test('should have bulk action buttons', async ({ leadsPage }) => {
    await expect(leadsPage.locator('#copyBccBtn')).toBeVisible();
    await expect(leadsPage.locator('#gmailBtn')).toBeVisible();
    await expect(leadsPage.locator('#exportBtn')).toBeVisible();
    await expect(leadsPage.locator('#deleteSelectedBtn')).toBeVisible();
    await expect(leadsPage.locator('#clearAllBtn')).toBeVisible();
  });

  test('should have correct bulk action labels', async ({ leadsPage }) => {
    await expect(leadsPage.locator('#copyBccBtn')).toHaveText('Copy BCC');
    await expect(leadsPage.locator('#gmailBtn')).toHaveText('Open in Gmail');
    await expect(leadsPage.locator('#exportBtn')).toHaveText('Export CSV');
    await expect(leadsPage.locator('#deleteSelectedBtn')).toHaveText('Delete selected');
    await expect(leadsPage.locator('#clearAllBtn')).toHaveText('Clear all');
  });

  test('should have table headers', async ({ leadsPage }) => {
    const headers = await leadsPage.locator('th').allTextContents();
    expect(headers.some(h => h.includes('Company'))).toBe(true);
    expect(headers.some(h => h.includes('Email'))).toBe(true);
    expect(headers.some(h => h.includes('Job title'))).toBe(true);
    expect(headers.some(h => h.includes('Source'))).toBe(true);
    expect(headers.some(h => h.includes('Captured'))).toBe(true);
    expect(headers.some(h => h.includes('Actions'))).toBe(true);
  });

  test('should have pagination controls', async ({ leadsPage }) => {
    await expect(leadsPage.locator('#prevBtn')).toBeVisible();
    await expect(leadsPage.locator('#nextBtn')).toBeVisible();
    await expect(leadsPage.locator('#pagerText')).toBeVisible();
  });

  test('should have options link', async ({ leadsPage }) => {
    const optionsLink = leadsPage.locator('a[href="options.html"]');
    await expect(optionsLink).toBeVisible();
  });
});
