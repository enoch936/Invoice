import "./app.js";
import "./advanced.js";
const format = (amount, currency) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${currency} ${(Number(amount) || 0).toFixed(2)}`; }
};
const read = (form, name) => Math.max(0, Number(new FormData(form).get(name)) || 0);
function show(id, detailId, amount, currency, detail) {
  const node = document.getElementById(id); if (node) node.textContent = format(amount, currency);
  const dn = document.getElementById(detailId); if (dn) dn.textContent = detail;
}
document.querySelector("#rate-form")?.addEventListener("submit", (event) => {
  event.preventDefault(); const form = event.currentTarget;
  const income = read(form,"income"), expenses = read(form,"expenses"), hours = read(form,"hours"), billable = Math.min(100,read(form,"billable"));
  if (!hours || !billable) {
    const mismatch = document.getElementById("rate-result");
    if (mismatch) mismatch.textContent = "—";
    const guidance = document.getElementById("rate-detail");
    if (guidance) guidance.textContent = "Enter work hours per week and billable time above 0 to calculate a rate.";
    return;
  }
  const monthlyBillableHours = hours * 52 / 12 * billable / 100;
  const rate = (income + expenses) / monthlyBillableHours;
  const currency = new FormData(form).get("currency");
  show("rate-result","rate-detail",rate,currency,`Based on about ${monthlyBillableHours.toFixed(1)} billable hours/month (target income + expenses over billable time).`);
});
document.querySelector("#project-form")?.addEventListener("submit", (event) => {
  event.preventDefault(); const form = event.currentTarget;
  const hours = read(form,"hours"), rate = read(form,"rate"), costs = read(form,"costs"), contingency = Math.min(100,read(form,"contingency"));
  const base = hours * rate + costs, quote = base * (1 + contingency / 100);
  const currency = new FormData(form).get("currency");
  show("project-result","project-detail",quote,currency,`Base estimate ${format(base, currency)}; includes ${contingency}% contingency.`);
});
document.querySelector("#profit-form")?.addEventListener("submit", (event) => {
  event.preventDefault(); const form = event.currentTarget;
  const revenue = read(form,"revenue"), hours = read(form,"hours"), rate = read(form,"rate"), costs = read(form,"costs");
  const cost = hours * rate + costs, profit = revenue - cost, margin = revenue > 0 ? profit / revenue * 100 : 0;
  const currency = new FormData(form).get("currency");
  show("profit-result","profit-detail",profit,currency,`Estimated costs: ${format(cost, currency)}. Margin: ${revenue > 0 ? margin.toFixed(1) : "not meaningful"}%.`);
});
const params = new URLSearchParams(location.search);
if (params.size) {
  document.querySelectorAll(".calc-form").forEach((form) => {
    for (const [key, val] of params) {
      const field = form.elements.namedItem(key);
      if (!field || val === "") continue;
      if (field instanceof HTMLSelectElement) {
        if ([...field.options].some((option) => option.value === val)) field.value = val;
      } else {
        field.value = val;
      }
    }
  });
}
document.querySelectorAll(".calc-form").forEach((form) => form.requestSubmit());
