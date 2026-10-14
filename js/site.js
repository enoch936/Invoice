// PARCHXA shared runtime: navigation, footer compliance, cookie consent, monetization blocks,
// command palette, analytics and PWA registration. Imported (for side effects) by every page.
import { SITE } from "./config.js";
import { affiliatesFor, AFFILIATE_DISCLOSURE, affiliateUrl } from "./affiliates.js";
import { LEAD_MAGNETS, productsFor } from "./products.js";
import { NAV } from "./nav.js";
import { track, observeWebVitals, observeScrollDepth, trackClicks } from "./analytics.js";
import { initCommandPalette } from "./command-palette.js";
import { wireShareCards } from "./sharecard.js";

const CONSENT_KEY = "parchxa.consent.v1";

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...kids);
  return node;
};
const getConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } };
const setConsent = (v) => { try { localStorage.setItem(CONSENT_KEY, v); } catch { /* ignore */ } };

// ---------------------------------------------------------------- toasts
let toastHost = null;
export function toast(message, { timeout = 2600 } = {}) {
  if (!toastHost) { toastHost = el("div", { class: "toast-host", role: "status", "aria-live": "polite" }); document.body.append(toastHost); }
  const node = el("div", { class: "toast", text: String(message).slice(0, 160) });
  toastHost.append(node);
  setTimeout(() => { node.classList.add("is-out"); setTimeout(() => node.remove(), 300); }, timeout);
}

// ---------------------------------------------------------------- navigation
const nav = document.querySelector(".nav-links");
if (nav) {
  nav.replaceChildren(...NAV.map(([href, label]) => {
    const a = el("a", { href, text: label });
    if (location.pathname.endsWith(href)) a.setAttribute("aria-current", "page");
    return a;
  }));
}
// A keyboard/deep-link entry point for the command palette in the header.
const header = document.querySelector(".site-header");
if (header && SITE.features.commandPalette && !header.querySelector("[data-cmdk]")) {
  header.append(el("button", { type: "button", class: "cmd-trigger", "data-cmdk": true, "aria-label": "Open command palette", text: "Search  ⌘K" }));
}

// ---------------------------------------------------------------- footer compliance bar
const footer = document.querySelector(".site-footer");
if (footer && !document.querySelector(".compliance-bar")) {
  const bar = el("div", { class: "compliance-bar container" });
  bar.append(el("p", {}, "Educational tools only. Not financial, tax, legal or trading advice. Results are estimates you should verify. Some links are affiliate links; we may earn a commission at no extra cost to you."));
  const links = el("p", {});
  links.append("PARCHXA · ", el("a", { href: "privacy.html", text: "Privacy" }), " · ", el("a", { href: "terms.html", text: "Terms" }), " · ");
  links.append(el("button", { type: "button", class: "link-button", onclick: clearAllData }, "Clear my data"), " · ");
  links.append(el("button", { type: "button", class: "link-button", onclick: () => { setConsent(""); try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ } showBanner(); } }, "Cookie settings"));
  if (SITE.contactEmail) links.append(" · ", el("a", { href: `mailto:${SITE.contactEmail}`, text: "Contact" }));
  links.append(" · Last updated ", SITE.updated);
  bar.append(links);
  footer.after(bar);
}

function clearAllData() {
  if (!confirm("Delete all saved drafts and settings stored by PARCHXA in this browser?")) return;
  try { Object.keys(localStorage).filter((k) => k.startsWith("parchxa.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  location.reload();
}

// ---------------------------------------------------------------- monetization
function renderMonetization() {
  // Affiliate cards (contextual)
  document.querySelectorAll("[data-affiliates]").forEach((slot) => {
    const ctx = slot.dataset.affiliates;
    const items = affiliatesFor(ctx);
    if (!items.length) { slot.remove(); return; }
    slot.classList.add("aff-wrap");
    slot.append(el("p", { class: "aff-label", text: "Sponsored" }), el("p", { class: "aff-disclosure", text: AFFILIATE_DISCLOSURE }));
    const grid = el("div", { class: "aff-grid" });
    items.forEach((a) => {
      const link = el("a", { class: "button button-secondary button-small", href: affiliateUrl(a, ctx, { subId: SITE.affiliateSubId }), rel: "sponsored noopener", target: "_blank", "data-track": `affiliate:${a.id}` }, a.cta, " ↗");
      grid.append(el("article", { class: "aff-card" }, el("h4", { text: a.name }), el("p", { text: a.pitch }), link));
    });
    slot.append(grid);
  });

  // Own products (premium / digital goods)
  document.querySelectorAll("[data-products]").forEach((slot) => {
    const ctx = slot.dataset.products;
    const items = productsFor(ctx);
    if (!items.length) { slot.remove(); return; }
    slot.classList.add("products-wrap");
    slot.append(el("h2", { class: "products-heading", text: "Support the project" }));
    const grid = el("div", { class: "product-grid" });
    items.forEach((p) => {
      const card = el("article", { class: "product-card" + (p.badge ? " is-featured" : "") });
      if (p.badge) card.append(el("span", { class: "product-badge", text: p.badge }));
      card.append(el("h3", { text: p.name }), el("p", { class: "product-price", text: p.price }), el("p", { class: "product-blurb", text: p.blurb }));
      const ul = el("ul", { class: "product-features" });
      p.features.forEach((f) => ul.append(el("li", { text: f })));
      card.append(ul, el("a", { class: "button button-primary button-small", href: p.url, rel: "noopener", target: "_blank", "data-track": `product:${p.id}` }, p.cta, " ↗"));
      grid.append(card);
    });
    slot.append(grid);
  });

  // Email lead magnets
  document.querySelectorAll("[data-lead-magnet]").forEach((slot) => {
    const id = slot.dataset.leadMagnet || "invoice-pack";
    const magnet = LEAD_MAGNETS.find((m) => m.id === id);
    if (!magnet || !(magnet.url || SITE.newsletterUrl)) { slot.remove(); return; }
    const url = magnet.url || SITE.newsletterUrl;
    slot.classList.add("lead-magnet");
    slot.append(
      el("div", { class: "lead-copy" }, el("h3", { text: magnet.name }), el("p", { text: magnet.pitch })),
      el("a", { class: "button button-primary button-small", href: url, rel: "noopener", target: "_blank", "data-track": `lead:${magnet.id}` }, magnet.cta, " ↗"));
  });

  // Simple support strip (newsletter / tip jar / premium link)
  const cta = document.querySelector("[data-support]");
  if (cta) {
    const links = [
      [SITE.newsletterUrl, "Get the free template pack", "newsletter"],
      [SITE.premiumUrl, "Premium templates", "premium"],
      [SITE.tipJarUrl, "☕ Support this project", "tip"],
    ].filter(([u]) => u);
    if (!links.length) cta.remove();
    else {
      cta.classList.add("support-strip");
      links.forEach(([u, t, key]) => cta.append(el("a", { class: "button button-secondary button-small", href: u, rel: "noopener", target: "_blank", "data-track": `support:${key}` }, t)));
    }
  }
}

// ---------------------------------------------------------------- consent + third parties
function loadThirdParty() {
  if (getConsent() !== "all") return;
  if (SITE.plausibleDomain && !document.querySelector("script[data-plausible]")) {
    document.head.append(el("script", { defer: true, "data-domain": SITE.plausibleDomain, src: "https://plausible.io/js/script.js", "data-plausible": "1" }));
  }
  if (SITE.umami.scriptUrl && !document.querySelector("script[data-umami]")) {
    document.head.append(el("script", { defer: true, src: SITE.umami.scriptUrl, "data-website-id": SITE.umami.websiteId, "data-umami": "1" }));
  }
  if (SITE.adsense.client && !document.querySelector("script[data-adsense]")) {
    document.head.append(el("script", { async: true, crossorigin: "anonymous", "data-adsense": "1", src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(SITE.adsense.client) }));
    document.querySelectorAll("[data-ad-slot]").forEach((slot) => {
      slot.classList.add("ad-slot");
      slot.append(el("ins", { class: "adsbygoogle", style: "display:block", "data-ad-client": SITE.adsense.client, "data-ad-format": "auto", "data-full-width-responsive": "true" }));
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignore */ }
    });
  }
}

function showBanner() {
  if (document.querySelector(".consent-banner")) return;
  const done = (v) => { setConsent(v); banner.remove(); loadThirdParty(); track("consent", { choice: v }); };
  const banner = el("div", { class: "consent-banner", role: "dialog", "aria-label": "Cookie consent" },
    el("p", {}, "We use essential storage for your drafts. With your OK we also load privacy-friendly analytics and ads that keep these tools free. ", el("a", { href: "privacy.html", text: "Learn more" })),
    el("div", { class: "consent-actions" },
      el("button", { type: "button", class: "button button-secondary button-small", onclick: () => done("essential") }, "Essential only"),
      el("button", { type: "button", class: "button button-primary button-small", onclick: () => done("all") }, "Accept all")));
  document.body.append(banner);
}

// ---------------------------------------------------------------- share buttons
function wireShareButtons() {
  document.querySelectorAll("[data-share]:not([data-share-card])").forEach((btn) => btn.addEventListener("click", async () => {
    const data = { title: document.title, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    } catch { /* user cancelled */ }
  }));
}

// ---------------------------------------------------------------- boot
renderMonetization();
wireShareButtons();
if (SITE.features.shareCards) {
  try {
    // Pages can register live specs on window.parchxaShareSpecs[id] = () => ({...}).
    wireShareCards((id, btn) => {
      const custom = globalThis.parchxaShareSpecs?.[id];
      if (typeof custom === "function") { try { return custom(); } catch { /* fall through */ } }
      return {
        title: document.title,
        headline: btn.dataset.shareHeadline || document.querySelector("h1")?.textContent?.trim() || "",
        subheadline: btn.dataset.shareSub || "",
        lines: (btn.dataset.shareLine || "").split("|").filter(Boolean),
        theme: btn.dataset.shareTheme || "night",
        url: location.href,
      };
    });
  } catch { /* ignore */ }
}
if (SITE.features.commandPalette) { try { initCommandPalette(); } catch { /* ignore */ } }

const needsConsent = SITE.adsense.client || SITE.plausibleDomain || SITE.umami.scriptUrl;
if (needsConsent && !getConsent()) showBanner(); else loadThirdParty();

// Analytics: local-only until consent, pageview + vitals + scroll depth + delegated CTA clicks.
try {
  if (SITE.features.webVitals) observeWebVitals();
  track("pageview", { path: location.pathname.slice(0, 40) });
  observeScrollDepth((depth) => track("scroll", { depth }));
  trackClicks(document);
} catch { /* ignore */ }

// PWA
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Public hook so inline handlers / other modules can reuse the toast + tracker.
window.parchxa = Object.assign(window.parchxa || {}, { toast, track, site: SITE });
