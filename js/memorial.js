import "./app.js";
import "./site.js";
const $ = (id) => document.getElementById(id);
const BAD = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|nigg\w*|fag\w*|slut\w*|whore\w*|retard\w*|asshole\w*)\b/i;
const THEMES = ["dawn", "night", "forest"];
const strip = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const p = new URLSearchParams(location.search);
const name = strip(p.get("name"), 60), dates = strip(p.get("dates"), 40), message = strip(p.get("message"), 280);
const theme = THEMES.includes(p.get("theme")) ? p.get("theme") : "night";
const flagged = BAD.test(name + " " + dates + " " + message);
const view = $("view"), compose = $("compose");
const KEY = "parchxa.candles.v1";
const counts = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } };

if (name && !flagged) {
  compose.hidden = true; view.hidden = false; view.dataset.theme = theme; document.title = `In memory of ${name} — PARCHXA`;
  $("m-name").textContent = name; $("m-dates").textContent = dates; $("m-msg").textContent = message;
  const id = "c:" + name.toLowerCase().slice(0, 40);
  const show = () => { $("m-count").textContent = String(counts()[id] || 0); };
  show();
  $("light").addEventListener("click", () => { const c = counts(); c[id] = (c[id] || 0) + 1; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} show(); flare = 1; });
  // candle animation (static when reduced motion is requested)
  const cv = $("flame"), g = cv.getContext("2d"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; let flare = 0, t0 = 0;
  const draw = (t) => {
    const w = cv.width, h = cv.height; g.clearRect(0, 0, w, h);
    const flick = reduce ? 0 : Math.sin(t / 180) * 3 + Math.sin(t / 97) * 2, s = 1 + flare * 0.25; flare = Math.max(0, flare - 0.02);
    g.fillStyle = "#f4efe6"; g.fillRect(w / 2 - 14, h - 90, 28, 80); g.fillStyle = "#555"; g.fillRect(w / 2 - 1, h - 100, 2, 12);
    const grad = g.createRadialGradient(w / 2, h - 125, 2, w / 2, h - 125, 60 * s); grad.addColorStop(0, "#ffd36655"); grad.addColorStop(1, "#ffd36600"); g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.beginPath(); g.ellipse(w / 2 + flick / 2, h - 120, 9 * s, 20 * s, 0, 0, 7); g.fillStyle = "#ffb52e"; g.fill();
    g.beginPath(); g.ellipse(w / 2 + flick / 3, h - 116, 4.5 * s, 11 * s, 0, 0, 7); g.fillStyle = "#fff3c4"; g.fill();
    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  $("card").addEventListener("click", () => {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1080; const x = c.getContext("2d");
    x.fillStyle = theme === "dawn" ? "#f6e7d4" : theme === "forest" ? "#10281f" : "#0b1120"; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = theme === "dawn" ? "#2b2118" : "#f4efe6"; x.textAlign = "center"; x.font = "bold 72px serif"; x.fillText("In loving memory", 540, 250);
    x.font = "bold 96px serif"; x.fillText(name, 540, 440, 940); x.font = "44px serif"; x.fillText(dates, 540, 520, 940);
    x.font = "italic 38px serif"; const words = message.split(" "); let line = "", y = 640; for (const w of words) { if ((line + w).length > 36) { x.fillText(line.trim(), 540, y, 940); line = ""; y += 52; } line += w + " "; } x.fillText(line.trim(), 540, y, 940);
    x.fillStyle = "#ffb52e"; x.beginPath(); x.ellipse(540, 900, 16, 36, 0, 0, 7); x.fill(); x.fillStyle = "#f4efe6"; x.fillRect(524, 930, 32, 100);
    x.font = "24px sans-serif"; x.fillStyle = "#8a8f99"; x.fillText("Rest & Remembrance · PARCHXA", 540, 1060);
    c.toBlob((b) => { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(b), download: "remembrance.png" }); document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); });
  });
  $("share").addEventListener("click", async () => { try { if (navigator.share) await navigator.share({ title: document.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); $("share").textContent = "Link copied ✓"; } } catch {} });
} else {
  if (flagged) $("warn").textContent = "That text can't be used on a memorial page. Please edit it and try again.";
  $("mform").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.currentTarget.elements;
    const n = strip(f.name.value, 60), d = strip(f.dates.value, 40), m = strip(f.message.value, 280);
    if (!n) { $("warn").textContent = "Please enter a name."; return; }
    if (BAD.test(n + " " + d + " " + m)) { $("warn").textContent = "That text can't be used on a memorial page. Please edit it and try again."; return; }
    const q = new URLSearchParams({ name: n }); if (d) q.set("dates", d); if (m) q.set("message", m); q.set("theme", THEMES.includes(f.theme.value) ? f.theme.value : "night");
    location.search = q.toString();
  });
}
