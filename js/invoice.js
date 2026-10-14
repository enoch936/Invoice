import { getDrafts, saveDraft, deleteDraft } from "./storage.js";
import { populateCountrySelects, readParty, fillParty, renderParty, sanitizeParty } from "./parties.js";
import "./app.js";

const form = document.querySelector("#invoice-form");
const itemHost = document.querySelector("#line-items");
const status = document.querySelector("#form-status");
const savedHost = document.querySelector("#saved-drafts");
const currencySelect = document.querySelector("#invoice-currency") || form.elements.namedItem("currency");
const logoUrlInput = document.querySelector("#logo-url");
const logoFileInput = document.querySelector("#logo-file");
const logoClear = document.querySelector("#logo-clear");
let currentDraftId = null;
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
  row.innerHTML = `<input aria-label="Item description" class="item-description" placeholder="Service / item" value="">
<input aria-label="Quantity" class="item-quantity" type="number" min="0" step="0.1" value="">
<input aria-label="Unit price" class="item-price" type="number" min="0" step="0.01" value="">
<button type="button" class="remove-item" aria-label="Remove line item">×</button>`;
  row.querySelector(".remove-item").addEventListener("click", () => {
    if (itemHost.children.length > 1) {
      row.remove();
    } else {
      row.querySelector(".item-description").value = "";
      row.querySelector(".item-quantity").value = "1";
      row.querySelector(".item-price").value = "0";
    }
    render();
  });
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
  itemHost.append(row);
}

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
  reader.onload = () => { logo = String(reader.result || ""); if (logoUrlInput) logoUrlInput.value = ""; logoFileInput.value = ""; render(); status.textContent = "Logo added from file."; };
  reader.onerror = () => { status.textContent = "Could not read that image."; };
  reader.readAsDataURL(file);
});
logoClear?.addEventListener("click", () => { logo = ""; if (logoUrlInput) logoUrlInput.value = ""; if (logoFileInput) logoFileInput.value = ""; render(); status.textContent = "Logo removed."; });

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
  (data.items?.length ? data.items : [{}]).forEach(addLineItem);
  render();
}

function renderDrafts() {
  document.dispatchEvent(new Event("parchxa:drafts"));
  const drafts = getDrafts();
  savedHost.replaceChildren();
  if (!drafts.length) {
    const p = document.createElement("p");
    p.className = "muted-copy";
    p.textContent = "No saved drafts yet.";
    savedHost.append(p);
    return;
  }
  drafts.forEach((draft) => {
    const row = document.createElement("div");
    row.className = "draft-row";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = draft.number || "Untitled invoice";
    const sub = document.createElement("small");
    sub.textContent = `${draft.client || "No client"} · ${(draft.status || "draft").toUpperCase()} · ${new Date(draft.updatedAt).toLocaleDateString()}`;
    info.append(title, sub);
    const actions = document.createElement("div");
    actions.className = "draft-actions";
    const load = document.createElement("button");
    load.type = "button";
    load.textContent = "Load";
    load.addEventListener("click", () => {
      setData(draft);
      status.textContent = "Draft loaded.";
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-draft";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      deleteDraft(draft.id);
      if (currentDraftId === draft.id) currentDraftId = null;
      renderDrafts();
      status.textContent = "Draft deleted.";
    });
    actions.append(load, remove);
    row.append(info, actions);
    savedHost.append(row);
  });
}

form.addEventListener("input", render);
form.addEventListener("change", render);

document.querySelector("#add-item")?.addEventListener("click", () => {
  addLineItem();
  render();
});

document.querySelector("#save-draft")?.addEventListener("click", () => {
  if (!value("number").trim()) {
    status.textContent = "Add an invoice number before saving.";
    form.elements.namedItem("number")?.focus();
    return;
  }
  try {
    const saved = saveDraft(getData());
    currentDraftId = saved.id;
    renderDrafts();
    status.textContent = "Draft saved in this browser.";
  } catch {
    status.textContent = "Could not save. Check your browser storage settings.";
  }
});

document.querySelector("#print-invoice")?.addEventListener("click", () => {
  render();
  window.print();
});

document.querySelector("#clear-form")?.addEventListener("click", () => {
  if (confirm("Clear all invoice fields?")) {
    form.reset();
    currentDraftId = null;
    logo = "";
    if (logoUrlInput) logoUrlInput.value = "";
    if (logoFileInput) logoFileInput.value = "";
    itemHost.replaceChildren();
    addLineItem();
    const today = new Date().toISOString().slice(0, 10);
    form.elements.namedItem("date")?.setAttribute("value", today);
    render();
    status.textContent = "Form cleared.";
  }
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
