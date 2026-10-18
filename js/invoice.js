import { getDrafts, saveDraft, deleteDraft } from "./storage.js";
import { populateCountrySelects, readParty, fillParty, renderParty, sanitizeParty } from "./parties.js";
import "./app.js";
import { confirmDialog } from "./iv-dialog.js";
import { validateAll } from "./invoice-validate.js";

const form = document.querySelector("#invoice-form");
const itemHost = document.querySelector("#line-items");
const status = document.querySelector("#form-status");
const savedHost = document.querySelector("#saved-drafts");
const currencySelect = document.querySelector("#invoice-currency") || form.elements.namedItem("currency");
const logoUrlInput = document.querySelector("#logo-url");
const logoFileInput = document.querySelector("#logo-file");
const logoClear = document.querySelector("#logo-clear");
let currentDraftId = null;
let dirty = false;
const emit = (type, detail = {}) => document.dispatchEvent(new CustomEvent("parchxa:invoice", { detail: { type, ...detail } }));
function setDirty(next) { dirty = next; emit(next ? "dirty" : "clean"); }
addEventListener("beforeunload", (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
let logo = "";

const money = (amount, currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${currency} ${(Number(amount)||0).toFixed(2)}`;
  }
};
const value = (name) => form.elements.namedItem(name)?.value ?? "";
const num = (name) => Math.max(0, Number(value(name)) || 0);
const escapeHTML = (text) => String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function addLineItem(item = {}) {
  const row = document.createElement("div");
  row.className = "line-item-row";
  row.innerHTML = `<textarea aria-label="Item description" class="item-description" rows="1" placeholder="Service or product" autocomplete="off" spellcheck="true"></textarea>
<input aria-label="Quantity" class="item-quantity" type="number" min="0" step="any" inputmode="decimal" placeholder="Qty">
<input aria-label="Unit price" class="item-price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Price">
<output class="item-amount" aria-label="Line amount">0.00</output>
<button type="button" class="remove-item" aria-label="Remove line item" title="Remove item">×</button>`;
  const blank = (v) => v === undefined || v === null || v === "";
  row.querySelector(".item-description").value = String(item.description ?? "");
  row.querySelector(".item-quantity").value = blank(item.quantity) ? "1" : String(item.quantity);
  row.querySelector(".item-price").value = blank(item.price) ? "" : String(item.price);
  row.querySelector(".remove-item").addEventListener("click", () => {
    if (row.nextElementSibling?.classList?.contains("iv-row-msg")) row.nextElementSibling.remove();
    row.remove();
    setDirty(true);
    render();
    document.querySelector("#add-item")?.focus();
  });
  row.querySelectorAll("input, textarea").forEach((input) => input.addEventListener("input", render));
  row.querySelector(".item-description").addEventListener("input", (event) => fitTextarea(event.target));
  row.querySelector(".item-price").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && row === itemHost.lastElementChild) {
      event.preventDefault();
      addLineItem();
      setDirty(true);
      render();
      itemHost.lastElementChild.querySelector(".item-description").focus();
    }
  });
  itemHost.append(row);
  fitTextarea(row.querySelector(".item-description"));
}
// Description fields grow with their content so long text is never clipped (skipped while hidden).
function fitTextarea(area) {
  if (!area || area.offsetParent === null) return;
  area.style.height = "auto";
  area.style.height = `${area.scrollHeight + 2}px`;
}
document.querySelector('.iv-section[data-section="items"]')?.addEventListener("toggle", () => itemHost.querySelectorAll(".item-description").forEach(fitTextarea));
window.addEventListener("resize", () => itemHost.querySelectorAll(".item-description").forEach(fitTextarea));
function readItems() {
  return [...itemHost.querySelectorAll(".line-item-row")].map((row) => ({
    description: row.querySelector(".item-description").value.trim(),
    quantity: Math.max(0, Number(row.querySelector(".item-quantity").value) || 0),
    price: Math.max(0, Number(row.querySelector(".item-price").value) || 0)
  }));
}

function getData() {
  return {
    id: currentDraftId,
    business: value("business"),
    client: value("client"),
    number: value("number"),
    currency: value("currency"),
    date: value("date"),
    due: value("due"),
    status: value("status") || "draft",
    discount: num("discount"),
    tax: num("tax"),
    notes: value("notes"),
    items: readItems(),
    businessDetails: readParty(form, "business"),
    clientDetails: readParty(form, "client"),
    logo,
    updatedAt: new Date().toISOString()
  };
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
  reader.onload = () => { logo = String(reader.result || ""); if (logoUrlInput) logoUrlInput.value = ""; logoFileInput.value = ""; setDirty(true); render(); status.textContent = "Logo added from file."; };
  reader.onerror = () => { status.textContent = "Could not read that image."; };
  reader.readAsDataURL(file);
});
logoClear?.addEventListener("click", () => { setDirty(true); logo = ""; if (logoUrlInput) logoUrlInput.value = ""; if (logoFileInput) logoFileInput.value = ""; render(); status.textContent = "Logo removed."; });

function render() {
  const logoImg = document.getElementById("preview-logo");
  if (logoImg) {
    if (logo) { logoImg.src = logo; logoImg.hidden = false; } else { logoImg.removeAttribute("src"); logoImg.hidden = true; }
  }
  const data = getData();
  const currency = data.currency;
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = subtotal * Math.min(100, data.discount) / 100;
  const tax = (subtotal - discount) * Math.min(100, data.tax) / 100;
  const total = subtotal - discount + tax;
  const plain = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  [...itemHost.querySelectorAll(".line-item-row")].forEach((row, index) => {
    const entry = data.items[index], out = row.querySelector(".item-amount");
    if (out && entry) out.textContent = plain.format(entry.quantity * entry.price);
  });
  const emptyState = document.getElementById("items-empty"), itemsHead = document.querySelector(".line-items-head");
  if (emptyState) emptyState.hidden = itemHost.children.length > 0;
  if (itemsHead) { itemsHead.hidden = itemHost.children.length === 0; const label = itemsHead.querySelector("[data-amount-head]"); if (label) label.textContent = `Amount (${currency})`; }
  const text = (id, content) => {
    const node = document.getElementById(id);
    if (node) node.textContent = content || "—";
  };
  text("preview-number", data.number || "INV-001");
  text("preview-business", data.business || "Your business name");
  text("preview-client", data.client || "Client name");
  text("preview-date", data.date || "—");
  text("preview-due", data.due || "—");
  text("preview-notes", data.notes || "Thank you for your business.");
  text("preview-subtotal", money(subtotal, currency));
  text("preview-discount", "−" + money(discount, currency));
  text("preview-tax", money(tax, currency));
  text("preview-total", money(total, currency));
  renderParty("preview-business", data.businessDetails);
  renderParty("preview-client", data.clientDetails);
  const grand = document.getElementById("preview-grand");
  if (grand) grand.textContent = money(total, currency);
  const tbody = document.querySelector("#preview-items");
  if (tbody) {
    tbody.replaceChildren();
    data.items.forEach((item) => {
      const tr = document.createElement("tr");
      [item.description || "Service or product", String(item.quantity), money(item.price, currency), money(item.quantity * item.price, currency)].forEach((content) => {
        const td = document.createElement("td");
        td.textContent = content;
        tr.append(td);
      });
      tbody.append(tr);
    });
    if (!data.items.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "Add a line item";
      tr.append(td);
      tbody.append(tr);
    }
  }
}

function setData(data) {
  currentDraftId = data.id || null;
  for (const name of ["business", "client", "number", "currency", "date", "due", "status", "discount", "tax", "notes"]) {
    if (data[name] !== undefined && form.elements.namedItem(name)) {
      form.elements.namedItem(name).value = data[name];
    }
  }
  logo = typeof data.logo === "string" ? data.logo : "";
  if (logoUrlInput) logoUrlInput.value = /^https?:\/\//i.test(logo) ? logo : "";
  if (logoFileInput) logoFileInput.value = "";
  fillParty(form, "business", data.businessDetails);
  fillParty(form, "client", data.clientDetails);
  itemHost.replaceChildren();
  (data.items?.length ? data.items : [{}]).forEach((entry) => addLineItem(entry));
  render();
  dirty = false;
  emit("loaded");
}

function renderDrafts() {
  document.dispatchEvent(new Event("parchxa:drafts"));
  const drafts = getDrafts();
  savedHost.replaceChildren();
  if (!drafts.length) {
    const p = document.createElement("p");
    p.className = "muted-copy";
    p.textContent = "No saved drafts yet. Save one and it will appear here.";
    savedHost.append(p);
    return;
  }
  const totalOf = (d) => {
    const sub = (d.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
    const disc = sub * Math.min(100, Number(d.discount) || 0) / 100;
    return (sub - disc) * (1 + Math.min(100, Number(d.tax) || 0) / 100);
  };
  drafts.forEach((draft) => {
    const row = document.createElement("div");
    row.className = "draft-row";
    const info = document.createElement("div");
    info.className = "draft-info";
    const title = document.createElement("strong");
    title.textContent = draft.number || "Untitled invoice";
    const state = ["draft", "sent", "paid"].includes(draft.status) ? draft.status : "draft";
    const chip = document.createElement("span");
    chip.className = "iv-chip";
    chip.dataset.status = state;
    chip.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    const sub = document.createElement("small");
    sub.textContent = `${draft.client || "No client"} · ${new Date(draft.updatedAt).toLocaleDateString()}`;
    const head = document.createElement("div");
    head.className = "draft-head";
    head.append(title, chip);
    info.append(head, sub);
    const amount = document.createElement("div");
    amount.className = "draft-total";
    amount.textContent = money(totalOf(draft), draft.currency || "USD");
    const actions = document.createElement("div");
    actions.className = "draft-actions";
    const load = document.createElement("button");
    load.type = "button";
    load.textContent = "Open";
    load.addEventListener("click", async () => {
      if (dirty && !(await confirmDialog({ title: "Discard unsaved changes?", message: `Opening ${draft.number || "this draft"} replaces the invoice you are editing.`, confirmLabel: "Open draft" }))) return;
      setData(draft);
      status.textContent = "Draft opened.";
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-draft";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!(await confirmDialog({ title: `Delete ${draft.number || "this draft"}?`, message: "This removes the saved draft from this browser. It can't be undone.", confirmLabel: "Delete draft", danger: true }))) return;
      deleteDraft(draft.id);
      if (currentDraftId === draft.id) currentDraftId = null;
      renderDrafts();
      status.textContent = "Draft deleted.";
    });
    actions.append(load, remove);
    row.append(info, amount, actions);
    savedHost.append(row);
  });
}
form.addEventListener("input", () => { setDirty(true); render(); });
form.addEventListener("change", () => { setDirty(true); render(); });

document.querySelector("#add-item")?.addEventListener("click", () => {
  addLineItem();
  setDirty(true);
  render();
  itemHost.lastElementChild?.querySelector(".item-description")?.focus();
});

document.querySelector("#save-draft")?.addEventListener("click", () => {
  const issues = validateAll(form, itemHost, true);
  const blocking = issues.find((issue) => issue.blocking);
  if (blocking) {
    status.textContent = blocking.message;
    document.dispatchEvent(new CustomEvent("parchxa:focus-issue", { detail: { section: blocking.section } }));
    blocking.el?.focus();
    return;
  }
  try {
    const saved = saveDraft(getData());
    currentDraftId = saved.id;
    dirty = false;
    renderDrafts();
    emit("saved", { at: saved.updatedAt });
    status.textContent = issues.length ? `Draft saved. ${issues.length} field${issues.length > 1 ? "s" : ""} still need attention.` : "Draft saved in this browser.";
  } catch {
    status.textContent = "Could not save. Check your browser storage settings.";
  }
});
document.querySelector("#print-invoice")?.addEventListener("click", () => {
  render();
  window.print();
});

document.querySelector("#clear-form")?.addEventListener("click", async () => {
  const ok = await confirmDialog({ title: "Clear this invoice?", message: dirty ? "Every field will be reset and your unsaved changes will be lost." : "Every field will be reset. Saved drafts are not affected.", confirmLabel: "Clear invoice", danger: true });
  if (!ok) return;
  form.reset();
  currentDraftId = null;
  logo = "";
  if (logoUrlInput) logoUrlInput.value = "";
  if (logoFileInput) logoFileInput.value = "";
  form.querySelectorAll(".iv-error").forEach((node) => { node.textContent = ""; });
  form.querySelectorAll(".iv-row-msg").forEach((node) => node.remove());
  form.querySelectorAll("[aria-invalid]").forEach((node) => node.removeAttribute("aria-invalid"));
  itemHost.replaceChildren();
  addLineItem();
  form.elements.namedItem("date").value = new Date().toISOString().slice(0, 10);
  render();
  dirty = false;
  emit("cleared");
  status.textContent = "Invoice cleared.";
});

const today = new Date().toISOString().slice(0, 10);
const dateInput = form.elements.namedItem("date");
if (dateInput && !dateInput.value) dateInput.value = today;

populateCountrySelects(form);
addLineItem();
render();
renderDrafts();


// ---- Share link (data lives in the URL hash; nothing is uploaded) ----
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const clean = (v, n = 500) => String(v ?? "").slice(0, n);
function sanitize(d) {
  const n = (x, max = 1e12) => Math.min(max, Math.max(0, Number(x) || 0));
  const currencies = [...form.elements.namedItem("currency").options].map((o) => o.value);
  return {
    business: clean(d.business, 120), client: clean(d.client, 120), number: clean(d.number, 40),
    currency: currencies.includes(d.currency) ? d.currency : "USD",
    date: /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : "", due: /^\d{4}-\d{2}-\d{2}$/.test(d.due) ? d.due : "",
    status: ["draft", "sent", "paid"].includes(d.status) ? d.status : "draft",
    discount: n(d.discount, 100), tax: n(d.tax, 100), notes: clean(d.notes, 1000),
    logo: (typeof d.logo === "string" && d.logo.length <= 1200000 && /^(https?:\/\/|data:image\/(png|jpeg|jpg|gif|webp|svg\+xml))/i.test(d.logo)) ? d.logo : "",
    businessDetails: sanitizeParty(d.businessDetails),
    clientDetails: sanitizeParty(d.clientDetails),
    items: (Array.isArray(d.items) ? d.items : []).slice(0, 40).map((i) => ({ description: clean(i?.description, 200), quantity: n(i?.quantity, 1e9), price: n(i?.price, 1e9) })),
  };
}
document.querySelector("#share-invoice")?.addEventListener("click", async () => {
  try {
    const { id, updatedAt, ...data } = getData();
    const raw = new TextEncoder().encode(JSON.stringify(data));
    const packed = "CompressionStream" in window ? "z" + b64u(await pipe(raw, new CompressionStream("deflate-raw"))) : "r" + b64u(raw);
    const url = location.origin + location.pathname + "#d=" + packed;
    if (url.length > 6000) { status.textContent = /^data:/.test(data.logo || "") ? "A locally uploaded logo is too big for a share link. Paste an image URL, or share without the logo." : "Invoice is too large for a share link. Remove some items or notes."; return; }
    await navigator.clipboard.writeText(url);
    status.textContent = "Share link copied. Anyone with it can view this invoice.";
  } catch { status.textContent = "Could not create a share link in this browser."; }
});
async function loadShared() {
  const m = location.hash.match(/^#d=([zr][A-Za-z0-9_-]{1,6000})$/);
  if (!m) return;
  try {
    const bytes = unb64u(m[1].slice(1));
    const raw = m[1][0] === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
    setData({ ...sanitize(JSON.parse(new TextDecoder().decode(raw))), id: null });
    status.textContent = "Loaded a shared invoice. Edit freely; your changes stay in this browser.";
  } catch { status.textContent = "That share link could not be read."; }
}
loadShared();
