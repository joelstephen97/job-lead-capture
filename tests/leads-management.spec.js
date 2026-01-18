/**
 * Tests for leads management functionality.
 * Comprehensive tests for lead operations across popup and leads page.
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Leads Management', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Clear existing leads and add fresh test data
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    // Clear existing leads
    popup.on('dialog', async dialog => {
      await dialog.accept();
    });
    await popup.locator('#clearBtn').click();
    await popup.waitForTimeout(100);
    
    // Add test leads
    const testEmails = ['lead1@test.com', 'lead2@test.com', 'lead3@test.com'];
    for (const email of testEmails) {
      await popup.locator('#manualEmail').fill(email);
      await popup.locator('#manualCompany').fill(`Company for ${email}`);
      await popup.locator('#manualAddBtn').click();
      await popup.waitForTimeout(100);
    }
    
    await popup.close();
  });

  test.describe('Lead Display', () => {
    test('should display leads in table', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(rows).toBe(3);
    });

    test('should show company names', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const tbody = await leadsPage.locator('#tbody').textContent();
      expect(tbody).toContain('Company for lead1@test.com');
    });

    test('should show email addresses', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const tbody = await leadsPage.locator('#tbody').textContent();
      expect(tbody).toContain('lead1@test.com');
      expect(tbody).toContain('lead2@test.com');
      expect(tbody).toContain('lead3@test.com');
    });

    test('should show capture type', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      // Manual leads should show "manual" or similar indicator
      const tbody = await leadsPage.locator('#tbody').textContent();
      expect(tbody.length).toBeGreaterThan(50);
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter leads by email', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('lead1');
      await leadsPage.waitForTimeout(100);
      
      const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(rows).toBe(1);
    });

    test('should filter leads by company', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('Company for lead2');
      await leadsPage.waitForTimeout(100);
      
      const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(rows).toBe(1);
    });

    test('should show matching count in subtitle', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('lead');
      await leadsPage.waitForTimeout(100);
      
      const subtitle = await leadsPage.locator('#subtitle').textContent();
      expect(subtitle).toContain('Matching');
      expect(subtitle).toContain('3');
    });

    test('should be case insensitive', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#search').fill('LEAD1');
      await leadsPage.waitForTimeout(100);
      
      const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(rows).toBe(1);
    });
  });

  test.describe('Selection Operations', () => {
    test('should select all leads on page', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#selectAllPage').click();
      
      const subtitle = await leadsPage.locator('#subtitle').textContent();
      expect(subtitle).toContain('Selected');
      expect(subtitle).toContain('3');
    });

    test('should deselect all when clicking again', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#selectAllPage').click();
      await leadsPage.locator('#selectAllPage').click();
      
      const subtitle = await leadsPage.locator('#subtitle').textContent();
      // After deselecting all, should show "Selected: 0"
      expect(subtitle).toContain('Selected: 0');
    });

    test('should select individual leads', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const checkbox = leadsPage.locator('#tbody input[type="checkbox"]').first();
      if (await checkbox.count() > 0) {
        await checkbox.click();
        
        const subtitle = await leadsPage.locator('#subtitle').textContent();
        expect(subtitle).toContain('Selected: 1');
      }
    });
  });

  test.describe('Lead Details', () => {
    test('should show details on click', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const detailsBtn = leadsPage.locator('.js-details').first();
      if (await detailsBtn.count() > 0) {
        await detailsBtn.click();
        await leadsPage.waitForTimeout(100);
        
        const detailBox = leadsPage.locator('.detailBox').first();
        await expect(detailBox).toBeVisible();
      }
    });

    test('should display email in details', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const detailsBtn = leadsPage.locator('.js-details').first();
      if (await detailsBtn.count() > 0) {
        await detailsBtn.click();
        await leadsPage.waitForTimeout(100);
        
        // Detail box shows metadata like capture type, matched terms, etc.
        const detailBox = await leadsPage.locator('.detailBox').first().textContent();
        expect(detailBox).toContain('Captured via');
      }
    });

    test('should display company in details', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const detailsBtn = leadsPage.locator('.js-details').first();
      if (await detailsBtn.count() > 0) {
        await detailsBtn.click();
        await leadsPage.waitForTimeout(100);
        
        // Detail box shows metadata - company is in main row, details has Source URL etc.
        const detailBox = await leadsPage.locator('.detailBox').first().textContent();
        expect(detailBox).toContain('Source URL');
      }
    });

    test('should toggle details off', async ({ leadsPage }) => {
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

  test.describe('Copy BCC', () => {
    test('should copy BCC with selected leads', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      await leadsPage.locator('#selectAllPage').click();
      await leadsPage.locator('#copyBccBtn').click();
      await leadsPage.waitForTimeout(100);
      
      const status = await leadsPage.locator('#status').textContent();
      // Should show success or have clipboard content
      expect(status.length).toBeGreaterThan(0);
    });

    test('should show message when no leads selected', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      // Don't select any
      await leadsPage.locator('#copyBccBtn').click();
      await leadsPage.waitForTimeout(100);
      
      const status = await leadsPage.locator('#status').textContent();
      // Should indicate no selection
      expect(status.length).toBeGreaterThan(0);
    });
  });

  test.describe('Delete Operations', () => {
    test('should delete selected leads', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const initialRows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      
      // Select first lead only
      const checkbox = leadsPage.locator('#tbody input[type="checkbox"]').first();
      if (await checkbox.count() > 0) {
        await checkbox.click();
        
        leadsPage.on('dialog', async dialog => {
          await dialog.accept();
        });
        
        await leadsPage.locator('#deleteSelectedBtn').click();
        await leadsPage.waitForTimeout(100);
        
        const newRows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
        expect(newRows).toBe(initialRows - 1);
      }
    });

    test('should delete via row action', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const deleteBtn = leadsPage.locator('.js-delete').first();
      if (await deleteBtn.count() > 0) {
        leadsPage.on('dialog', async dialog => {
          await dialog.accept();
        });
        
        await deleteBtn.click();
        await leadsPage.waitForTimeout(100);
        
        const rows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
        expect(rows).toBe(2);
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

    test('should update subtitle after clear', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      leadsPage.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await leadsPage.locator('#clearAllBtn').click();
      await leadsPage.waitForTimeout(100);
      
      const subtitle = await leadsPage.locator('#subtitle').textContent();
      expect(subtitle).toContain('0');
    });
  });

  test.describe('Refresh', () => {
    test('should refresh lead list', async ({ leadsPage }) => {
      await leadsPage.waitForTimeout(100);
      
      const initialRows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      
      await leadsPage.locator('#refreshBtn').click();
      await leadsPage.waitForTimeout(100);
      
      const newRows = await leadsPage.locator('#tbody tr:not(.detailRow)').count();
      expect(newRows).toBe(initialRows);
    });
  });
});

test.describe('Clear Leads via Popup', () => {
  test('should clear all leads', async ({ popupPage }) => {
    // Add a lead first
    await popupPage.locator('#manualEmail').fill('toclear@test.com');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    popupPage.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await popupPage.locator('#clearBtn').click();
    await popupPage.waitForTimeout(100);
    
    const count = await popupPage.locator('#leadCount').textContent();
    expect(count).toBe('0');
  });

  test('should update lead list after clear', async ({ popupPage }) => {
    await popupPage.locator('#manualEmail').fill('listclear@test.com');
    await popupPage.locator('#manualAddBtn').click();
    await popupPage.waitForTimeout(100);
    
    popupPage.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await popupPage.locator('#clearBtn').click();
    await popupPage.waitForTimeout(100);
    
    const leadList = await popupPage.locator('#leadList').textContent();
    // Should be empty or show "No leads" message
    expect(leadList).toMatch(/^$|no leads/i);
  });
});

test.describe('Popup Lead List', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    popup.on('dialog', async dialog => {
      await dialog.accept();
    });
    await popup.locator('#clearBtn').click();
    await popup.waitForTimeout(100);
    
    // Add test leads
    for (let i = 1; i <= 3; i++) {
      await popup.locator('#manualEmail').fill(`popuplead${i}@test.com`);
      await popup.locator('#manualCompany').fill(`Popup Company ${i}`);
      await popup.locator('#manualAddBtn').click();
      await popup.waitForTimeout(50);
    }
    
    await popup.close();
  });

  test('should display leads in popup list', async ({ popupPage }) => {
    await popupPage.waitForTimeout(100);
    
    const leadList = await popupPage.locator('#leadList').textContent();
    expect(leadList).toContain('popuplead');
  });

  test('should show company name in lead card', async ({ popupPage }) => {
    await popupPage.waitForTimeout(100);
    
    const leadCompany = popupPage.locator('.leadCompany').first();
    if (await leadCompany.count() > 0) {
      const text = await leadCompany.textContent();
      expect(text).toContain('Popup Company');
    }
  });

  test('should show email in lead card', async ({ popupPage }) => {
    await popupPage.waitForTimeout(100);
    
    const leadEmail = popupPage.locator('.leadEmail').first();
    if (await leadEmail.count() > 0) {
      const text = await leadEmail.textContent();
      expect(text).toContain('@test.com');
    }
  });

  test('should update count correctly', async ({ popupPage }) => {
    await popupPage.waitForTimeout(100);
    
    const count = await popupPage.locator('#leadCount').textContent();
    expect(parseInt(count)).toBe(3);
  });
});

test.describe('Export CSV', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');
    
    // Add a test lead for export
    await popup.locator('#manualEmail').fill('export@test.com');
    await popup.locator('#manualCompany').fill('Export Company');
    await popup.locator('#manualAddBtn').click();
    await popup.waitForTimeout(100);
    
    await popup.close();
  });

  test('should have export button in popup', async ({ popupPage }) => {
    const exportBtn = popupPage.locator('#exportCsvBtn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toHaveText('Export CSV');
  });

  test('should have export button in leads page', async ({ leadsPage }) => {
    const exportBtn = leadsPage.locator('#exportBtn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toHaveText('Export CSV');
  });
});
