import { getDrafts, saveDraft, deleteDraft } from "./storage.js";
import { populateCountrySelects, readParty, fillParty, renderParty } from "./parties.js";
import "./app.js";

const QUOTE_STORAGE = "parchxa.quotationDrafts.v1";
const form = document.querySelector("#quote-form");
const host = document.querySelector("#quote-items");
const savedHost = document.querySelector("#saved-quotes");
const status = document.querySelector("#quote-status");
const logoUrlInput = document.querySelector("#logo-url");
const logoFileInput = document.querySelector("#logo-file");
const logoClear = document.querySelector("#logo-clear");
let currentId = null;
let logo = "";
const field = (name) => form.elements.namedItem(name)?.value ?? "";
const num = (name) => Math.max(0, Number(field(name)) || 0);
const escapeHTML = (text) => String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (amount, currency) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${currency} ${(Number(amount) || 0).toFixed(2)}`; }
};
function getQuoteDrafts() {
  try { const drafts = JSON.parse(localStorage.getItem(QUOTE_STORAGE) || "[]"); return Array.isArray(drafts) ? drafts : []; }
  catch { return []; }
}
function addItem(item = {}) {
  const row = document.createElement("div"); row.className = "line-item-row";
  row.innerHTML = `<input class="item-description" aria-label="Proposed work description" placeholder="Service / deliverable" value=""><input class="item-quantity" aria-label="Quantity" type="number" min="0" step="0.1" value=""><input class="item-price" aria-label="Unit price" type="number" min="0" step="0.01" value=""><button type="button" class="remove-item" aria-label="Remove item">×</button>`;
  row.querySelector(".remove-item").addEventListener("click", () => { if (host.children.length > 1) row.remove(); else { row.querySelector(".item-description").value = ""; row.querySelector(".item-quantity").value = "1"; row.querySelector(".item-price").value = "0"; } render(); });
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
  host.append(row);
}
function items() {
  return [...host.querySelectorAll(".line-item-row")].map((row) => ({
    description: row.querySelector(".item-description").value.trim(),
    quantity: Math.max(0, Number(row.querySelector(".item-quantity").value) || 0),
    price: Math.max(0, Number(row.querySelector(".item-price").value) || 0)
  }));
}
function data() {
  return { id: currentId, business: field("business"), client: field("client"), number: field("number"), currency: field("currency"), date: field("date"), valid: field("valid"), discount: num("discount"), tax: num("tax"), scope: field("scope"), terms: field("terms"), items: items(), businessDetails: readParty(form, "business"), clientDetails: readParty(form, "client"), logo, updatedAt: new Date().toISOString() };
}
// ---- Logo: a remote image URL or a local file embedded as a data URL ----
function setLogo(value, note) {
  logo = typeof value === "string" ? value : "";
  if (logoUrlInput) logoUrlInput.value = /^https?:\/\//i.test(logo) ? logo : "";
  if (logoFileInput) logoFileInput.value = "";
  if (note) status.textContent = note;
  render();
}
logoUrlInput?.addEventListener("change", () => setLogo(logoUrlInput.value.trim(), logoUrlInput.value.trim() ? "Logo set from URL." : "Logo removed."));
logoFileInput?.addEventListener("change", () => {
  const file = logoFileInput.files?.[0];
  if (!file) return;
  if (!/^image\//i.test(file.type)) { status.textContent = "Choose an image file (PNG, JPG, GIF, WebP or SVG)."; logoFileInput.value = ""; return; }
  if (file.size > 1500000) { status.textContent = "That image is larger than 1.5 MB. Use a smaller file or paste a URL."; logoFileInput.value = ""; return; }
  const reader = new FileReader();
  reader.onload = () => { logo = String(reader.result || ""); if (logoUrlInput) logoUrlInput.value = ""; logoFileInput.value = ""; render(); status.textContent = "Logo added from file."; };
  reader.onerror = () => { status.textContent = "Could not read that image."; };
  reader.readAsDataURL(file);
});
logoClear?.addEventListener("click", () => { logo = ""; if (logoUrlInput) logoUrlInput.value = ""; if (logoFileInput) logoFileInput.value = ""; render(); status.textContent = "Logo removed."; });

function render() {
  const logoImg = document.getElementById("q-logo");
  if (logoImg) { if (logo) { logoImg.src = logo; logoImg.hidden = false; } else { logoImg.removeAttribute("src"); logoImg.hidden = true; } }
  const d = data(), subtotal = d.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = subtotal * Math.min(100, d.discount) / 100;
  const tax = (subtotal - discount) * Math.min(100, d.tax) / 100;
  const total = subtotal - discount + tax;
  const put = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text || "—"; };
  put("q-number", d.number || "QUO-001"); put("q-date", d.date); put("q-valid", d.valid);
  put("q-business", d.business || "Your business name"); put("q-client", d.client || "Client name");
  put("q-scope", d.scope || "Details to be agreed with the client."); put("q-terms", d.terms || "Payment terms to be agreed.");
  put("q-subtotal", money(subtotal,d.currency)); put("q-discount", "−" + money(discount,d.currency)); put("q-tax", money(tax,d.currency)); put("q-total", money(total,d.currency)); put("q-grand", money(total,d.currency));
  renderParty("q-business", d.businessDetails); renderParty("q-client", d.clientDetails);
  const tbody = document.querySelector("#q-preview-items"); if (tbody) { tbody.replaceChildren();
    d.items.forEach((item) => {
      const tr = document.createElement("tr");
      [item.description || "Service or deliverable", String(item.quantity), money(item.price,d.currency), money(item.quantity*item.price,d.currency)].forEach((text) => { const td = document.createElement("td"); td.textContent = text; tr.append(td); });
      tbody.append(tr);
    });
    if (!d.items.length) { const tr = document.createElement("tr"), td = document.createElement("td"); td.colSpan = 4; td.textContent = "Add a proposed item"; tr.append(td); tbody.append(tr); }
  }
}
function setData(d) {
  currentId = d.id || null;
  for (const name of ["business","client","number","currency","date","valid","discount","tax","scope","terms"]) if (d[name] !== undefined && form.elements.namedItem(name)) form.elements.namedItem(name).value = d[name];
  logo = typeof d.logo === "string" ? d.logo : "";
  if (logoUrlInput) logoUrlInput.value = /^https?:\/\//i.test(logo) ? logo : "";
  if (logoFileInput) logoFileInput.value = "";
  fillParty(form, "business", d.businessDetails); fillParty(form, "client", d.clientDetails);
  host.replaceChildren(); (d.items?.length ? d.items : [{}]).forEach(addItem); render();
}
function renderSaved() {
  savedHost.replaceChildren(); const drafts = getQuoteDrafts();
  if (!drafts.length) { const p = document.createElement("p"); p.className = "muted-copy"; p.textContent = "No saved quotations yet."; savedHost.append(p); return; }
  drafts.forEach((draft) => {
    const row = document.createElement("div"); row.className = "draft-row";
    const info = document.createElement("div"), title = document.createElement("strong"), sub = document.createElement("small");
    title.textContent = draft.number || "Untitled quote"; sub.textContent = `${draft.client || "No client"} · ${new Date(draft.updatedAt).toLocaleDateString()}`; info.append(title,sub);
    const actions = document.createElement("div"); actions.className = "draft-actions";
    const load = document.createElement("button"); load.type = "button"; load.textContent = "Load"; load.addEventListener("click", () => { setData(draft); status.textContent = "Quotation loaded."; });
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-draft"; remove.textContent = "Delete"; remove.addEventListener("click", () => { localStorage.setItem(QUOTE_STORAGE, JSON.stringify(getQuoteDrafts().filter((d) => d.id !== draft.id))); if (currentId === draft.id) currentId = null; renderSaved(); status.textContent = "Quotation deleted."; });
    actions.append(load,remove); row.append(info,actions); savedHost.append(row);
  });
}
form.addEventListener("input", render); form.addEventListener("change", render);
document.querySelector("#add-quote-item")?.addEventListener("click", () => { addItem(); render(); });
document.querySelector("#save-quote")?.addEventListener("click", () => {
  if (!field("number").trim() || !field("client").trim()) { status.textContent = "Enter a quote number and client name before saving."; return; }
  try {
    const d = data(); d.id = currentId || (globalThis.crypto?.randomUUID?.() ?? String(Date.now())); d.updatedAt = new Date().toISOString();
    const drafts = getQuoteDrafts(), index = drafts.findIndex((item) => item.id === d.id);
    if (index >= 0) drafts[index] = d; else drafts.unshift(d);
    localStorage.setItem(QUOTE_STORAGE, JSON.stringify(drafts.slice(0,50))); currentId = d.id; renderSaved(); status.textContent = "Quotation draft saved in this browser.";
  } catch { status.textContent = "Could not save. Check your browser storage settings."; }
});
document.querySelector("#print-quote")?.addEventListener("click", () => { render(); window.print(); });
document.querySelector("#clear-quote")?.addEventListener("click", () => {
  if (confirm("Clear all quotation fields?")) {
    form.reset(); currentId = null; logo = ""; if (logoUrlInput) logoUrlInput.value = ""; if (logoFileInput) logoFileInput.value = ""; host.replaceChildren(); addItem();
    const today = new Date(), valid = new Date(today); valid.setDate(valid.getDate()+14);
    form.elements.namedItem("date").value = today.toISOString().slice(0,10);
    form.elements.namedItem("valid").value = valid.toISOString().slice(0,10);
    render(); renderSaved(); status.textContent = "Quotation cleared.";
  }
});
const today = new Date(), valid = new Date(today); valid.setDate(valid.getDate()+14);
if (!form.elements.namedItem("date").value) form.elements.namedItem("date").value = today.toISOString().slice(0,10);
if (!form.elements.namedItem("valid").value) form.elements.namedItem("valid").value = valid.toISOString().slice(0,10);
populateCountrySelects(form);
addItem(); render(); renderSaved();

