/**
 * Auto-scan content script.
 * - Runs on LinkedIn by default (manifest content_scripts).
 * - Can also be registered for <all_urls> when user grants optional host permission.
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

  const metaSiteName =
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    document.querySelector('meta[name="application-name"]')?.content?.trim() ||
    "";

  const leads = [];

  function makeSnippet(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 280);
  }

  // LinkedIn-ish job card selectors (best-effort).
  const cardSelectors = [
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".base-search-card",
    "[data-view-name='job-card']"
  ];
  let cards = cardSelectors
    .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
    .filter(Boolean);

  function isVisibleInViewport(el) {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const pad = 40;
    return (
      rect.bottom >= -pad &&
      rect.right >= -pad &&
      rect.top <= vh + pad &&
      rect.left <= vw + pad
    );
  }

  if (visibleOnly) cards = cards.filter(isVisibleInViewport);
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

  // Note: no full-page fallback here. Auto-scan should be non-intrusive.
  // Full-page scanning remains available via the user-clicked "Scan this page" action.

  return leads;
}

function scanDomManual({ keywords, requireEmail, allowFullPageFallback }) {
  const now = Date.now();
  const url = location.href;
  const title = document.title || "";

  const metaSiteName =
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    document.querySelector('meta[name="application-name"]')?.content?.trim() ||
    "";

  const leads = [];

  function makeSnippet(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 320);
  }

  // LinkedIn-ish job card selectors (best-effort).
  const cardSelectors = [
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".base-search-card",
    "[data-view-name='job-card']"
  ];
  let cards = cardSelectors
    .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
    .filter(Boolean);
  if (cards.length > 80) cards = cards.slice(0, 80);

  for (const card of cards) {
    const text = card.innerText || card.textContent || "";
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
      leads.push({
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

  // LinkedIn / job boards frequently update via client-side routing.
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


