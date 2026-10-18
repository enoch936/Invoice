// Advanced math controller: scientific evaluation, descriptive statistics, correlation/regression,
// hypothesis tests, a function plotter and matrix arithmetic. All computation is local.
import "./app.js";
import "./site.js";
import { evaluateExpression } from "./advanced.js";
import {
  mean, median, mode, variance, stdev, skewness, kurtosis, quartiles,
  correlation, linearRegression, polynomialRegression,
  tTestOneSample, tTestTwoSample, chiSquareGoodness,
} from "./quant.js";

const $ = (id) => document.getElementById(id);
const fmt = (v, d = 4) => (Number.isFinite(v) ? Number(v.toFixed(d)).toLocaleString(undefined, { maximumFractionDigits: d }) : "—");
const parseNums = (text) => (String(text || "").match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || []).map(Number);

function statRows(host, rows) {
  if (!host) return;
  host.replaceChildren();
  rows.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.append(Object.assign(document.createElement("dt"), { textContent: k }), Object.assign(document.createElement("dd"), { textContent: String(v) }));
    host.append(row);
  });
}

// ---------------------------------------------------------------- scientific calculator
// The keypad, DEG/RAD toggle and live evaluation are wired by
// setupScientific() inside advanced.js (it activates when #sci-keys exists).

// ---------------------------------------------------------------- descriptive statistics
$("stats-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = parseNums(new FormData(e.currentTarget).get("series"));
  const sorted = [...data].sort((a, b) => a - b);
  if (data.length < 2) { statRows($("stats-grid"), [["Status", "Enter at least two numbers"]]); $("stats-quartiles").replaceChildren(); return; }
  const q = quartiles(data);
  statRows($("stats-grid"), [
    ["Count", data.length],
    ["Mean", fmt(mean(data))],
    ["Median", fmt(median(data))],
    ["Mode", mode(data).join(", ") || "—"],
    ["Min", fmt(sorted[0])],
    ["Max", fmt(sorted[sorted.length - 1])],
    ["Range", fmt(sorted[sorted.length - 1] - sorted[0])],
    ["Variance", fmt(variance(data))],
    ["Std deviation", fmt(stdev(data))],
    ["Skewness", fmt(skewness(data), 3)],
    ["Excess kurtosis", fmt(kurtosis(data), 3)],
    ["Sum", fmt(data.reduce((a, b) => a + b, 0))],
  ]);
  const body = $("stats-quartiles");
  body.replaceChildren();
  if (q) [["Q1 (25%)", q.q1], ["Q2 (median)", q.q2], ["Q3 (75%)", q.q3], ["IQR", q.iqr]].forEach(([k, v]) => {
    const tr = document.createElement("tr");
    tr.append(Object.assign(document.createElement("td"), { textContent: k }), Object.assign(document.createElement("td"), { textContent: fmt(v) }));
    body.append(tr);
  });
});

// ---------------------------------------------------------------- correlation & regression
$("corr-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const x = parseNums(form.get("x")), y = parseNums(form.get("y"));
  const n = Math.min(x.length, y.length);
  if (n < 2) { statRows($("corr-grid"), [["Status", "Enter at least two matching x and y values"]]); $("corr-eq").textContent = ""; return; }
  const xs = x.slice(0, n), ys = y.slice(0, n);
  const r = correlation(xs, ys), lin = linearRegression(xs, ys);
  const degree = Math.min(6, Math.max(1, Number(form.get("degree")) || 2));
  const poly = polynomialRegression(xs, ys, degree);
  const rows = [
    ["Pairs", n],
    ["Pearson r", fmt(r, 4)],
    ["R² (linear)", fmt(lin ? lin.r2 : NaN, 4)],
    ["Slope", fmt(lin ? lin.slope : NaN)],
    ["Intercept", fmt(lin ? lin.intercept : NaN)],
  ];
  if (poly) rows.push([`Poly R² (deg ${degree})`, fmt(poly.r2, 4)]);
  statRows($("corr-grid"), rows);
  const eq = $("corr-eq");
  if (lin) {
    const sign = lin.intercept < 0 ? "−" : "+";
    eq.textContent = `Linear fit: y = ${fmt(lin.slope)}x ${sign} ${fmt(Math.abs(lin.intercept))}  ·  ${lin.r2 >= 0.9 ? "strong" : lin.r2 >= 0.5 ? "moderate" : "weak"} linear relationship.`;
  } else eq.textContent = "";
});

// ---------------------------------------------------------------- t-tests
$("ttest-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const a = parseNums(form.get("a")), b = parseNums(form.get("b")), type = form.get("type");
  let res = null, label = "";
  if (type === "one" || !b.length) { res = tTestOneSample(a, Number(form.get("mu")) || 0); label = `One-sample t-test vs μ = ${form.get("mu")}`; }
  else if (type === "paired") { res = tTestTwoSample(a, b, { paired: true }); label = "Paired t-test"; }
  else { res = tTestTwoSample(a, b); label = "Two-sample Welch t-test"; }
  if (!res) { statRows($("ttest-grid"), [["Status", "Need at least two values per sample (paired needs equal lengths)"]], "ttest"); return; }
  statRows($("ttest-grid"), [
    ["Test", label],
    ["t statistic", fmt(res.t, 4)],
    ["Degrees of freedom", fmt(res.df, 2)],
    ["Two-sided p-value", fmt(res.p, 4)],
    ["Conclusion (α=0.05)", res.p < 0.05 ? "Reject H₀" : "Fail to reject H₀"],
  ]);
});

// ---------------------------------------------------------------- chi-square
$("chi-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const obs = parseNums(form.get("obs")), exp = parseNums(form.get("exp"));
  const res = chiSquareGoodness(obs, exp.length ? exp : undefined);
  if (!res) { statRows($("chi-grid"), [["Status", "Observed counts must be ≥ 2 positive values; expected must be positive"]]); return; }
  statRows($("chi-grid"), [
    ["χ² statistic", fmt(res.chi2, 4)],
    ["Degrees of freedom", res.df],
    ["p-value", fmt(res.p, 5)],
    ["Conclusion (α=0.05)", res.p < 0.05 ? "Distribution differs from expected" : "No significant difference"],
  ]);
});

// ---------------------------------------------------------------- function plotter
const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}) { const n = document.createElementNS(SVG_NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; }
function plot() {
  const form = $("plot-form"); if (!form) return;
  const data = new FormData(form);
  const expr = String(data.get("expr") || "x");
  const xmin = Number(data.get("xmin")) || -10, xmax = Number(data.get("xmax")) || 10;
  const ymin = Number(data.get("ymin")) || -2, ymax = Number(data.get("ymax")) || 2;
  const points = Math.min(400, Math.max(50, Number(data.get("points")) || 180));
  const svg = $("plot"); if (!svg) return;
  svg.setAttribute("viewBox", "0 0 600 420");
  svg.replaceChildren();
  const W = 600, H = 420, pad = { l: 40, r: 12, t: 12, b: 26 };
  const X = (x) => pad.l + ((x - xmin) / (xmax - xmin || 1)) * (W - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - (y - ymin) / (ymax - ymin || 1)) * (H - pad.t - pad.b);
  const ctx = { deg: false, ans: 0 };
  const sample = (x) => { try { const v = evaluateExpression(expr, Object.assign({}, ctx, { vars: { x } })); return Number.isFinite(v) ? v : NaN; } catch { return NaN; } };

  // grid + axes
  const axis = el("line", { x1: pad.l, y1: Y(0), x2: W - pad.r, y2: Y(0), stroke: "#3a4a63", "stroke-width": 1 });
  const vaxis = el("line", { x1: X(0), y1: pad.t, x2: X(0), y2: H - pad.b, stroke: "#3a4a63", "stroke-width": 1 });
  svg.append(vaxis, axis);
  for (let k = 0; k <= 4; k++) {
    const gy = pad.t + (k / 4) * (H - pad.t - pad.b);
    svg.append(el("line", { x1: pad.l, y1: gy, x2: W - pad.r, y2: gy, stroke: "#26334a", "stroke-width": 0.5, "stroke-dasharray": "3 4" }));
  }

  // curve
  const path = [];
  const deriv = [];
  const stepX = (xmax - xmin) / points;
  let integral = 0, prev = null;
  const h = stepX / 2;
  for (let i = 0; i <= points; i++) {
    const x = xmin + i * stepX, y = sample(x);
    if (!Number.isFinite(y)) { prev = null; continue; }
    path.push(`${prev ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`);
    if (prev !== null) integral += ((prev + y) / 2) * stepX;
    // numeric central difference
    const d = (sample(x + h) - sample(x - h)) / (2 * h);
    deriv.push(`${i === 0 ? "M" : "L"}${X(x).toFixed(1)} ${Y(Number.isFinite(d) ? d : 0).toFixed(1)}`);
    prev = y;
  }
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6c7cff";
  svg.append(el("path", { d: deriv.join(" "), fill: "none", stroke: "#8dafff", "stroke-width": 1, "stroke-dasharray": "5 5", opacity: 0.7 }));
  svg.append(el("path", { d: path.join(" "), fill: "none", stroke: accent, "stroke-width": 2 }));
  svg.append(el("text", { x: pad.l + 6, y: pad.t + 14, fill: "#9ba9bd", "font-size": 11 }, Object.assign(document.createElementNS(SVG_NS, "tspan"), { textContent: `f(x) = ${expr}` })));
  svg.append(el("text", { x: pad.l + 6, y: H - 8, fill: "#9ba9bd", "font-size": 10 }, Object.assign(document.createElementNS(SVG_NS, "tspan"), { textContent: `Approx ∫ from ${xmin} to ${xmax} ≈ ${Number(integral.toFixed(4))}` })));
  svg.setAttribute("aria-label", `Plot of f(x)=${expr} from ${xmin} to ${xmax}. Numeric integral ≈ ${integral.toFixed(3)}.`);
}
$("plot-form")?.addEventListener("submit", (e) => { e.preventDefault(); plot(); });
$("plot-form")?.addEventListener("input", () => plot());
plot();

// ---------------------------------------------------------------- matrix arithmetic
function parseMatrix(text) {
  const rows = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[\s,]+/).filter(Boolean).map(Number));
  if (!rows.length || rows.some((r) => !r.length || r.some((v) => !Number.isFinite(v)))) return null;
  const w = rows[0].length;
  if (rows.some((r) => r.length !== w)) return null;
  return rows;
}
const mFmt = (m) => m.map((row) => row.map((v) => Number(v.toFixed(4)).toString().padStart(8)).join(" ")).join("\n");
const mAdd = (a, b) => a.map((r, i) => r.map((v, j) => v + b[i][j]));
const mSub = (a, b) => a.map((r, i) => r.map((v, j) => v - b[i][j]));
const mTranspose = (a) => a[0].map((_, j) => a.map((r) => r[j]));
function mMul(a, b) {
  if (a[0].length !== b.length) return null;
  return a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
}
function mDet(m) {
  const n = m.length; if (m.some((r) => r.length !== n)) return NaN;
  const a = m.map((r) => r.slice()); let det = 1;
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    if (Math.abs(a[piv][c]) < 1e-12) return 0;
    if (piv !== c) { [a[c], a[piv]] = [a[piv], a[c]]; det *= -1; }
    det *= a[c][c];
    for (let r = c + 1; r < n; r++) { const f = a[r][c] / a[c][c]; for (let k = c; k < n; k++) a[r][k] -= f * a[c][k]; }
  }
  return det;
}
function mInverse(m) {
  const n = m.length; if (m.some((r) => r.length !== n)) return null;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    if (Math.abs(a[piv][c]) < 1e-12) return null;
    [a[c], a[piv]] = [a[piv], a[c]];
    const pv = a[c][c]; for (let k = 0; k < 2 * n; k++) a[c][k] /= pv;
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = a[r][c]; for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k]; }
  }
  return a.map((r) => r.slice(n));
}
function matrixAction(fn) {
  const A = parseMatrix($("mA").value), B = parseMatrix($("mB").value);
  const out = $("m-out");
  try {
    if (!A && !B) { out.textContent = "Enter matrix A and/or B first."; return; }
    const result = fn(A, B);
    out.textContent = result == null ? "Operation not defined for these shapes (check dimensions)." : (typeof result === "number" ? String(Number(result.toFixed(6))) : mFmt(result));
  } catch { out.textContent = "Could not compute — check the matrix format."; }
}
const needAB = (A, B) => (A && B ? [A, B] : null);
const needA = (A) => (A ? A : null);
$("m-add").onclick = () => matrixAction((A, B) => { const p = needAB(A, B); if (!p) return null; return A.length === B.length && A[0].length === B[0].length ? mAdd(A, B) : null; });
$("m-sub").onclick = () => matrixAction((A, B) => { const p = needAB(A, B); if (!p) return null; return A.length === B.length && A[0].length === B[0].length ? mSub(A, B) : null; });
$("m-mul").onclick = () => matrixAction((A, B) => { const p = needAB(A, B); if (!p) return null; return mMul(A, B); });
$("m-tA").onclick = () => matrixAction((A) => { const x = needA(A); return x ? mTranspose(x) : null; });
$("m-tB").onclick = () => matrixAction((A, B) => { const p = needAB(A, B); if (!p) return null; return mTranspose(B); });
$("m-detA").onclick = () => matrixAction((A) => { const x = needA(A); return x ? mDet(x) : null; });
$("m-detB").onclick = () => matrixAction((A, B) => { const p = needAB(A, B); if (!p) return null; return mDet(B); });
$("m-invA").onclick = () => matrixAction((A) => { const x = needA(A); return x ? mInverse(x) : null; });
$("m-invB").onclick = () => matrixAction((A, B) => { const p = needAB(A, B); if (!p) return null; return mInverse(B); });

// ---------------------------------------------------------------- base converter
function baseConvert() {
  const value = $("base-num").value.trim(), from = Number($("base-from").value), to = Number($("base-to").value);
  const parsed = parseInt(value, from);
  $("base-out").textContent = Number.isFinite(parsed) ? `= ${parsed.toString(to).toUpperCase()} (base ${to})` : "Enter a valid number for the chosen base.";
}
["base-num", "base-from", "base-to"].forEach((id) => $(id)?.addEventListener("input", baseConvert));
$("base-from")?.addEventListener("change", baseConvert);
$("base-to")?.addEventListener("change", baseConvert);
baseConvert();
