import "./app.js";
import "./site.js";
import { positionSize, rMultiples, breakevenWinRate, expectancyR, kelly, liquidationPrice, monteCarlo } from "./quant.js";

const $ = (id) => document.getElementById(id);
const val = (form, name) => Number(form.elements[name]?.value);
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "—");
const set = (id, text) => { const n = $(id); if (n) n.textContent = text; };

// URL state (shareable)
const params = new URLSearchParams(location.search);
document.querySelectorAll("form.calc-form").forEach((form) => {
  for (const [k, v] of params) { if (!k.startsWith(form.id + ".")) continue; const f = form.elements.namedItem(k.slice(form.id.length + 1)); if (f && v !== "" && v.length < 24) f.value = v; }
});
function syncUrl() {
  const p = new URLSearchParams();
  document.querySelectorAll("form.calc-form").forEach((form) => [...form.elements].forEach((f) => { if (f.name && f.value !== "") p.set(form.id + "." + f.name, f.value); }));
  history.replaceState(null, "", "?" + p.toString());
}

function calcSize() {
  const f = $("size-form");
  const r = positionSize({ equity: val(f, "equity"), riskPct: val(f, "riskPct"), entry: val(f, "entry"), stop: val(f, "stop"), feePct: val(f, "fee") });
  if (!r) { set("size-result", "—"); set("size-detail", "Enter positive equity, risk %, entry and a stop that differs from entry."); return; }
  set("size-result", fmt(r.units, 6) + " units");
  const target = val(f, "target");
  const rm = Number.isFinite(target) && target > 0 ? rMultiples({ entry: val(f, "entry"), stop: val(f, "stop"), targets: [target] })[0] : null;
  set("size-detail", `${r.side.toUpperCase()} · risking ${fmt(r.riskAmount)} · position value ${fmt(r.notional)} · stop ${fmt(r.stopDistancePct)}% away` + (rm ? ` · target = ${fmt(rm.r)}R` : ""));
}
function calcLiq() {
  const f = $("liq-form");
  const lev = val(f, "leverage"), entry = val(f, "lentry"), side = f.elements.side.value, mmr = val(f, "mmr") / 100;
  const price = liquidationPrice({ entry, leverage: lev, side, mmr });
  set("liq-result", fmt(price));
  set("liq-detail", Number.isFinite(price) ? `≈ ${fmt(Math.abs(price - entry) / entry * 100)}% against your entry. Exchanges use different formulas; always verify on your venue.` : "Enter an entry price and leverage of at least 1.");
}
function calcEdge() {
  const f = $("edge-form");
  const p = val(f, "win") / 100, b = val(f, "rr");
  const be = breakevenWinRate(b) * 100, ex = expectancyR(p, b), k = kelly(p, b) * 100;
  set("edge-result", Number.isFinite(ex) ? fmt(ex, 3) + " R per trade" : "—");
  set("edge-detail", `Break-even win rate ${fmt(be, 1)}% · full Kelly ${fmt(k, 1)}% · half Kelly ${fmt(k / 2, 1)}% of equity per trade (before fees). Kelly assumes your inputs are exact; they never are.`);
}

function drawFan(res) {
  const c = $("fan"); if (!c || !res) return;
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = 280;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim() || "#b5f36d", muted = css.getPropertyValue("--muted").trim() || "#9ba9bd", line = css.getPropertyValue("--line").trim() || "#26334a";
  const [b5, b25, b50, b75, b95] = res.bands, n = b50.length;
  const lo = Math.min(...b5, 1), hi = Math.max(...b95, 1), pad = { l: 44, r: 10, t: 10, b: 24 };
  const X = (i) => pad.l + (i / (n - 1)) * (w - pad.l - pad.r), Y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  g.strokeStyle = line; g.fillStyle = muted; g.font = "10px sans-serif"; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke(); g.fillText(v.toFixed(2) + "×", 4, y + 3); }
  const band = (upper, lower, alpha) => { g.beginPath(); upper.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); for (let i = n - 1; i >= 0; i--) g.lineTo(X(i), Y(lower[i])); g.closePath(); g.globalAlpha = alpha; g.fillStyle = accent; g.fill(); g.globalAlpha = 1; };
  band(b95, b5, 0.14); band(b75, b25, 0.28);
  g.beginPath(); b50.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.strokeStyle = accent; g.lineWidth = 2; g.stroke();
  g.strokeStyle = muted; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pad.l, Y(1)); g.lineTo(w - pad.r, Y(1)); g.stroke(); g.setLineDash([]);
  g.fillStyle = muted; g.fillText("trade 0", pad.l, h - 6); g.fillText("trade " + (n - 1), w - pad.r - 42, h - 6);
}
function calcMc() {
  const f = $("mc-form");
  const res = monteCarlo({ p: val(f, "win") / 100, b: val(f, "rr"), riskFrac: val(f, "risk") / 100, trades: Math.min(500, Math.max(10, val(f, "trades") || 100)), paths: 1000, seed: 42, ruinPct: val(f, "ruin") / 100 });
  if (!res) { set("mc-result", "—"); set("mc-detail", "Win rate must be 0–100%, reward:risk above 0, risk between 0% and 100%."); return; }
  set("mc-result", `${fmt(res.probRuin * 100, 1)}% chance of ruin`);
  const [b5, , b50, , b95] = res.bands, last = b50.length - 1;
  set("mc-detail", `1,000 simulated paths (seed 42). Median ending equity ${fmt(b50[last], 2)}×; 5th–95th percentile ${fmt(b5[last], 2)}×–${fmt(b95[last], 2)}×. Median worst drawdown ${fmt(res.medianMaxDrawdown * 100, 1)}%, 95th percentile ${fmt(res.p95MaxDrawdown * 100, 1)}%.`);
  $("fan").setAttribute("aria-label", `Monte Carlo equity fan chart. Median ending equity ${fmt(b50[last], 2)} times start, ranging ${fmt(b5[last], 2)} to ${fmt(b95[last], 2)} between the 5th and 95th percentile.`);
  drawFan(res);
}

const run = { "size-form": calcSize, "liq-form": calcLiq, "edge-form": calcEdge, "mc-form": calcMc };
for (const [id, fn] of Object.entries(run)) {
  const form = $(id); if (!form) continue;
  form.addEventListener("input", () => { fn(); syncUrl(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); fn(); });
  fn();
}
let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(calcMc, 150); });
