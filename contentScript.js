/**
 * Auto-scan content script.
 * - Registered dynamically when user grants optional host permission.
 * - Works on any job board or website containing email leads.
 *
 * This script extracts keyword-matched leads and sends only NEW leads to the background worker.
 */

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCompany(company) {
  return String(company || "").trim();
}

function leadKey(lead) {
  return `${normalizeEmail(lead.email)}|${normalizeCompany(lead.company)}`.toLowerCase();
}

function extractEmails(text) {
  const matches = String(text || "").match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  );
  return Array.from(new Set((matches || []).map((e) => e.toLowerCase())));
}

function keywordMatch(text, keywords) {
  const t = String(text || "").toLowerCase();
  const ks = (keywords || [])
    .map((k) => String(k || "").trim().toLowerCase())
    .filter(Boolean);
  if (ks.length === 0) return { matched: true, matchedTerms: [] };
  const matchedTerms = ks.filter((k) => t.includes(k));
  return { matched: matchedTerms.length > 0, matchedTerms };
}

function pickText(el, selectors) {
  for (const sel of selectors) {
    const node = el.querySelector(sel);
    const val = node?.textContent?.trim();
    if (val) return val;
  }
  return "";
}

function scanDom({ keywords, requireEmail, visibleOnly }) {
  const now = Date.now();
  const url = location.href;
  const title = document.title || "";
  const isLinkedIn = location.host.includes("linkedin.com");

  const metaSiteName =
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    document.querySelector('meta[name="application-name"]')?.content?.trim() ||
    "";

  const leads = [];

  function makeSnippet(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 280);
  }

  /**
   * Strict visibility check - only captures content the user has scrolled to.
   * Checks: in viewport, not hidden by CSS, has actual dimensions.
   */
  function isActuallyVisible(el) {
    // Must have real dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    // Must be within the current viewport (what user sees)
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    
    // Element must be at least partially within visible viewport - no padding
    const isInViewport = 
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < vh &&
      rect.left < vw;
    
    if (!isInViewport) return false;

    // Check CSS visibility
    const style = window.getComputedStyle(el);
    if (style.display === "none") return false;
    if (style.visibility === "hidden") return false;
    if (style.opacity === "0") return false;

    return true;
  }

  // Job board card selectors (best-effort, covers major job sites).
  const cardSelectors = [
    // Generic job card patterns
    "[class*='job-card']",
    "[class*='job-listing']",
    "[class*='job-result']",
    "[data-testid*='job']",
    // Common job board patterns
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".base-search-card",
    "[data-view-name='job-card']",
    // Indeed patterns
    ".job_seen_beacon",
    ".jobsearch-ResultsList li",
    // Glassdoor patterns
    "[data-test='jobListing']",
    // Generic article/card patterns
    "article[class*='job']",
    ".job-posting",
    // LinkedIn profile & contact info patterns
    ".pv-contact-info",
    ".pv-contact-info__contact-type",
    "[class*='contact-info']",
    ".ci-email",
    ".pv-profile-section",
    ".profile-detail",
    // LinkedIn profile cards and sections
    ".artdeco-modal__content",
    ".pv-top-card",
    "[class*='profile-card']",
    // LinkedIn search results (people/companies)
    ".reusable-search__result-container",
    ".entity-result",
    "[data-view-name='search-entity-result-universal-template']",
    // LinkedIn messaging where emails might appear
    ".msg-conversation-card",
    ".msg-s-message-list-content",
    // LinkedIn feed posts
    ".feed-shared-update-v2",
    ".feed-shared-update-v2__content",
    ".update-components-text",
    ".feed-shared-text",
    "[data-urn*='activity']",
    ".feed-shared-inline-show-more-text",
    ".break-words",
    // LinkedIn feed post containers
    ".fie-impression-container",
    "[data-id*='urn:li:activity']",
    // LinkedIn article/newsletter
    ".reader-article-content",
    ".article-content"
  ];

  // LinkedIn-specific: also scan sections where emails commonly appear
  const linkedInEmailContainers = isLinkedIn ? [
    ".pv-contact-info__contact-type",
    ".ci-email",
    "[href^='mailto:']",
    ".pv-contact-info__ci-container",
    ".ember-view.pv-contact-info__contact-link"
  ] : [];

  let cards = cardSelectors
    .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
    .filter(Boolean);

  // Deduplicate - avoid scanning nested elements multiple times
  cards = cards.filter((card, idx, arr) => 
    !arr.slice(0, idx).some(prev => prev.contains(card) || card.contains(prev))
  );

  // Only capture what the user has actually scrolled to and can see
  if (visibleOnly) cards = cards.filter(isActuallyVisible);
  // Hard cap to avoid heavy loops on long pages.
  if (cards.length > 40) cards = cards.slice(0, 40);

  // Card-based scan (prefer textContent to avoid layout thrash from innerText).
  for (const card of cards) {
    const text = card.textContent || "";
    const { matched, matchedTerms } = keywordMatch(text, keywords);
    if (!matched) continue;

    const company = pickText(card, [
      ".job-card-container__company-name",
      ".job-card-container__primary-description",
      ".base-search-card__subtitle",
      ".base-search-card__subtitle a",
      "[data-tracking-control-name*='company']",
      "a[href*='/company/']"
    ]);

    const jobTitle = pickText(card, [
      ".job-card-list__title",
      ".base-search-card__title",
      "h3",
      "h2"
    ]);

    const jobUrl =
      card.querySelector("a[href*='/jobs/view/']")?.href ||
      card.querySelector("a[href*='/jobs/']")?.href ||
      "";

    const emails = extractEmails(text);
    const snippet = makeSnippet(text);
    for (const email of emails) {
      if (requireEmail && !email) continue;
      const lead = {
        email,
        company,
        jobTitle,
        matchedTerms,
        sourceUrl: url,
        sourceTitle: title,
        sourceSite: metaSiteName,
        sourceHost: location.host || "",
        jobUrl,
        context: snippet,
        createdAt: now
      };
      leads.push(lead);
    }
  }

  // LinkedIn-specific: extract emails from mailto links and contact sections
  if (isLinkedIn) {
    const mailtoLinks = document.querySelectorAll("a[href^='mailto:']");
    for (const link of mailtoLinks) {
      if (visibleOnly && !isActuallyVisible(link)) continue;
      
      const href = link.getAttribute("href") || "";
      const emailMatch = href.match(/^mailto:([^?]+)/i);
      if (!emailMatch) continue;
      
      const email = emailMatch[1].toLowerCase().trim();
      if (!email || leads.some(l => l.email === email)) continue;
      
      // Try to get context from surrounding elements
      const section = link.closest(".pv-contact-info, .artdeco-modal__content, .pv-profile-section, section") || link.parentElement;
      const contextText = section?.textContent || "";
      const { matched, matchedTerms } = keywordMatch(contextText, keywords);
      
      // For LinkedIn contact info, be lenient with keywords if email is found
      const profileName = document.querySelector(".pv-top-card--list li, .text-heading-xlarge, h1")?.textContent?.trim() || "";
      const company = document.querySelector(".pv-top-card--experience-list-item, .pv-text-details__right-panel-item-text")?.textContent?.trim() || "";
      
      leads.push({
        email,
        company: company || profileName || metaSiteName,
        jobTitle: "",
        matchedTerms: matched ? matchedTerms : ["linkedin-contact"],
        sourceUrl: url,
        sourceTitle: title,
        sourceSite: metaSiteName || "LinkedIn",
        sourceHost: location.host || "",
        jobUrl: "",
        context: makeSnippet(contextText || `Contact email for ${profileName}`),
        createdAt: now
      });
    }
  }

  // Note: no full-page fallback here. Auto-scan should be non-intrusive.
  // Full-page scanning remains available via the user-clicked "Scan this page" action.

  return leads;
}

function scanDomManual({ keywords, requireEmail, allowFullPageFallback }) {
  const now = Date.now();
  const url = location.href;
  const title = document.title || "";
  const isLinkedIn = location.host.includes("linkedin.com");

  const metaSiteName =
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    document.querySelector('meta[name="application-name"]')?.content?.trim() ||
    "";

  const leads = [];

  function makeSnippet(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 320);
  }

  // Job board card selectors (best-effort, covers major job sites).
  const cardSelectors = [
    // Generic job card patterns
    "[class*='job-card']",
    "[class*='job-listing']",
    "[class*='job-result']",
    "[data-testid*='job']",
    // Common job board patterns
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".base-search-card",
    "[data-view-name='job-card']",
    // Indeed patterns
    ".job_seen_beacon",
    ".jobsearch-ResultsList li",
    // Glassdoor patterns
    "[data-test='jobListing']",
    // Generic article/card patterns
    "article[class*='job']",
    ".job-posting",
    // LinkedIn profile & contact info patterns
    ".pv-contact-info",
    ".pv-contact-info__contact-type",
    "[class*='contact-info']",
    ".ci-email",
    ".pv-profile-section",
    ".profile-detail",
    // LinkedIn profile cards and sections
    ".artdeco-modal__content",
    ".pv-top-card",
    "[class*='profile-card']",
    // LinkedIn search results (people/companies)
    ".reusable-search__result-container",
    ".entity-result",
    "[data-view-name='search-entity-result-universal-template']",
    // LinkedIn messaging where emails might appear
    ".msg-conversation-card",
    ".msg-s-message-list-content",
    // LinkedIn feed posts
    ".feed-shared-update-v2",
    ".feed-shared-update-v2__content",
    ".update-components-text",
    ".feed-shared-text",
    "[data-urn*='activity']",
    ".feed-shared-inline-show-more-text",
    ".break-words",
    // LinkedIn feed post containers
    ".fie-impression-container",
    "[data-id*='urn:li:activity']",
    // LinkedIn article/newsletter
    ".reader-article-content",
    ".article-content"
  ];
  let cards = cardSelectors
    .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
    .filter(Boolean);
  // Deduplicate - avoid scanning nested elements multiple times
  cards = cards.filter((card, idx, arr) => 
    !arr.slice(0, idx).some(prev => prev.contains(card) || card.contains(prev))
  );
  if (cards.length > 80) cards = cards.slice(0, 80);

  for (const card of cards) {
    const text = card.innerText || card.textContent || "";
    const { matched, matchedTerms } = keywordMatch(text, keywords);
    
    // Extract emails first to check if we should capture even without keyword match
    const emails = extractEmails(text);
    
    // For LinkedIn posts with emails, be lenient with keyword matching
    const hasEmailsOnLinkedIn = isLinkedIn && emails.length > 0;
    if (!matched && !hasEmailsOnLinkedIn) continue;

    const company = pickText(card, [
      ".job-card-container__company-name",
      ".job-card-container__primary-description",
      ".base-search-card__subtitle",
      ".base-search-card__subtitle a",
      "[data-tracking-control-name*='company']",
      "a[href*='/company/']",
      // LinkedIn post author
      ".update-components-actor__title",
      ".update-components-actor__meta-link"
    ]);

    const jobTitle = pickText(card, [
      ".job-card-list__title",
      ".base-search-card__title",
      "h3",
      "h2"
    ]);

    const jobUrl =
      card.querySelector("a[href*='/jobs/view/']")?.href ||
      card.querySelector("a[href*='/jobs/']")?.href ||
      "";

    const snippet = makeSnippet(text);
    const effectiveMatchedTerms = matched ? matchedTerms : ["linkedin-post"];
    
    for (const email of emails) {
      if (requireEmail && !email) continue;
      leads.push({
        email,
        company,
        jobTitle,
        matchedTerms: effectiveMatchedTerms,
        sourceUrl: url,
        sourceTitle: title,
        sourceSite: metaSiteName,
        sourceHost: location.host || "",
        jobUrl,
        context: snippet,
        createdAt: now,
        captureType: "manual"
      });
    }
  }

  // LinkedIn-specific: extract emails from mailto links and contact sections
  if (isLinkedIn) {
    const mailtoLinks = document.querySelectorAll("a[href^='mailto:']");
    for (const link of mailtoLinks) {
      const href = link.getAttribute("href") || "";
      const emailMatch = href.match(/^mailto:([^?]+)/i);
      if (!emailMatch) continue;
      
      const email = emailMatch[1].toLowerCase().trim();
      if (!email || leads.some(l => l.email === email)) continue;
      
      // Try to get context from surrounding elements
      const section = link.closest(".pv-contact-info, .artdeco-modal__content, .pv-profile-section, section") || link.parentElement;
      const contextText = section?.textContent || "";
      const { matched, matchedTerms } = keywordMatch(contextText, keywords);
      
      // For LinkedIn contact info, be lenient with keywords if email is found
      const profileName = document.querySelector(".pv-top-card--list li, .text-heading-xlarge, h1")?.textContent?.trim() || "";
      const company = document.querySelector(".pv-top-card--experience-list-item, .pv-text-details__right-panel-item-text")?.textContent?.trim() || "";
      
      leads.push({
        email,
        company: company || profileName || metaSiteName,
        jobTitle: "",
        matchedTerms: matched ? matchedTerms : ["linkedin-contact"],
        sourceUrl: url,
        sourceTitle: title,
        sourceSite: metaSiteName || "LinkedIn",
        sourceHost: location.host || "",
        jobUrl: "",
        context: makeSnippet(contextText || `Contact email for ${profileName}`),
        createdAt: now,
        captureType: "manual"
      });
    }
  }

  if (leads.length === 0 && allowFullPageFallback) {
    const pageText = document.body?.innerText || document.body?.textContent || "";
    const { matched, matchedTerms } = keywordMatch(pageText, keywords);
    if (matched) {
      const emails = extractEmails(pageText);
      const snippet = makeSnippet(pageText);
      for (const email of emails) {
        if (requireEmail && !email) continue;
        leads.push({
          email,
          company: metaSiteName || "",
          jobTitle: "",
          matchedTerms,
          sourceUrl: url,
          sourceTitle: title,
          sourceSite: metaSiteName,
          sourceHost: location.host || "",
          jobUrl: "",
          context: snippet,
          createdAt: now,
          captureType: "manual"
        });
      }
    }
  }

  return leads;
}

async function getSettings() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  return res?.ok ? res.settings : null;
}

const seen = new Set();
let observer = null;
let scanTimer = null;
let lastScanAt = 0;

function scheduleScan(reason) {
  const now = Date.now();
  const minGapMs = 6000;

  if (scanTimer) return;
  const delay = Math.max(300, minGapMs - (now - lastScanAt));

  scanTimer = setTimeout(async () => {
    scanTimer = null;
    lastScanAt = Date.now();

    try {
      const settings = await getSettings();
      if (!settings?.autoScanEnabled) return;

      const visibleOnly = settings.autoScanVisibleOnly !== false;
      const leads = scanDom({
        keywords: settings.keywords || [],
        requireEmail: !!settings.requireEmail,
        visibleOnly
      });

      // Only send newly observed lead keys from this page session.
      const newLeads = [];
      for (const l of leads) {
        const key = leadKey(l);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        newLeads.push({ ...l, captureType: "auto" });
      }
      if (!newLeads.length) return;

      await chrome.runtime.sendMessage({
        type: "UPSERT_LEADS",
        leads: newLeads,
        reason
      });
    } catch {
      // Swallow errors; don't break page.
    }
  }, delay);
}

async function initAutoScan() {
  const settings = await getSettings();
  if (!settings?.autoScanEnabled) return;

  scheduleScan("init");

  // Job boards frequently update via client-side routing.
  observer = new MutationObserver(() => scheduleScan("mutation"));
  const root = document.body || document.documentElement;
  if (root) observer.observe(root, { childList: true, subtree: true });

  // Also catch URL changes without full reload.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      scheduleScan("url-change");
    }
  }, 1200);
}

initAutoScan();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  try {
    if (msg?.type === "MANUAL_SCAN") {
      const leads = scanDomManual({
        keywords: msg.keywords || [],
        requireEmail: !!msg.requireEmail,
        allowFullPageFallback: !!msg.allowFullPageFallback
      });
      sendResponse({ ok: true, leads });
      return;
    }
    sendResponse({ ok: false });
  } catch (e) {
    sendResponse({ ok: false, error: String(e?.message || e) });
  }
});


