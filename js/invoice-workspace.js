// Invoice workspace UX: section navigation with completion state, exclusive accordions that keep your
// scroll position, mobile edit/preview tabs, a sticky action bar (document, status, total, save state),
// live inline validation, and Ctrl/Cmd+S. Presentation only: it never changes invoice data or maths.
import "./app.js";
import { validateField, validateRows, RULES } from "./invoice-validate.js";

const form = document.querySelector("#invoice-form");
const app = document.querySelector(".iv-app");
const preview = document.getElementById("invoice-preview");

if (form && app) {
  const itemHost = document.getElementById("line-items");
  const sections = [...document.querySelectorAll(".iv-section[data-section]")];
  const navButtons = [...document.querySelectorAll("[data-goto]")];
  const prefersReduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const field = (name) => form.elements.namedItem(name)?.value || "";
  const text = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const meta = (id, value) => { const el = document.querySelector(`.iv-sum-meta[data-meta="${id}"]`); if (el) el.textContent = value; };
  const touched = new Set();

  const currencyOf = () => field("currency") || "USD";
  const fmt = (amount) => {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyOf(), currencyDisplay: "code" }).format(Number.isFinite(amount) ? amount : 0); }
    catch { return `${currencyOf()} ${(Number(amount) || 0).toFixed(2)}`; }
  };

  function totals() {
    const rows = [...document.querySelectorAll("#line-items .line-item-row")];
    const subtotal = rows.reduce((sum, row) => sum + (Math.max(0, Number(row.querySelector(".item-quantity")?.value) || 0)) * (Math.max(0, Number(row.querySelector(".item-price")?.value) || 0)), 0);
    const discountPct = Math.min(100, Math.max(0, Number(field("discount")) || 0));
    const taxPct = Math.min(100, Math.max(0, Number(field("tax")) || 0));
    const discount = subtotal * discountPct / 100;
    const tax = (subtotal - discount) * taxPct / 100;
    return { rows, subtotal, discount, tax, total: subtotal - discount + tax };
  }

  function setView(view) {
    app.dataset.view = view;
    document.querySelectorAll(".iv-tabs button").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.view === view)));
  }
  function setActive(id) { navButtons.forEach((button) => { if (button.dataset.goto === id) button.setAttribute("aria-current", "true"); else button.removeAttribute("aria-current"); }); }
  function openSection(id) {
    const section = sections.find((item) => item.dataset.section === id);
    if (!section) return null;
    section.open = true;
    setActive(id);
    return section;
  }

  // ---- completion state shown beside each nav item (✓ done, ! needs attention, · to do) ----
  const NAV_STATES = { document: true, business: true, items: true, totals: true };
  navButtons.forEach((button) => {
    if (!NAV_STATES[button.dataset.goto]) return;
    const dot = document.createElement("span");
    dot.className = "iv-state"; dot.dataset.stateFor = button.dataset.goto; dot.dataset.state = "todo";
    const label = document.createElement("span"); label.className = "iv-sr"; dot.append(label);
    button.append(dot);
  });
  function sectionHasIssue(id) {
    return !!document.querySelector(`.iv-section[data-section="${id}"] [aria-invalid="true"]`);
  }
  function setState(id, state) {
    const dot = document.querySelector(`.iv-state[data-state-for="${id}"]`); if (!dot) return;
    dot.dataset.state = state;
    dot.firstElementChild.textContent = state === "done" ? "complete" : state === "issue" ? "needs attention" : "to do";
    const summary = document.querySelector(`.iv-section[data-section="${id}"] > summary`); if (summary) summary.dataset.state = state;
  }

  function sync() {
    const { rows, subtotal, discount, tax, total } = totals();
    text("iv-sum-subtotal", fmt(subtotal)); text("iv-sum-discount", "−" + fmt(discount)); text("iv-sum-tax", fmt(tax)); text("iv-sum-total", fmt(total));
    text("iv-head-total", fmt(total));

    const number = field("number").trim() || "Untitled invoice";
    const client = field("client").trim();
    text("iv-doc-title", client ? `${number} · ${client}` : number);

    const status = field("status") || "draft";
    const chip = document.getElementById("iv-status");
    if (chip) { chip.textContent = status.charAt(0).toUpperCase() + status.slice(1); chip.dataset.status = status; }

    meta("document", field("number").trim());
    meta("business", [field("business").trim(), field("client").trim()].filter(Boolean).join(" → "));
    const counted = rows.filter((row) => row.querySelector(".item-description")?.value.trim() || Number(row.querySelector(".item-price")?.value) > 0);
    meta("items", rows.length ? `${rows.length} item${rows.length > 1 ? "s" : ""}` : "Empty");
    meta("totals", fmt(total));
    const logo = document.getElementById("preview-logo");
    meta("branding", logo && !logo.hidden ? "Logo added" : "Optional");

    setState("document", sectionHasIssue("document") ? "issue" : field("number").trim() && field("date") ? "done" : "todo");
    setState("business", sectionHasIssue("business") ? "issue" : field("business").trim() && field("client").trim() ? "done" : "todo");
    setState("items", sectionHasIssue("items") ? "issue" : counted.length && subtotal > 0 ? "done" : "todo");
    setState("totals", sectionHasIssue("totals") ? "issue" : subtotal > 0 ? "done" : "todo");
  }

  function syncSaved() {
    const count = document.querySelectorAll("#saved-drafts .draft-row").length;
    meta("saved", count ? `${count} saved` : "None yet");
  }

  // ---- save / unsaved state in the action bar ----
  const saveState = document.getElementById("iv-save-state");
  function paintSave(state, at) {
    if (!saveState) return;
    saveState.dataset.state = state;
    const time = at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    saveState.textContent = state === "dirty" ? "Unsaved changes" : state === "saved" ? `Saved ${time}` : state === "loaded" ? "Draft opened" : "Not saved yet";
  }
  paintSave("new");
  document.addEventListener("parchxa:invoice", (event) => {
    const { type, at } = event.detail || {};
    if (type === "dirty") paintSave("dirty");
    else if (type === "saved") paintSave("saved", at || Date.now());
    else if (type === "loaded") paintSave("loaded");
    else if (type === "cleared") { touched.clear(); paintSave("new"); }
    setTimeout(sync, 0);
  });
  document.addEventListener("parchxa:focus-issue", (event) => { const id = event.detail?.section; if (id) { setView("edit"); openSection(id); } });

  // ---- exclusive accordion that keeps the clicked header where it is ----
  let anchorTop = null;
  sections.forEach((section) => {
    section.querySelector(":scope > summary")?.addEventListener("click", () => { anchorTop = section.querySelector(":scope > summary").getBoundingClientRect().top; });
    section.addEventListener("toggle", () => {
      if (!section.open) return;
      sections.forEach((other) => { if (other !== section && other.open) other.open = false; });
      setActive(section.dataset.section);
      if (anchorTop !== null) {
        const delta = section.querySelector(":scope > summary").getBoundingClientRect().top - anchorTop;
        if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
        anchorTop = null;
      }
    });
  });

  navButtons.forEach((button) => button.addEventListener("click", () => {
    setView("edit");
    const section = openSection(button.dataset.goto);
    anchorTop = null;
    if (section) section.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
  }));
  document.querySelectorAll(".iv-tabs button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

  // ---- live validation: after a field has been visited, re-check as you type ----
  form.addEventListener("focusout", (event) => {
    const el = event.target; if (!el?.name && !el?.classList?.contains("item-quantity") && !el?.classList?.contains("item-price")) return;
    if (el.name && RULES[el.name]) { touched.add(el.name); validateField(form, el.name, true); if (el.name === "date") validateField(form, "due", touched.has("due")); }
    if (el.closest(".line-item-row")) validateRows(itemHost, true);
    sync();
  });
  form.addEventListener("input", (event) => {
    const el = event.target;
    if (el?.name && RULES[el.name] && (touched.has(el.name) || el.getAttribute("aria-invalid") === "true")) validateField(form, el.name, true);
    if (el?.closest?.(".line-item-row") && itemHost.querySelector(".iv-row-msg, [aria-invalid]")) validateRows(itemHost, true);
    sync();
  });
  form.addEventListener("change", sync);

  // Drafts load / delete mutate fields without input events.
  document.addEventListener("click", () => setTimeout(() => { sync(); syncSaved(); }, 0));
  document.addEventListener("parchxa:drafts", () => setTimeout(syncSaved, 0));
  if (preview) new MutationObserver(sync).observe(preview, { subtree: true, childList: true, characterData: true, attributes: true });

  // Ctrl/Cmd+S saves the draft.
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); document.getElementById("save-draft")?.click(); }
  });

  if (!sections.some((section) => section.open)) openSection("document");
  setView("edit");
  sync();
  syncSaved();
  setTimeout(() => { sync(); syncSaved(); }, 80);
}
