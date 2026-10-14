// Invoice workspace UX: section navigation, exclusive accordions, mobile edit/preview
// tabs, a sticky action bar that reflects the document, and a live totals summary.
// This module is presentation-only; it never changes invoice data or calculations.
import "./app.js";

const form = document.querySelector("#invoice-form");
const app = document.querySelector(".iv-app");
const preview = document.getElementById("invoice-preview");

if (form && app) {
  const sections = [...document.querySelectorAll(".iv-section[data-section]")];
  const navButtons = [...document.querySelectorAll("[data-goto]")];
  const prefersReduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const field = (name) => form.elements.namedItem(name)?.value || "";
  const text = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const meta = (id, value) => { const el = document.querySelector(`.iv-sum-meta[data-meta="${id}"]`); if (el) el.textContent = value; };

  const currencyOf = () => field("currency") || "USD";
  const fmt = (amount) => {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyOf(), currencyDisplay: "code" }).format(Number.isFinite(amount) ? amount : 0); }
    catch { return `${currencyOf()} ${(Number(amount) || 0).toFixed(2)}`; }
  };

  function totals() {
    const rows = [...document.querySelectorAll("#line-items .line-item-row")];
    const subtotal = rows.reduce((sum, row) => sum + (Number(row.querySelector(".item-quantity")?.value) || 0) * (Number(row.querySelector(".item-price")?.value) || 0), 0);
    const discountPct = Math.min(100, Number(field("discount")) || 0);
    const taxPct = Math.min(100, Number(field("tax")) || 0);
    const discount = subtotal * discountPct / 100;
    const tax = (subtotal - discount) * taxPct / 100;
    return { rows, subtotal, discount, tax, total: subtotal - discount + tax };
  }

  function setView(view) {
    app.dataset.view = view;
    document.querySelectorAll(".iv-tabs button").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.view === view)));
  }

  function setActive(id) {
    navButtons.forEach((button) => button.setAttribute("aria-current", String(button.dataset.goto === id)));
  }

  function openSection(id) {
    const section = sections.find((item) => item.dataset.section === id);
    if (!section) return null;
    section.open = true;
    setActive(id);
    return section;
  }

  function sync() {
    const { rows, subtotal, discount, tax, total } = totals();
    text("iv-sum-subtotal", fmt(subtotal));
    text("iv-sum-discount", "−" + fmt(discount));
    text("iv-sum-tax", fmt(tax));
    text("iv-sum-total", fmt(total));

    const number = field("number").trim() || "Untitled invoice";
    const client = field("client").trim();
    text("iv-doc-title", client ? `${number} · ${client}` : number);

    const status = field("status") || "draft";
    const chip = document.getElementById("iv-status");
    if (chip) { chip.textContent = status.charAt(0).toUpperCase() + status.slice(1); chip.dataset.status = status; }

    meta("document", field("number").trim());
    meta("business", [field("business").trim(), field("client").trim()].filter(Boolean).join(" → "));
    meta("items", rows.length ? `${rows.length} item${rows.length > 1 ? "s" : ""}` : "Empty");
    meta("totals", fmt(total));
    const logo = document.getElementById("preview-logo");
    meta("branding", logo && !logo.hidden ? "Logo added" : "Optional");
  }

  function syncSaved() {
    const count = document.querySelectorAll("#saved-drafts .draft-row").length;
    meta("saved", count ? `${count} saved` : "None yet");
  }

  // Exclusive accordion: opening one section keeps the workspace uncluttered.
  sections.forEach((section) => {
    section.addEventListener("toggle", () => {
      if (!section.open) return;
      sections.forEach((other) => { if (other !== section && other.open) other.open = false; });
      setActive(section.dataset.section);
    });
  });

  navButtons.forEach((button) => button.addEventListener("click", () => {
    setView("edit");
    const section = openSection(button.dataset.goto);
    if (section) section.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
  }));

  document.querySelectorAll(".iv-tabs button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

  form.addEventListener("input", sync);
  form.addEventListener("change", sync);

  // Drafts load / clear / delete mutate fields without firing input events.
  document.addEventListener("click", () => setTimeout(() => { sync(); syncSaved(); }, 0));
  document.addEventListener("parchxa:drafts", () => setTimeout(syncSaved, 0));

  // Mirror any programmatic re-render of the preview (draft load, share-link load).
  if (preview) new MutationObserver(sync).observe(preview, { subtree: true, childList: true, characterData: true, attributes: true });

  if (!sections.some((section) => section.open)) openSection("document");
  setView("edit");
  sync();
  syncSaved();
  setTimeout(() => { sync(); syncSaved(); }, 80);
}
