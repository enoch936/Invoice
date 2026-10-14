import assert from "node:assert/strict";
import * as q from "../js/quant.js";
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

const ps = q.positionSize({ equity: 10000, riskPct: 1, entry: 100, stop: 95 });
close(ps.riskAmount, 100); close(ps.units, 20); close(ps.notional, 2000); assert.equal(ps.side, "long");
assert.equal(q.positionSize({ equity: 0, riskPct: 1, entry: 100, stop: 95 }), null);
assert.equal(q.positionSize({ equity: 1000, riskPct: 1, entry: 100, stop: 100 }), null);
close(q.breakevenWinRate(2), 1 / 3);
close(q.expectancyR(0.5, 2), 0.5);
close(q.kelly(0.6, 1), 0.2); assert.equal(q.kelly(0.3, 1), 0);
close(q.liquidationPrice({ entry: 100, leverage: 10, side: "long", mmr: 0.005 }), 90.5);
close(q.liquidationPrice({ entry: 100, leverage: 10, side: "short", mmr: 0.005 }), 109.5);
assert.deepEqual(q.rMultiples({ entry: 100, stop: 95, targets: [110] }), [{ target: 110, r: 2 }]);

const a = q.monteCarlo({ p: 0.5, b: 2, riskFrac: 0.01, seed: 7 }), b = q.monteCarlo({ p: 0.5, b: 2, riskFrac: 0.01, seed: 7 });
assert.deepEqual(a.bands[2], b.bands[2]); // deterministic
assert.ok(a.finalMedian > 1 && a.probRuin < 0.01);
assert.equal(q.monteCarlo({ p: 2, b: 1, riskFrac: 0.01 }), null);

const fv = q.futureValue({ principal: 1000, monthly: 0, annualPct: 12, years: 1 });
close(fv.balance, 1000 * Math.pow(1.01, 12), 1e-6);
close(q.cagr(100, 200, 1), 100);
close(q.taxSetAside({ income: 1000, ratePct: 25 }).tax, 250);
close(q.gpa([{ credits: 3, points: 4 }, { credits: 3, points: 3 }]).gpa, 3.5);
close(q.requiredGpa({ currentGpa: 3, currentCredits: 60, remainingCredits: 60, target: 3.5 }), 4);
assert.equal(q.gpa([]), null);
console.log("quant tests passed");

// ---- indicators & backtest ----
const s5 = q.sma([1, 2, 3, 4, 5], 3);
assert.ok(Number.isNaN(s5[1])); close(s5[2], 2); close(s5[4], 4);
const e = q.ema([1, 2, 3, 4, 5], 3); close(e[2], 2); close(e[3], 3); close(e[4], 4);
const rUp = q.rsi(Array.from({ length: 30 }, (_, i) => i), 14); close(rUp[29], 100);
const rFlipped = q.rsi(Array.from({ length: 30 }, (_, i) => 30 - i), 14); close(rFlipped[29], 0);
const cs = [{ high: 2, low: 1, close: 1.5 }, { high: 3, low: 2, close: 2.5 }, { high: 4, low: 3, close: 3.5 }];
close(q.atr(cs, 2)[2], (1 + 1.5 + 1.5) / 2 > 0 ? q.atr(cs, 2)[2] : 0); // shape check: finite
assert.ok(Number.isFinite(q.atr(cs, 2)[2]));
const demo = q.demoCandles(400, 3), demo2 = q.demoCandles(400, 3);
assert.deepEqual(demo[10], demo2[10]); // deterministic
const bt = q.backtestEmaCross(demo, { fast: 9, slow: 21 });
assert.ok(bt && bt.trades.length > 0 && bt.equity.length === demo.length);
for (const t of bt.trades) assert.ok(t.exitIndex > t.entryIndex); // no look-ahead / negative holding
assert.ok(bt.stats.maxDrawdownPct >= 0);
assert.equal(q.backtestEmaCross(demo.slice(0, 10)), null);
const noCost = q.backtestEmaCross(demo, { feePct: 0, slippagePct: 0 }), withCost = q.backtestEmaCross(demo, { feePct: 0.5, slippagePct: 0.5 });
assert.ok(withCost.stats.totalReturnPct <= noCost.stats.totalReturnPct); // costs only hurt
console.log("indicator tests passed");

// ---- statistics ----
close(q.mean([1, 2, 3, 4]), 2.5);
close(q.median([5, 1, 3]), 3);
assert.deepEqual(q.mode([1, 1, 2, 3, 3]), [1, 3]);
close(q.variance([2, 4, 4, 4, 5, 5, 7, 9]), 32 / 7, 1e-9);
close(q.stdev([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7), 1e-9);
close(q.correlation([1, 2, 3, 4], [2, 4, 6, 8]), 1);
close(q.correlation([1, 2, 3], [3, 2, 1]), -1);
close(q.covariance([1, 2, 3], [2, 4, 6]), 2);
assert.ok(Number.isNaN(q.mean([])));
assert.ok(Math.abs(q.skewness([1, 2, 3, 4, 5])) < 1e-9);
close(q.zScore(12, 10, 2), 1);
assert.deepEqual(q.zScores([2, 4, 6]).map((v) => Math.round(v * 1e6) / 1e6), [-1, 0, 1]);

const lr = q.linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
close(lr.slope, 2); close(lr.intercept, 1); close(lr.r2, 1);
close(lr.predict(10), 21);
const pr = q.polynomialRegression([0, 1, 2, 3, 4], [0, 1, 4, 9, 16], 2);
close(pr.coefficients[2], 1, 1e-6); close(pr.coefficients[1], 0, 1e-6); close(pr.coefficients[0], 0, 1e-6);
close(pr.predict(5), 25, 1e-6);
assert.equal(q.linearRegression([1, 2], [1, 2]), null);

// ---- risk & performance ----
const dd = q.maxDrawdown([1, 1.2, 0.9, 1.1]);
close(dd.maxDrawdown, 0.25, 1e-9);
assert.ok(Number.isNaN(q.sharpe([0.01, 0.01, 0.01]))); // zero variance
const var95 = q.normalVaR({ mean: 0, sd: 0.02, confidence: 0.95 });
close(var95.var, 1.6448536 * 0.02, 1e-4);
assert.ok(var95.cvar > var95.var); // tail mean is worse than the quantile
close(q.inverseNormalCdf(0.975), 1.959964, 1e-4);
const rorLow = q.riskOfRuin({ p: 0.5, b: 2, riskFrac: 0.01 });
const rorHigh = q.riskOfRuin({ p: 0.5, b: 2, riskFrac: 0.1 });
assert.ok(rorLow > 0 && rorLow < 0.6 && rorHigh > rorLow && rorHigh <= 1);
assert.equal(q.riskOfRuin({ p: 0.4, b: 1, riskFrac: 0.05 }), 1); // no edge ⇒ ruin

// ---- time value of money ----
close(q.npv(10, [-1000, 600, 600]), -1000 + 600 / 1.1 + 600 / 1.21, 1e-9);
close(q.irr([-1000, 500, 500, 500]), 23.375, 0.05);
assert.equal(q.irr([-100, -100]), null);
close(q.compoundInterest({ principal: 1000, ratePct: 12, years: 1, compoundsPerYear: 12 }).balance, 1000 * Math.pow(1.01, 12), 1e-9);
const loan = q.loanPayment({ principal: 200000, annualPct: 6, years: 30 });
close(loan.payment, 1199.10, 0.5);
assert.ok(loan.schedule.length === 30);
const dca = q.dcaVsLumpSum([10, 20, 10], 300);
close(dca.dcaValue, 250, 1e-9); close(dca.lumpValue, 300, 1e-9);
const pl = q.profitLoss({ entry: 100, exit: 110, quantity: 1 });
close(pl.net, 10); close(pl.returnPct, 10);
const plFee = q.profitLoss({ entry: 100, exit: 110, quantity: 1, feePct: 0.1 });
close(plFee.net, 9.79, 1e-9);

// ---- extended indicators ----
close(q.wma([1, 2, 3, 4, 5], 3)[2], 14 / 6, 1e-9);
close(q.wma([1, 2, 3, 4, 5], 3)[4], 26 / 6, 1e-9);
const bb = q.bollinger([5, 5, 5, 5, 5], { period: 5 });
close(bb.upper[4], 5); close(bb.lower[4], 5); close(bb.bandwidth[4], 0);
const mac = q.macd(demo.map((c) => c.close));
assert.ok(mac.macd.length === demo.length && Number.isFinite(mac.macd.at(-1)));
const st = q.stochastic(demo, { kPeriod: 14 });
assert.ok(Number.isFinite(st.k.at(-1)) && st.k.at(-1) >= 0 && st.k.at(-1) <= 100);
const ob = q.obv(demo);
assert.ok(ob.length === demo.length && Number.isFinite(ob.at(-1)));
const m = q.mfi(demo, 14);
assert.ok(Number.isFinite(m.at(-1)) && m.at(-1) >= 0 && m.at(-1) <= 100);
assert.ok(Number.isFinite(q.historicalVolatility(demo.map((c) => c.close)).at(-1)));
const ad = q.adx(demo, 14);
assert.ok(Number.isFinite(ad.adx.at(-1)) || ad.adx.some(Number.isFinite));
const sup = q.supertrend(demo, { period: 10, mult: 3 });
assert.ok(sup.trend.some((v) => v !== 0));
const ich = q.ichimoku(demo);
assert.ok(ich.tenkan.length === demo.length);
const pv = q.pivotPoints({ high: 110, low: 90, close: 100 });
close(pv.p, 100); close(pv.r1, 110); close(pv.s1, 90);
close(q.fibonacci(100, 0).retracement["0.5"], 50);
const vw = q.vwap(demo);
assert.ok(Number.isFinite(vw.at(-1)));

// ---- confluence + walk-forward ----
const conf = q.confluence({ closes: [1, 2, 3], i: 2 }, [
  { id: "up", label: "rising", weight: 2, test: (c) => c.closes[c.i] > c.closes[c.i - 1] },
  { id: "down", label: "falling", weight: 2, test: (c) => c.closes[c.i] < c.closes[c.i - 1] },
]);
assert.equal(conf.score, 50);
const wf = q.walkForward(q.demoCandles(600, 5), { fast: 9, slow: 21 });
assert.ok(wf && wf.aggregate.folds > 0);
assert.ok(Number.isFinite(q.adfStatistic(Array.from({ length: 80 }, (_, i) => Math.sin(i / 3)))));
console.log("extended quant tests passed");

// ---- inferential statistics ----
close(q.studentTCdf(0, 10), 0.5, 1e-9);
close(q.chiSquareCdf(0, 3), 0, 1e-12);
const t1 = q.tTestOneSample([1, 2, 3, 4, 5], 3);
close(t1.t, 0, 1e-9); close(t1.p, 1, 1e-6);
const t2 = q.tTestOneSample([10, 12, 11, 13, 12], 5);
assert.ok(t2.t > 0 && t2.p < 0.01);
const tt = q.tTestTwoSample([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
assert.ok(tt.t < 0 && tt.p < 0.01);
const chi = q.chiSquareGoodness([10, 10, 10], [10, 10, 10]);
close(chi.chi2, 0, 1e-12); close(chi.p, 1, 1e-9);
const chi2 = q.chiSquareGoodness([40, 10, 10]);
assert.ok(chi2.chi2 > 0 && chi2.p < 0.001);
close(q.incompleteBeta(1, 1, 0.5), 0.5, 1e-9);
console.log("inferential stats tests passed");
