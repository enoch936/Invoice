// PARCHXA Terminal — indicator registry.
//
// Each entry declares its parameters and a pure `calc(candles, params)` that returns
// series already computed by js/quant.js. The engine only renders; it never invents
// indicator values. Warm-up NaNs are preserved and simply not drawn.
//
// Resolved shape returned by `computeIndicator`:
//   { id, key, label, params, overlay, main:[series], pane:null | { series, refs, fixedScale } }
//   series = { name, type:'line'|'hist'|'band', data, data2, upper, lower, color, width, dash }

const closes = (candles) => candles.map((c) => c.close);

export const CATALOG = [
  // ---------------- moving averages / overlays ----------------
  { id: "sma", label: "SMA", group: "Moving averages", overlay: true, params: [{ key: "period", label: "Period", def: 50, min: 2, max: 500 }],
    calc: (c, p, q, c2) => ({ main: [{ name: `SMA ${p.period}`, data: q.sma(c2, p.period), color: "#f5b942" }] }) },
  { id: "ema", label: "EMA", overlay: true, params: [{ key: "period", label: "Period", def: 21, min: 2, max: 400 }],
    calc: (c, p) => ({ main: [{ name: `EMA ${p.period}`, data: q.ema(c.map((x) => x.close), p.period), color: "#8dafff" }] }) },
  { id: "wma", label: "WMA", overlay: true, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }], calc: (c, p) => ({ main: [{ name: `WMA ${p.period}`, data: q.wma(c.map((x) => x.close), p.period), color: "#c792ea" }] }) },
  { id: "dema", label: "DEMA", overlay: true, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }], calc: (c, p) => ({ main: [{ name: `DEMA ${p.period}`, data: q.dema(c.map((x) => x.close), p.period), color: "#f78fb3" }] }) },
  { id: "tema", label: "TEMA", overlay: true, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }], calc: (c, p) => ({ main: [{ name: `TEMA ${p.period}`, data: q.tema(c.map((x) => x.close), p.period), color: "#f6c177" }] }) },
  { id: "vwap", label: "VWAP", overlay: true, params: [], calc: (c) => ({ main: [{ name: "VWAP", data: q.vwap(c), color: "#8bd5ca", width: 1.4 }] }) },
  { id: "anchoredVwap", label: "Anchored VWAP", overlay: true, params: [{ key: "start", label: "Anchor bar", def: 0, min: 0, max: 100000 }], calc: (c, p) => ({ main: [{ name: `Anchored VWAP (${p.start})`, data: q.anchoredVwap(c, Math.max(0, Math.min(c.length - 1, p.start))), color: "#94e2d5", width: 1.4 }] }) },
  { id: "bollinger", label: "Bollinger Bands", overlay: true, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }, { key: "mult", label: "StdDevs", def: 2, min: 0.1, max: 10, step: 0.1 }], calc: (c, p) => { const b = q.bollinger(c.map((x) => x.close), p); return { main: [{ name: `BB ${p.period}`, type: "band", upper: b.upper, lower: b.lower, data: b.middle, color: "#8dafff" }] }; } },
  { id: "keltner", label: "Keltner Channels", overlay: true, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }, { key: "mult", label: "ATR mult", def: 2, min: 0.1, max: 10, step: 0.1 }], calc: (c, p) => { const k = q.keltner(c, p); return { main: [{ name: `Keltner ${p.period}`, type: "band", upper: k.upper, lower: k.lower, data: k.middle, color: "#f5b942" }] }; } },
  { id: "donchian", label: "Donchian Channels", overlay: true, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }], calc: (c, p) => { const d = q.donchian(c, p.period); return { main: [{ name: `Donchian ${p.period}`, type: "band", upper: d.upper, lower: d.lower, data: d.middle, color: "#c792ea" }] }; } },
  { id: "regression", label: "Regression Channel", overlay: true, params: [{ key: "mult", label: "Std-error mult", def: 2, min: 0.5, max: 6, step: 0.5 }], calc: (c, p) => { const r = q.regressionChannel(c.map((x) => x.close), p); return { main: [{ name: "Regression", type: "band", upper: r.upper, lower: r.lower, data: r.middle, color: "#8bd5ca" }] }; } },
  { id: "swings", label: "Swing Highs/Lows", overlay: true, params: [{ key: "left", label: "Bars left", def: 2, min: 1, max: 50 }, { key: "right", label: "Bars right", def: 2, min: 1, max: 50 }], calc: (c, p) => { const s = q.swingPoints(c, p); return { main: [{ name: "Swings", type: "markers", highs: s.highs.map((i) => ({ index: i, price: c[i].high })), lows: s.lows.map((i) => ({ index: i, price: c[i].low })) }] }; } },
  { id: "ichimoku", label: "Ichimoku Cloud", overlay: true, params: [{ key: "conversion", label: "Conversion", def: 9, min: 2, max: 200 }, { key: "base", label: "Base", def: 26, min: 2, max: 300 }, { key: "spanB", label: "Span B", def: 52, min: 3, max: 400 }], calc: (c, p) => { const i = q.ichimoku(c, { conversion: p.conversion, base: p.base, spanB: p.spanB }); return { main: [{ name: "Tenkan", data: i.tenkan, color: "#8dafff" }, { name: "Kijun", data: i.kijun, color: "#f5b942" }, { name: "Senkou A", data: i.senkouA, color: "#a6e3a1", dash: [4, 3] }, { name: "Senkou B", data: i.senkouB, color: "#f38ba8", dash: [4, 4] }] }; } },
  { id: "supertrend", label: "Supertrend", overlay: true, params: [{ key: "period", label: "ATR period", def: 10, min: 2, max: 100 }, { key: "mult", label: "Multiplier", def: 3, min: 0.5, max: 10, step: 0.5 }], calc: (c, p) => { const s = q.supertrend(c, p); return { main: [{ name: "Supertrend", data: s.line, color: "#a6e3a1", width: 1.6 }] }; } },

  // ---- panes ----
  { id: "volume", label: "Volume", overlay: false, params: [{ key: "period", label: "MA period", def: 20, min: 0, max: 200 }], calc: (c, p) => { const v = c.map((x) => (Number.isFinite(x.volume) ? x.volume : 0)); const series = [{ name: "Volume", type: "hist", data: v, color: "#8dafff" }]; if (p.period >= 2) series.push({ name: `Vol MA ${p.period}`, data: q.sma(v, p.period), color: "#f5b942" }); return { pane: { series, refs: [] } }; } },
  { id: "rsi", label: "RSI", overlay: false, params: [{ key: "period", label: "Period", def: 14, min: 2, max: 200 }], calc: (c, p) => ({ pane: { series: [{ name: `RSI ${p.period}`, data: q.rsi(c.map((x) => x.close), p.period), color: "#c792ea" }], refs: [{ value: 30, color: "#f38ba8" }, { value: 70, color: "#a6e3a1" }], fixedScale: [0, 100] } }) },
  { id: "macd", label: "MACD", overlay: false, params: [{ key: "fast", label: "Fast", def: 12, min: 2, max: 200 }, { key: "slow", label: "Slow", def: 26, min: 3, max: 400 }, { key: "signal", label: "Signal", def: 9, min: 2, max: 200 }], calc: (c, p) => { const m = q.macd(c.map((x) => x.close), p); return { pane: { series: [{ name: `MACD ${p.fast},${p.slow}`, data: m.macd, color: "#8dafff" }, { name: `Signal ${p.signal}`, data: m.signal, color: "#f5b942" }, { name: "Hist", type: "hist", data: m.histogram, color: "#8bd5ca" }], refs: [{ value: 0, color: "#5b6880" }] } }; } },
  { id: "stochastic", label: "Stochastic", overlay: false, params: [{ key: "kPeriod", label: "%K", def: 14, min: 2, max: 200 }, { key: "dPeriod", label: "%D", def: 3, min: 1, max: 100 }], calc: (c, p) => { const s = q.stochastic(c, p); return { pane: { series: [{ name: "%K", data: s.k, color: "#8dafff" }, { name: "%D", data: s.d, color: "#f5b942" }], refs: [{ value: 20, color: "#f38ba8" }, { value: 80, color: "#a6e3a1" }], fixedScale: [0, 100] } }; } },
  { id: "atr", label: "ATR", overlay: false, params: [{ key: "period", label: "Period", def: 14, min: 2, max: 200 }], calc: (c, p) => ({ pane: { series: [{ name: `ATR ${p.period}`, data: q.atr(c, p.period), color: "#f6c177" }], refs: [] } }) },
  { id: "adx", label: "ADX / DI", overlay: false, params: [{ key: "period", label: "Period", def: 14, min: 2, max: 200 }], calc: (c, p) => { const a = q.adx(c, p.period); return { pane: { series: [{ name: `ADX ${p.period}`, data: a.adx, color: "#f5b942" }, { name: "+DI", data: a.plusDI, color: "#a6e3a1" }, { name: "−DI", data: a.minusDI, color: "#f38ba8" }], refs: [{ value: 25, color: "#5b6880" }], fixedScale: [0, 100] } }; } },
  { id: "cci", label: "CCI", overlay: false, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 300 }], calc: (c, p) => ({ pane: { series: [{ name: `CCI ${p.period}`, data: q.cci(c, p.period), color: "#c792ea" }], refs: [{ value: 100, color: "#f38ba8" }, { value: -100, color: "#a6e3a1" }] } }) },
  { id: "williamsR", label: "Williams %R", overlay: false, params: [{ key: "period", label: "Period", def: 14, min: 2, max: 200 }], calc: (c, p) => ({ pane: { series: [{ name: `%R ${p.period}`, data: q.williamsR(c, p.period), color: "#8bd5ca" }], refs: [{ value: -20, color: "#f38ba8" }, { value: -80, color: "#a6e3a1" }], fixedScale: [-100, 0] } }) },
  { id: "roc", label: "Rate of Change", overlay: false, params: [{ key: "period", label: "Period", def: 12, min: 1, max: 300 }], calc: (c, p) => ({ pane: { series: [{ name: `ROC ${p.period}`, data: q.roc(c.map((x) => x.close), p.period), color: "#f78fb3" }], refs: [{ value: 0, color: "#5b6880" }] } }) },
  { id: "momentum", label: "Momentum", overlay: false, params: [{ key: "period", label: "Period", def: 10, min: 1, max: 300 }], calc: (c, p) => ({ pane: { series: [{ name: `Momentum ${p.period}`, data: q.momentum(c.map((x) => x.close), p.period), color: "#f6c177" }], refs: [{ value: 0, color: "#5b6880" }] } }) },
  { id: "mfi", label: "Money Flow Index", overlay: false, params: [{ key: "period", label: "Period", def: 14, min: 2, max: 200 }], calc: (c, p) => ({ pane: { series: [{ name: `MFI ${p.period}`, data: q.mfi(c, p.period), color: "#c792ea" }], refs: [{ value: 20, color: "#f38ba8" }, { value: 80, color: "#a6e3a1" }], fixedScale: [0, 100] } }) },
  { id: "obv", label: "On-Balance Volume", overlay: false, params: [], calc: (c) => ({ pane: { series: [{ name: "OBV", data: q.obv(c), color: "#8dafff" }], refs: [] } }) },
  { id: "ad", label: "Accum/Distribution", overlay: false, params: [], calc: (c) => ({ pane: { series: [{ name: "A/D", data: q.accumulationDistribution(c), color: "#8bd5ca" }], refs: [] } }) },
  { id: "cmf", label: "Chaikin Money Flow", overlay: false, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 300 }], calc: (c, p) => ({ pane: { series: [{ name: `CMF ${p.period}`, data: q.chaikinMoneyFlow(c, p.period), color: "#a6e3a1" }], refs: [{ value: 0, color: "#5b6880" }] } }) },
  { id: "historicalVol", label: "Historical Volatility", overlay: false, params: [{ key: "period", label: "Period", def: 20, min: 2, max: 400 }, { key: "periodsPerYear", label: "Periods/yr", def: 365, min: 1, max: 8760 }], calc: (c, p) => ({ pane: { series: [{ name: "Hist. vol %", data: q.historicalVolatility(c.map((x) => x.close), p), color: "#f78fb3" }], refs: [] } }) },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((d) => [d.id, d]));

/** Clamp + coerce user params against the descriptor defaults, then compute the series. */
export function computeIndicator(instance, candles) {
  const def = CATALOG_BY_ID.get(instance.id);
  if (!def || !Array.isArray(candles) || candles.length === 0) return null;
  const params = {};
  for (const p of def.params) {
    const raw = instance.params?.[p.key];
    let v = Number(raw);
    if (!Number.isFinite(v)) v = p.def;
    if (p.min !== undefined) v = Math.max(p.min, v);
    if (p.max !== undefined) v = Math.min(p.max, v);
    params[p.key] = v;
  }
  // Guard against inverted MACD periods etc.
  if (def.id === "macd" && params.slow <= params.fast) params.slow = params.fast + 1;
  if (def.id === "anchoredVwap" && params.start > candles.length - 1) params.start = 0;

  let out;
  try { out = def.calc(candles, params) || {}; } catch { out = {}; }
  const main = Array.isArray(out.main) ? out.main : [];
  const pane = out.pane ? { series: out.pane.series || [], refs: out.pane.refs || [], fixedScale: out.pane.fixedScale || null } : null;

  return {
    id: def.id,
    key: instance.key || def.id,
    label: def.label,
    params,
    overlay: !!def.overlay,
    main,
    pane,
    legendValues: [...main, ...(pane?.series || [])].map((s) => ({ name: s.name, data: s.data })),
  };
}

/** Unique-ish instance key so duplicates and removals stay predictable. */
let seq = 0;
export function makeInstance(id, params) {
  const def = CATALOG_BY_ID.get(id);
  if (!def) return null;
  const p = {};
  for (const par of def.params) {
    const raw = Number(params?.[par.key]);
    p[par.key] = Number.isFinite(raw) ? raw : par.def;
  }
  return { id, key: `${id}:${++seq}`, params: p };
}

export function defaultParams(id) {
  const def = CATALOG_BY_ID.get(id);
  const p = {};
  def?.params.forEach((par) => { p[par.key] = par.def; });
  return p;
}
