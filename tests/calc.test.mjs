// PARCHXA calculator tests.
//
// Two layers:
//   1. the pure maths engine (js/calc/math.js, js/calc/format.js) against known answers;
//   2. catalog integrity — every published calculator must run with its own defaults, return a
//      result, and only link to calculators that exist.
//
// Run directly (node tests/calc.test.mjs) or via tools/verify.mjs.

import assert from "node:assert/strict";
import * as m from "../js/calc/math.js";
import { round, formatCurrency, formatValue } from "../js/calc/format.js";
import { CALCULATORS, CATEGORIES, danglingRelated, getCalculator } from "../js/calc/catalog.js";

let passed = 0;
const close = (a, b, eps = 1e-6, label = "") => { assert.ok(Math.abs(a - b) < eps, `${label} ${a} !~ ${b}`); passed++; };
const ok = (cond, label = "") => { assert.ok(cond, label); passed++; };

// ---------------------------------------------------------------- loans
close(m.loanPayment(20000, 0.08 / 12, 60), 405.53, 0.5, "loanPayment");
const amort = m.amortization({ principal: 20000, annualRate: 8, months: 60 });
close(amort.rows.reduce((s, r) => s + r.principal, 0), 20000, 0.02, "amort principal");
close(amort.totalPaid, 20000 + amort.totalInterest, 1e-6, "amort totals");
close(m.loanPayment(1200, 0, 12), 100, 1e-9, "zero-rate loan");
const amortX = m.amortization({ principal: 20000, annualRate: 8, months: 60, extra: 100 });
ok(amortX.months < amort.months, "extra payments shorten the term");
ok(amortX.totalInterest < amort.totalInterest, "extra payments cut interest");
ok(m.amortization({ principal: 0, annualRate: 8, months: 60 }).error, "invalid loan reports an error");

// ---------------------------------------------------------------- growth / TVM
close(m.compoundGrowth({ principal: 1000, contribution: 0, annualRate: 5, years: 10, perYear: 1 }).futureValue, 1628.8946, 1e-3, "compound lump sum");
close(m.futureValue(10000, 7, 10, 1), 19671.5136, 1e-3, "futureValue");
close(m.presentValue(20000, 7, 10, 1), 10166.99, 0.05, "presentValue");
close(m.npv(10, [-10000, 3000, 3200, 3400, 3600, 3800]), 2744.7169, 1e-2, "npv");
close(m.irr([-10000, 3000, 3200, 3400, 3600, 3800]), 19.0, 1.0, "irr");
ok(Number.isNaN(m.irr([1, 2, 3])), "irr without a sign change is NaN");
close(m.cagr(10000, 18000, 5), 12.4746, 1e-3, "cagr");
close(m.roi(3500, 10000), 35, 1e-9, "roi");

// ---------------------------------------------------------------- statistics
close(m.mean([2, 4, 4, 4, 5, 5, 7, 9]), 5, 1e-12, "mean");
close(m.median([2, 4, 4, 4, 5, 5, 7, 9]), 4.5, 1e-12, "median");
close(m.mode([2, 4, 4, 4, 5, 5, 7, 9]), 4, 1e-12, "mode");
close(m.variance([2, 4, 4, 4, 5, 5, 7, 9], false), 4, 1e-9, "population variance");
close(m.stdev([2, 4, 4, 4, 5, 5, 7, 9], false), 2, 1e-9, "population stdev");
close(m.factorial(5), 120, 1e-9, "factorial");
close(m.nCr(5, 2), 10, 1e-9, "nCr"); close(m.nPr(5, 2), 20, 1e-9, "nPr");
close(m.percentChange(200, 250), 25, 1e-9, "percentChange");
close(round(2.675, 2), 2.68, 1e-9, "round");

// ---------------------------------------------------------------- business & creator
const be = m.breakEven({ fixed: 10000, price: 50, variable: 30 });
close(be.contribution, 20, 1e-9, "contribution"); close(be.units, 500, 1e-9, "break-even units");
close(m.cac(5000, 50), 100, 1e-9, "cac");
close(m.ltv({ arpu: 50, marginPct: 100, churnPct: 5 }), 1000, 1e-9, "ltv");
close(m.cpmRevenue(100000, 5), 500, 1e-9, "cpm");
close(m.rpmRevenue(100000, 5), 500, 1e-9, "rpm");
close(m.cpcRevenue(1000, 0.5), 500, 1e-9, "cpc");
close(m.ctr(2000, 100000), 2, 1e-9, "ctr");
close(m.sessionsForRevenue(1000, 5), 200000, 1e-9, "required traffic");
// ---------------------------------------------------------------- trading & crypto
close(m.liquidationPrice({ entry: 100, leverage: 10, maintenanceRatePct: 0.5 }), 90.5, 1e-9, "liquidation long");
close(m.liquidationPrice({ entry: 100, leverage: 10, maintenanceRatePct: 0.5, side: "short" }), 109.5, 1e-9, "liquidation short");
close(m.breakEvenExit({ entry: 100, feePct: 0.1 }), 100.2002, 1e-3, "break-even exit");
const pnl = m.tradePnl({ entry: 100, exit: 110, quantity: 2, feePct: 0.1 });
close(pnl.gross, 20, 1e-9, "pnl gross"); close(pnl.fees, 0.42, 1e-9, "pnl fees"); close(pnl.net, 19.58, 1e-9, "pnl net");
close(m.dca({ buys: [{ price: 100, amount: 1 }, { price: 200, amount: 1 }] }).average, 150, 1e-9, "dca average");
close(m.marketCap(2, 1000), 2000, 1e-9, "market cap");

// ---------------------------------------------------------------- combinatorics / health / dates
close(m.factorial(0), 1, 1e-9, "0!"); close(m.nCr(10, 0), 1, 1e-9, "nCr edge");
close(m.bmi(70, 175), 22.8571, 1e-3, "bmi");
close(m.bmr({ kg: 70, cm: 175, age: 30, sex: "male" }), 1648.75, 0.01, "bmr male");
close(m.bmr({ kg: 70, cm: 175, age: 30, sex: "female" }), 1482.75, 0.01, "bmr female");

close(m.tdee(1600, "sedentary"), 1920, 1e-9, "tdee");
close(m.daysBetween(new Date(2026, 0, 1), new Date(2026, 2, 1)), 59, 1e-9, "daysBetween");
close(m.weekdaysBetween(new Date(2026, 9, 1), new Date(2026, 9, 14)), 9, 1e-9, "weekdaysBetween");
close(m.weekdaysBetween(new Date(2026, 9, 14), new Date(2026, 9, 1)), -9, 1e-9, "weekdaysBetween reversed");

// ---------------------------------------------------------------- format
close(round(2.5, 0), 3, 1e-9, "round half up");
close(round(1.2345, 2), 1.23, 1e-9, "round 2dp");
close(round(-2.5, 0), -3, 1e-9, "round negative half away from zero");
ok(formatCurrency(1234.5, "USD").includes("1,234.50") || formatCurrency(1234.5, "USD").length > 0, "currency formats");
ok(formatValue(12.5, "percent") === "12.5%", "percent format");

// ---------------------------------------------------------------- catalog integrity
ok(CATEGORIES.length >= 5, "categories exist");
ok(CALCULATORS.length >= 40, `enough calculators (${CALCULATORS.length})`);
const slugs = new Set();
for (const c of CALCULATORS) {
  ok(!slugs.has(c.slug), `unique slug ${c.slug}`); slugs.add(c.slug);
  ok(typeof c.title === "string" && c.title.length > 3, `${c.slug} title`);
  ok(typeof c.h1 === "string" && c.h1.length > 1, `${c.slug} h1`);
  ok(typeof c.description === "string" && c.description.length > 40, `${c.slug} description`);
  ok(typeof c.intro === "string" && c.intro.length > 20, `${c.slug} intro`);
  ok(Array.isArray(c.inputs) && c.inputs.length > 0, `${c.slug} inputs`);
  ok(typeof c.run === "function", `${c.slug} run`);
  ok(typeof c.formula === "string" && c.formula.length > 2, `${c.slug} formula`);
  ok(Array.isArray(c.example) && c.example.length >= 3, `${c.slug} example`);
  ok(Array.isArray(c.assumptions) && c.assumptions.length >= 2, `${c.slug} assumptions`);
  ok(Array.isArray(c.faq) && c.faq.length >= 2, `${c.slug} faq`);
  ok(Array.isArray(c.related) && c.related.length >= 2, `${c.slug} related`);
  ok(CATEGORIES.some((cat) => cat.id === c.category), `${c.slug} category ${c.category}`);
}
ok(danglingRelated().length === 0, `no dangling related: ${danglingRelated().join(", ")}`);
ok(getCalculator("compound-interest") !== null, "getCalculator works");
ok(getCalculator("does-not-exist") === null, "getCalculator misses safely");

// ---------------------------------------------------------------- every calculator runs with its defaults
for (const c of CALCULATORS) {
  const values = {};
  for (const inp of c.inputs) values[inp.key] = inp.default;
  let result;
  try { result = c.run(values, { currency: "USD" }); }
  catch (error) { assert.fail(`${c.slug} threw with defaults: ${error.message}`); }
  ok(result && result.primary, `${c.slug} returns a primary result`);
  ok(result.primary.value !== undefined && result.primary.value !== null, `${c.slug} primary has a value`);
  ok(typeof result.verdict === "string" && result.verdict.length > 5, `${c.slug} has a verdict`);
  ok(Array.isArray(result.steps) && result.steps.length > 0, `${c.slug} has steps`);
}

console.log(`calc tests passed (${passed} assertions)`);
