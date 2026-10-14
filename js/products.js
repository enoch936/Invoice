// PARCHXA monetization registry: own products (premium tiers, templates, digital goods) and lead magnets.
// Entries with an empty `url` are never rendered, so everything stays off until you configure it.
// Keep claims honest: describe features, never promise income or returns.
import { deepFreeze } from "./sanitize.js";

/**
 * @typedef {{id:string,name:string,price:string,blurb:string,features:string[],url:string,cta:string,badge?:string}} Product
 * @typedef {{id:string,name:string,pitch:string,url:string,cta:string}} LeadMagnet
 */

/** Self-serve premium tiers and digital products. */
export const PRODUCTS = deepFreeze(/** @type {Product[]} */ ([
  {
    id: "templates",
    name: "Freelance template pack",
    price: "$19",
    blurb: "Invoice, quotation and proposal templates plus a rate-card builder, ready to edit.",
    features: ["Editable invoice + quote templates", "Rate-card and proposal builder", "Client onboarding checklist", "Lifetime updates"],
    url: "", // e.g. https://your-shop.gumroad.com/l/parchxa-templates
    cta: "Get the pack",
  },
  {
    id: "trader-kit",
    name: "Trader risk kit",
    price: "$29",
    blurb: "A position-sizing spreadsheet, trading journal and printable risk checklist built on the same formulas as the site.",
    features: ["Position-size + Kelly spreadsheets", "Trade journal with R-multiple analytics", "Pre-trade risk checklist (printable)", "Monte Carlo workbook"],
    url: "",
    cta: "Get the kit",
    badge: "Popular",
  },
  {
    id: "pro",
    name: "PARCHXA Pro",
    price: "$5/mo",
    blurb: "Unlimited saved documents, watermark-free branded PDFs and an ad-free workspace.",
    features: ["Unlimited saved invoices & quotes", "Watermark-free branded exports", "Ad-free, faster pages", "Priority feature requests"],
    url: "",
    cta: "Go Pro",
  },
]));

/** Free lead magnets for the email list. */
export const LEAD_MAGNETS = deepFreeze(/** @type {LeadMagnet[]} */ ([
  { id: "invoice-pack", name: "Free invoice template pack", pitch: "Three clean invoice layouts (PDF + spreadsheet) to send today.", url: "", cta: "Email me the pack" },
  { id: "risk-checklist", name: "Trading risk checklist", pitch: "The pre-trade routine that keeps position size honest.", url: "", cta: "Send the checklist" },
  { id: "tax-planner", name: "Freelancer tax planner", pitch: "A one-page set-aside planner for quarterly taxes.", url: "", cta: "Get the planner" },
]));

/** Contextual product recommendations by page context. */
export const PRODUCT_CONTEXT = deepFreeze({
  invoice: ["templates", "pro"],
  quote: ["templates", "pro"],
  money: ["templates", "pro"],
  trading: ["trader-kit", "pro"],
  student: ["pro"],
  all: ["pro"],
});

/** Resolve the products to show for a context (configured + registered only). */
export function productsFor(context = "all") {
  const ids = PRODUCT_CONTEXT[context] || PRODUCT_CONTEXT.all;
  return PRODUCTS.filter((p) => p.url && ids.includes(p.id));
}

/** Resolve a lead magnet by id, only if configured. */
export function leadMagnet(id) {
  const magnet = LEAD_MAGNETS.find((m) => m.id === id);
  return magnet && magnet.url ? magnet : null;
}
