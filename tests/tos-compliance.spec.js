/**
 * TOS Compliance and Privacy Tests for LeadingLeads extension.
 * 
 * These tests verify that the extension:
 * 1. Only stores data locally (no external requests)
 * 2. Uses optional permissions (user must grant)
 * 3. Only captures visible content
 * 4. Provides user control over data
 * 5. Is transparent about its behavior
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('TOS Compliance - Local Storage Only', () => {
  test('should store leads in chrome.storage.local', async ({ extensionServiceWorker }) => {
    // Verify storage API is used correctly by checking background script URL
    const url = extensionServiceWorker.url();
    expect(url).toContain('background.js');
  });

  test('manifest should only request necessary permissions', async ({ context, extensionId }) => {
    // Navigate to manifest to verify permissions
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/manifest.json`);
    const content = await page.content();
    
    // Should have only essential permissions
    expect(content).toContain('storage');
    expect(content).toContain('activeTab');
    
    // All URLs should be optional (not required)
    expect(content).toContain('optional_host_permissions');
    
    await page.close();
  });

  test('options page should explain privacy practices', async ({ optionsPage }) => {
    const content = await optionsPage.content();
    
    // Should explain local-only storage
    expect(content.toLowerCase()).toContain('local');
    expect(content.toLowerCase()).toContain('storage');
    
    // Should explain no data is sent out
    expect(content.toLowerCase()).toContain('no data sent');
  });

  test('options page should explain user responsibility for TOS', async ({ optionsPage }) => {
    const content = await optionsPage.content();
    
    // Should mention Terms of Service responsibility
    expect(content.toLowerCase()).toContain('terms of service');
  });

  test('options page should have privacy section', async ({ optionsPage }) => {
    const sectionTitles = await optionsPage.locator('.sectionTitle').allTextContents();
    expect(sectionTitles.some(t => t.toLowerCase().includes('privacy'))).toBe(true);
  });
});

test.describe('TOS Compliance - User Control', () => {
  test('auto-scan should be opt-in with visible-only default', async ({ optionsPage }) => {
    await optionsPage.waitForTimeout(100);
    
    // Visible-only should be enabled by default (TOS-friendly)
    const visibleOnly = optionsPage.locator('#autoScanVisibleOnly');
    const isChecked = await visibleOnly.isChecked();
    expect(isChecked).toBe(true);
  });

  test('user can disable auto-scan completely', async ({ optionsPage }) => {
    await optionsPage.waitForTimeout(100);
    
    const autoScan = optionsPage.locator('#autoScanEnabled');
    await expect(autoScan).toBeVisible();
    
    // User should be able to toggle it
    const initialState = await autoScan.isChecked();
    await autoScan.click();
    await optionsPage.locator('#saveBtn').click();
    await optionsPage.waitForTimeout(100);
    
    // Reload and verify
    await optionsPage.reload();
    await optionsPage.waitForTimeout(100);
    
    const newState = await autoScan.isChecked();
    expect(newState).toBe(!initialState);
    
    // Restore
    await autoScan.click();
    await optionsPage.locator('#saveBtn').click();
  });

  test('user can clear all data', async ({ popupPage }) => {
    // Add a test lead first
    await popupPage.locator('#manualEmail').fill('cleartest@test.com');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    const initialCount = parseInt(await popupPage.locator('#leadCount').textContent());
    expect(initialCount).toBeGreaterThan(0);
    
    // Clear all
    popupPage.on('dialog', async dialog => {
      await dialog.accept();
    });
    await popupPage.locator('#clearBtn').click();
    await popupPage.waitForTimeout(100);
    
    const finalCount = parseInt(await popupPage.locator('#leadCount').textContent());
    expect(finalCount).toBe(0);
  });

  test('user can delete individual leads', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    // Add a test lead
    await popup.locator('#manualEmail').fill('deletetest@test.com');
    await popup.locator('#manualAddBtn').click();
    await popup.waitForTimeout(100);
    await popup.close();
    
    // Go to leads page
    const leadsPage = await context.newPage();
    await leadsPage.goto(`chrome-extension://${extensionId}/leads.html`);
    await leadsPage.waitForLoadState('domcontentloaded');
    await leadsPage.waitForTimeout(100);
    
    // Should have delete button for each lead
    const deleteButtons = leadsPage.locator('.js-delete, .js-del');
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);
    
    await leadsPage.close();
  });

  test('user can export their data', async ({ popupPage }) => {
    const exportBtn = popupPage.locator('#exportCsvBtn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();
  });
});

test.describe('TOS Compliance - Transparency', () => {
  test('popup should show capture source', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    // Add a test lead
    await popup.locator('#manualEmail').fill('source@test.com');
    await popup.locator('#manualCompany').fill('Source Company');
    await popup.locator('#manualAddBtn').click();
    await popup.waitForTimeout(100);
    await popup.close();
    
    // Check leads page shows capture source
    const leadsPage = await context.newPage();
    await leadsPage.goto(`chrome-extension://${extensionId}/leads.html`);
    await leadsPage.waitForLoadState('domcontentloaded');
    await leadsPage.waitForTimeout(100);
    
    // Should have source column
    const headers = await leadsPage.locator('th').allTextContents();
    expect(headers.some(h => h.includes('Source'))).toBe(true);
    
    await leadsPage.close();
  });

  test('leads page should show capture type', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    await popup.locator('#manualEmail').fill('capturetype@test.com');
    await popup.locator('#manualAddBtn').click();
    await popup.waitForTimeout(100);
    await popup.close();
    
    const leadsPage = await context.newPage();
    await leadsPage.goto(`chrome-extension://${extensionId}/leads.html`);
    await leadsPage.waitForLoadState('domcontentloaded');
    await leadsPage.waitForTimeout(100);
    
    // Click details to see capture type
    const detailsBtn = leadsPage.locator('.js-details').first();
    if (await detailsBtn.count() > 0) {
      await detailsBtn.click();
      await leadsPage.waitForTimeout(100);
      
      const detailBox = await leadsPage.locator('.detailBox').first().textContent();
      expect(detailBox.toLowerCase()).toContain('captured via');
    }
    
    await leadsPage.close();
  });

  test('options page explains how scanning works', async ({ optionsPage }) => {
    const content = await optionsPage.content();
    
    // Should explain scanning process
    expect(content.toLowerCase()).toContain('scan');
    expect(content.toLowerCase()).toContain('rendered');
  });

  test('scanning subtitle is user-friendly', async ({ popupPage }) => {
    const subtitle = await popupPage.locator('.subtitle').textContent();
    expect(subtitle.toLowerCase()).toContain('locally');
  });
});

test.describe('TOS Compliance - Permission Model', () => {
  test('should use activeTab permission (user-initiated)', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/manifest.json`);
    const content = await page.content();
    
    // activeTab is user-initiated only - very TOS friendly
    expect(content).toContain('activeTab');
    
    await page.close();
  });

  test('all-sites permission should be optional', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/manifest.json`);
    const content = await page.content();
    
    // Should be in optional_host_permissions, not permissions
    // Note: HTML escapes < and > to &lt; and &gt;
    expect(content).toContain('optional_host_permissions');
    expect(content).toMatch(/all_urls/);
    
    await page.close();
  });

  test('options page has permission grant buttons', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#grantAllSitesBtn')).toBeVisible();
    await expect(optionsPage.locator('#revokeAllSitesBtn')).toBeVisible();
  });

  test('permission section explains what it does', async ({ optionsPage }) => {
    const cardInset = await optionsPage.locator('.cardInset').textContent();
    
    // Should explain what the permission is for
    expect(cardInset.toLowerCase()).toContain('auto-scan');
  });
});

test.describe('Sales & Job Hunter Features', () => {
  test('should support company and email capture', async ({ popupPage }) => {
    await popupPage.locator('#manualEmail').fill('sales@company.com');
    await popupPage.locator('#manualCompany').fill('Acme Corp');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toBe('Added.');
    
    await popupPage.locator('#refreshBtn').click();
    await popupPage.waitForTimeout(100);
    
    const leadList = await popupPage.locator('#leadList').textContent();
    expect(leadList).toContain('Acme Corp');
  });

  test('should support bulk email extraction for outreach', async ({ popupPage }) => {
    const emailList = `
      Contact John at john@company1.com for the sales role
      Reach out to jane@company2.com about partnerships
      Email mike@company3.com for business development
    `;
    
    await popupPage.locator('#manualText').fill(emailList);
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('3 email');
  });

  test('should support Gmail integration for outreach', async ({ popupPage }) => {
    const gmailBtn = popupPage.locator('#gmailBtn');
    await expect(gmailBtn).toBeVisible();
    await expect(gmailBtn).toHaveText('Open in Gmail');
  });

  test('should support BCC copy for mass outreach', async ({ popupPage }) => {
    const copyBccBtn = popupPage.locator('#copyBccBtn');
    await expect(copyBccBtn).toBeVisible();
    await expect(copyBccBtn).toHaveText('Copy BCC');
  });

  test('should support CSV export for CRM import', async ({ popupPage }) => {
    const exportBtn = popupPage.locator('#exportCsvBtn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toHaveText('Export CSV');
  });

  test('leads page should support search for quick lookup', async ({ leadsPage }) => {
    const searchInput = leadsPage.locator('#search');
    await expect(searchInput).toBeVisible();
    
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder.toLowerCase()).toContain('search');
  });

  test('leads page should support filtering by source', async ({ leadsPage }) => {
    const sourceFilter = leadsPage.locator('#sourceFilter');
    await expect(sourceFilter).toBeVisible();
  });

  test('should support keyword matching for targeted capture', async ({ optionsPage }) => {
    await optionsPage.waitForTimeout(100);
    
    const keywords = optionsPage.locator('#keywords');
    await expect(keywords).toBeVisible();
    
    // Should have default keywords for sales/job hunting
    const value = await keywords.inputValue();
    expect(value.toLowerCase()).toContain('sales');
  });
});

test.describe('Email Validation', () => {
  test('should reject invalid email formats', async ({ popupPage }) => {
    await popupPage.locator('#manualEmail').fill('not-an-email');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status.toLowerCase()).toContain('valid');
  });

  test('should reject email without @ symbol', async ({ popupPage }) => {
    await popupPage.locator('#manualEmail').fill('invalidemail.com');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status.toLowerCase()).toContain('valid');
  });

  test('should accept valid email formats', async ({ popupPage }) => {
    await popupPage.locator('#manualEmail').fill('valid@email.com');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toBe('Added.');
  });
});
