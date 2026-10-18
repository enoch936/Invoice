// Inline validation for the invoice form. Presentation only: it never changes invoice data.
// Each problem is shown beside its field (aria-invalid + aria-describedby + a role="alert" message).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pct = (v) => { if (v === "") return ""; const n = Number(v); if (!Number.isFinite(n)) return "Enter a number."; return n < 0 || n > 100 ? "Enter a value from 0 to 100." : ""; };
const email = (v) => (v && !EMAIL.test(v.trim()) ? "Enter a valid email address." : "");
const url = (v) => { if (!v) return ""; try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? "" : "Use a link that starts with https://"; } catch { return "Use a full link that starts with https://"; } };

/** field name -> (value, allValues) => message ("" when valid) */
export const RULES = {
  number: (v) => (v.trim() ? "" : "Invoice number is required."),
  date: (v) => (v ? "" : "Choose an issue date."),
  due: (v, all) => (v && all.date && v < all.date ? "Due date can't be before the issue date." : ""),
  discount: pct, tax: pct,
  "business-email": email, "client-email": email,
  "logo-url": url,
};
/** Problems that stop a draft from being saved (everything else is advisory). */
export const BLOCKING = new Set(["number"]);

const values = (form) => Object.fromEntries(Object.keys(RULES).map((n) => [n, form.elements.namedItem(n)?.value ?? ""]));

function slot(el) {
  const host = el.closest("label") || el.parentElement;
  let node = host.querySelector(":scope > .iv-error");
  if (!node) { node = document.createElement("span"); node.className = "iv-error"; node.id = `err-${el.name || el.id}`; node.setAttribute("role", "alert"); host.append(node); }
  return node;
}
/** Show or clear a message beside a field. */
export function setIssue(el, message) {
  const node = slot(el);
  node.textContent = message || "";
  if (message) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", node.id); }
  else { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); }
}
export function validateField(form, name, show = true) {
  const el = form.elements.namedItem(name); if (!el || !RULES[name]) return "";
  const message = RULES[name](el.value ?? "", values(form));
  if (show) setIssue(el, message);
  return message;
}
function validateRow(row, show) {
  let message = "";
  for (const [cls, label] of [[".item-quantity", "Quantity"], [".item-price", "Price"]]) {
    const el = row.querySelector(cls); if (!el) continue;
    const bad = el.value !== "" && !(Number(el.value) >= 0);
    if (bad) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    if (bad && !message) message = `${label} must be 0 or more.`;
  }
  if (show) {
    let note = row.nextElementSibling?.classList?.contains("iv-row-msg") ? row.nextElementSibling : null;
    if (message && !note) { note = document.createElement("p"); note.className = "iv-row-msg"; note.setAttribute("role", "alert"); row.after(note); }
    if (note) { note.textContent = message; if (!message) note.remove(); }
  }
  return message;
}
export function validateRows(host, show = true) {
  return [...host.querySelectorAll(".line-item-row")].map((r) => ({ row: r, message: validateRow(r, show) })).filter((x) => x.message);
}
/** Validate everything; returns [{name, el, message, section, blocking}] in document order. */
export function validateAll(form, host, show = true) {
  const out = [];
  for (const name of Object.keys(RULES)) {
    const message = validateField(form, name, show);
    if (message) { const el = form.elements.namedItem(name); out.push({ name, el, message, section: el.closest(".iv-section")?.dataset.section, blocking: BLOCKING.has(name) }); }
  }
  for (const { row, message } of validateRows(host, show)) out.push({ name: "item", el: row.querySelector("[aria-invalid]") || row.querySelector("input"), message, section: "items", blocking: false });
  return out;
}
