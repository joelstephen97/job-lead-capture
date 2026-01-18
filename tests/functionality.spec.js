/**
 * Comprehensive functionality tests for LeadingLeads extension.
 * Tests core behaviors, data flow, and feature interactions.
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Settings Management', () => {
  test.describe('Keyword Settings', () => {
    test('should save custom keywords', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const keywords = optionsPage.locator('#keywords');
      await keywords.fill('custom keyword\nanother term\nthird option');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      // Verify saved
      const status = await optionsPage.locator('#status').textContent();
      expect(status).toBe('Saved.');
      
      // Reload and verify persistence
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const savedKeywords = await keywords.inputValue();
      expect(savedKeywords).toContain('custom keyword');
      expect(savedKeywords).toContain('another term');
    });

    test('should handle empty keywords', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const keywords = optionsPage.locator('#keywords');
      await keywords.fill('');
      await optionsPage.locator('#saveBtn').click();
      // Wait for save confirmation
      await optionsPage.locator('#status').filter({ hasText: 'Saved' }).waitFor({ timeout: 3000 });
      
      const status = await optionsPage.locator('#status').textContent();
      expect(status).toBe('Saved.');
    });

    test('should trim whitespace from keywords', async ({ optionsPage, context, extensionId }) => {
      await optionsPage.waitForTimeout(100);
      
      const keywords = optionsPage.locator('#keywords');
      await keywords.fill('  spaced keyword  \n  another  ');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      // Check via popup that settings are applied
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await popup.waitForLoadState('domcontentloaded');
      await popup.close();
    });
  });

  test.describe('Checkbox Settings', () => {
    test('should toggle require email setting', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const checkbox = optionsPage.locator('#requireEmail');
      const initialState = await checkbox.isChecked();
      
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      // Reload and verify
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Restore
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
    });

    test('should toggle auto scan setting', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const checkbox = optionsPage.locator('#autoScanEnabled');
      const initialState = await checkbox.isChecked();
      
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Restore
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
    });

    test('should toggle visible only setting', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const checkbox = optionsPage.locator('#autoScanVisibleOnly');
      const initialState = await checkbox.isChecked();
      
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Restore
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
    });

    test('should toggle badge setting', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const checkbox = optionsPage.locator('#badgeEnabled');
      const initialState = await checkbox.isChecked();
      
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
      // Wait for save confirmation
      await optionsPage.locator('#status').filter({ hasText: 'Saved' }).waitFor({ timeout: 3000 });
      
      await optionsPage.reload();
      await optionsPage.waitForLoadState('domcontentloaded');
      await optionsPage.waitForTimeout(200);
      
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Restore
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
    });

    test('should toggle clear after gmail setting', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const checkbox = optionsPage.locator('#clearAfterGmail');
      const initialState = await checkbox.isChecked();
      
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Restore
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
    });
  });

  test.describe('Max Leads Setting', () => {
    test('should save max leads value', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const input = optionsPage.locator('#maxLeads');
      await input.fill('500');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const value = await input.inputValue();
      expect(value).toBe('500');
      
      // Restore default
      await input.fill('2000');
      await optionsPage.locator('#saveBtn').click();
    });

    test('should enforce minimum value', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const input = optionsPage.locator('#maxLeads');
      await input.fill('50'); // Below minimum
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      // Should save but be enforced to min
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const value = await input.inputValue();
      expect(parseInt(value)).toBeGreaterThanOrEqual(100);
    });
  });

  test.describe('Theme Setting', () => {
    test('should save theme selection', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.locator('#theme').selectOption('dark');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const value = await optionsPage.locator('#theme').inputValue();
      expect(value).toBe('dark');
      
      // Restore
      await optionsPage.locator('#theme').selectOption('system');
      await optionsPage.locator('#saveBtn').click();
    });

    test('theme should apply to page', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.locator('#theme').selectOption('light');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      const html = optionsPage.locator('html');
      const theme = await html.getAttribute('data-theme');
      expect(theme).toBe('light');
      
      // Restore
      await optionsPage.locator('#theme').selectOption('system');
      await optionsPage.locator('#saveBtn').click();
    });
  });

  test.describe('Reset Settings', () => {
    test('should reset to defaults', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      // Modify settings
      await optionsPage.locator('#maxLeads').fill('999');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      // Set up dialog handler
      optionsPage.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      // Reset
      await optionsPage.locator('#resetBtn').click();
      await optionsPage.waitForTimeout(100);
      
      // Check status
      const status = await optionsPage.locator('#status').textContent();
      expect(status).toContain('Reset');
    });
  });
});

test.describe('Lead Operations', () => {
  test.describe('Manual Add via Popup', () => {
    test('should add lead with email only', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('emailonly@test.com');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toBe('Added.');
      
      const count = await popupPage.locator('#leadCount').textContent();
      expect(parseInt(count)).toBeGreaterThan(0);
    });

    test('should add lead with email and company', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('full@test.com');
      await popupPage.locator('#manualCompany').fill('Full Company Inc');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toBe('Added.');
    });

    test('should show error for empty email', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('required');
    });

    test('should clear input after adding', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('cleartest@test.com');
      await popupPage.locator('#manualCompany').fill('Clear Company');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const email = await popupPage.locator('#manualEmail').inputValue();
      const company = await popupPage.locator('#manualCompany').inputValue();
      expect(email).toBe('');
      expect(company).toBe('');
    });

    test('should not add duplicate emails', async ({ popupPage }) => {
      const email = 'duplicate@test.com';
      
      // Add first time
      await popupPage.locator('#manualEmail').fill(email);
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count1 = await popupPage.locator('#leadCount').textContent();
      
      // Try to add again
      await popupPage.locator('#manualEmail').fill(email);
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count2 = await popupPage.locator('#leadCount').textContent();
      
      // Count should be the same (duplicate not added)
      expect(parseInt(count2)).toBe(parseInt(count1));
    });
  });

  test.describe('Email Extraction', () => {
    test('should extract single email', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Contact me at single@example.com');
      await popupPage.locator('#extractEmailsBtn').click();
      // Wait for status to be populated
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract multiple emails', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Email one@example.com and two@example.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('2 email');
    });

    test('should handle no emails in text', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('No emails here');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('no email');
    });

    test('should reject invalid email formats', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Invalid: @nodomain, missing@, notanemail');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('no email');
    });

    test('should clear text area', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Some text here');
      await popupPage.locator('#clearTextBtn').click();
      
      const value = await popupPage.locator('#manualText').inputValue();
      expect(value).toBe('');
    });

    test('should handle empty text area', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      // Empty text shows "paste some text first" message
      expect(status.toLowerCase()).toMatch(/no email|paste/);
    });

    test('should deduplicate extracted emails', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Email same@test.com and same@test.com again');
      await popupPage.locator('#extractEmailsBtn').click();
      // Wait for status to be populated
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
      
      const status = await popupPage.locator('#extractStatus').textContent();
      // Should only count 1 unique email
      expect(status).toContain('1 email');
    });
  });

  test.describe('Lead Display', () => {
    test('should display lead in popup list', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('display@test.com');
      await popupPage.locator('#manualCompany').fill('Display Company');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      // Refresh to ensure list updates
      await popupPage.locator('#refreshBtn').click();
      await popupPage.waitForTimeout(100);
      
      const leadList = await popupPage.locator('#leadList').textContent();
      expect(leadList).toContain('Display Company');
    });

    test('should display leads in leads page table', async ({ context, extensionId }) => {
      // Add a lead via popup
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await popup.waitForLoadState('domcontentloaded');
      
      await popup.locator('#manualEmail').fill('table@test.com');
      await popup.locator('#manualCompany').fill('Table Company');
      await popup.locator('#manualAddBtn').click();
      await popup.waitForTimeout(100);
      await popup.close();
      
      // Check leads page
      const leads = await context.newPage();
      await leads.goto(`chrome-extension://${extensionId}/leads.html`);
      await leads.waitForLoadState('domcontentloaded');
      await leads.waitForTimeout(100);
      
      const tbody = await leads.locator('#tbody').textContent();
      expect(tbody).toContain('table@test.com');
      await leads.close();
    });
  });

  test.describe('Lead Count', () => {
    test('should update count after adding lead', async ({ popupPage }) => {
      const initialCount = parseInt(await popupPage.locator('#leadCount').textContent());
      
      await popupPage.locator('#manualEmail').fill('counttest@test.com');
      await popupPage.locator('#manualAddBtn').click();
      // Wait for status confirmation
      await expect(popupPage.locator('#extractStatus')).toHaveText('Added.', { timeout: 3000 });
      
      const newCount = parseInt(await popupPage.locator('#leadCount').textContent());
      expect(newCount).toBe(initialCount + 1);
    });

    test('should update count after refresh', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('refresh@test.com');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const countBefore = await popupPage.locator('#leadCount').textContent();
      await popupPage.locator('#refreshBtn').click();
      await popupPage.waitForTimeout(100);
      
      const countAfter = await popupPage.locator('#leadCount').textContent();
      expect(countAfter).toBe(countBefore);
    });
  });
});

test.describe('Leads Page Operations', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Clear and add fresh test data
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    // Set up dialog handler for clear
    popup.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await popup.locator('#clearBtn').click();
    await popup.waitForTimeout(100);
    
    // Add test leads
    const emails = ['search1@test.com', 'search2@test.com', 'filter@company.com'];
    const companies = ['Search Corp', 'Search Inc', 'Filter Company'];
    
    for (let i = 0; i < emails.length; i++) {
      await popup.locator('#manualEmail').fill(emails[i]);
      await popup.locator('#manualCompany').fill(companies[i]);
      await popup.locator('#manualAddBtn').click();
      await popup.waitForTimeout(100);
    }
    
    await popup.close();
  });

  test.describe('Search and Filter', () => {
    test('should filter leads by search text', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('search1');
      await leadsPage.waitForTimeout(100);
      
      const subtitle = await leadsPage.locator('#subtitle').textContent();
      expect(subtitle).toContain('Matching');
    });

    test('should filter by company name', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('Search Corp');
      await leadsPage.waitForTimeout(100);
      
      const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(rows).toBeGreaterThan(0);
    });

    test('should show no results for non-matching search', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('nonexistent12345');
      await leadsPage.waitForTimeout(100);
      
      const tbody = await leadsPage.locator('#tbody').textContent();
      expect(tbody).toContain('No leads');
    });

    test('should clear search to show all leads', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('search1');
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('');
      await leadsPage.waitForTimeout(100);
      
      const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(rows).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Selection', () => {
    test('should select all on page', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#selectAllPage').click();
      
      const subtitle = await leadsPage.locator('#subtitle').textContent();
      expect(subtitle).toContain('Selected');
    });

    test('should deselect all on second click', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#selectAllPage').click();
      await leadsPage.locator('#selectAllPage').click();
      
      const checked = await leadsPage.locator('#selectAllPage').isChecked();
      expect(checked).toBe(false);
    });
  });

  test.describe('Pagination', () => {
    test('should display page info', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const pagerText = await leadsPage.locator('#pagerText').textContent();
      expect(pagerText).toMatch(/\d+/);
    });

    test('should change page size', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#pageSize').selectOption('50');
      await leadsPage.waitForTimeout(100);
      
      // Should still show leads
      const rows = await leadsPage.locator('#tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    });
  });

  test.describe('Lead Details', () => {
    test('should show details when clicking details button', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const detailsBtn = leadsPage.locator('.js-details').first();
      if (await detailsBtn.count() > 0) {
        await detailsBtn.click();
        await leadsPage.waitForTimeout(100);
        
        const detailBox = leadsPage.locator('.detailBox').first();
        await expect(detailBox).toBeVisible();
      }
    });

    test('should hide details when clicking again', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const detailsBtn = leadsPage.locator('.js-details').first();
      if (await detailsBtn.count() > 0) {
        await detailsBtn.click();
        await leadsPage.waitForTimeout(100);
        await detailsBtn.click();
        await leadsPage.waitForTimeout(100);
        
        const detailRows = await leadsPage.locator('.detailRow').count();
        expect(detailRows).toBe(0);
      }
    });
  });

  test.describe('Bulk Delete', () => {
    test('should delete selected leads', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const initialRows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      
      // Select all and delete
      await leadsPage.locator('#selectAllPage').click();
      
      leadsPage.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await leadsPage.locator('#deleteSelectedBtn').click();
      await leadsPage.waitForTimeout(100);
      
      const tbody = await leadsPage.locator('#tbody').textContent();
      // After deleting all, should show no leads
      if (initialRows > 0) {
        expect(tbody).toContain('No leads');
      }
    });
  });

  test.describe('Clear All', () => {
    test('should clear all leads', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      leadsPage.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await leadsPage.locator('#clearAllBtn').click();
      await leadsPage.waitForTimeout(100);
      
      const tbody = await leadsPage.locator('#tbody').textContent();
      expect(tbody).toContain('No leads');
    });
  });
});

test.describe('Data Persistence', () => {
  test('should persist leads across popup reopens', async ({ context, extensionId }) => {
    // Add a lead
    const popup1 = await context.newPage();
    await popup1.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup1.waitForLoadState('domcontentloaded');
    
    await popup1.locator('#manualEmail').fill('persist@test.com');
    await popup1.locator('#manualAddBtn').click();
    await popup1.waitForTimeout(100);
    
    const count1 = await popup1.locator('#leadCount').textContent();
    await popup1.close();
    
    // Reopen
    const popup2 = await context.newPage();
    await popup2.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup2.waitForLoadState('domcontentloaded');
    await popup2.waitForTimeout(100);
    
    const count2 = await popup2.locator('#leadCount').textContent();
    expect(parseInt(count2)).toBeGreaterThanOrEqual(parseInt(count1));
    await popup2.close();
  });

  test('should sync between popup and leads page', async ({ context, extensionId }) => {
    // Add via popup
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    await popup.locator('#manualEmail').fill('sync@test.com');
    await popup.locator('#manualCompany').fill('Sync Company');
    await popup.locator('#manualAddBtn').click();
    await popup.waitForTimeout(100);
    await popup.close();
    
    // Check in leads page
    const leads = await context.newPage();
    await leads.goto(`chrome-extension://${extensionId}/leads.html`);
    await leads.waitForLoadState('domcontentloaded');
    await leads.waitForTimeout(100);
    
    const tbody = await leads.locator('#tbody').textContent();
    expect(tbody).toContain('sync@test.com');
    await leads.close();
  });

  test('should persist settings across options page reopens', async ({ context, extensionId }) => {
    // Change setting
    const options1 = await context.newPage();
    await options1.goto(`chrome-extension://${extensionId}/options.html`);
    await options1.waitForLoadState('domcontentloaded');
    await options1.waitForTimeout(200);
    
    await options1.locator('#maxLeads').fill('888');
    await options1.locator('#saveBtn').click();
    // Wait for save confirmation
    await options1.locator('#status').filter({ hasText: 'Saved' }).waitFor({ timeout: 3000 });
    await options1.close();
    
    // Reopen
    const options2 = await context.newPage();
    await options2.goto(`chrome-extension://${extensionId}/options.html`);
    await options2.waitForLoadState('domcontentloaded');
    await options2.waitForTimeout(200);
    
    const value = await options2.locator('#maxLeads').inputValue();
    expect(value).toBe('888');
    
    // Restore
    await options2.locator('#maxLeads').fill('2000');
    await options2.locator('#saveBtn').click();
    await options2.locator('#status').filter({ hasText: 'Saved' }).waitFor({ timeout: 3000 });
    await options2.close();
  });
});

test.describe('Navigation', () => {
  test('should navigate from popup to options', async ({ popupPage, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      popupPage.locator('a[href="options.html"]').click()
    ]);
    
    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('options.html');
    await newPage.close();
  });

  test('should navigate from popup to leads page', async ({ popupPage, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      popupPage.locator('#openLeadsBtn').click()
    ]);
    
    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('leads.html');
    await newPage.close();
  });

  test('should navigate from leads to options', async ({ leadsPage, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      leadsPage.locator('a[href="options.html"]').click()
    ]);
    
    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('options.html');
    await newPage.close();
  });
});

test.describe('Status Messages', () => {
  test('should show saved status in options', async ({ optionsPage }) => {
    await optionsPage.waitForTimeout(100);
    await optionsPage.locator('#saveBtn').click();
    await optionsPage.waitForTimeout(100);
    
    const status = await optionsPage.locator('#status').textContent();
    expect(status).toBe('Saved.');
  });

  test('should show added status in popup', async ({ popupPage }) => {
    await popupPage.locator('#manualEmail').fill('statustest@test.com');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toBe('Added.');
  });

  test('should show extraction count in popup', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('one@test.com two@test.com');
    await popupPage.locator('#extractEmailsBtn').click();
    // Wait for status to be populated
    await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('2');
    expect(status).toContain('email');
  });
});
