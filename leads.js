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

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function toCsv(leads) {
  const header = ["company", "email", "jobTitle", "sourceUrl", "jobUrl", "sourceHost", "createdAt"].join(",");
  const rows = leads.map((l) => {
    const cols = [
      l.company || "",
      l.email || "",
      l.jobTitle || "",
      l.sourceUrl || "",
      l.jobUrl || "",
      l.sourceHost || "",
      l.createdAt ? new Date(l.createdAt).toISOString() : ""
    ];
    return cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",");
  });
  return [header, ...rows].join("\n");
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

const state = {
  leads: [],
  filtered: [],
  selected: new Set(),
  openDetails: new Set(),
  page: 1,
  pageSize: 25,
  sourceFilter: "",
  q: ""
};

function applyFilters() {
  const q = state.q.trim().toLowerCase();
  const src = state.sourceFilter;
  const out = state.leads.filter((l) => {
    const host = l.sourceHost || safeHost(l.sourceUrl) || "";
    if (src && host !== src) return false;
    if (!q) return true;
    const hay =
      `${l.company || ""} ${l.email || ""} ${l.jobTitle || ""} ${l.sourceTitle || ""} ${l.sourceUrl || ""} ${host}`.toLowerCase();
    return hay.includes(q);
  });
  state.filtered = out;
  state.page = 1;
}

function updateSubtitle() {
  const total = state.leads.length;
  const shown = state.filtered.length;
  const selected = state.selected.size;
  $("subtitle").textContent = `Stored: ${total}. Matching: ${shown}. Selected: ${selected}.`;
}

function renderSourceFilter() {
  const hosts = new Map();
  for (const l of state.leads) {
    const host = l.sourceHost || safeHost(l.sourceUrl) || "(unknown)";
    hosts.set(host, (hosts.get(host) || 0) + 1);
  }
  const items = Array.from(hosts.entries()).sort((a, b) => b[1] - a[1]);

  const sel = $("sourceFilter");
  const current = state.sourceFilter;
  sel.innerHTML = `<option value="">All sources</option>${items
    .map(([h, n]) => `<option value="${escapeHtml(h)}">${escapeHtml(h)} (${n})</option>`)
    .join("")}`;
  sel.value = current;
}

function getPageSlice() {
  const total = state.filtered.length;
  const pageSize = state.pageSize;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  if (state.page > maxPage) state.page = maxPage;
  const start = (state.page - 1) * pageSize;
  const end = start + pageSize;
  return { start, end, total, maxPage, page: state.page };
}

function renderTable() {
  const { start, end, total, maxPage, page } = getPageSlice();
  const slice = state.filtered.slice(start, end);

  $("pagerText").textContent = total
    ? `Page ${page} / ${maxPage} — showing ${start + 1}-${Math.min(end, total)} of ${total}`
    : "No leads";

  $("prevBtn").disabled = page <= 1;
  $("nextBtn").disabled = page >= maxPage;

  const tbody = $("tbody");
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="mono">No leads to show.</td></tr>`;
    $("selectAllPage").checked = false;
    updateSubtitle();
    return;
  }

  tbody.innerHTML = slice
    .flatMap((l) => {
      const rawKey = leadKey(l);
      const key = escapeHtml(rawKey);
      const checked = state.selected.has(rawKey) ? "checked" : "";
      const host = escapeHtml(l.sourceHost || safeHost(l.sourceUrl) || "");
      const sourceUrl = l.sourceUrl || "";
      const openUrl = l.jobUrl || l.sourceUrl || "";
      const when = l.createdAt ? new Date(l.createdAt).toLocaleString() : "";
      const captureType = escapeHtml(l.captureType || "");
      const matchedTerms = Array.isArray(l.matchedTerms) ? l.matchedTerms : [];
      const matched = escapeHtml(matchedTerms.filter(Boolean).join(", "));
      const context = escapeHtml(l.context || "");
      const sourceTitle = escapeHtml(l.sourceTitle || "");
      const jobUrl = escapeHtml(l.jobUrl || "");
      const sourceUrlEsc = escapeHtml(sourceUrl || "");

      const isOpen = state.openDetails.has(rawKey);

      const hasUrl = !!(l.jobUrl || l.sourceUrl);
      const mainRow = `
        <tr data-key="${key}">
          <td class="colCheck"><input class="js-check" type="checkbox" data-key="${key}" ${checked} /></td>
          <td><div class="ellipsis" title="${escapeHtml(l.company || "")}">${escapeHtml(l.company || "(unknown)")}</div></td>
          <td class="mono">${escapeHtml(l.email || "")}</td>
          <td><div class="ellipsis" title="${escapeHtml(l.jobTitle || "")}">${escapeHtml(l.jobTitle || "")}</div></td>
          <td>
            <div class="pill" title="${sourceUrlEsc}">${host || "(unknown)"}</div>
          </td>
          <td class="mono">${escapeHtml(when)}</td>
          <td class="colActions">
            <div class="rowActions">
              <button class="btn btn--xs btn--subtle js-details" data-key="${key}" title="${isOpen ? "Hide details" : "Show details"}">${isOpen ? "▲" : "▼"}</button>
              ${hasUrl ? `<button class="btn btn--xs btn--subtle js-open" data-url="${escapeHtml(openUrl)}" title="Open source">↗</button>` : ''}
              <button class="btn btn--xs btn--danger-subtle js-del" data-key="${key}" title="Delete">✕</button>
            </div>
          </td>
        </tr>
      `;

      if (!isOpen) return [mainRow];

      const detailsRow = `
        <tr class="detailRow" data-detail-for="${key}">
          <td colspan="7">
            <div class="detailBox">
              <div class="detailGrid">
                <div class="detailItem">
                  <div class="detailLabel">Captured via</div>
                  <div class="detailValue">${captureType || "—"}</div>
                </div>
                <div class="detailItem">
                  <div class="detailLabel">Matched terms</div>
                  <div class="detailValue">${matched || "—"}</div>
                </div>
                <div class="detailItem">
                  <div class="detailLabel">Page title</div>
                  <div class="detailValue">${sourceTitle || "—"}</div>
                </div>
                <div class="detailItem">
                  <div class="detailLabel">Source URL</div>
                  <div class="detailValue mono">${sourceUrlEsc || "—"}</div>
                </div>
                <div class="detailItem">
                  <div class="detailLabel">Job URL</div>
                  <div class="detailValue mono">${jobUrl || "—"}</div>
                </div>
              </div>

              <div class="detailContext">
                <div class="detailLabel">Context snippet</div>
                <div class="detailValue">${context || "—"}</div>
              </div>
            </div>
          </td>
        </tr>
      `;

      return [mainRow, detailsRow];
    })
    .join("");

  for (const el of tbody.querySelectorAll(".js-check")) {
    el.addEventListener("change", (e) => {
      const key = e.currentTarget.getAttribute("data-key");
      if (!key) return;
      if (e.currentTarget.checked) state.selected.add(key);
      else state.selected.delete(key);
      syncSelectAllPage();
      updateSubtitle();
    });
  }

  for (const el of tbody.querySelectorAll(".js-open")) {
    el.addEventListener("click", async (e) => {
      const url = e.currentTarget.getAttribute("data-url");
      if (!url) return;
      await chrome.tabs.create({ url });
    });
  }

  for (const el of tbody.querySelectorAll(".js-del")) {
    el.addEventListener("click", async (e) => {
      const key = e.currentTarget.getAttribute("data-key");
      await send("DELETE_LEAD", { key });
      await refresh();
    });
  }

  for (const el of tbody.querySelectorAll(".js-details")) {
    el.addEventListener("click", async (e) => {
      const key = e.currentTarget.getAttribute("data-key");
      if (!key) return;
      if (state.openDetails.has(key)) state.openDetails.delete(key);
      else state.openDetails.add(key);
      renderTable();
    });
  }

  syncSelectAllPage();
  updateSubtitle();
}

function syncSelectAllPage() {
  const { start, end } = getPageSlice();
  const sliceKeys = state.filtered.slice(start, end).map(leadKey);
  const allSelected = sliceKeys.length > 0 && sliceKeys.every((k) => state.selected.has(k));
  $("selectAllPage").checked = allSelected;
}

async function refresh() {
  $("status").textContent = "Loading…";
  const settingsRes = await send("GET_SETTINGS");
  if (settingsRes.ok) applyTheme(settingsRes.settings?.theme);
  const res = await send("GET_LEADS");
  if (!res.ok) {
    $("status").textContent = res.error || "Failed to load leads.";
    return;
  }
  state.leads = Array.isArray(res.leads) ? res.leads : [];
  renderSourceFilter();
  applyFilters();
  renderTable();
  $("status").textContent = "";
}

async function copyBcc() {
  const emails = Array.from(state.selected)
    .map((k) => k.split("|")[0])
    .map(normalizeEmail)
    .filter(Boolean);
  if (!emails.length) {
    $("status").textContent = "Select at least one lead first.";
    return;
  }
  const res = await send("COPY_BCC", { emails });
  if (!res.ok) {
    $("status").textContent = res.error || "Failed to build BCC.";
    return;
  }
  await navigator.clipboard.writeText(res.bcc || "");
  $("status").textContent = `Copied ${emails.length} email(s) to clipboard as BCC.`;
}

async function moveToGmail() {
  const emails = Array.from(state.selected)
    .map((k) => k.split("|")[0])
    .map(normalizeEmail)
    .filter(Boolean);
  if (!emails.length) {
    $("status").textContent = "Select at least one lead first.";
    return;
  }
  const resSettings = await send("GET_SETTINGS");
  const clearAfter = resSettings.ok ? !!resSettings.settings?.clearAfterGmail : false;
  const confirmClear = clearAfter
    ? confirm(`Open Gmail with ${emails.length} BCC emails and delete them from storage?`)
    : true;
  if (!confirmClear) return;

  const res = await send("OPEN_GMAIL_BCC", { emails, clearAfter });
  if (!res.ok) {
    $("status").textContent = res.error || "Failed to open Gmail.";
    return;
  }
  $("status").textContent = `Opened Gmail compose with ${emails.length} BCC email(s).`;
  if (clearAfter) {
    // Remove selected keys from selection and refresh.
    state.selected.clear();
    await refresh();
  }
}

async function exportCsv() {
  const res = await send("GET_LEADS");
  if (!res.ok) return;
  const csv = toCsv(res.leads || []);
  download(`leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

async function deleteSelected() {
  if (!state.selected.size) {
    $("status").textContent = "Select at least one lead first.";
    return;
  }
  const yes = confirm(`Delete ${state.selected.size} selected lead(s)?`);
  if (!yes) return;
  const keys = Array.from(state.selected);
  await send("DELETE_LEADS", { keys });
  state.selected.clear();
  await refresh();
}

async function clearAll() {
  const yes = confirm("Clear ALL stored leads?");
  if (!yes) return;
  await send("CLEAR_LEADS");
  state.selected.clear();
  await refresh();
}

function wire() {
  $("refreshBtn").addEventListener("click", refresh);

  $("search").addEventListener("input", (e) => {
    state.q = e.currentTarget.value || "";
    applyFilters();
    renderTable();
  });

  $("sourceFilter").addEventListener("change", (e) => {
    state.sourceFilter = e.currentTarget.value || "";
    applyFilters();
    renderTable();
  });

  $("pageSize").addEventListener("change", (e) => {
    state.pageSize = Number.parseInt(e.currentTarget.value, 10) || 25;
    state.page = 1;
    renderTable();
  });

  $("prevBtn").addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderTable();
  });
  $("nextBtn").addEventListener("click", () => {
    const { maxPage } = getPageSlice();
    state.page = Math.min(maxPage, state.page + 1);
    renderTable();
  });

  $("selectAllPage").addEventListener("change", (e) => {
    const checked = e.currentTarget.checked;
    const { start, end } = getPageSlice();
    const slice = state.filtered.slice(start, end);
    for (const l of slice) {
      const k = leadKey(l);
      if (checked) state.selected.add(k);
      else state.selected.delete(k);
    }
    renderTable();
  });

  $("copyBccBtn").addEventListener("click", copyBcc);
  $("gmailBtn").addEventListener("click", moveToGmail);
  $("exportBtn").addEventListener("click", exportCsv);
  $("deleteSelectedBtn").addEventListener("click", deleteSelected);
  $("clearAllBtn").addEventListener("click", clearAll);
}

wire();
refresh();


