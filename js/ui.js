// PARCHXA UI motion layer: header state, mobile menu, theme toggle, scroll progress, reveal-on-scroll,
// card spotlight, hero tilt, count-up, button ripples, result flash. Progressive: the site works without it.
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const isTerminal = document.body.classList.contains("ts-page");
const hasInvoiceUi = !!document.querySelector(".iv-app");
const THEME_KEY = "parchxa.theme.v1";
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); n.append(...kids); return n; };

// ---- theme (light is only offered on pages whose layouts are fully themed) ----
if (!isTerminal) {
  let stored = "dark"; try { stored = localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch {}
  root.dataset.theme = hasInvoiceUi ? "light" : stored;
}
const header = document.querySelector(".site-header");
if (header && !isTerminal) {
  const tools = el("div", { class: "nav-tools" });
  if (!hasInvoiceUi && !document.querySelector("#theme-toggle")) {
    const t = el("button", { type: "button", class: "icon-btn", "aria-label": "Toggle light or dark theme" });
    const paint = () => { const light = root.dataset.theme === "light"; t.textContent = light ? "☾" : "☀"; t.setAttribute("aria-pressed", String(light)); };
    t.addEventListener("click", () => { const next = root.dataset.theme === "light" ? "dark" : "light"; root.dataset.theme = next; try { localStorage.setItem(THEME_KEY, next); } catch {} paint(); });
    paint(); tools.append(t);
  }
  const burger = el("button", { type: "button", class: "icon-btn nav-toggle", "aria-label": "Open menu", "aria-expanded": "false" }, "☰");
  const setOpen = (open) => { header.classList.toggle("nav-open", open); burger.setAttribute("aria-expanded", String(open)); burger.textContent = open ? "✕" : "☰"; };
  burger.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!header.classList.contains("nav-open")); });
  document.addEventListener("click", (e) => { if (header.classList.contains("nav-open") && !header.contains(e.target)) setOpen(false); });
  header.addEventListener("click", (e) => { if (e.target.closest(".nav-links a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  tools.append(burger); header.append(tools);
}

// ---- scroll progress, header shadow, back to top ----
if (!isTerminal) {
  const bar = el("div", { class: "scroll-progress", "aria-hidden": "true" });
  const top = el("button", { type: "button", class: "icon-btn to-top", "aria-label": "Back to top" }, "↑");
  top.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
  document.body.append(bar, top);
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight, y = scrollY;
    bar.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : "0");
    header?.classList.toggle("is-scrolled", y > 8); top.classList.toggle("show", y > 700);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// ---- reveal on scroll ----
if (!reduce && !isTerminal && !hasInvoiceUi && "IntersectionObserver" in window) {
  const SEL = ".page-intro, .section-heading, .tool-card, .calculator-card, .value-strip > div, .stats-row > div, .hv-window, .content-block, .aff-card, .dir-search, .dir-chips, .marquee, .notice, .actions-row";
  const items = [...document.querySelectorAll(SEL)].filter((n) => !n.closest(".iv-app, [hidden]"));
  const counters = new Map();
  items.forEach((n) => { const p = n.parentElement, i = counters.get(p) || 0; counters.set(p, i + 1); n.style.setProperty("--d", Math.min(i, 8) * 0.07 + "s"); n.classList.add("reveal"); });
  root.classList.add("js");
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return; const n = en.target; io.unobserve(n); n.classList.add("in");
    n.addEventListener("transitionend", (ev) => { if (ev.propertyName === "transform") { n.classList.remove("reveal", "in"); n.style.removeProperty("--d"); } }, { once: true });
  }), { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
  items.forEach((n) => io.observe(n));
}

// ---- card spotlight + hero tilt/glow ----
if (finePointer && !isTerminal) {
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".tool-card");
    if (card) { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", e.clientX - r.left + "px"); card.style.setProperty("--my", e.clientY - r.top + "px"); }
    const hero = e.target.closest?.(".hero");
    if (hero) { const r = hero.getBoundingClientRect(); hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%"); hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%"); }
    const vis = e.target.closest?.(".hero-visual");
    if (vis && !reduce) { const w = vis.querySelector(".hv-window"), r = vis.getBoundingClientRect(); if (w) { w.style.setProperty("--rx", (((e.clientX - r.left) / r.width - 0.5) * 7).toFixed(2)); w.style.setProperty("--ry", ((0.5 - (e.clientY - r.top) / r.height) * 5).toFixed(2)); } }
  }, { passive: true });
  document.addEventListener("pointerout", (e) => { const vis = e.target.closest?.(".hero-visual"); if (vis && !vis.contains(e.relatedTarget)) { const w = vis.querySelector(".hv-window"); w?.style.setProperty("--rx", "0"); w?.style.setProperty("--ry", "0"); } });
}

// ---- button ripple ----
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest?.(".button"); if (!b || reduce || hasInvoiceUi) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = el("span", { class: "ripple" });
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.append(s); setTimeout(() => s.remove(), 650);
});

// ---- count-up ----
const counters = document.querySelectorAll("[data-count]");
if (counters.length) {
  const run = (n) => {
    const target = Number(n.dataset.count) || 0, suffix = n.dataset.suffix || "";
    if (reduce) { n.textContent = target.toLocaleString() + suffix; return; }
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); n.textContent = Math.round(target * e).toLocaleString() + suffix; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } }), { threshold: 0.6 }); counters.forEach((n) => io.observe(n)); }
  else counters.forEach(run);
}

// ---- marquee: duplicate once for a seamless loop ----
document.querySelectorAll(".marquee-track").forEach((track) => { [...track.children].forEach((c) => { const d = c.cloneNode(true); d.setAttribute("aria-hidden", "true"); track.append(d); }); });

// ---- flash calculator results when their value changes ----
if (!reduce && !isTerminal && "MutationObserver" in window) {
  const pending = new Set();
  new MutationObserver((muts) => {
    for (const m of muts) { const base = m.target.nodeType === 3 ? m.target.parentElement : m.target; const s = base?.closest?.(".result-panel strong"); if (s) pending.add(s); }
    if (pending.size) requestAnimationFrame(() => { pending.forEach((s) => { s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash"); }); pending.clear(); });
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
}
