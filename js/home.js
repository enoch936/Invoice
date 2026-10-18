// Home page tool explorer.
//
// The homepage ships a small, crawlable set of featured cards; this module upgrades that section to
// live search + category filtering over the full registry (js/registry.js). If anything goes wrong
// the static cards remain visible and clickable — the page degrades gracefully.

import { featuredTools, popularTools, tools, searchTools, counts, getCategory } from "./registry.js";
import { iconSvg, hydrateIcons } from "./icons.js";

const ICONS = {
  invoice: "file-text", quote: "files", calculators: "calculator", directory: "search", money: "wallet",
  trading: "target", chart: "bar-chart", terminal: "monitor", math: "sigma", profit: "coins",
  convert: "repeat", rates: "banknote", student: "graduation-cap", memorial: "flame",
};
const CATEGORY_ICONS = { finance: "wallet", business: "calculator", monetization: "eye", trading: "trending-up", math: "sigma", general: "repeat" };

const iconFor = (tool) => ICONS[tool.id] || CATEGORY_ICONS[tool.category] || "search";

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (v != null && v !== false) node.setAttribute(k, v);
  }
  node.append(...kids.filter((k) => k != null));
  return node;
};

function card(tool) {
  const cat = getCategory(tool.category);
  return el("article", { class: "tool-card tool-card-link" },
    el("div", { class: "tool-icon", html: iconSvg(iconFor(tool), 20), "aria-hidden": "true" }),
    el("h3", { text: tool.title }),
    el("p", { text: tool.description }),
    el("a", { class: "text-link", href: tool.href },
      (cat ? `Open ${cat.name.toLowerCase()} tool` : "Open tool"), el("span", { "aria-hidden": "true", text: " →" })));
}

export function initHomeTools() {
  const search = document.querySelector("[data-tool-search]");
  if (!search) return;
  const results = document.querySelector("[data-home-results]");
  const chips = [...document.querySelectorAll("[data-filter]")];
  const result = document.querySelector("[data-tool-result]");
  let active = "all";

  // Refresh counts / totals from the registry so the copy cannot go stale.
  const stat = counts();
  document.querySelectorAll("[data-cat-count]").forEach((node) => {
    const n = stat.byCategory[node.dataset.catCount];
    if (n) node.textContent = `${n} tool${n === 1 ? "" : "s"}`;
  });
  document.querySelectorAll("[data-home-total]").forEach((node) => { node.textContent = String(stat.total); });

  if (!results) {
    // Static fallback: filter the pre-rendered cards in place.
    const cards = [...document.querySelectorAll("[data-tool-card]")];
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach((c) => {
        const okCat = active === "all" || c.dataset.category === active;
        const okQ = !q || (c.dataset.search || c.textContent).toLowerCase().includes(q);
        c.hidden = !(okCat && okQ);
        if (!c.hidden) visible++;
      });
      if (result) result.textContent = visible ? `${visible} tools shown` : "No tools match — try another word.";
    };
    chips.forEach((chip) => chip.addEventListener("click", () => {
      active = chip.dataset.filter || "all";
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      apply();
    }));
    search.addEventListener("input", apply);
    apply();
    return;
  }

  function current() {
    const q = search.value.trim();
    if (q) return searchTools(q, { category: active === "all" ? undefined : active, includeVariants: false, limit: 24 });
    if (active !== "all") return tools().filter((t) => t.category === active && t.type !== "currency-pair" && t.type !== "salary" && t.type !== "crypto").slice(0, 24);
    const seen = new Set();
    const picks = [];
    for (const t of [...featuredTools(), ...popularTools(), ...tools()]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      if (t.variant) continue;
      picks.push(t);
      if (picks.length >= 12) break;
    }
    return picks;
  }

  function render() {
    const list = current();
    results.replaceChildren(...list.map(card));
    hydrateIcons(results);
    if (result) {
      const cat = active === "all" ? "" : ` in ${(getCategory(active) || {}).name}`;
      result.textContent = list.length
        ? `${list.length} tool${list.length === 1 ? "" : "s"}${cat}${search.value.trim() ? ` matching “${search.value.trim()}”` : ""}`
        : "No tools match — try another word or browse the full directory.";
    }
  }

  chips.forEach((chip) => chip.addEventListener("click", () => {
    active = chip.dataset.filter || "all";
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    render();
  }));
  let raf = 0;
  search.addEventListener("input", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; render(); });
  });
  render();
}
