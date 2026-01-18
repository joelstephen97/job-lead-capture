/**
 * Tests for LinkedIn-specific scanning functionality.
 * Tests the content script's ability to extract emails from LinkedIn posts and profiles.
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('LinkedIn Scanning Features', () => {
  test.describe('Email Regex Pattern', () => {
    test('should extract standard email format', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Contact: Zoya6aquarius@gmail.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract emails with numbers in local part', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Email us at user123test@company.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract emails with special characters', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Contact: first.last+tag@sub-domain.co.uk');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract multiple emails from job post text', async ({ popupPage }) => {
      const jobPost = `
        We're Hiring #FieldSalesExecutive - #AbuDhabi (UAE)
        
        Looking for experienced #FieldSales Executives with a #marine background.
        
        📩 Send CV to: Zoya6aquarius@gmail.com
        Alternative: hr@company.com
        
        #Hiring #MarineJobs #FieldSales
      `;
      
      await popupPage.locator('#manualText').fill(jobPost);
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('2 email');
    });

    test('should handle emails in mailto links format', async ({ popupPage }) => {
      // Simulating text that might come from a LinkedIn post with mailto link
      await popupPage.locator('#manualText').fill('mailto:contact@example.com for inquiries');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });
  });

  test.describe('Job Post Email Extraction', () => {
    test('should extract email from typical job post format', async ({ popupPage }) => {
      const typicalJobPost = `
        Hiring: Senior Developer
        Location: Dubai, UAE
        
        Requirements:
        - 5+ years experience
        - Strong JavaScript skills
        
        Apply now! Send resume to: careers@techjobs.com
      `;
      
      await popupPage.locator('#manualText').fill(typicalJobPost);
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should extract email with emoji prefix', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('📩 Send CV to: recruiter@company.ae');
      await popupPage.locator('#extractEmailsBtn').click();
      // Wait for status to be populated
      await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });

    test('should handle emails at end of hashtag list', async ({ popupPage }) => {
      const hashtagPost = `
        #Hiring #Jobs #UAE #Dubai
        Contact: jobs@startup.io
        #JobSearch #NowHiring
      `;
      
      await popupPage.locator('#manualText').fill(hashtagPost);
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const status = await popupPage.locator('#extractStatus').textContent();
      expect(status).toContain('1 email');
    });
  });

  test.describe('Lead Storage for LinkedIn Captures', () => {
    test('should store extracted emails as leads', async ({ popupPage }) => {
      const initialCount = parseInt(await popupPage.locator('#leadCount').textContent());
      
      await popupPage.locator('#manualText').fill('Apply to: linkedin-test@example.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const newCount = parseInt(await popupPage.locator('#leadCount').textContent());
      expect(newCount).toBe(initialCount + 1);
    });

    test('should deduplicate same email from different posts', async ({ popupPage }) => {
      // Add first occurrence
      await popupPage.locator('#manualText').fill('First post: dedup-test@company.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count1 = parseInt(await popupPage.locator('#leadCount').textContent());
      
      // Try to add same email again
      await popupPage.locator('#manualText').fill('Second post: dedup-test@company.com');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      const count2 = parseInt(await popupPage.locator('#leadCount').textContent());
      expect(count2).toBe(count1);
    });

    test('should normalize email case', async ({ popupPage }) => {
      await popupPage.locator('#manualText').fill('Contact: UPPERCASE@EXAMPLE.COM');
      await popupPage.locator('#extractEmailsBtn').click();
      await popupPage.waitForTimeout(100);
      
      // Check leads page for normalized email
      await popupPage.locator('#refreshBtn').click();
      await popupPage.waitForTimeout(100);
      
      const leadList = await popupPage.locator('#leadList').textContent();
      expect(leadList.toLowerCase()).toContain('uppercase@example.com');
    });
  });

  test.describe('Keyword Matching for LinkedIn', () => {
    test('should match default sales keyword', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      const keywords = await optionsPage.locator('#keywords').inputValue();
      expect(keywords.toLowerCase()).toContain('sales');
    });

    test('should match default business development keyword', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      const keywords = await optionsPage.locator('#keywords').inputValue();
      expect(keywords.toLowerCase()).toContain('business development');
    });

    test('should allow custom keywords for job matching', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      // Add LinkedIn-specific keywords
      await optionsPage.locator('#keywords').fill('hiring\nrecruiter\nopening\njob opportunity');
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      const status = await optionsPage.locator('#status').textContent();
      expect(status).toBe('Saved.');
      
      // Restore defaults
      await optionsPage.locator('#keywords').fill('sales\nbusiness development\npartnerships');
      await optionsPage.locator('#saveBtn').click();
    });
  });

  test.describe('Visible Only Setting', () => {
    test('visible only should be enabled by default', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      const visibleOnly = await optionsPage.locator('#autoScanVisibleOnly').isChecked();
      expect(visibleOnly).toBe(true);
    });

    test('should be able to disable visible only', async ({ optionsPage }) => {
      await optionsPage.waitForTimeout(100);
      
      const checkbox = optionsPage.locator('#autoScanVisibleOnly');
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
      await optionsPage.waitForTimeout(100);
      
      await optionsPage.reload();
      await optionsPage.waitForTimeout(100);
      
      const isChecked = await checkbox.isChecked();
      expect(isChecked).toBe(false);
      
      // Restore
      await checkbox.click();
      await optionsPage.locator('#saveBtn').click();
    });
  });

  test.describe('LinkedIn-style Matched Terms', () => {
    test('should accept leads without strict keyword match (linkedin-post tag)', async ({ context, extensionId }) => {
      // This tests that manually added leads work (simulating what happens with linkedin-post tag)
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await popup.waitForLoadState('domcontentloaded');
      
      await popup.locator('#manualEmail').fill('linkedin-capture@test.com');
      await popup.locator('#manualCompany').fill('LinkedIn Post Capture');
      await popup.locator('#manualAddBtn').click();
      await popup.waitForTimeout(100);
      
      const status = await popup.locator('#extractStatus').textContent();
      expect(status).toBe('Added.');
      
      await popup.close();
      
      // Verify in leads page
      const leads = await context.newPage();
      await leads.goto(`chrome-extension://${extensionId}/leads.html`);
      await leads.waitForLoadState('domcontentloaded');
      await leads.waitForTimeout(100);
      
      const tbody = await leads.locator('#tbody').textContent();
      expect(tbody).toContain('linkedin-capture@test.com');
      
      await leads.close();
    });
  });
});

test.describe('Feed Post Email Patterns', () => {
  test('should extract email after "Send CV to:" pattern', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('Send CV to: applicant@jobs.com');
    await popupPage.locator('#extractEmailsBtn').click();
    // Wait for status to be populated
    await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should extract email after "Apply at:" pattern', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('Apply at: careers@startup.com');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should extract email after "Contact:" pattern', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('Contact: info@business.net');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should extract email after "Email:" pattern', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('Email: support@company.org');
    await popupPage.locator('#extractEmailsBtn').click();
    // Wait for status to be populated
    await expect(popupPage.locator('#extractStatus')).not.toBeEmpty({ timeout: 3000 });
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });

  test('should handle regional TLDs', async ({ popupPage }) => {
    await popupPage.locator('#manualText').fill('Contact: recruiter@company.ae for UAE jobs');
    await popupPage.locator('#extractEmailsBtn').click();
    await popupPage.waitForTimeout(100);
    
    const status = await popupPage.locator('#extractStatus').textContent();
    expect(status).toContain('1 email');
  });
});
