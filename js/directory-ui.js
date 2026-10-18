// PARCHXA directory runtime — powers `directory.html` and every `category-<id>.html` page.
//
// The generated pages ship a static, crawlable list of every tool; this module layers the
// interactive experience on top (live search, category/type filters, sorting and view switching)
// using the shared registry, so the directory can never disagree with the rest of the site.
//
// Variant pages (currency pairs, hourly-to-salary, per-coin profit) are always counted and always
// searchable. In the default view they are folded into a single card per family so the directory
// does not become an endless wall of near-identical pages; expanding the card reveals them all.

import { tools, searchTools, counts, getCategory, CATEGORIES, FAMILY_BY_ID, CATEGORY_BY_ID } from "./registry.js";
import { readDirectoryParams, readView, writeView, VIEW_MODES, directoryHref } from "./search.js";

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  }
  node.append(...kids.filter((k) => k != null));
  return node;
};

const TYPE_LABELS = {
  calculator: "Calculator",
  app: "App",
  hub: "Hub",
  "currency-pair": "Currency pair",
  salary: "Hourly to salary",
  crypto: "Crypto profit",
};

const SORTS = {
  recommended: { label: "Recommended", compare: null },
  "az": { label: "A to Z", compare: (a, b) => a.title.localeCompare(b.title) },
  "za": { label: "Z to A", compare: (a, b) => b.title.localeCompare(a.title) },
  category: { label: "By category", compare: (a, b) => CATEGORIES.findIndex((c) => c.id === a.category) - CATEGORIES.findIndex((c) => c.id === b.category) || a.title.localeCompare(b.title) },
};

const ROOT = document.querySelector("[data-dir-root]");

function init() {
  if (!ROOT) return;
  const fixedCategory = ROOT.dataset.dirCategory || "";
  const params = readDirectoryParams();
  const state = {
    q: params.q,
    category: fixedCategory || params.category,
    type: params.type,
    view: VIEW_MODES.includes(params.view) ? params.view : readView(),
    sort: "recommended",
  };

  const searchInput = ROOT.querySelector("[data-dir-search]");
  const resultsBox = ROOT.querySelector("[data-dir-results]");
  const countBox = ROOT.querySelector("[data-dir-count]");
  const staticBox = document.querySelector("[data-dir-static]");
  const chipsBox = ROOT.querySelector("[data-dir-chips]");
  const typeSelect = ROOT.querySelector("[data-dir-type]");
  const sortSelect = ROOT.querySelector("[data-dir-sort]");
  const viewButtons = Array.from(ROOT.querySelectorAll("[data-dir-view]"));

  if (searchInput) searchInput.value = state.q;
  if (typeSelect) typeSelect.value = state.type;
  if (staticBox) staticBox.hidden = true;

  // category chips (not shown on a fixed-category page)
  if (chipsBox && !fixedCategory) {
    const chip = (label, id) => el("button", {
      type: "button", class: "dir-chip", "aria-pressed": state.category === id ? "true" : "false",
      text: label, "data-cat": id,
      onclick: () => { state.category = id; update({ scroll: false }); },
    });
    chipsBox.append(chip(`All (${counts().total})`, ""));
    for (const c of CATEGORIES) chipsBox.append(chip(`${c.name} (${counts().byCategory[c.id] || 0})`, c.id));
  }

  function card(tool) {
    const cat = getCategory(tool.category);
    return el("article", { class: "dir-card", "data-type": tool.type },
      el("div", { class: "dir-card-tags" },
        el("span", { class: "dir-type", text: TYPE_LABELS[tool.type] || tool.type }),
        cat && !fixedCategory ? el("a", { class: "dir-cat", href: cat.href, text: cat.name }) : null,
      ),
      el("h3", {}, el("a", { href: tool.href, text: tool.title })),
      el("p", { text: tool.description }),
      el("a", { class: "dir-open", href: tool.href, text: "Open tool →" }),
    );
  }

  function row(tool) {
    const cat = getCategory(tool.category);
    return el("a", { class: "dir-row", href: tool.href, "data-type": tool.type },
      el("span", { class: "dir-row-main" }, el("strong", { text: tool.title }), el("span", { text: tool.description })),
      el("span", { class: "dir-row-meta" }, el("span", { class: "dir-type", text: TYPE_LABELS[tool.type] || tool.type }), cat ? el("span", { text: cat.name }) : null),
    );
  }

  function familyCard(familyId, members) {
    const family = FAMILY_BY_ID[familyId];
    const hub = family ? family.href : members[0].parent;
    const details = el("details", { class: "dir-family" });
    details.append(
      el("summary", {},
        el("span", {}, el("strong", { text: family ? family.name : familyId }), el("span", { class: "dir-family-count", text: `${members.length} pages` })),
        el("span", { class: "dir-family-desc", text: members.slice(0, 6).map((m) => m.title.replace(/ (converter|calculator)$/i, "")).join(", ") + (members.length > 6 ? "…" : "") }),
      ),
      el("div", { class: "dir-family-body" }, members.map((m) => el("a", { href: m.href, text: m.title }))),
      el("a", { class: "dir-family-hub", href: hub, text: "Open the hub →" }),
    );
    return details;
  }

  function currentResults() {
    let list = state.q.trim() ? searchTools(state.q, { category: state.category || undefined, type: state.type || undefined }) : null;
    if (!list) {
      list = tools().filter((t) => (!state.category || t.category === state.category) && (!state.type || t.type === state.type));
    }
    const cmp = SORTS[state.sort].compare;
    if (cmp) list = list.slice().sort(cmp);
    return list;
  }

  function render() {
    const list = currentResults();
    if (countBox) {
      const label = state.q.trim()
        ? `${list.length} result${list.length === 1 ? "" : "s"} for “${state.q.trim()}”`
        : `${list.length} tool${list.length === 1 ? "" : "s"}${state.category ? ` in ${getCategory(state.category).name}` : ""}`;
      countBox.textContent = label;
    }
    resultsBox.className = `dir-results dir-results-${state.view}`;
    resultsBox.replaceChildren();
    if (!list.length) {
      resultsBox.append(el("div", { class: "dir-empty" },
        el("p", { text: "No tools match these filters." }),
        el("button", { type: "button", class: "button button-secondary button-small", text: "Clear filters", onclick: () => { state.q = ""; state.category = fixedCategory; state.type = ""; if (searchInput) searchInput.value = ""; if (typeSelect) typeSelect.value = ""; update({ scroll: false }); } }),
      ));
      return;
    }
    const useGroups = state.view === "grid" && !state.q.trim() && state.type !== "currency-pair" && state.type !== "salary" && state.type !== "crypto";
    if (useGroups) {
      const grouped = new Map();
      const flat = [];
      for (const t of list) {
        if (t.variant) {
          if (!grouped.has(t.family)) grouped.set(t.family, []);
          grouped.get(t.family).push(t);
        } else flat.push(t);
      }
      // Flat tools first, then one card per family. This mirrors the "Recommended" order
      // (hubs/apps, calculators, variants) and keeps counts honest via the family badge.
      const nodes = flat.map(card);
      for (const [familyId, members] of grouped) nodes.push(familyCard(familyId, members));
      resultsBox.append(...nodes);
    } else {
      resultsBox.append(...list.map((t) => (state.view === "grid" ? card(t) : row(t))));
    }
  }

  function syncChips() {
    if (!chipsBox) return;
    for (const node of chipsBox.querySelectorAll(".dir-chip")) {
      node.setAttribute("aria-pressed", node.dataset.cat === state.category ? "true" : "false");
    }
  }

  function update({ push = true, scroll = true } = {}) {
    if (push && typeof history !== "undefined" && !fixedCategory) {
      const extra = {};
      if (state.category) extra.category = state.category;
      if (state.type) extra.type = state.type;
      if (state.view !== "grid") extra.view = state.view;
      history.replaceState(null, "", directoryHref(state.q, extra));
    }
    syncChips();
    for (const b of viewButtons) b.setAttribute("aria-pressed", b.dataset.dirView === state.view ? "true" : "false");
    render();
    if (scroll) resultsBox.scrollIntoView({ block: "nearest" });
  }

  if (searchInput) {
    let raf = 0;
    searchInput.addEventListener("input", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; state.q = searchInput.value; update(); });
    });
    const form = searchInput.closest("form");
    if (form) form.addEventListener("submit", (e) => { e.preventDefault(); state.q = searchInput.value; update(); });
  }
  if (typeSelect) typeSelect.addEventListener("change", () => { state.type = typeSelect.value; update(); });
  if (sortSelect) sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; update(); });
  for (const b of viewButtons) b.addEventListener("click", () => { state.view = b.dataset.dirView; writeView(state.view); update(); });

  update({ push: false, scroll: false });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

export const _categoryById = CATEGORY_BY_ID;
