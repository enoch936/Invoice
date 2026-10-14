import "./app.js";
import "./site.js";
import { positionSize, rMultiples, breakevenWinRate, expectancyR, kelly, liquidationPrice, monteCarlo, backtestEmaCross, atr, historicalVolatility } from "./quant.js";

const $ = (id) => document.getElementById(id);
const val = (form, name) => Number(form.elements[name]?.value);
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "—");
const set = (id, text) => { const n = $(id); if (n) n.textContent = text; };

// URL state (shareable)
const params = new URLSearchParams(location.search);
document.querySelectorAll("form.calc-form").forEach((form) => {
  for (const [k, v] of params) { if (!k.startsWith(form.id + ".")) continue; const f = form.elements.namedItem(k.slice(form.id.length + 1)); if (f && v !== "" && v.length < 24) f.value = v; }
});
function syncUrl() {
  const p = new URLSearchParams();
  document.querySelectorAll("form.calc-form").forEach((form) => [...form.elements].forEach((f) => { if (f.name && f.value !== "") p.set(form.id + "." + f.name, f.value); }));
  history.replaceState(null, "", "?" + p.toString());
}

function calcSize() {
  const f = $("size-form");
  const r = positionSize({ equity: val(f, "equity"), riskPct: val(f, "riskPct"), entry: val(f, "entry"), stop: val(f, "stop"), feePct: val(f, "fee") });
  if (!r) { set("size-result", "—"); set("size-detail", "Enter positive equity, risk %, entry and a stop that differs from entry."); return; }
  set("size-result", fmt(r.units, 6) + " units");
  const target = val(f, "target");
  const rm = Number.isFinite(target) && target > 0 ? rMultiples({ entry: val(f, "entry"), stop: val(f, "stop"), targets: [target] })[0] : null;
  set("size-detail", `${r.side.toUpperCase()} · risking ${fmt(r.riskAmount)} · position value ${fmt(r.notional)} · stop ${fmt(r.stopDistancePct)}% away` + (rm ? ` · target = ${fmt(rm.r)}R` : ""));
}
function calcLiq() {
  const f = $("liq-form");
  const lev = val(f, "leverage"), entry = val(f, "lentry"), side = f.elements.side.value, mmr = val(f, "mmr") / 100;
  if (!(entry > 0)) { set("liq-result", "—"); set("liq-detail", "Enter an entry price (or load the live price above) and a leverage of at least 1."); return; }
  const price = liquidationPrice({ entry, leverage: lev, side, mmr });
  set("liq-result", fmt(price));
  set("liq-detail", Number.isFinite(price) ? `≈ ${fmt(Math.abs(price - entry) / entry * 100)}% against your entry. Exchanges use different formulas; always verify on your venue.` : "Enter an entry price and leverage of at least 1.");
}
function calcEdge() {
  const f = $("edge-form");
  const winRaw = String(f.elements.win?.value ?? "").trim();
  const rrRaw = String(f.elements.rr?.value ?? "").trim();
  const p = Number(winRaw) / 100, b = Number(rrRaw);
  if (winRaw === "" || rrRaw === "" || !(p >= 0 && p <= 1) || !(b > 0)) {
    set("edge-result", "—");
    set("edge-detail", "Enter your win rate and average reward : risk to see the break-even win rate and Kelly sizing.");
    return;
  }
  const be = breakevenWinRate(b) * 100, ex = expectancyR(p, b), k = kelly(p, b) * 100;
  set("edge-result", Number.isFinite(ex) ? fmt(ex, 3) + " R per trade" : "—");
  set("edge-detail", `Break-even win rate ${fmt(be, 1)}% · full Kelly ${fmt(k, 1)}% · half Kelly ${fmt(k / 2, 1)}% of equity per trade (before fees). Kelly assumes your inputs are exact; they never are.`);
}

function drawFan(res) {
  const c = $("fan"); if (!c || !res) return;
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = 280;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim() || "#b5f36d", muted = css.getPropertyValue("--muted").trim() || "#9ba9bd", line = css.getPropertyValue("--line").trim() || "#26334a";
  const [b5, b25, b50, b75, b95] = res.bands, n = b50.length;
  const lo = Math.min(...b5, 1), hi = Math.max(...b95, 1), pad = { l: 44, r: 10, t: 10, b: 24 };
  const X = (i) => pad.l + (i / (n - 1)) * (w - pad.l - pad.r), Y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  g.strokeStyle = line; g.fillStyle = muted; g.font = "10px sans-serif"; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke(); g.fillText(v.toFixed(2) + "×", 4, y + 3); }
  const band = (upper, lower, alpha) => { g.beginPath(); upper.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); for (let i = n - 1; i >= 0; i--) g.lineTo(X(i), Y(lower[i])); g.closePath(); g.globalAlpha = alpha; g.fillStyle = accent; g.fill(); g.globalAlpha = 1; };
  band(b95, b5, 0.14); band(b75, b25, 0.28);
  g.beginPath(); b50.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.strokeStyle = accent; g.lineWidth = 2; g.stroke();
  g.strokeStyle = muted; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pad.l, Y(1)); g.lineTo(w - pad.r, Y(1)); g.stroke(); g.setLineDash([]);
  g.fillStyle = muted; g.fillText("trade 0", pad.l, h - 6); g.fillText("trade " + (n - 1), w - pad.r - 42, h - 6);
}
function calcMc() {
  const f = $("mc-form");
  const winRaw = String(f.elements.win?.value ?? "").trim();
  const rrRaw = String(f.elements.rr?.value ?? "").trim();
  if (winRaw === "" || rrRaw === "") {
    set("mc-result", "—");
    set("mc-detail", "Enter your win rate and reward : risk to run the Monte Carlo simulation.");
    return;
  }
  const res = monteCarlo({ p: val(f, "win") / 100, b: val(f, "rr"), riskFrac: val(f, "risk") / 100, trades: Math.min(500, Math.max(10, val(f, "trades") || 100)), paths: 1000, seed: 42, ruinPct: val(f, "ruin") / 100 });
  if (!res) { set("mc-result", "—"); set("mc-detail", "Win rate must be 0–100%, reward:risk above 0, risk between 0% and 100%."); return; }
  set("mc-result", `${fmt(res.probRuin * 100, 1)}% chance of ruin`);
  const [b5, , b50, , b95] = res.bands, last = b50.length - 1;
  set("mc-detail", `1,000 simulated paths (seed 42). Median ending equity ${fmt(b50[last], 2)}×; 5th–95th percentile ${fmt(b5[last], 2)}×–${fmt(b95[last], 2)}×. Median worst drawdown ${fmt(res.medianMaxDrawdown * 100, 1)}%, 95th percentile ${fmt(res.p95MaxDrawdown * 100, 1)}%.`);
  $("fan").setAttribute("aria-label", `Monte Carlo equity fan chart. Median ending equity ${fmt(b50[last], 2)} times start, ranging ${fmt(b5[last], 2)} to ${fmt(b95[last], 2)} between the 5th and 95th percentile.`);
  drawFan(res);
}

const run = { "size-form": calcSize, "liq-form": calcLiq, "edge-form": calcEdge, "mc-form": calcMc };
for (const [id, fn] of Object.entries(run)) {
  const form = $(id); if (!form) continue;
  form.addEventListener("input", () => { fn(); syncUrl(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); fn(); });
  fn();
}
let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(calcMc, 150); });

// ---------------------------------------------------------------- live market data
// Real Binance candles measured into the calculators below. Never simulated, never pre-filled.
const MARKET_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "LINKUSDT", "LTCUSDT", "DOTUSDT", "TRXUSDT", "POLUSDT"];
const MARKET_HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];

async function fetchKlines(symbol, interval = "1h", limit = 500) {
  let lastErr;
  for (const host of MARKET_HOSTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(`${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = (await res.json())
          .map((k) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }))
          .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite));
        if (data.length < 60) throw new Error("short series");
        return data;
      } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); }
    }
  }
  throw lastErr;
}

function tile(k, v) {
  const d = document.createElement("div");
  d.className = "stat";
  d.append(Object.assign(document.createElement("span"), { textContent: k }), Object.assign(document.createElement("strong"), { textContent: String(v) }));
  return d;
}

let marketData = null;

async function loadMarket() {
  const status = $("market-status"), stats = $("market-stats"), actions = $("market-actions");
  if (!status || !stats) return;
  const symbol = $("market-symbol")?.value || "BTCUSDT";
  status.classList.remove("warn");
  status.textContent = "Loading live " + symbol + " candles from Binance…";
  actions.hidden = true;
  $("market-load").disabled = true;
  try {
    const candles = await fetchKlines(symbol, "1h", 500);
    const closes = candles.map((c) => c.close);
    const price = candles[candles.length - 1].close;
    const atrArr = atr(candles, 14), atrLast = atrArr[atrArr.length - 1];
    const volArr = historicalVolatility(closes, { period: 24, periodsPerYear: 24 * 365 }), vol = volArr[volArr.length - 1];
    const bt = backtestEmaCross(candles, { fast: 9, slow: 21 });
    const m = bt?.stats, trades = bt?.trades ?? [];
    const wins = trades.filter((x) => x.returnPct > 0), losses = trades.filter((x) => x.returnPct <= 0);
    const avgWin = wins.length ? wins.reduce((a, x) => a + x.returnPct, 0) / wins.length : NaN;
    const avgLoss = losses.length ? Math.abs(losses.reduce((a, x) => a + x.returnPct, 0) / losses.length) : NaN;
    const rr = avgLoss > 0 ? avgWin / avgLoss : NaN;
    marketData = { symbol, price, atr: atrLast, vol, winRate: m?.winRate, rr, trades: trades.length, expectancyPct: m?.expectancyPct };
    const dp = price < 10 ? 4 : 2;
    stats.replaceChildren(
      tile("Last price (USD)", fmt(price, price < 10 ? 6 : 2)),
      tile("ATR(14)", Number.isFinite(atrLast) ? `${fmt(atrLast, atrLast < 10 ? 4 : 2)} (${fmt((atrLast / price) * 100, 2)}%)` : "—"),
      tile("Realised volatility (annualised)", Number.isFinite(vol) ? fmt(vol, 1) + "%" : "—"),
      tile("Backtest trades", String(trades.length)),
      tile("Measured win rate", Number.isFinite(m?.winRate) ? fmt(m.winRate, 1) + "%" : "—"),
      tile("Measured reward:risk", Number.isFinite(marketData.rr) ? fmt(marketData.rr, 2) : "—"),
      tile("Expectancy / trade", Number.isFinite(m?.expectancyPct) ? fmt(m.expectancyPct, 3) + "%" : "—"),
    );
    const when = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    status.textContent = `Live market data from Binance public API — ${symbol} 1h, ${candles.length} candles, loaded ${when}. Real prices, no substitutes.`;
    actions.hidden = false;
  } catch {
    marketData = null;
    stats.replaceChildren();
    const offline = navigator.onLine === false;
    status.textContent = `Could not load live data — ${offline ? "you appear to be offline" : "the market feed is blocked, rate limited or unreachable"}. Real prices only: no simulated or substitute numbers are shown. Enter your own values below.`;
    status.classList.add("warn");
  } finally {
    $("market-load").disabled = false;
  }
}

function useLivePriceForSize() {
  if (!marketData) return;
  const f = $("size-form"), p = marketData.price, atrLast = marketData.atr;
  const dp = p < 10 ? 4 : 2;
  const stop = Number.isFinite(atrLast) && atrLast > 0 ? Math.max(0, p - 1.5 * atrLast) : p * 0.98;
  f.elements.entry.value = String(Number(p.toFixed(dp)));
  f.elements.stop.value = String(Number(stop.toFixed(stop < 10 ? 4 : 2)));
  f.elements.target.value = "";
  const lf = $("liq-form");
  if (lf?.elements.lentry) lf.elements.lentry.value = String(Number(p.toFixed(dp)));
  calcSize(); calcLiq(); syncUrl();
  scrollTo0("size-form");
}

function useMeasuredEdge() {
  if (!marketData || !Number.isFinite(marketData.winRate) || !Number.isFinite(marketData.rr)) return;
  const win = Math.round(marketData.winRate * 10) / 10, rr = Math.round(marketData.rr * 100) / 100;
  for (const id of ["edge-form", "mc-form"]) {
    const f = $(id); if (!f) continue;
    if (f.elements.win) f.elements.win.value = String(win);
    if (f.elements.rr) f.elements.rr.value = String(rr);
  }
  calcEdge(); calcMc(); syncUrl();
  scrollTo0("mc-form");
}

function scrollTo0(id) {
  const el = $(id)?.closest(".calculator-card") || $(id);
  try { el?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* ignore */ }
}

const marketSel = $("market-symbol");
if (marketSel) {
  MARKET_SYMBOLS.forEach((s) => marketSel.add(new Option(s.replace("USDT", "/USDT"), s)));
  marketSel.addEventListener("change", loadMarket);
  $("market-load").addEventListener("click", loadMarket);
  $("use-market-prices").addEventListener("click", useLivePriceForSize);
  $("use-market-edge").addEventListener("click", useMeasuredEdge);
  loadMarket();
}

