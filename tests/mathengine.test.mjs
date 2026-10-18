// PARCHXA mathematical engine tests (js/mathengine.js).
// Covers the master-prompt acceptance cases: precedence, complex arithmetic, polynomial roots
// (incl. multiplicity), linear systems, numerical calculus, matrices and number theory.
// Run directly (node tests/mathengine.test.mjs) or via tools/verify.mjs.

import {
  evaluate, evalNumber, formatNumber, formatComplex, parse,
  solvePolynomialExpression, solveLinearSystem, parseSystemText,
  parseMatrixText, matDet, matInverse, matRank, matEigen,
  derivative, definiteIntegral, findRoots, findExtrema, niceTicks, sampleFunction, limitNumeric,
  isPrime, powMod, modInverse, primeFactors, bigIntGcd, bigIntLcm,
  latexFromAscii, cx
} from "../js/mathengine.js";

let pass = 0, fail = 0;
const fails = [];
const ok = (cond, label, detail = "") => {
  if (cond) { pass += 1; } else { fail += 1; fails.push(`${label} ${detail}`); }
};
const near = (a, b, tol = 1e-9, label = "", detail = "") =>
  ok(Number.isFinite(a) && Math.abs(a - b) <= tol, label, `got ${a}, want ${b}${detail ? " " + detail : ""}`);
const fmt = (src, env) => formatNumber(evaluate(src, env).re);

console.log("== basic arithmetic ==");
ok(fmt("2+3*4") === "14", "precedence 2+3*4");
ok(fmt("(2+3)*4") === "20", "parens (2+3)*4");
ok(fmt("2^10") === "1024", "2^10");
ok(fmt("sqrt(81)") === "9", "sqrt(81)");
near(evalNumber("log(1000)"), 3, 1e-12, "log(1000)");
  near(evalNumber("log10(1000)"), 3, 1e-12, "log10(1000)");
near(evaluate("sin(30)", { deg: true }).re, 0.5, 1e-12, "sin(30 deg)");
ok(fmt("5!") === "120", "5!");
ok(fmt("2+3*4") === "14" && fmt("0.1+0.2") === "0.3", "float clean 0.1+0.2");
near(evalNumber("2*pi"), 6.283185307179586, 1e-12, "implicit 2pi");
ok(fmt("10%") === "0.1", "postfix 10%");
ok(fmt("mod(7,3)") === "1", "mod(7,3)");
ok(fmt("2^-3") === "0.125", "negative exponent");
ok(fmt("-2^2") === "-4", "unary minus vs power");
ok(fmt("2^3^2") === "512", "right-assoc power");
ok(fmt("3(4+5)") === "27", "implicit paren mult");
ok(fmt("2sqrt(9)") === "6", "implicit function mult");
ok(fmt("sqrt(9)*4") === "12", "sqrt binds primary");
ok(fmt("2x+1", { vars: { x: 3 } }) === "7", "variable x=3");
ok(fmt("ans*2", { ans: 21 }) === "42", "ans context");
near(evalNumber("fact(0.5)"), Math.sqrt(Math.PI) / 2, 1e-10, "gamma factorial 0.5");
ok(fmt("1/0") === "Infinity" || fmt("1/0") === "infinity" || fmt("1/0") === "Infinity", "div by zero honest");
ok(fmt("1e3") === "1000", "scientific literal");
ok(fmt("1000000") === "1000000", "big decimal stays");
ok(formatNumber(123456789012345678) === "1.23456789012e+17" || formatNumber(123456789012345678) === "1.234567890123e+17", "auto precision large", `got ${formatNumber(123456789012345678)}`);
ok(formatNumber(Math.PI, "3") === "3.14", "precision 3");
ok(formatNumber(1 / 3) === "0.333333333333", "auto 1/3");
ok(formatNumber(2 / 3) === "0.666666666667", "auto 2/3");

console.log("== errors ==");
const err = (src, frag) => {
  try { evaluate(src); ok(false, `error expected for ${src}`); }
  catch (e) { ok(String(e.message).includes(frag), `error for ${src}`, `got "${e.message}"`); }
};
err("2+", "Incomplete");
err("(2+3", 'Missing ")"');
err("foo(2)", "Unknown function");
err("banana", "Unknown name");
err("2$3", "Unexpected character");

console.log("== complex ==");
ok(formatComplex(evaluate("i*i")) === "-1", "i*i");
const cd = evaluate("(2+3i)/(1-i)");
ok(Math.abs(cd.re - (-0.5)) < 1e-12 && Math.abs(cd.re - (-0.5)) < 1e-12 && Math.abs(cd.im - 2.5) < 1e-12, "(2+3i)/(1-i)", `got ${cd.re},${cd.im}`);
near(evaluate("abs(3+4i)").re, 5, 1e-12, "abs(3+4i)");
near(evaluate("arg(1+i)").re, Math.PI / 4, 1e-12, "arg(1+i)");
ok(formatComplex(evaluate("sqrt(-1)")) === "i", "sqrt(-1)=i");
near(evaluate("ln(-1)").im, Math.PI, 1e-10, "ln(-1)=i*pi im");
ok(formatComplex(evaluate("conj(2-5i)")) === "2 + 5i", "conj");
near(evaluate("re(3+4i)").re, 3, 0, "re");
near(evaluate("imag(3+4i)").re, 4, 0, "imag");
ok(formatComplex(evaluate("exp(i*pi)+1")) === "0" || Math.abs(evaluate("exp(i*pi)+1").re + 1) < 1e-9, "euler", `got ${formatComplex(evaluate("exp(i*pi)+1"))}`);

console.log("== unicode normalize ==");
ok(fmt("2×3") === "6", "multiplication sign");
ok(fmt("√81") === "9", "radical sign");
near(evalNumber("π"), Math.PI, 0, "pi sign");
const polyU = solvePolynomialExpression("x²-5x+6");
ok(polyU.ok && polyU.roots.length === 2, "superscript square parses", JSON.stringify(polyU.roots));

console.log("== polynomial solver ==");
const t1 = solvePolynomialExpression("x^2-5x+6");
ok(t1.ok && t1.exact && t1.roots.length === 2, "x^2-5x+6 roots count");
ok(t1.ok && t1.roots.every((r) => [2, 3].some((w) => Math.abs(r.re - w) < 1e-9 && r.im === 0 && r.mult === 1)), "x^2-5x+6 = {2,3}", JSON.stringify(t1.roots));
const t2 = solvePolynomialExpression("x^2+1");
ok(t2.ok && t2.roots.length === 2 && t2.roots.every((r) => Math.abs(Math.abs(r.im) - 1) < 1e-9 && Math.abs(r.re) < 1e-9), "x^2+1 = ±i", JSON.stringify(t2.roots));
const t3 = solvePolynomialExpression("x^3-1");
ok(t3.ok && t3.roots.length === 3, "x^3-1 three roots");
ok(t3.ok && t3.roots.some((r) => Math.abs(r.re - 1) < 1e-8 && Math.abs(r.im) < 1e-8) &&
  t3.roots.filter((r) => Math.abs(r.im) > 0.8).length === 2, "x^3-1 complex pair", JSON.stringify(t3.roots));
ok(t3.ok && t3.maxResidual < 1e-8, "x^3-1 residual", String(t3.maxResidual));
const t4 = solvePolynomialExpression("(x-1)^2");
ok(t4.ok && t4.roots.length === 1 && Math.abs(t4.roots[0].re - 1) < 1e-9 && t4.roots[0].mult === 2, "(x-1)^2 double root", JSON.stringify(t4.roots));
const t4b = solvePolynomialExpression("x^2-2x+1");
ok(t4b.ok && t4b.roots.length === 1 && t4b.roots[0].mult === 2, "x^2-2x+1 repeated", JSON.stringify(t4b.roots));
const t5 = solvePolynomialExpression("2x-4");
ok(t5.ok && t5.exact && Math.abs(t5.roots[0].re - 2) < 1e-12, "2x-4");
const t6 = solvePolynomialExpression("x^2 = 4");
ok(t6.ok && t6.roots.every((r) => Math.abs(Math.abs(r.re) - 2) < 1e-9), "equation form x^2=4", JSON.stringify(t6.roots));
const t7 = solvePolynomialExpression("x^4-1");
ok(t7.ok && t7.roots.length === 4 && t7.roots.filter((r) => Math.abs(r.im) > 0.9).length === 2, "x^4-1 = ±1, ±i", JSON.stringify(t7.roots));
const t8 = solvePolynomialExpression("x^3-x");
ok(t8.ok && t8.roots.length === 3 && [-1, 0, 1].every((w) => t8.roots.some((r) => Math.abs(r.re - w) < 1e-8)), "x^3-x", JSON.stringify(t8.roots));
const t9 = solvePolynomialExpression("5");
ok(t9.type === "none", "constant no solution");
const t10 = solvePolynomialExpression("0");
ok(t10.type === "all", "0=0 all");
try { solvePolynomialExpression("sqrt(x)"); ok(false, "sqrt(x) should fail"); } catch (e) { ok(String(e.message).includes("not a polynomial") || String(e.message).includes("Function"), "sqrt(x) rejected", e.message); }
const t11 = solvePolynomialExpression("x^3-6x^2+11x-6");
ok(t11.ok && [1, 2, 3].every((w) => t11.roots.some((r) => Math.abs(r.re - w) < 1e-7)), "x^3-6x^2+11x-6 = 1,2,3", JSON.stringify(t11.roots));
const t12 = solvePolynomialExpression("x^5-x");
ok(t12.ok && t12.roots.length === 5, "deg5 numeric", JSON.stringify(t12.roots.map((r) => [r.re, r.im])));
ok(t12.ok && t12.maxResidual < 1e-6, "deg5 residual", String(t12.maxResidual));
const t13 = solvePolynomialExpression("(x^2+1)*(x-2)");
ok(t13.ok && t13.roots.length === 3, "factored input", JSON.stringify(t13.roots));

console.log("== linear systems ==");
const s1 = solveLinearSystem("x+y=5\nx-y=1");
ok(s1.type === "unique" && Math.abs(s1.values[0] - 3) < 1e-12 && Math.abs(s1.values[1] - 2) < 1e-12, "x+y=5,x-y=1", JSON.stringify(s1));
ok(s1.residualOK, "s1 residual");
const s2 = solveLinearSystem("2x+2y=4\nx+y=3");
ok(s2.type === "none", "inconsistent", JSON.stringify(s2));
const s3 = solveLinearSystem("x+y=2\n2x+2y=4");
ok(s3.type === "infinite" && s3.free.length >= 1, "infinite solutions", JSON.stringify(s3));
const s4 = solveLinearSystem("x+y+z=6\n2y+3z=8\nz=2");
ok(s4.type === "unique" && s4.values.every((v, i) => Math.abs(v - [3, 1, 2][i]) < 1e-12), "3x3 system", JSON.stringify(s4.values));
const s5 = solveLinearSystem("x/2+y/3=1\nx-y=1");
ok(s5.type === "unique" && s5.fractions[0] === "8/5" && s5.fractions[1] === "3/5", "fractional coeffs", JSON.stringify(s5.fractions));
const s6 = solveLinearSystem("3x=9");
ok(s6.type === "unique" && Math.abs(s6.values[0] - 3) < 1e-12, "single equation");
try { solveLinearSystem("x^2+y=1"); ok(false, "quadratic rejected"); } catch (e) { ok(true, "quadratic rejected"); }
const s6b = solveLinearSystem("y=2x");
ok(s6b.type === "infinite", "y=2x infinite family", JSON.stringify(s6b));
const s7 = solveLinearSystem("x+y=1\nx-y=1");
ok(s7.type === "unique" && Math.abs(s7.values[0] - 1) < 1e-12 && Math.abs(s7.values[1]) < 1e-12, "x+y=1,x-y=1", JSON.stringify(s7.values));

console.log("== matrices ==");
const A = parseMatrixText("1, 2\n3, 4");
near(matDet(A).value, -2, 1e-12, "det 2x2");
const A3 = parseMatrixText("2 0 1; 1 -3 2; 4 -1 1");
near(matDet(A3).value, 9, 1e-10, "det 3x3", String(matDet(A3).value));
const inv = matInverse(A);
ok(inv && Math.abs(inv[0][0] + 2) < 1e-12 && Math.abs(inv[0][1] - 1) < 1e-12 && Math.abs(inv[1][0] - 1.5) < 1e-12 && Math.abs(inv[1][1] + 0.5) < 1e-12, "inverse 2x2", JSON.stringify(inv));
ok(matInverse(parseMatrixText("1,2\n2,4")) === null, "singular inverse null");
ok(matRank(parseMatrixText("1,2\n2,4")) === 1, "rank 1");
ok(matRank(A) === 2, "rank 2");
const e2 = matEigen(parseMatrixText("2,1\n1,2"));
ok(e2.values.length === 2 && [1, 3].every((w) => e2.values.some((l) => Math.abs(l.re - w) < 1e-8)), "eigen 2x2", JSON.stringify(e2.values));
const e3 = matEigen(parseMatrixText("2,0,1\n1,-3,2\n4,-1,1"));
ok(e3.values.length >= 1, "eigen 3x3 runs", JSON.stringify(e3.values));
{
  const tr = 0;
  const sum = e3.values.reduce((s, l) => s + l.re, tr);
  near(sum, 2 + -3 + 1, 1e-6, "eigen sum = trace", String(sum));
}
for (let i = 0; i < e2.values.length; i += 1) {
  const l = e2.values[i], v = e2.vectors[i];
  const r0 = { re: 2 * v[0].re + 1 * v[1].re, im: 2 * v[0].im + 1 * v[1].im };
  const r1 = { re: 1 * v[0].re + 2 * v[1].re, im: 1 * v[0].im + 2 * v[1].im };
  const g0 = { re: l.re * v[0].re - l.im * v[0].im, im: l.re * v[0].im + l.im * v[0].re };
  const g1 = { re: l.re * v[1].re - l.im * v[1].im, im: l.re * v[1].im + l.im * v[1].re };
  ok(Math.hypot(r0.re - g0.re, r0.im - g0.im) < 1e-6 && Math.hypot(r1.re - g1.re, r1.im - g1.im) < 1e-6, `A v = lambda v (i=${i})`);
}
for (let i = 0; i < e3.values.length; i += 1) {
  const l = e3.values[i], v = e3.vectors[i];
  if (!v) continue;
  let bad = false;
  for (let row = 0; row < 3; row += 1) {
    let acc = cx(0, 0);
    for (let c = 0; c < 3; c += 1) {
      const a = cx(A3[row][c], 0);
      const prod = { re: a.re * v[c].re - a.im * v[c].im, im: a.re * v[c].im + a.im * v[c].re };
      acc = { re: acc.re + prod.re, im: acc.im + prod.im };
    }
    const expect = { re: l.re * v[row].re - l.im * v[row].im, im: l.re * v[row].im + l.im * v[row].re };
    if (Math.hypot(acc.re - expect.re, acc.im - expect.im) > 1e-5) bad = true;
  }
  ok(!bad, `3x3 eigenvector ${i} verifies`, JSON.stringify({ l, v }));
}

console.log("== numeric calculus ==");
near(derivative((x) => x * x, 3), 6, 1e-5, "d/dx x^2 at 3");
near(derivative((x) => Math.sin(x), 0), 1, 1e-6, "d/dx sin at 0");
let I = definiteIntegral((x) => x * x, 0, 3);
ok(I.ok && Math.abs(I.value - 9) < 1e-7, "int x^2 0..3", String(I.value));
I = definiteIntegral((x) => 1 / x, 1, 2);
ok(I.ok && Math.abs(I.value - Math.LN2) < 1e-8, "int 1/x 1..2", String(I.value));
I = definiteIntegral(Math.sin, 0, Math.PI);
ok(I.ok && Math.abs(I.value - 2) < 1e-8, "int sin 0..pi", String(I.value));
const R = findRoots((x) => x * x - 4, -5, 5);
ok(R.length === 2 && [-2, 2].every((w) => R.some((r) => Math.abs(r - w) < 1e-7)), "roots x^2-4", JSON.stringify(R));
const ex = findExtrema((x) => -(x - 1) * (x - 1) + 2, -5, 5);
ok(ex.some((e) => e.type === "max" && Math.abs(e.x - 1) < 0.01 && Math.abs(e.y - 2) < 0.01), "extrema of concave quad", JSON.stringify(ex));
const L = limitNumeric((x) => Math.sin(x) / x, 0);
ok(L.ok && Math.abs(L.value - 1) < 1e-5, "limit sin(x)/x", JSON.stringify(L));
const L2 = limitNumeric((x) => 1 / x, 0);
ok(!L2.ok || Math.abs(L2.value) > 1e6, "limit 1/x diverges", JSON.stringify(L2));
const tk = niceTicks(0, 10, 5);
ok(tk.step === 2 && tk.ticks.length === 6 && tk.ticks[0] === 0 && tk.ticks[5] === 10, "ticks 0..10", JSON.stringify(tk));
const tk2 = niceTicks(-0.3, 0.3, 6);
ok(Math.abs(tk2.step - 0.1) < 1e-15 && Math.abs(tk2.ticks[0] + 0.3) < 1e-12 && tk2.ticks.length === 7, "ticks -0.3..0.3", JSON.stringify(tk2));
const seg1 = sampleFunction((x) => 1 / x, -2, 2, 400, 10);
ok(seg1.length === 2, "1/x has 2 segments", String(seg1.length));
const seg2 = sampleFunction((x) => x * x, -2, 2, 400, 10);
ok(seg2.length === 1, "x^2 single segment", String(seg2.length));
const seg3 = sampleFunction((x) => evalNumber("ln(x)", { vars: { x } }), -5, 5, 300, 10);
ok(seg3.length === 1 && seg3[0].every((p) => p.x >= -1e-9), "ln(x) no left branch", JSON.stringify(seg3.map((s) => s.length)));
const seg4 = sampleFunction((x) => Math.tan(x), -2, 2, 500, 4);
ok(seg4.length >= 3, "tan discontinuities", String(seg4.length));

console.log("== number theory ==");
const show = (v) => JSON.stringify(v, (k, x) => typeof x === "bigint" ? x.toString() : x);
const pf = primeFactors(360);
ok(pf.length === 3 && pf[0].p === 2n && pf[0].k === 3 && pf[1].p === 3n && pf[1].k === 2 && pf[2].p === 5n, "factors of 360", show(pf));
const pf2 = primeFactors(97n);
ok(pf2.length === 1 && pf2[0].p === 97n, "97 prime", show(pf2));
const pf3 = primeFactors(1000003n * 1000033n);
ok(pf3.length === 2, "large semiprime", show(pf3));
ok(isPrime(97) && !isPrime(91) && isPrime(2) && !isPrime(1) && isPrime(1000003), "isPrime");
near(Number(powMod(2n, 10n, 1000n)), 24, 0, "modpow");
ok(modInverse(3n, 11n) === 4n, "modInverse 3 mod 11");
ok(modInverse(2n, 4n) === null, "modInverse non-coprime");
ok(bigIntGcd(12n, 18n) === 6n && bigIntLcm(4n, 6n) === 12n, "gcd/lcm");

console.log("== latex ==");
const tex = (s) => latexFromAscii(s);
ok(tex("2+3*4") === "2 + 3 \\cdot 4", "tex precedence", tex("2+3*4"));
ok(tex("sqrt(81)") === "\\sqrt{81}", "tex sqrt", tex("sqrt(81)"));
ok(tex("(2+3)*4") === "\\left(2 + 3\\right) \\cdot 4", "tex parens", tex("(2+3)*4"));
ok(tex("a/b") === "\\frac{a}{b}", "tex frac", tex("a/b"));
ok(tex("x^2+2x+1") === "x^{2} + 2x + 1", "tex juxtapose", tex("x^2+2x+1"));
ok(tex("sin(x)") === "\\sin\\left(x\\right)", "tex sin", tex("sin(x)"));
ok(tex("-2^2") === "-x".replace("x", "2^{2}"), "tex unary power", tex("-2^2"));
ok(tex("(2+3)*4").includes("\\left("), "tex explicit parens kept");
ok(tex("log(1000)") === "\\log\\left(1000\\right)", "tex log", tex("log(1000)"));
ok(tex("2^-3").includes("2^{-3}"), "tex negative exp", tex("2^-3"));

console.log("== misc acceptance ==");
ok(fmt("1.5+1.5") === "3", "1.5+1.5");
ok(fmt("-5!") === "-120", "unary minus factorial");
ok(fmt("0!") === "1", "0!");
near(evalNumber("atan2(1,1)"), Math.PI / 4, 1e-12, "atan2");
near(evaluate("hypot(3,4)").re, 5, 1e-12, "hypot");
ok(fmt("min(3,1,2)") === "1" && fmt("max(3,1,2)") === "3", "min max");
ok(fmt("round(2.567, 2)") === "2.57", "round digits");
ok(fmt("floor(-1.5)") === "-2" && fmt("ceil(1.2)") === "2", "floor ceil");
ok(fmt("2%*50") === "1" || fmt("(2%)*50") === "1", "percent then multiply", fmt("2%*50"));
ok(fmt("e") === "2.71828182846", "constant e", fmt("e"));
near(evalNumber("ln(e)"), 1, 1e-12, "ln(e)");
near(evalNumber("log2(8)"), 3, 1e-12, "log2(8)");

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fails.length) console.log("FAILURES:\n- " + fails.join("\n- "));
process.exit(fails.length ? 1 : 0);
