// Ensure every root *.html page advertises the shared social preview image, idempotently.
//
//   node tools/apply-og.mjs           # add the OG/Twitter image tags to pages that lack them
//   node tools/apply-og.mjs --check   # exit 1 if any page is missing them (for CI)
//
// Inserts `<meta property="og:image">` + `<meta name="twitter:image">` right after the page's
// og:url (falling back to the theme-color line, then </head>), and upgrades `twitter:card` to
// `summary_large_image` so the image is actually shown. Pages that already carry an og:image are
// left completely untouched.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const IMAGE = "https://enoch936.github.io/Invoice/icons/og.png";
const OG_IMAGE = `<meta property="og:image" content="${IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${IMAGE}">`;
const CARD_SMALL = `<meta name="twitter:card" content="summary">`;
const CARD_LARGE = `<meta name="twitter:card" content="summary_large_image">`;
const THEME_ANCHOR = `<meta name="theme-color" content="#0b1120">`;

function insertImage(html) {
  if (html.includes(OG_IMAGE)) return html;
  // anchor after the existing og:url if present (works even mid-line), else after theme-color,
  // else just before </head>.
  const urlTag = html.match(/<meta property="og:url"[^>]*>/);
  if (urlTag) return html.replace(urlTag[0], `${urlTag[0]}\n${OG_IMAGE}`);
  if (html.includes(THEME_ANCHOR)) return html.replace(THEME_ANCHOR, `${THEME_ANCHOR}\n${OG_IMAGE}`);
  if (html.includes("</head>")) return html.replace("</head>", `${OG_IMAGE}\n</head>`);
  return null;
}

function normalizeCard(html) {
  if (html.includes(CARD_LARGE)) return html;
  if (html.includes(CARD_SMALL)) return html.replace(CARD_SMALL, CARD_LARGE);
  // no twitter:card at all — add one next to the image
  if (html.includes(OG_IMAGE)) return html.replace(OG_IMAGE, `${OG_IMAGE}${CARD_LARGE}`);
  return html;
}

let changed = 0, already = 0, failed = 0;
for (const file of readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  const path = join(ROOT, file);
  const html = readFileSync(path, "utf8");

  const hasImage = html.includes('property="og:image"');
  const hasCard = html.includes('name="twitter:card" content="summary_large_image"');
  if (hasImage && hasCard) { already++; continue; }

  if (CHECK) { console.error(`missing social preview tags: ${file}`); failed++; continue; }

  let next = html;
  if (!hasImage) {
    const inserted = insertImage(next);
    if (inserted === null) { console.error(`no insertion point in ${file}`); failed++; continue; }
    next = inserted;
  }
  next = normalizeCard(next);
  if (next !== html) { writeFileSync(path, next); changed++; }
}

if (CHECK) {
  if (failed) { console.error(`\n${failed} page(s) missing social preview tags. Run: node tools/apply-og.mjs`); process.exit(1); }
  console.log(`social preview tags present on all ${already} pages.`);
} else {
  console.log(`Done. ${changed} page(s) updated, ${already} already had them${failed ? `, ${failed} skipped` : ""}.`);
}
