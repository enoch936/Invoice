// PARCHXA command palette (⌘K / Ctrl-K). Keyboard-first navigation across every registered tool
// plus quick actions. Dependency-free, injected into the page by js/site.js.
//
// Results come from the shared registry search (js/registry.js), so the palette finds the same
// tools — calculators, apps and generated family pages — as the header, homepage and directory.
// Respects prefers-reduced-motion for its animations via CSS.
import { searchTools, popularTools, getCategory, tools as allTools } from "./registry.js";
import { directoryHref } from "./search.js";
import { toggleTheme } from "./theme.js";

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...kids);
  return node;
};

async function copyLink() {
  try { await navigator.clipboard.writeText(location.href); } catch { /* ignore */ }
}

function clearData() {
  if (!confirm("Delete all saved drafts and settings stored by PARCHXA in this browser?")) return;
  try { Object.keys(localStorage).filter((k) => k.startsWith("parchxa.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  location.reload();
}

const ACTIONS = [
  { id: "act:theme", label: "Toggle light / dark theme", hint: "Appearance", keywords: "theme dark light mode", run: toggleTheme },
  { id: "act:directory", label: "Browse the full directory", hint: "Directory", keywords: "directory all tools browse index", run: () => { location.href = "directory.html"; } },
  { id: "act:top", label: "Scroll to top", hint: "Action", keywords: "top up scroll", run: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
  { id: "act:share", label: "Copy this page link", hint: "Share", keywords: "share copy link url", run: copyLink },
  { id: "act:data", label: "Clear my saved data", hint: "Privacy", keywords: "clear delete data localstorage reset", run: clearData },
  { id: "act:privacy", label: "Privacy notice", hint: "Legal", keywords: "privacy consent cookies gdpr", run: () => { location.href = "privacy.html"; } },
  { id: "act:terms", label: "Terms of use", hint: "Legal", keywords: "terms legal disclaimer", run: () => { location.href = "terms.html"; } },
];

function toolCommand(t) {
  return {
    id: `tool:${t.id}`,
    label: t.title,
    hint: (getCategory(t.category) || {}).name || t.type,
    keywords: `${t.tags.join(" ")} ${t.description}`,
    run: () => { location.href = t.href; },
  };
}

function defaultCommands() {
  const seen = new Set();
  const picks = [];
  for (const t of [...popularTools(), ...allTools()]) {
    if (seen.has(t.id) || picks.length >= 10) continue;
    seen.add(t.id);
    picks.push(toolCommand(t));
  }
  return [...picks, ...ACTIONS.slice(0, 4)];
}

function matches(command, q) {
  const hay = `${command.label} ${command.hint} ${command.keywords}`.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
}

export function initCommandPalette() {
  if (document.querySelector(".cmdk")) return;
  let filtered = defaultCommands();
  let active = 0;

  // No placeholder text by design — the palette is labelled and the hint chip shows the shortcut.
  const input = el("input", { type: "text", class: "cmdk-input", role: "combobox", "aria-expanded": "true", "aria-controls": "cmdk-list", "aria-label": "Search tools and actions", autocomplete: "off", spellcheck: "false" });
  const list = el("ul", { id: "cmdk-list", class: "cmdk-list", role: "listbox" });
  const dialog = el("div", { class: "cmdk", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", hidden: true },
    el("div", { class: "cmdk-panel" },
      el("div", { class: "cmdk-search" }, el("span", { class: "cmdk-hint", "aria-hidden": "true", text: "⌘K" }), input),
      list,
      el("p", { class: "cmdk-foot", text: "↑↓ to move · Enter to open · Esc to close" })));

  function render() {
    list.replaceChildren();
    filtered.forEach((cmd, i) => {
      const li = el("li", { role: "option", "aria-selected": String(i === active), class: "cmdk-item" + (i === active ? " is-active" : ""), id: `cmdk-${cmd.id.replace(/[^\w-]/g, "-")}` },
        el("span", { class: "cmdk-label", text: cmd.label }),
        el("span", { class: "cmdk-hint", text: cmd.hint }));
      li.addEventListener("mousedown", (e) => { e.preventDefault(); run(cmd); });
      li.addEventListener("mousemove", () => { if (active !== i) { active = i; render(); } });
      list.append(li);
    });
    if (!filtered.length) list.append(el("li", { class: "cmdk-empty", text: "No matching tools or actions" }));
    const activeNode = list.querySelector(".is-active");
    if (activeNode) activeNode.scrollIntoView({ block: "nearest" });
  }

  function run(cmd) { close(); try { cmd.run(); } catch { /* ignore */ } }

  function filter(q) {
    const query = String(q || "").trim();
    if (!query) filtered = defaultCommands();
    else {
      const hits = searchTools(query, { limit: 12 }).map(toolCommand);
      const actions = ACTIONS.filter((a) => matches(a, query.toLowerCase()));
      filtered = [...hits, ...actions, {
        id: "act:seeall",
        label: `See all results for “${query}”`,
        hint: "Directory",
        keywords: "",
        run: () => { location.href = directoryHref(query); },
      }];
    }
    active = 0;
    render();
  }

  function open() {
    dialog.hidden = false;
    document.body.classList.add("cmdk-open");
    input.value = "";
    filter("");
    input.focus();
  }
  function close() {
    dialog.hidden = true;
    document.body.classList.remove("cmdk-open");
    input.blur();
  }
  function toggle() { dialog.hidden ? open() : close(); }

  input.addEventListener("input", () => filter(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(filtered.length - 1, active + 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); render(); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) run(filtered[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  });
  dialog.addEventListener("mousedown", (e) => { if (e.target === dialog) close(); });

  document.addEventListener("keydown", (e) => {
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); toggle(); }
    else if (e.key === "Escape" && !dialog.hidden) { close(); }
  });

  document.body.append(dialog);

  // Optional trigger button: <button data-cmdk>
  document.querySelectorAll("[data-cmdk]").forEach((btn) => btn.addEventListener("click", open));
}
