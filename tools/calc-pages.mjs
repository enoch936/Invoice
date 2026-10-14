// PARCHXA calculator page generator.
//
// Turns the pure catalog (js/calc/catalog.js) into one static HTML page per calculator plus the
// searchable directory. Output is byte-for-byte reproducible and consumed by tools/generate.mjs,
// which merges these files into sitemap.xml. Content lives in the catalog; this file is only
// templates.
//
//   node tools/generate.mjs            # writes calculator pages + directory + sitemap
//   node tools/generate.mjs --check    # fails if anything is out of date

import { CALCULATORS, CATEGORIES } from "../js/calc/catalog.js";
import { SECURITY_META } from "./csp.mjs";

const ORIGIN = "https://enoch936.github.io/Invoice";
const TODAY = new Date().toISOString().slice(0, 10);

/** Calculators we feature first on the directory and home page (business-value order). */
export const POPULAR = [
  "compound-interest", "loan-payment", "freelance-rate", "break-even",
  "cpm", "profit-margin", "forex-pip-value", "percentage", "crypto-profit", "vat",
];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const HEADER = `<header class="site-header"><a class="brand" href="index.html"><span class="brand-mark">P</span>PARCHXA<span class="brand-muted"> / toolkit</span></a><nav class="nav-links" aria-label="Main navigation"></nav></header>`;
const FOOTER = `<footer class="site-footer container"><a class="brand" href="index.html"><span class="brand-mark">P</span>PARCHXA</a><span>Useful tools for independent work.</span><nav class="footer-links" aria-label="Legal and contact"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="privacy.html#contact">Contact</a></nav><span>© <span data-year></span> PARCHXA</span></footer>`;

const categoryName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || "Calculator";
const ADVICE = new Set(["finance", "business", "monetization", "trading"]);

function head({ title, description, canonical, jsonld, script }) {
  const url = `${ORIGIN}/${canonical}`;
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0b1120">
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
  const related = (calc.related || []).map((slug) => CALCULATORS.find((c) => c.slug === slug)).filter(Boolean);
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
        { "@type": "ListItem", position: 2, name: "Calculators", item: `${ORIGIN}/directory.html` },
        { "@type": "ListItem", position: 3, name: calc.title, item: `${ORIGIN}/${canonical}` },
      ],
    },
  ];

  const example = (calc.example || []).map((line) => `<li>${esc(line)}</li>`).join("");
  const assumptions = (calc.assumptions || []).map((a) => `<li>${esc(a)}</li>`).join("");
  const faq = (calc.faq || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
  const relatedLinks = related.map((r) => `<li><a href="${r.slug}.html">${esc(r.title)}</a></li>`).join("");

  const main = `<div class="page-intro">
<a class="back-link" href="directory.html">← All calculators</a>
<p class="eyebrow">${esc(categoryName(calc.category).toUpperCase())} CALCULATOR</p>
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
<section class="content-block"><h2>Related calculators</h2><ul class="dir-related">${related.map((r) => `<li><a href="${r.slug}.html">${esc(r.title)}</a></li>`).join("")}<li><a href="directory.html">All calculators</a></li></ul></section>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>`;
  return page({ title, description: calc.description, canonical, jsonld, script: "js/calc/runner.js", main });
}

// ---------------------------------------------------------------- directory
function card(calc, heading = "h3") {
  const search = [calc.title, calc.description, calc.category, ...(calc.tags || [])].join(" ").toLowerCase();
  return `<a class="dir-card" href="${calc.slug}.html" data-calc-card data-category="${esc(calc.category)}" data-search="${esc(search)}"><${heading}>${esc(calc.title)}</${heading}><p>${esc(calc.description)}</p><span class="dir-open">Open calculator →</span></a>`;
}

function directoryPage() {
  const title = "Calculator directory — free online calculators — PARCHXA";
  const description = `${CALCULATORS.length} free, private online calculators: finance, business and freelance, website income, trading, forex, crypto, maths and everyday conversions. No sign-up.`;
  const canonical = "directory.html";
  const jsonld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${ORIGIN}/${canonical}`, description },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tools", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Calculators", item: `${ORIGIN}/${canonical}` },
      ],
    },
  ];

  const popular = POPULAR.map((slug) => CALCULATORS.find((c) => c.slug === slug)).filter(Boolean);
  const popularSection = `<section class="dir-section" data-dir-section><h2>Popular calculators</h2><p>The tools people reach for most often.</p><div class="dir-grid">${popular.map((c) => card(c)).join("")}</div></section>`;

  const sections = CATEGORIES.map((cat) => {
    const items = CALCULATORS.filter((c) => c.category === cat.id);
    if (!items.length) return "";
    return `<section class="dir-section" data-dir-section><h2>${esc(cat.name)}</h2><p>${esc(cat.blurb)}</p><div class="dir-grid">${items.map((c) => card(c)).join("")}</div></section>`;
  }).join("\n");

  const chips = [`<button class="dir-chip" data-category="all" aria-pressed="true">All (${CALCULATORS.length})</button>`,
    ...CATEGORIES.filter((cat) => CALCULATORS.some((c) => c.category === cat.id))
      .map((cat) => `<button class="dir-chip" data-category="${cat.id}" aria-pressed="false">${esc(cat.name)} (${CALCULATORS.filter((c) => c.category === cat.id).length})</button>`)].join("");

  const main = `<div class="page-intro"><a class="back-link" href="index.html">← All tools</a><p class="eyebrow">CALCULATOR DIRECTORY</p><h1>Free calculators for work and money</h1><p>${CALCULATORS.length} calculators across finance, business, freelance pricing, website income, trading, crypto, maths and everyday conversions. Everything runs in your browser — nothing you type is uploaded.</p></div>
<section class="calculator-card wide"><div class="dir-search"><input id="dir-search" type="search" placeholder="Search calculators — try ‘loan’, ‘pip’ or ‘margin’" aria-label="Search calculators" autocomplete="off"><span class="dir-count" id="dir-count" aria-live="polite"></span></div><div class="dir-chips">${chips}</div></section>
<div data-recent-calcs></div>
${popularSection}
${sections}
<div data-ad-slot class="ad-reserve" aria-hidden="true"></div>
<section class="content-block"><h2>How the directory works</h2><p>Every calculator is a standalone page with its formula, a worked example and its assumptions, so you can check the maths or do it by hand. Use the search box or the category buttons to narrow the list — filtering happens in your browser, with no account and no tracking of what you type.</p><p>If a tool you need is missing, the catalog is designed to grow: new calculators are added as real, tested pages rather than placeholders.</p></section>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>`;
  return page({ title, description, canonical, jsonld, script: "js/calc/directory.js", main });
}

/** All generated calculator files: one page per calculator plus the directory. */
export function buildCalculatorPages() {
  const out = new Map();
  for (const calc of CALCULATORS) out.set(`${calc.slug}.html`, calculatorPage(calc));
  out.set("directory.html", directoryPage());
  return out;
}

export const CALCULATOR_COUNT = CALCULATORS.length;
