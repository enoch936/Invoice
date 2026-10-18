// Keep the shared security <meta> tags canonical on every root *.html page, idempotently.
//
//   node tools/apply-head.mjs           # insert or upgrade the tags so every page matches tools/csp.mjs
//   node tools/apply-head.mjs --check   # exit 1 if any page differs (for CI)
//
// Older pages were generated with a slightly different policy (e.g. missing connect-src), so
// simply skipping pages that already carry a CSP would let them drift. Instead this tool rewrites
// any existing Content-Security-Policy meta to the canonical string and guarantees the referrer
// meta is present, which keeps the whole site converged on one policy.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CSP_META, REFERRER_META } from "./csp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const ANCHOR = `<meta name="theme-color" content="#ffffff">`;
const THEME_BOOT = `<script>try{document.documentElement.dataset.theme=localStorage.getItem("parchxa.theme.v1")==="dark"?"dark":"light"}catch(e){}</script>`;
const CSP_META_RE = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;

function canonicalize(html) {
  let next = html;

  if (CSP_META_RE.test(next)) next = next.replace(CSP_META_RE, CSP_META);
  else if (next.includes(ANCHOR)) next = next.replace(ANCHOR, ANCHOR + "\n" + CSP_META);
  else if (next.includes("</head>")) next = next.replace("</head>", CSP_META + "\n</head>");
  else return null;

  if (!next.includes(REFERRER_META)) {
    if (next.includes(CSP_META)) next = next.replace(CSP_META, CSP_META + "\n" + REFERRER_META);
    else next = next.replace("</head>", REFERRER_META + "\n</head>");
  }

  // Guarantee the theme-color anchor so every page carries it before </head>.
  if (!next.includes(ANCHOR) && next.includes("</head>")) {
    next = next.replace("</head>", ANCHOR + "\n</head>");
  }

  // No-flash theme bootstrap: apply the stored theme before first paint.
  if (!next.includes("parchxa.theme.v1") && next.includes(ANCHOR)) {
    next = next.replace(ANCHOR, ANCHOR + "\n" + THEME_BOOT);
  }
  return next;
}

let changed = 0, stale = 0, broken = 0;
for (const file of readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  const path = join(ROOT, file);
  const html = readFileSync(path, "utf8");
  const next = canonicalize(html);
  if (next === null) { console.error(`no insertion point in ${file}`); broken++; continue; }
  if (next === html) continue;

  if (CHECK) { console.error(`security meta out of date: ${file}`); stale++; continue; }
  writeFileSync(path, next);
  changed++;
}

if (CHECK) {
  if (broken || stale) { console.error(`\n${stale + broken} page(s) need updating. Run: node tools/apply-head.mjs`); process.exit(1); }
  console.log("security meta is canonical on every page.");
} else {
  console.log(`Done. ${changed} page(s) updated, ${stale || 0} already canonical${broken ? `, ${broken} skipped` : ""}.`);
}
