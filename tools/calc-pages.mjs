// PARCHXA page generator for the catalog calculators, the tool directory and the category pages.
//
// Turns the pure catalog (js/calc/catalog.js) and the unified registry (js/registry.js) into static
// HTML: one page per calculator, one full directory and one page per category. Output is
// byte-for-byte reproducible and consumed by tools/generate.mjs, which merges these files into
// sitemap.xml. Content lives in the catalog/registry; this file is only templates.
//
//   node tools/generate.mjs            # writes calculator + directory + category pages + sitemap
//   node tools/generate.mjs --check    # fails if anything is out of date

import { CALCULATORS, CATEGORIES as CALC_CATEGORIES } from "../js/calc/catalog.js";
import {
  CATEGORIES, getCategory, tools, counts, toolsInCategory, toolsInFamily,
  relatedTools, FEATURED_HREFS,
} from "../js/registry.js";
import { SECURITY_META } from "./csp.mjs";

const ORIGIN = "https://enoch936.github.io/Invoice";
const TODAY = new Date().toISOString().slice(0, 10);

/** Calculators we feature first on the directory and home page (business-value order). */
export const POPULAR = [
  "compound-interest", "loan-payment", "freelance-rate", "break-even",
  "cpm", "profit-margin", "forex-pip-value", "percentage", "crypto-profit", "vat",
];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Keep meta descriptions inside the 50–160 character window the verifier expects. */
const clamp = (s, max = 158) => {
  const t = String(s).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/[\s,;:.\u2014-]+$/, "") + "…";
};

const HEADER = `<header class="site-header"><a class="brand" href="index.html"><span class="brand-mark">P</span>PARCHXA<span class="brand-muted"> / toolkit</span></a><nav class="nav-links" aria-label="Main navigation"></nav></header>`;
const FOOTER = `<footer class="site-footer container"><a class="brand" href="index.html"><span class="brand-mark">P</span>PARCHXA</a><span>Useful tools for independent work.</span><nav class="footer-links" aria-label="Legal and contact"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="privacy.html#contact">Contact</a></nav><span>© <span data-year></span> PARCHXA</span></footer>`;

const categoryName = (id) => (getCategory(id) || {}).name || (CALC_CATEGORIES.find((c) => c.id === id) || {}).name || "Calculator";
const ADVICE = new Set(["finance", "business", "monetization", "trading"]);

const TYPE_LABELS = {
  calculator: "Calculator", app: "App", hub: "Hub",
  "currency-pair": "Currency pair", salary: "Hourly to salary", crypto: "Crypto profit",
};

function head({ title, description, canonical, jsonld, script }) {
  const url = `${ORIGIN}/${canonical}`;
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#ffffff">
<script>try{document.documentElement.dataset.theme=localStorage.getItem("parchxa.theme.v1")==="dark"?"dark":"light"}catch(e){}</script>
${SECURITY_META}
<meta property="og:type" content="website"><meta property="og:site_name" content="PARCHXA Toolkit"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/icons/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="PARCHXA Toolkit — free tools for independent work">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${ORIGIN}/icons/og.png">
<link rel="stylesheet" href="css/main.css"><link rel="stylesheet" href="css/pro.css"><link rel="stylesheet" href="css/calc.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<script type="module" src="${script}"></script>`;
}

function page({ title, description, canonical, jsonld, script, main }) {
  return `<!doctype html>
<html lang="en">
<head>
${head({ title, description, canonical, jsonld, script })}
</head>
<body>
${HEADER}
<main class="container page-main">
${main}
</main>
${FOOTER}
</body>
</html>
`;
}

// ---------------------------------------------------------------- one calculator
function calculatorPage(calc) {
  const title = `${calc.title} — PARCHXA`;
  const canonical = `${calc.slug}.html`;
  const cat = getCategory(calc.category);
  const catName = categoryName(calc.category);
  const related = relatedTools(calc.slug, 8);
  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "WebApplication",
      name: calc.title, url: `${ORIGIN}/${canonical}`, applicationCategory: "UtilityApplication",
      operatingSystem: "Any", browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: calc.description,
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: (calc.faq || []).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tools", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Directory", item: `${ORIGIN}/directory.html` },
        ...(cat ? [{ "@type": "ListItem", position: 3, name: cat.name, item: `${ORIGIN}/${cat.href}` }] : []),
        { "@type": "ListItem", position: cat ? 4 : 3, name: calc.title, item: `${ORIGIN}/${canonical}` },
      ],
    },
  ];

  const relatedLinks = related.map((r) => `<li><a href="${esc(r.href)}">${esc(r.title)}</a></li>`).join("");

  const main = `<div class="page-intro">
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory.html">All tools</a>${cat ? ` <span aria-hidden="true">/</span> <a href="${esc(cat.href)}">${esc(catName)}</a>` : ""} <span aria-hidden="true">/</span> <span aria-current="page">${esc(calc.title)}</span></nav>
<p class="eyebrow">${esc(catName.toUpperCase())} CALCULATOR</p>
<h1>${esc(calc.h1)}</h1>
<p>${esc(calc.intro)}</p>
</div>
<section id="calc" class="calculator-card wide" data-calc-slug="${esc(calc.slug)}">
<noscript><div class="notice">This calculator runs in your browser with JavaScript. The formula, a worked example and the worked assumptions are shown below so you can still use the method by hand.</div></noscript>
</section>
${ADVICE.has(calc.category) ? `<div class="notice"><strong>Estimates only.</strong> Results depend on the inputs you provide and the assumptions listed below. This is an educational tool, not financial, tax or investment advice.</div>` : ""}
<div data-ad-slot class="ad-reserve" aria-hidden="true"></div>
<section class="content-block"><h2>Formula</h2><p><code>${esc(calc.formula)}</code></p></section>
<section class="content-block"><h2>Worked example</h2><ol>${(calc.example || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>
<section class="content-block"><h2>Assumptions and limitations</h2><ul>${(calc.assumptions || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
<section class="content-block"><h2>Frequently asked questions</h2>${(calc.faq || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>
<section class="content-block"><h2>Related tools</h2><ul class="dir-related">${relatedLinks}${cat ? `<li><a href="${esc(cat.href)}">More ${esc(catName.toLowerCase())} tools</a></li>` : ""}<li><a href="directory.html">All tools</a></li></ul></section>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>`;
  return page({ title, description: calc.description, canonical, jsonld, script: "js/calc/runner.js", main });
}

// ---------------------------------------------------------------- directory pieces
function staticLink(tool) {
  const label = tool.type === "calculator" ? tool.title : tool.title;
  return `<li><a href="${esc(tool.href)}">${esc(label)}</a></li>`;
}

function staticGroup(title, list, open = false) {
  if (!list.length) return "";
  return `<details class="dir-index-group"${open ? " open" : ""}><summary>${esc(title)} <span class="dir-index-count">${list.length}</span></summary><ul class="dir-index-list">${list.map(staticLink).join("")}</ul></details>`;
}

/** Crawlable, no-JS-friendly index of every group of tools. */
function staticIndex(all) {
  const apps = all.filter((t) => t.type === "app" || t.type === "hub");
  const cats = CATEGORIES.map((cat) => staticGroup(cat.name, all.filter((t) => t.category === cat.id && t.type === "calculator"))).join("");
  const families = [
    staticGroup("Currency converters", toolsInFamily("convert")),
    staticGroup("Hourly to salary", toolsInFamily("rates")),
    staticGroup("Crypto profit", toolsInFamily("crypto-profit")),
  ].join("");
  return `<section class="dir-index" data-dir-static>
<h2>Browse everything</h2>
<p class="dir-index-hint">A plain list of every tool, grouped for quick scanning. The filters above are the faster way once JavaScript loads.</p>
${staticGroup("Apps & hubs", apps, true)}
${cats}
${families}
</section>`;
}

function typeOptions() {
  const types = ["calculator", "app", "hub", "currency-pair", "salary", "crypto"];
  return `<option value="">All types</option>` + types.map((t) => `<option value="${t}">${TYPE_LABELS[t]}</option>`).join("");
}

function dirControls({ withChips }) {
  return `<div class="dir-head">
<label class="field-label" for="dir-search">Search tools</label>
<div class="dir-search"><input id="dir-search" type="search" data-dir-search autocomplete="off" spellcheck="false" aria-describedby="dir-count"><span class="dir-count" id="dir-count" data-dir-count aria-live="polite"></span></div>
${withChips ? `<div class="dir-chips" data-dir-chips></div>` : ""}
<div class="dir-toolbar">
<label class="dir-field">Type<select data-dir-type aria-label="Filter by type">${typeOptions()}</select></label>
<label class="dir-field">Sort<select data-dir-sort aria-label="Sort tools"><option value="recommended">Recommended</option><option value="az">A to Z</option><option value="za">Z to A</option><option value="category">By category</option></select></label>
<div class="dir-views" role="group" aria-label="View mode"><button type="button" class="dir-view" data-dir-view="grid" aria-pressed="true">Grid</button><button type="button" class="dir-view" data-dir-view="list" aria-pressed="false">List</button><button type="button" class="dir-view" data-dir-view="compact" aria-pressed="false">Compact</button></div>
</div>
</div>
<div class="dir-results dir-results-grid" data-dir-results></div>`;
}

// ---------------------------------------------------------------- directory page
function directoryPage() {
  const all = tools();
  const stat = counts();
  const title = "Tool directory — every free PARCHXA tool — PARCHXA";
  const description = clamp(`${stat.total} free, private tools: ${stat.calculators} calculators plus apps for finance, business, freelance pricing, website income, trading, crypto and maths.`);
  const canonical = "directory.html";
  const jsonld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${ORIGIN}/${canonical}`, description },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tools", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Directory", item: `${ORIGIN}/${canonical}` },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "ItemList", name: "PARCHXA tools",
      itemListElement: all.slice(0, 200).map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: `${ORIGIN}/${t.href}` })),
    },
  ];

  const catTiles = CATEGORIES.map((cat) => `<a class="cat-tile" href="${esc(cat.href)}"><strong>${esc(cat.name)}</strong><span>${stat.byCategory[cat.id] || 0} tools</span><small>${esc(cat.blurb)}</small></a>`).join("");

  const main = `<div class="page-intro"><a class="back-link" href="index.html">← Home</a><p class="eyebrow">TOOL DIRECTORY</p><h1>Every PARCHXA tool in one place</h1><p>${stat.total} tools you can search, filter and sort — ${stat.calculators} calculators plus apps and page hubs across finance, business, freelance pricing, website income, trading, crypto, maths and everyday conversions. Everything runs in your browser; nothing you type is uploaded.</p></div>
<section class="dir-categories" aria-label="Tool categories">${catTiles}</section>
<section class="calculator-card wide" data-dir-root>
${dirControls({ withChips: true })}
</section>
${staticIndex(all)}
<div data-ad-slot class="ad-reserve" aria-hidden="true"></div>
<section class="content-block"><h2>How the directory works</h2><p>Every tool links to a real, standalone page with its method, a worked example and its assumptions, so you can check the maths or do it by hand. The search box, category buttons, type filter, sort control and view switcher all work in your browser, with no account and no tracking of what you type.</p><p>Counts are read from the same registry that builds this page, so nothing here can fall out of date.</p></section>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>`;
  return page({ title, description, canonical, jsonld, script: "js/directory-ui.js", main });
}

// ---------------------------------------------------------------- category page
function categoryPage(cat) {
  const list = toolsInCategory(cat.id);
  const calcs = list.filter((t) => t.type === "calculator");
  const rest = list.filter((t) => t.type !== "calculator");
  const title = `${cat.name} tools — free online calculators — PARCHXA`;
  const description = clamp(`${list.length} free ${cat.name.toLowerCase()} tools — ${calcs.slice(0, 3).map((c) => c.title).join(", ")} and more. Private and in-browser.`);
  const canonical = cat.href;
  const jsonld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${ORIGIN}/${canonical}`, description },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tools", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Directory", item: `${ORIGIN}/directory.html` },
        { "@type": "ListItem", position: 3, name: cat.name, item: `${ORIGIN}/${canonical}` },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "ItemList", name: `${cat.name} tools`,
      itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: `${ORIGIN}/${t.href}` })),
    },
  ];

  const otherCats = CATEGORIES.filter((c) => c.id !== cat.id).map((c) => `<li><a href="${esc(c.href)}">${esc(c.name)}</a></li>`).join("");

  const main = `<div class="page-intro">
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory.html">All tools</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(cat.name)}</span></nav>
<p class="eyebrow">CATEGORY</p>
<h1>${esc(cat.name)} tools</h1>
<p>${esc(cat.blurb)} ${list.length} tools — ${calcs.length} calculators${rest.length ? ` and ${rest.length} apps or page hubs` : ""}.</p>
</div>
<section class="calculator-card wide" data-dir-root data-dir-category="${esc(cat.id)}">
${dirControls({ withChips: false })}
</section>
<section class="dir-index" data-dir-static>
<h2>All ${esc(cat.name.toLowerCase())} tools</h2>
<ul class="dir-index-list">${list.map(staticLink).join("")}</ul>
</section>
<section class="content-block"><h2>Other categories</h2><ul class="dir-related">${otherCats}<li><a href="directory.html">Full directory</a></li></ul></section>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>`;
  return page({ title, description, canonical, jsonld, script: "js/directory-ui.js", main });
}

/** All generated files: one page per calculator, plus the directory and one page per category. */
export function buildCalculatorPages() {
  const out = new Map();
  for (const calc of CALCULATORS) out.set(`${calc.slug}.html`, calculatorPage(calc));
  out.set("directory.html", directoryPage());
  for (const cat of CATEGORIES) out.set(cat.href, categoryPage(cat));
  return out;
}

export const CALCULATOR_COUNT = CALCULATORS.length;
export const FEATURED = FEATURED_HREFS;
