// PARCHXA calculator directory runtime.
//
// The directory page is server-rendered (every calculator is a real link in the HTML, for SEO and
// for no-JS visitors). This module adds client-side search, category filtering and a "recently
// used" strip driven by localStorage. On the home page it powers the quick search box.

import "../app.js";
import { getCalculator } from "./catalog.js";

const KEY_RECENT = "parchxa.calc.recent.v1";

function recentSlugs() {
  try { const v = JSON.parse(localStorage.getItem(KEY_RECENT) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

function makeCard(calc, { heading = 3 } = {}) {
  const card = document.createElement("a");
  card.className = "dir-card";
  card.href = `${calc.slug}.html`;
  const h = document.createElement("h" + heading);
  h.textContent = calc.title;
  const p = document.createElement("p");
  p.textContent = calc.description;
  const open = document.createElement("span");
  open.className = "dir-open";
  open.textContent = "Open calculator →";
  card.append(h, p, open);
  return card;
}

// ---------- home page: the search box is a plain GET form to the directory.
const homeForm = document.querySelector("[data-calc-search]");
if (homeForm) {
  homeForm.addEventListener("submit", (event) => {
    const input = homeForm.querySelector("input[name='q']");
    if (!input || !input.value.trim()) { event.preventDefault(); if (input) input.focus(); }
  });
}

// ---------- directory filtering + recently used
const cards = Array.from(document.querySelectorAll("[data-calc-card]"));
if (cards.length) {
  const search = document.getElementById("dir-search");
  const chips = Array.from(document.querySelectorAll(".dir-chip"));
  const countEl = document.getElementById("dir-count");
  const sections = Array.from(document.querySelectorAll("[data-dir-section]"));

  const params = new URLSearchParams(location.search);
  if (search && params.get("q")) search.value = params.get("q");
  const initialCat = params.get("category");
  if (initialCat) {
    const chip = chips.find((c) => c.dataset.category === initialCat);
    if (chip) { for (const c of chips) c.setAttribute("aria-pressed", "false"); chip.setAttribute("aria-pressed", "true"); }
  }

  function activeCategory() {
    const on = chips.find((c) => c.getAttribute("aria-pressed") === "true");
    return on ? on.dataset.category : "all";
  }

  function apply() {
    const q = (search?.value || "").trim().toLowerCase();
    const cat = activeCategory();
    let shown = 0;
    for (const card of cards) {
      const hay = card.dataset.search || "";
      const show = (!q || hay.includes(q)) && (cat === "all" || card.dataset.category === cat);
      card.hidden = !show;
      if (show) shown++;
    }
    for (const section of sections) {
      const any = Array.from(section.querySelectorAll("[data-calc-card]")).some((c) => !c.hidden);
      section.hidden = !any;
    }
    if (countEl) countEl.textContent = `${shown} calculator${shown === 1 ? "" : "s"}`;
  }

  if (search) search.addEventListener("input", apply);
  for (const chip of chips) chip.addEventListener("click", () => {
    for (const c of chips) c.setAttribute("aria-pressed", "false");
    chip.setAttribute("aria-pressed", "true");
    apply();
  });

  // recently used strip (nice-to-have; hidden entirely when there is no history)
  const recent = recentSlugs().map(getCalculator).filter(Boolean);
  const host = document.querySelector("[data-recent-calcs]");
  if (host && recent.length) {
    const section = document.createElement("section");
    section.className = "dir-section";
    section.dataset.dirSection = "";
    const h = document.createElement("h2");
    h.textContent = "Recently used";
    const p = document.createElement("p");
    p.textContent = "Your most recent calculators — kept only in this browser.";
    const grid = document.createElement("div");
    grid.className = "dir-grid";
    for (const calc of recent.slice(0, 6)) grid.append(makeCard(calc));
    section.append(h, p, grid);
    host.replaceChildren(section);
  }

  apply();
}
