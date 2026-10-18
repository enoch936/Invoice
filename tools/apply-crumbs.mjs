// Ensure every registered tool page shows a visible breadcrumb from the shared registry.
//
//   node tools/apply-crumbs.mjs           # add the breadcrumb to tool pages that lack one
//   node tools/apply-crumbs.mjs --check   # exit 1 if any tool page is missing it (for CI)
//
// The trail (All tools / <category> / <tool>) is derived from js/registry.js so it can never
// disagree with the directory, mega menu or search. Pages that already carry a breadcrumb are left
// untouched; the top-level directory and non-tool pages are skipped.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toolByHref, getCategory } from "../js/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const SKIP = new Set(["index.html", "directory.html", "privacy.html", "terms.html", "offline.html", "404.html"]);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function crumbsFor(tool) {
  const cat = getCategory(tool.category);
  const parts = [`<a href="directory.html">All tools</a>`];
  if (cat) parts.push(`<span aria-hidden="true">/</span>`, `<a href="${esc(cat.href)}">${esc(cat.name)}</a>`);
  parts.push(`<span aria-hidden="true">/</span>`, `<span aria-current="page">${esc(tool.title)}</span>`);
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join(" ")}</nav>`;
}

let changed = 0, already = 0, failed = 0, skipped = 0;
for (const file of readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort()) {
  if (SKIP.has(file)) { skipped++; continue; }
  const tool = toolByHref(file);
  if (!tool) { skipped++; continue; }

  const path = join(ROOT, file);
  const html = readFileSync(path, "utf8");
  if (html.includes('class="crumbs"')) { already++; continue; }

  if (CHECK) { console.error(`missing breadcrumb: ${file}`); failed++; continue; }

  const main = html.match(/<main\b[^>]*>/);
  if (!main) { console.error(`no <main> in ${file}`); failed++; continue; }
  const next = html.replace(main[0], `${main[0]}\n${crumbsFor(tool)}`);
  if (next !== html) { writeFileSync(path, next); changed++; }
}

if (CHECK) {
  if (failed) { console.error(`\n${failed} tool page(s) missing a breadcrumb. Run: node tools/apply-crumbs.mjs`); process.exit(1); }
  console.log(`breadcrumbs present on all ${already} tool pages.`);
} else {
  console.log(`Done. ${changed} page(s) updated, ${already} already had a breadcrumb, ${skipped} skipped${failed ? `, ${failed} had no <main>` : ""}.`);
}
