import { SITE } from "./config.js";
import { AFFILIATES, affiliateUrl } from "./affiliates.js";

const CONSENT_KEY = "parchxa.consent.v1";
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "class") n.className = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
  n.append(...kids); return n;
};
const getConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } };
const setConsent = (v) => { try { localStorage.setItem(CONSENT_KEY, v); } catch {} };

// Shared navigation (adds the new tools to every page)
const NAV = [["invoice.html", "Invoice"], ["quote.html", "Quotation"], ["calculators.html", "Calculators"], ["money.html", "Money"], ["trading.html", "Trading"], ["student.html", "Student"]];
const nav = document.querySelector(".nav-links");
if (nav) {
  nav.replaceChildren(...NAV.map(([href, label]) => {
    const a = el("a", { href }, label);
    if (location.pathname.endsWith(href)) a.setAttribute("aria-current", "page");
    return a;
  }));
}

// Footer: compliance links
const footer = document.querySelector(".site-footer");
if (footer && !document.querySelector(".compliance-bar")) {
  const bar = el("div", { class: "compliance-bar container" });
  bar.append(el("p", {}, "Educational tools only. Not financial, tax or legal advice. Results are estimates. Some links on this site are affiliate links; we may earn a commission at no extra cost to you."));
  const links = el("p", {});
  links.append(el("a", { href: "privacy.html" }, "Privacy"), " · ", el("a", { href: "terms.html" }, "Terms"), " · ");
  links.append(el("button", { type: "button", class: "link-button", onclick: () => { if (confirm("Delete all saved drafts and settings stored by PARCHXA in this browser?")) { Object.keys(localStorage).filter((k) => k.startsWith("parchxa.")).forEach((k) => localStorage.removeItem(k)); location.reload(); } } }, "Clear my data"));
  links.append(" · ", el("button", { type: "button", class: "link-button", onclick: () => { localStorage.removeItem(CONSENT_KEY); showBanner(); } }, "Cookie settings"));
  bar.append(links);
  footer.after(bar);
}

// Monetization blocks: affiliate cards + email/tip/premium CTAs, only if configured
function renderMonetization() {
  document.querySelectorAll("[data-affiliates]").forEach((slot) => {
    const ctx = slot.dataset.affiliates;
    const items = AFFILIATES.filter((a) => a.url && (a.context === ctx || a.context === "all"));
    if (!items.length) { slot.remove(); return; }
    slot.classList.add("aff-wrap");
    slot.append(el("p", { class: "aff-label" }, "Sponsored · Affiliate links"));
    const grid = el("div", { class: "aff-grid" });
    items.forEach((a) => {
      const link = el("a", { class: "button button-secondary button-small", href: affiliateUrl(a, ctx), rel: "sponsored noopener", target: "_blank" }, a.cta, " ↗");
      grid.append(el("article", { class: "aff-card" }, el("h4", {}, a.name), el("p", {}, a.pitch), link));
    });
    slot.append(grid);
  });
  const cta = document.querySelector("[data-support]");
  if (cta) {
    const links = [[SITE.newsletterUrl, "Get the free template pack"], [SITE.premiumUrl, "Premium templates"], [SITE.tipJarUrl, "☕ Support this project"]].filter(([u]) => u);
    if (!links.length) cta.remove();
    else { cta.classList.add("support-strip"); links.forEach(([u, t]) => cta.append(el("a", { class: "button button-secondary button-small", href: u, rel: "noopener", target: "_blank" }, t))); }
  }
}

// Consent-gated third-party scripts
function loadThirdParty() {
  if (getConsent() !== "all") return;
  if (SITE.plausibleDomain && !document.querySelector("script[data-plausible]")) {
    const s = el("script", { defer: "", "data-domain": SITE.plausibleDomain, src: "https://plausible.io/js/script.js", "data-plausible": "1" }); document.head.append(s);
  }
  if (SITE.adsense.client && !document.querySelector("script[data-adsense]")) {
    const s = el("script", { async: "", crossorigin: "anonymous", "data-adsense": "1", src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(SITE.adsense.client) });
    document.head.append(s);
    document.querySelectorAll("[data-ad-slot]").forEach((slot) => {
      slot.classList.add("ad-slot");
      slot.append(el("ins", { class: "adsbygoogle", style: "display:block", "data-ad-client": SITE.adsense.client, "data-ad-format": "auto", "data-full-width-responsive": "true" }));
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    });
  }
}

function showBanner() {
  if (document.querySelector(".consent-banner")) return;
  const done = (v) => { setConsent(v); banner.remove(); loadThirdParty(); };
  const banner = el("div", { class: "consent-banner", role: "dialog", "aria-label": "Cookie consent" },
    el("p", {}, "We use essential storage for your drafts. With your OK we also load privacy-friendly analytics and ads that help keep these tools free. ", el("a", { href: "privacy.html" }, "Learn more")),
    el("div", { class: "consent-actions" },
      el("button", { type: "button", class: "button button-secondary button-small", onclick: () => done("essential") }, "Essential only"),
      el("button", { type: "button", class: "button button-primary button-small", onclick: () => done("all") }, "Accept all")));
  document.body.append(banner);
}

renderMonetization();
const needsConsent = SITE.adsense.client || SITE.plausibleDomain;
if (needsConsent && !getConsent()) showBanner(); else loadThirdParty();

// PWA
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Share button helper: <button data-share>
document.querySelectorAll("[data-share]").forEach((btn) => btn.addEventListener("click", async () => {
  const data = { title: document.title, url: location.href };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); btn.textContent = "Link copied ✓"; } } catch {}
}));
