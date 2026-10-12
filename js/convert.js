import "./app.js";
import "./site.js";
const $ = (id) => document.getElementById(id);
const root = document.querySelector("[data-from]");
const FROM = root.dataset.from, TO = root.dataset.to, KEY = `parchxa.fx.${FROM}.v1`;
const fmt = (n, d = 4) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "—");
let rate = NaN, source = "";
const cached = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.rates && Date.now() - v.t < 3600e3 * 6 ? v : null; } catch { return null; } };

async function loadRate() {
  const hit = cached();
  if (hit && Number.isFinite(hit.rates[TO])) { rate = hit.rates[TO]; source = "Indicative rate cached " + new Date(hit.t).toLocaleTimeString() + " (open.er-api.com)."; return; }
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://open.er-api.com/v6/latest/${FROM}`, { signal: ctrl.signal });
    const j = await res.json();
    if (j.result !== "success" || !Number.isFinite(j.rates?.[TO])) throw new Error("bad");
    rate = j.rates[TO]; source = "Indicative mid-market rate from open.er-api.com, updated " + (j.time_last_update_utc || "recently") + ".";
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), rates: j.rates })); } catch {}
  } catch { source = "Live rate unavailable (offline or blocked). Enter a rate manually below."; }
}
function calc() {
  const amt = Number($("amount").value), manual = Number($("manual").value), r = manual > 0 ? manual : rate;
  const out = amt * r;
  $("out").textContent = Number.isFinite(out) && amt >= 0 ? `${fmt(out, 2)} ${TO}` : "—";
  $("rate-line").textContent = Number.isFinite(r) ? `1 ${FROM} = ${fmt(r)} ${TO} · 1 ${TO} = ${fmt(1 / r)} ${FROM}` : "No rate available yet.";
  $("src").textContent = manual > 0 ? "Using your manual rate." : source;
  const body = $("tbl"); body.replaceChildren();
  if (Number.isFinite(r)) [1, 5, 10, 50, 100, 500, 1000, 5000].forEach((a) => { const tr = document.createElement("tr"); [`${a.toLocaleString()} ${FROM}`, `${fmt(a * r, 2)} ${TO}`].forEach((t) => tr.append(Object.assign(document.createElement("td"), { textContent: t }))); body.append(tr); });
}
$("amount").addEventListener("input", calc); $("manual").addEventListener("input", calc);
$("swap").addEventListener("click", () => { location.href = `convert-${TO.toLowerCase()}-to-${FROM.toLowerCase()}.html`; });
loadRate().then(calc); calc();
