## LeadingLeads (Chrome Extension)

### What it does
- **Scan the current page** (e.g., LinkedIn job listings) for postings that **match your keyword terms**
- **Extract emails** found on the page / inside job cards
- **Store leads** (company + email) in `chrome.storage.local` (de-duped)
- **Move to Gmail BCC**: open a Gmail compose window with all stored emails in the **BCC** field (optionally clearing the stored leads)
- **Auto-scan while browsing**: can automatically scan supported sites in the background (LinkedIn by default)
- **Small badge alert**: shows a brief badge on the extension icon when new leads are captured (no notifications permission)

### Install (developer mode)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the folder: `job-lead-capture/`

Note: Chrome’s manifest icons are PNG-based. LeadingLeads includes PNG icons generated from `assets/leadingleads-logo.svg` for full compatibility across Chrome UI surfaces.

### Use
1. Click the extension icon → open **Options** → set your keyword terms (one per line)
2. Visit a page (LinkedIn jobs or any page that contains emails)
3. Click the extension icon → **Scan this page**
4. Use:
   - **Copy BCC** to copy a comma-separated list
   - **Move to Gmail BCC** to open Gmail compose with BCC prefilled
   - **Export CSV** to download your lead list

### Notes / limitations
- Many job sites (including LinkedIn) often **do not show emails directly** on job cards; this extension can only capture emails that are present in the page text/DOM.
- LinkedIn markup changes frequently; the scanner uses **best-effort selectors** plus a **generic fallback** email scan.
- Scanning runs only when you click **Scan this page** (it uses `activeTab`, not always-on site permissions).

### Auto-scan permissions
- Auto-scan runs on **LinkedIn** by default.
- To auto-scan on other sites, open **Options** and click **Enable all-sites auto-scan** (this requests optional `<all_urls>` permission).

### Privacy / compliance posture
- **Client-only**: scanning happens in your browser by reading the rendered DOM; leads are stored in `chrome.storage.local`.
- **No exfiltration**: this extension does not send your captured leads to any external server.
- **Terms of Service**: you are responsible for using this extension in a way that complies with the sites you browse.


