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

// ============================================================
// Statistics (pure, NaN-safe, ignores non-finite inputs)
// ============================================================
const finiteSeries = (values) => (Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : []);

/** Arithmetic mean of the finite values. Returns NaN for an empty series. */
export function mean(values) { const a = finiteSeries(values); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN; }

/** Median (linearly interpolated 50th percentile). */
export function median(values) { const a = finiteSeries(values).sort((x, y) => x - y); return a.length ? percentile(a, 0.5) : NaN; }

/** Every value tied for the highest frequency. Returns [] for an empty series. */
export function mode(values) {
  const a = finiteSeries(values); if (!a.length) return [];
  const counts = new Map();
  for (const v of a) counts.set(v, (counts.get(v) || 0) + 1);
  const max = Math.max(...counts.values());
  return [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v).sort((x, y) => x - y);
}

/** Variance. Sample (n−1) by default; pass { population: true } for the population form. */
export function variance(values, { population = false } = {}) {
  const a = finiteSeries(values), n = a.length; if (n < 2) return NaN;
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (population ? n : n - 1);
}

/** Standard deviation. Pass { population: true } for the population form. */
export const stdev = (values, opts) => Math.sqrt(variance(values, opts));

/** Sample skewness (adjusted Fisher–Pearson standardized moment, so it is defined for n >= 3). */
export function skewness(values) {
  const a = finiteSeries(values), n = a.length; if (n < 3) return NaN;
  const m = mean(a), s = stdev(a); if (!(s > 0)) return 0;
  const g = a.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0) / n;
  return Math.sqrt(n * (n - 1)) / (n - 2) * g;
}

/** Sample excess kurtosis (0 = normal). Defined for n >= 4. */
export function kurtosis(values) {
  const a = finiteSeries(values), n = a.length; if (n < 4) return NaN;
  const m = mean(a), s = stdev(a); if (!(s > 0)) return 0;
  const g2 = a.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0) / n;
  return ((n + 1) * g2 - 3 * (n - 1)) * (n - 1) / ((n - 2) * (n - 3));
}

/** Pearson product-moment correlation of two equal-length series (pairs with non-finite entries dropped). */
export function correlation(x, y) {
  const n = Math.min(Array.isArray(x) ? x.length : 0, Array.isArray(y) ? y.length : 0);
  if (n < 2) return NaN;
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { const a = Number(x[i]), b = Number(y[i]); if (Number.isFinite(a) && Number.isFinite(b)) { xs.push(a); ys.push(b); } }
  const m = xs.length; if (m < 2) return NaN;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < m; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

/** Sample covariance (n−1). */
export function covariance(x, y) {
  const n = Math.min(Array.isArray(x) ? x.length : 0, Array.isArray(y) ? y.length : 0); if (n < 2) return NaN;
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { const a = Number(x[i]), b = Number(y[i]); if (Number.isFinite(a) && Number.isFinite(b)) { xs.push(a); ys.push(b); } }
  const m = xs.length; if (m < 2) return NaN;
  const mx = mean(xs), my = mean(ys); let s = 0;
  for (let i = 0; i < m; i++) s += (xs[i] - mx) * (ys[i] - my);
  return s / (m - 1);
}

/** Beta of an asset series against a benchmark: cov(asset, bench) / var(bench). */
export function beta(asset, benchmark) {
  const v = variance(benchmark); if (!(v > 0)) return NaN;
  return covariance(asset, benchmark) / v;
}

/** Z-score of a value given a mean and standard deviation. */
export const zScore = (value, m, s) => (num(s) > 0 ? (num(value) - num(m)) / num(s) : NaN);

/** Z-scores of an entire series relative to its own mean/stdev. */
export function zScores(values) {
  const a = finiteSeries(values), m = mean(a), s = stdev(a); if (!(s > 0)) return a.map(() => 0);
  return a.map((v) => (v - m) / s);
}

/**
 * Ordinary least squares of y on x.
 * Returns slope, intercept, r2, standard error of the slope/estimate, residual sd and a predict(x) helper.
 */
export function linearRegression(x, y) {
  const n = Math.min(Array.isArray(x) ? x.length : 0, Array.isArray(y) ? y.length : 0); if (n < 3) return null;
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { const a = Number(x[i]), b = Number(y[i]); if (Number.isFinite(a) && Number.isFinite(b)) { xs.push(a); ys.push(b); } }
  const m = xs.length; if (m < 3) return null;
  const mx = mean(xs), my = mean(ys);
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < m; i++) { const dx = xs[i] - mx; sxx += dx * dx; sxy += dx * (ys[i] - my); syy += (ys[i] - my) ** 2; }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx, intercept = my - slope * mx;
  const ssRes = ys.reduce((s, v, i) => s + (v - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = syy > 0 ? 1 - ssRes / syy : 1;
  const seEstimate = Math.sqrt(ssRes / Math.max(1, m - 2));
  const seSlope = Math.sqrt(ssRes / Math.max(1, m - 2) / sxx);
  return { slope, intercept, r2, seSlope, seEstimate, n: m, predict: (v) => slope * num(v) + intercept };
}

/** Solve a small dense linear system (Gaussian elimination with partial pivoting). Returns null if singular. */
function solveLinearSystem(a, b) {
  const n = b.length, m = a.map((row) => row.slice()), rhs = b.slice();
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    if (!(Math.abs(m[piv][col]) > 1e-12)) return null;
    [m[col], m[piv]] = [m[piv], m[col]]; [rhs[col], rhs[piv]] = [rhs[piv], rhs[col]];
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col];
      for (let c = col; c < n; c++) m[r][c] -= f * m[col][c];
      rhs[r] -= f * rhs[col];
    }
  }
  const out = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = rhs[r]; for (let c = r + 1; c < n; c++) s -= m[r][c] * out[c]; out[r] = s / m[r][r]; }
  return out;
}

/**
 * Least-squares polynomial fit of the requested degree.
 * Coefficients are returned ascending (c[0] + c[1]x + c[2]x² …). Returns null if under-determined or singular.
 */
export function polynomialRegression(x, y, degree = 2) {
  const d = Math.max(1, Math.floor(num(degree)));
  const n = Math.min(Array.isArray(x) ? x.length : 0, Array.isArray(y) ? y.length : 0);
  if (n < d + 1) return null;
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { const a = Number(x[i]), b = Number(y[i]); if (Number.isFinite(a) && Number.isFinite(b)) { xs.push(a); ys.push(b); } }
  const m = xs.length; if (m < d + 1) return null;
  const size = d + 1;
  const A = Array.from({ length: size }, () => new Array(size).fill(0));
  const B = new Array(size).fill(0);
  for (let i = 0; i < m; i++) {
    const powers = [1];
    for (let p = 1; p < 2 * size - 1; p++) powers.push(powers[p - 1] * xs[i]);
    for (let r = 0; r < size; r++) {
      B[r] += powers[r] * ys[i];
      for (let c = 0; c < size; c++) A[r][c] += powers[r + c];
    }
  }
  const coeffs = solveLinearSystem(A, B);
  if (!coeffs) return null;
  const predict = (v) => coeffs.reduce((s, c, p) => s + c * Math.pow(num(v), p), 0);
  const my = mean(ys);
  const ssRes = ys.reduce((s, v, i) => s + (v - predict(xs[i])) ** 2, 0);
  const ssTot = ys.reduce((s, v) => s + (v - my) ** 2, 0);
  return { coefficients: coeffs, degree: d, r2: ssTot > 0 ? 1 - ssRes / ssTot : 1, predict };
}

/**
 * Augmented Dickey–Fuller t-statistic for a unit root (constant, no trend, `lags` augmenting diffs).
 * Very negative ⇒ the series is likely stationary. Compare against published critical values (≈ −3.43 at 5%).
 * This is an educational approximation, not an econometrics package.
 */
export function adfStatistic(series, lags = 1) {
  const y = finiteSeries(series); const n = y.length;
  const L = Math.max(0, Math.floor(num(lags)));
  if (n < L + 4) return NaN;
  const rows = [], target = [];
  for (let t = L + 1; t < n; t++) {
    const row = [1, y[t - 1]]; // constant + lagged level
    for (let k = 1; k <= L; k++) row.push(y[t - k] - y[t - k - 1]);
    rows.push(row);
    target.push(y[t] - y[t - 1]);
  }
  const p = rows[0].length;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  for (let i = 0; i < rows.length; i++) {
    for (let r = 0; r < p; r++) { Xty[r] += rows[i][r] * target[i]; for (let c = 0; c < p; c++) XtX[r][c] += rows[i][r] * rows[i][c]; }
  }
  const betaHat = solveLinearSystem(XtX, Xty);
  if (!betaHat) return NaN;
  let ssRes = 0;
  for (let i = 0; i < rows.length; i++) { const pred = rows[i].reduce((s, v, c) => s + v * betaHat[c], 0); ssRes += (target[i] - pred) ** 2; }
  const dof = rows.length - p; if (dof <= 0) return NaN;
  const s2 = ssRes / dof;
  const invDiag = solveLinearSystem(XtX, new Array(p).fill(0).map((_, i) => (i === 1 ? 1 : 0)));
  if (!invDiag) return NaN;
  const seBeta = Math.sqrt(s2 * invDiag[1]);
  return seBeta > 0 ? betaHat[1] / seBeta : NaN;
}

// ============================================================
// Risk & performance metrics
// ============================================================
/** Peak-to-trough maximum drawdown of an equity/PnL curve. Returns fractional drawdown plus its peak and trough indices. */
export function maxDrawdown(equity) {
  const series = finiteSeries(equity); if (!series.length) return { maxDrawdown: NaN, peakIndex: -1, troughIndex: -1 };
  let peak = series[0], peakIndex = 0, best = 0, bp = 0, bt = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i] > peak) { peak = series[i]; peakIndex = i; }
    const dd = peak > 0 ? 1 - series[i] / peak : 0;
    if (dd > best) { best = dd; bp = peakIndex; bt = i; }
  }
  return { maxDrawdown: best, peakIndex: bp, troughIndex: bt };
}

/** Annualized Sharpe ratio. periodsPerYear = 252 (daily), 52 (weekly), 12 (monthly) or 365 (crypto daily). */
export function sharpe(returns, { riskFree = 0, periodsPerYear = 252 } = {}) {
  const r = finiteSeries(returns); if (r.length < 2) return NaN;
  const rf = num(riskFree) / periodsPerYear;
  const ex = r.map((v) => v - rf);
  const s = stdev(ex); if (!(s > 0)) return NaN;
  return mean(ex) / s * Math.sqrt(periodsPerYear);
}

/** Annualized Sortino ratio (downside deviation in the denominator). */
export function sortino(returns, { riskFree = 0, periodsPerYear = 252 } = {}) {
  const r = finiteSeries(returns); if (r.length < 2) return NaN;
  const rf = num(riskFree) / periodsPerYear;
  const ex = r.map((v) => v - rf);
  const down = Math.sqrt(ex.reduce((s, v) => s + Math.min(0, v) ** 2, 0) / ex.length);
  if (!(down > 0)) return NaN;
  return mean(ex) / down * Math.sqrt(periodsPerYear);
}

/** Calmar ratio = CAGR / |max drawdown|. Inputs are percentages (CAGR %) and a drawdown fraction. */
export const calmar = (cagrPct, maxDrawdownFrac) => (num(maxDrawdownFrac) > 0 ? num(cagrPct) / (num(maxDrawdownFrac) * 100) : NaN);

/**
 * Parametric (Gaussian) Value at Risk and Conditional VaR. Returns positive loss magnitudes as a fraction of value.
 * confidence is e.g. 0.95 or 0.99. Educational estimate: real returns are fat-tailed.
 */
export function normalVaR({ mean: mu = 0, sd = 0, confidence = 0.95 } = {}) {
  const m = num(mu), s = num(sd), c = num(confidence);
  if (!(s > 0) || !(c > 0 && c < 1)) return null;
  const z = inverseNormalCdf(c);
  const varValue = -(m - z * s); // loss quantile (positive number means a loss)
  // Expected shortfall: E[-X | X <= -VaR] for a normal = -mu + sd * phi(z) / (1 - c)
  const phi = Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
  const cvar = -m + s * phi / (1 - c);
  return { var: varValue, cvar, z };
}

/** Inverse standard-normal CDF (Acklam's rational approximation). */
export function inverseNormalCdf(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  const pp = num(p);
  if (!(pp > 0 && pp < 1)) return NaN;
  let q, r;
  if (pp < pl) { q = Math.sqrt(-2 * Math.log(pp)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (pp > ph) { q = Math.sqrt(-2 * Math.log(1 - pp)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = pp - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Classic gambler's-ruin risk of ruin for fixed-fractional betting.
 * Each bet risks riskFrac of capital; a win returns +b risk units, a loss −1.
 * Capital is therefore 1/riskFrac units. The ruin probability is λ^(1/riskFrac) where λ ∈ (0,1)
 * is the non-trivial root of p·λ^(b+1) − λ + (1−p) = 0. Ignores fat tails, correlation and changing size.
 */
export function riskOfRuin({ p, b, riskFrac }) {
  p = num(p); b = num(b); riskFrac = num(riskFrac);
  if (!(p > 0 && p < 1) || !(b > 0) || !(riskFrac > 0 && riskFrac < 1)) return NaN;
  const edge = p * b - (1 - p);
  if (!(edge > 0)) return 1; // no positive edge ⇒ eventual ruin
  const f = (lambda) => p * Math.pow(lambda, b + 1) - lambda + (1 - p);
  let lo = 1e-9, hi = 1; // f(lo) > 0, f(1) = 0, and f < 0 just below 1 when edge > 0
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  return Math.pow((lo + hi) / 2, 1 / riskFrac);
}

// ============================================================
// Time value of money
// ============================================================
/** Net present value of a cashflow series. cashflows[0] is at t=0. ratePct is the per-period discount rate (%). */
export function npv(ratePct, cashflows) {
  const r = num(ratePct) / 100, cf = (cashflows || []).map(num);
  if (!cf.length || !Number.isFinite(r)) return NaN;
  return cf.reduce((s, v, t) => s + v / Math.pow(1 + r, t), 0);
}

/** Internal rate of return by bisection (%). Requires at least one sign change. Returns null if none found. */
export function irr(cashflows) {
  const cf = (cashflows || []).map(num);
  if (cf.length < 2) return null;
  if (!(cf.some((v) => v > 0) && cf.some((v) => v < 0))) return null;
  const f = (rate) => cf.reduce((s, v, t) => s + v / Math.pow(1 + rate, t), 0);
  let lo = -0.9999, hi = 10;
  if (f(lo) * f(hi) > 0) { // expand the bracket once
    hi = 1e3;
    if (f(lo) * f(hi) > 0) return null;
  }
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, v = f(mid); if (Math.abs(v) < 1e-9) return mid * 100; if (f(lo) * v < 0) hi = mid; else lo = mid; }
  return ((lo + hi) / 2) * 100;
}

/** Compound interest with a configurable compounding frequency. ratePct = nominal annual %. */
export function compoundInterest({ principal, ratePct, years, compoundsPerYear = 12 }) {
  [principal, ratePct, years] = [principal, ratePct, years].map(num);
  const m = Math.max(1, Math.floor(num(compoundsPerYear) || 12));
  if (!(principal >= 0) || !Number.isFinite(ratePct) || !(years >= 0)) return null;
  const r = ratePct / 100 / m, n = Math.round(years * m);
  const balance = principal * Math.pow(1 + r, n);
  return { balance, interest: balance - principal, periods: n, ratePerPeriod: r };
}

/** Fixed-rate amortized loan payment, total interest and a yearly schedule. */
export function loanPayment({ principal, annualPct, years }) {
  [principal, annualPct, years] = [principal, annualPct, years].map(num);
  if (!(principal > 0) || !(years > 0) || annualPct < 0) return null;
  const n = Math.round(years * 12), r = annualPct / 100 / 12;
  const payment = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
  let bal = principal, totalInterest = 0; const schedule = [];
  for (let m = 1; m <= n; m++) {
    const interest = bal * r, principalPaid = payment - interest;
    bal = Math.max(0, bal - principalPaid); totalInterest += interest;
    if (m % 12 === 0 || m === n) schedule.push({ year: Math.ceil(m / 12), balance: bal, paid: payment * m, interest: totalInterest });
  }
  return { payment, totalPaid: payment * n, totalInterest, months: n, schedule };
}

/** Dollar-cost averaging vs a single lump-sum buy, for a price series (assumes equal total capital). */
export function dcaVsLumpSum(prices, totalCapital) {
  const p = finiteSeries(prices), capital = num(totalCapital);
  if (p.length < 2 || !(capital > 0)) return null;
  const perPeriod = capital / p.length;
  let units = 0, invested = 0;
  for (const price of p) { if (price > 0) { units += perPeriod / price; invested += perPeriod; } }
  const dcaValue = units * p[p.length - 1];
  const lumpUnits = capital / p[0], lumpValue = lumpUnits * p[p.length - 1];
  return { dcaUnits: units, dcaValue, dcaReturnPct: (dcaValue / invested - 1) * 100, lumpValue, lumpReturnPct: (lumpValue / capital - 1) * 100, averageCost: units > 0 ? invested / units : NaN };
}

/** Profit/loss of a spot position including round-trip fees. */
export function profitLoss({ entry, exit, quantity, feePct = 0, side = "long" }) {
  [entry, exit, quantity] = [entry, exit, quantity].map(num);
  const fee = (num(feePct) || 0) / 100;
  if (!(entry > 0) || !(exit > 0) || !(quantity > 0)) return null;
  const dir = side === "short" ? -1 : 1;
  const gross = (exit - entry) * quantity * dir;
  const fees = (entry + exit) * quantity * fee;
  const net = gross - fees;
  return { gross, fees, net, returnPct: (net / (entry * quantity)) * 100, breakevenExit: entry * (1 + fee) / (1 - fee) * (dir === 1 ? 1 : 1) };
}

/** Required win rate to break even after fees, given reward:risk b and round-trip cost as a fraction of risk. */
export const breakevenWinRateCosts = (b, costFrac = 0) => { const bb = num(b), c = num(costFrac) || 0; return bb + c > 0 ? (1 + c) / (1 + bb - c) : NaN; };

// ============================================================
// Technical indicators (extended)
// ============================================================
/** Weighted moving average (linearly weighted, most recent value weighted highest). */
export function wma(values, period) {
  const out = new Array(values?.length ?? 0).fill(NaN);
  if (!Array.isArray(values) || !(period >= 1) || values.length < period) return out;
  const denom = period * (period + 1) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let k = 0; k < period; k++) sum += values[i - k] * (period - k);
    out[i] = sum / denom;
  }
  return out;
}

/** Cumulative Volume-Weighted Average Price. Uses typical price (H+L+C)/3 and running volume. */
export function vwap(candles) {
  const out = new Array(candles?.length ?? 0).fill(NaN);
  if (!Array.isArray(candles) || !candles.length) return out;
  let pv = 0, vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i], typical = ((c.high ?? c.close) + (c.low ?? c.close) + c.close) / 3, v = Number.isFinite(c.volume) ? c.volume : 1;
    pv += typical * v; vol += v;
    out[i] = vol > 0 ? pv / vol : NaN;
  }
  return out;
}

/** MACD line, signal line and histogram (fast EMA − slow EMA, then an EMA of the MACD line). */
export function macd(values, { fast = 12, slow = 26, signal = 9 } = {}) {
  const f = ema(values, fast), s = ema(values, slow);
  const line = values.map((_, i) => (Number.isFinite(f[i]) && Number.isFinite(s[i]) ? f[i] - s[i] : NaN));
  const firstValid = line.findIndex(Number.isFinite);
  const sig = new Array(values.length).fill(NaN);
  if (firstValid >= 0) {
    const compact = line.slice(firstValid);
    const se = ema(compact, signal);
    for (let i = 0; i < compact.length; i++) sig[firstValid + i] = se[i];
  }
  const hist = line.map((v, i) => (Number.isFinite(v) && Number.isFinite(sig[i]) ? v - sig[i] : NaN));
  return { macd: line, signal: sig, histogram: hist };
}

/** Stochastic oscillator %K and %D (simple average of %K over the smoothing period). */
export function stochastic(candles, { kPeriod = 14, dPeriod = 3 } = {}) {
  const k = new Array(candles?.length ?? 0).fill(NaN);
  if (!Array.isArray(candles) || candles.length < kPeriod) return { k, d: k.slice() };
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); }
    k[i] = hi > lo ? ((candles[i].close - lo) / (hi - lo)) * 100 : 50;
  }
  return { k, d: sma(k, dPeriod) };
}

/** Bollinger Bands with bandwidth and %B. */
export function bollinger(values, { period = 20, mult = 2 } = {}) {
  const middle = sma(values, period);
  const upper = new Array(values?.length ?? 0).fill(NaN), lower = upper.slice(), bandwidth = upper.slice(), percentB = upper.slice();
  if (!Array.isArray(values)) return { upper, middle, lower, bandwidth, percentB };
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (values[j] - middle[i]) ** 2;
    const sd = Math.sqrt(sum / period);
    upper[i] = middle[i] + mult * sd; lower[i] = middle[i] - mult * sd;
    bandwidth[i] = middle[i] ? ((upper[i] - lower[i]) / middle[i]) * 100 : NaN;
    percentB[i] = upper[i] > lower[i] ? (values[i] - lower[i]) / (upper[i] - lower[i]) : 0.5;
  }
  return { upper, middle, lower, bandwidth, percentB };
}

/** Keltner Channels: EMA ± mult × ATR. */
export function keltner(candles, { period = 20, mult = 2 } = {}) {
  const mid = ema(candles?.map((c) => c.close) ?? [], period), a = atr(candles ?? [], period);
  const upper = new Array(candles?.length ?? 0).fill(NaN), lower = upper.slice();
  for (let i = 0; i < upper.length; i++) if (Number.isFinite(mid[i]) && Number.isFinite(a[i])) { upper[i] = mid[i] + mult * a[i]; lower[i] = mid[i] - mult * a[i]; }
  return { upper, middle: mid, lower };
}

/** Donchian channel (highest high / lowest low over the period). */
export function donchian(candles, period = 20) {
  const upper = new Array(candles?.length ?? 0).fill(NaN), lower = upper.slice();
  if (!Array.isArray(candles) || candles.length < period) return { upper, middle: upper.slice(), lower };
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); }
    upper[i] = hi; lower[i] = lo;
  }
  return { upper, middle: upper.map((v, i) => (Number.isFinite(v) ? (v + lower[i]) / 2 : NaN)), lower };
}

/** On-Balance Volume. */
export function obv(candles) {
  const out = new Array(candles?.length ?? 0).fill(0);
  if (!Array.isArray(candles) || !candles.length) return out;
  for (let i = 1; i < candles.length; i++) {
    const v = Number.isFinite(candles[i].volume) ? candles[i].volume : 0;
    out[i] = out[i - 1] + (candles[i].close > candles[i - 1].close ? v : candles[i].close < candles[i - 1].close ? -v : 0);
  }
  return out;
}

/** Money Flow Index (volume-weighted RSI variant). */
export function mfi(candles, period = 14) {
  const out = new Array(candles?.length ?? 0).fill(NaN);
  if (!Array.isArray(candles) || candles.length <= period) return out;
  const typical = candles.map((c) => ((c.high ?? c.close) + (c.low ?? c.close) + c.close) / 3);
  const flow = candles.map((c, i) => typical[i] * (Number.isFinite(c.volume) ? c.volume : 0));
  for (let i = period; i < candles.length; i++) {
    let pos = 0, neg = 0;
    for (let j = i - period + 1; j <= i; j++) { if (typical[j] > typical[j - 1]) pos += flow[j]; else neg += flow[j]; }
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  }
  return out;
}

/** Annualized rolling historical volatility of log returns (%). */
export function historicalVolatility(closes, { period = 20, periodsPerYear = 365 } = {}) {
  const out = new Array(closes?.length ?? 0).fill(NaN);
  if (!Array.isArray(closes) || closes.length < period + 1) return out;
  const rets = closes.map((c, i) => (i === 0 ? NaN : Math.log(c / closes[i - 1])));
  for (let i = period; i < closes.length; i++) {
    const win = rets.slice(i - period + 1, i + 1).filter(Number.isFinite);
    const m = mean(win), sd = stdev(win);
    out[i] = sd * Math.sqrt(periodsPerYear) * 100;
  }
  return out;
}

/** Donchian-free Average Directional Index with +DI / −DI (Wilder smoothing). */
export function adx(candles, period = 14) {
  const n = candles?.length ?? 0;
  const out = new Array(n).fill(NaN), plusDI = out.slice(), minusDI = out.slice();
  if (!Array.isArray(candles) || n < period * 2 + 1) return { adx: out, plusDI, minusDI };
  const tr = [], plusDM = [], minusDM = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) { tr.push(candles[0].high - candles[0].low); plusDM.push(0); minusDM.push(0); continue; }
    const up = candles[i].high - candles[i - 1].high, down = candles[i - 1].low - candles[i].low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    tr.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close)));
  }
  const wilder = (arr) => { const o = new Array(n).fill(NaN); let acc = arr.slice(1, period + 1).reduce((a, b) => a + b, 0); o[period] = acc; for (let i = period + 1; i < n; i++) { acc = acc - acc / period + arr[i]; o[i] = acc; } return o; };
  const atrS = wilder(tr), pdm = wilder(plusDM), mdm = wilder(minusDM);
  const dx = new Array(n).fill(NaN);
  for (let i = period; i < n; i++) {
    if (atrS[i] > 0) { plusDI[i] = 100 * pdm[i] / atrS[i]; minusDI[i] = 100 * mdm[i] / atrS[i]; }
    const sum = plusDI[i] + minusDI[i];
    dx[i] = sum > 0 ? 100 * Math.abs(plusDI[i] - minusDI[i]) / sum : NaN;
  }
  const firstDx = dx.findIndex(Number.isFinite);
  if (firstDx >= 0) {
    let acc = 0, count = 0;
    for (let i = firstDx; i < firstDx + period && i < n; i++) if (Number.isFinite(dx[i])) { acc += dx[i]; count++; }
    if (count === period) { out[firstDx + period - 1] = acc / period; let prev = out[firstDx + period - 1]; for (let i = firstDx + period; i < n; i++) { prev = (prev * (period - 1) + dx[i]) / period; out[i] = prev; } }
  }
  return { adx: out, plusDI, minusDI };
}

/** Supertrend: ATR bands that flip the trend direction. Returns the line, a 1/−1 trend array and flip signals. */
export function supertrend(candles, { period = 10, mult = 3 } = {}) {
  const n = candles?.length ?? 0;
  const line = new Array(n).fill(NaN), trend = new Array(n).fill(0), signals = [];
  if (!Array.isArray(candles) || n < period + 1) return { line, trend, signals };
  const a = atr(candles, period);
  let prevUpper = NaN, prevLower = NaN, dir = 1;
  for (let i = period; i < n; i++) {
    if (!Number.isFinite(a[i])) continue;
    const mid = (candles[i].high + candles[i].low) / 2;
    let upper = mid + mult * a[i], lower = mid - mult * a[i];
    if (Number.isFinite(prevUpper)) { upper = candles[i - 1].close > prevUpper ? upper : Math.min(upper, prevUpper); lower = candles[i - 1].close < prevLower ? lower : Math.max(lower, prevLower); }
    if (dir === 1 && candles[i].close < lower) { dir = -1; signals.push({ index: i, side: "sell" }); }
    else if (dir === -1 && candles[i].close > upper) { dir = 1; signals.push({ index: i, side: "buy" }); }
    trend[i] = dir; line[i] = dir === 1 ? lower : upper; prevUpper = upper; prevLower = lower;
  }
  return { line, trend, signals };
}

/** Ichimoku Kinko Hyo. Span lines are shifted forward by `displacement` (default 26). */
export function ichimoku(candles, { conversion = 9, base = 26, spanB = 52, displacement = 26 } = {}) {
  const n = candles?.length ?? 0;
  const hl = (p, i) => { let hi = -Infinity, lo = Infinity; for (let j = Math.max(0, i - p + 1); j <= i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); } return (hi + lo) / 2; };
  const tenkan = new Array(n).fill(NaN), kijun = new Array(n).fill(NaN), senkouA = new Array(n).fill(NaN), senkouB = new Array(n).fill(NaN), chikou = new Array(n).fill(NaN);
  if (!Array.isArray(candles)) return { tenkan, kijun, senkouA, senkouB, chikou };
  for (let i = 0; i < n; i++) { if (i >= conversion - 1) tenkan[i] = hl(conversion, i); if (i >= base - 1) kijun[i] = hl(base, i); }
  for (let i = 0; i + displacement < n; i++) { senkouA[i + displacement] = Number.isFinite(tenkan[i]) && Number.isFinite(kijun[i]) ? (tenkan[i] + kijun[i]) / 2 : NaN; }
  for (let i = 0; i < n; i++) if (i >= spanB - 1) { const v = hl(spanB, i); if (i + displacement < n) senkouB[i + displacement] = v; }
  for (let i = 0; i + displacement < n; i++) chikou[i] = candles[i + displacement].close;
  return { tenkan, kijun, senkouA, senkouB, chikou };
}

/** Classic / Fibonacci / Camarilla pivot points for a single period. */
export function pivotPoints({ high, low, close, open = NaN }, method = "classic") {
  [high, low, close, open] = [high, low, close, open].map(num);
  if (!(high > 0) || !(low > 0) || !(close > 0)) return null;
  const range = high - low, p = (high + low + close) / 3;
  if (method === "fibonacci") {
    return { p, r1: p + 0.382 * range, r2: p + 0.618 * range, r3: p + 1.0 * range, s1: p - 0.382 * range, s2: p - 0.618 * range, s3: p - 1.0 * range };
  }
  if (method === "camarilla") {
    return { p, r1: close + range * 1.1 / 12, r2: close + range * 1.1 / 6, r3: close + range * 1.1 / 4, s1: close - range * 1.1 / 12, s2: close - range * 1.1 / 6, s3: close - range * 1.1 / 4 };
  }
  return { p, r1: 2 * p - low, r2: p + range, r3: high + 2 * (p - low), s1: 2 * p - high, s2: p - range, s3: low - 2 * (high - p) };
}

/** Fibonacci retracement and extension levels for a swing. */
export function fibonacci(high, low) {
  [high, low] = [high, low].map(num);
  if (!(high > low)) return null;
  const d = high - low, level = (f) => high - f * d;
  return {
    retracement: { "0": high, "0.236": level(0.236), "0.382": level(0.382), "0.5": level(0.5), "0.618": level(0.618), "0.786": level(0.786), "1": low },
    extension: { "1.272": low - 0.272 * d, "1.618": low - 0.618 * d, "2.0": low - d },
  };
}

// ============================================================
// Signal engine + walk-forward backtest
// ============================================================
/**
 * Composable confluence engine. `rules` is an array of { id, label, weight = 1, test(ctx) -> boolean }.
 * ctx = { candles, closes, i, indicators }. Returns a 0–100 weighted score plus per-rule detail.
 */
export function confluence(ctx, rules) {
  const total = rules.reduce((s, r) => s + (num(r.weight) || 1), 0) || 1;
  let earned = 0;
  const parts = rules.map((r) => {
    let pass = false;
    try { pass = !!r.test(ctx); } catch { pass = false; }
    const w = num(r.weight) || 1; if (pass) earned += w;
    return { id: r.id, label: r.label, pass, weight: w, points: pass ? w : 0 };
  });
  return { score: Math.round((earned / total) * 100), total, parts };
}

/** Sum of log returns → arithmetic return series (helper for metrics that take returns). */
export const toReturns = (series) => { const a = finiteSeries(series), out = []; for (let i = 1; i < a.length; i++) out.push(a[i] / a[i - 1] - 1); return out; };

/**
 * Walk-forward evaluation: split the candles into `folds` contiguous blocks, backtest each independently
 * and report per-fold and aggregate statistics so results cannot be read from one lucky window.
 */
export function walkForward(candles, params = {}, { folds = 4 } = {}) {
  if (!Array.isArray(candles) || candles.length < (params.slow || 21) * 3) return null;
  const k = Math.max(1, Math.floor(folds));
  const size = Math.floor(candles.length / k);
  const results = [];
  for (let f = 0; f < k; f++) {
    const slice = candles.slice(f * size, f === k - 1 ? candles.length : (f + 1) * size);
    const bt = backtestEmaCross(slice, params);
    if (bt) results.push({ fold: f + 1, bars: slice.length, ...bt.stats });
  }
  if (!results.length) return null;
  const avg = (key) => { const vals = results.map((r) => r[key]).filter(Number.isFinite); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN; };
  return { folds: results, aggregate: { avgWinRate: avg("winRate"), avgProfitFactor: avg("profitFactor"), avgReturnPct: avg("totalReturnPct"), positiveFolds: results.filter((r) => r.totalReturnPct > 0).length, folds: results.length } };
}

// ============================================================
// Inferential statistics (t-tests, chi-square) — educational accuracy
// ============================================================
/** Lanczos log-gamma. */
export function logGamma(z) {
  const zz = num(z);
  if (!(zz > 0)) return NaN;
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (zz - 1 + i);
  const t = zz - 1 + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz - 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a,b). */
export function incompleteBeta(a, b, x) {
  if (!(a > 0) || !(b > 0)) return NaN;
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}

function gammP(a, x) {
  if (!(a > 0) || x < 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) { // series
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n < 200; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction for Q, then P = 1 - Q
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  return 1 - q;
}

/** CDF of the chi-square distribution with `df` degrees of freedom. */
export const chiSquareCdf = (x, df) => (num(df) > 0 ? gammP(num(df) / 2, Math.max(0, num(x)) / 2) : NaN);

/** PDF of Student's t distribution. */
export function studentTPdf(t, df) {
  const v = num(df); if (!(v > 0)) return NaN;
  return Math.exp(logGamma((v + 1) / 2) - logGamma(v / 2)) / Math.sqrt(v * Math.PI) * Math.pow(1 + (t * t) / v, -(v + 1) / 2);
}

/** CDF of Student's t distribution. */
export function studentTCdf(t, df) {
  const v = num(df); if (!(v > 0)) return NaN;
  const p = 0.5 * incompleteBeta(v / 2, 0.5, v / (v + t * t));
  return t > 0 ? 1 - p : p;
}

/** Quartiles and interquartile range (linear interpolation). */
export function quartiles(values) {
  const a = finiteSeries(values).sort((x, y) => x - y); if (a.length < 4) return null;
  return { q1: percentile(a, 0.25), q2: percentile(a, 0.5), q3: percentile(a, 0.75), iqr: percentile(a, 0.75) - percentile(a, 0.25) };
}

/** One-sample t-test against a hypothesised mean. Returns t, df and the two-sided p-value. */
export function tTestOneSample(values, mu = 0) {
  const a = finiteSeries(values), n = a.length, m0 = num(mu);
  if (n < 2) return null;
  const m = mean(a), s = stdev(a); if (!(s > 0)) return null;
  const se = s / Math.sqrt(n), t = (m - m0) / se, df = n - 1;
  return { t, df, se, p: 2 * (1 - studentTCdf(Math.abs(t), df)) };
}

/** Two-sample t-test (Welch by default, Student when paired). */
export function tTestTwoSample(a, b, { paired = false } = {}) {
  const x = finiteSeries(a), y = finiteSeries(b);
  if (paired) {
    const n = Math.min(x.length, y.length); if (n < 2) return null;
    const d = []; for (let i = 0; i < n; i++) d.push(x[i] - y[i]);
    return tTestOneSample(d, 0);
  }
  if (x.length < 2 || y.length < 2) return null;
  const n1 = x.length, n2 = y.length, v1 = variance(x), v2 = variance(y), m1 = mean(x), m2 = mean(y);
  const se = Math.sqrt(v1 / n1 + v2 / n2); if (!(se > 0)) return null;
  const t = (m1 - m2) / se;
  const df = Math.pow(v1 / n1 + v2 / n2, 2) / (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
  return { t, df, se, p: 2 * (1 - studentTCdf(Math.abs(t), df)) };
}

/** Chi-square goodness-of-fit. `expected` may be omitted for a uniform expectation. */
export function chiSquareGoodness(observed, expected) {
  const o = finiteSeries(observed); if (o.length < 2) return null;
  let e = Array.isArray(expected) && expected.length === o.length ? finiteSeries(expected) : o.map(() => mean(o));
  if (!e.every((v) => v > 0)) return null;
  const chi2 = o.reduce((s, v, i) => s + (v - e[i]) ** 2 / e[i], 0);
  const df = o.length - 1;
  return { chi2, df, p: 1 - chiSquareCdf(chi2, df), expected: e };
}

// ============================================================
// Chart transforms & terminal indicators
// Pure, deterministic, NaN-safe. These power the charting terminal
// (js/terminal/indicators.js) and are unit-tested in tests/quant.test.mjs.
// ============================================================

/**
 * EMA that tolerates leading NaN values (e.g. the EMA of an EMA).
 * Seeding begins at the first index with a full window of finite values.
 */
function emaFinite(values, period) {
  const out = new Array(values?.length ?? 0).fill(NaN);
  if (!Array.isArray(values) || !(period >= 1)) return out;
  const k = 2 / (period + 1);
  let prev = NaN, sum = 0, seen = 0;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) { continue; }
    if (seen < period) {
      sum += v; seen++;
      if (seen === period) { prev = sum / period; out[i] = prev; }
      continue;
    }
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Double EMA (DEMA) = 2·EMA − EMA(EMA). Lag-reduced moving average. */
export function dema(values, period) {
  const e1 = emaFinite(values, period), e2 = emaFinite(e1, period);
  return e1.map((v, i) => (Number.isFinite(v) && Number.isFinite(e2[i]) ? 2 * v - e2[i] : NaN));
}

/** Triple EMA (TEMA) = 3·EMA − 3·EMA(EMA) + EMA(EMA(EMA)). */
export function tema(values, period) {
  const e1 = emaFinite(values, period), e2 = emaFinite(e1, period), e3 = emaFinite(e2, period);
  return e1.map((v, i) => (Number.isFinite(v) && Number.isFinite(e2[i]) && Number.isFinite(e3[i]) ? 3 * v - 3 * e2[i] + e3[i] : NaN));
}

/**
 * Heikin-Ashi transform of source candles. The result is a *derived* series —
 * it is NOT exchange-reported OHLC and must be labelled as such in the UI.
 */
export function heikinAshi(candles) {
  const a = Array.isArray(candles) ? candles : [];
  const out = [];
  let prevOpen = NaN, prevClose = NaN;
  for (let i = 0; i < a.length; i++) {
    const c = a[i];
    if (![c.open, c.high, c.low, c.close].every(Number.isFinite)) { out.push(null); continue; }
    const close = (c.open + c.high + c.low + c.close) / 4;
    const open = !Number.isFinite(prevOpen) ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    out.push({
      time: c.time, open, close,
      high: Math.max(c.high, open, close),
      low: Math.min(c.low, open, close),
      volume: Number.isFinite(c.volume) ? c.volume : 0,
    });
    prevOpen = open; prevClose = close;
  }
  return out;
}

/**
 * Renko bricks derived from close prices (deterministic, documented algorithm).
 * When `boxSize` <= 0 it is derived from the average true range of the source.
 * A single box reverses direction (1-box reversal). `time` is the source candle time.
 */
export function renko(candles, { boxSize = 0, period = 14 } = {}) {
  const a = Array.isArray(candles) ? candles.filter((c) => Number.isFinite(c.close)) : [];
  if (a.length < 2) return [];
  let s = num(boxSize);
  if (!(s > 0)) {
    const at = atr(a, Math.min(Math.max(2, period), Math.max(2, a.length - 1))).filter(Number.isFinite);
    s = at.length ? at.reduce((x, y) => x + y, 0) / at.length : 0;
  }
  if (!(s > 0)) return [];
  const bricks = [];
  let base = a[0].close;
  for (let i = 1; i < a.length; i++) {
    const p = a[i].close;
    for (let guard = 0; p >= base + s && guard < 10000; guard++) {
      const close = base + s;
      bricks.push({ time: a[i].time, open: base, high: close, low: base, close, dir: 1 });
      base = close;
    }
    for (let guard = 0; p <= base - s && guard < 10000; guard++) {
      const close = base - s;
      bricks.push({ time: a[i].time, open: base, high: base, low: close, close, dir: -1 });
      base = close;
    }
  }
  return bricks;
}

/** Commodity Channel Index: (TP − SMA(TP)) / (0.015 · mean deviation). */
export function cci(candles, period = 20) {
  const n = candles?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(candles) || n < period) return out;
  const tp = candles.map((c) => ((Number.isFinite(c.high) ? c.high : c.close) + (Number.isFinite(c.low) ? c.low : c.close) + c.close) / 3);
  const m = sma(tp, period);
  for (let i = period - 1; i < n; i++) {
    let dev = 0;
    for (let j = i - period + 1; j <= i; j++) dev += Math.abs(tp[j] - m[i]);
    dev /= period;
    out[i] = dev > 0 ? (tp[i] - m[i]) / (0.015 * dev) : 0;
  }
  return out;
}

/** Williams %R, ranged −100..0 (0 = close at the period high). */
export function williamsR(candles, period = 14) {
  const n = candles?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(candles) || n < period) return out;
  for (let i = period - 1; i < n; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); }
    out[i] = hi > lo ? ((hi - candles[i].close) / (hi - lo)) * -100 : -50;
  }
  return out;
}

/** Rate of change over `period` bars, in percent. */
export function roc(values, period = 12) {
  const n = values?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(values) || n <= period) return out;
  for (let i = period; i < n; i++) out[i] = Number.isFinite(values[i]) && values[i - period] ? ((values[i] / values[i - period]) - 1) * 100 : NaN;
  return out;
}

/** Absolute momentum over `period` bars (price difference). */
export function momentum(values, period = 10) {
  const n = values?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(values) || n <= period) return out;
  for (let i = period; i < n; i++) out[i] = values[i] - values[i - period];
  return out;
}

/** Accumulation/Distribution line (cumulative money-flow volume). */
export function accumulationDistribution(candles) {
  const n = candles?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(candles) || !n) return out;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const c = candles[i], range = c.high - c.low;
    const mfm = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
    acc += mfm * (Number.isFinite(c.volume) ? c.volume : 0);
    out[i] = acc;
  }
  return out;
}

/** Chaikin Money Flow: period-sum of money-flow volume over period-sum of volume. */
export function chaikinMoneyFlow(candles, period = 20) {
  const n = candles?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(candles) || n < period) return out;
  const mfv = candles.map((c) => {
    const range = c.high - c.low;
    const mfm = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
    return mfm * (Number.isFinite(c.volume) ? c.volume : 0);
  });
  for (let i = period - 1; i < n; i++) {
    let sf = 0, sv = 0;
    for (let j = i - period + 1; j <= i; j++) { sf += mfv[j]; sv += Number.isFinite(candles[j].volume) ? candles[j].volume : 0; }
    out[i] = sv > 0 ? sf / sv : 0;
  }
  return out;
}

/** Anchored VWAP starting at `startIndex` (cumulative from the anchor). */
export function anchoredVwap(candles, startIndex = 0) {
  const n = candles?.length ?? 0, out = new Array(n).fill(NaN);
  if (!Array.isArray(candles) || !n) return out;
  let pv = 0, vv = 0;
  for (let i = Math.max(0, startIndex | 0); i < n; i++) {
    const c = candles[i];
    const tp = ((Number.isFinite(c.high) ? c.high : c.close) + (Number.isFinite(c.low) ? c.low : c.close) + c.close) / 3;
    const v = Number.isFinite(c.volume) ? c.volume : 0;
    pv += tp * v; vv += v;
    out[i] = vv > 0 ? pv / vv : tp;
  }
  return out;
}

/**
 * Pivot swing highs/lows. Index i is a swing high when high[i] is the strict max
 * of the window [i−left, i+right]. Returns index lists for annotation/market-structure.
 */
export function swingPoints(candles, { left = 2, right = 2 } = {}) {
  const a = Array.isArray(candles) ? candles : [];
  const highs = [], lows = [];
  const L = Math.max(1, Math.abs(left | 0)), R = Math.max(1, Math.abs(right | 0));
  for (let i = L; i < a.length - R; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - L; j <= i + R; j++) {
      if (j === i) continue;
      if (a[j].high >= a[i].high) isHigh = false;
      if (a[j].low <= a[i].low) isLow = false;
    }
    if (isHigh) highs.push(i);
    if (isLow) lows.push(i);
  }
  return { highs, lows };
}

/**
 * Least-squares regression channel over the whole series, with ± `mult` ×
 * standard-error bands. A single regression fit, drawn across the visible range.
 */
export function regressionChannel(values, { mult = 2 } = {}) {
  const a = Array.isArray(values) ? values.map(Number) : [];
  const n = a.length;
  const middle = new Array(n).fill(NaN), upper = new Array(n).fill(NaN), lower = new Array(n).fill(NaN);
  const res = { middle, upper, lower, slope: NaN, intercept: NaN, r2: NaN };
  const pts = [];
  for (let i = 0; i < n; i++) if (Number.isFinite(a[i])) pts.push([i, a[i]]);
  if (pts.length < 2) return res;
  const mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]));
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (!(sxx > 0)) return res;
  const slope = sxy / sxx, intercept = my - slope * mx;
  let se = 0;
  for (const [x, y] of pts) se += (y - (intercept + slope * x)) ** 2;
  se = Math.sqrt(se / Math.max(1, pts.length - 2));
  for (let i = 0; i < n; i++) {
    const m = intercept + slope * i;
    middle[i] = m; upper[i] = m + mult * se; lower[i] = m - mult * se;
  }
  return { middle, upper, lower, slope, intercept, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : NaN };
}
