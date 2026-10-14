// PARCHXA site configuration. Fill these in to switch monetization on. Empty values = feature stays off.
// Nothing here is a secret: this ships to the browser by design. Never put API keys in this file.
export const SITE = {
  name: "PARCHXA",
  tagline: "Useful tools for independent work.",
  origin: "https://enoch936.github.io/Invoice",
  contactEmail: "",                    // shown in the support link if set
  updated: "2026-10",                  // human-readable "last updated" stamp used in footers
  author: "PARCHXA",                   // E-E-A-T author/reviewer name for content pages
  // ---- Monetization (all off until configured) ----
  adsense: { client: "" },             // e.g. "ca-pub-1234567890123456" (loads only after consent)
  plausibleDomain: "",                 // e.g. "enoch936.github.io" (privacy-friendly analytics, loads after consent)
  umami: { scriptUrl: "", websiteId: "" },
  affiliateSubId: "",                  // optional sub-id passed to every affiliate link for revenue attribution
  newsletterUrl: "",                   // Buttondown/Beehiiv/ConvertKit form action or landing page URL
  newsletterProvider: "",             // "buttondown" | "beehiiv" | "convertkit" | "" (informational)
  tipJarUrl: "",                       // Buy Me a Coffee / Ko-fi / Gumroad link
  premiumUrl: "",                      // fallback checkout URL if the products registry has none
  // ---- Social / sharing ----
  ogImage: "icons/og.svg",             // default social preview image (SVG is fine for many crawlers; swap for PNG if needed)
  social: { x: "", github: "https://github.com/enoch936/Invoice", linkedin: "", reddit: "" },
  // ---- Feature flags ----
  features: { commandPalette: true, shareCards: true, webVitals: true },
};
