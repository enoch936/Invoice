// PARCHXA Terminal — market-data adapter layer.
//
// Every adapter returns the SAME normalized model so the chart engine never has to
// know which provider produced the data:
//
//   candle = { time (ms, UTC), open, high, low, close, volume }
//   quote  = { symbol, price, changePct, volume, quoteVolume, at, delayed }
//
// Rules this file obeys (see the project brief):
//   * No fabricated prices, candles, volume or order books — ever.
//   * Nothing is labelled "real-time" unless the provider actually streams it.
//   * Providers that need an API key or a server-side proxy are *declared* here
//     with `requiresKey: true` and are never silently faked.
//
// Providers wired today:
//   binance    crypto + fiat spot — REST klines + WebSocket klines (genuinely real-time).
//              Includes the fiat/stablecoin markets Binance actually lists (EUR/USDT, USDT/TRY…).
//   twelvedata real forex       — REST candles for EUR/USD, GBP/USD, USD/JPY and crosses.
//              Optional: needs the visitor's own free key. Polled, never streamed, so it is
//              labelled DELAYED — not LIVE.
//   erapi      FX reference     — open.er-api.com daily reference rates (quote only, no candles).

const BINANCE_HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];
const BINANCE_WS = "wss://data-stream.binance.vision/ws";
const ERAPI_HOST = "https://open.er-api.com/v6/latest";
const TWELVE_HOST = "https://api.twelvedata.com";

/** Provider catalogue. `realtime` and `delayed` drive the honest status badges in the UI. */
export const PROVIDERS = {
  binance: {
    id: "binance",
    label: "Binance spot",
    kind: "crypto",
    realtime: true,
    requiresKey: false,
    timeframes: ["1s", "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"],
    note: "Public exchange REST + WebSocket. Trades and klines are streamed in real time. Availability can be restricted in some regions.",
  },
  erapi: {
    id: "erapi",
    label: "open.er-api reference rates",
    kind: "fx",
    realtime: false,
    delayed: true,
    requiresKey: false,
    timeframes: [],
    note: "Daily exchange-rate reference values published by open.er-api.com. Quote-only: no candle history and not a tradable tick feed.",
  },
  twelvedata: {
    id: "twelvedata",
    label: "Twelve Data (forex)",
    kind: "fx",
    realtime: false,
    delayed: true,
    polled: true,
    requiresKey: true,
    timeframes: ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w", "1M"],
    note: "Real forex OHLC (EUR/USD, GBP/USD, USD/JPY and crosses) from Twelve Data. Needs your own free API key, kept only in this browser. Free-tier data is fetched on a timer, not streamed, so the badge reads DELAYED.",
  },
};

/** Providers that are designed for but NOT currently wired, so the UI can state the truth. */
export const PLANNED_PROVIDERS = [
  { kind: "stocks", label: "US/international equities & ETFs", requiresKey: true, note: "Needs a keyed data vendor (e.g. an entitlement-carrying quote API) or a server-side proxy. Static hosting cannot hold the key." },
  { kind: "indices", label: "Market indices", requiresKey: true, note: "Same as equities — licensed, keyed feed required." },
  { kind: "commodities", label: "Gold, silver, oil, gas", requiresKey: true, note: "Futures/spot commodity feeds are licensed and keyed." },
  { kind: "bonds", label: "Bond yields & rate instruments", requiresKey: true, note: "Government-yield feeds require a licensed provider." },
];

const num = (v) => (Number.isFinite(+v) ? +v : NaN);

async function getJson(url, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCandle(row) {
  const c = {
    time: +row[0], open: num(row[1]), high: num(row[2]), low: num(row[3]),
    close: num(row[4]), volume: num(row[5]),
  };
  return [c.open, c.high, c.low, c.close].every(Number.isFinite) ? c : null;
}

// ---------------------------------------------------------------- Binance

let symbolCache = null;
let fiatCache = null;
let exchangeInfoCache = null;

/** Shared, cached exchangeInfo fetch (both instrument lists read from the same document). */
async function getExchangeInfo() {
  if (exchangeInfoCache) return exchangeInfoCache;
  let lastErr;
  for (const host of BINANCE_HOSTS) {
    try {
      const info = await getJson(`${host}/api/v3/exchangeInfo`, { timeoutMs: 12000 });
      if (!info?.symbols?.length) throw new Error("empty exchangeInfo");
      exchangeInfoCache = info;
      return info;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("exchangeInfo unavailable");
}

/** Real Binance spot instruments from exchangeInfo (filtered to currently-trading pairs). */
export async function listCryptoInstruments({ quoteAssets = ["USDT", "USDC", "FDUSD", "BTC", "ETH", "TRY", "EUR"] } = {}) {
  if (symbolCache) return symbolCache;
  const info = await getExchangeInfo();
  const rows = (info.symbols || [])
    .filter((s) => s.status === "TRADING" && quoteAssets.includes(s.quoteAsset))
    .map((s) => ({ id: s.symbol, base: s.baseAsset, quote: s.quoteAsset, provider: "binance", kind: "crypto", label: `${s.baseAsset}/${s.quoteAsset}` }));
  if (!rows.length) throw new Error("empty instrument list");
  symbolCache = rows;
  return rows;
}

/** Fiat and stablecoin currencies used to pick the real exchange-traded fiat markets. */
const FIAT_CURRENCIES = ["EUR", "GBP", "AUD", "NZD", "JPY", "CHF", "CAD", "TRY", "BRL", "ZAR", "MXN", "AED", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "UAH", "NGN", "KES", "GHS", "INR", "IDR", "PHP", "THB", "MYR", "SGD", "HKD", "CNY", "RUB", "SAR", "ILS", "ISK", "ETB"];
const STABLE_COINS = ["USDT", "USDC", "FDUSD", "TUSD", "BUSD", "DAI", "EURI", "USD1"];

/**
 * The fiat/stablecoin spot markets Binance actually trades — e.g. EUR/USDT, USDT/TRY, USDT/BRL.
 * These are REAL exchange markets that stream over the same WebSocket as crypto, so a fiat pair
 * gets the full live view. They are quoted in a USD-pegged stablecoin, not interbank FX, and the
 * UI says so; nothing here is derived or interpolated.
 */
export async function listBinanceFiatInstruments() {
  if (fiatCache) return fiatCache;
  const info = await getExchangeInfo();
  const rows = (info.symbols || [])
    .filter((s) => s.status === "TRADING")
    .filter((s) => (FIAT_CURRENCIES.includes(s.baseAsset) && STABLE_COINS.includes(s.quoteAsset))
      || (STABLE_COINS.includes(s.baseAsset) && FIAT_CURRENCIES.includes(s.quoteAsset)))
    .map((s) => ({ id: s.symbol, base: s.baseAsset, quote: s.quoteAsset, provider: "binance", kind: "fiat", label: `${s.baseAsset}/${s.quoteAsset}` }));
  if (!fiatCache) fiatCache = rows;
  return rows;
}

/** Historical OHLCV klines. Real exchange candles — never generated. */
export async function fetchCandles(symbol, interval, limit = 500) {
  let lastErr;
  for (const host of BINANCE_HOSTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rows = await getJson(`${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { timeoutMs: 8000 });
        const data = (Array.isArray(rows) ? rows : []).map(normalizeCandle).filter(Boolean);
        if (data.length < 2) throw new Error("short series");
        return data;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error("klines unavailable");
}

/** Rolling 24h ticker stats for a set of symbols (real exchange statistics). */
export async function fetchTickers(symbols) {
  if (!symbols?.length) return new Map();
  const query = encodeURIComponent(JSON.stringify(symbols));
  let lastErr;
  for (const host of BINANCE_HOSTS) {
    try {
      const rows = await getJson(`${host}/api/v3/ticker/24hr?symbols=${query}`, { timeoutMs: 8000 });
      const map = new Map();
      for (const r of Array.isArray(rows) ? rows : []) {
        map.set(r.symbol, {
          symbol: r.symbol, price: num(r.lastPrice), changePct: num(r.priceChangePercent),
          high: num(r.highPrice), low: num(r.lowPrice), volume: num(r.volume), quoteVolume: num(r.quoteVolume),
          at: r.closeTime ? +r.closeTime : Date.now(), delayed: false,
        });
      }
      return map;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("ticker unavailable");
}

/**
 * Real-time kline WebSocket with exponential backoff and clean unsubscription.
 * The browser opens one socket per subscribed (symbol, interval) stream.
 */
export class BinanceKlineStream {
  constructor() {
    this.sockets = new Map(); // key -> { ws, attempts, timer, live }
    this.onStatus = () => {};
  }

  _key(symbol, interval) { return `${String(symbol).toLowerCase()}@kline_${interval}`; }

  /**
   * @param {string} symbol
   * @param {string} interval
   * @param {(candle:object, closed:boolean)=>void} onCandle
   * @param {(state:"connecting"|"live"|"retrying"|"closed", info?:object)=>void} onStatus
   */
  subscribe(symbol, interval, onCandle, onStatus) {
    const key = this._key(symbol, interval);
    this.unsubscribe(key);
    const entry = { ws: null, attempts: 0, timer: null, live: true, key };
    this.sockets.set(key, entry);

    const open = () => {
      if (!entry.live) return;
      onStatus?.("connecting", { symbol, interval });
      let ws;
      try {
        ws = new WebSocket(`${BINANCE_WS}/${key}`);
      } catch (e) { onStatus?.("retrying", { error: String(e) }); return schedule(); }
      entry.ws = ws;
      ws.onopen = () => { entry.attempts = 0; onStatus?.("live", { symbol, interval }); };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const k = msg?.k || msg?.data?.k;
          if (!k) return;
          const candle = { time: +k.t, open: num(k.o), high: num(k.h), low: num(k.l), close: num(k.c), volume: num(k.v) };
          if (![candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)) return;
          onCandle?.(candle, !!k.x);
        } catch { /* ignore malformed frames */ }
      };
      ws.onerror = () => { onStatus?.("retrying", { symbol, interval }); };
      ws.onclose = () => { if (entry.live && this.sockets.get(key) === entry) schedule(); };
    };

    const schedule = () => {
      if (!entry.live) return;
      entry.attempts++;
      const delay = Math.min(30000, 1000 * Math.pow(1.7, entry.attempts - 1));
      onStatus?.("retrying", { symbol, interval, attempt: entry.attempts, delayMs: delay });
      entry.timer = setTimeout(open, delay);
    };

    open();
    return key;
  }

  unsubscribe(key) {
    const entry = this.sockets.get(key);
    if (!entry) return;
    entry.live = false;
    clearTimeout(entry.timer);
    try { entry.ws?.close(); } catch { }
    this.sockets.delete(key);
  }

  unsubscribeAll() {
    for (const key of [...this.sockets.keys()]) this.unsubscribe(key);
  }
}

// ---------------------------------------------------------------- FX (quote-only)

export const FX_BASE_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "ETB", "KES", "NGN", "ZAR", "INR", "CAD", "AUD", "CHF", "CNY", "AED"];

/** Daily FX reference quote. Delayed by definition — the response carries its own date. */
export async function fetchFxQuote(base, quote) {
  const data = await getJson(`${ERAPI_HOST}/${encodeURIComponent(base)}`, { timeoutMs: 8000 });
  const rate = data?.rates?.[quote];
  if (!Number.isFinite(+data?.rates?.[quote])) throw new Error("rate unavailable");
  return {
    symbol: `${base}/${quote}`,
    price: +rate,
    changePct: NaN,
    at: data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now(),
    delayed: true,
    published: data.time_last_update_utc || data.date || "",
  };
}

/** Build the FX instrument list (quote-only, no candles). */
export function listFxInstruments() {
  const out = [];
  for (const base of FX_BASE_CURRENCIES) {
    for (const quote of FX_BASE_CURRENCIES) {
      if (base === quote) continue;
      out.push({ id: `${base}${quote}`, base, quote, provider: "erapi", kind: "fx", label: `${base}/${quote}` });
    }
  }
  return out;
}

// ---------------------------------------------------------------- FX (Twelve Data, optional key)

/** Terminal interval → Twelve Data interval. Only the intervals Twelve Data actually serves. */
export const TWELVE_INTERVALS = {
  "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min",
  "1h": "1h", "2h": "2h", "4h": "4h", "1d": "1day", "1w": "1week", "1M": "1month",
};

/** A curated set of REAL forex pairs Twelve Data publishes (majors + common crosses). */
const TWELVE_FX_PAIRS = [
  ["EUR", "USD"], ["GBP", "USD"], ["USD", "JPY"], ["USD", "CHF"],
  ["AUD", "USD"], ["USD", "CAD"], ["NZD", "USD"],
  ["EUR", "GBP"], ["EUR", "JPY"], ["EUR", "CHF"], ["EUR", "AUD"], ["EUR", "CAD"], ["EUR", "NZD"],
  ["GBP", "JPY"], ["GBP", "CHF"], ["GBP", "AUD"], ["GBP", "CAD"], ["GBP", "NZD"],
  ["AUD", "JPY"], ["AUD", "CAD"], ["AUD", "CHF"], ["AUD", "NZD"],
  ["CAD", "JPY"], ["CAD", "CHF"], ["CHF", "JPY"], ["NZD", "JPY"],
  ["USD", "SEK"], ["USD", "NOK"], ["USD", "DKK"], ["USD", "PLN"], ["USD", "HUF"], ["USD", "CZK"],
  ["USD", "TRY"], ["USD", "ZAR"], ["USD", "MXN"], ["USD", "SGD"], ["USD", "HKD"], ["USD", "CNH"],
  ["USD", "INR"], ["USD", "BRL"], ["USD", "ILS"], ["USD", "THB"],
  ["EUR", "PLN"], ["EUR", "SEK"], ["EUR", "NOK"], ["EUR", "ZAR"], ["EUR", "TRY"], ["EUR", "HUF"],
  ["ETB", "USD"], ["KES", "USD"], ["NGN", "USD"],
];

/** Real forex instruments served by Twelve Data. Requires the visitor's own key to load. */
export function listTwelveFxInstruments() {
  return TWELVE_FX_PAIRS.map(([base, quote]) => ({ id: `${base}/${quote}`, base, quote, provider: "twelvedata", kind: "fx", label: `${base}/${quote}` }));
}

function parseTwelveTime(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s || ""));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

/**
 * Real forex candles from Twelve Data. Throws a descriptive error on a bad key, a rate limit or
 * an empty series — it never returns substitute data.
 */
export async function fetchTwelveCandles(symbol, interval, apiKey, outputsize = 500) {
  if (!apiKey) throw new Error("no Twelve Data API key set");
  const tdInterval = TWELVE_INTERVALS[interval] || interval;
  const qs = new URLSearchParams({ symbol, interval: tdInterval, outputsize: String(outputsize), apikey: apiKey, timezone: "UTC", format: "JSON" });
  const data = await getJson(`${TWELVE_HOST}/time_series?${qs}`, { timeoutMs: 10000 });
  if (data?.status === "error" || (data?.code && !data?.values)) throw new Error(data?.message || `Twelve Data error ${data.code}`);
  const rows = Array.isArray(data?.values) ? data.values : [];
  const candles = rows
    .map((r) => ({ time: parseTwelveTime(r.datetime), open: num(r.open), high: num(r.high), low: num(r.low), close: num(r.close), volume: num(r.volume) }))
    .filter((c) => Number.isFinite(c.time) && [c.open, c.high, c.low, c.close].every(Number.isFinite))
    .sort((a, b) => a.time - b.time);
  if (candles.length < 2) throw new Error(`Twelve Data returned no candles for ${symbol} ${tdInterval}`);
  return candles;
}

/** Describe how the UI should present honesty badges + capability for a data set. */
export function providerStatus({ providerId, live, delayed, error }) {
  if (error) return { key: "error", label: "ERROR", detail: error };
  if (providerId === "erapi") return { key: "delayed", label: "DELAYED (daily ref)", detail: PROVIDERS.erapi.note };
  if (providerId === "twelvedata") return { key: "delayed", label: "DELAYED (polled)", detail: PROVIDERS.twelvedata.note };
  if (live) return { key: "live", label: "LIVE", detail: "Streaming real exchange klines over WebSocket." };
  if (delayed) return { key: "delayed", label: "DELAYED", detail: "Snapshot data, not a live stream." };
  return { key: "cached", label: "CACHED", detail: "Historical candles loaded; live stream not connected." };
}

/** Format a price with provider-appropriate precision (no rounding that invents data). */
export function formatPrice(v, ref) {
  if (!Number.isFinite(v)) return "—";
  const r = Math.abs(Number.isFinite(ref) && ref !== 0 ? ref : v);
  const dp = r >= 1000 ? 2 : r >= 100 ? 3 : r >= 1 ? 4 : r >= 0.01 ? 6 : 8;
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export function formatCompact(v) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return v.toFixed(2);
}
