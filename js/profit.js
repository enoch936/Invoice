// Crypto/asset profit calculator controller, shared by the generated profit-*.html pages.
// The coin identity comes from the container's data attributes; all maths uses the pure engine in quant.js.
import "./app.js";
import "./site.js";
import { profitLoss } from "./quant.js";
import { safeQueryNumber } from "./sanitize.js";

const MAX_PRICE = 1e12; // guard against absurd inputs

const card = document.querySelector(".calculator-card[data-coin]");
if (card) {
  const coin = card.dataset.coin || "";
  const symbol = (card.dataset.symbol || "").toUpperCase();
  const slug = card.dataset.slug || "asset";
  const $ = (id) => document.getElementById(id);
  const clamp = (n, lo, hi, fallback) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback);
  const fmtMoney = (n) => {
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: Math.abs(n) < 1 ? 6 : 2 }).format(n);
  };
  const fmtPct = (n) => (Number.isFinite(n) ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—");
  const num = (el, fallback) => clamp(Number(el?.value), 0, MAX_PRICE, fallback);

  const params = new URLSearchParams(location.search);
  const setField = (name, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    const f = card.elements.namedItem(name);
    if (f && value != null && value !== "") f.value = String(value).slice(0, 16);
  };
  setField("entry", safeQueryNumber(params, "entry", { min: 0, max: MAX_PRICE }));
  setField("exit", safeQueryNumber(params, "exit", { min: 0, max: MAX_PRICE }));
  setField("quantity", safeQueryNumber(params, "qty", { min: 0, max: MAX_PRICE }));
  function compute() {
    const entry = num(card.elements.entry, 1);
    const exit = num(card.elements.exit, 1);
    const quantity = num(card.elements.quantity, 1);
    const feePct = clamp(Number(card.elements.fee?.value), 0, 25, 0.1);
    const side = card.elements.side?.value === "short" ? "short" : "long";

    const r = profitLoss({ entry, exit, quantity, feePct, side });
    const out = $("out"), line = $("detail");
    if (!r) {
      out.textContent = "—";
      line.textContent = "Enter prices above 0 and a quantity above 0 to see the result.";
      renderTable(entry, quantity, feePct, side);
      syncUrl(entry, exit, quantity, feePct, side);
      return;
    }
    out.textContent = fmtMoney(r.net);
    out.classList.toggle("is-loss", r.net < 0);
    const invested = entry * quantity;
    line.textContent = `Invested ${fmtMoney(invested)} · gross P/L ${fmtMoney(r.gross)} · fees ${fmtMoney(r.fees)} · return ${fmtPct(r.returnPct)}. Break-even sell price about ${fmtMoney(r.breakevenExit)}.`;
    renderTable(entry, quantity, feePct, side);
    syncUrl(entry, exit, quantity, feePct, side);
  }

  function renderTable(entry, quantity, feePct, side) {
    const body = $("tbl");
    if (!body) return;
    body.replaceChildren();
    [-30, -15, -5, 5, 15, 30, 50, 100].forEach((pct) => {
      const target = entry * (1 + pct / 100);
      const r = profitLoss({ entry, exit: target, quantity, feePct, side });
      if (!r) return;
      const tr = document.createElement("tr");
      [fmtMoney(target), fmtMoney(r.net), fmtPct(r.returnPct)].forEach((t) =>
        tr.append(Object.assign(document.createElement("td"), { textContent: t })));
      body.append(tr);
    });
  }

  function syncUrl(entry, exit, quantity, feePct, side) {
    const p = new URLSearchParams({ entry: String(entry), exit: String(exit), qty: String(quantity) });
    if (feePct !== 0.1) p.set("fee", String(feePct));
    if (side !== "long") p.set("side", side);
    try { history.replaceState(null, "", "?" + p.toString()); } catch { /* ignore */ }
  }

  card.addEventListener("input", compute);
  card.addEventListener("change", compute);
  card.addEventListener("submit", (e) => { e.preventDefault(); compute(); });

  // Swap buy/sell prices.
  card.querySelector("#swap-prices")?.addEventListener("click", () => {
    const a = card.elements.entry.value, b = card.elements.exit.value;
    card.elements.entry.value = b; card.elements.exit.value = a; compute();
  });

  // Optional live market price (Binance public API; no key, no tracking).
  // Ticker symbols sometimes differ on an exchange, so a couple of aliases are handled here.
  const TICKER_ALIAS = { MATIC: "POL" };
  const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];
  const liveBtn = card.querySelector("#live-price");
  const liveNote = $("live-note");

  async function fetchLivePrice(sym) {
    const ticker = (TICKER_ALIAS[sym] || sym) + "USDT";
    for (const host of HOSTS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(`${host}/api/v3/ticker/price?symbol=${ticker}`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const price = Number((await res.json()).price);
        if (!Number.isFinite(price) || price <= 0) throw new Error("bad price");
        return price;
      } catch { /* try the next host */ }
    }
    return null;
  }

  liveBtn?.addEventListener("click", async () => {
    liveNote?.classList.remove("is-error");
    if (liveNote) liveNote.textContent = "Fetching the live price…";
    liveBtn.disabled = true;
    const price = await fetchLivePrice(symbol);
    liveBtn.disabled = false;

    if (price == null) {
      if (liveNote) {
        liveNote.textContent = "Couldn't reach the market data (offline, blocked or rate-limited). Enter your own prices — the calculator still works.";
        liveNote.classList.add("is-error");
      }
      return;
    }

    // Fill the sell price, and the buy price too if it is still empty.
    setField("exit", Number(price.toFixed(price < 1 ? 6 : 2)));
    if (!(Number(card.elements.entry?.value) > 0)) setField("entry", Number(price.toFixed(price < 1 ? 6 : 2)));
    compute();
    if (liveNote) {
      const when = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      liveNote.textContent = `Live ${symbol} price ${fmtMoney(price)} (Binance, ${when}). Update the numbers to match your own trade.`;
    }
  });

  compute();

  // Live share card with the current numbers.
  globalThis.parchxaShareSpecs = Object.assign(globalThis.parchxaShareSpecs || {}, {
    [`profit-${slug}`]: () => {
      const entry = num(card.elements.entry, 1), exit = num(card.elements.exit, 1);
      const quantity = num(card.elements.quantity, 1), feePct = clamp(Number(card.elements.fee?.value), 0, 25, 0.1);
      const r = profitLoss({ entry, exit, quantity, feePct, side: card.elements.side?.value === "short" ? "short" : "long" });
      return {
        theme: "night",
        badge: `${coin} P/L`,
        title: `My ${coin} (${symbol}) position result`,
        headline: r ? fmtPct(r.returnPct) : coin,
        subheadline: r ? `${fmtMoney(r.net)} net after fees` : "",
        lines: [`Entry ${fmtMoney(entry)} → Exit ${fmtMoney(exit)}`, "Calculate your own on PARCHXA"].filter(Boolean),
        footer: "parchxa · free crypto profit calculator",
      };
    },
  });
}
