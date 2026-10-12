import { getDrafts, saveDraft, deleteDraft } from "./storage.js";
import "./app.js";

const form = document.querySelector("#invoice-form");
const itemHost = document.querySelector("#line-items");
const status = document.querySelector("#form-status");
const savedHost = document.querySelector("#saved-drafts");
let currentDraftId = null;
const money = (amount, currency) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${currency} ${(Number(amount) || 0).toFixed(2)}`; }
};
const value = (name) => form.elements.namedItem(name)?.value ?? "";
const num = (name) => Math.max(0, Number(value(name)) || 0);
const escapeHTML = (text) => String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);

function addLineItem(item = {}) {
  const row = document.createElement("div");
  row.className = "line-item-row";
  row.innerHTML = `<input aria-label="Item description" class="item-description" placeholder="Service / item" value="${escapeHTML(item.description || "")}"><input aria-label="Quantity" class="item-quantity" type="number" min="0" step="0.1" value="${Number(item.quantity ?? 1)}"><input aria-label="Unit price" class="item-price" type="number" min="0" step="0.01" value="${Number(item.price ?? 0)}"><button type="button" class="remove-item" aria-label="Remove line item">×</button>`;
  row.querySelector(".remove-item").addEventListener("click", () => { if (itemHost.children.length > 1) row.remove(); else { row.querySelector(".item-description").value = ""; row.querySelector(".item-quantity").value = "1"; row.querySelector(".item-price").value = "0"; } render(); });
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
  return { id: currentDraftId, business: value("business"), client: value("client"), number: value("number"), currency: value("currency"), date: value("date"), due: value("due"), discount: num("discount"), tax: num("tax"), notes: value("notes"), items: readItems() };
}
function render() {
  const data = getData(), currency = data.currency;
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = subtotal * Math.min(100, data.discount) / 100;
  const tax = (subtotal - discount) * Math.min(100, data.tax) / 100;
  const total = subtotal - discount + tax;
  const text = (id, content) => { const node = document.getElementById(id); if (node) node.textContent = content || "—"; };
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
  const tbody = document.querySelector("#preview-items");
  tbody.replaceChildren();
  data.items.forEach((item) => {
    const tr = document.createElement("tr");
    [item.description || "Service or product", String(item.quantity), money(item.price, currency), money(item.quantity * item.price, currency)].forEach((content) => { const td = document.createElement("td"); td.textContent = content; tr.append(td); });
    tbody.append(tr);
  });
  if (!data.items.length) { const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 4; td.textContent = "Add a line item"; tr.append(td); tbody.append(tr); }
}
function setData(data) {
  currentDraftId = data.id || null;
  for (const name of ["business","client","number","currency","date","due","discount","tax","notes"]) if (data[name] !== undefined && form.elements.namedItem(name)) form.elements.namedItem(name).value = data[name];
  itemHost.replaceChildren();
  (data.items?.length ? data.items : [{}]).forEach(addLineItem);
  render();
}
function renderDrafts() {
  const drafts = getDrafts(); savedHost.replaceChildren();
  if (!drafts.length) { const p = document.createElement("p"); p.className = "muted-copy"; p.textContent = "No saved drafts yet."; savedHost.append(p); return; }
  drafts.forEach((draft) => {
    const row = document.createElement("div"); row.className = "draft-row";
    const info = document.createElement("div"); const title = document.createElement("strong"); title.textContent = draft.number || "Untitled invoice";
    const sub = document.createElement("small"); sub.textContent = `${draft.client || "No client"} · ${new Date(draft.updatedAt).toLocaleDateString()}`; info.append(title, sub);
    const actions = document.createElement("div"); actions.className = "draft-actions";
    const load = document.createElement("button"); load.type = "button"; load.textContent = "Load"; load.addEventListener("click", () => { setData(draft); status.textContent = "Draft loaded."; });
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-draft"; remove.textContent = "Delete"; remove.addEventListener("click", () => { deleteDraft(draft.id); if (currentDraftId === draft.id) currentDraftId = null; renderDrafts(); status.textContent = "Draft deleted."; });
    actions.append(load, remove); row.append(info, actions); savedHost.append(row);
  });
}
form.addEventListener("input", render);
form.addEventListener("change", render);
document.querySelector("#add-item").addEventListener("click", () => { addLineItem(); render(); });
document.querySelector("#save-draft").addEventListener("click", () => {
  if (!value("number").trim()) { status.textContent = "Add an invoice number before saving."; form.elements.namedItem("number").focus(); return; }
  try { const saved = saveDraft(getData()); currentDraftId = saved.id; renderDrafts(); status.textContent = "Draft saved in this browser."; }
  catch { status.textContent = "Could not save. Check your browser storage settings."; }
});
document.querySelector("#print-invoice").addEventListener("click", () => { render(); window.print(); });
const today = new Date().toISOString().slice(0, 10);
form.elements.namedItem("date").value = today;
addLineItem();
render();
renderDrafts();