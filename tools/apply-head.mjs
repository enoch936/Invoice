// Insert the shared security <meta> tags into every root *.html page, idempotently.
//
//   node tools/apply-head.mjs           # rewrite pages that are missing the tags
//   node tools/apply-head.mjs --check   # exit 1 if any page is missing them (for CI)
//
// The tags are inserted right after the <meta name="theme-color"> line, which every page has.
// Pages that already carry a Content-Security-Policy meta are left untouched.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SECURITY_META } from "./csp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const ANCHOR = `<meta name="theme-color" content="#0b1120">`;

let changed = 0, missing = 0, skipped = 0;
for (const file of readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  const path = join(ROOT, file);
  const html = readFileSync(path, "utf8");
  if (html.includes("Content-Security-Policy")) { skipped++; continue; }

  // Preferred anchor is the theme-color line; some older pages omit it, so fall back to </head>.
  let next;
  if (html.includes(ANCHOR)) next = html.replace(ANCHOR, ANCHOR + "\n" + SECURITY_META);
  else if (html.includes("</head>")) next = html.replace("</head>", SECURITY_META + "\n</head>");
  else { console.error(`no insertion point in ${file}`); missing++; continue; }

  if (CHECK) { console.error(`missing security meta: ${file}`); missing++; continue; }
  writeFileSync(path, next);
  changed++;
}

if (CHECK) {
  if (missing) { console.error(`\n${missing} page(s) missing the security meta. Run: node tools/apply-head.mjs`); process.exit(1); }
  console.log(`security meta present on all ${skipped} pages.`);
} else {
  console.log(`Done. ${changed} page(s) updated, ${skipped} already had it${missing ? `, ${missing} skipped` : ""}.`);
}
