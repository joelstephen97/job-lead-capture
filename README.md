# job-lead-capture (LeadingLeads)

A Manifest V3 Chrome extension that pulls email addresses out of the page you are looking at (job boards, LinkedIn posts and profiles, any page with emails in it), stores them locally as "leads" with company and source, and lets you copy them as a BCC list, open a Gmail compose with them in BCC, or export them to CSV.

![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-yellow) ![License](https://img.shields.io/badge/license-MIT-green)

**Status: archived, kept for reference, not maintained.** Read "Terms of service" below before using it.

## Why

I built this in January 2026 while job hunting. Recruiters in my region often post "send your CV to hr@company.com" in LinkedIn posts and job cards, and I was copying those addresses by hand into a spreadsheet. This extension automated that: keep a few keyword terms (for example "sales", "frontend", "Abu Dhabi"), scan the page, and every email inside a matching card or post gets saved with the company name, job title, source URL and a short context snippet. Then one click drops them into a Gmail BCC field.

It is also a fairly complete example of an MV3 extension with a service worker, optional host permissions, a dynamically registered content script, `chrome.storage.local`, a popup, an options page and a full-page leads manager, with a Playwright test suite that loads the unpacked extension in Chromium.

## Terms of service

This extension reads profile, post, messaging and search-result markup on linkedin.com and copies email addresses out of it. LinkedIn's User Agreement prohibits using browser plugins, scrapers or any automated means to copy profiles and other data from its site, and most job boards have similar clauses. Auto-scan mode, which watches the DOM on every page once you grant `<all_urls>`, makes this worse, not better. I stopped using and developing it for that reason, and I am not adding features. The code stays public as a reference for MV3 patterns and extension testing. If you run it anyway, that is your call and your responsibility, including anti-spam law (CAN-SPAM, GDPR) for whatever you send to the captured addresses.

## Quickstart (developer mode)

```bash
git clone https://github.com/joelstephen97/job-lead-capture.git
```

1. Open `chrome://extensions`, turn on Developer mode.
2. Load unpacked, select the `job-lead-capture/` folder.
3. Click the icon, open Options, set keyword terms (one per line) and Save.
4. On a page, click the icon and press "Scan this page".

No build step is needed to run it. `npm run build` only zips the extension files into `dist/leadingleads.zip`.

## Usage

Popup (`popup.html`):

- Scan this page: runs the content script in the active tab (uses `activeTab`; if the content script is not present and you have not granted all-sites access, it tells you so).
- Manual add: type an email and optional company.
- Extract emails from text: paste any text, it pulls out every email with a regex and stores them.
- Copy BCC, Move to Gmail BCC (opens `mail.google.com/mail/?view=cm&bcc=...`), Export CSV, Clear all.
- Open Leads: the full leads page with search, source filter, pagination, multi-select delete, CSV export.

Options (`options.html`): keyword terms, require email, clear after Gmail, auto-scan on/off, visible-only auto-scan, badge on/off, max stored leads (default 2000), theme, and buttons to grant or revoke the optional `<all_urls>` permission.

## How it works

- `background.js` (service worker) owns settings and the leads array in `chrome.storage.local`, de-duplicates by `email|company`, builds the Gmail URL, bumps the badge, and registers or unregisters `contentScript.js` for `<all_urls>` depending on settings and whether the optional permission is granted.
- `contentScript.js` walks a list of card selectors (generic job-card classes, Indeed, Glassdoor, and many LinkedIn profile, feed, search and messaging selectors), checks each card's text against your keywords, and regex-extracts emails. On LinkedIn it also reads `mailto:` links in contact-info sections. In auto-scan mode a `MutationObserver` re-runs the scan at most every 6 seconds and only sends leads it has not seen on that page.
- `popup.js`, `options.js`, `leads.js` are plain DOM scripts that message the service worker.
- Nothing leaves the browser: no network requests, no analytics. Leads live only in your Chrome profile.

## Project structure

```
manifest.json        MV3 manifest (storage, scripting, permissions, activeTab; optional <all_urls>)
background.js        service worker: storage, merge, Gmail URL, content-script registration
contentScript.js     page scanner (manual and auto modes)
popup.*  options.*  leads.*   the three UI surfaces
assets/              icons (PNG) and source SVG
scripts/build.js     zips extension files into dist/
tests/               Playwright specs that load the unpacked extension
playwright.config.js
```

## Tests

```bash
npm ci
npm test              # headless, ~1.5 min, 291 tests
HEADLESS=false npm test
```

The suite covers extension loading, popup/options/leads UI, manual add, text extraction, settings persistence, de-duplication and the LinkedIn email regex cases. It runs 7 files in parallel, each with its own Chromium profile. On a loaded machine a handful of tests are timing-sensitive and flake; they pass when re-run alone (`npx playwright test tests/manual-add.spec.js:303 --workers=1`).

## Status and limitations

- Archived. No further features will be added, for the reasons in "Terms of service".
- Selectors for LinkedIn and the job boards are best-effort and will rot as those sites change markup.
- Only emails visible in page text or `mailto:` links are captured. Most job boards do not expose recruiter emails.
- Not published to the Chrome Web Store.

## License

MIT, see [LICENSE](LICENSE).
