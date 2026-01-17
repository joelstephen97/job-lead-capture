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

  // LinkedIn-ish job card selectors (best-effort; LinkedIn changes often).
  const cardSelectors = [
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".base-search-card",
    "[data-view-name='job-card']"
  ];
  const cards = cardSelectors
    .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
    .filter(Boolean);

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

    const emails = extractEmailsLocal(text);
    for (const email of emails) addLead(email, company, jobTitle, matchedTerms, text);
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
  let response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, {
      type: "MANUAL_SCAN",
      keywords: settings.keywords,
      requireEmail: settings.requireEmail,
      allowFullPageFallback: true
    });
  } catch {
    // Most likely no content script on this site.
    throw new Error(
      "Scanning isn't enabled on this site. Open Options and enable all-sites access (or scan on LinkedIn)."
    );
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


