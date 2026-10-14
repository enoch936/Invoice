// PARCHXA viral share-card generator. Renders a branded PNG on <canvas> and shares or downloads it.
// Everything happens locally: the card image never leaves the device unless the user shares it.
const THEMES = {
  night: { bg: "#0b1120", panel: "#111b2e", text: "#f2f5fb", muted: "#9ba9bd", accent: "#b5f36d", accent2: "#8dafff" },
  dawn: { bg: "#f7f3ea", panel: "#ffffff", text: "#1c1a15", muted: "#6b6459", accent: "#7fb933", accent2: "#2563eb" },
  forest: { bg: "#0b1f18", panel: "#10281f", text: "#eef6f0", muted: "#9fc0ae", accent: "#b5f36d", accent2: "#7fd6c0" },
};

const FONT = "Manrope, 'DM Sans', system-ui, sans-serif";

/** Wrap text into lines that fit within maxWidth using the canvas' current font. */
function wrapText(ctx, text, maxWidth) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = []; let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draw a share card. spec: { theme, badge, title, headline, subheadline, lines[], footer, ratio }.
 * ratio "square" (1080×1080, default) or "wide" (1200×630) for Open Graph-style cards.
 */
export function drawCard(canvas, spec = {}) {
  const ratio = spec.ratio === "wide" ? [1200, 630] : [1080, 1080];
  const [W, H] = ratio;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  canvas.width = W; canvas.height = H;
  canvas.style.aspectRatio = `${W} / ${H}`;
  const t = THEMES[spec.theme] || THEMES.night;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // background + glow
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, -40, 10, W * 0.85, -40, H * 0.9);
  glow.addColorStop(0, `${t.accent}44`); glow.addColorStop(1, `${t.accent}00`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t.panel; ctx.lineWidth = 3; ctx.strokeRect(28, 28, W - 56, H - 56);

  const pad = 72;
  ctx.textBaseline = "top";

  // brand row
  ctx.fillStyle = t.accent; ctx.fillRect(pad, pad, 40, 40);
  ctx.fillStyle = "#111827"; ctx.font = `800 26px ${FONT}`; ctx.textAlign = "center";
  ctx.fillText("P", pad + 20, pad + 7);
  ctx.textAlign = "left"; ctx.fillStyle = t.text; ctx.font = `800 30px ${FONT}`;
  ctx.fillText("PARCHXA", pad + 56, pad + 4);
  if (spec.badge) {
    ctx.fillStyle = t.accent; ctx.font = `700 22px ${FONT}`;
    ctx.fillText(String(spec.badge).toUpperCase(), pad, pad + 62);
  }

  let y = pad + 140;

  if (spec.title) {
    ctx.fillStyle = t.muted; ctx.font = `600 30px ${FONT}`;
    wrapText(ctx, spec.title, W - pad * 2).slice(0, 2).forEach((line) => { ctx.fillText(line, pad, y); y += 40; });
    y += 8;
  }
  if (spec.headline) {
    ctx.fillStyle = t.accent; ctx.font = `800 96px ${FONT}`;
    const size = String(spec.headline).length > 12 ? 72 : 96;
    ctx.font = `800 ${size}px ${FONT}`;
    wrapText(ctx, spec.headline, W - pad * 2).slice(0, 3).forEach((line) => { ctx.fillText(line, pad, y); y += size * 1.05; });
    y += 12;
  }
  if (spec.subheadline) {
    ctx.fillStyle = t.text; ctx.font = `600 34px ${FONT}`;
    wrapText(ctx, spec.subheadline, W - pad * 2).slice(0, 3).forEach((line) => { ctx.fillText(line, pad, y); y += 44; });
    y += 10;
  }
  for (const line of (spec.lines || []).slice(0, 6)) {
    ctx.fillStyle = t.accent2; ctx.font = `700 30px ${FONT}`;
    ctx.fillText("›", pad, y);
    ctx.fillStyle = t.muted; ctx.font = `500 30px ${FONT}`;
    wrapText(ctx, line, W - pad * 2 - 40).slice(0, 2).forEach((l) => { ctx.fillText(l, pad + 34, y); y += 38; });
    y += 10;
  }

  ctx.fillStyle = t.muted; ctx.font = `500 24px ${FONT}`; ctx.textAlign = "left";
  ctx.fillText(String(spec.footer || "parchxa toolkit · free, private, no sign-up"), pad, H - pad - 24);
  return canvas;
}

/** Render a card to a Blob (PNG). */
export function cardToBlob(spec) {
  const canvas = document.createElement("canvas");
  drawCard(canvas, spec);
  return new Promise((resolve, reject) => {
    try { canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png", 0.95); }
    catch (error) { reject(error); }
  });
}

/** Trigger a local download of a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share a result card: uses the Web Share API (with the PNG file) when available,
 * otherwise downloads the PNG. Falls back to copying the URL if image generation fails.
 */
export async function shareCard(spec, { filename = "parchxa-card.png", url = location.href } = {}) {
  try {
    const blob = await cardToBlob(spec);
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: spec.title || document.title, text: spec.headline || "", url });
      return "shared";
    }
    downloadBlob(blob, filename);
    return "downloaded";
  } catch {
    try { await navigator.clipboard.writeText(url); return "copied-link"; } catch { return "failed"; }
  }
}

/**
 * Wire any <button data-share-card="spec-id"> to a card spec.
 * specs: a map of id → spec object, or a function (id) => spec.
 * A button may also carry data-share-title / data-share-headline / data-share-line (repeatable via data-lines).
 */
export function wireShareCards(specs = {}) {
  document.querySelectorAll("[data-share-card]").forEach((btn) => {
    const id = btn.dataset.shareCard || "default";
    btn.addEventListener("click", async () => {
      const spec = typeof specs === "function" ? specs(id, btn)
        : specs[id] || { title: document.title, headline: btn.dataset.shareHeadline || "", lines: (btn.dataset.shareLine || "").split("|").filter(Boolean) };
      btn.disabled = true;
      const result = await shareCard(spec, { url: spec.url || location.href, filename: `${id}-parchxa.png` });
      btn.disabled = false;
      const original = btn.dataset.label || btn.textContent;
      btn.dataset.label = original;
      btn.textContent = result === "shared" ? "Shared ✓" : result === "downloaded" ? "Card downloaded ✓" : result === "copied-link" ? "Link copied ✓" : "Sharing unavailable";
      setTimeout(() => { btn.textContent = original; }, 2500);
    });
  });
}
