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
