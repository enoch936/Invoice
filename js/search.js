// PARCHXA shared search behaviour.
//
// Every search box on the site (header, homepage, directory, category pages, ⌘K palette) is wired
// through `createSearch` so the ranking, keyboard handling and "see all results" behaviour can
// never drift apart. Layout and styling come from CSS; this module only owns behaviour.
//
// Per the product rules, search inputs must not use placeholder text — each input needs a visible
// or accessible label instead. Callers pass the input element they already labelled.

import { searchTools, getCategory } from "./registry.js";

const DIRECTORY_HREF = "directory.html";

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Build the "see all results" link for a query. */
export function directoryHref(query, extra = {}) {
  const params = new URLSearchParams();
  const q = String(query || "").trim();
  if (q) params.set("q", q);
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `${DIRECTORY_HREF}?${s}` : DIRECTORY_HREF;
}

/**
 * Wire a search input to a results panel.
 * @param {{input:HTMLInputElement, panel:HTMLElement, limit?:number, emptyMessage?:string, onSelect?:(tool)=>void}} opts
 */
export function createSearch(opts) {
  const { input, panel } = opts || {};
  if (!input || !panel) return null;
  const limit = opts.limit || 8;
  const emptyMessage = opts.emptyMessage || "No tools match that search yet.";

  let results = [];
  let active = -1;
  let open = false;

  const idBase = input.id || "search";
  panel.setAttribute("role", "listbox");
  panel.id = panel.id || `${idBase}-results`;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", panel.id);
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");

  function itemHtml(tool, i) {
    const cat = getCategory(tool.category);
    return `<a class="search-hit${i === active ? " is-active" : ""}" id="${idBase}-opt-${i}" role="option" aria-selected="${i === active}" href="${escapeHtml(tool.href)}" data-index="${i}">
      <span class="search-hit-main"><strong>${escapeHtml(tool.title)}</strong><span>${escapeHtml(tool.description)}</span></span>
      <span class="search-hit-cat">${escapeHtml(cat ? cat.name : tool.type)}</span>
    </a>`;
  }

  function render(query) {
    results = searchTools(query, { limit });
    if (!results.length) {
      panel.innerHTML = `<p class="search-empty">${escapeHtml(emptyMessage)}</p>`;
      active = -1;
      return;
    }
    const head = query.trim() ? `<p class="search-heading">${results.length >= limit ? `Top ${limit}` : results.length} match${results.length === 1 ? "" : "es"}</p>` : `<p class="search-heading">Popular tools</p>`;
    const list = results.map(itemHtml).join("");
    const all = `<a class="search-all" href="${escapeHtml(directoryHref(query))}">See all results${query.trim() ? ` for “${escapeHtml(query.trim())}”` : ""} →</a>`;
    panel.innerHTML = head + list + all;
  }

  function setActive(next) {
    if (!results.length) return;
    active = (next + results.length) % results.length;
    for (const node of panel.querySelectorAll(".search-hit")) {
      const isActive = Number(node.dataset.index) === active;
      node.classList.toggle("is-active", isActive);
      node.setAttribute("aria-selected", String(isActive));
    }
    const node = panel.querySelector(`#${idBase}-opt-${active}`);
    if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
  }

  function show() {
    if (open) return;
    open = true;
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function hide() {
    open = false;
    active = -1;
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function refresh() {
    render(input.value);
    show();
  }

  input.addEventListener("input", refresh);
  input.addEventListener("focus", refresh);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); show(); setActive(active + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); show(); setActive(active - 1); }
    else if (event.key === "Enter") {
      if (active >= 0 && results[active]) {
        event.preventDefault();
        if (opts.onSelect) { opts.onSelect(results[active]); hide(); }
        else location.href = results[active].href;
      } else {
        event.preventDefault();
        location.href = directoryHref(input.value);
      }
    } else if (event.key === "Escape") { hide(); input.blur(); }
  });

  panel.addEventListener("mousedown", (event) => {
    const hit = event.target.closest(".search-hit");
    if (hit && opts.onSelect) { event.preventDefault(); opts.onSelect(results[Number(hit.dataset.index)]); hide(); }
    if (event.target.closest("a")) setTimeout(hide, 0);
  });

  document.addEventListener("click", (event) => {
    if (!panel.contains(event.target) && event.target !== input) hide();
  });

  render("");
  hide();
  return { refresh, hide, results: () => results };
}

/** Parse the query string params the directory understands. */
export function readDirectoryParams(search = typeof location !== "undefined" ? location.search : "") {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") || "",
    category: params.get("category") || "",
    type: params.get("type") || "",
    view: params.get("view") || "",
  };
}

export const VIEW_MODES = ["grid", "list", "compact"];
export const VIEW_KEY = "parchxa.tools.view.v1";

export function readView(fallback = "grid") {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return VIEW_MODES.includes(v) ? v : fallback;
  } catch { return fallback; }
}

export function writeView(view) {
  try { localStorage.setItem(VIEW_KEY, VIEW_MODES.includes(view) ? view : "grid"); } catch {}
}
