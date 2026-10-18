// PARCHXA shared runtime: navigation, footer compliance, cookie consent, monetization blocks,
// command palette, analytics and PWA registration. Imported (for side effects) by every page.
import { SITE } from "./config.js";
import { affiliatesFor, AFFILIATE_DISCLOSURE, affiliateUrl } from "./affiliates.js";
import { LEAD_MAGNETS, productsFor } from "./products.js";
import { CATEGORIES, toolsInCategory, counts } from "./registry.js";
import { createSearch } from "./search.js";
import { iconSvg, hydrateIcons } from "./icons.js";
import { track, observeWebVitals, observeScrollDepth, trackClicks } from "./analytics.js";
import { initCommandPalette } from "./command-palette.js";
import { wireShareCards } from "./sharecard.js";

const CONSENT_KEY = "parchxa.consent.v1";

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
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
const here = location.pathname.split("/").pop() || "index.html";


/** Compact header/drawer search control (no placeholder text — it carries an accessible label). */
function searchControl(idPrefix, label = "Search all tools") {
  const wrap = el("div", { class: "nav-search" });
  const input = el("input", { id: `${idPrefix}-input`, type: "search", class: "nav-search-input", autocomplete: "off", spellcheck: "false", "aria-label": label });
  const panel = el("div", { class: "search-panel", hidden: true });
  wrap.append(el("span", { class: "nav-search-icon", html: iconSvg("search", 15) }), input, panel);
  const found = createSearch({ input, panel });
  return { wrap, input, panel, search: found };
}

const nav = document.querySelector(".nav-links");
if (nav) {
  const links = [];
  const total = counts().total;

  // "Tools" mega menu, grouped by registry category.
  const menu = el("div", { class: "nav-menu" });
  const toolsBtn = el("button", { type: "button", class: "nav-link", "aria-expanded": "false", "aria-controls": "nav-tools-panel" },
    "Tools", el("span", { class: "chev", html: iconSvg("chevron-down", 13) }));
  const panel = el("div", { class: "nav-panel mega-panel", id: "nav-tools-panel", hidden: true });
  const grid = el("div", { class: "mega-grid" });
  CATEGORIES.forEach((cat) => {
    const items = toolsInCategory(cat.id);
    if (!items.length) return;
    const heads = items.filter((t) => t.type === "app" || t.type === "hub");
    const calcs = items.filter((t) => t.type === "calculator").slice(0, 4);
    const col = el("div", { class: "mega-col" },
      el("a", { class: "mega-col-head", href: cat.href }, el("strong", { text: cat.name }), el("small", { text: `${items.length} tools` })));
    [...heads, ...calcs].forEach((t) => {
      const item = el("a", { class: "mega-item", href: t.href }, el("strong", { text: t.title }), el("span", { text: t.description }));
      if (here === t.href) item.setAttribute("aria-current", "page");
      col.append(item);
    });
    col.append(el("a", { class: "mega-more", href: cat.href, text: `All ${cat.name.toLowerCase()} tools →` }));
    grid.append(col);
  });
  panel.append(grid, el("div", { class: "mega-foot" },
    el("a", { href: "directory.html", text: `Open the full directory (${total} tools)` }),
    el("span", { class: "muted-copy", text: "Press ⌘K or / to search everything" })));
  menu.append(toolsBtn, panel);
  links.push(menu);

  links.push(el("a", { class: "nav-link", href: "directory.html", text: "Directory", "aria-current": here === "directory.html" ? "page" : null }));

  // Header search (desktop) wired to the shared search engine.
  const search = searchControl("nav-search");
  links.push(search.wrap);

  // Icon theme toggle (text buttons without SVGs, e.g. the terminal, are relabelled only).
  const themeBtn = el("button", { type: "button", class: "nav-icon-btn", "data-theme-toggle": true, "aria-label": "Switch theme" });
  themeBtn.innerHTML = iconSvg("sun", 16, "theme-icon-sun") + iconSvg("moon", 16, "theme-icon-moon");
  links.push(themeBtn);

  // Mobile menu toggle.
  const burger = el("button", { type: "button", class: "nav-icon-btn nav-burger", "aria-label": "Open menu", "aria-expanded": "false", "aria-controls": "nav-drawer" });
  burger.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  links.push(burger);

  nav.replaceChildren(...links);

  const closeMenu = () => { panel.hidden = true; toolsBtn.setAttribute("aria-expanded", "false"); };
  toolsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    toolsBtn.setAttribute("aria-expanded", String(open));
  });
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) { closeMenu(); toolsBtn.focus(); }
    else if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) {
      e.preventDefault();
      (search.input.offsetParent ? search.input : burger).focus();
    }
  });

  // Mobile drawer: search + one collapsible group per category.
  const drawer = el("div", { class: "nav-drawer", id: "nav-drawer", hidden: true, role: "dialog", "aria-label": "Menu" });
  const drawerHead = el("div", { class: "nav-drawer-head" },
    el("strong", { text: "Browse tools" }),
    el("button", { type: "button", class: "nav-icon-btn", "aria-label": "Close menu", text: "✕" }));
  drawer.append(drawerHead);
  const drawerSearch = searchControl("drawer-search");
  drawer.append(drawerSearch.wrap);
  CATEGORIES.forEach((cat) => {
    const items = toolsInCategory(cat.id);
    if (!items.length) return;
    const det = el("details", { class: "drawer-group" });
    det.append(el("summary", {}, el("span", { text: cat.name }), el("small", { text: String(items.length) })));
    const list = el("div", { class: "drawer-list" });
    items.forEach((t) => list.append(el("a", { href: t.href, text: t.title })));
    det.append(list);
    drawer.append(det);
  });
  drawer.append(el("a", { class: "button button-primary button-small", href: "directory.html", text: `Open the full directory (${total})` }));
  document.body.append(drawer);

  const setDrawer = (open) => {
    drawer.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("drawer-open", open);
  };
  burger.addEventListener("click", () => setDrawer(drawer.hidden));
  drawerHead.querySelector("button").addEventListener("click", () => setDrawer(false));
  drawer.addEventListener("click", (e) => { if (e.target.closest("a")) setDrawer(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) { setDrawer(false); burger.focus(); } });
}
// A keyboard/deep-link entry point for the command palette in the header.
if (SITE.features.commandPalette) {
  const slot = nav || document.querySelector(".site-header");
  if (slot && !slot.querySelector("[data-cmdk]")) {
    slot.append(el("button", { type: "button", class: "cmd-trigger", "data-cmdk": true, "aria-label": "Open command palette", text: "Search  ⌘K" }));
  }
}

// ---------------------------------------------------------------- footer compliance bar
const footer = document.querySelector(".site-footer");
if (footer && !document.querySelector(".compliance-bar")) {
  const bar = el("div", { class: "compliance-bar container", role: "region", "aria-label": "Disclaimers and legal links" });
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
hydrateIcons();
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
