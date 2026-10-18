// Backwards-compatible view over the unified registry (js/registry.js).
//
// The registry is now the single source of truth. This module keeps the small shapes that older
// callers expect (`TOOLS`, `NAV`, `TOOL_CATEGORIES`, `CATEGORY_BY_HREF`, `matchTool`) while
// deriving every value from the registry, so nothing here can drift out of sync.
//
// Prefer importing from "./registry.js" directly in new code.

import { tools, CATEGORIES, toolByHref } from "./registry.js";

/** @typedef {{href:string,label:string,group:string,keywords:string,nav?:boolean,desc?:string}} Tool */

/** Hrefs shown in the top navigation, in order. */
export const NAV_HREFS = ["invoice.html", "quote.html", "directory.html", "calculators.html", "money.html", "trading.html", "chart.html", "terminal.html", "math.html", "student.html"];

/** Short labels for the top navigation. */
export const NAV_LABELS = {
  "invoice.html": "Invoice",
  "quote.html": "Quotation",
  "directory.html": "Directory",
  "calculators.html": "Freelance",
  "money.html": "Money",
  "trading.html": "Risk",
  "chart.html": "Charts",
  "terminal.html": "Terminal",
  "math.html": "Math",
  "student.html": "Student",
};

const APP_TOOLS = tools().filter((t) => t.type === "app" || t.type === "hub");

/** @type {Tool[]} */
export const TOOLS = APP_TOOLS.map((t) => ({
  href: t.href,
  label: t.title,
  group: (CATEGORIES.find((c) => c.id === t.category) || {}).name || "Tools",
  keywords: t.tags.join(" "),
  nav: NAV_HREFS.includes(t.href),
  desc: t.description,
}));

/** Navigation entries in order. */
export const NAV = NAV_HREFS.map((href) => [href, NAV_LABELS[href] || toolByHref(href)?.title || href]);

/** Simple fuzzy/substring match kept for legacy callers. */
export function matchTool(tool, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const haystack = `${tool.label} ${tool.group} ${tool.keywords} ${tool.desc || ""}`.toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/** Home/legacy category grouping, derived from the registry categories. */
export const TOOL_CATEGORIES = CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.name,
  blurb: cat.blurb,
  href: cat.href,
  hrefs: tools().filter((t) => t.category === cat.id && (t.type === "app" || t.type === "hub" || t.type === "calculator")).map((t) => t.href),
}));

/** Reverse lookup: page href → category id (covers every registered tool). */
export const CATEGORY_BY_HREF = Object.fromEntries(tools().map((t) => [t.href, t.category]));
