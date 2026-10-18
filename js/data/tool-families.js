// PARCHXA tool-family metadata — pure data, no DOM, no side effects.
//
// Family pages (currency converters, hourly-to-salary pages and per-coin profit pages) were
// originally hand-written or generated as flat files. This module describes them once so the
// registry, the generators, the search index and the tests all agree on the same set of pages
// and links. Nothing here reads the filesystem, so it is safe to import from Node and browser.

/** Currency pairs that exist as static `convert-<from>-to-<to>.html` pages. */
export const CONVERT_CURRENCIES = [
  { code: "ETB", name: "Ethiopian birr", symbol: "Br" },
  { code: "EUR", name: "Euro", symbol: "\u20ac" },
  { code: "GBP", name: "British pound", symbol: "\u00a3" },
  { code: "INR", name: "Indian rupee", symbol: "\u20b9" },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh" },
  { code: "NGN", name: "Nigerian naira", symbol: "\u20a6" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
];

/** Currencies that have an `rates-<code>-hourly-to-salary.html` page. */
export const RATE_CURRENCIES = [
  { code: "AED", name: "UAE dirham", symbol: "د.إ" },
  { code: "AUD", name: "Australian dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian dollar", symbol: "C$" },
  { code: "ETB", name: "Ethiopian birr", symbol: "Br" },
  { code: "EUR", name: "Euro", symbol: "\u20ac" },
  { code: "GBP", name: "British pound", symbol: "\u00a3" },
  { code: "INR", name: "Indian rupee", symbol: "\u20b9" },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh" },
  { code: "NGN", name: "Nigerian naira", symbol: "\u20a6" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
];

/** Coins that have a `profit-<slug>.html` page (content lives in tools/generate.mjs). */
export const COINS = [
  { slug: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { slug: "ethereum", name: "Ethereum", symbol: "ETH" },
  { slug: "solana", name: "Solana", symbol: "SOL" },
  { slug: "xrp", name: "XRP", symbol: "XRP" },
  { slug: "cardano", name: "Cardano", symbol: "ADA" },
  { slug: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  { slug: "bnb", name: "BNB", symbol: "BNB" },
  { slug: "litecoin", name: "Litecoin", symbol: "LTC" },
  { slug: "polkadot", name: "Polkadot", symbol: "DOT" },
  { slug: "polygon", name: "Polygon", symbol: "MATIC" },
  { slug: "chainlink", name: "Chainlink", symbol: "LINK" },
  { slug: "tron", name: "Tron", symbol: "TRX" },
];

export const CURRENCY_BY_CODE = Object.fromEntries(
  [...CONVERT_CURRENCIES, ...RATE_CURRENCIES].map((c) => [c.code, c]),
);

export const COIN_BY_SLUG = Object.fromEntries(COINS.map((c) => [c.slug, c]));

/** Ordered list of the static currency-pair pages (56 today: every ordered pair). */
export function convertPairs() {
  const out = [];
  for (const from of CONVERT_CURRENCIES) {
    for (const to of CONVERT_CURRENCIES) {
      if (from.code === to.code) continue;
      out.push({ from: from.code, to: to.code, href: `convert-${from.code.toLowerCase()}-to-${to.code.toLowerCase()}.html` });
    }
  }
  return out;
}

/** Ordered list of the static hourly-to-salary pages. */
export function salaryPages() {
  return RATE_CURRENCIES.map((c) => ({ code: c.code, href: `rates-${c.code.toLowerCase()}-hourly-to-salary.html` }));
}

/** Ordered list of the static per-coin profit pages. */
export function coinPages() {
  return COINS.map((c) => ({ slug: c.slug, href: `profit-${c.slug}.html` }));
}
