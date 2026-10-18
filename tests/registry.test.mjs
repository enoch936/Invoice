// PARCHXA tool-registry tests.
//
// Guards the single source of truth that drives the directory, category pages, mega menu,
// search and the sitemap. Run directly (node tests/registry.test.mjs) or via tools/verify.mjs.

import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CATEGORIES,
  CATEGORY_IDS,
  FAMILIES,
  ALL_TOOLS,
  counts,
  getCategory,
  normalizeHref,
  relatedTools,
  searchTools,
  toolByHref,
  toolById,
  tools,
  toolsInCategory,
  toolsInFamily,
  validateRegistry,
} from "../js/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (cond, label = "") => { assert.ok(cond, label); passed++; };

const fileExists = (href) => existsSync(join(ROOT, normalizeHref(href)));

// ---------------------------------------------------------------- shape and counts
ok(Array.isArray(ALL_TOOLS) && ALL_TOOLS.length > 0, "registry exposes tools");
ok(tools() === ALL_TOOLS, "tools() returns the canonical array");
ok(CATEGORY_IDS.length === 6, "six canonical categories");
ok(CATEGORIES.every((c) => CATEGORY_IDS.includes(c.id)), "category ids are stable");
ok(FAMILIES.length >= 3, "families are declared");

const stat = counts();
ok(stat.total === ALL_TOOLS.length, "counts().total matches the registry");
ok(stat.calculators === 68, `68 calculators (got ${stat.calculators})`);
ok(stat.apps === 14, `14 apps/hubs (got ${stat.apps})`);
ok(stat.variants === 79, `79 variant pages (got ${stat.variants})`);
ok(stat.total === stat.calculators + stat.apps + stat.variants, "types sum to the total");
ok(Object.keys(stat.byCategory).every((id) => CATEGORY_IDS.includes(id)), "counts only use known categories");
ok(Object.values(stat.byCategory).reduce((a, b) => a + b, 0) === stat.total, "category counts sum to the total");

// ---------------------------------------------------------------- integrity
const problems = validateRegistry(fileExists);
ok(problems.length === 0, `registry is consistent: ${problems.join("; ")}`);

for (const t of ALL_TOOLS) {
  ok(typeof t.id === "string" && t.id.length > 0, `tool has an id: ${t.href}`);
  ok(typeof t.title === "string" && t.title.length > 0, `${t.id} has a title`);
  ok(typeof t.description === "string" && t.description.length > 0, `${t.id} has a description`);
  ok(Array.isArray(t.tags) && t.tags.length > 0, `${t.id} has keywords`);
  ok(["calculator", "app", "hub", "currency-pair", "salary", "crypto"].includes(t.type), `${t.id} has a known type`);
  ok(fileExists(t.href), `${t.id} page ${t.href} exists`);
  ok(toolByHref(t.href) === t, `${t.id} is reachable by href`);
  ok(toolById(t.id) === t, `${t.id} is reachable by id`);
}

// ---------------------------------------------------------------- no orphan tool pages
const NAV_PAGES = new Set(["index.html", "privacy.html", "terms.html", "offline.html", "404.html", ...CATEGORIES.map((c) => c.href)]);
const orphanPages = readdirSync(ROOT)
  .filter((f) => f.endsWith(".html") && !NAV_PAGES.has(f) && !toolByHref(f))
  .sort();
ok(orphanPages.length === 0, `every tool page is registered: ${orphanPages.join(", ")}`);

// ---------------------------------------------------------------- categories and families
for (const c of CATEGORIES) {
  const list = toolsInCategory(c.id);
  ok(list.length > 0, `category ${c.id} is not empty`);
  ok(list.every((t) => t.category === c.id), `category ${c.id} is coherent`);
  ok(getCategory(c.id) === c, `getCategory(${c.id}) resolves`);
}
for (const f of FAMILIES) {
  const list = toolsInFamily(f.id);
  ok(list.length > 0, `family ${f.id} is not empty`);
  ok(list.every((t) => t.family === f.id), `family ${f.id} is coherent`);
}

// ---------------------------------------------------------------- variants
const variantHrefs = [...toolsInFamily("convert"), ...toolsInFamily("rates"), ...toolsInFamily("crypto-profit")].map((t) => t.href);
ok(variantHrefs.includes("convert-usd-to-eur.html"), "currency pair variant registered");
ok(variantHrefs.includes("rates-etb-hourly-to-salary.html"), "salary variant registered");
ok(variantHrefs.includes("profit-bitcoin.html"), "coin variant registered");
ok(ALL_TOOLS.filter((t) => t.variant).every((t) => t.parent && toolByHref(t.parent)), "every variant links to a real hub");

// ---------------------------------------------------------------- search ranking
const first = (q, opts) => (searchTools(q, opts)[0] || {}).href;
ok(first("loan").startsWith("loan-"), `"loan" ranks a loan tool first (got ${first("loan")})`);
ok(first("bitcoin") === "profit-bitcoin.html", `"bitcoin" ranks the coin page first (got ${first("bitcoin")})`);
ok(first("compound interest") === "compound-interest.html", `"compound interest" ranks exactly (got ${first("compound interest")})`);
ok(first("usd eur") === "convert-usd-to-eur.html", `"usd eur" ranks the pair first (got ${first("usd eur")})`);
ok(first("gpa") === "student.html" || searchTools("gpa")[0].tags.includes("gpa"), `"gpa" finds the student toolkit`);

const loans = searchTools("loan", { category: "finance" });
ok(loans.length > 0 && loans.every((t) => t.category === "finance"), "category option filters results");
const limited = searchTools("", { limit: 5 });
ok(limited.length === 5, "limit option caps results");
ok(searchTools("").length === ALL_TOOLS.length, "empty query returns everything");
ok(searchTools("zzzznothing").length === 0, "unmatched query returns nothing");
const calcOnly = searchTools("interest", { type: "calculator" });
ok(calcOnly.every((t) => t.type === "calculator"), "type option filters results");

// ---------------------------------------------------------------- related tools
const related = relatedTools("loan-payment.html", 6);
ok(Array.isArray(related) && related.length > 0, "related tools are returned");
ok(related.length <= 6, "related tools respect the limit");
ok(related.every((t) => t.href !== "loan-payment.html"), "related tools exclude the source");
ok(relatedTools("does-not-exist.html").length === 0, "unknown tool has no related entries");
const pairRelated = relatedTools("convert-usd-to-eur.html", 8).map((t) => t.href);
ok(pairRelated.includes("convert.html"), "a currency variant links back to its hub");

console.log(`registry tests passed (${passed} assertions)`);
