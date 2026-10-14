import "./app.js";
import "./site.js";
import { ema, rsi, backtestEmaCross } from "./quant.js";

const $ = (id) => document.getElementById(id);
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"];
const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];
// No synthetic fallback: if the live feed is unreachable we show an explicit error state,
// never substitute prices. `st.key` tracks which symbol+interval the loaded candles belong to.
const st = { symbol: "BTCUSDT", interval: "1h", key: "", candles: [], ws: null, live: false, log: false };
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "—");
const cache = new Map();

async function fetchCandles(symbol, interval) {
  const key = symbol + interval, hit = cache.get(key);
  if (hit && Date.now() - hit.t < 30000) return hit.data;
  let lastErr;
  for (const host of HOSTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(`${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const rows = await res.json();
        const data = rows.map((r) => ({ time: r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] })).filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite));
        if (data.length < 50) throw new Error("short series");
        cache.set(key, { t: Date.now(), data }); return data;
      } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); }
    }
  }
  throw lastErr;
}

function draw() {
  const c = $("price"); if (!c || !st.candles.length) return;
  const params = readParams(), fast = params.fast, slow = params.slow;
  const view = Math.min(st.candles.length, 160), all = st.candles, off = all.length - view, vis = all.slice(off);
  const closes = all.map((x) => x.close), f = ema(closes, fast), s = ema(closes, slow), r = rsi(closes, 14);
  const bt = backtestEmaCross(all, params);
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = 420;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim() || "#b5f36d", muted = css.getPropertyValue("--muted").trim() || "#9ba9bd", line = css.getPropertyValue("--line").trim() || "#26334a";
  const up = "#3ecf8e", down = "#ff6b6b", L = 52, R = 8, priceH = 250, volTop = 262, volH = 40, rsiTop = 318, rsiH = 80;
  let hi = Math.max(...vis.map((x) => x.high)), lo = Math.min(...vis.map((x) => x.low));
  const tf = st.log ? Math.log : (x) => x;
  const pad = (hi - lo) * 0.05; hi += pad; lo = Math.max(lo - pad, 1e-9);
  const X = (i) => L + ((i + 0.5) / view) * (w - L - R), Y = (v) => 8 + (1 - (tf(v) - tf(lo)) / (tf(hi) - tf(lo) || 1)) * (priceH - 8), bw = Math.max(1, (w - L - R) / view * 0.7);
  g.font = "10px sans-serif"; g.lineWidth = 1; g.strokeStyle = line; g.fillStyle = muted;
  for (let k = 0; k <= 4; k++) { const v = st.log ? Math.exp(tf(lo) + (tf(hi) - tf(lo)) * k / 4) : lo + (hi - lo) * k / 4, y = Y(v); g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillText(fmt(v, v < 10 ? 4 : 2), 2, y + 3); }
  const vmax = Math.max(...vis.map((x) => x.volume)) || 1;
  vis.forEach((cd, i) => {
    const col = cd.close >= cd.open ? up : down, x = X(i);
    g.strokeStyle = col; g.fillStyle = col; g.beginPath(); g.moveTo(x, Y(cd.high)); g.lineTo(x, Y(cd.low)); g.stroke();
    const y1 = Y(cd.open), y2 = Y(cd.close); g.fillRect(x - bw / 2, Math.min(y1, y2), bw, Math.max(1, Math.abs(y1 - y2)));
    g.globalAlpha = 0.35; g.fillRect(x - bw / 2, volTop + volH - (cd.volume / vmax) * volH, bw, (cd.volume / vmax) * volH); g.globalAlpha = 1;
  });
  const lineOf = (arr, col) => { g.beginPath(); let started = false; vis.forEach((_, i) => { const v = arr[off + i]; if (!Number.isFinite(v)) return; started ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); started = true; }); g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1; };
  lineOf(f, "#8dafff"); lineOf(s, "#f5b942");
  if (bt) for (const sg of bt.signals) { const i = sg.index + 1 - off; if (i < 0 || i >= view) continue; const x = X(i), buy = sg.side === "buy", y = buy ? Y(vis[i].low) + 10 : Y(vis[i].high) - 10; g.fillStyle = buy ? up : down; g.beginPath(); g.moveTo(x, y + (buy ? -8 : 8)); g.lineTo(x - 5, y + (buy ? 4 : -4)); g.lineTo(x + 5, y + (buy ? 4 : -4)); g.closePath(); g.fill(); }
  g.fillStyle = muted; g.fillText("EMA " + fast, L + 4, 18); g.fillStyle = "#8dafff"; g.fillRect(L + 36, 11, 12, 3); g.fillStyle = muted; g.fillText("EMA " + slow, L + 56, 18); g.fillStyle = "#f5b942"; g.fillRect(L + 92, 11, 12, 3);
  // RSI pane
  g.strokeStyle = line; g.strokeRect(L, rsiTop, w - L - R, rsiH); [30, 70].forEach((lv) => { const y = rsiTop + (1 - lv / 100) * rsiH; g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillStyle = muted; g.fillText(String(lv), 24, y + 3); });
  g.beginPath(); let go = false; vis.forEach((_, i) => { const v = r[off + i]; if (!Number.isFinite(v)) return; const y = rsiTop + (1 - v / 100) * rsiH; go ? g.lineTo(X(i), y) : g.moveTo(X(i), y); go = true; }); g.strokeStyle = accent; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
  g.fillStyle = muted; g.fillText("RSI 14", L + 4, rsiTop + 12);
  const lastC = all[all.length - 1];
  g.fillText(new Date(vis[0].time).toLocaleDateString(), L, h - 6); g.fillText(new Date(lastC.time).toLocaleString(), w - R - 120, h - 6);
  c.setAttribute("aria-label", `${st.symbol} ${st.interval} candlestick chart. Last close ${fmt(lastC.close, 4)}. EMA ${fast} is ${f[all.length - 1] > s[all.length - 1] ? "above" : "below"} EMA ${slow}. RSI ${fmt(r[all.length - 1], 1)}.`);
  renderSignals(all, f, s, r, bt);
}

function renderSignals(all, f, s, r, bt) {
  const i = all.length - 1, close = all[i].close, roc = i >= 10 ? (close / all[i - 10].close - 1) * 100 : NaN;
  const parts = [
    ["Trend: fast EMA above slow EMA", f[i] > s[i] ? 25 : 0],
    ["Price above slow EMA", close > s[i] ? 25 : 0],
    ["RSI between 45 and 70", r[i] >= 45 && r[i] <= 70 ? 25 : r[i] > 70 ? 8 : 0],
    ["10-bar momentum positive", roc > 0 ? 25 : 0],
  ];
  const score = parts.reduce((a, p) => a + p[1], 0);
  $("score").textContent = String(score);
  $("meter").style.width = score + "%";
  $("score-detail").textContent = score >= 75 ? "Bullish confluence" : score >= 50 ? "Mixed, leaning bullish" : score >= 25 ? "Mixed, leaning bearish" : "Bearish confluence";
  $("score-parts").replaceChildren(...parts.map(([t, p]) => Object.assign(document.createElement("li"), { textContent: `${p > 0 ? "✓" : "✗"} ${t}` })));
  const stt = $("bt-stats"); stt.replaceChildren();
  if (!bt) { stt.textContent = "Not enough candles to backtest."; return; }
  const m = bt.stats, rows = [["Trades", m.trades], ["Win rate", fmt(m.winRate, 1) + "%"], ["Profit factor", fmt(m.profitFactor, 2)], ["Expectancy / trade", fmt(m.expectancyPct, 2) + "%"], ["Total return", fmt(m.totalReturnPct, 1) + "%"], ["Max drawdown", fmt(m.maxDrawdownPct, 1) + "%"], ["Sharpe (per bar)", fmt(m.sharpePerBar, 3)], ["Sortino (per bar)", fmt(m.sortinoPerBar, 3)]];
  rows.forEach(([k, v]) => { const d = document.createElement("div"); d.className = "stat"; d.append(Object.assign(document.createElement("span"), { textContent: k }), Object.assign(document.createElement("strong"), { textContent: String(v) })); stt.append(d); });
  window.__trades = bt.trades; renderTrades();
}
let sortKey = "entryTime", sortDir = -1;
function renderTrades() {
  const body = $("trades"); body.replaceChildren();
  const rows = [...(window.__trades || [])].sort((a, b) => (a[sortKey] - b[sortKey]) * sortDir);
  rows.slice(0, 100).forEach((t) => { const tr = document.createElement("tr"); [new Date(t.entryTime).toLocaleString(), fmt(t.entry, 4), new Date(t.exitTime).toLocaleString(), fmt(t.exit, 4), fmt(t.returnPct, 2) + "%"].forEach((x) => tr.append(Object.assign(document.createElement("td"), { textContent: x }))); body.append(tr); });
  if (!rows.length) { const tr = document.createElement("tr"); tr.append(Object.assign(document.createElement("td"), { colSpan: 5, textContent: "No closed trades in this period." })); body.append(tr); }
}
function readParams() {
  const f = $("bt-form"), n = (k, d, lo, hi) => Math.min(hi, Math.max(lo, Number(f.elements[k].value) || d));
  let fast = n("fast", 9, 2, 100), slow = n("slow", 21, 3, 300); if (fast >= slow) fast = Math.max(2, slow - 1);
  return { fast, slow, rsiMax: n("rsiMax", 70, 50, 100), feePct: n("fee", 0.1, 0, 5), slippagePct: n("slip", 0.05, 0, 5) };
}

async function load() {
  const key = st.symbol + st.interval;
  const hadData = st.key === key && st.candles.length > 0;
  setStatus("Loading " + st.symbol + " " + st.interval + "…", "");
  hideRetry();
  try {
    const data = await fetchCandles(st.symbol, st.interval);
    st.candles = data; st.key = key;
    setStatus(`Live market data from Binance public API — ${st.symbol} ${st.interval}, ${data.length} candles, loaded ${new Date().toLocaleTimeString()}. May be delayed or unavailable in some regions.`, "");
    draw(); if (st.live) connect();
  } catch {
    // Never fabricate prices. Keep previously loaded real candles for the same symbol/interval if we have them.
    if (!hadData) { st.candles = []; st.key = key; }
    const offline = navigator.onLine === false;
    setStatus(`Could not load live data — ${offline ? "you appear to be offline" : "the market feed is blocked, rate limited or unreachable"}. No substitute or simulated prices are shown.`, "warn");
    showRetry();
    if (st.candles.length) draw(); else { emptyState("Live market data unavailable"); clearStats(); }
  }
}
function setStatus(text, cls) { const el = $("status"); if (!el) return; el.textContent = text; el.className = "form-status" + (cls ? " " + cls : ""); }
function showRetry() { const b = $("retry"); if (b) b.hidden = false; }
function hideRetry() { const b = $("retry"); if (b) b.hidden = true; }
function clearStats() {
  $("score").textContent = "—"; $("meter").style.width = "0%";
  $("score-detail").textContent = "No market data loaded.";
  $("score-parts").replaceChildren(); $("bt-stats").replaceChildren("Nothing to backtest without live candles.");
  window.__trades = []; renderTrades();
}
function emptyState(msg) {
  const c = $("price"); if (!c) return;
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = 420;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const muted = css.getPropertyValue("--muted").trim() || "#9ba9bd", line = css.getPropertyValue("--line").trim() || "#26334a";
  g.strokeStyle = line; g.setLineDash([6, 6]); g.strokeRect(40, 60, w - 80, h - 120); g.setLineDash([]);
  g.fillStyle = muted; g.font = "14px sans-serif"; g.textAlign = "center";
  g.fillText(msg, w / 2, h / 2 - 6);
  g.font = "12px sans-serif";
  g.fillText("Reconnect and press Retry — real prices only, no demo data.", w / 2, h / 2 + 16);
  g.textAlign = "start";
  c.setAttribute("aria-label", msg);
}
function connect() {
  disconnect(); if (!st.candles.length) return;
  try {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${st.symbol.toLowerCase()}@kline_${st.interval}`); st.ws = ws;
    ws.onmessage = (ev) => { try { const k = JSON.parse(ev.data).k; if (!k) return; const cd = { time: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v }; if (![cd.open, cd.high, cd.low, cd.close].every(Number.isFinite)) return; const last = st.candles[st.candles.length - 1]; if (last && last.time === cd.time) st.candles[st.candles.length - 1] = cd; else st.candles.push(cd); if (st.candles.length > 600) st.candles.shift(); schedule(); } catch {} };
    ws.onclose = () => { if (st.live && st.ws === ws) setTimeout(connect, 4000); };
  } catch {}
}
function disconnect() { if (st.ws) { const w = st.ws; st.ws = null; try { w.close(); } catch {} } }
let raf = 0; const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

function fillControls() {
  SYMBOLS.forEach((s) => $("symbol").add(new Option(s.replace("USDT", "/USDT"), s)));
  const retry = $("retry"); if (retry) retry.onclick = load;
  const bar = $("intervals"); INTERVALS.forEach((i) => { const b = Object.assign(document.createElement("button"), { type: "button", textContent: i }); b.setAttribute("aria-pressed", String(i === st.interval)); b.onclick = () => { st.interval = i; [...bar.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b))); load(); }; bar.append(b); });
  $("symbol").onchange = () => { st.symbol = $("symbol").value; load(); };
  $("scale").onclick = (e) => { st.log = !st.log; e.target.textContent = st.log ? "Scale: log" : "Scale: linear"; draw(); };
  $("live").onclick = (e) => { st.live = !st.live; e.target.setAttribute("aria-pressed", String(st.live)); e.target.textContent = st.live ? "Live: on" : "Live: off"; st.live ? connect() : disconnect(); };
  $("bt-form").addEventListener("input", draw); $("bt-form").addEventListener("submit", (e) => e.preventDefault());
  document.querySelectorAll("#trade-head th[data-k]").forEach((th) => th.addEventListener("click", () => { const k = th.dataset.k; sortDir = sortKey === k ? -sortDir : -1; sortKey = k; renderTrades(); }));
  $("csv").onclick = () => {
    const rows = [["entry_time", "entry_price", "exit_time", "exit_price", "return_pct"], ...(window.__trades || []).map((t) => [new Date(t.entryTime).toISOString(), t.entry, new Date(t.exitTime).toISOString(), t.exit, t.returnPct.toFixed(4)])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }), a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${st.symbol}-${st.interval}-trades.csv` });
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  };
}
fillControls(); load();
let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(draw, 120); });
document.addEventListener("visibilitychange", () => { if (document.hidden) disconnect(); else if (st.live) connect(); });
