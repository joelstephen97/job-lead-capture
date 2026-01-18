const DEFAULT_SETTINGS = {
  keywords: ["sales", "business development", "partnerships"],
  clearAfterGmail: false,
  requireEmail: true,
  autoScanEnabled: true,
  autoScanAllSites: false,
  autoScanVisibleOnly: true,
  autoScanFullPageFallback: false,
  maxLeads: 2000,
  badgeEnabled: true,
  theme: "system"
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCompany(company) {
  return String(company || "").trim();
}

function leadKey(lead) {
  return `${normalizeEmail(lead.email)}|${normalizeCompany(lead.company)}`.toLowerCase();
}

function safeUrlParts(url) {
  try {
    const u = new URL(String(url || ""));
    return { host: u.host, origin: u.origin, href: u.href, pathname: u.pathname };
  } catch {
    return { host: "", origin: "", href: String(url || ""), pathname: "" };
  }
}

function enrichLead(lead) {
  const sourceUrl = String(lead?.sourceUrl || "").trim();
  const { host } = safeUrlParts(sourceUrl);
  const email = normalizeEmail(lead?.email);
  const company = normalizeCompany(lead?.company) || inferCompanyFromEmail(email);
  return {
    email,
    company,
    jobTitle: String(lead?.jobTitle || "").trim(),
    matchedTerms: Array.isArray(lead?.matchedTerms) ? lead.matchedTerms : [],
    sourceUrl,
    sourceTitle: String(lead?.sourceTitle || "").trim(),
    sourceSite: String(lead?.sourceSite || "").trim(),
    sourceHost: String(lead?.sourceHost || host || "").trim(),
    jobUrl: String(lead?.jobUrl || "").trim(),
    // Avoid storing large page text; keep optional short snippet only.
    context: String(lead?.context || "").slice(0, 320),
    createdAt: Number.isFinite(lead?.createdAt) ? lead.createdAt : Date.now(),
    captureType: String(lead?.captureType || "").trim() || "unknown"
  };
}

async function getSettings() {
  const stored = await chrome.storage.local.get(["settings"]);
  return { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
}

async function setSettings(settings) {
  await chrome.storage.local.set({ settings });
}

async function getLeads() {
  const stored = await chrome.storage.local.get(["leads"]);
  return Array.isArray(stored.leads) ? stored.leads : [];
}

async function setLeads(leads) {
  await chrome.storage.local.set({ leads });
}

let badgeTimer = null;
async function bumpBadge(count) {
  try {
    const settings = await getSettings();
    if (!settings.badgeEnabled) return;
    await chrome.action.setBadgeBackgroundColor({ color: "#4f7cff" });
    await chrome.action.setBadgeText({ text: `+${count}` });
    if (badgeTimer) clearTimeout(badgeTimer);
    badgeTimer = setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ text: "" });
      } catch {
        // ignore
      }
    }, 6000);
  } catch {
    // ignore
  }
}

async function mergeLeadsIntoStore(incomingLeads, settings) {
  const foundLeads = Array.isArray(incomingLeads) ? incomingLeads : [];

  // Post-process: infer company if missing and enforce requireEmail.
  const cleaned = foundLeads
    .map((l) => enrichLead(l))
    .filter((l) => (settings.requireEmail ? !!l.email : true));

  const existing = await getLeads();
  const byKey = new Map(existing.map((l) => [leadKey(l), l]));
  const beforeSize = byKey.size;
  for (const l of cleaned) {
    const k = leadKey(l);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, l);
  }
  const uniqueAdded = byKey.size - beforeSize;
  let merged = Array.from(byKey.values()).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  const cap = Number(settings?.maxLeads) > 0 ? Number(settings.maxLeads) : DEFAULT_SETTINGS.maxLeads;
  if (merged.length > cap) merged = merged.slice(0, cap);

  await setLeads(merged);

  return { added: uniqueAdded, total: merged.length };
}

async function syncAllSitesAutoScanContentScript(settings) {
  // Register/unregister a content script for <all_urls> based on:
  // - setting autoScanEnabled
  // - setting autoScanAllSites
  // - optional host permission <all_urls> actually granted
  const id = "auto-scan-all-sites";

  const shouldTry =
    !!settings?.autoScanEnabled && !!settings?.autoScanAllSites;

  const hasAllUrls = await chrome.permissions.contains({
    origins: ["<all_urls>"]
  });

  const scripts = await chrome.scripting.getRegisteredContentScripts();
  const isRegistered = scripts.some((s) => s.id === id);

  if (!shouldTry || !hasAllUrls) {
    if (isRegistered) await chrome.scripting.unregisterContentScripts({ ids: [id] });
    return;
  }

  if (!isRegistered) {
    await chrome.scripting.registerContentScripts([
      {
        id,
        js: ["contentScript.js"],
        matches: ["<all_urls>"],
        runAt: "document_idle",
        allFrames: false
      }
    ]);
  }
}

function buildGmailComposeUrl({ bcc, subject, body }) {
  const u = new URL("https://mail.google.com/mail/");
  u.searchParams.set("view", "cm");
  u.searchParams.set("fs", "1");
  if (bcc) u.searchParams.set("bcc", bcc);
  if (subject) u.searchParams.set("su", subject);
  if (body) u.searchParams.set("body", body);
  return u.toString();
}

function extractEmails(text) {
  const matches = String(text || "").match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  );
  return Array.from(new Set((matches || []).map((e) => e.toLowerCase())));
}

function inferCompanyFromEmail(email) {
  const domain = normalizeEmail(email).split("@")[1] || "";
  const host = domain.split(".").slice(0, -1).join(".") || domain;
  if (!host) return "";
  const first = host.split(".")[0] || host;
  return first.replace(/[-_]+/g, " ").trim();
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

/**
 * Runs inside the tab (injected via chrome.scripting.executeScript).
 * Must not use chrome.* APIs.
 */
function scanPageInTab({ keywords, requireEmail }) {
  const now = Date.now();

  function extractEmailsLocal(text) {
    const matches = String(text || "").match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    );
    return Array.from(new Set((matches || []).map((e) => e.toLowerCase())));
  }

  function keywordMatchLocal(text) {
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

  const url = location.href;
  const title = document.title || "";

  const metaSiteName =
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    document.querySelector('meta[name="application-name"]')?.content?.trim() ||
    "";

  const isLinkedIn = location.host.includes("linkedin.com");

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

  const leads = [];

  function addLead(email, company, jobTitle, matchedTerms, contextText) {
    if (requireEmail && !email) return;
    leads.push({
      email: email || "",
      company: company || "",
      jobTitle: jobTitle || "",
      matchedTerms: matchedTerms || [],
      sourceUrl: url,
      sourceTitle: title,
      sourceSite: metaSiteName,
      sourceHost: location.host || "",
      context: (contextText || "").slice(0, 200),
      createdAt: now,
      captureType: "manual"
    });
  }

  // Card-based scan: look for keyword matches within each card, then pull emails from card text.
  for (const card of cards) {
    const text = card.innerText || card.textContent || "";
    const { matched, matchedTerms } = keywordMatchLocal(text);
    
    // Extract emails first to check if we should capture even without keyword match
    const emails = extractEmailsLocal(text);
    
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

    const effectiveMatchedTerms = matched ? matchedTerms : ["linkedin-post"];
    for (const email of emails) addLead(email, company, jobTitle, effectiveMatchedTerms, text);
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
      const { matched, matchedTerms } = keywordMatchLocal(contextText);
      
      // For LinkedIn contact info, be lenient with keywords if email is found
      const profileName = document.querySelector(".pv-top-card--list li, .text-heading-xlarge, h1")?.textContent?.trim() || "";
      const companyName = document.querySelector(".pv-top-card--experience-list-item, .pv-text-details__right-panel-item-text")?.textContent?.trim() || "";
      
      addLead(
        email,
        companyName || profileName || metaSiteName,
        "",
        matched ? matchedTerms : ["linkedin-contact"],
        contextText || `Contact email for ${profileName}`
      );
    }
  }

  // Generic fallback: scan full page text for emails if card-based scan found none.
  if (leads.length === 0) {
    const pageText = document.body?.innerText || document.body?.textContent || "";
    const { matched, matchedTerms } = keywordMatchLocal(pageText);
    if (matched) {
      const emails = extractEmailsLocal(pageText);
      for (const email of emails) {
        addLead(
          email,
          metaSiteName || "",
          "",
          matchedTerms,
          pageText
        );
      }
    }
  }

  return { leads, url, title };
}

async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");

  const settings = await getSettings();
  
  // Check if we have permission to access this tab's URL
  const tabUrl = tab.url || "";
  const isAllowedUrl = tabUrl.startsWith("http://") || tabUrl.startsWith("https://");
  if (!isAllowedUrl) {
    throw new Error("Cannot scan this page (browser internal pages are not supported).");
  }

  let response;
  
  // Try sending message to existing content script
  try {
    response = await chrome.tabs.sendMessage(tab.id, {
      type: "MANUAL_SCAN",
      keywords: settings.keywords,
      requireEmail: settings.requireEmail,
      allowFullPageFallback: true
    });
  } catch {
    // Content script not present - try injecting it dynamically
    const hasAllUrls = await chrome.permissions.contains({ origins: ["<all_urls>"] });
    if (!hasAllUrls) {
      throw new Error(
        "Scanning isn't enabled on this site. Open Options and enable all-sites access to scan any page."
      );
    }

    // Inject the content script dynamically
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["contentScript.js"]
      });
      
      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Retry sending message
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "MANUAL_SCAN",
        keywords: settings.keywords,
        requireEmail: settings.requireEmail,
        allowFullPageFallback: true
      });
    } catch (injectErr) {
      throw new Error(
        `Failed to scan this page: ${injectErr?.message || "unknown error"}. Try refreshing the page.`
      );
    }
  }

  const foundLeads = Array.isArray(response?.leads) ? response.leads : [];
  const result = await mergeLeadsIntoStore(foundLeads, settings);
  if (result.added > 0) await bumpBadge(result.added);
  return result;
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await setSettings(settings);
  const leads = await getLeads();
  await setLeads(leads);
  await syncAllSitesAutoScanContentScript(settings);
});

// When all-sites permission is granted, inject content script into existing tabs
chrome.permissions.onAdded.addListener(async (permissions) => {
  const hasAllUrls = permissions.origins?.includes("<all_urls>");
  if (!hasAllUrls) return;

  const settings = await getSettings();
  if (!settings.autoScanEnabled) return;

  // Inject into all http/https tabs
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (!tab.url.startsWith("http://") && !tab.url.startsWith("https://")) continue;
      
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["contentScript.js"]
        });
      } catch {
        // Ignore tabs we can't inject into (e.g., chrome:// pages)
      }
    }
  } catch {
    // Ignore errors
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case "GET_SETTINGS": {
        const settings = await getSettings();
        sendResponse({ ok: true, settings });
        break;
      }
      case "SET_SETTINGS": {
        const settings = { ...DEFAULT_SETTINGS, ...(msg.settings || {}) };
        await setSettings(settings);
        await syncAllSitesAutoScanContentScript(settings);
        sendResponse({ ok: true, settings });
        break;
      }
      case "UPSERT_LEADS": {
        const settings = await getSettings();
        const result = await mergeLeadsIntoStore(msg.leads || [], settings);
        if (result.added > 0) await bumpBadge(result.added);
        sendResponse({ ok: true, ...result });
        break;
      }
      case "GET_LEADS": {
        const leads = await getLeads();
        sendResponse({ ok: true, leads });
        break;
      }
      case "SCAN_ACTIVE_TAB": {
        const result = await scanActiveTab();
        sendResponse({ ok: true, ...result });
        break;
      }
      case "CLEAR_LEADS": {
        await setLeads([]);
        sendResponse({ ok: true });
        break;
      }
      case "DELETE_LEAD": {
        const key = String(msg.key || "");
        const leads = await getLeads();
        const next = leads.filter((l) => leadKey(l) !== key);
        await setLeads(next);
        sendResponse({ ok: true, total: next.length });
        break;
      }
      case "DELETE_LEADS": {
        const keys = Array.isArray(msg.keys) ? msg.keys.map(String) : [];
        const keySet = new Set(keys);
        const leads = await getLeads();
        const next = leads.filter((l) => !keySet.has(leadKey(l)));
        await setLeads(next);
        sendResponse({ ok: true, total: next.length, deleted: leads.length - next.length });
        break;
      }
      case "OPEN_GMAIL_BCC": {
        const emails = Array.isArray(msg.emails) ? msg.emails : [];
        const bcc = emails.map(normalizeEmail).filter(Boolean).join(",");
        const clearAfter = !!msg.clearAfter;
        if (!bcc) {
          sendResponse({ ok: false, error: "No emails provided." });
          break;
        }

        const url = buildGmailComposeUrl({
          bcc,
          subject: msg.subject || "",
          body: msg.body || ""
        });
        await chrome.tabs.create({ url });

        if (clearAfter) {
          const leads = await getLeads();
          const emailSet = new Set(emails.map(normalizeEmail).filter(Boolean));
          const next = leads.filter((l) => !emailSet.has(normalizeEmail(l.email)));
          await setLeads(next);
        }

        sendResponse({ ok: true });
        break;
      }
      case "COPY_BCC": {
        // Utility for popup: normalize and join.
        const emails = Array.isArray(msg.emails) ? msg.emails : [];
        const bcc = emails.map(normalizeEmail).filter(Boolean).join(", ");
        sendResponse({ ok: true, bcc });
        break;
      }
      case "EXTRACT_EMAILS_FROM_TEXT": {
        const emails = extractEmails(msg.text || "");
        sendResponse({ ok: true, emails });
        break;
      }
      default:
        sendResponse({ ok: false, error: "Unknown message type." });
    }
  })().catch((err) => {
    sendResponse({ ok: false, error: String(err?.message || err) });
  });
  return true;
});


