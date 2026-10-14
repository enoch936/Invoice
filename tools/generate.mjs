// PARCHXA programmatic-SEO generator.
//
//   node tools/generate.mjs          # write generated pages + sitemap.xml
//   node tools/generate.mjs --check  # fail (exit 1) if any generated file is out of date
//
// Zero dependencies. Content is defined below; templates live in this file so the output is
// byte-for-byte reproducible. Edit the DATA, run the script, commit the result.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SECURITY_META } from "./csp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://enoch936.github.io/Invoice";
const TODAY = new Date().toISOString().slice(0, 10);
const CHECK = process.argv.includes("--check");

// ---------------------------------------------------------------- data
/** @type {{name:string,symbol:string,slug:string,entry:number,tagline:string,about:string,notes:string[],related:string[]}[]} */
const COINS = [
  {
    name: "Bitcoin", symbol: "BTC", slug: "bitcoin", entry: 60000,
    tagline: "the original proof-of-work store of value",
    about: "Bitcoin is the largest cryptocurrency by market value and the benchmark most portfolios are judged against. It trades 24/7 on hundreds of venues, so the price you see depends on the exchange, the pair and the moment you look. Because BTC is often held for years, fees and the original cost basis matter as much as the headline price move.",
    notes: ["Settlement can involve on-chain fees when you move coins off an exchange.", "Price differences between exchanges (the spread) are a real cost on large trades.", "Long holding periods may attract different tax treatment than active trading in many countries."],
    related: ["ethereum", "solana", "bnb"],
  },
  {
    name: "Ethereum", symbol: "ETH", slug: "ethereum", entry: 3000,
    tagline: "the largest smart-contract platform",
    about: "Ethereum is the base layer for most DeFi, NFT and stablecoin activity, which makes ETH sensitive to on-chain demand as well as broader market sentiment. Gas fees are paid in ETH, so network congestion shows up directly in your wallet. When you calculate a trade, remember that moving ETH between wallets or protocols costs gas on top of exchange fees.",
    notes: ["Gas fees are paid in ETH and vary with network activity.", "Staking rewards and staking periods complicate a simple buy/sell view.", "Layer-2 networks can cut fees but add a bridge step."],
    related: ["solana", "polygon", "chainlink"],
  },
  {
    name: "Solana", symbol: "SOL", slug: "solana", entry: 150,
    tagline: "a high-throughput, low-fee layer-1",
    about: "Solana is known for fast, cheap transactions and a busy ecosystem of trading and consumer apps. That speed also means volatile intraday moves, so slippage on larger orders can be meaningfully different from the quoted price. Fees are tiny in normal conditions but the price itself can swing hard within a session.",
    notes: ["Very low transaction fees, but slippage rises with order size.", "Validator staking and unstaking periods affect liquidity planning.", "Network congestion has historically caused temporary outages."],
    related: ["ethereum", "polygon", "tron"],
  },
  {
    name: "XRP", symbol: "XRP", slug: "xrp", entry: 0.6,
    tagline: "a payments-focused ledger asset",
    about: "XRP is designed for fast, low-cost cross-border settlement and is used by payment corridors in several regions. Its price has historically reacted strongly to regulatory news, which can produce gaps that a simple percentage table will not capture. Costs are usually small, but exchange availability and liquidity vary by region.",
    notes: ["Regulatory headlines have caused outsized price gaps.", "Liquidity and spreads differ a lot between exchanges.", "Always check the pair (XRP/USD vs XRP/USDT) you are actually trading."],
    related: ["bitcoin", "litecoin", "tron"],
  },
  {
    name: "Cardano", symbol: "ADA", slug: "cardano", entry: 0.45,
    tagline: "a research-driven proof-of-stake chain",
    about: "Cardano uses a proof-of-stake consensus and a peer-reviewed development approach, and ADA is used for staking and fees. Staking is common, so many holders earn rewards while they hold — which changes the effective cost basis over time. Treat staking rewards as a separate calculation from a straightforward buy-and-sell trade.",
    notes: ["Staking rewards adjust your effective cost basis.", "Delegation has an epoch warm-up before rewards begin.", "Liquidity is thinner than BTC/ETH on some venues."],
    related: ["polkadot", "ethereum", "chainlink"],
  },
  {
    name: "Dogecoin", symbol: "DOGE", slug: "dogecoin", entry: 0.15,
    tagline: "a meme-origin coin with real liquidity",
    about: "Dogecoin began as a joke but has deep liquidity and a large community, and it often moves on social sentiment rather than fundamentals. Meme coins can spike and fade within hours, so recording your actual entry and exit matters more than any prediction. Fees are low, but volatility is the dominant risk.",
    notes: ["Sentiment-driven moves can be extreme in both directions.", "Low nominal price makes 'number of coins' easy to overestimate.", "Position sizing matters more than entry timing for survival."],
    related: ["bitcoin", "solana", "litecoin"],
  },
  {
    name: "BNB", symbol: "BNB", slug: "bnb", entry: 550,
    tagline: "the native token of the BNB Chain ecosystem",
    about: "BNB is used for fees and services across the BNB Chain and a major exchange ecosystem. Fee discounts and token burns link its utility to platform activity, so demand is tied to the health of that ecosystem as well as the wider market. Check whether your holding earns any yield, because that changes the total return.",
    notes: ["Utility is tied to one exchange ecosystem, which concentrates risk.", "Token burns periodically reduce supply.", "Fees paid in BNB can be discounted on some platforms."],
    related: ["ethereum", "solana", "cardano"],
  },
  {
    name: "Litecoin", symbol: "LTC", slug: "litecoin", entry: 80,
    tagline: "a long-running payments fork of Bitcoin",
    about: "Litecoin is one of the oldest cryptocurrencies and is often used for cheaper, faster payments than Bitcoin. Its price tends to track Bitcoin closely, which means diversification benefits are limited. Fees are low, so the exchange spread is usually the bigger cost.",
    notes: ["Closely correlated with Bitcoin.", "Low fees make the exchange spread the main cost.", "Widely supported, so liquidity is generally good."],
    related: ["bitcoin", "xrp", "dogecoin"],
  },
  {
    name: "Polkadot", symbol: "DOT", slug: "polkadot", entry: 7,
    tagline: "a network that connects specialised chains",
    about: "Polkadot coordinates parachains through a shared security model, and DOT is used for staking, governance and bonding. Staking and parachain auctions lock up tokens, which affects how easily you can exit a position. A simple buy/sell view is a starting point, not the whole picture.",
    notes: ["Bonding for parachains can lock tokens for long periods.", "Staking yields and unbonding delays affect liquidity.", "Price is closely tied to the success of connected chains."],
    related: ["cardano", "chainlink", "ethereum"],
  },
  {
    name: "Polygon", symbol: "MATIC", slug: "polygon", entry: 0.8,
    tagline: "an Ethereum scaling ecosystem",
    about: "Polygon provides scaling networks that make Ethereum transactions cheaper, and MATIC (POL) is used for fees and security. Demand is linked to how much activity moves onto its networks, so usage metrics matter. Bridging between Ethereum and Polygon adds a step where fees and delays appear.",
    notes: ["Bridging assets adds fees and waiting time.", "Token migration and rebranding can affect tickers and custody.", "Value depends on activity migrating onto its networks."],
    related: ["ethereum", "solana", "chainlink"],
  },
  {
    name: "Chainlink", symbol: "LINK", slug: "chainlink", entry: 15,
    tagline: "oracle infrastructure for smart contracts",
    about: "Chainlink supplies price and data feeds to smart contracts across many chains, and LINK is used to pay for that service. Its demand is tied to how much DeFi and other protocols rely on its oracles. Because it is infrastructure rather than a consumer coin, moves can lag broader market cycles.",
    notes: ["Demand depends on protocol integrations rather than retail hype.", "Staking programs can lock tokens.", "Cross-chain usage spreads risk across many networks."],
    related: ["ethereum", "polkadot", "polygon"],
  },
  {
    name: "Tron", symbol: "TRX", slug: "tron", entry: 0.12,
    tagline: "a high-throughput chain used for stablecoin transfers",
    about: "Tron carries a large share of stablecoin transfer volume, and TRX is used for bandwidth, energy and governance. Network activity drives both fees and demand, so usage statistics are worth watching. Energy and bandwidth mechanics mean fees are not always a simple fixed amount.",
    notes: ["Heavy stablecoin usage drives network activity.", "Bandwidth and energy mechanics affect real transaction costs.", "Concentration in a few use-cases is a risk."],
    related: ["xrp", "solana", "bitcoin"],
  },
];

const bySlug = Object.fromEntries(COINS.map((c) => [c.slug, c]));
const usd = (n) => (n >= 1 ? n.toLocaleString("en-US") : String(n));

// ---------------------------------------------------------------- shared head pieces
function head({ title, description, canonical, jsonld, script }) {
  const url = `${ORIGIN}/${canonical}`;
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0b1120">
${SECURITY_META}
<meta property="og:type" content="website"><meta property="og:site_name" content="PARCHXA Toolkit"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/icons/og.svg">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${ORIGIN}/icons/og.svg">
<link rel="stylesheet" href="css/main.css"><link rel="stylesheet" href="css/pro.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<script type="module" src="${script}"></script>`;
}

const HEADER = `<header class="site-header"><a class="brand" href="index.html"><span class="brand-mark">P</span>PARCHXA<span class="brand-muted"> / toolkit</span></a><nav class="nav-links" aria-label="Main navigation"></nav></header>`;
const FOOTER = `<footer class="site-footer container"><a class="brand" href="index.html"><span class="brand-mark">P</span>PARCHXA</a><span>Useful tools for independent work.</span><nav class="footer-links" aria-label="Legal and contact"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="privacy.html#contact">Contact</a></nav><span>© <span data-year></span> PARCHXA</span></footer>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------- templates
function coinPage(c) {
  const title = `${c.name} Profit Calculator (${c.symbol}): Fees, ROI & Break-even — PARCHXA`;
  const description = `Work out your ${c.name} (${c.symbol}) profit or loss in USD, including trading fees, percentage return and the break-even sell price. Free, private, runs in your browser.`;
  const canonical = `profit-${c.slug}.html`;
  const exitDefault = Math.round(c.entry * 1.25 * 100) / 100;
  const related = c.related.filter((s) => bySlug[s]).map((s) => {
    const r = bySlug[s];
    return `<a href="profit-${r.slug}.html">${r.name} (${r.symbol}) profit</a>`;
  }).join(" · ");

  const faq = [
    { q: `How do I calculate profit on ${c.name} (${c.symbol})?`, a: `Subtract your total cost from your total proceeds. This page uses (sell price − buy price) × quantity, then removes estimated fees on both sides, and shows the net result and the percentage return.` },
    { q: `Does this use a live ${c.symbol} price?`, a: "No. You enter your own buy and sell prices so the result is exactly what you paid and received. That avoids relying on a delayed or exchange-specific quote." },
    { q: "What fees should I include?", a: "Exchange maker/taker fees, any spread you paid, and network or withdrawal fees if you moved the coins. A round-trip estimate is usually enough for planning; check your own trade history for exact figures." },
    { q: "How is the break-even sell price calculated?", a: "It is the sell price at which net profit after fees is zero, so it sits above your buy price by roughly the round-trip fee. Trading exactly at break-even still loses nothing but earns nothing." },
    { q: "Is this tax advice?", a: "No. Capital-gains rules vary by country and holding period, and many jurisdictions treat each disposal separately. Use these numbers as a starting point and confirm with a qualified professional." },
  ];

  const jsonld = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: `${c.name} Profit Calculator`, url: `${ORIGIN}/${canonical}`, applicationCategory: "FinanceApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "PARCHXA", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Profit calculators", item: `${ORIGIN}/profit.html` },
      { "@type": "ListItem", position: 3, name: `${c.name} profit`, item: `${ORIGIN}/${canonical}` },
    ] },
  ];

  return `<!doctype html>
<html lang="en">
<head>
${head({ title, description, canonical, jsonld, script: "js/profit.js" })}
</head>
<body>
${HEADER}
<main class="container page-main">
<div class="page-intro"><a class="back-link" href="profit.html">← All profit calculators</a><p class="eyebrow">CRYPTO PROFIT / ${c.symbol}</p><h1>${c.name} (${c.symbol}) profit <span class="text-gradient">calculator</span></h1><p>Enter your buy price, sell price and quantity to see net profit or loss in USD after fees, your return and the break-even sell price — using ${c.tagline}.</p></div>
<form class="calculator-card calc-form" data-coin="${esc(c.name)}" data-symbol="${esc(c.symbol)}" data-slug="${esc(c.slug)}" novalidate>
  <div class="form-row">
    <label>Buy price (USD)<input name="entry" id="entry" type="number" min="0" step="any" value="${c.entry}" required></label>
    <label>Sell price (USD)<input name="exit" id="exit" type="number" min="0" step="any" value="${exitDefault}" required></label>
    <label>Quantity (${c.symbol})<input name="quantity" id="quantity" type="number" min="0" step="any" value="1" required></label>
    <label>Trading fees round trip (%)<input name="fee" id="fee" type="number" min="0" max="25" step="0.01" value="0.1"></label>
    <label>Direction<select name="side" id="side"><option value="long">Long (buy then sell)</option><option value="short">Short (sell then buy)</option></select></label>
  </div>
  <div class="result-panel" aria-live="polite"><span>NET PROFIT / LOSS (USD)</span><strong id="out">—</strong><p id="detail"></p></div>
  <div class="actions-row"><button type="button" id="swap-prices" class="button button-secondary button-small">Swap buy / sell</button><button type="button" class="button button-secondary button-small" data-share-card="profit-${esc(c.slug)}" data-share-headline="${esc(c.symbol)} P/L">Create share card</button></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Sell price</th><th>Net P/L</th><th>Return</th></tr></thead><tbody id="tbl"></tbody></table></div>
</form>
<div class="notice"><strong>Estimates only.</strong> Figures exclude spread, slippage, network and withdrawal fees unless you include them, and ignore tax. Not financial or tax advice.</div>
<div data-affiliates="trading"></div>
<section class="content-block"><h2>About the ${c.name} (${c.symbol}) profit calculator</h2><p>${esc(c.about)}</p><p>Things that change the real number:</p><ul class="plain-list">${c.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul><p>Related: ${related} · <a href="profit.html">all profit calculators</a> · <a href="trading.html">position-size &amp; risk tools</a> · <a href="chart.html">live chart &amp; backtester</a></p></section>
<div data-ad-slot class="ad-reserve" aria-hidden="true"></div>
<section class="content-block"><h2>Frequently asked questions</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>
<div data-products="trading"></div>
<div data-lead-magnet="risk-checklist"></div>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>
</main>
${FOOTER}
</body>
</html>
`;
}

function hubPage() {
  const title = "Crypto Profit Calculators: BTC, ETH, SOL & More — PARCHXA";
  const description = "Free profit calculators for Bitcoin, Ethereum, Solana and other major coins. Enter your prices and quantity to get net profit, ROI and break-even after fees.";
  const canonical = "profit.html";
  const faq = [
    { q: "How do these crypto profit calculators work?", a: "Each page takes your own buy price, sell price and quantity, applies a round-trip fee estimate and returns the net profit or loss in USD, the percentage return and the break-even sell price." },
    { q: "Do they use live prices?", a: "No. Entering your real fill prices gives a more accurate result than any delayed quote, and keeps the page private and offline-friendly." },
    { q: "Which coins are covered?", a: `${COINS.map((c) => c.name).join(", ")}. Each page also works for any asset — just type your own prices.` },
  ];
  const jsonld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${ORIGIN}/${canonical}`, description },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  const cards = COINS.map((c) => `<article class="aff-card"><h4>${c.name} (${c.symbol})</h4><p>${esc(c.tagline)}</p><a class="button button-secondary button-small" href="profit-${c.slug}.html">Open calculator</a></article>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
${head({ title, description, canonical, jsonld, script: "js/profit.js" })}
</head>
<body>
${HEADER}
<main class="container page-main">
<div class="page-intro"><a class="back-link" href="index.html">← All tools</a><p class="eyebrow">CRYPTO PROFIT CALCULATORS</p><h1>Profit &amp; loss calculators for <span class="text-gradient">major coins</span></h1><p>Pick a coin for net profit, ROI and break-even after fees. Every calculator works for any asset — just enter your own prices.</p></div>
<section class="calculator-card wide"><p class="eyebrow">CHOOSE A COIN</p><div class="aff-grid">${cards}</div></section>
<section class="content-block"><h2>How to use these calculators</h2><p>Each page computes (sell − buy) × quantity, subtracts estimated round-trip fees and shows the net result, the percentage return and the break-even sell price. There is also a small table showing what happens at several possible sell prices, which is useful for setting targets before you trade.</p><p>For risk and position sizing, pair these pages with the <a href="trading.html">trading risk suite</a> and the <a href="chart.html">live chart &amp; backtester</a>.</p></section>
<div data-affiliates="trading"></div>
<div data-ad-slot class="ad-reserve" aria-hidden="true"></div>
<section class="content-block"><h2>Frequently asked questions</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>
<div data-products="trading"></div>
<div data-support></div>
<p class="updated">Last updated ${TODAY} · Built by PARCHXA · Educational estimates, not advice</p>
</main>
${FOOTER}
</body>
</html>
`;
}

// ---------------------------------------------------------------- sitemap
const PRIMARY_ORDER = [
  "", "invoice.html", "quote.html", "calculators.html", "money.html", "trading.html",
  "chart.html", "math.html", "student.html", "memorial.html", "convert.html", "rates.html",
  "profit.html", "privacy.html", "terms.html",
];

function buildSitemap(extraPages = []) {
  const exclude = new Set(["offline.html"]);
  const files = new Set([
    ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
    ...extraPages,
  ]);
  const locs = new Set([...files].filter((f) => !exclude.has(f)));
  const known = new Map();
  if (existsSync(join(ROOT, "sitemap.xml"))) {
    const prev = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
    for (const m of prev.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) {
      const rel = m[1].replace(`${ORIGIN}/`, "");
      known.set(rel, m[2]);
    }
  }
  const relOf = (f) => (f === "index.html" ? "" : f);
  const ordered = [...locs].sort((a, b) => {
    const ia = PRIMARY_ORDER.indexOf(relOf(a)), ib = PRIMARY_ORDER.indexOf(relOf(b));
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });
  const lines = ordered.map((f) => {
    const rel = relOf(f);
    const lastmod = known.get(rel) || TODAY;
    return `  <url><loc>${ORIGIN}/${rel}</loc><lastmod>${lastmod}</lastmod></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join("\n")}
</urlset>
`;
}

// ---------------------------------------------------------------- run
const outputs = new Map();
for (const c of COINS) outputs.set(`profit-${c.slug}.html`, coinPage(c));
outputs.set("profit.html", hubPage());

// The sitemap must know about pages written in this same run, so pass their filenames in.
let drift = 0, written = 0;
const writeOut = (file, content) => {
  const path = join(ROOT, file);
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === content) return;
  if (CHECK) { console.error(`out of date: ${file}`); drift++; return; }
  writeFileSync(path, content);
  written++;
  console.log(`wrote ${file}`);
};
for (const [file, content] of outputs) writeOut(file, content);
const sitemap = buildSitemap([...outputs.keys()]);
writeOut("sitemap.xml", sitemap);

if (CHECK) {
  if (drift) { console.error(`\n${drift} generated file(s) out of date. Run: node tools/generate.mjs`); process.exit(1); }
  console.log(`generated files are up to date (${outputs.size + 1} files).`);
} else {
  console.log(`\nDone. ${written} file(s) written.`);
}
