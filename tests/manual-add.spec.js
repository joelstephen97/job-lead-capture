/**
 * Tests for manual lead addition functionality.
 * Comprehensive tests for adding leads manually and extracting emails from text.
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Manual Lead Addition', () => {
  test.describe('Basic Add Operations', () => {
    test('should add a lead with email only', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('basic@example.com');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toBe('Added.');
      
      const count = await popupPage.locator('#leadCount').textContent();
      expect(parseInt(count)).toBeGreaterThan(0);
    });

    test('should add a lead with email and company', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('full@example.com');
      await popupPage.locator('#manualCompany').fill('Full Test Company');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toBe('Added.');
    });

    test('should require email for manual add', async ({ popupPage }) => {
      await popupPage.locator('#manualCompany').fill('No Email Company');
      await popupPage.locator('#manualEmail').fill('');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('required');
    });

    test('should clear inputs after successful add', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('clear@example.com');
      await popupPage.locator('#manualCompany').fill('Clear Test Co');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const email = await popupPage.locator('#manualEmail').inputValue();
      const company = await popupPage.locator('#manualCompany').inputValue();
      expect(email).toBe('');
      expect(company).toBe('');
    });

    test('should normalize email to lowercase', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('UPPERCASE@Example.COM');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      // Refresh to see the lead
      await popupPage.locator('#refreshBtn').click();
      await popupPage.waitForTimeout(100);
      
      // The email should be stored in lowercase
      const leadList = await popupPage.locator('#leadList').textContent();
      expect(leadList.toLowerCase()).toContain('uppercase@example.com');
    });

    test('should trim whitespace from inputs', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('  spaced@test.com  ');
      await popupPage.locator('#manualCompany').fill('  Spaced Company  ');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toBe('Added.');
    });
  });

  test.describe('Duplicate Prevention', () => {
    test('should not add duplicate emails', async ({ popupPage }) => {
      const email = 'duplicate@test.com';
      
      // Add first time
      await popupPage.locator('#manualEmail').fill(email);
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count1 = parseInt(await popupPage.locator('#leadCount').textContent());
      
      // Try to add again
      await popupPage.locator('#manualEmail').fill(email);
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count2 = parseInt(await popupPage.locator('#leadCount').textContent());
      expect(count2).toBe(count1);
    });

    test('should treat same email with different case as duplicate', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('case@test.com');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count1 = parseInt(await popupPage.locator('#leadCount').textContent());
      
      await popupPage.locator('#manualEmail').fill('CASE@TEST.COM');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count2 = parseInt(await popupPage.locator('#leadCount').textContent());
      expect(count2).toBe(count1);
    });
  });

  test.describe('Email Validation', () => {
    test('should reject invalid email format', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('notanemail');
      await popupPage.locator('#manualAddBtn').click();
      // Wait for status to be populated
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
      
      const status = await popupPage.locator('#extractStatus').textContent();
      // Should show validation error
      expect(status.toLowerCase()).toContain('valid');
    });

    test('should reject email without domain', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('missing@');
      await popupPage.locator('#manualAddBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('valid');
    });

    test('should reject email without username', async ({ popupPage }) => {
      await popupPage.locator('#manualEmail').fill('@nodomain.com');
      await popupPage.locator('#manualAddBtn').click();
      // Wait for status to be populated
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('valid');
    });
  });
});

test.describe('Email Extraction from Text', () => {
  test.describe('Single Email Extraction', () => {
    test('should extract single email from text', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Contact us at single@example.com for help');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract email from start of text', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('start@test.com is our contact');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract email from end of text', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Contact us at end@test.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });
  });

  test.describe('Multiple Email Extraction', () => {
    test('should extract multiple emails', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Email one@example.com and two@example.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('2 email');
    });

    test('should extract emails from multi-line text', async ({ popupPage }) => {
      const text = `
        First contact: line1@test.com
        Second contact: line2@test.com
        Third contact: line3@test.com
      `;
      await popupPage.locator('#manualText').fill(text);
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(200);
      
      // Wait for status to update
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty();
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('3 email');
    });

    test('should deduplicate extracted emails', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Email same@test.com and same@test.com again');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should deduplicate case-insensitive', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Email same@test.com and SAME@TEST.COM');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });
  });

  test.describe('No Email Scenarios', () => {
    test('should handle text with no emails', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('No emails here, just plain text.');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('no email');
    });

    test('should handle empty text area', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      // Empty text shows "paste some text first" message
      expect(status.toLowerCase()).toMatch(/no email|paste/);
    });

    test('should handle whitespace only', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('   \n   \t   ');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      // Whitespace-only shows "paste some text first" message
      expect(status.toLowerCase()).toMatch(/no email|paste/);
    });
  });

  test.describe('Invalid Email Formats', () => {
    test('should reject @nodomain patterns', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Invalid: @nodomain and @another');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('no email');
    });

    test('should reject missing@ patterns', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Invalid: missing@ and incomplete@');
      await popupPage.locator('#extractEmailsBtn').click();
      // Wait for status to be populated
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('no email');
    });

    test('should reject plain words', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('notanemail word another');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status.toLowerCase()).toContain('no email');
    });
  });

  test.describe('Mixed Valid and Invalid', () => {
    test('should extract only valid emails', async ({ popupPage }) => {
      const text = `
        Valid: valid@test.com
        Invalid: @nouser
        Another valid: another@example.org
        Bad: incomplete@
      `;
      await popupPage.locator('#manualText').fill(text);
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('2 email');
    });
  });

  test.describe('Clear Text', () => {
    test('should clear text area', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Some text to clear');
      await popupPage.locator('#clearTextBtn').click();
      
      const value = await popupPage.locator('#manualText').inputValue();
      expect(value).toBe('');
    });

    test('should clear status after clearing text', async ({ popupPage }) => {
      // First extract some emails
      await popupPage.locator('#manualText').fill('test@example.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      // Clear text
      await popupPage.locator('#clearTextBtn').click();
      
      // Text should be cleared
      const value = await popupPage.locator('#manualText').inputValue();
      expect(value).toBe('');
    });
  });
});

test.describe('Lead Persistence', () => {
  test('should persist leads across popup reopens', async ({ context, extensionId }) => {
    // Open popup and add a lead
    const popup1 = await context.newPage();
    await popup1.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup1.waitForLoadState('domcontentloaded');
    
    await popup1.locator('#manualEmail').fill('persist@test.com');
    await popup1.locator('#manualCompany').fill('Persist Corp');
    await popup1.locator('#manualAddBtn').click();
    await popup1.waitForTimeout(100);
    
    const count1 = parseInt(await popup1.locator('#leadCount').textContent());
    await popup1.close();
    
    // Reopen popup
    const popup2 = await context.newPage();
    await popup2.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup2.waitForLoadState('domcontentloaded');
    await popup2.waitForTimeout(100);
    
    const count2 = parseInt(await popup2.locator('#leadCount').textContent());
    expect(count2).toBeGreaterThanOrEqual(count1);
    
    await popup2.close();
  });

  test('should persist extracted emails', async ({ context, extensionId }) => {
    const popup1 = await context.newPage();
    await popup1.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup1.waitForLoadState('domcontentloaded');
    
    await popup1.locator('#manualText').fill('extracted@persist.com');
    await popup1.locator('#extractEmailsBtn').click();
    await popup1.waitForTimeout(100);
    
    const count1 = parseInt(await popup1.locator('#leadCount').textContent());
    await popup1.close();
    
    const popup2 = await context.newPage();
    await popup2.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup2.waitForLoadState('domcontentloaded');
    await popup2.waitForTimeout(100);
    
    const count2 = parseInt(await popup2.locator('#leadCount').textContent());
    expect(count2).toBeGreaterThanOrEqual(count1);
    
    await popup2.close();
  });

  test('should show leads in leads page after adding via popup', async ({ context, extensionId }) => {
    // Clear first
    const clearPopup = await context.newPage();
    await clearPopup.goto(`chrome-extension://${extensionId}/popup.html`);
    await clearPopup.waitForLoadState('domcontentloaded');
    
    clearPopup.on('dialog', async dialog => {
      await dialog.accept();
    });
    await clearPopup.locator('#clearBtn').click();
    await clearPopup.waitForTimeout(100);
    
    // Add a lead
    await clearPopup.locator('#manualEmail').fill('crosspage@test.com');
    await clearPopup.locator('#manualCompany').fill('Cross Page Inc');
    await clearPopup.locator('#manualAddBtn').click();
    await clearPopup.waitForTimeout(100);
    await clearPopup.close();
    
    // Check leads page
    const leadsPage = await context.newPage();
    await leadsPage.goto(`chrome-extension://${extensionId}/leads.html`);
    await leadsPage.waitForLoadState('domcontentloaded');
    await leadsPage.waitForTimeout(100);
    
    const tbody = await leadsPage.locator('#tbody').textContent();
    expect(tbody).toContain('crosspage@test.com');
    expect(tbody).toContain('Cross Page Inc');
    
    await leadsPage.close();
  });
});

test.describe('Email Format Edge Cases', () => {
  test('should handle emails with plus signs', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('test+tag@example.com');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should handle emails with dots in local part', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('first.last@example.com');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should handle emails with numbers', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('user123@test456.com');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should handle emails with underscores', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('first_last@example.com');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should handle emails with hyphens in domain', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('user@my-company.com');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should handle emails with subdomains', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('user@mail.company.co.uk');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });
});
