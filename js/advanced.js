import "./app.js";

/* ============================================================
   Scientific expression engine
   ============================================================ */

const CONSTANTS = {
  pi: Math.PI,
  tau: Math.PI * 2,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2
};

/* Lanczos approximation — lets factorial() work for non-integers too. */
function gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i += 1) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function factorial(n) {
  if (Number.isInteger(n)) {
    if (n < 0) throw new Error("Factorial needs a non-negative number");
    if (n > 170) return Infinity;
    let out = 1;
    for (let i = 2; i <= n; i += 1) out *= i;
    return out;
  }
  return gamma(n + 1);
}

/* Abramowitz & Stegun error-function approximation. */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

/* --- Tokenizer --------------------------------------------------------- */

function tokenize(source) {
  const tokens = [];
  const isDigit = (c) => c >= "0" && c <= "9";
  const isAlpha = (c) => /[a-zA-Z]/.test(c);
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === " " || c === "\t") { i += 1; continue; }
    if (isDigit(c) || (c === "." && isDigit(source[i + 1]))) {
      let j = i;
      while (j < source.length && (isDigit(source[j]) || source[j] === ".")) j += 1;
      if (source[j] === "e" || source[j] === "E") {
        let k = j + 1;
        if (source[k] === "+" || source[k] === "-") k += 1;
        if (isDigit(source[k])) {
          while (k < source.length && isDigit(source[k])) k += 1;
          j = k;
        }
      }
      const raw = source.slice(i, j);
      if (!/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) throw new Error(`Invalid number "${raw}"`);
      tokens.push({ type: "num", value: Number(raw) });
      i = j;
      continue;
    }
    if (isAlpha(c)) {
      let j = i;
      while (j < source.length && /[a-zA-Z0-9_]/.test(source[j])) j += 1;
      tokens.push({ type: "name", value: source.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ("+-*/^%(),!".includes(c)) {
      tokens.push({ type: "op", value: c });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return tokens;
}

/* --- Recursive-descent parser ----------------------------------------- */

function evaluateExpression(source, context) {
  const tokens = tokenize(source);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const toRadians = (x) => (context.deg ? (x * Math.PI) / 180 : x);
  const fromRadians = (x) => (context.deg ? (x * 180) / Math.PI : x);
  const startsPrimary = (t) => t && (t.type === "num" || t.type === "name" || t.value === "(");

  function applyFunction(name, args) {
    const a = args[0];
    const b = args[1];
    switch (name) {
      case "sin": return Math.sin(toRadians(a));
      case "cos": return Math.cos(toRadians(a));
      case "tan": return Math.tan(toRadians(a));
      case "asin": case "arcsin": return fromRadians(Math.asin(a));
      case "acos": case "arccos": return fromRadians(Math.acos(a));
      case "atan": case "arctan": return fromRadians(Math.atan(a));
      case "atan2": return fromRadians(Math.atan2(a, b));
      case "sinh": return Math.sinh(a);
      case "cosh": return Math.cosh(a);
      case "tanh": return Math.tanh(a);
      case "ln": return Math.log(a);
      case "log": return args.length > 1 ? Math.log(a) / Math.log(b) : Math.log10(a);
      case "log2": return Math.log2(a);
      case "exp": return Math.exp(a);
      case "sqrt": return Math.sqrt(a);
      case "cbrt": return Math.cbrt(a);
      case "root": return Math.sign(a) * Math.pow(Math.abs(a), 1 / b);
      case "pow": return Math.pow(a, b);
      case "mod": return ((a % b) + b) % b;
      case "abs": return Math.abs(a);
      case "sign": return Math.sign(a);
      case "round": return Number(a.toFixed(b || 0));
      case "floor": return Math.floor(a);
      case "ceil": return Math.ceil(a);
      case "min": return Math.min(...args);
      case "max": return Math.max(...args);
      case "hypot": return Math.hypot(...args);
      case "fact": case "factorial": return factorial(a);
      case "normpdf": {
        const mean = args.length > 1 ? b : 0;
        const sd = args.length > 2 ? args[2] : 1;
        return Math.exp(-((a - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
      }
      case "normcdf": {
        const mean = args.length > 1 ? b : 0;
        const sd = args.length > 2 ? args[2] : 1;
        return 0.5 * (1 + erf((a - mean) / (sd * Math.SQRT2)));
      }
      default: throw new Error(`Unknown function "${name}"`);
    }
  }

  function parsePrimary() {
    const token = next();
    if (!token) throw new Error("Incomplete expression");
    if (token.type === "num") return token.value;
    if (token.value === "(") {
      const value = parseExpression();
      const close = next();
      if (!close || close.value !== ")") throw new Error('Missing ")"');
      return value;
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
        return applyFunction(token.value, args);
      }
      if (token.value === "ans") return context.ans || 0;
      if (token.value in CONSTANTS) return CONSTANTS[token.value];
      throw new Error(`Unknown name "${token.value}"`);
    }
    throw new Error(`Unexpected "${token.value}"`);
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() && peek().value === "!") { next(); value = factorial(value); }
    while (peek() && peek().value === "%") { next(); value /= 100; }
    return value;
  }

  function parsePower() {
    const base = parsePostfix();
    if (peek() && peek().value === "^") {
      next();
      return Math.pow(base, parseUnary());
    }
    return base;
  }

  function parseUnary() {
    const token = peek();
    if (token && (token.value === "+" || token.value === "-")) {
      next();
      const value = parseUnary();
      return token.value === "-" ? -value : value;
    }
    return parsePower();
  }

  function parseTerm() {
    let left = parseUnary();
    while (peek()) {
      const token = peek();
      if (token.value === "*" || token.value === "/") {
        next();
        const right = parseUnary();
        left = token.value === "*" ? left * right : left / right;
      } else if (startsPrimary(token)) {
        // Implicit multiplication: 2pi, 3(4+5), 2sin(30), ...
        left *= parseUnary();
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
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseExpression();
  if (pos !== tokens.length) throw new Error(`Unexpected "${tokens[pos].value}"`);
  return result;
}

/* --- Display helpers --------------------------------------------------- */

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e15 || abs < 1e-9) {
    return value.toExponential(8).replace(/\.?0+e/, "e");
  }
  return Number(value.toPrecision(12)).toString();
}

function setupScientific() {
  const input = document.querySelector("#sci-input");
  const output = document.querySelector("#sci-output");
  const keys = document.querySelector("#sci-keys");
  if (!input || !output || !keys) return;

  const state = { deg: true, ans: 0 };

  function evaluate() {
    const expr = input.value.trim();
    if (!expr) {
      output.textContent = "0";
      output.classList.remove("is-error");
      return undefined;
    }
    try {
      const value = evaluateExpression(expr, state);
      if (!Number.isFinite(value)) throw new Error("Result is not a finite number");
      output.textContent = formatNumber(value);
      output.classList.remove("is-error");
      return value;
    } catch (error) {
      output.textContent = error.message;
      output.classList.add("is-error");
      return undefined;
    }
  }

  function insert(text) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const caret = start + text.length;
    input.setSelectionRange(caret, caret);
    input.focus();
    evaluate();
  }

  function backspace() {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    if (start === end && start > 0) {
      input.value = input.value.slice(0, start - 1) + input.value.slice(end);
      input.setSelectionRange(start - 1, start - 1);
    } else {
      input.value = input.value.slice(0, start) + input.value.slice(end);
      input.setSelectionRange(start, start);
    }
    input.focus();
    evaluate();
  }

  function toggleSign() {
    const trimmed = input.value.trim();
    if (!trimmed) return;
    input.value = trimmed.startsWith("-") ? trimmed.slice(1) : `-${trimmed}`;
    input.setSelectionRange(input.value.length, input.value.length);
    input.focus();
    evaluate();
  }

  keys.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-ins], button[data-act]");
    if (!button) return;
    if (button.dataset.ins !== undefined) { insert(button.dataset.ins); return; }
    switch (button.dataset.act) {
      case "clear": input.value = ""; input.focus(); evaluate(); break;
      case "backspace": backspace(); break;
      case "sign": toggleSign(); break;
      case "equals": {
        const value = evaluate();
        if (typeof value === "number") {
          state.ans = value;
          input.value = formatNumber(value);
          input.setSelectionRange(input.value.length, input.value.length);
        }
        break;
      }
      default: break;
    }
  });

  input.addEventListener("input", evaluate);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      keys.querySelector('[data-act="equals"]')?.click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.value = "";
      evaluate();
    }
  });

  document.querySelectorAll("[data-angle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.deg = button.dataset.angle === "deg";
      document.querySelectorAll("[data-angle]").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === button));
      });
      evaluate();
    });
  });

  evaluate();
}

/* ============================================================
   Trend / statistics calculator
   ============================================================ */

function parseSeries(raw) {
  const text = String(raw || "").trim();
  if (!text) return { xs: [], ys: [] };
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pairPattern = /^[^,\s]+\s*[,\s]\s*[^,\s]+$/;
  const looksPaired = lines.length >= 3 && lines.every((line) => {
    if (!pairPattern.test(line)) return false;
    return line.split(/[,\s]+/).every((part) => Number.isFinite(Number(part)));
  });
  if (looksPaired) {
    const xs = [];
    const ys = [];
    lines.forEach((line) => {
      const [x, y] = line.split(/[,\s]+/).map(Number);
      xs.push(x);
      ys.push(y);
    });
    return { xs, ys };
  }
  const numbers = (text.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || []).map(Number);
  return { xs: numbers.map((_, index) => index + 1), ys: numbers };
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function linearFit(xs, ys) {
  const n = xs.length;
  const meanX = average(xs);
  const meanY = average(ys);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const slope = sxx ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;
  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  return { slope, intercept, r2: r * r };
}

function analyzeSeries(xs, ys, options = {}) {
  const forecastPeriods = Math.min(12, Math.max(1, Number(options.forecastPeriods) || 1));
  const model = options.model || "auto";
  const n = ys.length;
  const linear = linearFit(xs, ys);
  const allPositive = ys.every((value) => value > 0);
  let exponential = null;
  if (allPositive) {
    const logFit = linearFit(xs, ys.map((value) => Math.log(value)));
    exponential = { slope: logFit.slope, intercept: logFit.intercept, r2: logFit.r2, a: Math.exp(logFit.intercept) };
  }

  let chosen;
  if (model === "linear") chosen = { type: "linear", ...linear };
  else if (model === "exponential" && exponential) chosen = { type: "exponential", ...exponential };
  else if (exponential && exponential.r2 > linear.r2) chosen = { type: "exponential", ...exponential };
  else chosen = { type: "linear", ...linear };

  const lastX = xs[xs.length - 1];
  const predictions = [];
  for (let step = 1; step <= forecastPeriods; step += 1) {
    const x = lastX + step;
    const y = chosen.type === "exponential"
      ? chosen.a * Math.exp(chosen.slope * x)
      : chosen.slope * x + chosen.intercept;
    predictions.push({ x, y });
  }

  const meanY = average(ys);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const stdDev = n > 1 ? Math.sqrt(ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0) / (n - 1)) : 0;
  const flatThreshold = Math.abs(meanY) * 0.005;
  const direction = chosen.slope > flatThreshold ? "Rising" : chosen.slope < -flatThreshold ? "Falling" : "Flat";
  const first = ys[0];
  const last = ys[n - 1];
  const totalChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const diffs = ys.slice(1).map((value, index) => value - ys[index]);
  const avgChange = average(diffs);
  const cagr = first > 0 && last > 0 && n > 1 ? (Math.pow(last / first, 1 / (n - 1)) - 1) * 100 : null;

  return { n, linear, exponential, chosen, predictions, meanY, minY, maxY, stdDev, direction, first, last, totalChange, avgChange, cagr };
}

function setupTrend() {
  const form = document.querySelector("#trend-form");
  if (!form) return;
  const result = document.getElementById("trend-result");
  const detail = document.getElementById("trend-detail");
  const statsHost = document.getElementById("trend-stats");
  const forecastHost = document.getElementById("trend-forecast");

  const fmt = (value, digits = 2) => {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs !== 0 && (abs >= 1e7 || abs < 1e-4)) return value.toExponential(2);
    return Number(value.toFixed(digits)).toLocaleString(undefined, { maximumFractionDigits: digits });
  };

  function addStat(label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const desc = document.createElement("dd");
    term.textContent = label;
    desc.textContent = value;
    row.append(term, desc);
    statsHost.append(row);
  }

  function analyze() {
    const data = new FormData(form);
    const { xs, ys } = parseSeries(data.get("series"));

    statsHost.replaceChildren();
    forecastHost.replaceChildren();

    if (ys.length < 2) {
      result.textContent = "—";
      detail.textContent = "Add at least two numeric values to analyze a trend.";
      return;
    }

    const { n, chosen, predictions, meanY, minY, maxY, stdDev, direction, first, last, totalChange, avgChange, cagr } =
      analyzeSeries(xs, ys, { model: String(data.get("model") || "auto"), forecastPeriods: data.get("forecast") });

    result.textContent = `${direction} · next ≈ ${fmt(predictions[0].y)}`;
    detail.textContent = `${chosen.type === "exponential" ? "Exponential" : "Linear"} trend from ${n} data points (R² ${fmt(chosen.r2, 3)}).`;

    addStat("Trend equation", chosen.type === "exponential"
      ? `y = ${fmt(chosen.a)} · e^(${fmt(chosen.slope)}x)`
      : `y = ${fmt(chosen.slope)}x ${chosen.intercept < 0 ? "−" : "+"} ${fmt(Math.abs(chosen.intercept))}`);
    addStat("Fit quality (R²)", fmt(chosen.r2, 3));
    addStat("Direction", direction);
    addStat("Data points", String(n));
    addStat("Mean", fmt(meanY));
    addStat("Std deviation", fmt(stdDev));
    addStat("Minimum", fmt(minY));
    addStat("Maximum", fmt(maxY));
    addStat("Total change", `${fmt(first)} → ${fmt(last)} (${totalChange >= 0 ? "+" : ""}${fmt(totalChange)}%)`);
    addStat("Avg change / period", `${avgChange >= 0 ? "+" : ""}${fmt(avgChange)}`);
    addStat("Recent avg (last 3)", fmt(average(ys.slice(-3))));
    if (cagr !== null) addStat("Growth rate (CAGR)", `${cagr >= 0 ? "+" : ""}${fmt(cagr)}%`);

    predictions.forEach((point) => {
      const chip = document.createElement("span");
      chip.className = "forecast-chip";
      chip.textContent = `#${point.x}: ${fmt(point.y)}`;
      forecastHost.append(chip);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    analyze();
  });
  analyze();
}

setupScientific();
setupTrend();

export { evaluateExpression, parseSeries, analyzeSeries, formatNumber };
