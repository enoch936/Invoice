// Typed-by-convention affiliate registry. Add YOUR tracked links in `url`; entries with an empty url are never rendered.
// Every rendered link gets rel="sponsored noopener" and a visible disclosure. Do not claim returns or guarantees.
/** @typedef {{id:string,name:string,context:"trading"|"invoice"|"student"|"money"|"all",pitch:string,url:string,cta:string}} Affiliate */
/** @type {Affiliate[]} */
export const AFFILIATES = [
  { id: "exchange", name: "Crypto exchange", context: "trading", pitch: "Compare fees before you size a position.", url: "", cta: "Compare exchanges" },
  { id: "charting", name: "Charting platform", context: "trading", pitch: "Plot your entry, stop and targets on professional charts.", url: "", cta: "Open charting tools" },
  { id: "journal", name: "Trading journal", context: "trading", pitch: "Track every trade so your risk numbers come from real data.", url: "", cta: "Try a journal" },
  { id: "accounting", name: "Accounting software", context: "invoice", pitch: "Send invoices, track payments and handle tax in one place.", url: "", cta: "See accounting tools" },
  { id: "payments", name: "Online payments", context: "invoice", pitch: "Let clients pay your invoice by card or bank transfer.", url: "", cta: "Get paid online" },
  { id: "bank", name: "Business account", context: "money", pitch: "Keep tax set-aside money in a separate account.", url: "", cta: "Compare accounts" },
  { id: "broker", name: "Investing platform", context: "money", pitch: "Put compound growth to work with low-cost investing.", url: "", cta: "Compare platforms" },
  { id: "study", name: "Study tools", context: "student", pitch: "Flashcards and planners to protect your GPA.", url: "", cta: "Explore study tools" },
];

export function affiliateUrl(a, source) {
  try {
    const u = new URL(a.url);
    u.searchParams.set("utm_source", "parchxa");
    u.searchParams.set("utm_medium", "affiliate");
    u.searchParams.set("utm_campaign", source || a.context);
    return u.toString();
  } catch { return ""; }
}
