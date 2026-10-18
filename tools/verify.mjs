// PARCHXA one-shot verification, used by CI and locally. Cross-platform, zero dependencies.
//
//   node tools/verify.mjs
//
// Steps:
//   1. node --check on every js/*.js (syntax)
//   2. unit tests (tests/quant.test.mjs)
//   3. programmatic pages + sitemap are up to date (tools/generate.mjs --check)
//   4. security meta present on every page (tools/apply-head.mjs --check)
//   5. every local href/src in every root *.html resolves to a real file
//   6. every JSON-LD block parses as JSON
//   7. every root page (except private ones) appears in sitemap.xml
//   8. every page has one <h1>, a 50-160 char description and a <=70 char title

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const step = (name) => console.log(`\n\u2022 ${name}`);

function runNode(args) {
  const res = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  return res.status === 0;
}

// 1. syntax
step("Checking JavaScript syntax");
function walkJs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}
const jsFiles = walkJs(join(ROOT, "js")).sort();
for (const file of jsFiles) {
  const res = spawnSync(process.execPath, ["--check", file], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) failures.push(`syntax error in ${relative(ROOT, file)}`);
}
const toolFiles = readdirSync(join(ROOT, "tools")).filter((f) => f.endsWith(".mjs")).sort();
for (const file of ["sw.js", ...toolFiles.map((f) => join("tools", f))]) {
  const res = spawnSync(process.execPath, ["--check", file], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) failures.push(`syntax error in ${file}`);
}
console.log(`  checked ${jsFiles.length} js files, service worker, ${toolFiles.length} tools`);

// 2. tests
step("Running unit tests");
if (!runNode(["tests/quant.test.mjs"])) failures.push("quant tests failed");
if (!runNode(["tests/calc.test.mjs"])) failures.push("calculator tests failed");
if (!runNode(["tests/mathengine.test.mjs"])) failures.push("math engine tests failed");
if (!runNode(["tests/registry.test.mjs"])) failures.push("tool registry tests failed");

// 3. generator up to date
step("Checking generated pages are up to date");
if (!runNode(["tools/generate.mjs", "--check"])) failures.push("generated pages/sitemap out of date");

// 4. security meta
step("Checking security meta on every page");
if (!runNode(["tools/apply-head.mjs", "--check"])) failures.push("pages missing the security meta");

// 5. social preview image
step("Checking social preview tags on every page");
if (!runNode(["tools/apply-og.mjs", "--check"])) failures.push("pages missing social preview tags");

// 5b. breadcrumbs on every tool page
step("Checking tool pages have breadcrumbs");
if (!runNode(["tools/apply-crumbs.mjs", "--check"])) failures.push("tool pages missing breadcrumbs");

// 6-9. per-page static checks
step("Checking local assets, JSON-LD, OG images and sitemap coverage");
const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
const PRIVATE = new Set(["offline.html", "404.html"]);
const ORIGIN = "https://enoch936.github.io/Invoice";
const sitemap = existsSync(join(ROOT, "sitemap.xml")) ? readFileSync(join(ROOT, "sitemap.xml"), "utf8") : "";
const ldJsonRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const attrRe = /\b(?:href|src)\s*=\s*"([^"]+)"/g;
const imageRe = /<meta (?:property="og:image"|name="twitter:image") content="([^"]+)"/g;

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), "utf8");

  // heading + metadata quality (rendered length: HTML entities count as one character)
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const renderedLen = (s) => s.replace(/&[a-z]+;|&#\d+;/gi, "x").length;
  if (!title) failures.push(`${page}: missing <title>`);
  else if (renderedLen(title) > 70) failures.push(`${page}: <title> longer than 70 characters`);
  if (!desc) failures.push(`${page}: missing meta description`);
  else if (renderedLen(desc) < 50 || renderedLen(desc) > 160) failures.push(`${page}: meta description length ${renderedLen(desc)} (aim 50-160)`);
  const h1Count = (html.match(/<h1[\s>]/g) || []).length;
  if (h1Count !== 1) failures.push(`${page}: expected exactly one <h1>, found ${h1Count}`);

  // Search inputs carry an accessible label instead of placeholder text (product rule).
  for (const input of html.matchAll(/<input\b[^>]*>/g)) {
    const tag = input[0];
    if (!/\btype\s*=\s*"search"/.test(tag)) continue;
    const ph = tag.match(/\bplaceholder\s*=\s*"([^"]*)"/);
    if (ph && ph[1].trim()) failures.push(`${page}: search input has placeholder text "${ph[1]}"`);
  }

  for (const match of html.matchAll(attrRe)) {
    const value = match[1].trim();
    if (!value || value.startsWith("#") || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    const pathPart = value.split("#")[0].split("?")[0];
    if (!pathPart) continue;
    if (!existsSync(resolve(ROOT, pathPart))) failures.push(`${page}: missing asset ${value}`);
  }

  for (const match of html.matchAll(ldJsonRe)) {
    try { JSON.parse(match[1]); }
    catch (error) { failures.push(`${page}: invalid JSON-LD (${error.message})`); }
  }

  for (const match of html.matchAll(imageRe)) {
    let value = match[1].trim();
    if (value.startsWith(ORIGIN)) value = value.slice(ORIGIN.length).replace(/^\//, "");
    else if (/^[a-z][a-z0-9+.-]*:/i.test(value)) continue; // external URL — not our asset
    if (!existsSync(resolve(ROOT, value))) failures.push(`${page}: missing OG image ${match[1]}`);
  }

  if (!PRIVATE.has(page) && !sitemap.includes(`/${page === "index.html" ? "" : page}</loc>`)) {
    failures.push(`${page}: not listed in sitemap.xml`);
  }
}
console.log(`  checked ${pages.length} pages`);

// summary
if (failures.length) {
  console.error("\n\u2717 Verification failed:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\n\u2713 All checks passed.");
