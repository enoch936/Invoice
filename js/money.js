import "./app.js";
import "./site.js";
import { taxSetAside, futureValue, cagr, loanPayment, profitLoss } from "./quant.js";
const $ = (id) => document.getElementById(id);
const v = (f, n) => Number(f.elements[n].value);
const money = (n, c = "USD") => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n); } catch { return c + " " + Math.round(n); } };
const money2 = (n, c = "USD") => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n); } catch { return c + " " + (Number(n) || 0).toFixed(2); } };
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
function loan() {
  const f = $("loan-form"), c = f.elements.currency.value;
  const r = loanPayment({ principal: v(f, "principal"), annualPct: v(f, "rate"), years: v(f, "years") });
  if (!r) { $("loan-result").textContent = "—"; $("loan-detail").textContent = "Enter a principal and term above 0, and a rate of 0 or more."; $("loan-table").replaceChildren(); return; }
  $("loan-result").textContent = money2(r.payment, c);
  $("loan-detail").textContent = `Over ${r.months} months you repay ${money(r.totalPaid, c)} — ${money(r.totalInterest, c)} of that is interest.`;
  const body = $("loan-table"); body.replaceChildren();
  r.schedule.filter((_, i, a) => a.length <= 10 || i % Math.ceil(a.length / 8) === 0 || i === a.length - 1).forEach((row) => {
    const tr = document.createElement("tr");
    [`Year ${row.year}`, money(row.balance, c), money(row.interest, c)].forEach((t) => tr.append(Object.assign(document.createElement("td"), { textContent: t })));
    body.append(tr);
  });
}
function vat() {
  const f = $("vat-form");
  const amount = Math.max(0, v(f, "amount")), rate = Math.min(100, Math.max(0, v(f, "rate"))), mode = f.elements.mode.value;
  const net = mode === "add" ? amount : amount / (1 + rate / 100);
  const gross = net * (1 + rate / 100), taxAmount = gross - net;
  $("vat-result").textContent = money2(gross);
  $("vat-detail").textContent = `Net ${money2(net)} + tax ${money2(taxAmount)} (${rate}%) = gross ${money2(gross)}. Rates vary by country and product.`;
}
function margin() {
  const f = $("margin-form"), c = f.elements.currency.value;
  const cost = Math.max(0, v(f, "cost")), price = Math.max(0, v(f, "price"));
  const profit = price - cost, m = price > 0 ? (profit / price) * 100 : NaN, markup = cost > 0 ? (profit / cost) * 100 : NaN;
  $("margin-result").textContent = Number.isFinite(m) ? m.toFixed(1) + "%" : "—";
  $("margin-detail").textContent = price <= 0 ? "Enter a selling price above 0." : `Profit per unit ${money2(profit, c)} · markup ${Number.isFinite(markup) ? markup.toFixed(1) + "%" : "—"} on cost. Margin = profit ÷ price; markup = profit ÷ cost.`;
}
function breakEven() {
  const f = $("be-form"), c = f.elements.currency.value;
  const fixed = Math.max(0, v(f, "fixed")), price = Math.max(0, v(f, "price")), variable = Math.max(0, v(f, "variable"));
  const contribution = price - variable;
  if (!(contribution > 0)) { $("be-result").textContent = "—"; $("be-detail").textContent = "Price must be higher than the variable cost per unit to ever break even."; return; }
  const units = fixed / contribution;
  $("be-result").textContent = Math.ceil(units).toLocaleString() + " units";
  $("be-detail").textContent = `Contribution margin ${money2(contribution, c)}/unit · ${money2(units * price, c)} of revenue. Every unit above break-even adds ${money2(contribution, c)} to profit.`;
}

const map = { "tax-form": tax, "fv-form": growth, "ret-form": retainer, "cagr-form": growthRate, "loan-form": loan, "vat-form": vat, "margin-form": margin, "be-form": breakEven };
for (const [id, fn] of Object.entries(map)) {
  const f = $(id); if (!f) continue;
  f.addEventListener("input", () => { fn(); syncUrl(); });
  f.addEventListener("submit", (e) => { e.preventDefault(); fn(); syncUrl(); });
  fn();
}

// Page-specific share card: real numbers from the calculators.
window.parchxaShareSpecs = Object.assign(window.parchxaShareSpecs || {}, {
  money: () => {
    const price = Math.max(0, Number($("margin-form")?.elements.price.value) || 0);
    const cost = Math.max(0, Number($("margin-form")?.elements.cost.value) || 0);
    const m = price > 0 ? ((price - cost) / price) * 100 : NaN;
    const rate = $("tax-form")?.elements.rate.value;
    const be = $("be-result")?.textContent || "";
    return {
      theme: "night",
      badge: "Money planner",
      title: "A quick reality check on my numbers",
      headline: Number.isFinite(m) ? `${m.toFixed(0)}% margin` : "Money plan",
      subheadline: rate ? `Tax set-aside assumption: ${rate}%` : "",
      lines: [be ? `Break-even: ${be}` : "", "Run your own numbers free on PARCHXA"].filter(Boolean),
      footer: "parchxa · free freelancer money tools",
    };
  },
});
