const STORAGE_KEY = "parchxa.invoiceDrafts.v1";

export function getDrafts() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft) {
  const drafts = getDrafts();
  const id = draft.id || (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  const next = { ...draft, id, updatedAt: new Date().toISOString() };
  const index = drafts.findIndex((item) => item.id === id);
  if (index >= 0) drafts[index] = next;
  else drafts.unshift(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts.slice(0, 30)));
  return next;
}

export function deleteDraft(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getDrafts().filter((draft) => draft.id !== id)));
}