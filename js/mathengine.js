const SUPERMAP = {
  "²": "^2", "³": "^3", "¹": "^1", "⁰": "^0", "⁴": "^4", "⁵": "^5",
  "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9", "⁻": "^-", "⁺": "^+",
  "×": "*", "·": "*", "÷": "/", "–": "-", "—": "-", "−": "-", "π": "pi",
  "√": "sqrt ", "∞": "Infinity", "θ": "theta", "φ": "phi"
};

export const FUNCTIONS = [
  { n: "sin", a: "x", d: "Sine (angle in current mode)" },
  { n: "cos", a: "x", d: "Cosine" },
  { n: "tan", a: "x", d: "Tangent" },
  { n: "asin", a: "x", d: "Inverse sine (result in current mode)" },
  { n: "acos", a: "x", d: "Inverse cosine" },
  { n: "atan", a: "x", d: "Inverse tangent" },
  { n: "atan2", a: "y, x", d: "Two-argument arctangent" },
  { n: "sinh", a: "x", d: "Hyperbolic sine" },
  { n: "cosh", a: "x", d: "Hyperbolic cosine" },
  { n: "tanh", a: "x", d: "Hyperbolic tangent" },
  { n: "ln", a: "x", d: "Natural logarithm" },
  { n: "log", a: "x, base", d: "Base-10 log (or custom base)" },
  { n: "log2", a: "x", d: "Binary logarithm" },
  { n: "log10", a: "x", d: "Base-10 logarithm" },
  { n: "exp", a: "x", d: "e^x" },
  { n: "sqrt", a: "x", d: "Square root, also written \u221ax" },
  { n: "cbrt", a: "x", d: "Real cube root" },
  { n: "root", a: "x, n", d: "n-th root of x" },
  { n: "pow", a: "x, y", d: "x to the power y" },
  { n: "mod", a: "a, b", d: "Remainder of a / b" },
  { n: "abs", a: "x", d: "Absolute value or complex modulus" },
  { n: "sign", a: "x", d: "Sign of a real number" },
  { n: "round", a: "x, digits", d: "Round to nearest (optional digits)" },
  { n: "floor", a: "x", d: "Round down" },
  { n: "ceil", a: "x", d: "Round up" },
  { n: "min", a: "a, b, ...", d: "Smallest value" },
  { n: "max", a: "a, b, ...", d: "Largest value" },
  { n: "hypot", a: "a, b, ...", d: "sqrt(a^2 + b^2 + ...)" },
  { n: "fact", a: "n", d: "Factorial, also written n!" },
  { n: "re", a: "z", d: "Real part" },
  { n: "imag", a: "z", d: "Imaginary part" },
  { n: "conj", a: "z", d: "Complex conjugate" },
  { n: "arg", a: "z", d: "Argument (phase angle)" },
  { n: "normpdf", a: "x, mu, sigma", d: "Normal density" },
  { n: "normcdf", a: "x, mu, sigma", d: "Normal cumulative probability" }
];

const FUNCTION_NAMES = new Set(FUNCTIONS.map((f) => f.n));
const ARITY = {
  atan2: [2, 2], log: [1, 2], root: [2, 2], pow: [2, 2], mod: [2, 2],
  round: [1, 2], min: [1, 99], max: [1, 99], hypot: [1, 99],
  normpdf: [1, 3], normcdf: [1, 3]
};

export const CONSTANTS = { pi: Math.PI, tau: Math.PI * 2, e: Math.E, phi: (1 + Math.sqrt(5)) / 2 };

const CX0 = { re: 0, im: 0 };
export const cx = (re, im = 0) => ({ re, im });
const isReal = (z) => z.im === 0;
const clnNum = (x) => Math.log(x);

function cadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function csub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function cmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return { re: a.re === 0 && a.im === 0 ? NaN : Infinity, im: NaN };
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function cneg(a) { return { re: -a.re, im: -a.im }; }
function cabs(a) { return isReal(a) ? Math.abs(a.re) : Math.hypot(a.re, a.im); }
function carg(a) { return Math.atan2(a.im + 0, a.re); }
function cconj(a) { return { re: a.re, im: -a.im }; }

function rationalGuess(b) {
  for (let q = 2; q <= 64; q += 1) {
    const p = b * q;
    if (Math.abs(p - Math.round(p)) < 1e-12 && Number.isInteger(Math.round(p)) && Math.round(p) !== 0) {
      return { p: Math.round(p), q };
    }
  }
  return null;
}

function cpow(a, b) {
  if (isReal(a) && isReal(b)) {
    if (b.re === 0) return { re: 1, im: 0 };
    if (a.re === 0) return b.re > 0 ? CX0 : (b.re < 0 ? { re: Infinity, im: 0 } : { re: NaN, im: 0 });
    if (Number.isInteger(b.re)) return { re: Math.pow(a.re, b.re), im: 0 };
    if (a.re < 0) {
      const r = rationalGuess(b.re);
      if (r && Math.abs(r.q % 2) === 1) {
        return { re: Math.sign(a.re) * Math.pow(Math.abs(a.re), b.re), im: 0 };
      }
    }
    const v = Math.pow(a.re, b.re);
    return { re: v, im: 0 };
  }
  if (a.re === 0 && a.im === 0) return CX0;
  return cexp(cmul(b, clnz(a)));
}

function csqrt(a) {
  if (a.im === 0 && a.re >= 0) return { re: Math.sqrt(a.re), im: 0 };
  if (a.im === 0 && a.re < 0) return { re: 0, im: Math.sqrt(-a.re) };
  const r = Math.hypot(a.re, a.im);
  const t = carg(a) / 2;
  return { re: Math.sqrt(r) * Math.cos(t), im: Math.sqrt(r) * Math.sin(t) };
}

function clnz(a) {
  if (a.im === 0 && a.re > 0) return { re: clnNum(a.re), im: 0 };
  return { re: clnNum(Math.hypot(a.re, a.im)), im: carg(a) };
}

function cexp(a) {
  if (a.im === 0) return { re: Math.exp(a.re), im: 0 };
  const e = Math.exp(a.re);
  return { re: e * Math.cos(a.im), im: e * Math.sin(a.im) };
}

function csin(a) {
  if (a.im === 0) return { re: Math.sin(a.re), im: 0 };
  return { re: Math.sin(a.re) * Math.cosh(a.im), im: Math.cos(a.re) * Math.sinh(a.im) };
}
function ccos(a) {
  if (a.im === 0) return { re: Math.cos(a.re), im: 0 };
  return { re: Math.cos(a.re) * Math.cosh(a.im), im: -Math.sin(a.re) * Math.sinh(a.im) };
}
function ctan(a) { return cdiv(csin(a), ccos(a)); }
function csinh(a) {
  if (a.im === 0) return { re: Math.sinh(a.re), im: 0 };
  return { re: Math.sinh(a.re) * Math.cos(a.im), im: Math.cosh(a.re) * Math.sin(a.im) };
}
function ccosh(a) {
  if (a.im === 0) return { re: Math.cosh(a.re), im: 0 };
  return { re: Math.cosh(a.re) * Math.cos(a.im), im: Math.sinh(a.re) * Math.sin(a.im) };
}
function ctanh(a) { return cdiv(csinh(a), ccosh(a)); }
function casinz(a) {
  const iz = { re: -a.im, im: a.re };
  const inside = csub(CX1, cmul(a, a));
  return cmul({ re: 0, im: -1 }, clnz(cadd(iz, csqrt(inside))));
}
const CX1 = { re: 1, im: 0 };
function cacosz(a) { return csub({ re: Math.PI / 2, im: 0 }, casinz(a)); }
function catanz(a) {
  const iz = { re: -a.im, im: a.re };
  const t1 = clnz(csub(CX1, iz));
  const t2 = clnz(cadd(CX1, iz));
  return cmul({ re: 0, im: 0.5 }, csub(t1, t2));
}

const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
];

function cgammapos(w) {
  let x = cx(LANCZOS_C[0], 0);
  for (let i = 1; i < LANCZOS_G + 2; i += 1) x = cadd(x, cdiv(cx(LANCZOS_C[i], 0), cadd(w, cx(i, 0))));
  const t = cadd(w, cx(LANCZOS_G + 0.5, 0));
  const exponent = csub(cmul(csub(t, cx(LANCZOS_G, 0)), clnz(t)), t);
  const base = cmul(csqrt({ re: 2 * Math.PI, im: 0 }), cexp(exponent));
  return cmul(base, x);
}

function cgamma(z) {
  if (isReal(z) && Number.isInteger(z.re) && z.re > 0 && z.re < 171) {
    let out = 1;
    for (let i = 2; i < z.re; i += 1) out *= i;
    return { re: out, im: 0 };
  }
  if (z.re < 0.5) {
    const num = { re: Math.PI, im: 0 };
    const den = cmul(csin({ re: Math.PI * z.re, im: Math.PI * z.im }), cgammapos(cneg(z)));
    return cdiv(num, den);
  }
  return cgammapos(csub(z, CX1));
}

function cfact(a) {
  if (isReal(a) && Number.isInteger(a.re)) {
    if (a.re < 0) throw new Error("Factorial needs a non-negative number");
    if (a.re > 170) return { re: Infinity, im: 0 };
    let out = 1;
    for (let i = 2; i <= a.re; i += 1) out *= i;
    return { re: out, im: 0 };
  }
  if (isReal(a) && a.re < 0 && Number.isInteger(a.re)) throw new Error("Factorial needs a non-negative number");
  return cgamma(cadd(a, CX1));
}

function cerf(x) {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function normalize(source) {
  let out = "";
  for (const ch of source) out += Object.prototype.hasOwnProperty.call(SUPERMAP, ch) ? SUPERMAP[ch] : ch;
  return out;
}

function tokenize(source) {
  const tokens = [];
  const s = normalize(source);
  const isDigit = (c) => c >= "0" && c <= "9";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i += 1; continue; }
    if (isDigit(c) || (c === "." && isDigit(s[i + 1]))) {
      let j = i;
      while (j < s.length && (isDigit(s[j]) || s[j] === ".")) j += 1;
      if (s[j] === "e" || s[j] === "E") {
        let k = j + 1;
        if (s[k] === "+" || s[k] === "-") k += 1;
        if (isDigit(s[k])) {
          while (k < s.length && isDigit(s[k])) k += 1;
          j = k;
        }
      }
      const raw = s.slice(i, j);
      if (!/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) throw new Error(`Invalid number "${raw}"`);
      tokens.push({ type: "num", value: Number(raw) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j += 1;
      tokens.push({ type: "name", value: s.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ("+-*/^%(),!=".includes(c)) {
      tokens.push({ type: "op", value: c });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return tokens;
}

export function parse(source, options = {}) {
  const tokens = tokenize(source);
  const allowEquation = Boolean(options.allowEquation);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const startsPrimary = (t) => t && (t.type === "num" || t.type === "name" || t.value === "(");

  function parsePrimary() {
    const token = next();
    if (!token) throw new Error("Incomplete expression");
    if (token.type === "num") return { k: "num", v: token.value };
    if (token.value === "(") {
      const expr = parseExpression();
      const close = next();
      if (!close || close.value !== ")") throw new Error('Missing ")"');
      return expr;
    }
    if (token.type === "name") {
      if (peek() && peek().value === "(") {
        next();
        const args = [];
        if (peek() && peek().value !== ")") {
          args.push(parseExpression());
          while (peek() && peek().value === ",") {
            next();
            args.push(parseExpression());
          }
        }
        const close = next();
        if (!close || close.value !== ")") throw new Error('Missing ")"');
        return { k: "call", id: token.value, args };
      }
      if (token.value === "sqrt") return { k: "call", id: "sqrt", args: [parsePostfix()] };
      return { k: "name", id: token.value };
    }
    throw new Error(`Unexpected "${token.value}"`);
  }

  function parsePostfix() {
    let node = parsePrimary();
    while (peek() && peek().value === "!") { next(); node = { k: "post", op: "!", x: node }; }
    while (peek() && peek().value === "%") { next(); node = { k: "post", op: "%", x: node }; }
    return node;
  }

  function parsePower() {
    const base = parsePostfix();
    if (peek() && peek().value === "^") {
      next();
      return { k: "bin", op: "^", l: base, r: parseUnary() };
    }
    return base;
  }

  function parseUnary() {
    const token = peek();
    if (token && (token.value === "+" || token.value === "-")) {
      next();
      return { k: "un", op: token.value, x: parseUnary() };
    }
    return parsePower();
  }

  function parseTerm() {
    let left = parseUnary();
    while (peek()) {
      const token = peek();
      if (token.value === "*" || token.value === "/") {
        next();
        left = { k: "bin", op: token.value, l: left, r: parseUnary() };
      } else if (startsPrimary(token)) {
        left = { k: "bin", op: "*", l: left, r: parseUnary(), imp: true };
      } else {
        break;
      }
    }
    return left;
  }

  function parseExpression() {
    let left = parseTerm();
    while (peek() && (peek().value === "+" || peek().value === "-")) {
      const op = next().value;
      left = { k: "bin", op, l: left, r: parseTerm() };
    }
    return left;
  }

  const expr = parseExpression();
  if (allowEquation && peek() && peek().value === "=") {
    next();
    return { k: "eq", l: expr, r: parseExpression() };
  }
  if (pos !== tokens.length) throw new Error(`Unexpected "${tokens[pos].value}"`);
  return expr;
}

function lookupName(node, env) {
  if (node.id === "ans") {
    if (env.ans && typeof env.ans === "object" && "re" in env.ans) return env.ans;
    if (typeof env.ans === "number") return cx(env.ans, 0);
    return CX0;
  }
  if (node.id === "i") return cx(0, 1);
  if (env.vars && Object.prototype.hasOwnProperty.call(env.vars, node.id)) {
    const v = env.vars[node.id];
    return typeof v === "object" && v !== null && "re" in v ? v : cx(Number(v), 0);
  }
  if (Object.prototype.hasOwnProperty.call(CONSTANTS, node.id)) return cx(CONSTANTS[node.id], 0);
  throw new Error(`Unknown name "${node.id}"`);
}

function requireReal(z, what) {
  if (z.im !== 0) throw new Error(`${what} needs a real number`);
  return z.re;
}

function applyFunction(name, args, env) {
  const a = args[0];
  const b = args[1];
  const toRad = (x) => (env.deg ? (x * Math.PI) / 180 : x);
  const fromRad = (x) => (env.deg ? (x * 180) / Math.PI : x);
  const arity = ARITY[name];
  if (arity && (args.length < arity[0] || args.length > arity[1])) {
    throw new Error(`${name} takes ${arity[0] === arity[1] ? arity[0] : arity[0] + "-" + arity[1]} argument(s), got ${args.length}`);
  }
  if (!arity && args.length !== 1) throw new Error(`${name} takes 1 argument, got ${args.length}`);
  switch (name) {
    case "sin": return env.deg ? csin(cx(toRad(a.re), toRad(a.im))) : csin(a);
    case "cos": return env.deg ? ccos(cx(toRad(a.re), toRad(a.im))) : ccos(a);
    case "tan": return env.deg ? ctan(cx(toRad(a.re), toRad(a.im))) : ctan(a);
    case "asin": case "arcsin": { const z = casinz(a); return env.deg ? cx(fromRad(z.re), fromRad(z.im)) : z; }
    case "acos": case "arccos": { const z = cacosz(a); return env.deg ? cx(fromRad(z.re), fromRad(z.im)) : z; }
    case "atan": case "arctan": { const z = catanz(a); return env.deg ? cx(fromRad(z.re), fromRad(z.im)) : z; }
    case "atan2": return cx(fromRad(Math.atan2(requireReal(a, "atan2"), requireReal(b, "atan2"))), 0);
    case "sinh": return csinh(a);
    case "cosh": return ccosh(a);
    case "tanh": return ctanh(a);
    case "ln": return clnz(a);
    case "log": return b ? cdiv(clnz(a), clnz(b)) : (isReal(a) && a.re > 0 ? cx(clnNum(a.re) / Math.LN10, 0) : cdiv(clnz(a), cx(Math.LN10, 0)));
    case "log2": return cdiv(clnz(a), cx(Math.LN2, 0));
    case "log10": return cdiv(clnz(a), cx(Math.LN10, 0));
    case "exp": return cexp(a);
    case "sqrt": return csqrt(a);
    case "cbrt": return isReal(a) ? cx(Math.cbrt(a.re), 0) : cpow(a, cx(1 / 3, 0));
    case "root": return cpow(a, cdiv(CX1, b));
    case "pow": return cpow(a, b);
    case "mod": return cx(((requireReal(a, "mod") % requireReal(b, "mod")) + requireReal(b, "mod")) % requireReal(b, "mod"), 0);
    case "abs": return cx(cabs(a), 0);
    case "sign": return cx(Math.sign(requireReal(a, "sign")), 0);
    case "round": {
      const d = b ? requireReal(b, "round") : 0;
      const f = 10 ** d;
      return cx(Math.round(requireReal(a, "round") * f) / f, 0);
    }
    case "floor": return cx(Math.floor(requireReal(a, "floor")), 0);
    case "ceil": return cx(Math.ceil(requireReal(a, "ceil")), 0);
    case "min": case "max": {
      const nums = args.map((z) => requireReal(z, name));
      return cx(name === "min" ? Math.min(...nums) : Math.max(...nums), 0);
    }
    case "hypot": return cx(Math.hypot(...args.map((z) => requireReal(z, "hypot"))), 0);
    case "fact": case "factorial": return cfact(a);
    case "re": return cx(a.re, 0);
    case "imag": return cx(a.im, 0);
    case "conj": return cconj(a);
    case "arg": return cx(fromRad(carg(a)), 0);
    case "normpdf": {
      const mean = args.length > 1 ? b.re : 0;
      const sd = args.length > 2 ? args[2].re : 1;
      const x = requireReal(a, "normpdf");
      return cx(Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)), 0);
    }
    case "normcdf": {
      const mean = args.length > 1 ? b.re : 0;
      const sd = args.length > 2 ? args[2].re : 1;
      const x = requireReal(a, "normcdf");
      return cx(0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2))), 0);
    }
    default: throw new Error(`Unknown function "${name}"`);
  }
}

export function evalNode(node, env) {
  switch (node.k) {
    case "num": return cx(node.v, 0);
    case "name": return lookupName(node, env);
    case "call": {
      if (!FUNCTION_NAMES.has(node.id) && node.id !== "arcsin" && node.id !== "arccos" && node.id !== "arctan" && node.id !== "factorial") {
        throw new Error(`Unknown function "${node.id}"`);
      }
      return applyFunction(node.id, node.args.map((arg) => evalNode(arg, env)), env);
    }
    case "un": {
      const v = evalNode(node.x, env);
      return node.op === "-" ? cneg(v) : v;
    }
    case "post": {
      const v = evalNode(node.x, env);
      if (node.op === "!") return cfact(v);
      if (isReal(v)) return cx(v.re / 100, 0);
      throw new Error("% needs a real number");
    }
    case "bin": {
      const l = evalNode(node.l, env);
      const r = evalNode(node.r, env);
      switch (node.op) {
        case "+": return cadd(l, r);
        case "-": return csub(l, r);
        case "*": return cmul(l, r);
        case "/": return cdiv(l, r);
        case "^": return cpow(l, r);
        default: throw new Error(`Unknown operator "${node.op}"`);
      }
    }
    case "eq": throw new Error("Unexpected \"=\"");
    default: throw new Error("Invalid expression");
  }
}

export function evaluate(source, env = {}) {
  const node = parse(source);
  return evalNode(node, { deg: false, vars: {}, ...env });
}

export function evalNumber(source, env = {}) {
  const z = evaluate(source, env);
  return z.im === 0 ? z.re : NaN;
}

export function gamma(z) { return cgamma(z); }
export function factorial(z) { return cfact(z); }

export function formatNumber(value, precision = "auto") {
  if (Number.isNaN(value)) return "undefined";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";
  if (Object.is(value, -0)) value = 0;
  const abs = Math.abs(value);
  let out;
  if (precision !== "auto") {
    const digits = Number(precision);
    out = Number(value.toPrecision(digits)).toString();
  } else if (abs !== 0 && (abs >= 1e15 || abs < 1e-6)) {
    out = value.toExponential(11);
  } else {
    const rounded = Number(value.toPrecision(12));
    out = String(rounded);
  }
  if (out.includes("e")) {
    const [m, ex] = out.split("e");
    const mant = m.includes(".") ? m.replace(/\.?0+$/, "") : m;
    return `${mant}e${ex}`;
  }
  return out;
}

export function formatComplex(z, precision = "auto") {
  const clean = (x) => (Math.abs(x) < 1e-14 ? 0 : x);
  const re = clean(z.re);
  const im = clean(z.im);
  if (im === 0) return formatNumber(re, precision);
  if (re === 0) {
    if (im === 1) return "i";
    if (im === -1) return "-i";
    return `${formatNumber(im, precision)}i`;
  }
  const imStr = im > 0 ? `+ ${formatNumber(im, precision)}i` : `- ${formatNumber(-im, precision)}i`;
  if (formatNumber(im, precision) === "1" || formatNumber(im, precision) === "-1") {
    const sign = im > 0 ? "+" : "-";
    return `${formatNumber(re, precision)} ${sign} i`;
  }
  return `${formatNumber(re, precision)} ${imStr}`;
}

export function formatValue(z, precision = "auto") {
  return formatComplex(z, precision);
}

function pTrim(p, tol = 0) {
  let max = 0;
  for (const c of p) max = Math.max(max, Math.abs(c));
  const limit = tol > 0 ? tol * (max || 1) : 0;
  let i = p.length - 1;
  while (i > 0 && Math.abs(p[i]) <= limit) { p.pop(); i -= 1; }
  return p.length ? p : [0];
}
function pDeg(p) { return pTrim(p.slice()).length - 1; }
function pNorm(p) { let s = 0; for (const c of p) s += Math.abs(c); return s; }
function pAdd(a, b) {
  const out = new Array(Math.max(a.length, b.length)).fill(0);
  for (let i = 0; i < out.length; i += 1) out[i] = (a[i] || 0) + (b[i] || 0);
  if (pDeg(out) > POLY_MAX) throw new Error(`Degree above ${POLY_MAX} is not supported`);
  return pTrim(out);
}
function pSub(a, b) {
  const out = new Array(Math.max(a.length, b.length)).fill(0);
  for (let i = 0; i < out.length; i += 1) out[i] = (a[i] || 0) - (b[i] || 0);
  return pTrim(out);
}
function pMul(a, b) {
  const degA = pDeg(a), degB = pDeg(b);
  if (degA + degB > POLY_MAX) throw new Error(`Degree above ${POLY_MAX} is not supported`);
  const out = new Array(degA + degB + 1).fill(0);
  for (let i = 0; i <= degA; i += 1) {
    if (a[i] === 0) continue;
    for (let j = 0; j <= degB; j += 1) out[i + j] += a[i] * b[j];
  }
  return pTrim(out);
}
function pScale(a, k) { return pTrim(a.map((c) => c * k)); }
function pDeriv(a) {
  if (a.length <= 1) return [0];
  return pTrim(a.slice(1).map((c, i) => c * (i + 1)));
}
function pEvalR(p, x) { let v = 0; for (let i = p.length - 1; i >= 0; i -= 1) v = v * x + p[i]; return v; }
const toC = (v) => (typeof v === "object" && v !== null && "re" in v) ? v : cx(v, 0);
function pEvalC(p, z) {
  let v = cx(0, 0);
  for (let i = p.length - 1; i >= 0; i -= 1) v = cadd(cmul(v, z), toC(p[i]));
  return v;
}
function pMonic(p) {
  const d = pDeg(p);
  if (d < 0) return [0];
  const lead = p[d];
  if (lead === 0) return [0];
  return p.map((c) => c / lead);
}
function pDivMod(a, b) {
  const db = pDeg(b);
  if (db < 0) throw new Error("Division by zero polynomial");
  let r = a.slice();
  const da = pDeg(r);
  if (da < db) return { q: [0], r };
  const q = new Array(da - db + 1).fill(0);
  for (let i = da - db; i >= 0; i -= 1) {
    const coeff = (r[i + db] || 0) / b[db];
    q[i] = coeff;
    if (coeff === 0) continue;
    for (let j = 0; j <= db; j += 1) r[i + j] -= coeff * b[j];
  }
  return { q: pTrim(q), r: pTrim(r) };
}
function pGcd(a, b) {
  let x = pMonic(pTrim(a.slice()));
  let y = pMonic(pTrim(b.slice()));
  const maxNorm = Math.max(pNorm(x), pNorm(y), 1);
  for (let iter = 0; iter < 64 && pDeg(y) > 0; iter += 1) {
    const { r } = pDivMod(x, y);
    const rNorm = pNorm(r);
    if (rNorm <= 1e-11 * maxNorm) break;
    x = y;
    y = pMonic(r);
  }
  return pDeg(y) > 0 ? y : [1];
}
function pDivLinearC(p, root) {
  const n = p.length;
  if (n <= 1) return { q: [cx(0, 0)], r: p[0] ? toC(p[0]) : cx(0, 0) };
  const q = new Array(n - 1);
  q[n - 2] = toC(p[n - 1]);
  for (let i = n - 2; i >= 1; i -= 1) q[i - 1] = cadd(toC(p[i]), cmul(root, q[i]));
  const r = cadd(toC(p[0]), cmul(root, q[0]));
  return { q, r };
}

const POLY_MAX = 60;

function evalPolyNode(node, varName) {
  switch (node.k) {
    case "num": return [node.v];
    case "name": {
      if (node.id === varName) return [0, 1];
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, node.id)) return [CONSTANTS[node.id]];
      throw new Error(`"${node.id}" is not allowed here — use numbers and ${varName} only`);
    }
    case "call": {
      const args = node.args.map((arg) => evalPolyNode(arg, varName));
      for (const a of args) {
        if (pDeg(a) > 0) throw new Error(`Function "${node.id}" of ${varName} is not a polynomial`);
      }
      const value = evalNode(node, { deg: false, vars: { [varName]: 0 } });
      if (value.im !== 0) throw new Error("Polynomial must have real coefficients");
      return [value.re];
    }
    case "un": {
      const p = evalPolyNode(node.x, varName);
      return node.op === "-" ? pScale(p, -1) : p;
    }
    case "post": {
      const p = evalPolyNode(node.x, varName);
      if (node.op === "%") return pScale(p, 0.01);
      if (pDeg(p) > 0) throw new Error("Factorial is not a polynomial operation");
      return [evalNode(node, { deg: false, vars: { [varName]: 0 } }).re];
    }
    case "bin": {
      const a = evalPolyNode(node.l, varName);
      const b = evalPolyNode(node.r, varName);
      switch (node.op) {
        case "+": return pAdd(a, b);
        case "-": return pSub(a, b);
        case "*": return pMul(a, b);
        case "/": {
          if (pDeg(b) > 0) throw new Error(`Division by an expression with ${varName} is not a polynomial`);
          if (b[0] === 0) throw new Error("Division by zero");
          return pScale(a, 1 / b[0]);
        }
        case "^": {
          if (pDeg(b) > 0) throw new Error(`Exponent may not contain ${varName}`);
          const e = b[0];
          if (!Number.isInteger(e) || e < 0) throw new Error("Polynomial exponents must be whole numbers");
          if (e === 0) return [1];
          if (e === 1) return a;
          let out = [1];
          for (let i = 0; i < e; i += 1) out = pMul(out, a);
          if (pDeg(out) > POLY_MAX) throw new Error(`Degree above ${POLY_MAX} is not supported`);
          return out;
        }
        default: throw new Error(`Unknown operator "${node.op}"`);
      }
    }
    default: throw new Error("Only polynomial expressions are supported");
  }
}

function formatPoly(p, varName = "x") {
  const parts = [];
  const d = pDeg(p);
  if (d < 0) return "0";
  for (let i = d; i >= 0; i -= 1) {
    const c = p[i];
    if (Math.abs(c) < 1e-14) continue;
    const abs = Math.abs(c);
    let term;
    if (i === 0) term = formatNumber(c);
    else if (abs === 1 && c < 0) term = `-${varName}${i > 1 ? `^${i}` : ""}`;
    else if (abs === 1) term = `${varName}${i > 1 ? `^${i}` : ""}`;
    else term = `${formatNumber(c)}${varName}${i > 1 ? `^${i}` : ""}`;
    parts.push(term);
  }
  return parts.join(" + ").replace(/\+ -/g, "- ") || "0";
}

function durandKerner(p, seedPhase = 0, seedScale = 1) {
  const monic = pMonic(p);
  const n = pDeg(monic);
  if (n < 1) return [];
  const lead = monic[n];
  let maxRatio = 1;
  for (let i = 0; i < n; i += 1) maxRatio = Math.max(maxRatio, Math.abs(monic[i] / lead));
  const R = seedScale * (1 + maxRatio);
  let roots = [];
  for (let k = 0; k < n; k += 1) {
    const angle = (2 * Math.PI * k) / n + seedPhase;
    roots.push({ re: R * Math.cos(angle), im: R * Math.sin(angle) });
  }
  let converged = false;
  let maxDelta = Infinity;
  let iterUsed = 0;
  for (let iter = 0; iter < 1000; iter += 1) {
    iterUsed = iter + 1;
    maxDelta = 0;
    for (let k = 0; k < n; k += 1) {
      const num = pEvalC(monic, roots[k]);
      let den = cx(1, 0);
      for (let j = 0; j < n; j += 1) if (j !== k) den = cmul(den, csub(roots[k], roots[j]));
      if (Math.hypot(den.re, den.im) < 1e-300) { maxDelta = NaN; break; }
      const dz = cdiv(num, den);
      roots[k] = csub(roots[k], dz);
      const step = Math.hypot(dz.re, dz.im);
      if (!Number.isFinite(roots[k].re) || !Number.isFinite(roots[k].im)) { maxDelta = NaN; break; }
      maxDelta = Math.max(maxDelta, step);
    }
    if (!Number.isFinite(maxDelta)) break;
    if (maxDelta < 1e-14) { converged = true; break; }
  }
  if (!Number.isFinite(maxDelta) || (!converged && maxDelta > 1e-8)) return null;
  return { roots, iterations: iterUsed, converged, finalDelta: maxDelta };
}

function clusterRoots(roots, tol = 1e-7) {
  const groups = [];
  for (const r of roots) {
    let placed = false;
    for (const g of groups) {
      if (Math.hypot(g.re - r.re, g.im - r.im) <= tol * (1 + Math.max(Math.hypot(g.re, g.im), Math.hypot(r.re, r.im)))) {
        g.re = (g.re + r.re) / 2;
        g.im = (g.im + r.im) / 2;
        g.count += 1;
        placed = true;
        break;
      }
    }
    if (!placed) groups.push({ re: r.re, im: r.im, count: 1 });
  }
  return groups;
}

function multiplicityOf(p, root) {
  const scale = (() => { let s = 0; for (let i = 0; i < p.length; i += 1) s += Math.abs(p[i]) * Math.max(1, Math.pow(Math.hypot(root.re, root.im), i)); return s || 1; })();
  let cur = p.map((c) => cx(c, 0));
  let m = 0;
  while (m < 50) {
    const val = pEvalC(cur, root);
    if (Math.hypot(val.re, val.im) > 1e-7 * scale) break;
    const { q } = pDivLinearC(cur, root);
    cur = q;
    m += 1;
    const hasNonZero = cur.some((z) => Math.hypot(z.re, z.im) > 1e-14 * scale);
    if (!hasNonZero) break;
    if (cur.length <= 1) break;
  }
  return Math.max(m, 1);
}

export function solvePolynomial(coefficients, options = {}) {
  const input = options.input || "";
  const varName = options.varName || "x";
  const p = pTrim(coefficients.slice());
  const d = pDeg(p);
  const steps = [];
  if (d < 0 || (d === 0 && p[0] === 0)) {
    return { degree: 0, coefficients: p, roots: [], type: "all", exact: true, method: "degenerate", steps: [`${input || "0"} = 0 is true for every ${varName}`], ok: true, maxResidual: 0 };
  }
  if (d === 0) {
    return { degree: 0, coefficients: p, roots: [], type: "none", exact: true, method: "degenerate", steps: [`${formatPoly(p, varName)} = 0 has no solution (a non-zero constant never equals zero)`], ok: true, maxResidual: 0 };
  }
  steps.push(`Polynomial: ${input || formatPoly(p, varName)} — degree ${d}, leading coefficient ${formatNumber(p[d])}`);
  let roots = [];
  let method = "durand-kerner";
  let exact = false;
  if (d === 1) {
    method = "linear";
    exact = true;
    const r = { re: -p[0] / p[1], im: 0 };
    roots = [r];
    steps.push(`Linear form: ${formatNumber(p[1])}${varName} + ${formatNumber(p[0])} = 0`);
    steps.push(`Solve: ${varName} = -${formatNumber(p[0])} / ${formatNumber(p[1])} = ${formatNumber(r.re)}`);
  } else if (d === 2) {
    method = "quadratic";
    exact = true;
    const [c, b, a] = [p[0], p[1], p[2]];
    const disc = b * b - 4 * a * c;
    steps.push(`Standard form: ${formatNumber(a)}${varName}^2 + ${formatNumber(b)}${varName} + ${formatNumber(c)} = 0`);
    steps.push(`Discriminant: b^2 - 4ac = (${formatNumber(b)})^2 - 4·${formatNumber(a)}·${formatNumber(c)} = ${formatNumber(disc)}`);
    if (disc > 0) {
      const s = Math.sqrt(disc);
      roots = [{ re: (-b + s) / (2 * a), im: 0 }, { re: (-b - s) / (2 * a), im: 0 }];
      steps.push(`Two real roots: (-b \u00b1 \u221a\u0394) / 2a \u2192 ${formatNumber(roots[0].re)}, ${formatNumber(roots[1].re)}`);
    } else if (disc === 0) {
      roots = [{ re: -b / (2 * a), im: 0 }];
      steps.push(`\u0394 = 0 \u2192 one repeated root: ${varName} = -b / 2a = ${formatNumber(roots[0].re)} (multiplicity 2)`);
    } else {
      const re = -b / (2 * a);
      const im = Math.sqrt(-disc) / (2 * a);
      roots = [{ re, im: Math.abs(im) }, { re, im: -Math.abs(im) }];
      steps.push(`\u0394 < 0 \u2192 complex conjugate pair: ${formatNumber(re)} \u00b1 ${formatNumber(Math.abs(im))}i`);
    }
  } else {
    const deriv = pDeriv(p);
    const g = pGcd(p, deriv);
    const gd = pDeg(g);
    let target = p;
    if (gd > 0) {
      const { q } = pDivMod(p, g);
      target = q;
      steps.push(`Repeated roots detected: gcd(p, p\u2032) has degree ${gd} — solving the square-free part ${formatPoly(target, varName)}`);
    } else {
      steps.push(`gcd(p, p\u2032) = 1 \u2192 all roots are simple (multiplicity 1)`);
    }
    const dk = durandKerner(target) || durandKerner(target, Math.PI / Math.max(1, pDeg(target)), 2) || durandKerner(target, 1.1, 0.5);
    if (!dk) {
      steps.push("Durand-Kerner did not converge for this input — results below may be incomplete");
      return { degree: d, coefficients: p, roots: [], type: "unknown", exact: false, method, steps, ok: false, maxResidual: NaN };
    }
    roots = dk.roots.slice();
    steps.push(`Durand-Kerner iteration on degree ${pDeg(target)} target \u2192 ${roots.length} candidate root${roots.length === 1 ? "" : "s"} (max step ${dk.finalDelta.toExponential(2)})`);
    method = "durand-kerner";
    exact = false;
  }
  roots = clusterRoots(roots).map((gr) => ({ re: gr.re, im: Math.abs(gr.im) < 1e-12 ? 0 : gr.im }));
  for (const r of roots) r.mult = multiplicityOf(p, r);
  roots.sort((a, b) => (Math.abs(a.re - b.re) > 1e-9 ? a.re - b.re : a.im - b.im));
  let maxResidual = 0;
  const scale = pNorm(p) || 1;
  for (const r of roots) {
    const v = pEvalC(p, cx(r.re, r.im));
    maxResidual = Math.max(maxResidual, Math.hypot(v.re, v.im) / scale);
  }
  const allReal = roots.every((r) => r.im === 0);
  const totalMult = roots.reduce((s, r) => s + r.mult, 0);
  steps.push(`Verification: max |p(r)| / \u2016p\u2016 = ${maxResidual.toExponential(2)} ${maxResidual < 1e-8 ? "\u2713" : "\u26a0"}`);
  steps.push(allReal ? `${roots.length} real root(s), total multiplicity ${totalMult}` : `Complex roots occur in conjugate pairs; ${roots.length} distinct root(s), total multiplicity ${totalMult}`);
  return { degree: d, coefficients: p, roots, type: roots.length ? "ok" : "none", exact, method, steps, ok: true, maxResidual, allReal };
}

export function solvePolynomialExpression(input, options = {}) {
  const varName = options.varName || "x";
  const node = parse(input, { allowEquation: true });
  let left = node;
  let right = null;
  if (node.k === "eq") { left = node.l; right = node.r; }
  let coeffs = evalPolyNode(left, varName);
  if (right) coeffs = pSub(coeffs, evalPolyNode(right, varName));
  const result = solvePolynomial(coeffs, { input: input.includes("=") ? input : `${input} = 0`, varName });
  return result;
}

function bigAbs(x) { return x < 0n ? -x : x; }
function bigGcd(a, b) {
  let x = bigAbs(a), y = bigAbs(b);
  while (y) { const t = x % y; x = y; y = t; }
  return x || 1n;
}
function rat(n, d = 1n) {
  if (typeof n === "number") n = BigInt(Math.round(n));
  if (typeof d === "number") d = BigInt(Math.round(d));
  if (d === 0n) throw new Error("Division by zero");
  if (d < 0n) { n = -n; d = -d; }
  const g = bigGcd(n, d);
  return { n: n / g, d: d / g };
}
function ratFromNumber(x) {
  if (!Number.isFinite(x)) throw new Error("Cannot represent an infinite coefficient");
  const snapped = Number(x.toPrecision(12));
  if (Number.isFinite(snapped) && Math.abs(snapped - x) <= 1e-11 * Math.max(1, Math.abs(x))) x = snapped;
  if (Number.isInteger(x)) return rat(BigInt(x), 1n);
  const s = String(x);
  if (/e/i.test(s)) {
    let [mant, expStr] = s.split(/e/i);
    const exp = Number(expStr);
    let [intPart, fracPart = ""] = mant.split(".");
    if (intPart.startsWith("-")) { intPart = intPart.slice(1); mant = mant.replace("-", ""); }
    const digits = mant.replace("-", "").replace(".", "");
    const fracLen = fracPart.length;
    const denomExp = fracLen - exp;
    const num = BigInt(digits);
    return rat(mant.startsWith("-") ? -num : num, denomExp >= 0 ? 10n ** BigInt(denomExp) : 1n);
  }
  if (!s.includes(".")) return rat(BigInt(x), 1n);
  const [iPart, fPart = ""] = s.split(".");
  const num = BigInt((iPart + fPart).replace("-", ""));
  const r = rat(iPart.startsWith("-") ? -num : num, 10n ** BigInt(fPart.length));
  void r;
  return rat(iPart.startsWith("-") ? -num : num, 10n ** BigInt(fPart.length));
}
const rAdd = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const rSub = (a, b) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
const rMul = (a, b) => rat(a.n * b.n, a.d * b.d);
const rDiv = (a, b) => rat(a.n * b.d, a.d * b.n);
const rIsZero = (a) => a.n === 0n;
const rToNumber = (a) => Number(a.n) / Number(a.d);
function rToString(a) {
  if (a.d === 1n) return String(a.n);
  if (a.d > 1000000n || bigAbs(a.n) > 1000000000000n) return formatNumber(rToNumber(a));
  return `${a.n}/${a.d}`;
}

function walkNames(node, out) {
  if (!node || typeof node !== "object") return out;
  if (node.k === "name") {
    if (!CONSTANTS[node.id] && node.id !== "ans" && node.id !== "i" && !out.includes(node.id)) out.push(node.id);
  }
  for (const key of ["l", "r", "x"]) if (node[key]) walkNames(node[key], out);
  if (node.args) for (const a of node.args) walkNames(a, out);
  return out;
}

const rNeg = (a) => rat(-a.n, a.d);

function evalAffine(node, varSet) {
  const empty = () => ({ c: rat(0n) });
  const put = (m, k, v) => { if (k === "c") m.c = rAdd(m.c, v); else m[k] = rAdd(m[k] || rat(0n), v); };
  switch (node.k) {
    case "num": return { c: ratFromNumber(node.v) };
    case "name": {
      if (node.id === "ans") return { c: rat(0n) };
      if (node.id === "i") throw new Error("Imaginary unit i is not allowed in linear systems — use x, y, z");
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, node.id)) return { c: ratFromNumber(CONSTANTS[node.id]) };
      if (varSet.has(node.id)) { const m = empty(); m[node.id] = rat(1n); return m; }
      throw new Error(`Unknown name "${node.id}"`);
    }
    case "call": {
      const args = node.args.map((a) => evalAffine(a, varSet));
      for (const a of args) if (Object.keys(a).some((k) => k !== "c")) throw new Error(`Function "${node.id}" may only be applied to constants in a linear system`);
      const value = evalNode(node, { deg: false, vars: {} });
      if (value.im !== 0) throw new Error("Linear systems need real coefficients");
      return { c: ratFromNumber(value.re) };
    }
    case "un": {
      const m = evalAffine(node.x, varSet);
      const out = empty();
      for (const k of Object.keys(m)) out[k] = rNeg(m[k]);
      return out;
    }
    case "post": {
      const m = evalAffine(node.x, varSet);
      if (node.op === "%") {
        const out = empty();
        for (const k of Object.keys(m)) out[k] = rDiv(m[k], rat(100n));
        return out;
      }
      if (Object.keys(m).some((k) => k !== "c")) throw new Error("Factorial is not linear");
      return { c: ratFromNumber(evalNode(node, { deg: false, vars: {} }).re) };
    }
    case "bin": {
      const a = evalAffine(node.l, varSet);
      const b = evalAffine(node.r, varSet);
      const isConst = (m) => Object.keys(m).every((k) => k === "c");
      if (node.op === "+" || node.op === "-") {
        const out = empty();
        for (const k of Object.keys(a)) put(out, k, a[k]);
        for (const k of Object.keys(b)) put(out, k, node.op === "+" ? b[k] : rNeg(b[k]));
        return out;
      }
      if (node.op === "*") {
        if (isConst(b)) { const out = empty(); for (const k of Object.keys(a)) out[k] = rMul(a[k], b.c); return out; }
        if (isConst(a)) { const out = empty(); for (const k of Object.keys(b)) out[k] = rMul(b[k], a.c); return out; }
        throw new Error("Only linear terms (variable \u00d7 constant) are allowed");
      }
      if (node.op === "/") {
        if (!isConst(b)) throw new Error("Division is only allowed by constants");
        if (rIsZero(b.c)) throw new Error("Division by zero");
        const out = empty();
        for (const k of Object.keys(a)) out[k] = rDiv(a[k], b.c);
        return out;
      }
      if (node.op === "^") {
        if (!isConst(a)) {
          if (isConst(b) && b.c.n === 1n && b.c.d === 1n && Object.keys(a).filter((k) => k !== "c").length <= 1) return a;
          throw new Error("Only linear powers are allowed (e.g. x^1)");
        }
        if (!isConst(b)) throw new Error("Exponent may not contain variables");
        return { c: ratFromNumber(evalNode(node, { deg: false, vars: {} }).re) };
      }
      throw new Error(`Unknown operator "${node.op}"`);
    }
    default: throw new Error("Only linear equations are supported here — try the Polynomial tab for higher degrees");
  }
}

export function parseSystemText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
  if (!lines.length) throw new Error("Enter at least one equation");
  const parsed = lines.map((line) => parse(line, { allowEquation: true }));
  for (let i = 0; i < parsed.length; i += 1) if (parsed[i].k !== "eq") throw new Error(`Each equation needs "=" — got "${lines[i]}"`);
  const varSet = new Set();
  const order = [];
  for (const p of parsed) {
    for (const name of walkNames(p, [])) {
      if (!varSet.has(name)) { varSet.add(name); order.push(name); }
    }
  }
  if (!order.length) throw new Error("No variables found — enter equations like 2x + y = 10");
  if (order.length > 6) throw new Error("Up to 6 variables are supported");
  const rows = parsed.map((p) => {
    const l = evalAffine(p.l, varSet);
    const r = evalAffine(p.r, varSet);
    const combined = emptyAffine();
    for (const k of Object.keys(l)) combined[k] = rAdd(combined[k] || rat(0n), l[k]);
    for (const k of Object.keys(r)) combined[k] = rAdd(combined[k] || rat(0n), rNeg(r[k]));
    const coeffs = order.map((v) => combined[v] || rat(0n));
    const rhs = rNeg(combined.c || rat(0n));
    return { coeffs, rhs };
  });
  return { vars: order, rows };
}
function emptyAffine() { return { c: rat(0n) }; }

export function solveLinearSystem(text) {
  const { vars, rows } = parseSystemText(text);
  const n = vars.length;
  const m = rows.length;
  const steps = [];
  steps.push(`Variables: ${vars.join(", ")} — ${m} equation${m === 1 ? "" : "s"}`);
  const A = rows.map((r) => r.coeffs.slice());
  const b = rows.map((r) => [r.rhs]);
  const aug = A.map((row, i) => [...row, b[i][0]]);
  const opLog = [];
  let rank = 0;
  const rowUsed = [];
  for (let col = 0; col < n && rank < m; col += 1) {
    let pivot = -1;
    for (let r = rank; r < m; r += 1) if (!rIsZero(aug[r][col])) { pivot = r; break; }
    if (pivot === -1) continue;
    if (pivot !== rank) {
      const t = aug[pivot]; aug[pivot] = aug[rank]; aug[rank] = t;
      opLog.push(`R${rank + 1} \u2194 R${pivot + 1} (swap for a non-zero pivot)`);
    }
    for (let r = 0; r < m; r += 1) {
      if (r === rank || rIsZero(aug[r][col])) continue;
      const factor = rDiv(aug[r][col], aug[rank][col]);
      if (rIsZero(factor)) continue;
      for (let c = col; c <= n; c += 1) aug[r][c] = rSub(aug[r][c], rMul(factor, aug[rank][c]));
      const f = rToString(factor);
      opLog.push(`R${r + 1} \u2192 R${r + 1} ${f === "1" ? "" : `\u2212 ${f}\u00b7`}R${rank + 1}`);
    }
    rowUsed.push(col);
    rank += 1;
  }
  const rankA = rank;
  for (const line of opLog.slice(0, 14)) steps.push(line);
  if (opLog.length > 14) steps.push(`\u2026 ${opLog.length - 14} more row operations`);
  const rankAug = (() => {
    let r2 = 0;
    for (let col = 0; col <= n && r2 < m; col += 1) {
      for (let r = r2; r < m; r += 1) {
        if (!rIsZero(aug[r][col])) {
          const t = aug[r2]; aug[r2] = aug[r]; aug[r] = t;
          r2 += 1;
          break;
        }
      }
    }
    return r2;
  })();
  const pivotCols = new Set(rowUsed);
  let contradictionRow = null;
  for (let r = 0; r < m; r += 1) {
    const allZeroA = aug[r].slice(0, n).every(rIsZero);
    if (allZeroA && !rIsZero(aug[r][n])) { contradictionRow = r; break; }
  }
  if (contradictionRow !== null) {
    steps.push(`Row ${contradictionRow + 1} reduces to 0 = ${rToString(aug[contradictionRow][n])} \u2014 a contradiction`);
    steps.push(`rank(A) = ${rankA} but rank([A|b]) = ${rankAug} \u2192 the system is inconsistent`);
    return { type: "none", vars, steps, ok: true, rankA, rankAug };
  }
  if (rankAug < n) {
    const free = vars.filter((_, i) => !pivotCols.has(i));
    steps.push(`rank(A) = rank([A|b]) = ${rankA} < ${n} unknowns \u2192 infinitely many solutions (${free.length} free parameter${free.length === 1 ? "" : "s"})`);
    const params = free.map((_, i) => `t${i + 1}`);
    steps.push(`Express pivot unknowns in terms of ${free.map((v, i) => `${v} = ${params[i]}`).join(", ")}`);
    steps.push(`General solution: every assignment of the free parameters gives a solution \u2014 pick the free values to pin one down`);
    return { type: "infinite", vars, free, steps, ok: true, rankA, rankAug };
  }
  if (rankA < n) {
    steps.push(`rank(A) = ${rankA} < ${n} \u2014 inconsistent`);
    return { type: "none", vars, steps, ok: true, rankA, rankAug };
  }
  const x = new Array(n).fill(null);
  for (let r = rankA - 1; r >= 0; r -= 1) {
    let pivotCol = -1;
    for (let c = 0; c < n; c += 1) if (!rIsZero(aug[r][c])) { pivotCol = c; break; }
    if (pivotCol === -1) continue;
    let sum = aug[r][n];
    for (let c = pivotCol + 1; c < n; c += 1) sum = rSub(sum, rMul(aug[r][c], x[c] ?? rat(0n)));
    x[pivotCol] = rDiv(sum, aug[r][pivotCol]);
  }
  const fractions = x.map((v) => rToString(v));
  const values = x.map((v) => rToNumber(v));
  steps.push(`Row echelon form reached with rank ${rankA} = number of unknowns \u2192 unique solution`);
  steps.push(`Back substitution \u2192 ${vars.map((v, i) => `${v} = ${fractions[i]}`).join(", ")}`);
  let residualOK = true;
  for (let i = 0; i < m; i += 1) {
    let acc = rat(0n);
    for (let c = 0; c < n; c += 1) acc = rAdd(acc, rMul(A[i][c], x[c]));
    if (rToString(acc) !== rToString(rows[i].rhs)) residualOK = false;
  }
  steps.push(`Substitute back into every equation: ${residualOK ? "all exact \u2713 (rational arithmetic, no rounding)" : "check failed"}`);
  return { type: "unique", vars, values, fractions, steps, ok: true, rankA, rankAug, residualOK };
}

export function parseMatrixText(text) {
  const rows = text.split(/\r?\n|;/).map((r) => r.trim()).filter((r) => r.length);
  if (!rows.length) throw new Error("Enter matrix rows");
  const matrix = rows.map((row) => row.split(/[,\s]+/).filter((c) => c.length).map((c) => {
    const v = Number(c);
    if (!Number.isFinite(v)) throw new Error(`"${c}" is not a number`);
    return v;
  }));
  const width = matrix[0].length;
  for (const row of matrix) if (row.length !== width) throw new Error("All rows must have the same number of columns");
  return matrix;
}

function matClone(A) { return A.map((r) => r.slice()); }

export function matDet(A) {
  const n = A.length;
  const M = matClone(A);
  let det = 1;
  let sign = 1;
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col; r < n; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-14) return { value: 0, singular: true };
    if (pivot !== col) { const t = M[pivot]; M[pivot] = M[col]; M[col] = t; sign = -sign; }
    det *= M[col][col];
    for (let r = col + 1; r < n; r += 1) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c < n; c += 1) M[r][c] -= f * M[col][c];
    }
  }
  return { value: sign * det, singular: false };
}

export function matInverse(A) {
  const n = A.length;
  if (n !== A[0].length) throw new Error("Inverse needs a square matrix");
  const M = A.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col; r < n; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-14) return null;
    const t = M[pivot]; M[pivot] = M[col]; M[col] = t;
    const d = M[col][col];
    for (let c = 0; c < 2 * n; c += 1) M[col][c] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let c = 0; c < 2 * n; c += 1) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row.slice(n));
}

export function matRank(A) {
  const M = matClone(A);
  const n = M.length;
  const w = M[0].length;
  let rank = 0;
  for (let col = 0; col < w && rank < n; col += 1) {
    let pivot = -1;
    for (let r = rank; r < n; r += 1) if (Math.abs(M[r][col]) > 1e-13) { pivot = r; break; }
    if (pivot === -1) continue;
    const t = M[pivot]; M[pivot] = M[rank]; M[rank] = t;
    for (let r = rank + 1; r < n; r += 1) {
      const f = M[r][col] / M[rank][col];
      for (let c = col; c < w; c += 1) M[r][c] -= f * M[rank][c];
    }
    rank += 1;
  }
  return rank;
}

export function matEigen(A) {
  const n = A.length;
  if (n !== A[0].length) throw new Error("Eigenvalues need a square matrix");
  if (n === 1) return { values: [{ re: A[0][0], im: 0 }], vectors: [[{ re: 1, im: 0 }]] };
  const trace = A.reduce((s, row, i) => s + row[i], 0);
  if (n === 2) {
    const [a, b] = A[0];
    const [c, d] = A[1];
    const det = a * d - b * c;
    const res = solvePolynomial([det, -trace, 1], { input: "\u03bb^2 \u2212 tr(A)\u03bb + det(A)" });
    return { values: res.roots.map((r) => ({ re: r.re, im: r.im })), vectors: eigenvectors2(A, res.roots) };
  }
  if (n === 3) {
    const m11 = A[1][1] * A[2][2] - A[1][2] * A[2][1];
    const m22 = A[0][0] * A[2][2] - A[0][2] * A[2][0];
    const m33 = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const sumMinors = m11 + m22 + m33;
    const det = matDet(A).value;
    const res = solvePolynomial([-det, sumMinors, -trace, 1], { input: "characteristic polynomial \u03bb^3 \u2212 tr\u00b7\u03bb^2 + c\u00b7\u03bb \u2212 det" });
    const values = res.roots.map((r) => ({ re: r.re, im: r.im }));
    return { values, vectors: values.map((l) => eigenvector3(A, l)) };
  }
  throw new Error("Eigen decomposition supports 1\u00d71 to 3\u00d73 matrices");
}

function eigenvectors2(A, roots) {
  return roots.map((l) => {
    const a = cx(A[0][0] - l.re, -l.im);
    const b = cx(A[0][1], 0);
    const c = cx(A[1][0], 0);
    const d = cx(A[1][1] - l.re, -l.im);
    let v;
    if (Math.hypot(b.re, b.im) > 1e-12) v = cdiv(cneg(a), b);
    else if (Math.hypot(c.re, c.im) > 1e-12) v = cdiv(cneg(c), d);
    else v = cx(1, 0);
    if (Math.hypot(v.re, v.im) < 1e-14) v = cx(1, 0);
    return [cx(1, 0), v];
  });
}

function eigenvector3(A, lambda) {
  const M = A.map((row, i) => row.map((v, j) => cx(v - (i === j ? lambda.re : 0), i === j ? -lambda.im : 0)));
  const n = 3;
  const freeCol = [0, 1, 2];
  let pivotRows = 0;
  for (let col = 0; col < n; col += 1) {
    let pivot = -1;
    for (let r = pivotRows; r < n; r += 1) if (Math.hypot(M[r][col].re, M[r][col].im) > 1e-9) { pivot = r; break; }
    if (pivot === -1) continue;
    const t = M[pivot]; M[pivot] = M[pivotRows]; M[pivotRows] = t;
    const inv = cdiv(CX1, M[pivotRows][col]);
    for (let c = 0; c < n; c += 1) M[pivotRows][c] = cmul(M[pivotRows][c], inv);
    for (let r = 0; r < n; r += 1) {
      if (r === pivotRows) continue;
      const f = M[r][col];
      if (Math.hypot(f.re, f.im) < 1e-16) continue;
      for (let c = 0; c < n; c += 1) M[r][c] = csub(M[r][c], cmul(f, M[pivotRows][c]));
    }
    pivotRows += 1;
  }
  const pivotCols = [];
  for (let r = 0; r < pivotRows; r += 1) {
    let pc = -1;
    for (let c = 0; c < n; c += 1) if (Math.hypot(M[r][c].re, M[r][c].im) > 1e-9) { pc = c; break; }
    if (pc >= 0) pivotCols.push(pc);
  }
  const freeCols = freeCol.filter((c) => !pivotCols.includes(c));
  const freeColIdx = freeCols.length ? freeCols[0] : n - 1;
  const v = new Array(n).fill(null).map(() => cx(0, 0));
  v[freeColIdx] = CX1;
  for (let r = pivotRows - 1; r >= 0; r -= 1) {
    let pc = -1;
    for (let c = 0; c < n; c += 1) if (Math.hypot(M[r][c].re, M[r][c].im) > 1e-9) { pc = c; break; }
    if (pc === -1 || pc === freeColIdx) continue;
    let acc = cx(0, 0);
    for (let c = 0; c < n; c += 1) if (c !== pc) acc = cadd(acc, cmul(M[r][c], v[c]));
    v[pc] = cneg(acc);
  }
  const norm = Math.max(...v.map((z) => Math.hypot(z.re, z.im)));
  if (norm > 0) for (let i = 0; i < n; i += 1) v[i] = cdiv(v[i], cx(norm, 0));
  return v;
}

export function derivative(f, x, order = 1) {
  if (order === 1) {
    const h = Math.cbrt(2.2e-16) * Math.max(1, Math.abs(x));
    const d = (f(x + h) - f(x - h)) / (2 * h);
    if (Number.isFinite(d)) return d;
    return (f(x + h) - f(x)) / h;
  }
  const h = Math.sqrt(Math.cbrt(2.2e-16)) * Math.max(1, Math.abs(x));
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

export function definiteIntegral(f, a, b, tol = 1e-10, maxDepth = 22) {
  let evals = 0;
  const simpson = (lo, hi, flo, fmid, fhi) => ((hi - lo) / 6) * (flo + 4 * fmid + fhi);
  let converged = false;
  let error = Infinity;
  const rec = (lo, hi, flo, fmid, fhi, whole, depth) => {
    const mid = (lo + hi) / 2;
    const q1 = (lo + mid) / 2;
    const q3 = (mid + hi) / 2;
    const fq1 = f(q1);
    const fq3 = f(q3);
    evals += 2;
    const left = simpson(lo, mid, flo, fq1, fmid);
    const right = simpson(mid, hi, fmid, fq3, fhi);
    const diff = left + right - whole;
    if (depth <= 0 || Math.abs(diff) <= 15 * tol) {
      if (Math.abs(diff) > 15 * tol) error = Math.min(error, Math.abs(diff));
      return left + right + diff / 15;
    }
    return rec(lo, mid, flo, fq1, fmid, left, depth - 1) + rec(mid, hi, fmid, fq3, fhi, right, depth - 1);
  };
  const flo = f(a), fhi = f(b), fmid = f((a + b) / 2);
  evals = 3;
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || !Number.isFinite(fmid)) {
    return { value: NaN, ok: false, evals, reason: "Function is not finite over the interval — split the range around any asymptote" };
  }
  const whole = simpson(a, b, flo, fmid, fhi);
  const value = rec(a, b, flo, fmid, fhi, whole, maxDepth);
  converged = Number.isFinite(value);
  return { value: converged ? value : NaN, ok: converged, evals, error: Number.isFinite(error) ? Math.min(error, tol * 10) : tol * 10 };
}

export function findRoots(f, a, b, samples = 0) {
  const span = Math.abs(b - a);
  const n = Math.min(20000, Math.max(400, samples || Math.floor(span * 120)));
  const roots = [];
  let prevX = a;
  let prevY = f(a);
  if (prevY === 0) roots.push(a);
  for (let i = 1; i <= n; i += 1) {
    const x = a + (span * i) / n;
    const y = f(x);
    if (Number.isFinite(prevY) && Number.isFinite(y)) {
      if (y === 0) roots.push(x);
      else if (prevY * y < 0) {
        let lo = prevX, hi = x;
        const flo = prevY;
        for (let k = 0; k < 80; k += 1) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if (flo * fm <= 0) hi = mid; else lo = mid;
        }
        roots.push((lo + hi) / 2);
      }
    }
    prevX = x;
    prevY = y;
  }
  return roots.filter((r, i) => i === 0 || Math.abs(r - roots[i - 1]) > 1e-9);
}

export function findExtrema(f, a, b) {
  const n = Math.min(8000, Math.max(300, Math.floor(Math.abs(b - a) * 80)));
  const xs = [], ys = [];
  for (let i = 0; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    xs.push(x);
    ys.push(f(x));
  }
  const out = [];
  for (let i = 1; i < n; i += 1) {
    if (!Number.isFinite(ys[i - 1]) || !Number.isFinite(ys[i]) || !Number.isFinite(ys[i + 1])) continue;
    const isMax = ys[i] > ys[i - 1] && ys[i] > ys[i + 1];
    const isMin = ys[i] < ys[i - 1] && ys[i] < ys[i + 1];
    if (isMax || isMin) {
      const x0 = xs[i - 1], x1 = xs[i], x2 = xs[i + 1];
      const y0 = ys[i - 1], y1 = ys[i], y2 = ys[i + 1];
      const d = (y0 - 2 * y1 + y2);
      let xv = x1;
      if (d !== 0) {
        const shift = (0.5 * (y0 - y2)) / d;
        if (Number.isFinite(shift) && Math.abs(shift) <= 1) xv = x1 + shift * (x1 - x0);
      }
      out.push({ x: xv, y: f(xv), type: isMax ? "max" : "min" });
    }
  }
  return out;
}

export function niceTicks(min, max, target = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return { ticks: [min], step: 1 };
  const span = max - min;
  const rawStep = span / target;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const ticks = [];
  const start = Math.ceil(min / step - 1e-9) * step;
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return { ticks, step };
}

export function sampleFunction(f, x0, x1, pixels, yRange) {
  const px = Math.max(50, Math.floor(pixels));
  const segments = [];
  let current = [];
  let prevY = null;
  const breakLimit = Math.max(25 * (yRange || 1), 50);
  for (let i = 0; i <= px; i += 1) {
    const x = x0 + ((x1 - x0) * i) / px;
    const y = f(x);
    if (!Number.isFinite(y)) {
      if (current.length > 1) segments.push(current);
      current = [];
      prevY = null;
      continue;
    }
    if (prevY !== null && Math.abs(y - prevY) > breakLimit) {
      if (current.length > 1) segments.push(current);
      current = [{ x, y }];
    } else {
      current.push({ x, y });
    }
    prevY = y;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

export function limitNumeric(f, x, h0 = 1) {
  const approach = (dir) => {
    let h = h0;
    const vals = [];
    for (let i = 0; i < 10; i += 1) {
      const v = f(x + dir * h);
      if (Number.isFinite(v)) vals.push(v);
      h /= 10;
    }
    if (!vals.length) return { value: NaN, stable: false };
    const tail = vals.slice(-3);
    const last = vals[vals.length - 1];
    const spread = Math.max(...tail) - Math.min(...tail);
    return { value: last, stable: spread < 1e-2 * Math.max(1, Math.abs(last)) };
  };
  const from = approach(-1);
  const to = approach(1);
  const agree = Number.isFinite(from.value) && Number.isFinite(to.value) && Math.abs(from.value - to.value) < 1e-5 * Math.max(1, Math.abs(from.value));
  return {
    left: from.value,
    right: to.value,
    value: agree && from.stable && to.stable ? (from.value + to.value) / 2 : NaN,
    ok: agree && from.stable && to.stable
  };
}

export function isPrime(n) {
  let x = typeof n === "bigint" ? n : BigInt(Math.round(n));
  if (x < 2n) return false;
  if (x % 2n === 0n) return x === 2n;
  if (x % 3n === 0n) return x === 3n;
  if (x % 5n === 0n) return x === 5n;
  const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  let d = x - 1n, r = 0n;
  while (d % 2n === 0n) { d /= 2n; r += 1n; }
  for (const a of witnesses) {
    if (a % x === 0n) continue;
    let y = powMod(a, d, x);
    if (y === 1n || y === x - 1n) continue;
    let composite = true;
    for (let i = 1n; i < r; i += 1n) {
      y = (y * y) % x;
      if (y === x - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

export function powMod(base, exp, mod) {
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  let result = 1n;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

export function modInverse(a, m) {
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) return null;
  return ((old_s % m) + m) % m;
}

function pollardRho(n) {
  if (n % 2n === 0n) return 2n;
  let c = 1n;
  while (c < 20n) {
    let x = 2n, y = 2n, d = 1n;
    while (d === 1n) {
      x = (x * x + c) % n;
      y = (y * y + c) % n;
      y = (y * y + c) % n;
      d = bigGcd(x > y ? x - y : y - x, n);
    }
    if (d !== n) return d;
    c += 1n;
  }
  return n;
}

export function primeFactors(input) {
  let n = typeof input === "bigint" ? input : BigInt(Math.round(input));
  if (n < 2n) throw new Error("Numbers below 2 have no prime factors");
  const factors = [];
  for (const p of [2n, 3n, 5n]) {
    while (n % p === 0n) { factors.push(p); n /= p; }
  }
  let wheel = [4n, 2n, 4n, 2n, 4n, 6n, 2n, 6n];
  let i = 0;
  let d = 7n;
  while (d * d <= n) {
    while (n % d === 0n) { factors.push(d); n /= d; }
    d += wheel[i];
    i = (i + 1) % wheel.length;
  }
  if (n > 1n) {
    if (!isPrime(n)) {
      const f = pollardRho(n);
      if (f > 1n && f < n) {
        factors.push(f);
        factors.push(n / f);
      } else {
        factors.push(n);
      }
    } else {
      factors.push(n);
    }
  }
  factors.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const groups = [];
  for (const f of factors) {
    const last = groups[groups.length - 1];
    if (last && last.p === f) last.k += 1;
    else groups.push({ p: f, k: 1 });
  }
  return groups;
}

export function bigIntGcd(a, b) { return bigGcd(typeof a === "bigint" ? a : BigInt(a), typeof b === "bigint" ? b : BigInt(b)); }
export function bigIntLcm(a, b) {
  const x = typeof a === "bigint" ? a : BigInt(a);
  const y = typeof b === "bigint" ? b : BigInt(b);
  if (x === 0n || y === 0n) return 0n;
  return x / bigGcd(x, y) * y;
}

const TEX_FUNCS = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan", asin: "\\arcsin", acos: "\\arccos",
  atan: "\\arctan", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
  ln: "\\ln", log2: "\\log_{2}", log10: "\\log_{10}", exp: "\\exp", sqrt: "\\sqrt", abs: "\\left|\\right|"
};
const TEX_PREC = { expr: 1, term: 2, unary: 3.5, power: 4, postfix: 4.5, atom: 5 };
function texNumber(n) {
  const s = formatNumber(n);
  if (s.includes("e")) {
    const [m, ex] = s.split("e");
    return `${m.includes(".") ? m : m} \\cdot 10^{${ex.replace("e", "").replace("+", "")}}`;
  }
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return formatNumber(n);
}
function wrap(child, needed) {
  const p = texPrec(child);
  return p < needed ? `\\left(${texOf(child, 0)}\\right)` : texOf(child, 0);
}
function texPrec(node) {
  switch (node.k) {
    case "num": case "name": return TEX_PREC.atom;
    case "call": return node.id === "sqrt" && node.args.length === 1 && !node.args[0].op ? TEX_PREC.atom : TEX_PREC.atom;
    case "post": return TEX_PREC.postfix;
    case "un": return TEX_PREC.unary;
    case "bin": return node.op === "*" || node.op === "/" ? TEX_PREC.term : node.op === "^" ? TEX_PREC.power : TEX_PREC.expr;
    case "eq": return TEX_PREC.expr;
    default: return TEX_PREC.atom;
  }
}
function texOf(node, minPrec = 0) {
  const render = () => {
    switch (node.k) {
      case "num": return texNumber(node.v);
      case "name": {
        if (node.id === "pi") return "\\pi";
        if (node.id === "tau") return "\\tau";
        if (node.id === "phi") return "\\varphi";
        if (node.id === "ans") return "\\text{ans}";
        if (node.id === "i") return "i";
        return node.id;
      }
      case "call": {
        const arg = (i) => texOf(node.args[i], 0);
        if (node.id === "sqrt" && node.args.length === 1) return `\\sqrt{${arg(0)}}`;
        if (node.id === "cbrt" && node.args.length === 1) return `\\sqrt[3]{${arg(0)}}`;
        if (node.id === "root" && node.args.length === 2) return `\\sqrt[${arg(1)}]{${arg(0)}}`;
        if (node.id === "abs" && node.args.length === 1) return `\\left|${arg(0)}\\right|`;
        if (node.id === "log" && node.args.length === 2) return `\\log_{${arg(1)}}\\left(${arg(0)}\\right)`;
        if (node.id === "log" && node.args.length === 1) return `\\log\\left(${arg(0)}\\right)`;
        if (node.id === "pow" && node.args.length === 2) return `\\left(${arg(0)}\\right)^{${arg(1)}}`;
        if (node.id === "fact" || node.id === "factorial") return `${arg(0)}!`;
        const tex = TEX_FUNCS[node.id] || `\\operatorname{${node.id}}`;
        return `${tex}\\left(${node.args.map((_, i) => arg(i)).join(",\\, ")}\\right)`;
      }
      case "un": return node.op === "-" ? `-${wrap(node.x, TEX_PREC.unary)}` : `+${wrap(node.x, TEX_PREC.unary)}`;
      case "post": return node.op === "!" ? `${wrap(node.x, TEX_PREC.postfix)}!` : `${wrap(node.x, TEX_PREC.postfix)}\\%`;
      case "eq": return `${texOf(node.l, 0)} = ${texOf(node.r, 0)}`;
      case "bin": {
        if (node.op === "/") return `\\frac{${texOf(node.l, 0)}}{${texOf(node.r, 0)}}`;
        if (node.op === "^") return `${wrap(node.l, TEX_PREC.power)}^{${texOf(node.r, 0)}}`;
        if (node.op === "*") {
          const l = wrap(node.l, TEX_PREC.term);
          const r = wrap(node.r, TEX_PREC.term + 0.5);
          return node.imp ? `${l}${r}` : `${l} \\cdot ${r}`;
        }
        const l = wrap(node.l, TEX_PREC.expr);
        const r = wrap(node.r, TEX_PREC.expr + 0.5);
        return node.op === "+" ? `${l} + ${r}` : `${l} - ${r}`;
      }
      default: throw new Error("Cannot render expression");
    }
  };
  const s = render();
  const p = texPrec(node);
  return p < minPrec ? `\\left(${s}\\right)` : s;
}

export function latexFromAscii(source) {
  return texOf(parse(source, { allowEquation: true }), 0);
}

export function latexFromNode(node) { return texOf(node, 0); }
