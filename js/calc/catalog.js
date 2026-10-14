// PARCHXA calculator catalog — the single source of truth for every published calculator.
//
// This module is intentionally PURE: it never touches the DOM, storage or the network, so the
// exact same definitions drive the browser UI, the static-page generator (tools/calc-pages.mjs)
// and the unit tests (tests/calc.test.mjs). Add a calculator by appending a definition to the
// relevant data module below — the directory, search, sitemap and pages all update automatically.
//
// Calculator definition shape:
// {
//   slug        unique URL slug (also the page filename: <slug>.html)
//   title       full <title> / og:title (usually "<thing> calculator")
//   h1          on-page heading (may equal title)
//   category    one of CATEGORIES[].id
//   tags        short keywords for search/filtering
//   description meta description, ~150 chars, unique
//   intro       1–2 sentence plain-English intro shown under the H1
//   inputs      Input[] (see below)
//   currency    optional true → show the shared currency selector (default USD)
//   run(values, ctx) → Result   pure calculation; may throw new Error("message") on bad input
//   formula     the formula as a string (rendered in <code>)
//   example     string[] — a worked example, one step per line
//   assumptions string[] — documented limitations
//   faq         {q,a}[] — 3+ genuine questions
//   related     string[] — slugs of related calculators (must exist in the catalog)
// }
//
// Input shape:
// { key, label, type:"number"|"select"|"text", default, min?, max?, step?, unit?, options?, help?, optional? }
//   unit "currency" formats with the selected currency; "percent" appends %; otherwise plain.
//
// Result shape (returned by run()):
// {
//   primary: { label, value, format }             // format: currency|percent|number|integer|text
//   stats:   [{ label, value, format, hint? }]
//   table:   { caption?, columns:[{label,align?}], rows:[[cell,…]] }   // cell = {v,format} | primitive
//   chart:   { points:[{x,y}], xLabel, yLabel }   // optional simple line chart
//   steps:   string[]                             // calculation shown with the user's numbers
//   verdict: string                               // one plain-English interpretation sentence
// }

import { FINANCE } from "./data/finance.js";
import { BUSINESS } from "./data/business.js";
import { MONETIZATION } from "./data/monetization.js";
import { TRADING } from "./data/trading.js";
import { MATH_CALCS } from "./data/math.js";
import { GENERAL } from "./data/general.js";

/** Categories, in directory display order. */
export const CATEGORIES = [
  { id: "finance", name: "Financial", blurb: "Loans, savings, investing and money maths." },
  { id: "business", name: "Business & freelancing", blurb: "Pricing, profit, margins, rates and taxes." },
  { id: "monetization", name: "Website & creator income", blurb: "Ad, affiliate, subscription and creator revenue." },
  { id: "trading", name: "Trading, forex & crypto", blurb: "Pip values, position sizing, P&L and risk." },
  { id: "math", name: "Math & statistics", blurb: "Percentages, averages, probability and algebra." },
  { id: "general", name: "Converters, dates & health", blurb: "Unit conversion, dates and everyday health maths." },
];

/** Every published calculator, in the order it should appear. */
export const CALCULATORS = [
  ...FINANCE,
  ...BUSINESS,
  ...MONETIZATION,
  ...TRADING,
  ...MATH_CALCS,
  ...GENERAL,
];

const BY_SLUG = new Map(CALCULATORS.map((c) => [c.slug, c]));

/** Look up a calculator by slug (or null). */
export function getCalculator(slug) {
  return BY_SLUG.get(String(slug || "")) || null;
}

/** All calculators in a category, in catalog order. */
export function calculatorsInCategory(categoryId) {
  return CALCULATORS.filter((c) => c.category === category);
}

/** Category metadata by id. */
export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

/** True when every `related` slug resolves — used by the tests to keep links honest. */
export function danglingRelated() {
  const out = [];
  for (const c of CALCULATORS) for (const r of c.related || []) if (!BY_SLUG.has(r)) out.push(`${c.slug} → ${r}`);
  return out;
}
