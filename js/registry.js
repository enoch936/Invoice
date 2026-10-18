// PARCHXA unified tool registry — the single source of truth for discovery.
//
// Everything that lists, links, searches or counts tools should read from here: the mega menu,
// the ⌘K palette, the directory page, category pages, the homepage and the tests all import this
// module. It is intentionally pure (no DOM, no fetch, no side effects) so generators and Node
// tests can use the exact same data the browser uses.
//
// `tools()` returns hub/app pages first, then the 68 catalog calculators, then the generated
// family pages (currency pairs, hourly-to-salary and per-coin profit). Variant pages carry
// `variant: true` and a `parent` hub so UIs can either list them flat or group them by family.

import { CALCULATORS, CATEGORIES as CALC_CATEGORIES, getCalculator } from "./calc/catalog.js";
import { APP_TOOLS } from "./data/app-tools.js";
import { CURRENCY_BY_CODE, COINS, convertPairs, salaryPages } from "./data/tool-families.js";

/** Category metadata, in display order. `id` matches the calculator catalog ids. */
export const CATEGORIES = CALC_CATEGORIES.map((c) => ({
  id: c.id,
  href: `category-${c.id}.html`,
  name: c.name,
  blurb: c.blurb,
  keywords: c.id === "general"
    ? ["converters", "units", "dates", "health", "everyday"]
    : c.name.toLowerCase().split(/[^a-z]+/).filter(Boolean),
}));

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id) {
  return CATEGORY_BY_ID[id] || null;
}

/** Family hubs for the generated variant pages. */
export const FAMILIES = [
  { id: "convert", href: "convert.html", name: "Currency converters", unit: "pair" },
  { id: "rates", href: "rates.html", name: "Hourly to salary", unit: "currency" },
  { id: "crypto-profit", href: "profit.html", name: "Coin profit calculators", unit: "coin" },
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

// ---------------------------------------------------------------- entries
function fromCalculator(calc) {
  return {
    id: calc.slug,
    href: `${calc.slug}.html`,
    title: calc.title,
    h1: calc.h1,
    type: "calculator",
    category: calc.category,
    categories: [calc.category],
    description: calc.description || "",
    tags: Array.isArray(calc.tags) ? calc.tags.slice() : [],
    variant: false,
    family: null,
    parent: null,
  };
}

function fromApp(tool) {
  return {
    id: tool.id,
    href: tool.href,
    title: tool.title,
    h1: tool.h1,
    type: tool.type,
    category: tool.category,
    categories: [tool.category],
    description: tool.description || "",
    tags: Array.isArray(tool.tags) ? tool.tags.slice() : [],
    featured: !!tool.featured,
    popular: !!tool.popular,
    variant: false,
    family: null,
    parent: null,
  };
}

function currencyPair(from, to, href) {
  const a = CURRENCY_BY_CODE[from];
  const b = CURRENCY_BY_CODE[to];
  return {
    id: `convert-${from.toLowerCase()}-to-${to.toLowerCase()}`,
    href,
    title: `${from} to ${to} converter`,
    h1: `${from} to ${to} currency converter`,
    type: "currency-pair",
    category: "general",
    categories: ["general"],
    description: `Convert ${a ? a.name : from} (${from}) to ${b ? b.name : to} (${to}) with an indicative mid-market rate and a quick-amount table.`,
    tags: [from, to, "convert", "currency", "exchange rate", a ? a.name : from, b ? b.name : to],
    variant: true,
    family: "convert",
    parent: "convert.html",
  };
}

function salaryEntry(code, href) {
  const c = CURRENCY_BY_CODE[code];
  return {
    id: `rates-${code.toLowerCase()}-hourly-to-salary`,
    href,
    title: `${code} hourly to salary`,
    h1: `${code} hourly to salary calculator`,
    type: "salary",
    category: "finance",
    categories: ["finance"],
    description: `Convert an hourly rate in ${c ? c.name : code} (${code}) to weekly, monthly and annual pay.`,
    tags: [code, "hourly", "salary", "wage", "annual pay", "income", c ? c.name : code],
    variant: true,
    family: "rates",
    parent: "rates.html",
  };
}

function coinEntry(coin, href) {
  return {
    id: `profit-${coin.slug}`,
    href,
    title: `${coin.name} profit calculator`,
    h1: `${coin.name} (${coin.symbol}) profit calculator`,
    type: "crypto",
    category: "trading",
    categories: ["trading"],
    description: `Work out your ${coin.name} (${coin.symbol}) profit or loss in USD, including fees, return percentage and break-even price.`,
    tags: [coin.name, coin.symbol, "profit", "crypto", "break-even", "fees", "roi"],
    variant: true,
    family: "crypto-profit",
    parent: "profit.html",
  };
}

function stripHash(href) {
  return String(href).split("#")[0];
}

const _tools = [
  ...APP_TOOLS.map(fromApp),
  ...CALCULATORS.map(fromCalculator),
  ...convertPairs().map((p) => currencyPair(p.from, p.to, p.href)),
  ...salaryPages().map((s) => salaryEntry(s.code, s.href)),
  ...COINS.map((c) => coinEntry(c, `profit-${c.slug}.html`)),
];

/** All tools, in canonical order. */
export function tools() {
  return _tools;
}

export const ALL_TOOLS = _tools;

const BY_ID = Object.fromEntries(_tools.map((t) => [t.id, t]));
const BY_HREF = Object.fromEntries(_tools.map((t) => [normalizeHref(t.href), t]));

export function normalizeHref(href) {
  return String(href || "").trim().replace(/^\.\//, "").replace(/^\/+/, "").toLowerCase();
}

export function toolById(id) {
  return BY_ID[id] || null;
}

export function toolByHref(href) {
  return BY_HREF[normalizeHref(stripHash(href))] || null;
}

export function toolsInCategory(categoryId) {
  return _tools.filter((t) => t.category === categoryId);
}

export function toolsOfType(type) {
  return _tools.filter((t) => t.type === type);
}

export function featuredTools() {
  return _tools.filter((t) => t.featured);
}

export function popularTools() {
  return _tools.filter((t) => t.popular);
}

export function toolsInFamily(familyId) {
  return _tools.filter((t) => t.family === familyId);
}

/** Hrefs of the curated featured tools (used by the homepage and generators). */
export const FEATURED_HREFS = _tools.filter((t) => t.featured).map((t) => t.href);

/** Counts used by the homepage, directory header and tests. */
export function counts() {
  const byCategory = {};
  const byType = {};
  const byFamily = {};
  for (const t of _tools) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    byType[t.type] = (byType[t.type] || 0) + 1;
    if (t.family) byFamily[t.family] = (byFamily[t.family] || 0) + 1;
  }
  return {
    total: _tools.length,
    calculators: CALCULATORS.length,
    apps: APP_TOOLS.length,
    variants: _tools.filter((t) => t.variant).length,
    byCategory,
    byType,
    byFamily,
  };
}

// ---------------------------------------------------------------- search
function haystack(entry) {
  if (!entry._hay) {
    entry._hay = {
      title: entry.title.toLowerCase(),
      id: entry.id.toLowerCase(),
      href: entry.href.toLowerCase(),
      category: (getCategory(entry.category) || {}).name || "",
      tags: entry.tags.map((t) => String(t).toLowerCase()),
      description: (entry.description || "").toLowerCase(),
    };
  }
  return entry._hay;
}

function scoreEntry(entry, query, tokens) {
  const h = haystack(entry);
  for (const tok of tokens) {
    if (!(
      h.title.includes(tok) ||
      h.id.includes(tok) ||
      h.href.includes(tok) ||
      h.category.toLowerCase().includes(tok) ||
      h.description.includes(tok) ||
      h.tags.some((t) => t.includes(tok))
    )) return -1;
  }
  let score = 0;
  if (h.title === query) score += 100;
  else if (h.title.startsWith(query)) score += 80;
  else if (h.title.includes(query)) score += 60;
  if (h.id === query || h.href === query || h.href === `${query}.html`) score += 90;
  else if (h.id.includes(query) || h.href.includes(query)) score += 45;
  for (const t of h.tags) {
    if (t === query) score += 50;
    else if (t.startsWith(query)) score += 35;
    else if (t.includes(query)) score += 20;
  }
  if (h.description.includes(query)) score += 15;
  if (h.category.toLowerCase().includes(query)) score += 10;
  // Multi-word queries like "usd eur" should surface the exact variant slug ("usd-to-eur").
  if (tokens.length > 1) {
    const dashed = tokens.join("-");
    const joined = tokens.join("");
    const paired = tokens.length === 2 ? `${tokens[0]}-to-${tokens[1]}` : "";
    if ((paired && (h.href.includes(paired) || h.id.includes(paired))) || h.href.includes(dashed) || h.id.includes(dashed) || h.href.includes(joined) || h.id.includes(joined)) score += 70;
  }
  if (entry.featured) score += 4;
  if (entry.popular) score += 3;
  if (entry.variant) score -= 2;
  return score;
}

/**
 * Ranked tool search shared by every search surface.
 * @param {string} query
 * @param {{category?:string,type?:string,family?:string,limit?:number,includeVariants?:boolean}} [options]
 * @returns {import("./registry.js").Tool[]}
 */
export function searchTools(query, options = {}) {
  const raw = String(query || "").trim().toLowerCase();
  const tokens = raw.split(/\s+/).filter(Boolean);
  const pool = _tools.filter((t) => {
    if (options.category && t.category !== options.category) return false;
    if (options.type && t.type !== options.type) return false;
    if (options.family && t.family !== options.family) return false;
    if (options.includeVariants === false && t.variant) return false;
    return true;
  });
  if (!tokens.length) {
    const ordered = pool.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || a.title.localeCompare(b.title));
    return typeof options.limit === "number" ? ordered.slice(0, options.limit) : ordered;
  }
  const scored = [];
  for (const entry of pool) {
    const s = scoreEntry(entry, raw, tokens);
    if (s >= 0) scored.push({ entry, s });
  }
  scored.sort((a, b) => b.s - a.s || a.entry.title.length - b.entry.title.length || a.entry.title.localeCompare(b.entry.title));
  const out = scored.map((x) => x.entry);
  return typeof options.limit === "number" ? out.slice(0, options.limit) : out;
}

/**
 * Related tools for a detail page: the record's own relations plus same-category peers, and for
 * variants the rest of the family and its hub.
 * @returns {import("./registry.js").Tool[]}
 */
export function relatedTools(entryOrHref, limit = 6) {
  const entry = typeof entryOrHref === "string" ? toolByHref(entryOrHref) : entryOrHref;
  if (!entry) return [];
  const out = [];
  const push = (t) => { if (t && t.id !== entry.id && !out.some((x) => x.id === t.id)) out.push(t); };
  if (entry.variant && entry.family) {
    push(toolByHref(entry.parent));
    for (const t of toolsInFamily(entry.family)) push(t);
  }
  const calc = entry.type === "calculator" ? getCalculator(entry.id) : null;
  if (calc && Array.isArray(calc.related)) {
    for (const rel of calc.related) push(toolById(rel) || toolByHref(rel));
  }
  for (const t of toolsInCategory(entry.category)) push(t);
  return out.slice(0, limit);
}

// ---------------------------------------------------------------- validation
/**
 * Integrity checks shared by `tests/registry.test.mjs` and `tools/verify.mjs`.
 * @param {(href:string)=>boolean} [fileExists] optional filesystem probe
 * @returns {string[]} problems (empty when the registry is consistent)
 */
export function validateRegistry(fileExists) {
  const problems = [];
  const seenId = new Set();
  const seenHref = new Set();
  const validCategories = new Set(CATEGORY_IDS);
  for (const t of _tools) {
    if (seenId.has(t.id)) problems.push(`duplicate tool id: ${t.id}`);
    seenId.add(t.id);
    const href = normalizeHref(t.href);
    if (seenHref.has(href)) problems.push(`duplicate tool href: ${t.href}`);
    seenHref.add(href);
    if (!validCategories.has(t.category)) problems.push(`${t.id}: unknown category "${t.category}"`);
    if (!t.title) problems.push(`${t.id}: missing title`);
    if (!t.description) problems.push(`${t.id}: missing description`);
    if (t.variant && !t.parent) problems.push(`${t.id}: variant without a parent hub`);
    if (t.parent && !toolByHref(t.parent)) problems.push(`${t.id}: parent hub "${t.parent}" is not a registered tool`);
    if (t.family && !FAMILY_BY_ID[t.family]) problems.push(`${t.id}: unknown family "${t.family}"`);
    if (typeof fileExists === "function" && !fileExists(t.href)) problems.push(`${t.id}: page ${t.href} does not exist`);
  }
  for (const c of CATEGORIES) {
    if (!toolsInCategory(c.id).length) problems.push(`category "${c.id}" has no tools`);
  }
  for (const f of FAMILIES) {
    if (!toolsInFamily(f.id).length) problems.push(`family "${f.id}" has no tools`);
    if (!toolByHref(f.href)) problems.push(`family "${f.id}" hub ${f.href} is not a registered tool`);
  }
  return problems;
}
