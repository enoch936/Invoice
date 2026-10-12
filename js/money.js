import "./app.js";
import "./site.js";
import { taxSetAside, futureValue, cagr } from "./quant.js";
const $ = (id) => document.getElementById(id);
const v = (f, n) => Number(f.elements[n].value);
const money = (n, c = "USD") => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n); } catch { return c + " " + Math.round(n); } };
const params = new URLSearchParams(location.search);
document.querySelectorAll("form.calc-form").forEach((form) => { for (const [k, val] of params) { if (!k.startsWith(form.id + ".")) continue; const f = form.elements.namedItem(k.slice(form.id.length + 1)); if (f && val !== "" && val.length < 24) f.value = val; } });
const syncUrl = () => { const p = new URLSearchParams(); document.querySelectorAll("form.calc-form").forEach((f) => [...f.elements].forEach((e) => { if (e.name && e.value !== "") p.set(f.id + "." + e.name, e.value); })); history.replaceState(null, "", "?" + p); };

function tax() {
  const f = $("tax-form"), c = f.elements.currency.value;
  const r = taxSetAside({ income: v(f, "income"), ratePct: v(f, "rate"), expenses: v(f, "expenses") });
  if (!r) { $("tax-result").textContent = "—"; $("tax-detail").textContent = "Enter income, expenses and a rate between 0 and 100."; return; }
  $("tax-result").textContent = money(r.tax, c);
  $("tax-detail").textContent = `Set aside from each payment. Take-home ${money(r.takeHome, c)} · about ${money(r.quarterly, c)} per quarter or ${money(r.monthly, c)} per month. A flat-rate planning estimate; ask a local tax professional.`;
}
function growth() {
  const f = $("fv-form"), c = f.elements.currency.value;
  const r = futureValue({ principal: v(f, "principal"), monthly: v(f, "monthly"), annualPct: v(f, "rate"), years: Math.min(60, v(f, "years")) });
  if (!r) { $("fv-result").textContent = "—"; $("fv-detail").textContent = "Enter values of 0 or more."; return; }
  $("fv-result").textContent = money(r.balance, c);
  $("fv-detail").textContent = `You contribute ${money(r.contributed, c)}; growth contributes ${money(r.growth, c)} at the assumed ${v(f, "rate")}% a year. Returns are not guaranteed and real markets fluctuate.`;
  const body = $("fv-table"); body.replaceChildren();
  r.rows.filter((x, i, a) => a.length <= 12 || i % Math.ceil(a.length / 10) === 0 || i === a.length - 1).forEach((x) => {
    const tr = document.createElement("tr");
    [x.year, money(x.contributed, c), money(x.balance, c)].forEach((t) => tr.append(Object.assign(document.createElement("td"), { textContent: String(t) })));
    body.append(tr);
  });
}
function retainer() {
  const f = $("ret-form"), c = f.elements.currency.value;
  const fee = v(f, "fee"), hrs = v(f, "hours"), hr = v(f, "rate");
  if (!(hrs > 0)) { $("ret-result").textContent = "—"; return; }
  const eff = fee / hrs;
  $("ret-result").textContent = money(eff, c) + " / hour";
  $("ret-detail").textContent = eff >= hr ? `The retainer beats your hourly rate by ${money(eff - hr, c)}/hour if the client uses all ${hrs} hours.` : `The retainer pays ${money(hr - eff, c)}/hour less than your hourly rate. Raise the fee to at least ${money(hr * hrs, c)} or cut included hours.`;
}
function growthRate() {
  const f = $("cagr-form"), r = cagr(v(f, "start"), v(f, "end"), v(f, "years"));
  $("cagr-result").textContent = Number.isFinite(r) ? r.toFixed(2) + "% per year" : "—";
  $("cagr-detail").textContent = Number.isFinite(r) ? "Compound annual growth rate between the start and end values." : "Start, end and years must be above 0.";
}
const map = { "tax-form": tax, "fv-form": growth, "ret-form": retainer, "cagr-form": growthRate };
for (const [id, fn] of Object.entries(map)) { const f = $(id); f.addEventListener("input", () => { fn(); syncUrl(); }); f.addEventListener("submit", (e) => e.preventDefault()); fn(); }
