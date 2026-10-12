import "./app.js";
const format = (amount, currency) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${currency} ${(Number(amount) || 0).toFixed(2)}`; }
};
const read = (form, name) => Math.max(0, Number(new FormData(form).get(name)) || 0);
function show(id, detailId, amount, currency, detail) {
  document.getElementById(id).textContent = format(amount, currency);
  document.getElementById(detailId).textContent = detail;
}
document.querySelector("#rate-form").addEventListener("submit", (event) => {
  event.preventDefault(); const form = event.currentTarget;
  const income = read(form,"income"), expenses = read(form,"expenses"), hours = read(form,"hours"), billable = Math.min(100,read(form,"billable"));
  if (!hours || !billable) return;
  const monthlyBillableHours = hours * 52 / 12 * billable / 100;
  const rate = (income + expenses) / monthlyBillableHours;
  show("rate-result","rate-detail",rate,new FormData(form).get("currency"),`Based on about ${monthlyBillableHours.toFixed(1)} billable hours/month and your stated income target plus expenses.`);
});
document.querySelector("#project-form").addEventListener("submit", (event) => {
  event.preventDefault(); const form = event.currentTarget;
  const hours = read(form,"hours"), rate = read(form,"rate"), costs = read(form,"costs"), contingency = Math.min(100,read(form,"contingency"));
  const base = hours * rate + costs, quote = base * (1 + contingency / 100);
  show("project-result","project-detail",quote,new FormData(form).get("currency"),`Base estimate ${format(base,new FormData(form).get("currency"))}; includes ${contingency}% contingency.`);
});
document.querySelector("#profit-form").addEventListener("submit", (event) => {
  event.preventDefault(); const form = event.currentTarget;
  const revenue = read(form,"revenue"), hours = read(form,"hours"), rate = read(form,"rate"), costs = read(form,"costs");
  const cost = hours * rate + costs, profit = revenue - cost, margin = revenue > 0 ? profit / revenue * 100 : 0;
  show("profit-result","profit-detail",profit,new FormData(form).get("currency"),`Estimated costs: ${format(cost,new FormData(form).get("currency"))}. Margin: ${revenue > 0 ? margin.toFixed(1) : "not meaningful"}%.`);
});
document.querySelectorAll(".calc-form").forEach((form) => form.requestSubmit());