import "./app.js";
import "./site.js";
const $ = (id) => document.getElementById(id), CUR = document.querySelector("[data-cur]").dataset.cur;
const money = (n, d = 0) => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: CUR, maximumFractionDigits: d }).format(n); } catch { return CUR + " " + n.toFixed(d); } };
const p = new URLSearchParams(location.search);
for (const k of ["hourly", "hours", "weeks"]) { const v = p.get(k); if (v && /^\d{1,6}(\.\d{1,2})?$/.test(v)) $(k).value = v; }
function calc() {
  const h = Math.max(0, Number($("hourly").value) || 0), hrs = Math.min(168, Math.max(0, Number($("hours").value) || 0)), wk = Math.min(52, Math.max(0, Number($("weeks").value) || 0));
  const yr = h * hrs * wk;
  $("res").textContent = money(yr);
  $("det").textContent = `${money(yr / 12)} per month · ${money(h * hrs)} per week · ${money(h * hrs * wk / (wk * 5 || 1), 0)} per working day (5-day week). Before tax and unpaid time off.`;
  history.replaceState(null, "", `?hourly=${h}&hours=${hrs}&weeks=${wk}`);
}
document.querySelectorAll("#rate-form input").forEach((i) => i.addEventListener("input", calc)); $("rate-form").addEventListener("submit", (e) => e.preventDefault()); calc();
