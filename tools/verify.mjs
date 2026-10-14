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

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
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
const jsFiles = readdirSync(join(ROOT, "js")).filter((f) => f.endsWith(".js")).sort();
for (const file of jsFiles) {
  const res = spawnSync(process.execPath, ["--check", join("js", file)], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) failures.push(`syntax error in js/${file}`);
}
for (const file of ["sw.js", "tools/generate.mjs", "tools/apply-head.mjs", "tools/verify.mjs", "tools/csp.mjs"]) {
  const res = spawnSync(process.execPath, ["--check", file], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) failures.push(`syntax error in ${file}`);
}
console.log(`  checked ${jsFiles.length} js files + service worker + tools`);

// 2. tests
step("Running unit tests");
if (!runNode(["tests/quant.test.mjs"])) failures.push("unit tests failed");

// 3. generator up to date
step("Checking generated pages are up to date");
if (!runNode(["tools/generate.mjs", "--check"])) failures.push("generated pages/sitemap out of date");

// 4. security meta
step("Checking security meta on every page");
if (!runNode(["tools/apply-head.mjs", "--check"])) failures.push("pages missing the security meta");

// 5-7. per-page static checks
step("Checking local assets, JSON-LD and sitemap coverage");
const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
const PRIVATE = new Set(["offline.html"]);
const sitemap = existsSync(join(ROOT, "sitemap.xml")) ? readFileSync(join(ROOT, "sitemap.xml"), "utf8") : "";
const ldJsonRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const attrRe = /\b(?:href|src)\s*=\s*"([^"]+)"/g;

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), "utf8");

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
