// Typed-by-convention affiliate registry. Add YOUR tracked links in `url`; entries with an empty url are never rendered.
// Every rendered link gets rel="sponsored noopener", target="_blank" and a visible FTC-style disclosure.
// Do not claim returns or guarantees. Keep the pitch factual.
//
// @typedef {{id:string,name:string,context:AffiliateContext,pitch:string,url:string,cta:string,priority?:number}} Affiliate
// @typedef {"trading"|"invoice"|"quote"|"money"|"student"|"math"|"convert"|"all"} AffiliateContext

import { deepFreeze } from "./sanitize.js";

/** @type {Affiliate[]} */
export const AFFILIATES = deepFreeze([
  // ---- Trading / finance (highest EPC on this site) ----
  { id: "exchange", name: "Crypto exchange", context: "trading", pitch: "Compare fees before you size a position.", url: "", cta: "Compare exchanges", priority: 3 },
  { id: "charting", name: "Charting platform", context: "trading", pitch: "Plot your entry, stop and targets on professional charts.", url: "", cta: "Open charting tools", priority: 2 },
  { id: "journal", name: "Trading journal", context: "trading", pitch: "Track every trade so your risk numbers come from real data.", url: "", cta: "Try a journal", priority: 2 },
  { id: "propfirm", name: "Prop trading firm", context: "trading", pitch: "Practice with a funded account before risking your own capital.", url: "", cta: "Explore prop firms", priority: 3 },
  // ---- Invoicing / freelancing ----
  { id: "accounting", name: "Accounting software", context: "invoice", pitch: "Send invoices, track payments and handle tax in one place.", url: "", cta: "See accounting tools", priority: 2 },
  { id: "payments", name: "Online payments", context: "invoice", pitch: "Let clients pay your invoice by card or bank transfer.", url: "", cta: "Get paid online", priority: 2 },
  { id: "invoicing", name: "Invoicing app", context: "quote", pitch: "Turn accepted quotes into recurring invoices automatically.", url: "", cta: "Try invoicing", priority: 1 },
  // ---- Money ----
  { id: "bank", name: "Business account", context: "money", pitch: "Keep tax set-aside money in a separate account.", url: "", cta: "Compare accounts", priority: 2 },
  { id: "broker", name: "Investing platform", context: "money", pitch: "Put compound growth to work with low-cost investing.", url: "", cta: "Compare platforms", priority: 2 },
  { id: "credit", name: "Business credit", context: "money", pitch: "Smooth cash flow between client payments.", url: "", cta: "Compare options", priority: 1 },
  // ---- Student / productivity ----
  { id: "study", name: "Study tools", context: "student", pitch: "Flashcards and planners to protect your GPA.", url: "", cta: "Explore study tools", priority: 2 },
  { id: "writing", name: "Writing assistant", context: "student", pitch: "Draft, cite and tighten essays without the busywork.", url: "", cta: "Try a writing tool", priority: 1 },
  // ---- Tooling ----
  { id: "vpn", name: "Privacy VPN", context: "all", pitch: "Encrypt your connection when using public Wi-Fi.", url: "", cta: "See VPN options", priority: 1 },
  { id: "hosting", name: "Website hosting", context: "all", pitch: "Ship your freelance portfolio on fast, cheap hosting.", url: "", cta: "Compare hosting", priority: 1 },
]);

/** Standard FTC/ASA-style disclosure shown above every affiliate block. */
export const AFFILIATE_DISCLOSURE = "Some links below are affiliate links. If you sign up we may earn a commission at no extra cost to you.";

/**
 * Build a tracked URL: preserves existing query params, then sets utm + sub-id params.
 * Returns "" when the base url is empty or invalid, so misconfigured entries never render.
 */
export function affiliateUrl(a, source, { subId = "" } = {}) {
  try {
    const u = new URL(a.url);
    u.searchParams.set("utm_source", "parchxa");
    u.searchParams.set("utm_medium", "affiliate");
    u.searchParams.set("utm_campaign", source || a.context || "all");
    u.searchParams.set("utm_content", a.id);
    if (subId) u.searchParams.set("subid", String(subId).slice(0, 40));
    return u.toString();
  } catch { return ""; }
}

/** Affiliates for a context, configured and sorted by priority (highest first). */
export function affiliatesFor(context = "all") {
  return AFFILIATES
    .filter((a) => a.url && (a.context === context || a.context === "all"))
    .sort((x, y) => (y.priority || 0) - (x.priority || 0));
}
