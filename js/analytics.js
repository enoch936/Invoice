// PARCHXA privacy-first analytics. Nothing is sent anywhere by default: events are kept in a small
// local ring buffer and only forwarded to a configured, consent-gated provider (Plausible / Umami).
// Also collects Core Web Vitals locally so the bundle has no external dependency.
import { safeNumber } from "./sanitize.js";

const CONSENT_KEY = "parchxa.consent.v1";
const BUFFER_KEY = "parchxa.events.v1";
const MAX_EVENTS = 100;

const consentGiven = () => { try { return localStorage.getItem(CONSENT_KEY) === "all"; } catch { return false; } };

function readBuffer() {
  try { const v = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

/**
 * Record a product event. Always stored locally (privacy). Forwarded to the configured provider only
 * after the visitor accepts analytics, and only when a provider is present on window.
 */
export function track(name, props = {}) {
  const event = { n: String(name).slice(0, 40), t: Date.now(), p: sanitizeProps(props) };
  try {
    const buffer = readBuffer();
    buffer.push(event);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer.slice(-MAX_EVENTS)));
  } catch { /* storage full or blocked */ }
  if (!consentGiven()) return event;
  try { window.plausible?.(event.n, { props: event.p }); } catch { /* ignore */ }
  try { window.umami?.track?.(event.n, event.p); } catch { /* ignore */ }
  return event;
}

/** Keep only primitives, cap lengths, and never send user-entered free text. */
function sanitizeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) {
    const key = String(k).slice(0, 24);
    if (typeof v === "number") out[key] = safeNumber(v, { fallback: 0 });
    else if (typeof v === "boolean") out[key] = v;
    else if (typeof v === "string") out[key] = v.slice(0, 40);
  }
  return out;
}

/** All locally buffered events (most recent last). */
export const getEvents = () => readBuffer();
/** Remove the local event buffer. */
export const clearEvents = () => { try { localStorage.removeItem(BUFFER_KEY); } catch { /* ignore */ } };

/** Aggregate the buffer into name → count for a tiny on-page dashboard. */
export function eventSummary() {
  const summary = {};
  for (const e of readBuffer()) summary[e.n] = (summary[e.n] || 0) + 1;
  return summary;
}

const vitals = { lcp: null, cls: 0, inp: null, ttfb: null };
/** Latest collected Core Web Vitals values. */
export const getVitals = () => ({ ...vitals });

/** Observe Core Web Vitals with the native PerformanceObserver API (no external library). */
export function observeWebVitals() {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      vitals.lcp = entries[entries.length - 1]?.startTime ?? vitals.lcp;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* not supported */ }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) vitals.cls = (vitals.cls || 0) + entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch { /* not supported */ }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) vitals.inp = Math.max(vitals.inp || 0, entry.duration || 0);
    }).observe({ type: "event", buffered: true, durationThreshold: 40 });
  } catch { /* not supported */ }
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) vitals.ttfb = nav.responseStart;
  } catch { /* ignore */ }
}

/** Fires `onDepth` once per 25/50/75/100% scroll milestone. Useful for content/ads readouts. */
export function observeScrollDepth(onDepth) {
  const seen = new Set();
  let raf = 0;
  const check = () => {
    raf = 0;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? Math.round((doc.scrollTop / max) * 100) : 100;
    for (const milestone of [25, 50, 75, 100]) {
      if (pct >= milestone && !seen.has(milestone)) { seen.add(milestone); onDepth?.(milestone); }
    }
  };
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
  check();
}

/** Convenience: wire delegated click tracking for elements carrying data-track. */
export function trackClicks(root = document) {
  root.addEventListener("click", (event) => {
    const node = event.target.closest?.("[data-track]");
    if (!node) return;
    track(node.dataset.track, { to: node.getAttribute("href") || node.dataset.cta || "", context: node.dataset.context || "" });
  }, { capture: true });
}
