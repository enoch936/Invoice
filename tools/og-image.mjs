// Generate the 1200x630 social preview image (icons/og.png) with no dependencies.
//
//   node tools/og-image.mjs
//
// Why hand-rolled? Most social crawlers (Facebook, X, LinkedIn, Slack) ignore SVG, so the
// preview must be a raster PNG. This renders one with a small built-in 5x7 bitmap font and a
// minimal PNG encoder (zlib ships with Node), so the asset is reproducible in CI without an
// image library or a headless browser.

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;

// ---------------------------------------------------------------- 5x7 bitmap font (uppercase)
const FONT = {
  A: "01110/10001/10001/11111/10001/10001/10001",
  B: "11110/10001/10001/11110/10001/10001/11110",
  C: "01110/10001/10000/10000/10000/10001/01110",
  D: "11110/10001/10001/10001/10001/10001/11110",
  E: "11111/10000/10000/11110/10000/10000/11111",
  F: "11111/10000/10000/11110/10000/10000/10000",
  G: "01110/10001/10000/10111/10001/10001/01111",
  H: "10001/10001/10001/11111/10001/10001/10001",
  I: "11111/00100/00100/00100/00100/00100/11111",
  J: "00111/00010/00010/00010/00010/10010/01100",
  K: "10001/10010/10100/11000/10100/10010/10001",
  L: "10000/10000/10000/10000/10000/10000/11111",
  M: "10001/11011/10101/10101/10001/10001/10001",
  N: "10001/11001/10101/10011/10001/10001/10001",
  O: "01110/10001/10001/10001/10001/10001/01110",
  P: "11110/10001/10001/11110/10000/10000/10000",
  Q: "01110/10001/10001/10001/10101/10010/01101",
  R: "11110/10001/10001/11110/10100/10010/10001",
  S: "01111/10000/10000/01110/00001/00001/11110",
  T: "11111/00100/00100/00100/00100/00100/00100",
  U: "10001/10001/10001/10001/10001/10001/01110",
  V: "10001/10001/10001/10001/10001/01010/00100",
  W: "10001/10001/10001/10101/10101/11011/10001",
  X: "10001/10001/01010/00100/01010/10001/10001",
  Y: "10001/10001/01010/00100/00100/00100/00100",
  Z: "11111/00001/00010/00100/01000/10000/11111",
  0: "01110/10001/10011/10101/11001/10001/01110",
  1: "00100/01100/00100/00100/00100/00100/01110",
  2: "01110/10001/00001/00010/00100/01000/11111",
  3: "11111/00010/00100/00010/00001/10001/01110",
  4: "00010/00110/01010/10010/11111/00010/00010",
  5: "11111/10000/11110/00001/00001/10001/01110",
  6: "00110/01000/10000/11110/10001/10001/01110",
  7: "11111/00001/00010/00100/01000/01000/01000",
  8: "01110/10001/10001/01110/10001/10001/01110",
  9: "01110/10001/10001/01111/00001/00010/01100",
  " ": "00000/00000/00000/00000/00000/00000/00000",
  ".": "00000/00000/00000/00000/00000/01100/01100",
  ",": "00000/00000/00000/00000/01100/00100/01000",
  "-": "00000/00000/00000/11111/00000/00000/00000",
  "/": "00001/00010/00010/00100/01000/01000/10000",
  ":": "00000/01100/01100/00000/01100/01100/00000",
  "·": "00000/00000/00000/01100/01100/00000/00000",
  "&": "01100/10010/10010/01100/10101/10010/01101",
  "+": "00000/00100/00100/11111/00100/00100/00000",
  "(": "00010/00100/01000/01000/01000/00100/00010",
  ")": "01000/00100/00010/00010/00010/00100/01000",
  "!": "00100/00100/00100/00100/00100/00000/00100",
  "?": "01110/10001/00001/00010/00100/00000/00100",
};

// ---------------------------------------------------------------- palette
const BG1 = [11, 17, 32];       // #0b1120
const BG2 = [16, 26, 44];       // #101a2c
const ACCENT = [181, 243, 109]; // #b5f36d
const INK = [17, 24, 39];       // #111827
const TEXT = [242, 245, 251];   // #f2f5fb
const MUTED = [155, 169, 189];  // #9ba9bd
const FAINT = [127, 141, 163];  // #7f8da3
const BORDER = [29, 41, 66];    // #1d2942

// ---------------------------------------------------------------- raster canvas
const px = new Uint8Array(W * H * 3);

function setPx(x, y, [r, g, b]) {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

function blend(x, y, [r, g, b], a) {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= W || yi >= H || a <= 0) return;
  const i = (yi * W + xi) * 3;
  px[i] = Math.round(px[i] * (1 - a) + r * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
}

// distance from a point to a rounded rectangle: <= 0 is inside
function roundedDistance(x, y, x0, y0, w, h, r) {
  const dx = Math.max(Math.abs(x - (x0 + w / 2)) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - (y0 + h / 2)) - (h / 2 - r), 0);
  return Math.hypot(dx, dy) - r;
}

function fillRoundRect(x0, y0, w, h, r, color) {
  for (let y = Math.floor(y0); y <= Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x0 + w); x++) {
      if (roundedDistance(x, y, x0, y0, w, h, r) <= 0) setPx(x, y, color);
    }
  }
}

function strokeRoundRect(x0, y0, w, h, r, thickness, color) {
  for (let y = y0 - thickness; y < y0 + h + thickness; y++) {
    for (let x = x0 - thickness; x < x0 + w + thickness; x++) {
      const d = roundedDistance(x, y, x0, y0, w, h, r);
      if (d <= 0 && d > -thickness) blend(x, y, BORDER, 1);
    }
  }
}

function drawGlyph(glyph, x0, y0, scale, color) {
  const rows = glyph.split("/");
  for (let ry = 0; ry < rows.length; ry++) {
    for (let rx = 0; rx < rows[ry].length; rx++) {
      if (rows[ry][rx] !== "1") continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) setPx(x0 + rx * scale + dx, y0 + ry * scale + dy, color);
      }
    }
  }
}

function drawText(text, x0, y0, scale, color) {
  const advance = 5 * scale + scale;
  let x = x0;
  for (const ch of text.toUpperCase()) {
    setGlyph: {
      const glyph = FONT[ch];
      if (glyph) drawGlyph(glyph, x, y0, scale, color);
    }
    x += advance;
  }
}

function textWidth(text, scale) {
  return text.length * (5 * scale + scale) - scale;
}

// ---------------------------------------------------------------- compose
// background gradient
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = (x + y) / (W + H);
    setPx(x, y, [
      Math.round(BG1[0] + (BG2[0] - BG1[0]) * t),
      Math.round(BG1[1] + (BG2[1] - BG1[1]) * t),
      Math.round(BG1[2] + (BG2[2] - BG1[2]) * t),
    ]);
  }
}

// soft accent glow, top-right
{
  const cx = 1060, cy = 90, radius = 380;
  for (let y = Math.max(0, cy - radius); y < Math.min(H, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x < Math.min(W, cx + radius); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius) continue;
      blend(x, y, ACCENT, 0.1 * (1 - d / radius) ** 2);
    }
  }
}

// rounded hairline border
{
  const x0 = 40, y0 = 40, w = W - 80, h = H - 80, r = 24, thickness = 3;
  for (let y = y0 - thickness; y < y0 + h + thickness; y++) {
    for (let x = x0 - thickness; x < x0 + w + thickness; x++) {
      const d = roundedDistance(x, y, x0, y0, w, h, r);
      if (d <= 0 && d > -thickness) blend(x, y, BORDER, 1);
    }
  }
}

// logo mark + wordmark
fillRoundRect(96, 92, 72, 72, 16, ACCENT);
drawText("P", 115, 104, 7, INK);
drawText("PARCHXA", 192, 104, 7, TEXT);
drawText("TOOLKIT", 704, 112, 4, FAINT);

// headline
drawText("FREE TOOLS FOR", 96, 268, 9, TEXT);
drawText("INDEPENDENT WORK", 96, 372, 9, ACCENT);

// supporting line + footer
drawText("INVOICES · QUOTES · FREELANCE · TRADING RISK · MONEY · MATH", 96, 486, 3, MUTED);
drawText("RUNS ENTIRELY IN YOUR BROWSER - NO SIGN-UP, NO UPLOAD", 96, 540, 3, FAINT);

// ---------------------------------------------------------------- PNG encoding (truecolor, 8-bit)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng() {
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(px.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // compression, filter, interlace
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const png = encodePng();
writeFileSync(join(ROOT, "icons", "og.png"), png);
console.log(`wrote icons/og.png (${W}x${H}, ${(png.length / 1024).toFixed(1)} KB)`);
