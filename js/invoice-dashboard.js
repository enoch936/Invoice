import { getDrafts } from "./storage.js";
const $ = (id) => document.getElementById(id);
const total = (d) => {
  const sub = (d.items || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
  const disc = sub * Math.min(100, Number(d.discount) || 0) / 100;
  return (sub - disc) * (1 + Math.min(100, Number(d.tax) || 0) / 100);
};
const money = (n, c) => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n); } catch { return c + " " + Math.round(n); } };

function render() {
  const drafts = getDrafts(), stats = $("dash-stats"), canvas = $("dash-chart");
  if (!stats || !canvas) return;
  stats.replaceChildren();
  if (!drafts.length) { stats.textContent = "Save an invoice to see totals here."; canvas.style.display = "none"; return; }
  canvas.style.display = "block";
  const byCur = {};
  for (const d of drafts) {
    const c = d.currency || "USD", st = d.status || "draft";
    (byCur[c] ||= { draft: 0, sent: 0, paid: 0 })[st] += total(d);
  }
  for (const [c, v] of Object.entries(byCur)) {
    const row = document.createElement("p"); row.className = "muted-copy";
    row.textContent = `${c}: paid ${money(v.paid, c)} · outstanding (sent) ${money(v.sent, c)} · draft ${money(v.draft, c)}`;
    stats.append(row);
  }
  const main = Object.entries(byCur).sort((a, b) => b[1].paid + b[1].sent - (a[1].paid + a[1].sent))[0][0];
  const months = {};
  for (const d of drafts) if ((d.status || "draft") === "paid" && (d.currency || "USD") === main) { const k = (d.date || d.updatedAt || "").slice(0, 7); if (k) months[k] = (months[k] || 0) + total(d); }
  const keys = Object.keys(months).sort().slice(-12);
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = 200;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement), accent = css.getPropertyValue("--accent").trim() || "#b5f36d", muted = css.getPropertyValue("--muted").trim() || "#9ba9bd";
  g.fillStyle = muted; g.font = "10px sans-serif";
  if (!keys.length) { g.fillText(`Mark invoices as Paid to chart ${main} revenue by month.`, 12, 100); canvas.setAttribute("aria-label", "No paid invoices yet"); return; }
  const max = Math.max(...keys.map((k) => months[k])), bw = Math.min(40, (w - 40) / keys.length - 8);
  keys.forEach((k, i) => { const x = 20 + i * ((w - 40) / keys.length) + 4, bh = (months[k] / max) * 130; g.fillStyle = accent; g.fillRect(x, 160 - bh, bw, bh); g.fillStyle = muted; g.fillText(k.slice(2), x, 176); g.fillText(money(months[k], main), x, 154 - bh); });
  canvas.setAttribute("aria-label", "Paid " + main + " revenue by month: " + keys.map((k) => k + " " + money(months[k], main)).join(", "));
}
document.addEventListener("parchxa:drafts", render);
window.addEventListener("resize", render);
render();
