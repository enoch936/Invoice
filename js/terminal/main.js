// PARCHXA Terminal — application shell.
//
// Wires the DOM to the chart engine, the market-data adapters, the indicator
// registry and the drawing model. Handles symbol/timeframe/chart-type switching,
// multi-pane layouts, the live WebSocket feed, the watchlist, alerts, bar replay,
// settings, import/export and keyboard shortcuts.
//
// Honesty rules enforced here:
//   * only real provider data ever reaches the engine;
//   * the status badge reflects the true feed state (LIVE/DELAYED/CACHED/ERROR);
//   * replay computes everything from candles up to the cursor only.

import "../app.js";
import "../site.js";
import { ChartEngine, CHART_TYPES } from "./engine.js";
import * as MD from "./market-data.js";
import { CATALOG, CATALOG_BY_ID, computeIndicator, makeInstance } from "./indicators.js";
import { DrawingModel } from "./drawings.js";
import * as store from "./store.js";

const $ = (id) => document.getElementById(id);

const INTERVAL_MS = {
  "1s": 1000, "1m": 60000, "3m": 180000, "5m": 300000, "15m": 300000 * 3, "30m": 1800000,
  "1h": 3600000, "2h": 7200000, "4h": 14400000, "6h": 21600000, "8h": 28800000, "12h": 43200000,
  "1d": 86400000, "3d": 259200000, "1w": 604800000, "1M": 2592000000,
};
const CHARTSETTINGS_KEY = "parchxa.terminal.drawings.v1";
const stream = new MD.BinanceKlineStream();
const drawerKey = CHARTSETTINGS_KEY; // drawings storage key (kept local for clarity)

const state = {
  settings: store.loadSettings(),
  keys: store.loadKeys(),
  watchlist: store.loadWatchlist(),
  alerts: store.loadAlerts(),
  tickers: new Map(),
  instruments: [],
  binanceFiat: [],
  fiatSet: new Set(),
  instrumentsLoaded: false,
  instrumentsLoading: false,
  fx: MD.listFxInstruments(),
  twelve: MD.listTwelveFxInstruments(),
  panes: [],
  focus: 0,
  layout: "1",
  symMode: "pane",
  tickerTimer: null,
};

/** Timeframes the given provider actually serves (erapi is quote-only, so it serves none). */
const providerTimeframes = (provider) => {
  const p = MD.PROVIDERS[provider];
  return p && Array.isArray(p.timeframes) ? p.timeframes : MD.PROVIDERS.binance.timeframes;
};

// ---------------------------------------------------------------- DOM helper
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = String(v);
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid && kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

const nf = (v, d = 2) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: d }) : "—");
const precision = (p) => { const a = Math.abs(p); return a >= 1000 ? 2 : a >= 100 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8; };
const compact = (v) => (!Number.isFinite(v) ? "—" : v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "K" : v.toFixed(2));

function themeColors() {
  return document.documentElement.dataset.theme === "light"
    ? { gridColor: "#e3e8f0", textColor: "#5d6b83", axisColor: "#c3ccda" }
    : { gridColor: "#1e293b", textColor: "#9ba9bd", axisColor: "#5b6880" };
}

// ---------------------------------------------------------------- panes
const chartKey = (pane) => `${pane.provider}:${pane.symbol}:${pane.interval}`;

function defaultIndicators(index) {
  const base = [makeInstance("ema", { period: 21 })];
  if (index === 0) base.push(makeInstance("ema", { period: 50 }), makeInstance("rsi", { period: 14 }));
  base.push(makeInstance("volume", { period: 20 }));
  return base.filter(Boolean);
}

function buildPane(index, seed) {
  const paneEl = document.createElement("div");
  paneEl.className = "ts-pane";
  paneEl.tabIndex = 0;
  paneEl.dataset.pane = String(index);
  paneEl.setAttribute("role", "group");
  paneEl.setAttribute("aria-label", `Chart pane ${index + 1}`);

  const headSym = document.createElement("strong");
  headSym.className = "ts-pane-sym";
  headSym.textContent = seed.label;
  const headTf = document.createElement("span");
  headTf.className = "ts-pane-tf";
  const headPrice = document.createElement("span");
  headPrice.className = "ts-pane-price";
  const head = document.createElement("div");
  head.className = "ts-pane-head";
  head.append(headSym, headTf, headPrice);

  const chartEl = document.createElement("div");
  chartEl.className = "ts-chart";
  paneEl.append(head, chartEl);

  const pane = {
    index,
    provider: seed.provider || "binance",
    symbol: seed.id,
    label: seed.label,
    baseCcy: seed.base,
    quoteCcy: seed.quote,
    interval: seed.interval || "1h",
    chartType: state.settings.chartType,
    candles: [],
    loadedKey: "",
    status: "cached",
    indicators: seed.indicators || defaultIndicators(index),
    quote: null,
    streamKey: null,
    paneEl, head, headSym, headTf, headPrice, chartEl,
    engine: null, model: null, _recompute: null,
    replay: { active: false, index: 0, playing: false, timer: null, speed: 1 },
    pollTimer: null,
  };

  pane.engine = new ChartEngine(chartEl, {
    id: `pane${index}`,
    onEvent: (type, payload) => onEngineEvent(pane, type, payload),
    requestText: () => window.prompt("Annotation text (max 200 characters):"),
  });
  pane.model = new DrawingModel(chartKey(pane), () => pane.engine._render());
  pane.engine.setModel(pane.model);
  applyEngineOptions(pane);

  paneEl.addEventListener("focus", () => focusPane(index), true);
  paneEl.addEventListener("pointerdown", () => focusPane(index), true);
  return pane;
}

function applyEngineOptions(pane) {
  const s = state.settings;
  pane.engine.setOptions({
    chartType: pane.chartType,
    grid: s.grid, crosshair: s.crosshair, logScale: s.logScale,
    upColor: s.upColor, downColor: s.downColor, timezone: s.timezone,
    intervalMs: INTERVAL_MS[pane.interval] || 3600000,
    ...themeColors(),
  });
}

function setLayout(count, seeds) {
  for (const pane of state.panes) { try { pane.engine.destroy(); } catch { } clearTimeout(pane.replay.timer); clearTimeout(pane._recompute); clearInterval(pane.pollTimer); }
  state.panes = [];
  const charts = $("ts-charts");
  charts.replaceChildren();
  charts.dataset.panes = String(count);
  charts.dataset.split = "v";

  const defaults = [
    { id: "BTCUSDT", label: "BTC/USDT", base: "BTC", quote: "USDT", provider: "binance" },
    { id: "ETHUSDT", label: "ETH/USDT", base: "ETH", quote: "USDT", provider: "binance" },
    { id: "SOLUSDT", label: "SOL/USDT", base: "SOL", quote: "USDT", provider: "binance" },
    { id: "BNBUSDT", label: "BNB/USDT", base: "BNB", quote: "USDT", provider: "binance" },
  ];
  for (let i = 0; i < count; i++) {
    const saved = seeds?.[i];
    const seed = saved ? { id: saved.symbol, label: saved.label || saved.symbol, base: saved.base, quote: saved.quote, provider: saved.provider || "binance", interval: saved.interval, indicators: saved.indicators } : defaults[i];
    const pane = buildPane(i, seed);
    state.panes.push(pane);
    charts.append(pane.paneEl);
  }

  $("ts-layout-btn").textContent = `Layout: ${count}`;
  store.saveLayout({ panes: count, split: "v", charts: state.panes.map((p) => ({ symbol: p.symbol, provider: p.provider, label: p.label, base: p.baseCcy, quote: p.quoteCcy, interval: p.interval })) });

  focusPane(0);
  for (const pane of state.panes) loadPane(pane);
}

function focusPane(index) {
  if (!state.panes[index]) return;
  state.focus = index;
  state.panes.forEach((p, i) => { p.paneEl.dataset.focused = String(i === index); });
  syncToolbarToFocused();
  renderInfo();
}

const focusedPane = () => state.panes[state.focus] || state.panes[0];

function syncToolbarToFocused() {
  const pane = focusedPane();
  if (!pane) return;
  $("ts-symbol-label").textContent = pane.label;
  $("ts-symbol-provider").textContent = MD.PROVIDERS[pane.provider]?.label || pane.provider;
  $("ts-type").value = pane.chartType;
  renderIntervals(pane);
  $("ts-ind-count").textContent = pane.indicators.length ? String(pane.indicators.length) : "";
  updatePaneHead(pane);
  renderInfo(pane);
}

/** Build the timeframe buttons for the focused pane's provider (providers serve different sets). */
function renderIntervals(pane) {
  const list = providerTimeframes(pane?.provider);
  const host = $("ts-intervals");
  host.replaceChildren(...list.map((tf) => {
    const b = h("button", { type: "button", "data-tf": tf, "aria-pressed": String(!!pane && pane.interval === tf), text: tf });
    b.addEventListener("click", () => {
      const p = focusedPane(); if (!p) return;
      if (p.replay.active) exitReplay(p);
      p.interval = tf;
      loadPane(p);
      syncToolbarToFocused();
    });
    return b;
  }));
}

function updatePaneHead(pane) {
  pane.headSym.textContent = pane.label;
  pane.headTf.textContent = pane.provider === "erapi" ? "ref quote" : pane.interval;

  if (pane.provider === "erapi") {
    pane.headPrice.className = "ts-pane-price";
    pane.headPrice.textContent = pane.quote ? nf(pane.quote.price, 6) : "";
    return;
  }

  const index = pane.replay.active ? pane.replay.index : pane.candles.length - 1;
  const last = pane.candles[index];
  const tick = state.tickers.get(pane.symbol);
  const change = tick && !pane.replay.active ? tick.changePct : NaN;
  pane.headPrice.className = "ts-pane-price " + (Number.isFinite(change) ? (change >= 0 ? "is-up" : "is-down") : "");
  pane.headPrice.textContent = Number.isFinite(last?.close)
    ? `${nf(last.close, precision(last.close))}${Number.isFinite(change) ? `  ${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : ""}`
    : "";
}

// ---------------------------------------------------------------- loading
async function loadPane(pane) {
  pane.loadedKey = "";
  teardownStream(pane);
  teardownPoll(pane);
  pane.model = new DrawingModel(chartKey(pane), () => pane.engine._render());
  pane.engine.setModel(pane.model);

  if (pane.provider === "erapi") return loadFxPane(pane);
  if (pane.provider === "twelvedata") return loadTwelvePane(pane);

  const key = chartKey(pane);
  pane.status = "connecting";
  updateConn();
  setMessage(`Loading ${pane.label} ${pane.interval} candles…`);
  try {
    const candles = await MD.fetchCandles(pane.symbol, pane.interval, 500);
    if (chartKey(pane) !== key) return;
    pane.candles = candles;
    pane.loadedKey = key;
    pane.status = "cached";
    applyEngineOptions(pane);
    pane.engine.setData(candles);
    applyIndicators(pane);
    setMessage(`Loaded ${candles.length} real ${pane.interval} candles for ${pane.label}.`);
    updatePaneHead(pane);
    renderInfo(pane);
    if (!pane.replay.active) subscribeStream(pane);
  } catch (error) {
    if (chartKey(pane) !== key) return;
    pane.candles = [];
    pane.engine.setData([]);
    pane.status = "error";
    setMessage(`Could not load ${pane.label} candles: ${error.message}. No substitute data is shown — retry or pick another market.`, "error");
    updateConn();
  }
}

async function loadFxPane(pane) {
  pane.status = "connecting";
  updateConn();
  setMessage(`Fetching the ${pane.baseCcy}/${pane.quoteCcy} reference rate…`);
  try {
    const quote = await MD.fetchFxQuote(pane.baseCcy, pane.quoteCcy);
    pane.quote = quote;
    pane.candles = [];
    pane.engine.setData([]);
    pane.engine.setIndicators([]);
    pane.status = "delayed";
    setMessage(`${pane.baseCcy}/${pane.quoteCcy} = ${nf(quote.price, 6)} (reference rate${quote.published ? ` published ${quote.published}` : ""}). This provider offers no candle history, so the chart is empty by design.`, "warn");
    updateConn();
    updatePaneHead(pane);
    renderInfo(pane);
  } catch (error) {
    pane.status = "error";
    setMessage(`Could not load the ${pane.baseCcy}/${pane.quoteCcy} reference rate: ${error.message}.`, "error");
    updateConn();
  }
}

const paneSlice = (pane) => (pane.replay.active ? pane.candles.slice(0, pane.replay.index + 1) : pane.candles);

// ---------------------------------------------------------------- forex (Twelve Data, polled)

async function loadTwelvePane(pane) {
  const key = state.keys.twelvedata;
  if (!key) {
    pane.candles = [];
    pane.engine.setData([]);
    pane.engine.setIndicators([]);
    pane.status = "error";
    setMessage(`${pane.label} needs a free Twelve Data API key. Open Settings → Forex data, paste one, then reload the pair. Until then no forex candles can be shown.`, "warn");
    updateConn();
    updatePaneHead(pane);
    renderInfo(pane);
    return;
  }

  const k = chartKey(pane);
  pane.status = "connecting";
  updateConn();
  setMessage(`Loading ${pane.label} ${pane.interval} forex candles from Twelve Data…`);
  try {
    const candles = await MD.fetchTwelveCandles(pane.symbol, pane.interval, key, 500);
    if (chartKey(pane) !== k) return;
    pane.candles = candles;
    pane.loadedKey = k;
    pane.status = "delayed";
    applyEngineOptions(pane);
    pane.engine.setData(candles);
    applyIndicators(pane);
    setMessage(`${pane.label}: ${candles.length} real ${pane.interval} forex candles from Twelve Data. Refreshing every 15 s — their free tier is polled, not streamed, so this reads DELAYED, never LIVE.`, "warn");
    updateConn();
    updatePaneHead(pane);
    renderInfo(pane);
    if (!pane.replay.active) startTwelvePoll(pane);
  } catch (error) {
    if (chartKey(pane) !== k) return;
    pane.candles = [];
    pane.engine.setData([]);
    pane.status = "error";
    setMessage(`Could not load ${pane.label} from Twelve Data: ${error.message}. Check the key in Settings — no substitute data is shown.`, "error");
    updateConn();
  }
}

function teardownPoll(pane) { clearInterval(pane.pollTimer); pane.pollTimer = null; }

/** Poll Twelve Data for the freshest candles and merge them into the real series (no synthesis). */
function startTwelvePoll(pane) {
  teardownPoll(pane);
  const key = state.keys.twelvedata;
  if (!key) return;
  pane.pollTimer = setInterval(async () => {
    if (pane.replay.active || document.hidden || chartKey(pane) !== pane.loadedKey) return;
    try {
      const latest = await MD.fetchTwelveCandles(pane.symbol, pane.interval, key, 2);
      if (pane.replay.active || chartKey(pane) !== pane.loadedKey) return;
      let changed = false;
      for (const c of latest) {
        const arr = pane.candles;
        const last = arr[arr.length - 1];
        if (last && c.time === last.time) { arr[arr.length - 1] = c; changed = true; }
        else if (!last || c.time > last.time) { arr.push(c); if (arr.length > 1200) arr.shift(); changed = true; }
      }
      if (!changed) return;
      pane.engine.updateLast(pane.candles[pane.candles.length - 1]);
      if (pane === focusedPane()) { pane.status = "delayed"; updateConn(); }
      updatePaneHead(pane);
    } catch { /* transient network/rate-limit error — keep the last real candles on screen */ }
  }, 15000);
}

function applyIndicators(pane) {
  const slice = paneSlice(pane);
  const resolved = pane.indicators.map((inst) => computeIndicator(inst, slice)).filter(Boolean);
  pane.engine.setIndicators(resolved);
}

function subscribeStream(pane) {
  if (pane.provider !== "binance" || !window.WebSocket) return;
  pane.streamKey = stream.subscribe(pane.symbol, pane.interval,
    (candle, closed) => onTick(pane, candle, closed),
    (name, info) => onStreamStatus(pane, name, info));
}

function teardownStream(pane) {
  if (pane.streamKey) { try { stream.unsubscribe(pane.streamKey); } catch { } pane.streamKey = null; }
}

function onTick(pane, candle, closed) {
  if (pane.replay.active) return;
  const arr = pane.candles;
  const last = arr[arr.length - 1];
  if (last && candle.time === last.time) arr[arr.length - 1] = candle;
  else if (!last || candle.time > last.time) { arr.push(candle); if (arr.length > 1200) arr.shift(); }
  else return;
  pane.engine.updateLast(candle);
  if (pane === focusedPane()) { pane.status = "live"; updateConn(); }
  updatePaneHead(pane);
  evaluateAlerts(pane.symbol, candle.close);
  if (closed) applyIndicators(pane);
  else { clearTimeout(pane._recompute); pane._recompute = setTimeout(() => { if (!pane.replay.active) applyIndicators(pane); }, 600); }
}

function onStreamStatus(pane, name, info) {
  if (pane.replay.active) return;
  if (name === "live") { pane.status = "live"; if (pane === focusedPane()) setMessage(`${pane.label} is streaming in real time from Binance.`); }
  else if (name === "retrying") { pane.status = "connecting"; if (pane === focusedPane()) setMessage(`Reconnecting the ${pane.label} live feed… attempt ${info?.attempt ?? 1}.`, "warn"); }
  else if (name === "connecting") pane.status = "connecting";
  updateConn();
}

// ---------------------------------------------------------------- status / legend
function updateConn() {
  const pane = focusedPane();
  const s = pane ? pane.status : "cached";
  const map = { live: ["live", "LIVE"], delayed: ["delayed", "DELAYED"], cached: ["cached", "CACHED"], connecting: ["connecting", "CONNECTING"], error: ["error", "ERROR"] };
  const [st, label] = map[s] || map.cached;
  $("ts-conn").dataset.state = st;
  $("ts-conn-label").textContent = label;
}

function setMessage(text, kind = "") {
  const el = $("ts-msg");
  el.textContent = text;
  el.className = "ts-msg" + (kind === "error" ? " is-error" : kind === "warn" ? " is-warn" : "");
}

function renderLegend(payload) {
  const parts = [];
  if (payload.derived) parts.push(h("span", { class: "ts-li", html: `<span class="swatch" style="background:#f5b942"></span>derived chart` }));
  const c = payload.candle;
  if (c) parts.push(h("span", { class: "ts-ohlc", html: `O <b>${nf(c.open, precision(c.open))}</b> H <b>${nf(c.high, precision(c.high))}</b> L <b>${nf(c.low, precision(c.low))}</b> C <b>${nf(c.close, precision(c.close))}</b>` }));
  for (const v of payload.values || []) parts.push(h("span", { class: "ts-li" }, h("span", { class: "swatch", style: `background:${v.color || "#8dafff"}` }), h("span", { text: v.name }), h("b", { class: "ts-li-val", text: Number.isFinite(v.value) ? nf(v.value, 4) : "—" })));
  if (!parts.length) parts.push(h("span", { text: "No data — the selected market has no candle history." }));
  $("ts-legend").replaceChildren(...parts);
}

function renderInfo(pane) {
  if (!pane) return;
  const t = state.tickers.get(pane.symbol);
  const prov = MD.PROVIDERS[pane.provider];
  const dl = document.createElement("dl");
  const add = (k, v) => { const dt = document.createElement("dt"); dt.textContent = k; const dd = document.createElement("dd"); dd.textContent = v; dl.append(dt, dd); };
  add("Symbol", pane.label);
  add("Provider", prov ? prov.label : pane.provider);
  add("State", (pane.status || "cached").toUpperCase());
  if (prov?.realtime) add("Feed", "WebSocket (real-time)");
  else if (prov?.polled) add("Feed", "REST poll every 15 s (delayed)");
  else if (prov?.delayed) add("Feed", "Reference quote (daily, no candles)");
  if (t) { add("Last", nf(t.price, precision(t.price))); add("24h change", Number.isFinite(t.changePct) ? `${t.changePct >= 0 ? "+" : ""}${t.changePct.toFixed(2)}%` : "—"); add("24h volume", compact(t.quoteVolume)); }
  if (pane.quote) add("Reference", nf(pane.quote.price, 6));
  if (pane.candles.length) add("Candles loaded", String(pane.candles.length));

  const host = $("ts-info");
  host.replaceChildren(
    h("h3", { text: "Instrument" }),
    dl,
    h("p", { text: prov?.note || "" }),
    h("p", { class: "muted-copy", text: "Equities, ETFs, indices, commodities and bond yields need a keyed provider or a server-side proxy; a static site cannot hold that secret, so they are not simulated here." }),
  );
}

// ---------------------------------------------------------------- engine events
function onEngineEvent(pane, type, payload) {
  if (type === "crosshair") {
    if (pane === focusedPane()) {
      renderLegend(payload);
      if (state.settings.syncCrosshair) {
        for (const other of state.panes) if (other !== pane) {
          if (payload.active && payload.time != null) other.engine.showCrosshairAtTime(payload.time);
          else other.engine.clearCrosshair();
        }
      }
    }
  } else if (type === "viewport") {
    if (!state.settings.syncTime) return;
    for (const other of state.panes) if (other !== pane && other.interval === pane.interval && other.status !== "error" && other.candles.length) other.engine.setView({ offset: payload.offset, bars: payload.bars });
  }
}

// ---------------------------------------------------------------- watchlist
async function refreshTickers() {
  const symbols = state.watchlist.symbols.filter((s) => /^[A-Z0-9]{5,20}$/.test(s));
  if (!symbols.length) return;
  try {
    const map = await MD.fetchTickers(symbols);
    for (const [k, v] of map) state.tickers.set(k, v);
    renderWatchlist();
    for (const pane of state.panes) updatePaneHead(pane);
    if (focusedPane()) renderInfo(focusedPane());
  } catch (error) {
    if (!state.tickers.size) setMessage(`Watchlist prices are unavailable right now (${error.message}). The chart feed may still work.`, "warn");
  }
}

const symLabel = (sym) => { const m = /^([A-Z0-9]+?)(USDT|USDC|FDUSD|BTC|ETH|BNB|TRY|EUR)$/.exec(sym); return m ? `${m[1]}/${m[2]}` : sym; };

function sortWatchlist(list) {
  const key = state.watchlist.sort;
  if (!key || key === "none") return list;
  const dir = state.watchlist.dir === 1 ? 1 : -1;
  return [...list].sort((a, b) => {
    if (key === "symbol") return a.localeCompare(b) * dir;
    const ta = state.tickers.get(a), tb = state.tickers.get(b);
    const pick = (t) => (key === "changePct" ? t?.changePct : key === "quoteVolume" ? t?.quoteVolume : t?.price);
    const va = pick(ta), vb = pick(tb);
    return ((Number.isFinite(va) ? va : -Infinity) - (Number.isFinite(vb) ? vb : -Infinity)) * dir;
  });
}

function renderWatchlist() {
  const body = $("ts-watch-body");
  const focus = focusedPane();
  const rows = sortWatchlist(state.watchlist.symbols).map((sym) => {
    const t = state.tickers.get(sym);
    const chg = t?.changePct;
    const tr = document.createElement("tr");
    tr.setAttribute("aria-selected", String(!!focus && focus.symbol === sym));
    const cells = [
      ["td", "ts-watch-sym", sym],
      ["td", "", t ? nf(t.price, precision(t.price)) : "—"],
      ["td", Number.isFinite(chg) ? (chg >= 0 ? "up" : "down") : "", Number.isFinite(chg) ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "—"],
      ["td", "", t ? compact(t.quoteVolume) : "—"],
    ];
    for (const [tag, cls, text] of cells) { const td = document.createElement(tag); if (cls) td.className = cls; td.textContent = text; tr.append(td); }
    const td = document.createElement("td");
    const del = document.createElement("button");
    del.className = "ts-watch-del"; del.textContent = "×"; del.title = `Remove ${sym}`; del.setAttribute("aria-label", `Remove ${sym}`);
    del.addEventListener("click", (e) => { e.stopPropagation(); removeFromWatchlist(sym); });
    td.append(del); tr.append(td);
    tr.addEventListener("click", () => setFocusedSymbol({ id: sym, label: symLabel(sym), provider: "binance", base: undefined, quote: undefined }));
    return tr;
  });
  body.replaceChildren(...rows);
  for (const th of document.querySelectorAll(".ts-watch th[data-sort]")) {
    th.setAttribute("aria-sort", th.dataset.sort === state.watchlist.sort ? (state.watchlist.dir === 1 ? "ascending" : "descending") : "none");
  }
}

function addToWatchlist(sym) {
  if (!/^[A-Z0-9]{5,20}$/.test(sym)) return;
  if (state.watchlist.symbols.includes(sym)) return;
  state.watchlist.symbols.unshift(sym);
  state.watchlist.symbols = state.watchlist.symbols.slice(0, 100);
  store.saveWatchlist(state.watchlist);
  renderWatchlist();
  refreshTickers();
}

function removeFromWatchlist(sym) {
  state.watchlist.symbols = state.watchlist.symbols.filter((s) => s !== sym);
  store.saveWatchlist(state.watchlist);
  renderWatchlist();
}

// ---------------------------------------------------------------- symbol selection
function guessParts(id) {
  const m = /^([A-Z0-9]+?)(USDT|USDC|FDUSD|BTC|ETH|BNB|TRY|EUR)$/.exec(id);
  return m ? { base: m[1], quote: m[2] } : { base: id, quote: "" };
}

function setFocusedSymbol(inst) {
  const pane = focusedPane();
  if (!pane) return;
  if (pane.replay.active) exitReplay(pane);
  pane.provider = inst.provider || "binance";
  pane.symbol = inst.id;
  pane.label = inst.label || inst.id;
  const parts = (inst.base && inst.quote) ? { base: inst.base, quote: inst.quote } : guessParts(inst.id);
  pane.baseCcy = parts.base; pane.quoteCcy = parts.quote;
  const tfs = providerTimeframes(pane.provider);
  if (tfs.length && !tfs.includes(pane.interval)) pane.interval = tfs.includes("1h") ? "1h" : tfs[0];
  pane.candles = []; pane.quote = null;
  pane.headSym.textContent = pane.label;
  syncToolbarToFocused();
  loadPane(pane);
}

async function loadInstruments() {
  if (state.instrumentsLoaded || state.instrumentsLoading) return;
  state.instrumentsLoading = true;
  $("ts-symbol-note").textContent = "Loading the Binance instrument list…";
  try {
    state.instruments = await MD.listCryptoInstruments();
    state.binanceFiat = await MD.listBinanceFiatInstruments().catch(() => []);
    state.fiatSet = new Set(state.binanceFiat.map((f) => f.id));
    state.instrumentsLoaded = true;
  }
  catch (error) { $("ts-symbol-note").textContent = `Could not load the Binance instrument list (${error.message}). You can still search forex pairs (with a key) and type a Binance symbol directly.`; }
  finally { state.instrumentsLoading = false; renderSymbolResults($("ts-symbol-search").value); }
}

function instrumentSuffix(inst) {
  const prov = MD.PROVIDERS[inst.provider]?.label || inst.provider;
  if (inst.provider === "erapi") return `${prov} · reference quote`;
  if (inst.provider === "twelvedata") return `${prov} · forex${state.keys.twelvedata ? "" : " · key needed"}`;
  if (inst.provider === "binance" && state.fiatSet.has(inst.id)) return `${prov} · live fiat`;
  return prov;
}

function renderSymbolResults(query) {
  const q = String(query || "").trim().toUpperCase();
  const list = $("ts-symbol-results");
  const seen = new Set();
  const all = [...state.instruments, ...state.binanceFiat, ...state.twelve, ...state.fx]
    .filter((i) => { const k = `${i.provider}:${i.id}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const norm = (s) => String(s).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const qn = norm(q);
  let rows = q
    ? all.filter((i) => norm(i.id).includes(qn) || (i.label || "").toUpperCase().includes(q) || (i.base || "").includes(q))
    : all.slice(0, 60);
  rows = rows.slice(0, 80);

  const nodes = rows.map((inst) => h("li", {}, h("button", {
    onclick: () => selectInstrument(inst),
  },
    h("span", { text: inst.label || inst.id }),
    h("span", { class: "ts-list-sub", text: instrumentSuffix(inst) }),
  )));

  if (q && /^[A-Z0-9]{5,20}$/.test(q) && !rows.some((r) => r.id === q)) {
    nodes.unshift(h("li", {}, h("button", { onclick: () => selectInstrument({ id: q, label: q, provider: "binance" }) },
      h("span", { text: `Try “${q}” on Binance` }), h("span", { class: "ts-list-sub", text: "if the pair exists" }))));
  }
  if (!nodes.length) nodes.push(h("li", {}, h("span", { class: "muted-copy", text: "No matching instruments. Stocks, indices, commodities and bonds are not available without a keyed provider." })));
  list.replaceChildren(...nodes);
}

function selectInstrument(inst) {
  if (state.symMode === "watch") {
    if ((inst.provider || "binance") === "binance") addToWatchlist(inst.id);
    else setMessage("The watchlist shows live Binance prices only; forex pairs are not listed there.", "warn");
    $("ts-symbol-dialog").close();
    return;
  }
  if (inst.provider === "twelvedata" && !state.keys.twelvedata) {
    $("ts-symbol-dialog").close();
    setMessage("Forex pairs from Twelve Data need a free API key. Paste one under Settings → Forex data, then pick the pair again.", "warn");
    fillSettingsForm();
    $("ts-settings-dialog").showModal();
    return;
  }
  setFocusedSymbol(inst);
  $("ts-symbol-dialog").close();
}

function openSymbolDialog(mode) {
  state.symMode = mode;
  $("ts-symbol-search").value = "";
  $("ts-symbol-note").textContent = "Only instruments actually offered by the connected providers are listed. Stocks, indices, commodities and bond yields require a keyed provider and are not simulated.";
  renderSymbolResults("");
  $("ts-symbol-dialog").showModal();
  $("ts-symbol-search").focus();
  loadInstruments();
}

// ---------------------------------------------------------------- indicators UI
function renderIndicatorCatalogue(filter = "") {
  const q = filter.trim().toUpperCase();
  const rows = CATALOG.filter((d) => !q || d.label.toUpperCase().includes(q) || d.id.toUpperCase().includes(q));
  const list = $("ts-ind-results");
  if (!rows.length) { list.replaceChildren(h("li", {}, h("span", { class: "muted-copy", text: "No matching indicators." }))); return; }
  list.replaceChildren(...rows.map((d) => h("li", {}, h("button", { onclick: () => addIndicator(d.id) },
    h("span", { text: d.label }),
    h("span", { class: "ts-list-sub", text: d.overlay ? "overlay" : `${d.params.length} param${d.params.length === 1 ? "" : "s"}` }),
  ))));
}

function addIndicator(id) {
  const pane = focusedPane();
  const inst = makeInstance(id);
  if (!pane || !inst) return;
  pane.indicators.push(inst);
  applyIndicators(pane);
  renderActiveIndicators();
  syncToolbarToFocused();
}

function renderActiveIndicators() {
  const pane = focusedPane();
  const host = $("ts-ind-active");
  if (!pane) { host.replaceChildren(); return; }
  if (!pane.indicators.length) { host.replaceChildren(h("p", { class: "muted-copy", text: "No indicators on this chart." })); return; }
  host.replaceChildren(...pane.indicators.map((inst) => {
    const def = CATALOG_BY_ID.get(inst.id);
    const row = h("div", { class: "ts-chip" }, h("span", { text: def?.label || inst.id }));
    for (const p of def?.params || []) {
      const input = h("input", { type: "number", value: inst.params[p.key], min: p.min, max: p.max, step: p.step || 1, "aria-label": `${def.label} ${p.label}`, style: "width:66px" });
      input.addEventListener("change", () => { const v = Number(input.value); if (Number.isFinite(v)) { inst.params[p.key] = v; applyIndicators(pane); } });
      row.append(input);
    }
    const rm = h("button", { text: "×", title: "Remove", "aria-label": `Remove ${def?.label || inst.id}` });
    rm.addEventListener("click", () => { pane.indicators = pane.indicators.filter((x) => x !== inst); applyIndicators(pane); renderActiveIndicators(); syncToolbarToFocused(); });
    row.append(rm);
    return row;
  }));
}

// ---------------------------------------------------------------- alerts
function renderAlerts() {
  const list = $("ts-alert-list");
  if (!state.alerts.length) { list.replaceChildren(h("li", {}, h("span", { class: "muted-copy", text: "No alerts yet." }))); return; }
  list.replaceChildren(...state.alerts.map((a) => {
    const arm = h("button", { onclick: () => toggleAlert(a.id) },
      h("span", { text: `${a.symbol} ${a.dir === "above" ? "≥" : "≤"} ${nf(a.price, precision(a.price))}` }),
      h("span", { class: "ts-list-sub", text: a.active ? "armed" : a.triggeredAt ? `triggered ${new Date(a.triggeredAt).toLocaleString()}` : "paused" }),
    );
    const del = h("button", { class: "ts-watch-del", text: "×", "aria-label": `Delete alert for ${a.symbol}` });
    del.addEventListener("click", () => { state.alerts = state.alerts.filter((x) => x.id !== a.id); store.saveAlerts(state.alerts); renderAlerts(); });
    return h("li", {}, arm, del);
  }));
}

function toggleAlert(id) {
  const a = state.alerts.find((x) => x.id === id);
  if (!a) return;
  a.active = !a.active;
  if (a.active) a.triggeredAt = null;
  store.saveAlerts(state.alerts);
  renderAlerts();
}

function addAlert(symbol, dir, price) {
  const sym = String(symbol || "").trim().toUpperCase();
  const p = Number(price);
  if (!/^[A-Z0-9]{5,20}$/.test(sym) || !Number.isFinite(p)) return false;
  state.alerts.unshift({ id: `a${Date.now().toString(36)}`, symbol: sym, dir: dir === "below" ? "below" : "above", price: p, active: true, createdAt: new Date().toISOString(), triggeredAt: null });
  state.alerts = state.alerts.slice(0, 100);
  store.saveAlerts(state.alerts);
  renderAlerts();
  requestNotifyPermission();
  setMessage(`Alert armed: ${sym} ${dir === "below" ? "falls below" : "rises above"} ${nf(price, precision(price))}.`);
  return true;
}

function evaluateAlerts(symbol, price) {
  if (!Number.isFinite(price)) return;
  let changed = false;
  for (const a of state.alerts) {
    if (!a.active || a.symbol !== symbol) continue;
    if ((a.dir === "above" && price >= a.price) || (a.dir === "below" && price <= a.price)) {
      a.active = false;
      a.triggeredAt = new Date().toISOString();
      changed = true;
      const msg = `${a.symbol} ${a.dir === "above" ? "rose above" : "fell below"} ${nf(a.price, precision(a.price))} (now ${nf(price, precision(price))}).`;
      setMessage(`Alert: ${msg}`);
      notify("PARCHXA alert", msg);
    }
  }
  if (changed) { store.saveAlerts(state.alerts); renderAlerts(); }
}

function requestNotifyPermission() { try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch { } }
function notify(title, body) { try { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "icons/icon.svg" }); } catch { } }

// ---------------------------------------------------------------- replay
function enterReplay() {
  const pane = focusedPane();
  if (!pane || !["binance", "twelvedata"].includes(pane.provider) || pane.candles.length < 10) { setMessage("Replay needs loaded candle history (crypto or forex). Load a chart first.", "warn"); return; }
  teardownStream(pane);
  teardownPoll(pane);
  pane.replay.active = true;
  pane.replay.index = Math.max(1, pane.candles.length - 80);
  pane.replay.speed = Number($("ts-replay-speed").value) || 1;
  pane.replay.playing = false;
  $("ts-replay-controls").hidden = false;
  $("ts-replay-btn").setAttribute("aria-pressed", "true");
  applyReplay(pane);
  setMessage("Replay started. Data and every indicator use only candles up to the cursor — no future information is shown.");
}

function applyReplay(pane) {
  pane.engine.setData(paneSlice(pane), { keepView: false });
  applyIndicators(pane);
  updateReplayUI(pane);
  updatePaneHead(pane);
}

function updateReplayUI(pane) {
  const range = $("ts-replay-range");
  range.max = String(Math.max(0, pane.candles.length - 1));
  range.value = String(pane.replay.index);
  const candle = pane.candles[pane.replay.index];
  range.setAttribute("aria-valuetext", candle ? new Date(candle.time).toLocaleString() : "");
  $("ts-replay-play").textContent = pane.replay.playing ? "Pause" : "Play";
  $("ts-replay-play").setAttribute("aria-pressed", String(pane.replay.playing));
}

function toggleReplayPlay(pane) {
  pane.replay.playing = !pane.replay.playing;
  clearInterval(pane.replay.timer);
  if (pane.replay.playing) {
    const interval = Math.max(60, 1000 / (pane.replay.speed || 1));
    pane.replay.timer = setInterval(() => {
      if (pane.replay.index >= pane.candles.length - 1) { pane.replay.playing = false; clearInterval(pane.replay.timer); updateReplayUI(pane); return; }
      pane.replay.index += 1;
      applyReplay(pane);
    }, interval);
  }
  updateReplayUI(pane);
}

function stepReplay(delta) {
  const pane = focusedPane();
  if (!pane?.replay.active) return;
  pane.replay.index = Math.max(0, Math.min(pane.candles.length - 1, pane.replay.index + delta));
  applyReplay(pane);
}

function exitReplay(pane) {
  pane = pane || focusedPane();
  if (!pane) return;
  clearInterval(pane.replay.timer);
  pane.replay.active = false; pane.replay.playing = false;
  $("ts-replay-controls").hidden = true;
  $("ts-replay-btn").setAttribute("aria-pressed", "false");
  pane.status = "cached";
  pane.engine.setData(pane.candles);
  applyIndicators(pane);
  updatePaneHead(pane);
  setMessage("Replay ended. Live data resumed.");
  if (pane.provider === "binance" && pane.candles.length) subscribeStream(pane);
  else if (pane.provider === "twelvedata" && pane.candles.length) startTwelvePoll(pane);
}

// ---------------------------------------------------------------- settings / io
async function saveSettingsFromForm() {
  const s = state.settings;
  s.grid = $("set-grid").checked;
  s.crosshair = $("set-crosshair").checked;
  s.logScale = $("set-log").checked;
  s.confirmDelete = $("set-confirm").checked;
  s.syncCrosshair = $("set-sync-cross").checked;
  s.syncTime = $("set-sync-time").checked;
  s.upColor = $("set-up").value;
  s.downColor = $("set-down").value;
  s.timezone = $("set-timezone").value;
  store.saveSettings(s);
  for (const pane of state.panes) applyEngineOptions(pane);
}

function fillSettingsForm() {
  const s = state.settings;
  $("set-grid").checked = s.grid;
  $("set-crosshair").checked = s.crosshair;
  $("set-log").checked = s.logScale;
  $("set-confirm").checked = s.confirmDelete;
  $("set-sync-cross").checked = s.syncCrosshair;
  $("set-sync-time").checked = s.syncTime;
  $("set-up").value = s.upColor;
  $("set-down").value = s.downColor;
  $("set-timezone").value = s.timezone;
  const tdKey = $("set-td-key");
  if (tdKey) tdKey.value = state.keys.twelvedata;
  const tdStatus = $("set-td-status");
  if (tdStatus) tdStatus.textContent = state.keys.twelvedata ? "A key is saved on this device." : "";
}

function saveTwelveKey() {
  const input = $("set-td-key");
  if (!input) return;
  state.keys.twelvedata = input.value.trim();
  store.saveKeys(state.keys);
  $("set-td-status").textContent = state.keys.twelvedata
    ? "Saved. Pick a forex pair from the symbol search — it refreshes every 15 s (delayed)."
    : "Key cleared. Forex pairs will not load without a key.";
  reloadFocusedForexPane();
}

async function testTwelveKey() {
  const input = $("set-td-key");
  const status = $("set-td-status");
  if (!input || !status) return;
  const key = input.value.trim();
  status.textContent = "Testing the key against Twelve Data…";
  try {
    const candles = await MD.fetchTwelveCandles("EUR/USD", "1h", key, 2);
    state.keys.twelvedata = key;
    store.saveKeys(state.keys);
    status.textContent = `Key works — fetched ${candles.length} real EUR/USD candles.`;
    reloadFocusedForexPane();
  } catch (error) {
    status.textContent = `Test failed: ${error.message}`;
  }
}

/** If the focused chart is a forex pane, apply a freshly saved/cleared key straight away. */
function reloadFocusedForexPane() {
  const pane = focusedPane();
  if (!pane || pane.provider !== "twelvedata") return;
  if (pane.replay.active) exitReplay(pane);
  loadPane(pane);
}

function exportAll() {
  let drawings = {};
  try { drawings = JSON.parse(localStorage.getItem(drawerKey) || "{}"); } catch { }
  const payload = {
    app: "parchxa-terminal", version: 1, exportedAt: new Date().toISOString(),
    settings: state.settings, watchlist: state.watchlist, alerts: state.alerts,
    panes: state.panes.map((p) => ({ symbol: p.symbol, provider: p.provider, interval: p.interval, chartType: p.chartType, indicators: p.indicators })),
    drawings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "parchxa-terminal-export.json"; a.click();
  URL.revokeObjectURL(url);
  $("set-note").textContent = "Exported settings, watchlist, alerts, charts and drawings as JSON.";
}

function importAll(text) {
  let data;
  try { data = JSON.parse(text); } catch { $("set-note").textContent = "Import failed: the file is not valid JSON."; return; }
  if (!data || data.app !== "parchxa-terminal") { $("set-note").textContent = "Import failed: this is not a PARCHXA terminal export."; return; }
  if (data.settings) { state.settings = { ...state.settings, ...data.settings }; store.saveSettings(state.settings); }
  if (data.watchlist?.symbols) { state.watchlist = { symbols: data.watchlist.symbols.filter((s) => /^[A-Z0-9]{5,20}$/.test(s)).slice(0, 100), sort: data.watchlist.sort || "none", dir: data.watchlist.dir === 1 ? 1 : -1 }; store.saveWatchlist(state.watchlist); }
  if (Array.isArray(data.alerts)) { state.alerts = data.alerts.slice(0, 100); store.saveAlerts(state.alerts); }
  if (data.drawings && typeof data.drawings === "object") {
    try {
      const merged = JSON.parse(localStorage.getItem(drawerKey) || "{}");
      for (const [k, v] of Object.entries(data.drawings)) if (Array.isArray(v)) merged[k] = v;
      localStorage.setItem(drawerKey, JSON.stringify(merged));
    } catch { }
  }
  $("set-note").textContent = "Imported. Reloading charts…";
  setTimeout(() => location.reload(), 700);
}

// ---------------------------------------------------------------- toolbar
function buildToolbar() {
  const sel = $("ts-type");
  sel.replaceChildren(...CHART_TYPES.map((t) => h("option", { value: t.id, text: t.label })));
  sel.value = state.settings.chartType;
  sel.addEventListener("change", () => {
    const pane = focusedPane();
    state.settings.chartType = sel.value;
    store.saveSettings(state.settings);
    if (pane) { pane.chartType = sel.value; pane.engine.setChartType(sel.value); }
  });

  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
  on("ts-symbol", () => openSymbolDialog("pane"));
  on("ts-watch-add", () => openSymbolDialog("watch"));
  on("ts-indicators", () => { renderIndicatorCatalogue(""); renderActiveIndicators(); $("ts-ind-dialog").showModal(); });
  on("ts-alerts", () => { renderAlerts(); $("ts-alert-dialog").showModal(); });
  on("ts-settings", () => { fillSettingsForm(); $("ts-settings-dialog").showModal(); });
  on("ts-help", () => $("ts-help-dialog").showModal());
  on("ts-fit", () => { const p = focusedPane(); if (p) { p.engine.fit(); if (!p.replay.active) { p.engine.jumpToLatest(); } } });
  on("ts-fullscreen", toggleFullscreen);
  on("ts-side-toggle", toggleSidePanel);
  on("ts-side-close", () => { const side = $("ts-side"); side.classList.remove("ts-side--open"); side.hidden = true; });
  on("ts-rail-toggle", () => { const r = $("ts-rail"); r.hidden = !r.hidden; });
  on("ts-layout-btn", () => {
    const next = state.layout === "1" ? 2 : state.layout === "2" ? 4 : 1;
    const seeds = state.panes.map((p) => ({ symbol: p.symbol, provider: p.provider, label: p.label, base: p.baseCcy, quote: p.quoteCcy, interval: p.interval, indicators: p.indicators }));
    state.layout = String(next);
    setLayout(next, seeds);
  });

  for (const btn of document.querySelectorAll("[data-close]")) {
    btn.addEventListener("click", () => btn.closest("dialog")?.close());
  }

  $("ts-symbol-search").addEventListener("input", (e) => renderSymbolResults(e.target.value));
  $("ts-ind-filter").addEventListener("input", (e) => renderIndicatorCatalogue(e.target.value));

  for (const id of ["set-grid", "set-crosshair", "set-log", "set-confirm", "set-sync-cross", "set-sync-time", "set-up", "set-down", "set-timezone"]) {
    const el = $(id); if (el) el.addEventListener("change", saveSettingsFromForm);
  }
  on("set-export", exportAll);
  on("set-import", () => $("set-import-file").click());
  on("set-td-save", saveTwelveKey);
  on("set-td-test", testTwelveKey);
  $("set-import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) importAll(await file.text());
    e.target.value = "";
  });

  for (const th of document.querySelectorAll(".ts-watch th[data-sort]")) {
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      if (state.watchlist.sort === k) state.watchlist.dir = state.watchlist.dir === 1 ? -1 : 1;
      else { state.watchlist.sort = k; state.watchlist.dir = k === "symbol" ? 1 : -1; }
      store.saveWatchlist(state.watchlist);
      renderWatchlist();
    });
  }

  $("ts-alert-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (addAlert($("alert-symbol").value, $("alert-dir").value, $("alert-price").value)) {
      $("alert-symbol").value = ""; $("alert-price").value = "";
    } else setMessage("Enter a valid Binance symbol and a numeric price.", "warn");
  });

  for (const btn of document.querySelectorAll(".ts-rail .ts-tool[data-tool]")) {
    btn.addEventListener("click", () => selectTool(btn.dataset.tool));
  }
  on("ts-undo", () => focusedPane()?.engine.undo());
  on("ts-redo", () => focusedPane()?.engine.redo());
  on("ts-del", () => focusedPane()?.engine.deleteSelection());
  on("ts-clear", () => {
    const pane = focusedPane();
    if (!pane) return;
    if (state.settings.confirmDelete && pane.model.list.length && !confirm(`Delete all ${pane.model.list.length} drawings on this chart?`)) return;
    pane.engine.clearDrawings();
  });

  on("ts-replay-btn", () => { const p = focusedPane(); if (p?.replay.active) exitReplay(p); else enterReplay(); });
  on("ts-replay-play", () => { const p = focusedPane(); if (!p) return; if (!p.replay.active) enterReplay(); else toggleReplayPlay(p); });
  on("ts-replay-step", () => stepReplay(1));
  on("ts-replay-back", () => stepReplay(-1));
  on("ts-replay-exit", () => exitReplay());
  $("ts-replay-range").addEventListener("input", (e) => { const p = focusedPane(); if (!p?.replay.active) return; p.replay.index = Number(e.target.value); applyReplay(p); });
  $("ts-replay-speed").addEventListener("change", () => { const p = focusedPane(); if (!p) return; p.replay.speed = Number($("ts-replay-speed").value) || 1; if (p.replay.playing) { p.replay.playing = false; toggleReplayPlay(p); } });
}

function selectTool(tool) {
  const pane = focusedPane(); if (!pane) return;
  pane.engine.setTool(tool);
  for (const b of document.querySelectorAll(".ts-rail .ts-tool[data-tool]")) b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
}

function cycleChartType() {
  const pane = focusedPane(); if (!pane) return;
  const i = CHART_TYPES.findIndex((t) => t.id === pane.chartType);
  const next = CHART_TYPES[(i + 1) % CHART_TYPES.length];
  pane.chartType = next.id;
  pane.engine.setChartType(next.id);
  state.settings.chartType = next.id;
  store.saveSettings(state.settings);
  syncToolbarToFocused();
}

function cycleTimeframe(dir) {
  const pane = focusedPane(); if (!pane) return;
  const tfs = providerTimeframes(pane.provider);
  if (!tfs.length) return;
  if (pane.replay.active) exitReplay(pane);
  const i = tfs.indexOf(pane.interval);
  pane.interval = tfs[(i + dir + tfs.length) % tfs.length];
  loadPane(pane);
  syncToolbarToFocused();
}

function toggleSidePanel() {
  const side = $("ts-side");
  if (window.matchMedia("(max-width: 1080px)").matches) {
    side.hidden = false;
    side.classList.toggle("ts-side--open");
  } else {
    side.classList.remove("ts-side--open");
    side.hidden = !side.hidden;
  }
}

function toggleFullscreen() {
  const app = $("ts-app");
  if (!document.fullscreenElement) app.requestFullscreen?.().catch(() => { });
  else document.exitFullscreen?.();
}

// ---------------------------------------------------------------- keyboard
const isTyping = (t) => { const tag = t?.tagName; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable; };

function onKeydown(e) {
  if (e.key === "Escape") { const p = focusedPane(); if (p) { p.engine.selection = null; p.engine._render(); } return; }
  if (isTyping(e.target)) return;
  const pane = focusedPane();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) pane?.engine.redo(); else pane?.engine.undo(); return; }

  switch (e.key) {
    case "/": e.preventDefault(); openSymbolDialog("pane"); return;
    case ",": cycleTimeframe(-1); return;
    case ".": cycleTimeframe(1); return;
    case "ArrowLeft": pane?.engine.panBars(-1); return;
    case "ArrowRight": pane?.engine.panBars(1); return;
    case "+": case "=": pane?.engine.zoom(0.85); return;
    case "-": pane?.engine.zoom(1.18); return;
    case "Delete": case "Backspace": if (pane?.engine.deleteSelection()) e.preventDefault(); return;
    case " ": if (pane?.replay.active) { e.preventDefault(); toggleReplayPlay(pane); } return;
    case "Tab": {
      e.preventDefault();
      const n = state.panes.length;
      focusPane(e.shiftKey ? (state.focus - 1 + n) % n : (state.focus + 1) % n);
      return;
    }
    default: break;
  }

  const k = e.key.toLowerCase();
  if (k === "v") selectTool("cursor");
  else if (k === "l" && !e.shiftKey) selectTool("trendline");
  else if (k === "h") selectTool("hline");
  else if (k === "r" && !e.shiftKey) selectTool("rect");
  else if (k === "m") selectTool("measure");
  else if (e.key === "T") selectTool("text");
  else if (k === "t") cycleChartType();
  else if (k === "g") { state.settings.grid = !state.settings.grid; store.saveSettings(state.settings); for (const p of state.panes) applyEngineOptions(p); }
  else if (k === "c") { state.settings.crosshair = !state.settings.crosshair; store.saveSettings(state.settings); for (const p of state.panes) applyEngineOptions(p); }
  else if (e.key === "L") { state.settings.logScale = !state.settings.logScale; store.saveSettings(state.settings); for (const p of state.panes) applyEngineOptions(p); }
  else if (k === "f" && e.shiftKey) { e.preventDefault(); toggleFullscreen(); }
  else if (k === "f") pane?.engine.fit();
}

// ---------------------------------------------------------------- boot
function boot() {
  const saved = store.loadLayout();
  const count = [1, 2, 4].includes(saved.panes) ? saved.panes : 1;
  state.layout = String(count);
  buildToolbar();
  setLayout(count, saved.charts?.length ? saved.charts : null);
  renderWatchlist();
  renderAlerts();
  refreshTickers();
  state.tickerTimer = setInterval(() => { if (!document.hidden) refreshTickers(); }, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshTickers(); });
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("storage", (e) => { if (e.key && e.key.indexOf("parchxa.terminal.drawings") === 0) for (const p of state.panes) p.model.load(); });
  new MutationObserver(() => { for (const p of state.panes) applyEngineOptions(p); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("beforeunload", () => { try { stream.unsubscribeAll(); } catch { } });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
