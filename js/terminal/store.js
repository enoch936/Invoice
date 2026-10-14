// PARCHXA Terminal — versioned local storage for settings, watchlists, alerts and layouts.
//
// Everything read back is treated as hostile: values are type-checked and clamped
// before use. Write failures (private mode / quota) never break the app — the
// in-memory state simply keeps working for the session.

const KEYS = {
  settings: "parchxa.terminal.settings.v1",
  watchlist: "parchxa.terminal.watchlist.v1",
  alerts: "parchxa.terminal.alerts.v1",
  layout: "parchxa.terminal.layout.v1",
  keys: "parchxa.terminal.keys.v1",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : fallback;
  } catch { return fallback; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const bool = (v, d) => (typeof v === "boolean" ? v : d);
const hex = (v, d) => (typeof v === "string" && HEX.test(v) ? v : d);

export const DEFAULT_SETTINGS = {
  grid: true,
  crosshair: true,
  logScale: false,
  upColor: "#26a69a",
  downColor: "#ef5350",
  timezone: "local",
  chartType: "candles",
  confirmDelete: true,
  syncCrosshair: true,
  syncTime: true,
};

export function loadSettings() {
  const s = read(KEYS.settings, {});
  return {
    grid: bool(s.grid, DEFAULT_SETTINGS.grid),
    crosshair: bool(s.crosshair, DEFAULT_SETTINGS.crosshair),
    logScale: bool(s.logScale, DEFAULT_SETTINGS.logScale),
    upColor: hex(s.upColor, DEFAULT_SETTINGS.upColor),
    downColor: hex(s.downColor, DEFAULT_SETTINGS.downColor),
    timezone: s.timezone === "utc" ? "utc" : "local",
    chartType: typeof s.chartType === "string" ? s.chartType : DEFAULT_SETTINGS.chartType,
    confirmDelete: bool(s.confirmDelete, DEFAULT_SETTINGS.confirmDelete),
    syncCrosshair: bool(s.syncCrosshair, DEFAULT_SETTINGS.syncCrosshair),
    syncTime: bool(s.syncTime, DEFAULT_SETTINGS.syncTime),
  };
}

export function saveSettings(s) { return write(KEYS.settings, s); }

export const DEFAULT_WATCHLIST = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "LTCUSDT", "DOTUSDT", "TRXUSDT"];

export function loadWatchlist() {
  const w = read(KEYS.watchlist, {});
  const symbols = Array.isArray(w.symbols) ? w.symbols.filter((s) => typeof s === "string" && /^[A-Z0-9]{2,20}$/.test(s)).slice(0, 100) : [];
  return { symbols: symbols.length ? symbols : [...DEFAULT_WATCHLIST], sort: typeof w.sort === "string" ? w.sort : "none", dir: w.dir === 1 ? 1 : -1 };
}

export function saveWatchlist(w) { return write(KEYS.watchlist, { symbols: w.symbols.slice(0, 100), sort: w.sort, dir: w.dir }); }

export function loadAlerts() {
  const a = read(KEYS.alerts, {});
  const list = Array.isArray(a.list) ? a.list : Array.isArray(a) ? a : [];
  return list.map(validateAlert).filter(Boolean).slice(0, 100);
}

function validateAlert(a) {
  if (!a || typeof a !== "object") return null;
  const symbol = typeof a.symbol === "string" ? a.symbol : null;
  const dir = a.dir === "below" ? "below" : "above";
  const price = Number(a.price);
  if (!symbol || !Number.isFinite(price)) return null;
  return {
    id: typeof a.id === "string" ? a.id : `a${Math.random().toString(36).slice(2, 9)}`,
    symbol, dir, price,
    active: bool(a.active, true),
    createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date().toISOString(),
    triggeredAt: typeof a.triggeredAt === "string" ? a.triggeredAt : null,
  };
}

export function saveAlerts(list) { return write(KEYS.alerts, list); }

export const DEFAULT_LAYOUT = { panes: 1, split: "v" };

export function loadLayout() {
  const l = read(KEYS.layout, {});
  const panes = [1, 2, 4].includes(l.panes) ? l.panes : 1;
  return { panes, split: l.split === "h" ? "h" : "v", charts: Array.isArray(l.charts) ? l.charts.slice(0, 4) : [] };
}

export function saveLayout(l) { return write(KEYS.layout, l); }

// ---------------------------------------------------------------- optional provider API keys
//
// Keys belong to the visitor, are used only for direct browser→provider calls and are kept in
// local storage on this device. They are never sent anywhere else. Everything is trimmed and
// length-capped on read so a corrupt value cannot break the app.

export const DEFAULT_KEYS = { twelvedata: "" };

export function loadKeys() {
  const k = read(KEYS.keys, {});
  const td = typeof k.twelvedata === "string" ? k.twelvedata.trim().slice(0, 64) : "";
  return { twelvedata: /^[A-Za-z0-9]{8,64}$/.test(td) ? td : "" };
}

export function saveKeys(k) {
  const td = typeof k?.twelvedata === "string" ? k.twelvedata.trim().slice(0, 64) : "";
  return write(KEYS.keys, { twelvedata: /^[A-Za-z0-9]{8,64}$/.test(td) ? td : "" });
}

export function migrate() {
  // Placeholder for future schema migrations. Unknown/legacy keys are simply ignored
  // because every reader falls back to defaults when the shape is wrong.
  return true;
}
