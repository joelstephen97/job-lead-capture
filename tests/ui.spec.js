/**
 * Comprehensive UI tests for LeadingLeads extension.
 * Fine-grained tests for visual elements, styling, interactions, and accessibility.
 */

const { test } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Popup UI - Visual Elements', () => {
  test.describe('Header Section', () => {
    test('should display brand logo', async ({ popupPage }) => {
      const logo = popupPage.locator('.brandLogo');
      await expect(logo).toBeVisible();
      const src = await logo.getAttribute('src');
      expect(src).toContain('logo');
    });

    test('should have correct title styling', async ({ popupPage }) => {
      const title = popupPage.locator('.title');
      await expect(title).toBeVisible();
      const text = await title.textContent();
      expect(text).toBe('LeadingLeads');
    });

    test('should have subtitle with description', async ({ popupPage }) => {
      const subtitle = popupPage.locator('.subtitle');
      await expect(subtitle).toBeVisible();
      const text = await subtitle.textContent();
      expect(text.length).toBeGreaterThan(10);
    });

    test('should have options link in header', async ({ popupPage }) => {
      const optionsLink = popupPage.locator('a.link[href="options.html"]');
      await expect(optionsLink).toBeVisible();
      await expect(optionsLink).toHaveText('Options');
    });
  });

  test.describe('Card Sections', () => {
    test('should have three card sections', async ({ popupPage }) => {
      const cards = popupPage.locator('.card');
      const count = await cards.count();
      expect(count).toBe(3);
    });

    test('should have scan section as first card', async ({ popupPage }) => {
      const firstCard = popupPage.locator('.card').first();
      await expect(firstCard.locator('#scanBtn')).toBeVisible();
    });

    test('should have leads section as second card', async ({ popupPage }) => {
      const secondCard = popupPage.locator('.card').nth(1);
      await expect(secondCard.locator('#leadCount')).toBeVisible();
    });

    test('should have manual add section as third card', async ({ popupPage }) => {
      const thirdCard = popupPage.locator('.card').nth(2);
      await expect(thirdCard.locator('#manualAddBtn')).toBeVisible();
    });
  });

  test.describe('Button Styling', () => {
    test('scan button should have primary styling', async ({ popupPage }) => {
      const scanBtn = popupPage.locator('#scanBtn');
      const classList = await scanBtn.getAttribute('class');
      expect(classList).toContain('btn--primary');
    });

    test('gmail button should have primary styling', async ({ popupPage }) => {
      const gmailBtn = popupPage.locator('#gmailBtn');
      const classList = await gmailBtn.getAttribute('class');
      expect(classList).toContain('btn--primary');
    });

    test('clear button should have danger styling', async ({ popupPage }) => {
      const clearBtn = popupPage.locator('#clearBtn');
      const classList = await clearBtn.getAttribute('class');
      expect(classList).toContain('btn--danger');
    });

    test('secondary buttons should have secondary styling', async ({ popupPage }) => {
      const copyBtn = popupPage.locator('#copyBccBtn');
      const classList = await copyBtn.getAttribute('class');
      expect(classList).toContain('btn--secondary');
    });

    test('refresh button should have small size', async ({ popupPage }) => {
      const refreshBtn = popupPage.locator('#refreshBtn');
      const classList = await refreshBtn.getAttribute('class');
      expect(classList).toContain('btn--sm');
    });
  });

  test.describe('Input Fields', () => {
    test('email input should have placeholder', async ({ popupPage }) => {
      const emailInput = popupPage.locator('#manualEmail');
      const placeholder = await emailInput.getAttribute('placeholder');
      expect(placeholder).toContain('Email');
    });

    test('company input should have placeholder', async ({ popupPage }) => {
      const companyInput = popupPage.locator('#manualCompany');
      const placeholder = await companyInput.getAttribute('placeholder');
      expect(placeholder).toContain('Company');
    });

    test('text area should have placeholder', async ({ popupPage }) => {
      const textArea = popupPage.locator('#manualText');
      const placeholder = await textArea.getAttribute('placeholder');
      expect(placeholder).toContain('email');
    });

    test('inputs should have input class', async ({ popupPage }) => {
      const emailInput = popupPage.locator('#manualEmail');
      const classList = await emailInput.getAttribute('class');
      expect(classList).toContain('input');
    });

    test('textarea should have textarea class', async ({ popupPage }) => {
      const textArea = popupPage.locator('#manualText');
      const classList = await textArea.getAttribute('class');
      expect(classList).toContain('textarea');
    });
  });

  test.describe('Lead Counter', () => {
    test('should display lead count in pill', async ({ popupPage }) => {
      const pill = popupPage.locator('.pill');
      await expect(pill).toBeVisible();
    });

    test('should show 0 initially', async ({ popupPage }) => {
      const leadCount = popupPage.locator('#leadCount');
      const count = await leadCount.textContent();
      expect(count).toBe('0');
    });
  });

  test.describe('Checkbox Elements', () => {
    test('should have clear after gmail checkbox', async ({ popupPage }) => {
      const checkbox = popupPage.locator('#clearAfterGmail');
      await expect(checkbox).toBeVisible();
      await expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    test('checkbox should be in a label', async ({ popupPage }) => {
      const label = popupPage.locator('label.checkbox');
      await expect(label).toBeVisible();
    });
  });

  test.describe('Dividers', () => {
    test('should have dividers between sections', async ({ popupPage }) => {
      const dividers = popupPage.locator('.divider');
      const count = await dividers.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Status Areas', () => {
    test('should have scan status area', async ({ popupPage }) => {
      const status = popupPage.locator('#status');
      await expect(status).toBeVisible();
    });

    test('should have extract status area', async ({ popupPage }) => {
      const extractStatus = popupPage.locator('#extractStatus');
      await expect(extractStatus).toBeVisible();
    });
  });

  test.describe('Lead List', () => {
    test('should have lead list container', async ({ popupPage }) => {
      const leadList = popupPage.locator('#leadList');
      await expect(leadList).toBeVisible();
    });

    test('lead list should have correct class', async ({ popupPage }) => {
      const leadList = popupPage.locator('#leadList');
      const classList = await leadList.getAttribute('class');
      expect(classList).toContain('leadList');
    });
  });
});

test.describe('Popup UI - Interactions', () => {
  test.describe('Button Hover States', () => {
    test('buttons should be clickable', async ({ popupPage }) => {
      const scanBtn = popupPage.locator('#scanBtn');
      await expect(scanBtn).toBeEnabled();
    });

    test('all action buttons should be enabled', async ({ popupPage }) => {
      await expect(popupPage.locator('#copyBccBtn')).toBeEnabled();
      await expect(popupPage.locator('#gmailBtn')).toBeEnabled();
      await expect(popupPage.locator('#exportCsvBtn')).toBeEnabled();
      await expect(popupPage.locator('#clearBtn')).toBeEnabled();
    });
  });

  test.describe('Input Focus', () => {
    test('email input should be focusable', async ({ popupPage }) => {
      const emailInput = popupPage.locator('#manualEmail');
      await emailInput.focus();
      await expect(emailInput).toBeFocused();
    });

    test('company input should be focusable', async ({ popupPage }) => {
      const companyInput = popupPage.locator('#manualCompany');
      await companyInput.focus();
      await expect(companyInput).toBeFocused();
    });

    test('textarea should be focusable', async ({ popupPage }) => {
      const textArea = popupPage.locator('#manualText');
      await textArea.focus();
      await expect(textArea).toBeFocused();
    });
  });

  test.describe('Checkbox Toggle', () => {
    test('should toggle clear after gmail checkbox', async ({ popupPage }) => {
      const checkbox = popupPage.locator('#clearAfterGmail');
      const initialState = await checkbox.isChecked();
      await checkbox.click();
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      // Restore
      await checkbox.click();
    });
  });
});

test.describe('Options Page UI - Visual Elements', () => {
  test.describe('Header', () => {
    test('should display brand section', async ({ optionsPage }) => {
      const brand = optionsPage.locator('.brand');
      await expect(brand).toBeVisible();
    });

    test('should display logo', async ({ optionsPage }) => {
      const logo = optionsPage.locator('.brandLogo');
      await expect(logo).toBeVisible();
    });

    test('should have title containing Options', async ({ optionsPage }) => {
      const title = optionsPage.locator('.title');
      await expect(title).toContainText('Options');
    });
  });

  test.describe('Cards', () => {
    test('should have multiple card sections', async ({ optionsPage }) => {
      const cards = optionsPage.locator('.card');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Form Elements', () => {
    test('keywords textarea should have proper dimensions', async ({ optionsPage }) => {
      const textarea = optionsPage.locator('#keywords');
      await expect(textarea).toBeVisible();
      const box = await textarea.boundingBox();
      expect(box.height).toBeGreaterThan(100);
    });

    test('theme select should have 3 options', async ({ optionsPage }) => {
      const options = optionsPage.locator('#theme option');
      const count = await options.count();
      expect(count).toBe(3);
    });

    test('max leads input should be number type', async ({ optionsPage }) => {
      const input = optionsPage.locator('#maxLeads');
      const type = await input.getAttribute('type');
      expect(type).toBe('number');
    });

    test('max leads should have min value', async ({ optionsPage }) => {
      const input = optionsPage.locator('#maxLeads');
      const min = await input.getAttribute('min');
      expect(parseInt(min)).toBeGreaterThanOrEqual(100);
    });
  });

  test.describe('Checkboxes', () => {
    test('should have 5 checkbox options', async ({ optionsPage }) => {
      const checkboxes = optionsPage.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBe(5);
    });

    test('each checkbox should be in a label', async ({ optionsPage }) => {
      const labels = optionsPage.locator('label.checkbox');
      const count = await labels.count();
      expect(count).toBe(5);
    });
  });

  test.describe('Permission Section', () => {
    test('should have card inset for permissions', async ({ optionsPage }) => {
      const cardInset = optionsPage.locator('.cardInset');
      await expect(cardInset).toBeVisible();
    });

    test('should have grant and revoke buttons', async ({ optionsPage }) => {
      await expect(optionsPage.locator('#grantAllSitesBtn')).toBeVisible();
      await expect(optionsPage.locator('#revokeAllSitesBtn')).toBeVisible();
    });

    test('should have permission status text', async ({ optionsPage }) => {
      const permStatus = optionsPage.locator('#permStatus');
      await expect(permStatus).toBeVisible();
    });
  });

  test.describe('Information Sections', () => {
    test('should have how scanning works section', async ({ optionsPage }) => {
      const scanningSection = optionsPage.locator('text=How scanning works');
      await expect(scanningSection).toBeVisible();
    });

    test('should have privacy section', async ({ optionsPage }) => {
      const privacySection = optionsPage.locator('text=Privacy');
      await expect(privacySection).toBeVisible();
    });

    test('should have list items in info sections', async ({ optionsPage }) => {
      const listItems = optionsPage.locator('.list li');
      const count = await listItems.count();
      expect(count).toBeGreaterThan(3);
    });
  });
});

test.describe('Leads Page UI - Visual Elements', () => {
  test.describe('Top Bar', () => {
    test('should have topbar layout', async ({ leadsPage }) => {
      const topbar = leadsPage.locator('.topbar');
      await expect(topbar).toBeVisible();
    });

    test('should display brand in topbar', async ({ leadsPage }) => {
      const brand = leadsPage.locator('.topbar .brand');
      await expect(brand).toBeVisible();
    });

    test('should have options link in topbar', async ({ leadsPage }) => {
      const optionsLink = leadsPage.locator('.topbar a[href="options.html"]');
      await expect(optionsLink).toBeVisible();
    });
  });

  test.describe('Controls Section', () => {
    test('should have controls container', async ({ leadsPage }) => {
      const controls = leadsPage.locator('.controls');
      await expect(controls).toBeVisible();
    });

    test('search input should have grow class', async ({ leadsPage }) => {
      const search = leadsPage.locator('#search');
      const classList = await search.getAttribute('class');
      expect(classList).toContain('input--grow');
    });

    test('selects should have select class', async ({ leadsPage }) => {
      const sourceFilter = leadsPage.locator('#sourceFilter');
      const classList = await sourceFilter.getAttribute('class');
      expect(classList).toContain('select');
    });
  });

  test.describe('Bulk Actions Bar', () => {
    test('should have bulk bar', async ({ leadsPage }) => {
      const bulkBar = leadsPage.locator('.bulkBar');
      await expect(bulkBar).toBeVisible();
    });

    test('bulk bar should contain select all checkbox', async ({ leadsPage }) => {
      const selectAll = leadsPage.locator('.bulkBar #selectAllPage');
      await expect(selectAll).toBeVisible();
    });

    test('should have bulk actions container', async ({ leadsPage }) => {
      const bulkActions = leadsPage.locator('.bulkActions');
      await expect(bulkActions).toBeVisible();
    });

    test('should have 5 bulk action buttons', async ({ leadsPage }) => {
      const buttons = leadsPage.locator('.bulkActions .btn');
      const count = await buttons.count();
      expect(count).toBe(5);
    });
  });

  test.describe('Table Structure', () => {
    test('should have table wrapper', async ({ leadsPage }) => {
      const tableWrap = leadsPage.locator('.tableWrap');
      await expect(tableWrap).toBeVisible();
    });

    test('should have table element', async ({ leadsPage }) => {
      const table = leadsPage.locator('.table');
      await expect(table).toBeVisible();
    });

    test('should have table header row', async ({ leadsPage }) => {
      const thead = leadsPage.locator('thead');
      await expect(thead).toBeVisible();
    });

    test('should have 7 table headers', async ({ leadsPage }) => {
      const headers = leadsPage.locator('th');
      const count = await headers.count();
      expect(count).toBe(7);
    });

    test('should have tbody for data', async ({ leadsPage }) => {
      const tbody = leadsPage.locator('#tbody');
      await expect(tbody).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should have pager container', async ({ leadsPage }) => {
      const pager = leadsPage.locator('.pager');
      await expect(pager).toBeVisible();
    });

    test('should have prev button', async ({ leadsPage }) => {
      const prevBtn = leadsPage.locator('#prevBtn');
      await expect(prevBtn).toBeVisible();
      await expect(prevBtn).toHaveText('Prev');
    });

    test('should have next button', async ({ leadsPage }) => {
      const nextBtn = leadsPage.locator('#nextBtn');
      await expect(nextBtn).toBeVisible();
      await expect(nextBtn).toHaveText('Next');
    });

    test('should have pager text', async ({ leadsPage }) => {
      const pagerText = leadsPage.locator('#pagerText');
      await expect(pagerText).toBeVisible();
    });
  });
});

test.describe('Theme Support', () => {
  test('options page should have theme selector', async ({ optionsPage }) => {
    const theme = optionsPage.locator('#theme');
    await expect(theme).toBeVisible();
  });

  test('should be able to change to light theme', async ({ optionsPage }) => {
    await optionsPage.locator('#theme').selectOption('light');
    await optionsPage.locator('#saveBtn').click();
    await optionsPage.waitForTimeout(100);
    
    // Check that theme attribute is set
    const html = optionsPage.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(theme).toBe('light');
    
    // Restore to system
    await optionsPage.locator('#theme').selectOption('system');
    await optionsPage.locator('#saveBtn').click();
  });

  test('should be able to change to dark theme', async ({ optionsPage }) => {
    await optionsPage.locator('#theme').selectOption('dark');
    await optionsPage.locator('#saveBtn').click();
    await optionsPage.waitForTimeout(100);
    
    const html = optionsPage.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(theme).toBe('dark');
    
    // Restore to system
    await optionsPage.locator('#theme').selectOption('system');
    await optionsPage.locator('#saveBtn').click();
  });
});

test.describe('Responsive Width', () => {
  test('popup should have fixed width', async ({ popupPage }) => {
    const body = popupPage.locator('body');
    const box = await body.boundingBox();
    expect(box.width).toBe(380);
  });
});

test.describe('Accessibility', () => {
  test.describe('Popup Accessibility', () => {
    test('buttons should have visible text', async ({ popupPage }) => {
      const buttons = popupPage.locator('.btn');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).textContent();
        expect(text.trim().length).toBeGreaterThan(0);
      }
    });

    test('inputs should have placeholders or labels', async ({ popupPage }) => {
      const emailInput = popupPage.locator('#manualEmail');
      const placeholder = await emailInput.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();
    });

    test('logo should have alt attribute', async ({ popupPage }) => {
      const logo = popupPage.locator('.brandLogo');
      const alt = await logo.getAttribute('alt');
      expect(alt).not.toBeNull();
    });
  });

  test.describe('Options Accessibility', () => {
    test('form elements should have associated labels', async ({ optionsPage }) => {
      const labels = optionsPage.locator('label');
      const count = await labels.count();
      expect(count).toBeGreaterThan(5);
    });

    test('checkboxes should be in labels', async ({ optionsPage }) => {
      const checkboxLabels = optionsPage.locator('label.checkbox input[type="checkbox"]');
      const count = await checkboxLabels.count();
      expect(count).toBe(5);
    });
  });

  test.describe('Leads Page Accessibility', () => {
    test('table should have headers', async ({ leadsPage }) => {
      const headers = leadsPage.locator('th');
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);
    });

    test('action buttons should have visible text', async ({ leadsPage }) => {
      const buttons = leadsPage.locator('.bulkActions .btn');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).textContent();
        expect(text.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
