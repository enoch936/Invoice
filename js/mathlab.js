import {
  FUNCTIONS, CONSTANTS, evaluate, evalNumber, formatNumber, formatComplex, formatValue,
  latexFromAscii, solvePolynomialExpression, solveLinearSystem, parseMatrixText,
  matDet, matInverse, matRank, matEigen, derivative, definiteIntegral, findRoots,
  findExtrema, niceTicks, sampleFunction, limitNumeric, isPrime, powMod, modInverse,
  primeFactors, bigIntGcd, bigIntLcm,
} from "./mathengine.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const HIST_KEY = "parchxa.calc.history.v1";
const MEM_KEY = "parchxa.calc.mem.v1";
const MONO = "ui-monospace, 'DM Sans', monospace";
const cssVar = (name, fallback) => (getComputedStyle(document.documentElement).getPropertyValue(name) || "").trim() || fallback;
const isEditable = (t) => !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
const fmtN = (v) => formatNumber(v);
const fmtMaybe = (v) => (Number.isFinite(v) ? formatNumber(v) : "not finite");
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const subNum = (n) => String(n).split("").map((d) => SUBS[Number(d)]).join("");

const sciInput = $("sci-input");
const sciOut = $("sci-output");
const sciPreviewBox = $("sci-preview");
const gCanvas = $("g-canvas");
const gRead = $("g-readout");
const gList = $("g-list");

const tabEls = Array.from(document.querySelectorAll(".lab-tab[data-mode]"));
const panelEls = Array.from(document.querySelectorAll(".lab-panel"));
let activeMode = "scientific";

function activate(mode) {
  if (!tabEls.some((t) => t.dataset.mode === mode)) return;
  activeMode = mode;
  tabEls.forEach((t) => {
    const on = t.dataset.mode === mode;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
  });
  panelEls.forEach((p) => {
    const on = p.dataset.panel === mode;
    p.classList.toggle("is-active", on);
    if (on) p.removeAttribute("aria-hidden");
    else p.setAttribute("aria-hidden", "true");
  });
  if (mode === "graphing") requestAnimationFrame(() => { fitGraph(); drawGraph(); });
  if (mode === "complex" && cxState.z) requestAnimationFrame(drawArgand);
}

function initTabs() {
  tabEls.forEach((t) => {
    t.tabIndex = t.classList.contains("is-active") ? 0 : -1;
    t.addEventListener("click", () => activate(t.dataset.mode));
  });
  document.querySelector(".lab-rail")?.addEventListener("keydown", (e) => {
    const i = tabEls.indexOf(document.activeElement);
    if (i < 0) return;
    let j = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % tabEls.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + tabEls.length) % tabEls.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tabEls.length - 1;
    if (j >= 0) { e.preventDefault(); activate(tabEls[j].dataset.mode); tabEls[j].focus(); }
  });
}

const sciState = { deg: true, ans: { re: 0, im: 0 }, precision: "auto", lastZ: null, histIdx: -1, histSnap: "" };
let undoStack = [""];
let redoStack = [];
let mem = 0;
const sugBox = el("div", "sci-suggest");
sugBox.hidden = true;
sugBox.setAttribute("role", "listbox");
sugBox.setAttribute("aria-label", "Expression suggestions");
let sugList = [];
let sugIndex = -1;
const FUNC_NAMES = new Set(FUNCTIONS.map((f) => f.n));
const WORDS = [...FUNCTIONS.map((f) => f.n), ...Object.keys(CONSTANTS), "ans", "theta"];

function recordValue() {
  const v = sciInput.value;
  if (undoStack[undoStack.length - 1] !== v) {
    undoStack.push(v);
    if (undoStack.length > 250) undoStack.shift();
    redoStack = [];
  }
}
function restoreValue(v) {
  sciInput.value = v;
  sciInput.setSelectionRange(v.length, v.length);
}
function doUndo() {
  if (undoStack.length < 2) return;
  redoStack.push(undoStack.pop());
  restoreValue(undoStack[undoStack.length - 1]);
  sciState.histIdx = -1;
  liveEval();
}
function doRedo() {
  if (!redoStack.length) return;
  const v = redoStack.pop();
  undoStack.push(v);
  restoreValue(v);
  sciState.histIdx = -1;
  liveEval();
}

function renderPreview(src) {
  if (!sciPreviewBox) return;
  if (!src) { sciPreviewBox.textContent = ""; sciPreviewBox.classList.remove("is-on"); return; }
  try {
    const tex = latexFromAscii(src);
    if (typeof katex !== "undefined") katex.render(tex, sciPreviewBox, { throwOnError: false, displayMode: false });
    else sciPreviewBox.textContent = tex;
    sciPreviewBox.classList.add("is-on");
  } catch {
    sciPreviewBox.textContent = "";
    sciPreviewBox.classList.remove("is-on");
  }
}

function liveEval() {
  const expr = sciInput.value.trim();
  renderPreview(expr);
  if (!expr) {
    sciOut.textContent = "0";
    sciOut.classList.remove("is-error");
    sciState.lastZ = null;
    return;
  }
  try {
    const z = evaluate(expr, { deg: sciState.deg, ans: sciState.ans });
    sciOut.textContent = formatValue(z, sciState.precision);
    sciOut.classList.remove("is-error");
    sciState.lastZ = z;
  } catch {
    sciOut.textContent = "—";
    sciOut.classList.remove("is-error");
    sciState.lastZ = null;
  }
}

function commitEquals() {
  const expr = sciInput.value.trim();
  if (!expr) return;
  try {
    const z = evaluate(expr, { deg: sciState.deg, ans: sciState.ans });
    const text = formatValue(z, sciState.precision);
    sciOut.textContent = text;
    sciOut.classList.remove("is-error");
    sciState.lastZ = z;
    sciState.ans = z;
    pushHistory(expr, text);
    sciInput.value = formatValue(z, "auto");
    recordValue();
    sciState.histIdx = -1;
    closeSuggest();
    sciInput.focus();
  } catch (e) {
    sciOut.textContent = (e && e.message) || "Invalid expression";
    sciOut.classList.add("is-error");
  }
}

function insertAtCaret(text, closeIt) {
  const start = sciInput.selectionStart ?? sciInput.value.length;
  const end = sciInput.selectionEnd ?? sciInput.value.length;
  const ins = closeIt && text.endsWith("(") ? `${text})` : text;
  sciInput.value = sciInput.value.slice(0, start) + ins + sciInput.value.slice(end);
  const caret = closeIt && text.endsWith("(") ? start + text.length : start + ins.length;
  sciInput.setSelectionRange(caret, caret);
  recordValue();
  sciState.histIdx = -1;
  liveEval();
  sciInput.focus();
}

function backspaceAtCaret() {
  const start = sciInput.selectionStart ?? 0;
  const end = sciInput.selectionEnd ?? 0;
  if (start === end && start > 0) sciInput.value = sciInput.value.slice(0, start - 1) + sciInput.value.slice(end);
  else sciInput.value = sciInput.value.slice(0, start) + sciInput.value.slice(end);
  const caret = start === end ? Math.max(0, start - 1) : start;
  sciInput.setSelectionRange(caret, caret);
  recordValue();
  sciState.histIdx = -1;
  liveEval();
  sciInput.focus();
}

function toggleSign() {
  const v = sciInput.value.trim();
  if (!v) return;
  sciInput.value = v.startsWith("-") ? v.slice(1) : `-${v}`;
  sciInput.setSelectionRange(sciInput.value.length, sciInput.value.length);
  recordValue();
  liveEval();
  sciInput.focus();
}

function clearSci() {
  sciInput.value = "";
  recordValue();
  sciState.histIdx = -1;
  closeSuggest();
  liveEval();
  sciInput.focus();
}

function loadMem() {
  try {
    const v = Number(localStorage.getItem(MEM_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}
function saveMem() {
  try { localStorage.setItem(MEM_KEY, String(mem)); } catch {}
  const badge = $("mem-badge");
  if (badge) { badge.hidden = mem === 0; badge.title = `Stored memory: ${formatNumber(mem)}`; }
}
function memAct(act) {
  if (act === "mem-clear") { mem = 0; saveMem(); return; }
  if (act === "mem-recall") { insertAtCaret(formatNumber(mem)); return; }
  const z = sciState.lastZ;
  if (!z || z.im !== 0) {
    sciOut.textContent = "Memory stores real results — evaluate a real expression first";
    sciOut.classList.add("is-error");
    return;
  }
  mem = act === "mem-add" ? mem + z.re : mem - z.re;
  saveMem();
}

function setAngle(deg) {
  sciState.deg = deg;
  document.querySelectorAll("[data-angle]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.angle === "deg") === deg)));
  liveEval();
}

function closeSuggest() {
  sugBox.hidden = true;
  sugBox.replaceChildren();
  sugList = [];
  sugIndex = -1;
}
function openSuggest(items) {
  sugList = items;
  sugIndex = 0;
  sugBox.replaceChildren();
  items.forEach((name, i) => {
    const item = el("div", "sci-suggest-item" + (i === 0 ? " is-active" : ""));
    item.setAttribute("role", "option");
    const fn = FUNCTIONS.find((f) => f.n === name);
    item.append(el("span", "sug-name", FUNC_NAMES.has(name) ? `${name}(` : name));
    if (fn) item.append(el("span", "sug-desc", fn.d));
    item.addEventListener("click", () => { sugIndex = i; acceptSuggest(); });
    sugBox.append(item);
  });
  sugBox.hidden = false;
}
function currentWord() {
  const caret = sciInput.selectionStart ?? sciInput.value.length;
  const before = sciInput.value.slice(0, caret);
  const m = before.match(/[A-Za-z_][A-Za-z0-9_]*$/);
  return m ? m[0] : "";
}
function updateSuggest() {
  const word = currentWord();
  if (!word) { closeSuggest(); return; }
  const items = WORDS.filter((w) => w.startsWith(word) && w !== word).slice(0, 6);
  if (!items.length) { closeSuggest(); return; }
  if (!sugBox.hidden && sugList.length === items.length && sugList.every((w, i) => w === items[i])) return;
  openSuggest(items);
}
function moveSuggest(dir) {
  if (sugBox.hidden || !sugList.length) return;
  sugIndex = (sugIndex + dir + sugList.length) % sugList.length;
  Array.from(sugBox.children).forEach((c, i) => c.classList.toggle("is-active", i === sugIndex));
}
function acceptSuggest() {
  const name = sugList[sugIndex];
  const word = currentWord();
  if (!name || !word) { closeSuggest(); return; }
  const caret = sciInput.selectionStart ?? sciInput.value.length;
  const start = caret - word.length;
  const closes = FUNC_NAMES.has(name);
  const ins = closes ? `${name}()` : name;
  sciInput.value = sciInput.value.slice(0, start) + ins + sciInput.value.slice(caret);
  const pos = closes ? start + name.length + 1 : start + ins.length;
  sciInput.setSelectionRange(pos, pos);
  closeSuggest();
  recordValue();
  liveEval();
  sciInput.focus();
}

function recallHistory(dir) {
  const list = getHistory();
  if (!list.length) return;
  if (sciState.histIdx === -1) sciState.histSnap = sciInput.value;
  let i = sciState.histIdx + dir;
  if (i < -1) i = -1;
  if (i > list.length - 1) i = list.length - 1;
  sciState.histIdx = i;
  restoreValue(i === -1 ? sciState.histSnap : list[i].expr);
  recordValue();
  closeSuggest();
  liveEval();
}

function onDocInput(e) {
  if (e.target !== sciInput) return;
  e.stopPropagation();
  recordValue();
  sciState.histIdx = -1;
  liveEval();
  updateSuggest();
}

function onDocKeydown(e) {
  const kbd = $("kbd-pop");
  const t = e.target;
  const k = e.key;
  if (k === "?" && (!isEditable(t) || t === sciInput) && kbd && kbd.hidden) {
    e.preventDefault();
    openKbd();
    return;
  }
  if (k === "Escape" && kbd && !kbd.hidden && !isEditable(t)) {
    closeKbd();
    return;
  }
  if (t !== sciInput) return;
  if (k === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    closeSuggest();
    commitEquals();
    return;
  }
  if (k === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    if (!sugBox.hidden) closeSuggest();
    else clearSci();
    return;
  }
  if (k === "Tab" && !sugBox.hidden) {
    e.preventDefault();
    e.stopPropagation();
    acceptSuggest();
    return;
  }
  if (k === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    if (!sugBox.hidden) moveSuggest(1);
    else recallHistory(-1);
    return;
  }
  if (k === "ArrowUp") {
    e.preventDefault();
    e.stopPropagation();
    if (!sugBox.hidden) moveSuggest(-1);
    else recallHistory(1);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (k === "z" || k === "Z")) {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) doRedo();
    else doUndo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (k === "y" || k === "Y")) {
    e.preventDefault();
    e.stopPropagation();
    doRedo();
  }
}

function onDocClick(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const ang = t.closest("[data-angle]");
  if (ang) {
    e.stopPropagation();
    setAngle(ang.dataset.angle === "deg");
    return;
  }
  const key = t.closest("#sci-keys [data-ins], #sci-keys [data-act], .sci-aux-row [data-act]");
  if (!key) return;
  e.stopPropagation();
  if (key.dataset.ins !== undefined) {
    insertAtCaret(key.dataset.ins, true);
    return;
  }
  const act = key.dataset.act;
  if (act === "clear") clearSci();
  else if (act === "backspace") backspaceAtCaret();
  else if (act === "sign") toggleSign();
  else if (act === "equals") commitEquals();
  else if (act && act.startsWith("mem-")) memAct(act);
}

function initSci() {
  if (!sciInput || !sciOut) return;
  const wrap = el("div", "sci-input-wrap");
  sciInput.before(wrap);
  wrap.append(sciInput, sugBox);
  undoStack = [sciInput.value];
  mem = loadMem();
  saveMem();
  const prec = $("sci-precision");
  sciState.precision = prec ? prec.value : "auto";
  prec?.addEventListener("change", () => { sciState.precision = prec.value; liveEval(); });
  sugBox.addEventListener("mousedown", (e) => e.preventDefault());
  document.addEventListener("input", onDocInput, true);
  document.addEventListener("keydown", onDocKeydown, true);
  document.addEventListener("click", onDocClick, true);
  liveEval();
}

let historyCache = null;
function getHistory() {
  if (historyCache) return historyCache;
  try {
    const raw = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    historyCache = Array.isArray(raw) ? raw.filter((h) => h && typeof h.expr === "string") : [];
  } catch { historyCache = []; }
  return historyCache;
}
function saveHistory() {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(historyCache.slice(0, 200))); } catch {}
}
function pushHistory(expr, result) {
  const list = getHistory();
  const at = list.findIndex((h) => h.expr === expr);
  if (at >= 0) list.splice(at, 1);
  list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), expr, result, ts: Date.now(), pinned: false });
  if (list.length > 200) list.splice(200);
  saveHistory();
  renderHistory();
}
function histBtn(label, fn) {
  const b = el("button", "hist-btn", label);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function renderHistory() {
  const host = $("hist-list");
  if (!host) return;
  const all = getHistory();
  const q = (($("hist-search") && $("hist-search").value) || "").trim().toLowerCase();
  const list = all.filter((h) => !q || h.expr.toLowerCase().includes(q) || String(h.result).toLowerCase().includes(q));
  host.replaceChildren();
  if (!list.length) {
    host.append(el("p", "muted-copy", all.length ? "No entries match the search." : "No calculations yet — evaluate something in the scientific calculator."));
    return;
  }
  for (const h of list) {
    const row = el("div", "hist-row" + (h.pinned ? " is-pinned" : ""));
    const main = el("div", "hist-main");
    main.append(el("code", "hist-expr", h.expr), el("span", "hist-eq", "="), el("span", "hist-res", String(h.result)));
    const time = el("time", "hist-meta", new Date(h.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
    const acts = el("div", "hist-acts");
    acts.append(
      histBtn("Use", () => {
        sciInput.value = h.expr;
        recordValue();
        sciState.histIdx = -1;
        activate("scientific");
        liveEval();
        sciInput.focus();
      }),
      histBtn("Copy", async (ev) => {
        try { await navigator.clipboard.writeText(`${h.expr} = ${h.result}`); } catch {}
        const b = ev.currentTarget;
        b.textContent = "Copied";
        setTimeout(() => { b.textContent = "Copy"; }, 1200);
      }),
      histBtn(h.pinned ? "Unpin" : "Pin", () => { h.pinned = !h.pinned; saveHistory(); renderHistory(); }),
      histBtn("Delete", () => {
        const i = getHistory().indexOf(h);
        if (i >= 0) getHistory().splice(i, 1);
        saveHistory();
        renderHistory();
      })
    );
    row.append(main, time, acts);
    host.append(row);
  }
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function initHistory() {
  $("hist-search")?.addEventListener("input", renderHistory);
  $("hist-export")?.addEventListener("click", () => {
    const lines = getHistory().map((h) => `${h.expr} = ${h.result}`);
    if (!lines.length) return;
    download("parchxa-history.txt", `${lines.join("\n")}\n`, "text/plain");
  });
  $("hist-export-tex")?.addEventListener("click", () => {
    const lines = getHistory().map((h) => {
      let lhs;
      let rhs;
      try { lhs = latexFromAscii(h.expr); } catch { lhs = h.expr; }
      try { rhs = latexFromAscii(String(h.result)); } catch { rhs = String(h.result); }
      return `$${lhs} = ${rhs}$`;
    });
    if (!lines.length) return;
    download("parchxa-history.tex", `${lines.join("\n")}\n`, "application/x-tex");
  });
  $("hist-clear")?.addEventListener("click", () => {
    if (!getHistory().length) return;
    if (!window.confirm("Clear all history? Pinned entries are kept.")) return;
    historyCache = getHistory().filter((h) => h.pinned);
    saveHistory();
    renderHistory();
  });
  renderHistory();
}

function setSolverMsg(out, msg) {
  out.classList.add("is-error");
  out.replaceChildren(el("div", "solver-head", msg));
}
function fillSteps(host, steps) {
  host.replaceChildren(...steps.map((s) => el("li", "", s)));
}

function initEquations() {
  const input = $("eq-input");
  const out = $("eq-result");
  const steps = $("eq-steps");
  if (!input || !out || !steps) return;
  const run = () => {
    const text = input.value;
    if (!text.trim()) { setSolverMsg(out, "Enter at least one equation."); steps.replaceChildren(); return; }
    try {
      const res = solveLinearSystem(text);
      out.classList.remove("is-error");
      out.replaceChildren();
      if (res.type === "unique") {
        out.append(el("div", "solver-head", "Unique solution"));
        const vals = el("div", "solver-values");
        res.vars.forEach((v, i) => {
          const frac = res.fractions[i];
          const line = el("div", "solver-var");
          line.append(el("span", "sv-name", `${v} =`), el("span", "sv-frac", frac));
          if (frac.includes("/")) line.append(el("span", "sv-num", `(${formatNumber(res.values[i])})`));
          vals.append(line);
        });
        out.append(vals);
      } else if (res.type === "none") {
        out.append(el("div", "solver-head", "No solution"), el("p", "muted-copy", "The system is inconsistent — row reduction produces a contradiction, so rank(A) differs from rank([A|b])."));
      } else {
        out.append(el("div", "solver-head", "Infinitely many solutions"), el("p", "muted-copy", `${res.free.length} free parameter(s): ${res.free.join(", ")}. Choose values for the free unknowns to pin down one solution.`));
      }
      fillSteps(steps, res.steps);
    } catch (e) {
      setSolverMsg(out, (e && e.message) || "Could not parse the system.");
      steps.replaceChildren();
    }
  };
  $("eq-solve")?.addEventListener("click", run);
  document.querySelectorAll("[data-eq-ex]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.eqEx; run(); }));
}

function initPolynomial() {
  const input = $("poly-input");
  const out = $("poly-result");
  const steps = $("poly-steps");
  const varSel = $("poly-var");
  if (!input || !out || !steps) return;
  const run = () => {
    const src = input.value.trim();
    if (!src) { setSolverMsg(out, "Enter a polynomial or equation."); steps.replaceChildren(); return; }
    try {
      const res = solvePolynomialExpression(src, { varName: varSel ? varSel.value : "x" });
      const vName = varSel ? varSel.value : "x";
      out.classList.remove("is-error");
      out.replaceChildren();
      if (res.type === "all") out.append(el("div", "solver-head", `0 = 0 — true for every ${vName}`));
      else if (res.type === "none") out.append(el("div", "solver-head", "No solution — a non-zero constant never equals zero"));
      else if (res.ok === false) setSolverMsg(out, "Durand–Kerner did not converge for this input — see the steps below.");
      else if (!res.roots.length) setSolverMsg(out, "No roots found — check the input form.");
      else {
        out.append(el("div", "solver-head", `${res.roots.length} root${res.roots.length === 1 ? "" : "s"} · degree ${res.degree}`));
        const list = el("div", "root-list");
        res.roots.forEach((r) => {
          const item = el("div", "root-item");
          item.append(el("span", "root-val", formatComplex({ re: r.re, im: r.im })));
          if (r.mult > 1) item.append(el("span", "root-mult", `multiplicity ${r.mult}`));
          item.append(el("span", "root-tag", r.im === 0 ? "real" : "complex"));
          list.append(item);
        });
        const meta = el("p", "solver-meta", `${res.exact ? "Exact closed form" : "Numerical (Durand–Kerner)"} · ${res.method} · max |p(r)| / ‖p‖ = ${Number(res.maxResidual).toExponential(1)}`);
        out.append(list, meta);
      }
      fillSteps(steps, res.steps);
    } catch (e) {
      setSolverMsg(out, (e && e.message) || "Could not parse the polynomial.");
      steps.replaceChildren();
    }
  };
  $("poly-solve")?.addEventListener("click", run);
  document.querySelectorAll("[data-poly-ex]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.polyEx; run(); }));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
}

const cxState = { z: null };
function initComplex() {
  const input = $("cx-input");
  const out = $("cx-result");
  const meta = $("cx-meta");
  if (!input || !out || !meta) return;
  const run = () => {
    const src = input.value.trim();
    if (!src) { setSolverMsg(out, "Enter an expression in i."); meta.replaceChildren(); return; }
    try {
      const z = evaluate(src, { deg: false });
      cxState.z = z;
      out.classList.remove("is-error");
      out.replaceChildren(el("div", "solver-head", formatValue(z)));
      const arg = Math.atan2(z.im + 0, z.re);
      const rows = [
        ["Real part", formatNumber(z.re)],
        ["Imaginary part", formatNumber(z.im)],
        ["Modulus |z|", formatNumber(Math.hypot(z.re, z.im))],
        ["Argument (rad)", formatNumber(arg)],
        ["Argument (deg)", formatNumber((arg * 180) / Math.PI)],
        ["Conjugate", formatValue({ re: z.re, im: -z.im })],
        ["Polar form", `${formatNumber(Math.hypot(z.re, z.im))} · e^(i·${formatNumber(arg)})`],
      ];
      meta.replaceChildren();
      rows.forEach(([k, v]) => meta.append(el("dt", "", k), el("dd", "", v)));
      drawArgand();
    } catch (e) {
      cxState.z = null;
      setSolverMsg(out, (e && e.message) || "Invalid expression.");
      meta.replaceChildren();
    }
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  $("cx-eval")?.addEventListener("click", run);
  document.querySelectorAll("[data-cx-ins]").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.cxIns;
    const s = input.selectionStart ?? input.value.length;
    const e2 = input.selectionEnd ?? input.value.length;
    const ins = t.endsWith("(") ? `${t})` : t;
    input.value = input.value.slice(0, s) + ins + input.value.slice(e2);
    const caret = t.endsWith("(") ? s + t.length : s + ins.length;
    input.setSelectionRange(caret, caret);
    input.focus();
  }));
}

function drawArgand() {
  const c = $("cx-canvas");
  if (!c) return;
  const z = cxState.z;
  const w = c.clientWidth || 420;
  const h = c.clientHeight || 420;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = cssVar("--panel", "#ffffff");
  const line = cssVar("--line", "#e7eaf2");
  const muted = cssVar("--muted", "#55637a");
  const accent = cssVar("--accent", "#4f46e5");
  const text = cssVar("--text", "#111a2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const pad = 34;
  const r = z ? Math.hypot(z.re, z.im) : 1;
  const span = Math.max(1.5, r * 1.35);
  const cx0 = w / 2;
  const cy0 = h / 2;
  const s = (Math.min(w, h) / 2 - pad) / span;
  const X = (x) => cx0 + x * s;
  const Y = (y) => cy0 - y * s;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy0 + 0.5);
  ctx.lineTo(w, cy0 + 0.5);
  ctx.moveTo(cx0 + 0.5, 0);
  ctx.lineTo(cx0 + 0.5, h);
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.font = `10px ${MONO}`;
  const unit = Math.max(1, 10 ** Math.floor(Math.log10(span / 1.2)));
  for (let k = -Math.ceil(span / unit); k <= Math.ceil(span / unit); k += 1) {
    const val = k * unit;
    if (Math.abs(val) < 1e-12) continue;
    const px = X(val);
    if (px > 6 && px < w - 6) { ctx.fillRect(px - 0.5, cy0 - 3, 1, 6); ctx.fillText(fmtN(val), px - 8, cy0 + 14); }
    const py = Y(val);
    if (py > 10 && py < h - 6) { ctx.fillRect(cx0 - 3, py - 0.5, 6, 1); ctx.fillText(fmtN(val), cx0 - 34, py + 3); }
  }
  const drawVector = (x, y) => {
    const px = X(x);
    const py = Y(y);
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.lineTo(px, py);
    ctx.stroke();
    const ang = Math.atan2(py - cy0, px - cx0);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 9 * Math.cos(ang - 0.4), py - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(px - 9 * Math.cos(ang + 0.4), py - 9 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.font = `11px ${MONO}`;
  if (z) {
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 2;
    drawVector(z.re, z.im);
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    drawVector(z.re, -z.im);
    ctx.restore();
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx0, cy0, r * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = text;
    ctx.fillText(`z = ${formatValue(z)}`, 8, 15);
    ctx.fillStyle = muted;
    ctx.fillText("solid: z · dashed: conjugate · circle: |z|", 8, h - 8);
  } else {
    ctx.fillStyle = muted;
    ctx.fillText("Evaluate an expression to see it here", 8, 15);
  }
}

const PALETTE = ["#6c7cff", "#f59e0b", "#10b981", "#e879f9", "#f43f5e", "#06b6d4"];
const gState = {
  mode: "fn",
  view: { x0: -10, x1: 10, y0: -10, y1: 10 },
  fns: [{ id: 1, expr: "sin(x)", expr2: "t", color: PALETTE[0], on: true }],
  nextId: 2,
  trace: 500,
  hover: null,
  markers: [],
  drag: null,
  pointers: new Map(),
  pinch: null,
};
let gctx = null;
let drawQueued = false;

function compileExpr(src, varName) {
  const s = String(src || "").trim();
  if (!s) return null;
  return (v) => {
    try {
      const r = evalNumber(s, { vars: { [varName]: v } });
      return Number.isFinite(r) ? r : NaN;
    } catch { return NaN; }
  };
}
function compilePolar(src) {
  const s = String(src || "").trim();
  if (!s) return null;
  return (v) => {
    try {
      const r = evalNumber(s, { vars: { theta: v, t: v } });
      return Number.isFinite(r) ? r : NaN;
    } catch { return NaN; }
  };
}
function samplePath(pointAt, t0, t1, count, span) {
  const segs = [];
  let cur = [];
  let prev = null;
  const breakLimit = Math.max(25 * span, 50);
  for (let i = 0; i <= count; i += 1) {
    const t = t0 + ((t1 - t0) * i) / count;
    const p = pointAt(t);
    if (!p) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
      prev = null;
      continue;
    }
    if (prev && (Math.abs(p.x - prev.x) > breakLimit || Math.abs(p.y - prev.y) > breakLimit)) {
      if (cur.length > 1) segs.push(cur);
      cur = [p];
    } else cur.push(p);
    prev = p;
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}
function segmentsFor(f, v, w, span) {
  if (gState.mode === "fn") {
    const fn = compileExpr(f.expr, "x");
    return fn ? sampleFunction(fn, v.x0, v.x1, Math.max(80, Math.round(w)), span) : [];
  }
  if (gState.mode === "polar") {
    const fn = compilePolar(f.expr);
    if (!fn) return [];
    return samplePath((t) => {
      const r = fn(t);
      if (!Number.isFinite(r)) return null;
      return { x: r * Math.cos(t), y: r * Math.sin(t) };
    }, v.x0, v.x1, Math.max(200, Math.round(w * 2)), span);
  }
  const px = compileExpr(f.expr, "t");
  const py = compileExpr(f.expr2, "t");
  if (!px || !py) return [];
  return samplePath((t) => {
    const x = px(t);
    const y = py(t);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }, v.x0, v.x1, Math.max(200, Math.round(w * 2)), span);
}
function activePoint(xv) {
  const f = gState.fns.find((q) => q.on);
  if (!f) return null;
  if (gState.mode === "fn") {
    const fn = compileExpr(f.expr, "x");
    const y = fn ? fn(xv) : NaN;
    return Number.isFinite(y) ? { x: xv, y } : null;
  }
  if (gState.mode === "polar") {
    const fn = compilePolar(f.expr);
    const r = fn ? fn(xv) : NaN;
    return Number.isFinite(r) ? { x: r * Math.cos(xv), y: r * Math.sin(xv), r } : null;
  }
  const ptx = compileExpr(f.expr, "t");
  const pty = compileExpr(f.expr2, "t");
  const x = ptx ? ptx(xv) : NaN;
  const y = pty ? pty(xv) : NaN;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
function traceX() {
  const v = gState.view;
  return v.x0 + ((gState.trace / 1000) * (v.x1 - v.x0));
}
function fmtTick(t) {
  return formatNumber(Number(t.toPrecision(10)));
}

function fitGraph() {
  if (!gCanvas) return;
  const w = gCanvas.clientWidth;
  const h = gCanvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (gCanvas.width !== bw || gCanvas.height !== bh) {
    gCanvas.width = bw;
    gCanvas.height = bh;
  }
  gctx = gCanvas.getContext("2d");
  if (gctx) gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawGraph() {
  if (!gctx) fitGraph();
  if (!gctx || !gCanvas) return;
  const w = gCanvas.clientWidth;
  const h = gCanvas.clientHeight;
  if (!w || !h) return;
  const v = gState.view;
  const X = (x) => ((x - v.x0) / (v.x1 - v.x0)) * w;
  const Y = (y) => h - ((y - v.y0) / (v.y1 - v.y0)) * h;
  const bg = cssVar("--panel", "#ffffff");
  const line = cssVar("--line", "#e7eaf2");
  const lineStrong = cssVar("--line-strong", "#d3dae7");
  const muted = cssVar("--muted", "#55637a");
  const accent = cssVar("--accent", "#4f46e5");
  gctx.fillStyle = bg;
  gctx.fillRect(0, 0, w, h);
  const tx = niceTicks(v.x0, v.x1, Math.max(3, Math.floor(w / 95)));
  const ty = niceTicks(v.y0, v.y1, Math.max(3, Math.floor(h / 55)));
  gctx.lineWidth = 1;
  gctx.strokeStyle = line;
  gctx.beginPath();
  for (const t of tx.ticks) {
    const px = Math.round(X(t)) + 0.5;
    if (px < 0 || px > w) continue;
    gctx.moveTo(px, 0);
    gctx.lineTo(px, h);
  }
  for (const t of ty.ticks) {
    const py = Math.round(Y(t)) + 0.5;
    if (py < 0 || py > h) continue;
    gctx.moveTo(0, py);
    gctx.lineTo(w, py);
  }
  gctx.stroke();
  gctx.strokeStyle = lineStrong;
  gctx.lineWidth = 1.25;
  gctx.beginPath();
  const y0px = Y(0);
  const x0px = X(0);
  if (y0px >= 0 && y0px <= h) { gctx.moveTo(0, y0px + 0.5); gctx.lineTo(w, y0px + 0.5); }
  if (x0px >= 0 && x0px <= w) { gctx.moveTo(x0px + 0.5, 0); gctx.lineTo(x0px + 0.5, h); }
  gctx.stroke();
  gctx.fillStyle = muted;
  gctx.font = `10px ${MONO}`;
  for (const t of tx.ticks) {
    const px = X(t);
    if (px < 8 || px > w - 8) continue;
    gctx.fillText(fmtTick(t), px - 6, h - 5);
  }
  for (const t of ty.ticks) {
    const py = Y(t);
    if (py < 10 || py > h - 14) continue;
    gctx.fillText(fmtTick(t), 4, py - 3);
  }
  const span = Math.max(v.x1 - v.x0, v.y1 - v.y0, 1e-9);
  gctx.save();
  gctx.beginPath();
  gctx.rect(0, 0, w, h);
  gctx.clip();
  for (const f of gState.fns) {
    if (!f.on) continue;
    const segs = segmentsFor(f, v, w, span);
    if (!segs.length) continue;
    gctx.strokeStyle = f.color;
    gctx.lineWidth = 2;
    gctx.globalAlpha = 1;
    gctx.beginPath();
    for (const seg of segs) {
      seg.forEach((p, i) => {
        if (i === 0) gctx.moveTo(X(p.x), Y(p.y));
        else gctx.lineTo(X(p.x), Y(p.y));
      });
    }
    gctx.stroke();
  }
  gctx.globalAlpha = 1;
  gctx.fillStyle = accent;
  gctx.strokeStyle = bg;
  gctx.lineWidth = 2;
  for (const m of gState.markers) {
    const px = X(m.x);
    const py = Y(m.y);
    if (px < -8 || px > w + 8 || py < -8 || py > h + 8) continue;
    gctx.beginPath();
    gctx.arc(px, py, 4.5, 0, Math.PI * 2);
    gctx.fill();
    gctx.stroke();
  }
  if (gState.hover) {
    const hv = gState.hover;
    gctx.save();
    gctx.setLineDash([4, 4]);
    gctx.strokeStyle = lineStrong;
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(hv.px + 0.5, 0);
    gctx.lineTo(hv.px + 0.5, h);
    gctx.stroke();
    gctx.restore();
    if (Number.isFinite(hv.fy)) {
      gctx.fillStyle = accent;
      gctx.beginPath();
      gctx.arc(X(hv.fx), Y(hv.fy), 3.5, 0, Math.PI * 2);
      gctx.fill();
    }
  }
  const tv = traceX();
  const tpt = activePoint(tv);
  const traceLabel = $("g-trace-out");
  if (tpt) {
    gctx.fillStyle = accent;
    gctx.strokeStyle = bg;
    gctx.lineWidth = 2;
    gctx.beginPath();
    gctx.arc(X(tpt.x), Y(tpt.y), 5, 0, Math.PI * 2);
    gctx.fill();
    gctx.stroke();
    if (traceLabel) {
      if (gState.mode === "fn") traceLabel.textContent = `x = ${fmtN(Number(tv.toPrecision(10)))} · y = ${fmtN(Number(tpt.y.toPrecision(10)))}`;
      else if (gState.mode === "polar") traceLabel.textContent = `θ = ${fmtN(Number(tv.toPrecision(10)))} · r = ${fmtN(Number((tpt.r ?? Math.hypot(tpt.x, tpt.y)).toPrecision(10)))}`;
      else traceLabel.textContent = `t = ${fmtN(Number(tv.toPrecision(10)))} · (${fmtN(Number(tpt.x.toPrecision(10)))}, ${fmtN(Number(tpt.y.toPrecision(10)))})`;
    }
  } else if (traceLabel) traceLabel.textContent = "—";
  gctx.restore();
}

function scheduleDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    drawGraph();
  });
}
function syncViewFields() {
  const v = gState.view;
  const f = (n) => String(Number(n.toPrecision(10)));
  const set = (id, val) => { const e2 = $(id); if (e2) e2.value = val; };
  set("g-x0", f(v.x0));
  set("g-x1", f(v.x1));
  set("g-y0", f(v.y0));
  set("g-y1", f(v.y1));
}
function readViewFields() {
  const x0 = Number($("g-x0")?.value);
  const x1 = Number($("g-x1")?.value);
  const y0 = Number($("g-y0")?.value);
  const y1 = Number($("g-y1")?.value);
  if (![x0, x1, y0, y1].every(Number.isFinite) || x0 === x1 || y0 === y1) return null;
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) };
}
function clearAnalysis() {
  gState.markers = [];
  $("g-findings")?.replaceChildren();
}
function addFinding(text) {
  $("g-findings")?.append(el("li", "", text));
}
function modePrefix() {
  return gState.mode === "fn" ? "y =" : gState.mode === "polar" ? "r(θ) =" : "x(t) =";
}
function renderFnList() {
  if (!gList) return;
  gList.replaceChildren();
  for (const f of gState.fns) {
    const row = el("div", "fn-row");
    const sw = el("span", "fn-swatch");
    sw.style.background = f.color;
    row.append(sw, el("span", "fn-label", modePrefix()));
    const i1 = el("input", "fn-expr");
    i1.type = "text";
    i1.value = f.expr;
    i1.spellcheck = false;
    i1.placeholder = gState.mode === "fn" ? "e.g. sin(x)/x" : gState.mode === "polar" ? "e.g. 2 + cos(3*theta)" : "e.g. cos(t)";
    i1.setAttribute("aria-label", `Function expression ${modePrefix()}`);
    i1.addEventListener("input", () => { f.expr = i1.value; clearAnalysis(); scheduleDraw(); });
    row.append(i1);
    if (gState.mode === "param") {
      row.append(el("span", "fn-label", "y(t) ="));
      const i2 = el("input", "fn-expr");
      i2.type = "text";
      i2.value = f.expr2 || "";
      i2.spellcheck = false;
      i2.placeholder = "e.g. sin(t)";
      i2.setAttribute("aria-label", "Function expression y(t)");
      i2.addEventListener("input", () => { f.expr2 = i2.value; clearAnalysis(); scheduleDraw(); });
      row.append(i2);
    }
    const eye = el("button", "fn-eye" + (f.on ? "" : " is-off"), f.on ? "on" : "off");
    eye.type = "button";
    eye.setAttribute("aria-pressed", String(f.on));
    eye.setAttribute("aria-label", "Show or hide this function");
    eye.addEventListener("click", () => { f.on = !f.on; renderFnList(); clearAnalysis(); scheduleDraw(); });
    const del = el("button", "fn-del", "×");
    del.type = "button";
    del.setAttribute("aria-label", "Remove this function");
    del.addEventListener("click", () => { gState.fns = gState.fns.filter((x) => x !== f); renderFnList(); clearAnalysis(); scheduleDraw(); });
    row.append(eye, del);
    gList.append(row);
  }
}
function zoomAt(px, py, k) {
  const v = gState.view;
  const w = gCanvas.clientWidth || 1;
  const h = gCanvas.clientHeight || 1;
  const ax = v.x0 + (px / w) * (v.x1 - v.x0);
  const ay = v.y0 + ((h - py) / h) * (v.y1 - v.y0);
  const nx0 = ax + (v.x0 - ax) * k;
  const nx1 = ax + (v.x1 - ax) * k;
  const ny0 = ay + (v.y0 - ay) * k;
  const ny1 = ay + (v.y1 - ay) * k;
  if (nx1 - nx0 < 1e-6 || nx1 - nx0 > 1e12 || ny1 - ny0 < 1e-6 || ny1 - ny0 > 1e12) return;
  gState.view = { x0: nx0, x1: nx1, y0: ny0, y1: ny1 };
  syncViewFields();
  scheduleDraw();
}
function updateHover(e2) {
  if (!gCanvas) return;
  const rect = gCanvas.getBoundingClientRect();
  const px = e2.clientX - rect.left;
  const py = e2.clientY - rect.top;
  if (px < 0 || py < 0 || px > rect.width || py > rect.height) {
    gState.hover = null;
    if (gRead) gRead.textContent = "—";
    scheduleDraw();
    return;
  }
  const v = gState.view;
  const xv = v.x0 + (px / rect.width) * (v.x1 - v.x0);
  const pt = activePoint(xv);
  gState.hover = { px, fx: pt ? pt.x : NaN, fy: pt ? pt.y : NaN };
  if (gRead) {
    const xTxt = fmtN(Number(xv.toPrecision(10)));
    if (gState.mode === "fn") gRead.textContent = pt ? `x = ${xTxt} · y = ${fmtN(Number(pt.y.toPrecision(10)))}` : `x = ${xTxt}`;
    else if (gState.mode === "polar") gRead.textContent = pt ? `θ = ${xTxt} · (${fmtN(Number(pt.x.toPrecision(10)))}, ${fmtN(Number(pt.y.toPrecision(10)))})` : `θ = ${xTxt}`;
    else gRead.textContent = pt ? `t = ${xTxt} · (${fmtN(Number(pt.x.toPrecision(10)))}, ${fmtN(Number(pt.y.toPrecision(10)))})` : `t = ${xTxt}`;
  }
  scheduleDraw();
}
function analyzeRoots() {
  clearAnalysis();
  if (gState.mode !== "fn") { addFinding("Roots are computed for y = f(x) mode."); return; }
  const on = gState.fns.filter((f) => f.on);
  if (!on.length) { addFinding("Turn on a function first."); return; }
  for (const f of on) {
    const fn = compileExpr(f.expr, "x");
    if (!fn) continue;
    const roots = findRoots(fn, gState.view.x0, gState.view.x1);
    if (roots.length) {
      roots.slice(0, 24).forEach((r) => gState.markers.push({ x: r, y: 0 }));
      addFinding(`${f.expr}: ${roots.length} root${roots.length === 1 ? "" : "s"} at x = ${roots.slice(0, 12).map(fmtN).join(", ")}${roots.length > 12 ? " …" : ""}`);
    } else {
      addFinding(`${f.expr}: no sign changes in the visible range (roots of even multiplicity can hide without one).`);
    }
  }
  scheduleDraw();
}
function analyzeIntersections() {
  clearAnalysis();
  if (gState.mode !== "fn") { addFinding("Intersections are computed for y = f(x) mode."); return; }
  const on = gState.fns.filter((f) => f.on).slice(0, 5);
  if (on.length < 2) { addFinding("Turn on at least two functions to find intersections."); return; }
  let found = 0;
  for (let i = 0; i < on.length; i += 1) {
    for (let j = i + 1; j < on.length; j += 1) {
      const f1 = compileExpr(on[i].expr, "x");
      const f2 = compileExpr(on[j].expr, "x");
      if (!f1 || !f2) continue;
      const roots = findRoots((x) => f1(x) - f2(x), gState.view.x0, gState.view.x1);
      for (const r of roots.slice(0, 8)) {
        const y = f1(r);
        if (!Number.isFinite(y)) continue;
        gState.markers.push({ x: r, y });
        found += 1;
        addFinding(`${on[i].expr} ∩ ${on[j].expr} at (${fmtN(r)}, ${fmtN(y)})`);
      }
    }
  }
  if (!found) addFinding("No intersections in the visible range.");
  scheduleDraw();
}
function analyzeExtrema() {
  clearAnalysis();
  if (gState.mode !== "fn") { addFinding("Extrema are computed for y = f(x) mode."); return; }
  const on = gState.fns.filter((f) => f.on);
  if (!on.length) { addFinding("Turn on a function first."); return; }
  let found = 0;
  for (const f of on) {
    const fn = compileExpr(f.expr, "x");
    if (!fn) continue;
    const pts = findExtrema(fn, gState.view.x0, gState.view.x1).slice(0, 10);
    for (const p of pts) {
      gState.markers.push({ x: p.x, y: p.y });
      found += 1;
      addFinding(`${f.expr}: local ${p.type} at (${fmtN(p.x)}, ${fmtN(p.y)})`);
    }
  }
  if (!found) addFinding("No local extrema found in the visible range.");
  scheduleDraw();
}

function initGraph() {
  if (!gCanvas) return;
  renderFnList();
  syncViewFields();
  $("g-apply")?.addEventListener("click", () => {
    const v = readViewFields();
    if (!v) { if (gRead) gRead.textContent = "Invalid range — x min < x max and y min < y max"; return; }
    gState.view = v;
    clearAnalysis();
    scheduleDraw();
  });
  $("g-reset")?.addEventListener("click", () => {
    gState.view = { x0: -10, x1: 10, y0: -10, y1: 10 };
    syncViewFields();
    clearAnalysis();
    scheduleDraw();
  });
  $("g-fit")?.addEventListener("click", () => {
    if (gState.mode !== "fn") { if (gRead) gRead.textContent = "Fit Y applies to y = f(x) mode"; return; }
    let lo = Infinity;
    let hi = -Infinity;
    for (const f of gState.fns) {
      if (!f.on) continue;
      const fn = compileExpr(f.expr, "x");
      if (!fn) continue;
      for (let i = 0; i <= 400; i += 1) {
        const x = gState.view.x0 + ((gState.view.x1 - gState.view.x0) * i) / 400;
        const y = fn(x);
        if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { if (gRead) gRead.textContent = "Nothing visible to fit"; return; }
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    gState.view.y0 = lo - pad;
    gState.view.y1 = hi + pad;
    syncViewFields();
    scheduleDraw();
  });
  $("g-add")?.addEventListener("click", () => {
    gState.fns.push({ id: gState.nextId, expr: "", expr2: "", color: PALETTE[gState.fns.length % PALETTE.length], on: true });
    gState.nextId += 1;
    renderFnList();
    const rows = gList ? gList.querySelectorAll(".fn-expr") : [];
    rows[rows.length - 1]?.focus();
    scheduleDraw();
  });
  $("g-roots")?.addEventListener("click", analyzeRoots);
  $("g-inter")?.addEventListener("click", analyzeIntersections);
  $("g-ext")?.addEventListener("click", analyzeExtrema);
  $("g-export")?.addEventListener("click", () => {
    gCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = el("a");
      a.href = url;
      a.download = "parchxa-graph.png";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    });
  });
  $("g-mode")?.addEventListener("change", (e2) => {
    gState.mode = e2.target.value;
    if (gState.mode === "fn") gState.view = { x0: -10, x1: 10, y0: gState.view.y0, y1: gState.view.y1 };
    else if (gState.mode === "polar") gState.view = { ...gState.view, x0: 0, x1: 6.283185307179586 };
    else gState.view = { ...gState.view, x0: 0, x1: 10 };
    clearAnalysis();
    renderFnList();
    syncViewFields();
    scheduleDraw();
  });
  $("g-trace")?.addEventListener("input", (e2) => {
    gState.trace = Number(e2.target.value);
    scheduleDraw();
  });
  gCanvas.addEventListener("wheel", (e2) => {
    e2.preventDefault();
    const rect = gCanvas.getBoundingClientRect();
    zoomAt(e2.clientX - rect.left, e2.clientY - rect.top, Math.exp(e2.deltaY * 0.0015));
  }, { passive: false });
  gCanvas.addEventListener("pointerdown", (e2) => {
    gCanvas.setPointerCapture(e2.pointerId);
    gState.pointers.set(e2.pointerId, { x: e2.clientX, y: e2.clientY });
    if (gState.pointers.size === 1) {
      gState.drag = { x: e2.clientX, y: e2.clientY, ...gState.view };
    } else if (gState.pointers.size === 2) {
      const [p1, p2] = Array.from(gState.pointers.values());
      gState.pinch = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y), view: { ...gState.view } };
      gState.drag = null;
    }
  });
  gCanvas.addEventListener("pointermove", (e2) => {
    if (gState.pointers.has(e2.pointerId)) {
      gState.pointers.set(e2.pointerId, { x: e2.clientX, y: e2.clientY });
      if (gState.pointers.size >= 2 && gState.pinch) {
        const [p1, p2] = Array.from(gState.pointers.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (gState.pinch.dist > 8 && dist > 8) {
          const k = gState.pinch.dist / dist;
          const rect = gCanvas.getBoundingClientRect();
          const mx = (p1.x + p2.x) / 2 - rect.left;
          const my = (p1.y + p2.y) / 2 - rect.top;
          const w = gCanvas.clientWidth || 1;
          const h = gCanvas.clientHeight || 1;
          const v0 = gState.pinch.view;
          const ax = v0.x0 + (mx / w) * (v0.x1 - v0.x0);
          const ay = v0.y0 + ((h - my) / h) * (v0.y1 - v0.y0);
          const nx0 = ax + (v0.x0 - ax) * k;
          const nx1 = ax + (v0.x1 - ax) * k;
          const ny0 = ay + (v0.y0 - ay) * k;
          const ny1 = ay + (v0.y1 - ay) * k;
          if (nx1 - nx0 >= 1e-6 && nx1 - nx0 <= 1e12 && ny1 - ny0 >= 1e-6 && ny1 - ny0 <= 1e12) {
            gState.view = { x0: nx0, x1: nx1, y0: ny0, y1: ny1 };
            syncViewFields();
          }
        }
      } else if (gState.drag) {
        const d = gState.drag;
        const dx = e2.clientX - d.x;
        const dy = e2.clientY - d.y;
        const w = gCanvas.clientWidth || 1;
        const h = gCanvas.clientHeight || 1;
        gState.view = {
          x0: d.x0 - (dx / w) * (d.x1 - d.x0),
          x1: d.x1 - (dx / w) * (d.x1 - d.x0),
          y0: d.y0 + (dy / h) * (d.y1 - d.y0),
          y1: d.y1 + (dy / h) * (d.y1 - d.y0),
        };
        syncViewFields();
      }
      updateHover(e2);
      scheduleDraw();
      return;
    }
    updateHover(e2);
  });
  const endPointer = (e2) => {
    gState.pointers.delete(e2.pointerId);
    if (gState.pointers.size >= 2) {
      const [p1, p2] = Array.from(gState.pointers.values());
      gState.pinch = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y), view: { ...gState.view } };
      gState.drag = null;
    } else if (gState.pointers.size === 1) {
      const [p1] = Array.from(gState.pointers.values());
      gState.pinch = null;
      gState.drag = { x: p1.x, y: p1.y, ...gState.view };
    } else {
      gState.pinch = null;
      gState.drag = null;
    }
  };
  gCanvas.addEventListener("pointerup", endPointer);
  gCanvas.addEventListener("pointercancel", endPointer);
  gCanvas.addEventListener("pointerleave", () => {
    if (gState.pointers.size) return;
    gState.hover = null;
    if (gRead) gRead.textContent = "—";
    scheduleDraw();
  });
  new ResizeObserver(() => {
    if (activeMode !== "graphing") return;
    fitGraph();
    scheduleDraw();
  }).observe(gCanvas);
}

function realAt(id) {
  const raw = $(id) ? $(id).value : "";
  let v = NaN;
  try { v = evalNumber(raw); } catch { v = NaN; }
  if (!Number.isFinite(v)) throw new Error(`"${raw}" is not a real number`);
  return v;
}
function fnFrom(id) {
  const src = ($(id) ? $(id).value : "").trim();
  if (!src) throw new Error("Enter an expression for f(x)");
  return {
    src,
    fn: (x) => {
      try {
        const v = evalNumber(src, { vars: { x } });
        return Number.isFinite(v) ? v : NaN;
      } catch { return NaN; }
    },
  };
}
function hasNerd() {
  return typeof nerdamer !== "undefined";
}
function symInfo(build) {
  if (!hasNerd()) return null;
  try {
    const s = build();
    if (!s) return null;
    const ascii = String(s.toString());
    const tex = typeof s.toTeX === "function" ? String(s.toTeX()) : null;
    return { ascii, tex };
  } catch { return null; }
}
function renderTeX(box, tex, ascii) {
  if (typeof katex !== "undefined" && tex) {
    try {
      katex.render(tex, box, { throwOnError: false });
      return;
    } catch {}
  }
  box.textContent = ascii || tex || "";
}

function initCalculus() {
  $("d-go")?.addEventListener("click", () => {
    const out = $("d-result");
    try {
      const { src, fn } = fnFrom("d-expr");
      const x0 = realAt("d-x");
      const d = derivative(fn, x0);
      if (!Number.isFinite(d)) throw new Error("Derivative is not finite at this point");
      const h1 = Math.cbrt(2.2e-16) * Math.max(1, Math.abs(x0));
      const dA = (fn(x0 + h1) - fn(x0 - h1)) / (2 * h1);
      const h2 = h1 / 4;
      const dB = (fn(x0 + h2) - fn(x0 - h2)) / (2 * h2);
      const delta = Math.abs(dA - dB);
      out.classList.remove("is-error");
      out.replaceChildren();
      out.append(el("div", "solver-head", `f′(${formatNumber(x0)}) ≈ ${formatNumber(d)}`));
      out.append(el("div", "solver-meta", `Central-difference cross-check at two step sizes: agreement ${Number.isFinite(delta) ? delta.toExponential(1) : "n/a"}`));
      const sym = symInfo(() => nerdamer(`diff(${src}, x)`));
      if (sym && sym.tex) {
        out.append(el("div", "solver-meta", "Symbolic derivative:"));
        const box = el("div", "solver-tex");
        renderTeX(box, sym.tex, sym.ascii);
        out.append(box);
      } else if (sym) out.append(el("div", "solver-meta", `Symbolic derivative: ${sym.ascii}`));
      else out.append(el("div", "solver-meta", "Symbolic form unavailable in this build — numeric result only."));
    } catch (e) { setSolverMsg(out, (e && e.message) || "Could not differentiate."); }
  });
  $("i-go")?.addEventListener("click", () => {
    const out = $("i-result");
    try {
      const { src, fn } = fnFrom("i-expr");
      const a = realAt("i-a");
      const b = realAt("i-b");
      const res = definiteIntegral(fn, a, b);
      if (!res.ok) throw new Error(res.reason || "The integral did not converge — check for discontinuities in the range.");
      out.classList.remove("is-error");
      out.replaceChildren();
      out.append(el("div", "solver-head", `∫ from ${formatNumber(a)} to ${formatNumber(b)} of f(x) dx ≈ ${formatNumber(res.value)}`));
      out.append(el("div", "solver-meta", `Adaptive Simpson · ${res.evals} function evaluations · estimated error ≤ ${Number(res.error).toExponential(1)}`));
      const sym = symInfo(() => nerdamer(`defint(${src}, x, ${a}, ${b})`));
      if (sym) {
        const m = sym.ascii.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
        if (m && Number(m[2]) !== 0) {
          const exact = Number(m[1]) / Number(m[2]);
          const agree = Math.abs(exact - res.value) <= 1e-6 * Math.max(1, Math.abs(exact));
          out.append(el("div", "solver-meta", `Symbolic result: ${sym.ascii}${agree ? " — matches the numeric value" : " — differs from the numeric value, verify before use"}`));
        } else out.append(el("div", "solver-meta", `Symbolic result: ${sym.ascii}`));
      } else out.append(el("div", "solver-meta", "Symbolic antiderivative unavailable in this build — numeric result only."));
    } catch (e) { setSolverMsg(out, (e && e.message) || "Could not integrate."); }
  });
  $("l-go")?.addEventListener("click", () => {
    const out = $("l-result");
    try {
      const { src, fn } = fnFrom("l-expr");
      const x0 = realAt("l-x");
      const res = limitNumeric(fn, x0);
      out.classList.remove("is-error");
      out.replaceChildren();
      if (res.ok) out.append(el("div", "solver-head", `lim as x → ${formatNumber(x0)} ≈ ${formatNumber(res.value)}`));
      else {
        out.append(el("div", "solver-head", `No stable common limit at x → ${formatNumber(x0)}`));
        out.append(el("div", "solver-meta", `From the left ≈ ${fmtMaybe(res.left)} · from the right ≈ ${fmtMaybe(res.right)} — reported honestly instead of guessed.`));
      }
      const sym = symInfo(() => nerdamer(`limit(${src}, x, ${x0})`));
      if (sym) out.append(el("div", "solver-meta", `Symbolic limit: ${sym.ascii}`));
      else out.append(el("div", "solver-meta", "Sampled numerically from both sides with shrinking step sizes."));
    } catch (e) { setSolverMsg(out, (e && e.message) || "Could not evaluate the limit."); }
  });
  $("r-go")?.addEventListener("click", () => {
    const out = $("r-result");
    try {
      const { fn } = fnFrom("r-expr");
      const a = realAt("r-a");
      const b = realAt("r-b");
      if (a >= b) throw new Error("Range start must be below range end");
      const roots = findRoots(fn, a, b);
      out.classList.remove("is-error");
      out.replaceChildren();
      if (!roots.length) {
        out.append(el("div", "solver-head", `No sign changes in [${formatNumber(a)}, ${formatNumber(b)}]`));
        out.append(el("div", "solver-meta", "Roots of even multiplicity can exist without a sign change — check the graph to be sure."));
      } else {
        out.append(el("div", "solver-head", `${roots.length} root${roots.length === 1 ? "" : "s"} in [${formatNumber(a)}, ${formatNumber(b)}]`));
        const list = el("div", "root-list");
        for (const r of roots.slice(0, 20)) {
          const item = el("div", "root-item");
          item.append(el("span", "root-val", `x ≈ ${formatNumber(r)}`));
          item.append(el("span", "root-tag", `|f(x)| = ${Number(Math.abs(fn(r))).toExponential(1)}`));
          list.append(item);
        }
        out.append(list);
      }
    } catch (e) { setSolverMsg(out, (e && e.message) || "Could not scan the range."); }
  });
}

function fmtMatrix(M) {
  const cells = M.map((row) => row.map((v) => formatNumber(v)));
  const widths = [];
  for (const row of cells) row.forEach((c, i) => { widths[i] = Math.max(widths[i] || 0, c.length); });
  return cells.map((row) => row.map((c, i) => c.padStart(widths[i])).join("  ")).join("\n");
}
function initMatrices() {
  const out = $("mx-out");
  if (!out) return;
  const run = (fn) => {
    try {
      const A = parseMatrixText($("mx-input") ? $("mx-input").value : "");
      const text = fn(A);
      out.classList.remove("is-error");
      out.textContent = text;
    } catch (e) {
      out.classList.add("is-error");
      out.textContent = (e && e.message) || "Could not read the matrix.";
    }
  };
  $("mx-det")?.addEventListener("click", () => run((A) => {
    const d = matDet(A);
    return `det(A) = ${formatNumber(d.value)}${d.singular ? "  (singular — a zero pivot was found)" : ""}`;
  }));
  $("mx-inv")?.addEventListener("click", () => run((A) => {
    const inv = matInverse(A);
    if (!inv) throw new Error("Matrix is singular — the inverse does not exist");
    return `A⁻¹ =\n${fmtMatrix(inv)}`;
  }));
  $("mx-rank")?.addEventListener("click", () => run((A) => `rank(A) = ${matRank(A)} (rows: ${A.length}, columns: ${A[0].length})`));
  $("mx-tr")?.addEventListener("click", () => run((A) => `trace(A) = ${formatNumber(A.reduce((s, row, i) => s + (row[i] ?? 0), 0))}`));
  $("mx-t")?.addEventListener("click", () => run((A) => {
    const T = A[0].map((_, j) => A.map((row) => row[j]));
    return `Aᵀ =\n${fmtMatrix(T)}`;
  }));
  $("mx-eig")?.addEventListener("click", () => run((A) => {
    const e = matEigen(A);
    const lines = [];
    e.values.forEach((l, i) => {
      const v = e.vectors[i];
      lines.push(`λ${subNum(i + 1)} = ${formatComplex(l)}   v${subNum(i + 1)} = [${v.map((c) => formatComplex(c)).join(", ")}]`);
    });
    let worst = 0;
    e.values.forEach((l, i) => {
      const v = e.vectors[i];
      A.forEach((row, r) => {
        let are = 0;
        let aim = 0;
        row.forEach((a, c) => { are += a * v[c].re; aim += a * v[c].im; });
        const lre = l.re * v[r].re - l.im * v[r].im;
        const lim = l.re * v[r].im + l.im * v[r].re;
        worst = Math.max(worst, Math.hypot(are - lre, aim - lim));
      });
    });
    lines.push(`Verification: max ‖Av − λv‖ = ${worst.toExponential(1)} ${worst < 1e-8 ? "✓" : "⚠ check the input"}`);
    return lines.join("\n");
  }));
}

function ntBig(id) {
  const field = $(id);
  const raw = (field ? field.value : "").trim().replace(/^#/, "").replace(/\s+/g, "");
  if (!/^-?\d+$/.test(raw)) throw new Error(`"${field ? field.value : ""}" is not an integer`);
  return BigInt(raw);
}
function initNumberTheory() {
  const out = $("nt-out");
  if (!out) return;
  const run = (fn) => {
    try {
      out.classList.remove("is-error");
      out.textContent = fn();
    } catch (e) {
      out.classList.add("is-error");
      out.textContent = (e && e.message) || "Could not compute.";
    }
  };
  $("nt-factors")?.addEventListener("click", () => run(() => {
    const a = ntBig("nt-a");
    if (a < 2n) throw new Error("Prime factorization needs a number ≥ 2");
    const groups = primeFactors(a);
    return `${a} = ${groups.map((g) => (g.k > 1 ? `${g.p}^${g.k}` : String(g.p))).join(" × ")}`;
  }));
  $("nt-prime")?.addEventListener("click", () => run(() => {
    const a = ntBig("nt-a");
    return isPrime(a) ? `${a} is prime.` : `${a} is not prime.`;
  }));
  $("nt-gcd")?.addEventListener("click", () => run(() => {
    const a = ntBig("nt-a");
    const b = ntBig("nt-b");
    return `GCD(${a}, ${b}) = ${bigIntGcd(a, b)}`;
  }));
  $("nt-lcm")?.addEventListener("click", () => run(() => {
    const a = ntBig("nt-a");
    const b = ntBig("nt-b");
    return `LCM(${a}, ${b}) = ${bigIntLcm(a, b)}`;
  }));
  $("nt-modpow")?.addEventListener("click", () => run(() => {
    const a = ntBig("nt-a");
    const e = ntBig("nt-e");
    const m = ntBig("nt-m");
    if (m <= 0n) throw new Error("Modulus must be positive");
    if (m === 1n) return `${a}^${e} mod ${m} = 0`;
    if (e >= 0n) return `${a}^${e} mod ${m} = ${powMod(a, e, m)}`;
    const inv = modInverse(a, m);
    if (inv === null) throw new Error("A negative exponent needs gcd(a, m) = 1 so a modular inverse exists");
    return `${a}^${e} mod ${m} = (a⁻¹)^${-e} mod ${m} = ${powMod(inv, -e, m)}`;
  }));
}

function openKbd() {
  const k = $("kbd-pop");
  if (!k) return;
  k.hidden = false;
  $("kbd-close")?.focus();
}
function closeKbd() {
  const k = $("kbd-pop");
  if (!k) return;
  k.hidden = true;
  $("kbd-btn")?.focus();
}
function initShortcuts() {
  $("kbd-btn")?.addEventListener("click", openKbd);
  $("kbd-close")?.addEventListener("click", closeKbd);
  $("kbd-pop")?.addEventListener("click", (e) => { if (e.target === $("kbd-pop")) closeKbd(); });
}

new MutationObserver(() => {
  if (activeMode === "graphing") scheduleDraw();
  if (cxState.z && activeMode === "complex") drawArgand();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

initTabs();
initSci();
initHistory();
initEquations();
initPolynomial();
initComplex();
initGraph();
initCalculus();
initMatrices();
initNumberTheory();
initShortcuts();
activate("scientific");
