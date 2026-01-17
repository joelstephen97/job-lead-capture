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

function $(id) {
  return document.getElementById(id);
}

async function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function applyTheme(theme) {
  const t = String(theme || "system");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else document.documentElement.removeAttribute("data-theme");
}

function parseKeywords(text) {
  return String(text || "")
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
}

function keywordsToText(keywords) {
  return (keywords || []).join("\n");
}

async function load() {
  const res = await send("GET_SETTINGS");
  const settings = res.ok ? res.settings : DEFAULT_SETTINGS;
  applyTheme(settings.theme);
  $("keywords").value = keywordsToText(settings.keywords);
  $("clearAfterGmail").checked = !!settings.clearAfterGmail;
  $("requireEmail").checked = !!settings.requireEmail;
  $("autoScanEnabled").checked = !!settings.autoScanEnabled;
  $("autoScanVisibleOnly").checked = settings.autoScanVisibleOnly !== false;
  $("badgeEnabled").checked = settings.badgeEnabled !== false;
  $("theme").value = String(settings.theme || "system");
  $("maxLeads").value = String(settings.maxLeads || DEFAULT_SETTINGS.maxLeads);
  await refreshPermissionStatus(settings);
}

async function refreshPermissionStatus(settings) {
  const hasAllUrls = await chrome.permissions.contains({ origins: ["<all_urls>"] });
  const wantsAllSites = !!settings?.autoScanAllSites;
  $("permStatus").textContent = hasAllUrls
    ? `All-sites permission: granted. All-sites auto-scan setting: ${wantsAllSites ? "ON" : "OFF"}.`
    : "All-sites permission: not granted (auto-scan will run on LinkedIn only).";

  $("grantAllSitesBtn").disabled = hasAllUrls;
  $("revokeAllSitesBtn").disabled = !hasAllUrls;
}

async function save(settings) {
  const res = await send("SET_SETTINGS", { settings });
  if (!res.ok) throw new Error(res.error || "Failed to save.");
  return res.settings;
}

async function init() {
  await load();

  $("saveBtn").addEventListener("click", async () => {
    $("status").textContent = "Saving…";
    try {
      const hasAllUrls = await chrome.permissions.contains({ origins: ["<all_urls>"] });
      const currentRes = await send("GET_SETTINGS");
      const current = currentRes.ok ? currentRes.settings : DEFAULT_SETTINGS;
      const maxLeads = Math.max(
        100,
        Number.parseInt($("maxLeads").value, 10) || DEFAULT_SETTINGS.maxLeads
      );
      const settings = {
        keywords: parseKeywords($("keywords").value),
        clearAfterGmail: $("clearAfterGmail").checked,
        requireEmail: $("requireEmail").checked,
        autoScanEnabled: $("autoScanEnabled").checked,
        autoScanVisibleOnly: $("autoScanVisibleOnly").checked,
        badgeEnabled: $("badgeEnabled").checked,
        theme: $("theme").value || "system",
        maxLeads,
        // Keep existing preference if permission is granted, otherwise force OFF.
        autoScanAllSites: hasAllUrls ? !!current.autoScanAllSites : false
      };
      await save(settings);
      applyTheme(settings.theme);
      $("status").textContent = "Saved.";
      await refreshPermissionStatus(settings);
    } catch (e) {
      $("status").textContent = String(e?.message || e);
    }
  });

  $("grantAllSitesBtn").addEventListener("click", async () => {
    $("status").textContent = "Requesting permission…";
    try {
      const granted = await chrome.permissions.request({ origins: ["<all_urls>"] });
      if (!granted) {
        $("status").textContent = "Permission request declined.";
        const res = await send("GET_SETTINGS");
        await refreshPermissionStatus(res.ok ? res.settings : DEFAULT_SETTINGS);
        return;
      }

      // Save settings enabling all-sites auto-scan.
      const res = await send("GET_SETTINGS");
      const current = res.ok ? res.settings : DEFAULT_SETTINGS;
      const next = { ...current, autoScanEnabled: true, autoScanAllSites: true };
      await save(next);
      $("autoScanEnabled").checked = true;
      $("status").textContent = "All-sites auto-scan enabled.";
      await refreshPermissionStatus(next);
    } catch (e) {
      $("status").textContent = String(e?.message || e);
    }
  });

  $("revokeAllSitesBtn").addEventListener("click", async () => {
    const yes = confirm("Disable all-sites auto-scan and remove the all-sites permission?");
    if (!yes) return;
    $("status").textContent = "Disabling…";
    try {
      await chrome.permissions.remove({ origins: ["<all_urls>"] });
      const res = await send("GET_SETTINGS");
      const current = res.ok ? res.settings : DEFAULT_SETTINGS;
      const next = { ...current, autoScanAllSites: false };
      await save(next);
      $("status").textContent = "All-sites auto-scan disabled.";
      await refreshPermissionStatus(next);
    } catch (e) {
      $("status").textContent = String(e?.message || e);
    }
  });

  $("resetBtn").addEventListener("click", async () => {
    const yes = confirm("Reset to defaults?");
    if (!yes) return;
    $("status").textContent = "Resetting…";
    try {
      await save(DEFAULT_SETTINGS);
      await load();
      $("status").textContent = "Reset to defaults.";
    } catch (e) {
      $("status").textContent = String(e?.message || e);
    }
  });
}

init();


