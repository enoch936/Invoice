// PARCHXA command palette (⌘K / Ctrl-K). Keyboard-first navigation across every tool plus quick actions.
// Dependency-free, injected into the page by js/site.js. Respects prefers-reduced-motion for its animations via CSS.
import { TOOLS, matchTool } from "./nav.js";

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

function buildCommands() {
  const tools = TOOLS.map((t) => ({
    id: `tool:${t.href}`,
    label: t.label,
    hint: t.group,
    keywords: `${t.keywords} ${t.desc || ""}`,
    run: () => { location.href = t.href; },
  }));
  const actions = [
    { id: "act:theme", label: "Toggle light / dark theme", hint: "Appearance", keywords: "theme dark light mode", run: toggleTheme },
    { id: "act:top", label: "Scroll to top", hint: "Action", keywords: "top up scroll", run: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { id: "act:share", label: "Copy this page link", hint: "Share", keywords: "share copy link url", run: copyLink },
    { id: "act:data", label: "Clear my saved data", hint: "Privacy", keywords: "clear delete data localstorage reset", run: clearData },
    { id: "act:privacy", label: "Privacy notice", hint: "Legal", keywords: "privacy consent cookies gdpr", run: () => { location.href = "privacy.html"; } },
    { id: "act:terms", label: "Terms of use", hint: "Legal", keywords: "terms legal disclaimer", run: () => { location.href = "terms.html"; } },
  ];
  return [...tools, ...actions];
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("parchxa.theme.v1", next); } catch { /* ignore */ }
  const btn = document.querySelector("#theme-toggle");
  if (btn) btn.textContent = next === "light" ? "Dark mode" : "Light mode";
}

async function copyLink() {
  try { await navigator.clipboard.writeText(location.href); } catch { /* ignore */ }
}

function clearData() {
  if (!confirm("Delete all saved drafts and settings stored by PARCHXA in this browser?")) return;
  try { Object.keys(localStorage).filter((k) => k.startsWith("parchxa.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  location.reload();
}

export function initCommandPalette() {
  if (document.querySelector(".cmdk")) return;
  const commands = buildCommands();
  let filtered = commands;
  let active = 0;

  const input = el("input", { type: "text", class: "cmdk-input", role: "combobox", "aria-expanded": "true", "aria-controls": "cmdk-list", placeholder: "Search tools and actions…", autocomplete: "off", spellcheck: "false" });
  const list = el("ul", { id: "cmdk-list", class: "cmdk-list", role: "listbox" });
  const dialog = el("div", { class: "cmdk", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", hidden: true },
    el("div", { class: "cmdk-panel" },
      el("div", { class: "cmdk-search" }, el("span", { class: "cmdk-hint", "aria-hidden": "true", text: "⌘K" }), input),
      list,
      el("p", { class: "cmdk-foot", text: "↑↓ to move · Enter to run · Esc to close" })));

  function render() {
    list.replaceChildren();
    filtered.forEach((cmd, i) => {
      const li = el("li", { role: "option", "aria-selected": String(i === active), class: "cmdk-item" + (i === active ? " is-active" : ""), id: `cmdk-${cmd.id}` },
        el("span", { class: "cmdk-label", text: cmd.label }),
        el("span", { class: "cmdk-hint", text: cmd.hint }));
      li.addEventListener("mousedown", (e) => { e.preventDefault(); run(cmd); });
      li.addEventListener("mousemove", () => { if (active !== i) { active = i; render(); } });
      list.append(li);
    });
    if (!filtered.length) list.append(el("li", { class: "cmdk-empty", text: "No matching commands" }));
    const activeNode = list.querySelector(".is-active");
    if (activeNode) activeNode.scrollIntoView({ block: "nearest" });
  }

  function run(cmd) { close(); try { cmd.run(); } catch { /* ignore */ } }

  function filter(q) {
    filtered = commands.filter((c) => matchTool({ label: c.label, group: c.hint, keywords: c.keywords, desc: "" }, q));
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
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.activeElement?.isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); toggle(); }
    else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && dialog.hidden) { e.preventDefault(); open(); }
    else if (e.key === "Escape" && !dialog.hidden) { close(); }
  });

  document.body.append(dialog);

  // Optional trigger button: <button data-cmdk>
  document.querySelectorAll("[data-cmdk]").forEach((btn) => btn.addEventListener("click", open));
}
