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
