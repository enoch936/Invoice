// PARCHXA calculator engine — pure financial, business, statistical and trading formulas.
//
// Everything here is deterministic and side-effect free so it can run identically in the browser,
// in the static-page generator and in unit tests. Each function documents its assumptions; none of
// them touch the DOM, storage or the network. Educational tools only — not advice.
//
// Sign / unit conventions used consistently:
//   * rates passed as PERCENT unless the name ends in "PerPeriod" or "r" (decimal per period).
//   * money values are plain numbers in the same currency the caller works in.
//   * loan payments are positive amounts you pay.

// ---------------------------------------------------------------- loans & amortisation

/** Level payment that fully amortises a loan. r = periodic rate (decimal), n = number of periods. */
export function loanPayment(principal, ratePerPeriod, nPer) {
  if (!Number.isFinite(principal) || !Number.isFinite(ratePerPeriod) || !(nPer > 0)) return NaN;
  if (ratePerPeriod === 0) return principal / nPer;
  return (principal * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -nPer));
}

/**
 * Build an amortization schedule.
 * @param {{principal:number, annualRate:number, months:number, extra?:number}} input
 *   annualRate is a percentage; months is the term; extra is an optional extra principal payment
 *   added to every month (applied entirely to principal).
 * @returns {{payment:number,months:number,totalInterest:number,totalPaid:number,rows:{period:number,interest:number,principal:number,balance:number,payment:number}[],error?:string}}
 */
export function amortization({ principal, annualRate, months, extra = 0 }) {
  const P = Number(principal), r = Number(annualRate) / 100 / 12, n = Math.round(Number(months));
  const ex = Math.max(0, Number(extra) || 0);
  if (!(P > 0) || !(n > 0) || !(r >= 0)) return { rows: [], error: "Enter a positive loan amount and term." };
  const basePayment = loanPayment(P, r, n);
  const scheduled = basePayment + ex;
  let balance = P, totalInterest = 0, totalPaid = 0, period = 0;
  const rows = [];
  while (balance > 0.005 && period < 1200) {
    const interest = balance * r;
    if (scheduled <= interest) return { rows, error: "The payment does not cover the periodic interest, so the balance never falls." };
    let principalPart = Math.min(scheduled - interest, balance);
    const paid = interest + principalPart;
    balance -= principalPart; totalInterest += interest; totalPaid += paid; period++;
    rows.push({ period, interest, principal: principalPart, balance, payment: paid });
  }
  return { basePayment, months: period, totalInterest, totalPaid, rows };
}

// ---------------------------------------------------------------- growth and time value
/**
 * Compound growth of a starting balance plus optional regular contributions.
 * Contributions are added at the end ("end") or start ("begin") of each compounding period.
 */
export function compoundGrowth({ principal = 0, contribution = 0, annualRate, years, perYear = 12, timing = "end" }) {
  const n = Math.max(1, Math.round(perYear));
  const r = Number(annualRate) / 100 / n;
  const periods = Math.max(0, Math.round(n * Number(years)));
  let balance = Number(principal) || 0;
  const points = [{ x: 0, y: balance }];
  for (let i = 1; i <= periods; i++) {
    balance = timing === "begin" ? (balance + contribution) * (1 + r) : balance * (1 + r) + contribution;
    if (i % n === 0) points.push({ x: i / n, y: balance });
  }
  const contributed = (Number(principal) || 0) + contribution * periods;
  return { futureValue: balance, contributed, interest: balance - contributed, points };
}

/** Future value of a lump sum with periodic compounding. */
export function futureValue(pv, annualRate, years, perYear = 1) {
  const n = Math.max(1, Math.round(perYear));
  return Number(pv) * Math.pow(1 + Number(annualRate) / 100 / n, n * Number(years));
}

/** Present value of a future lump sum. */
export function presentValue(fv, annualRate, years, perYear = 1) {
  const n = Math.max(1, Math.round(perYear));
  return Number(fv) / Math.pow(1 + Number(annualRate) / 100 / n, n * Number(years));
}

/** Net present value. cashflows[0] is at time 0 (usually negative). rate is a percent. */
export function npv(rate, cashflows) {
  const r = Number(rate) / 100;
  if (r <= -1) return NaN;
  return (cashflows || []).reduce((sum, cf, i) => sum + Number(cf) / Math.pow(1 + r, i), 0);
}

/** Internal rate of return (percent) by bisection, or NaN when no sign change exists. */
export function irr(cashflows) {
  const cfs = (cashflows || []).map(Number);
  if (cfs.length < 2) return NaN;
  const f = (r) => cfs.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i), 0);
  let lo = -0.999, hi = 100;
  let flo = f(lo), fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return ((lo + hi) / 2) * 100;
}

/** Compound annual growth rate (percent) from a start value to an end value over N years. */
export function cagr(begin, end, years) {
  const b = Number(begin), e = Number(end), y = Number(years);
  if (!(b > 0) || !(y > 0)) return NaN;
  return (Math.pow(e / b, 1 / y) - 1) * 100;
}

/** Simple return on investment (percent). */
export function roi(gain, cost) {
  const c = Number(cost), g = Number(gain);
  if (!(Math.abs(c) > 0)) return NaN;
  return (g / Math.abs(c)) * 100;
}

// ---------------------------------------------------------------- statistics
export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);
export function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function mode(a) {
  if (!a.length) return NaN;
  const counts = new Map();
  for (const x of a) counts.set(x, (counts.get(x) || 0) + 1);
  let best = NaN, bestCount = 0;
  for (const [value, count] of counts) if (count > bestCount) { best = value; bestCount = count; }
  return bestCount > 1 ? best : NaN;
}
/** Variance. `sample` true uses n−1 (sample), false uses n (population). */
export function variance(a, sample = true) {
  const n = a.length;
  const denom = sample ? n - 1 : n;
  if (denom <= 0) return NaN;
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / denom;
}
export const stdev = (a, sample = true) => Math.sqrt(variance(a, sample));
export const range = (a) => (a.length ? Math.max(...a) - Math.min(...a) : NaN);

export function factorial(n) {
  const k = Math.floor(Number(n));
  if (k < 0 || !Number.isFinite(k)) return NaN;
  if (k > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
}
/** Permutations nPr. */
export function nPr(n, r) {
  const N = Math.floor(Number(n)), R = Math.floor(Number(r));
  if (R < 0 || N < 0 || R > N) return 0;
  let out = 1;
  for (let i = 0; i < R; i++) out *= N - i;
  return out;
}
/** Combinations nCr. */
export function nCr(n, r) {
  const N = Math.floor(Number(n)), R = Math.floor(Number(r));
  if (R < 0 || N < 0 || R > N) return 0;
  const k = Math.min(R, N - R);
  let out = 1;
  for (let i = 1; i <= k; i++) out = (out * (N - k + i)) / i;
  return Math.round(out);
}

/** Parse a free-text series ("1, 2, 3" or newline separated) into finite numbers. */
export function parseSeries(text) {
  return String(text || "").split(/[\s,;]+/).map((s) => Number(s)).filter(Number.isFinite);
}

// ---------------------------------------------------------------- percentages
export const percentOf = (percent, whole) => (Number(whole) * Number(percent)) / 100;
/** Percentage change from one value to another. Uses |from| so the sign is intuitive. */
export function percentChange(from, to) {
  const f = Number(from), t = Number(to);
  if (Math.abs(f) < 1e-12) return NaN;
  return ((t - f) / Math.abs(f)) * 100;
}
/** Symmetric percentage difference between two values. */
export function percentDifference(a, b) {
  const A = Number(a), B = Number(b), avg = (Math.abs(A) + Math.abs(B)) / 2;
  if (avg < 1e-12) return NaN;
  return (Math.abs(A - B) / avg) * 100;
}

// ---------------------------------------------------------------- business
/** Break-even units and revenue given fixed cost, unit price and variable cost per unit. */
export function breakEven({ fixed, price, variable }) {
  const contribution = Number(price) - Number(variable);
  if (!(contribution > 0)) return { contribution, units: NaN, revenue: NaN };
  const units = Number(fixed) / contribution;
  return { contribution, units, revenue: units * Number(price) };
}

/** Customer acquisition cost. */
export const cac = (spend, newCustomers) => (newCustomers > 0 ? Number(spend) / Number(newCustomers) : NaN);

/**
 * Customer lifetime value using a simple margin/churn model.
 * ltv = arpu(per period) × gross margin × (1 / churn rate) — i.e. average revenue per period
 * divided by the churn rate, scaled by margin.
 */
export function ltv({ arpu, marginPct = 100, churnPct }) {
  const churn = Number(churnPct) / 100;
  if (!(churn > 0)) return NaN;
  return (Number(arpu) * (Number(marginPct) / 100)) / churn;
}

// ---------------------------------------------------------------- advertising / creator
export const cpmRevenue = (impressions, cpm) => (Number(impressions) / 1000) * Number(cpm);
export const rpmRevenue = (sessions, rpm) => (Number(sessions) / 1000) * Number(rpm);
export const cpcRevenue = (clicks, cpc) => Number(clicks) * Number(cpc);
export const ctr = (clicks, impressions) => (Number(impressions) > 0 ? (Number(clicks) / Number(impressions)) * 100 : NaN);
/** Sessions needed to hit a revenue goal at a given RPM. */
export const sessionsForRevenue = (goal, rpm) => (Number(rpm) > 0 ? (Number(goal) / Number(rpm)) * 1000 : NaN);
/** Affiliate payout after refunds/chargebacks. */
export const affiliatePayout = ({ sales, price, commissionPct, refundPct = 0 }) => {
  const net = Number(sales) * (1 - Number(refundPct) / 100);
  return net * Number(price) * (Number(commissionPct) / 100);
};

// ---------------------------------------------------------------- trading / crypto
/** Value of one pip, in the quote currency, for a contract. */
export const pipValue = ({ pipSize = 0.0001, contractSize = 100000, lots = 1 }) => Number(pipSize) * Number(contractSize) * Number(lots);

export function positionSize({ account, riskPct, stopPips, pipValuePerLot }) {
  const riskAmount = Number(account) * (Number(riskPct) / 100);
  const riskPerLot = Number(stopPips) * Number(pipValuePerLot);
  return { riskAmount, lots: riskPerLot > 0 ? riskAmount / riskPerLot : NaN };
}

/** Isolated-margin liquidation price estimate (ignores funding and tiered maintenance margin). */
export function liquidationPrice({ entry, leverage, maintenanceRatePct = 0.5, side = "long" }) {
  const L = Number(leverage), e = Number(entry), m = Number(maintenanceRatePct) / 100;
  if (!(L > 0)) return NaN;
  return side === "long" ? e * (1 - 1 / L + m) : e * (1 + 1 / L - m);
}

/** Break-even exit price for a spot/futures round trip paying fees on both sides. */
export function breakEvenExit({ entry, feePct = 0.1, side = "long" }) {
  const f = Number(feePct) / 100, e = Number(entry);
  if (side === "long") return (e * (1 + f)) / (1 - f);
  return (e * (1 - f)) / (1 + f);
}

/** Crypto position profit/loss in quote currency, after round-trip fees. */
export function tradePnl({ entry, exit, quantity, feePct = 0, side = "long" }) {
  const q = Number(quantity), e = Number(entry), x = Number(exit);
  const gross = side === "long" ? (x - e) * q : (e - x) * q;
  const fees = (e * q + x * q) * (Number(feePct) / 100);
  return { gross, fees, net: gross - fees };
}

/** Dollar-cost averaging summary from a list of buys [{price, amount}]. */
export function dca({ buys = [] }) {
  const totalCost = buys.reduce((s, b) => s + Number(b.price) * Number(b.amount), 0);
  const totalUnits = buys.reduce((s, b) => s + Number(b.amount), 0);
  return { totalCost, totalUnits, average: totalUnits > 0 ? totalCost / totalUnits : NaN };
}

/** Market capitalisation and fully-diluted valuation. */
export const marketCap = (price, supply) => Number(price) * Number(supply);

// ---------------------------------------------------------------- health
export const bmi = (kg, cm) => {
  const m = Number(cm) / 100;
  return m > 0 ? Number(kg) / (m * m) : NaN;
};
export function bmr({ kg, cm, age, sex }) {
  return 10 * Number(kg) + 6.25 * Number(cm) - 5 * Number(age) + (sex === "female" ? -161 : 5);
}
export function tdee(bmrValue, activity) {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
  return Number(bmrValue) * (factors[activity] ?? 1.2);
}

// ---------------------------------------------------------------- date helpers
/** Whole days between two dates (b − a), ignoring time of day. */
export function daysBetween(a, b) {
  const d1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const d2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((d2 - d1) / 86400000);
}
/** Number of weekdays (Mon–Fri) between two dates inclusive of start, exclusive of end. */
export function weekdaysBetween(a, b) {
  const from = a <= b ? a : b;
  const to = a <= b ? b : a;
  const sign = a <= b ? 1 : -1;
  let count = 0;
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur < end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return sign * count;
}
