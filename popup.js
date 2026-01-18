function $(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  // Standard email regex - must have user@domain.tld format
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalized);
}

function normalizeCompany(company) {
  return String(company || "").trim();
}

function leadKey(lead) {
  return `${normalizeEmail(lead.email)}|${normalizeCompany(lead.company)}`.toLowerCase();
}

async function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function applyTheme(theme) {
  const t = String(theme || "system");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else document.documentElement.removeAttribute("data-theme");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function toCsv(leads) {
  const header = ["company", "email", "jobTitle", "sourceUrl", "createdAt"].join(",");
  const rows = leads.map((l) => {
    const cols = [
      l.company || "",
      l.email || "",
      l.jobTitle || "",
      l.sourceUrl || "",
      l.createdAt ? new Date(l.createdAt).toISOString() : ""
    ];
    return cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",");
  });
  return [header, ...rows].join("\n");
}

function renderLeads(leads) {
  $("leadCount").textContent = String(leads.length);
  const container = $("leadList");
  if (!leads.length) {
    container.innerHTML =
      '<div class="status">No leads yet. Click “Scan this page”.</div>';
    return;
  }

  const preview = leads.slice(0, 6);
  container.innerHTML = preview
    .map((l) => {
      const company = escapeHtml(l.company || "(unknown)");
      const email = escapeHtml(l.email || "");
      const when = l.createdAt ? new Date(l.createdAt).toLocaleString() : "";
      const source = escapeHtml(l.sourceSite || l.sourceHost || "");
      const key = escapeHtml(leadKey(l));
      const openUrl = escapeHtml(l.jobUrl || l.sourceUrl || "");
      const hasUrl = !!(l.jobUrl || l.sourceUrl);
      return `
        <div class="lead" data-key="${key}">
          <div class="leadTop">
            <div class="leadInfo">
              <div class="leadCompany" title="${company}">${company}</div>
              <div class="leadEmail">${email}</div>
            </div>
            <div class="leadActions">
              ${hasUrl ? `<button class="btn btn--icon btn--secondary js-open" data-url="${openUrl}" title="Open source">↗</button>` : ''}
              <button class="btn btn--icon btn--danger js-del" data-key="${key}" title="Delete">✕</button>
            </div>
          </div>
          <div class="leadMeta">
            <div title="${source}">${source}</div>
            <div>${escapeHtml(when)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  for (const btn of container.querySelectorAll(".js-open")) {
    btn.addEventListener("click", async (e) => {
      const url = e.currentTarget.getAttribute("data-url");
      if (!url) return;
      await chrome.tabs.create({ url });
    });
  }

  for (const btn of container.querySelectorAll(".js-del")) {
    btn.addEventListener("click", async (e) => {
      const key = e.currentTarget.getAttribute("data-key");
      await send("DELETE_LEAD", { key });
      await refresh();
    });
  }
}

async function refresh() {
  const { ok, leads, error } = await send("GET_LEADS");
  if (!ok) {
    $("status").textContent = error || "Failed to load leads.";
    return;
  }
  renderLeads(leads || []);
}

async function loadSettingsIntoPopup() {
  const { ok, settings } = await send("GET_SETTINGS");
  if (ok && settings) {
    applyTheme(settings.theme);
    $("clearAfterGmail").checked = !!settings.clearAfterGmail;
  }
}

async function updateClearAfterSetting(value) {
  const { ok, settings } = await send("GET_SETTINGS");
  if (!ok) return;
  await send("SET_SETTINGS", { settings: { ...settings, clearAfterGmail: !!value } });
}

async function scanThisPage() {
  $("status").textContent = "Scanning…";
  $("scanBtn").disabled = true;
  try {
    const res = await send("SCAN_ACTIVE_TAB");
    if (!res.ok) throw new Error(res.error || "Scan failed");
    $("status").textContent = `Added ${res.added} lead(s). Total: ${res.total}.`;
    await refresh();
  } catch (e) {
    $("status").textContent = String(e?.message || e);
  } finally {
    $("scanBtn").disabled = false;
  }
}

async function copyBccToClipboard() {
  const { ok, leads } = await send("GET_LEADS");
  if (!ok) return;
  const emails = (leads || []).map((l) => l.email).filter(Boolean);
  const res = await send("COPY_BCC", { emails });
  if (!res.ok) return;
  await navigator.clipboard.writeText(res.bcc || "");
  $("status").textContent = `Copied ${emails.length} email(s) to clipboard as BCC.`;
}

async function moveToGmailBcc() {
  const { ok, leads } = await send("GET_LEADS");
  if (!ok) return;
  const emails = Array.from(
    new Set((leads || []).map((l) => normalizeEmail(l.email)).filter(Boolean))
  );
  if (!emails.length) {
    $("status").textContent = "No emails to move.";
    return;
  }

  const { ok: okSettings, settings } = await send("GET_SETTINGS");
  const clearAfter = okSettings ? !!settings?.clearAfterGmail : false;

  const confirmClear = clearAfter
    ? confirm(
        `This will open Gmail compose with ${emails.length} BCC emails AND clear stored leads. Continue?`
      )
    : true;
  if (!confirmClear) return;

  const res = await send("OPEN_GMAIL_BCC", {
    emails,
    clearAfter,
    subject: "",
    body: ""
  });
  if (!res.ok) {
    $("status").textContent = res.error || "Failed to open Gmail.";
    return;
  }
  $("status").textContent = `Opened Gmail compose with ${emails.length} BCC email(s).`;
  if (clearAfter) await refresh();
}

async function clearAll() {
  const yes = confirm("Clear all stored leads?");
  if (!yes) return;
  await send("CLEAR_LEADS");
  $("status").textContent = "Cleared.";
  await refresh();
}

async function exportCsv() {
  const { ok, leads } = await send("GET_LEADS");
  if (!ok) return;
  const csv = toCsv(leads || []);
  download(`leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

async function addManualLead() {
  const email = normalizeEmail($("manualEmail").value);
  const company = normalizeCompany($("manualCompany").value);
  if (!email) {
    $("extractStatus").textContent = "Email is required.";
    return;
  }
  if (!isValidEmail(email)) {
    $("extractStatus").textContent = "Please enter a valid email address.";
    return;
  }

  await send("UPSERT_LEADS", {
    leads: [
      {
        email,
        company,
        jobTitle: "",
        matchedTerms: [],
        sourceUrl: "",
        sourceTitle: "",
        sourceSite: "",
        sourceHost: "",
        jobUrl: "",
        context: "",
        createdAt: Date.now(),
        captureType: "manual"
      }
    ]
  });

  $("manualEmail").value = "";
  $("manualCompany").value = "";
  $("extractStatus").textContent = "Added.";
  await refresh();
}

async function extractEmailsFromText() {
  const text = $("manualText").value || "";
  if (!text.trim()) {
    $("extractStatus").textContent = "Paste some text first.";
    return;
  }
  const res = await send("EXTRACT_EMAILS_FROM_TEXT", { text });
  if (!res.ok) {
    $("extractStatus").textContent = res.error || "Failed to extract emails.";
    return;
  }
  const emails = Array.isArray(res.emails) ? res.emails : [];
  if (!emails.length) {
    $("extractStatus").textContent = "No emails found in the text.";
    return;
  }

  await send("UPSERT_LEADS", {
    leads: emails.map((email) => ({
      email: normalizeEmail(email),
      company: "",
      jobTitle: "",
      matchedTerms: [],
      sourceUrl: "",
      sourceTitle: "",
      sourceSite: "",
      sourceHost: "",
      jobUrl: "",
      context: "",
      createdAt: Date.now(),
      captureType: "manual"
    }))
  });
  $("extractStatus").textContent = `Added ${emails.length} email(s).`;
  await refresh();
}

async function init() {
  await loadSettingsIntoPopup();
  await refresh();

  $("scanBtn").addEventListener("click", scanThisPage);
  $("refreshBtn").addEventListener("click", refresh);
  $("openLeadsBtn").addEventListener("click", async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("leads.html") });
  });
  $("copyBccBtn").addEventListener("click", copyBccToClipboard);
  $("gmailBtn").addEventListener("click", moveToGmailBcc);
  $("clearBtn").addEventListener("click", clearAll);
  $("exportCsvBtn").addEventListener("click", exportCsv);

  $("clearAfterGmail").addEventListener("change", async (e) => {
    await updateClearAfterSetting(e.currentTarget.checked);
  });

  $("manualAddBtn").addEventListener("click", addManualLead);
  $("extractEmailsBtn").addEventListener("click", extractEmailsFromText);
  $("clearTextBtn").addEventListener("click", () => {
    $("manualText").value = "";
    $("extractStatus").textContent = "";
  });
}

init();


