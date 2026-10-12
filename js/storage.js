const INVOICE_STORAGE = "parchxa.invoiceDrafts.v1";
const QUOTE_STORAGE = "parchxa.quotationDrafts.v1";
const SETTINGS_STORAGE = "parchxa.settings.v1";

export function getDrafts(key = INVOICE_STORAGE) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft, key = INVOICE_STORAGE) {
  const drafts = getDrafts(key);
  const id = draft.id || (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  const next = { ...draft, id, updatedAt: new Date().toISOString() };
  const index = drafts.findIndex((item) => item.id === id);
  if (index >= 0) drafts[index] = next;
  else drafts.unshift(next);
  localStorage.setItem(key, JSON.stringify(drafts.slice(0, 50)));
  return next;
}

export function deleteDraft(id, key = INVOICE_STORAGE) {
  localStorage.setItem(key, JSON.stringify(getDrafts(key).filter((draft) => draft.id !== id)));
}

export function getSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_STORAGE) || "{}");
    return typeof value === "object" && value ? value : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE, JSON.stringify({ ...getSettings(), ...settings, updatedAt: new Date().toISOString() }));
}
