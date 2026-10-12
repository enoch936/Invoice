// Pure, UI-free quant & finance helpers. Every function validates input and returns NaN-safe results.
// Educational use only. Not financial advice.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : NaN);

/** Position size: units = (equity * riskPct/100) / |entry - stop|. Fees reduce effective risk per unit. */
export function positionSize({ equity, riskPct, entry, stop, feePct = 0 }) {
  [equity, riskPct, entry, stop] = [equity, riskPct, entry, stop].map(num);
  const dist = Math.abs(entry - stop);
  if (!(equity > 0) || !(riskPct > 0) || !(entry > 0) || !(stop > 0) || dist === 0) return null;
  const riskAmount = equity * riskPct / 100;
  const feePerUnit = entry * (num(feePct) || 0) / 100 * 2; // entry + exit
  const units = riskAmount / (dist + feePerUnit);
  const notional = units * entry;
  return { riskAmount, units, notional, side: stop < entry ? "long" : "short", stopDistancePct: dist / entry * 100 };
}

/** Reward:risk and R-multiple targets for a trade plan. */
export function rMultiples({ entry, stop, targets }) {
  entry = num(entry); stop = num(stop);
  const risk = Math.abs(entry - stop);
  if (!(risk > 0)) return [];
  const dir = stop < entry ? 1 : -1;
  return (targets || []).map((t) => ({ target: t, r: (dir * (num(t) - entry)) / risk }));
}

/** Break-even win rate for reward:risk ratio b (ignoring costs): 1 / (1 + b). */
export const breakevenWinRate = (b) => (num(b) > 0 ? 1 / (1 + num(b)) : NaN);

/** Expectancy in R: p*b - (1-p). */
export const expectancyR = (p, b) => num(p) * num(b) - (1 - num(p));

/** Kelly fraction f* = p - (1-p)/b, clamped to [0, 1]. */
export function kelly(p, b) {
  p = num(p); b = num(b);
  if (!(p >= 0 && p <= 1) || !(b > 0)) return NaN;
  return Math.min(1, Math.max(0, p - (1 - p) / b));
}

/** Approximate isolated-margin liquidation price (exchange formulas differ; mmr = maintenance margin rate). */
export function liquidationPrice({ entry, leverage, side, mmr = 0.005 }) {
  entry = num(entry); leverage = num(leverage); mmr = num(mmr);
  if (!(entry > 0) || !(leverage >= 1)) return NaN;
  return side === "short" ? entry * (1 + 1 / leverage - mmr) : entry * (1 - 1 / leverage + mmr);
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function percentile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Monte Carlo of fixed-fractional risk. Each trade wins with prob p (+riskFrac*b of equity) or loses riskFrac of equity.
 * ruinPct: fraction of starting equity lost at which the path counts as "ruined" (e.g. 0.5).
 */
export function monteCarlo({ p, b, riskFrac, trades = 100, paths = 1000, seed = 42, ruinPct = 0.5 }) {
  p = num(p); b = num(b); riskFrac = num(riskFrac);
  if (!(p >= 0 && p <= 1) || !(b > 0) || !(riskFrac > 0 && riskFrac < 1)) return null;
  const rand = rng(seed), steps = trades + 1;
  const cols = Array.from({ length: steps }, () => new Float64Array(paths));
  let ruined = 0, worstDd = [];
  for (let i = 0; i < paths; i++) {
    let eq = 1, peak = 1, maxDd = 0, hit = false;
    cols[0][i] = 1;
    for (let t = 1; t <= trades; t++) {
      eq *= rand() < p ? 1 + riskFrac * b : 1 - riskFrac;
      peak = Math.max(peak, eq);
      maxDd = Math.max(maxDd, 1 - eq / peak);
      if (eq <= 1 - ruinPct) hit = true;
      cols[t][i] = eq;
    }
    if (hit) ruined++;
    worstDd.push(maxDd);
  }
  const qs = [0.05, 0.25, 0.5, 0.75, 0.95];
  const bands = qs.map(() => new Array(steps));
  for (let t = 0; t < steps; t++) {
    const sorted = Float64Array.from(cols[t]).sort();
    qs.forEach((q, k) => { bands[k][t] = percentile(sorted, q); });
  }
  worstDd.sort((x, y) => x - y);
  return { quantiles: qs, bands, probRuin: ruined / paths, medianMaxDrawdown: percentile(worstDd, 0.5), p95MaxDrawdown: percentile(worstDd, 0.95), finalMedian: bands[2][trades] };
}

/** Future value with monthly contributions. rate = annual %, compounding monthly. */
export function futureValue({ principal, monthly, annualPct, years }) {
  [principal, monthly, annualPct, years] = [principal, monthly, annualPct, years].map(num);
  if ([principal, monthly, annualPct, years].some((v) => !(v >= 0))) return null;
  const r = annualPct / 100 / 12, n = Math.round(years * 12);
  const rows = []; let bal = principal, contributed = principal;
  for (let m = 1; m <= n; m++) {
    bal = bal * (1 + r) + monthly; contributed += monthly;
    if (m % 12 === 0 || m === n) rows.push({ year: m / 12, balance: bal, contributed });
  }
  return { balance: bal, contributed, growth: bal - contributed, rows };
}

/** CAGR = (end/start)^(1/years) - 1. */
export const cagr = (start, end, years) => (num(start) > 0 && num(end) > 0 && num(years) > 0 ? (Math.pow(end / start, 1 / years) - 1) * 100 : NaN);

/** Tax set-aside: simple flat-rate reserve per payment; not tax advice. */
export function taxSetAside({ income, ratePct, expenses = 0 }) {
  [income, ratePct, expenses] = [income, ratePct, expenses].map(num);
  if (!(income >= 0) || !(ratePct >= 0 && ratePct <= 100) || !(expenses >= 0)) return null;
  const taxable = Math.max(0, income - expenses), tax = taxable * ratePct / 100;
  return { taxable, tax, takeHome: income - tax, quarterly: tax / 4, monthly: tax / 12 };
}

/** GPA from [{credits, points}] rows. */
export function gpa(rows) {
  let c = 0, q = 0;
  for (const r of rows) { const cr = num(r.credits), pt = num(r.points); if (cr > 0 && pt >= 0) { c += cr; q += cr * pt; } }
  return c > 0 ? { gpa: q / c, credits: c } : null;
}

/** Required GPA over remaining credits to reach a target cumulative GPA. */
export function requiredGpa({ currentGpa, currentCredits, remainingCredits, target }) {
  [currentGpa, currentCredits, remainingCredits, target] = [currentGpa, currentCredits, remainingCredits, target].map(num);
  if (!(remainingCredits > 0) || !(currentCredits >= 0)) return NaN;
  return (target * (currentCredits + remainingCredits) - currentGpa * currentCredits) / remainingCredits;
}

// ---------------- Indicators & backtesting ----------------
/** Simple moving average. Returns array aligned to input; leading values are NaN. */
export function sma(values, period) {
  const out = new Array(values.length).fill(NaN);
  if (!(period >= 1)) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential moving average, seeded with the SMA of the first `period` values. alpha = 2/(period+1). */
export function ema(values, period) {
  const out = new Array(values.length).fill(NaN);
  if (!(period >= 1) || values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) { prev = values[i] * k + prev * (1 - k); out[i] = prev; }
  return out;
}

/** Wilder RSI. */
export function rsi(values, period = 14) {
  const out = new Array(values.length).fill(NaN);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) { const d = values[i] - values[i - 1]; if (d >= 0) gain += d; else loss -= d; }
  gain /= period; loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Average True Range (Wilder). candles: [{high, low, close}] */
export function atr(candles, period = 14) {
  const out = new Array(candles.length).fill(NaN);
  if (candles.length <= period) return out;
  const tr = candles.map((c, i) => (i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close))));
  let prev = tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = prev;
  for (let i = period + 1; i < candles.length; i++) { prev = (prev * (period - 1) + tr[i]) / period; out[i] = prev; }
  return out;
}

/**
 * Long-only EMA-crossover strategy with RSI filter and fixed fee+slippage per side.
 * Signals use the CLOSE of bar i and fill at the OPEN of bar i+1 (no look-ahead).
 * Returns trades, equity curve (per bar, starting 1) and summary stats.
 */
export function backtestEmaCross(candles, { fast = 9, slow = 21, rsiMax = 70, feePct = 0.1, slippagePct = 0.05 } = {}) {
  if (!Array.isArray(candles) || candles.length < slow + 5 || !(fast < slow)) return null;
  const closes = candles.map((c) => c.close), f = ema(closes, fast), s = ema(closes, slow), r = rsi(closes, 14);
  const cost = (feePct + slippagePct) / 100;
  const trades = [], signals = [], equity = new Array(candles.length).fill(1);
  let eq = 1, entry = null;
  for (let i = 1; i < candles.length; i++) {
    equity[i] = entry ? eq * (candles[i].close / entry.price) : eq;
    if (!Number.isFinite(s[i - 1]) || !Number.isFinite(f[i - 1])) continue;
    const up = f[i - 1] <= s[i - 1] && f[i] > s[i], down = f[i - 1] >= s[i - 1] && f[i] < s[i];
    if (i + 1 >= candles.length) continue;
    if (!entry && up && !(r[i] > rsiMax)) {
      const price = candles[i + 1].open * (1 + cost);
      entry = { index: i + 1, price, time: candles[i + 1].time };
      signals.push({ index: i, side: "buy" });
    } else if (entry && down) {
      const price = candles[i + 1].open * (1 - cost);
      const ret = price / entry.price - 1;
      eq *= 1 + ret;
      trades.push({ entryIndex: entry.index, exitIndex: i + 1, entryTime: entry.time, exitTime: candles[i + 1].time, entry: entry.price, exit: price, returnPct: ret * 100 });
      signals.push({ index: i, side: "sell" });
      entry = null;
      equity[i] = eq;
    }
  }
  return { trades, signals, equity, stats: summarize(trades, equity, candles) };
}

export function summarize(trades, equity, candles) {
  const wins = trades.filter((t) => t.returnPct > 0), losses = trades.filter((t) => t.returnPct <= 0);
  const gw = wins.reduce((a, t) => a + t.returnPct, 0), gl = -losses.reduce((a, t) => a + t.returnPct, 0);
  let peak = 1, maxDd = 0;
  for (const e of equity) { peak = Math.max(peak, e); maxDd = Math.max(maxDd, 1 - e / peak); }
  const rets = []; for (let i = 1; i < equity.length; i++) rets.push(equity[i] / equity[i - 1] - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
  const down = Math.sqrt(rets.reduce((a, b) => a + Math.min(0, b) ** 2, 0) / (rets.length || 1));
  return {
    trades: trades.length,
    winRate: trades.length ? wins.length / trades.length * 100 : NaN,
    profitFactor: gl > 0 ? gw / gl : (gw > 0 ? Infinity : NaN),
    expectancyPct: trades.length ? trades.reduce((a, t) => a + t.returnPct, 0) / trades.length : NaN,
    totalReturnPct: (equity[equity.length - 1] - 1) * 100,
    maxDrawdownPct: maxDd * 100,
    sharpePerBar: sd > 0 ? mean / sd : NaN,
    sortinoPerBar: down > 0 ? mean / down : NaN,
    bars: candles.length,
  };
}

/** Deterministic synthetic candles for offline/demo mode. Clearly labelled as demo in the UI. */
export function demoCandles(n = 300, seed = 11, start = 100) {
  const rand = rng(seed), out = []; let price = start, t = Date.UTC(2024, 0, 1);
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 25) * 0.4, open = price, close = Math.max(1, open * (1 + (rand() - 0.5) * 0.03 + drift / 100));
    const high = Math.max(open, close) * (1 + rand() * 0.01), low = Math.min(open, close) * (1 - rand() * 0.01);
    out.push({ time: t + i * 3600000, open, high, low, close, volume: 100 + rand() * 900 }); price = close;
  }
  return out;
}
