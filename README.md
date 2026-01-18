## LeadingLeads (Chrome Extension)

> Your best friend for capturing leads while browsing — perfect for **salespeople**, **recruiters**, and **job hunters**.

### Why LeadingLeads?

- **Save time**: Automatically capture contact emails while you browse job boards, company pages, or any website
- **Stay organized**: All leads stored locally with company name, source, and context
- **Take action fast**: One-click Gmail BCC, copy to clipboard, or export to CSV for your CRM
- **Respect privacy**: 100% local — your data never leaves your browser

### What it does
- **Scan the current page** (e.g., job listings on any job board) for postings that **match your keyword terms**
- **Extract emails** found on the page / inside job cards
- **Store leads** (company + email) in `chrome.storage.local` (de-duped)
- **Move to Gmail BCC**: open a Gmail compose window with all stored emails in the **BCC** field (optionally clearing the stored leads)
- **Auto-scan while browsing**: can automatically scan job boards in the background when permission is granted
- **Small badge alert**: shows a brief badge on the extension icon when new leads are captured (no notifications permission)

### Perfect For

| Use Case | How LeadingLeads Helps |
|----------|------------------------|
| **Sales prospecting** | Capture emails from company websites, directories, and professional networks |
| **Job hunting** | Save recruiter emails and company contacts while browsing job boards |
| **Business development** | Build partnership contact lists from industry websites |
| **Recruiting** | Collect candidate emails from professional profiles and portfolios |

### Supported Websites
LeadingLeads works with any website, including:
- Indeed
- Glassdoor
- ZipRecruiter
- Monster
- CareerBuilder
- AngelList / Wellfound
- Remote.co
- FlexJobs
- Company career pages
- Any site with emails in the page content

### Install (developer mode)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the folder: `job-lead-capture/`

Note: Chrome's manifest icons are PNG-based. LeadingLeads includes PNG icons generated from `assets/leadingleads-logo.svg` for full compatibility across Chrome UI surfaces.

### Use
1. Click the extension icon → open **Options** → set your keyword terms (one per line)
2. Visit any job board or page containing emails
3. Click the extension icon → **Scan this page**
4. Use:
   - **Copy BCC** to copy a comma-separated list
   - **Move to Gmail BCC** to open Gmail compose with BCC prefilled
   - **Export CSV** to download your lead list

### Notes / limitations
- Many job sites often **do not show emails directly** on job cards; this extension can only capture emails that are present in the page text/DOM.
- Job board markup changes frequently; the scanner uses **best-effort selectors** plus a **generic fallback** email scan.
- Scanning runs only when you click **Scan this page** (it uses `activeTab`, not always-on site permissions).

### Auto-scan permissions
- To enable auto-scan on any site, open **Options** and click **Enable all-sites auto-scan** (this requests optional `<all_urls>` permission).
- Once granted, the extension will automatically scan pages in the background as you browse.

### Privacy & TOS Compliance

LeadingLeads is designed to be a **responsible helper** that respects both your privacy and website terms of service:

#### Your Privacy
- **100% Local Storage**: All leads are saved only to your Chrome profile via `chrome.storage.local`
- **No Cloud Sync**: Your data never leaves your computer
- **No Analytics**: No tracking, no telemetry, no external requests
- **You Own Your Data**: Export, delete, or clear your leads anytime

#### TOS-Friendly Design
- **User-Initiated Scanning**: By default, scanning only happens when you click "Scan this page" (uses `activeTab` permission)
- **Visible Content Only**: Auto-scan only captures content you've scrolled to and can see on screen
- **Optional Permissions**: All-sites access is optional — you grant it explicitly in Options
- **No Automation**: The extension reads what you see — it doesn't scrape, crawl, or bypass any protections
- **Transparent**: Every captured lead shows its source URL and capture type so you know exactly where it came from

#### Your Responsibility
- This extension is a helper tool — you are responsible for using it in compliance with each website's Terms of Service
- Respect rate limits and avoid excessive scanning
- Use captured emails ethically and in compliance with anti-spam laws (CAN-SPAM, GDPR, etc.)

### Development

#### Running Tests
```bash
npm install

# Run tests headless (default) - ~3 minutes
npm test

# Run tests with browser visible (for debugging)
HEADLESS=false npm test
```

Tests use Playwright with Chrome's new headless mode (`--headless=new`). 269 tests complete in ~3 minutes.

#### Building for Distribution
```bash
npm run build
```
This creates `dist/leadingleads.zip` containing only the extension files (tests excluded).

#### Test Coverage
The test suite covers:
- Extension loading and service worker
- Popup, Options, and Leads page UI
- Manual lead addition and email extraction
- Settings persistence
- TOS compliance verification
- Email validation