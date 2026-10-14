// PARCHXA Terminal — drawing tools.
//
// Drawings are stored in DATA space (time + price), never in pixels, so they stay
// anchored to the chart through pan, zoom, symbol switches and reloads. The engine
// supplies a `mapper` ({ x(time), y(price), priceAtY(y) }) for hit-testing/rendering.
//
// Persistence is versioned and validated: anything read back from localStorage is
// treated as hostile and dropped unless it matches the expected shape.

export const STORAGE_KEY = "parchxa.terminal.drawings.v1";

/** Tool registry. `points` = how many clicks the tool needs to be placed. */
export const DRAW_TOOLS = [
  { id: "cursor", label: "Cursor", points: 0 },
  { id: "trendline", label: "Trend line", points: 2 },
  { id: "ray", label: "Ray", points: 2 },
  { id: "hline", label: "Horizontal line", points: 1 },
  { id: "vline", label: "Vertical line", points: 1 },
  { id: "rectangle", label: "Rectangle", points: 2 },
  { id: "fib", label: "Fib retracement", points: 2 },
  { id: "measure", label: "Measure", points: 2 },
  { id: "text", label: "Text / callout", points: 1 },
];

export const TOOL_BY_ID = new Map(DRAW_TOOLS.map((t) => [t.id, t]));
export const isDrawingTool = (id) => DRAW_TOOLS.some((t) => t.id === id && t.id !== "cursor");

let seq = 0;
const uid = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`;

const PALETTE = ["#8dafff", "#f5b942", "#a6e3a1", "#f38ba8", "#c792ea", "#8bd5ca", "#f6c177"];

export function defaultColor(tool) {
  const i = Math.max(0, ["trendline", "hline", "ray", "rect", "fib", "vline", "text", "measure"].indexOf(tool));
  return PALETTE[i % PALETTE.length];
}

/** Build a drawing from two data-space points (the second is optional for 1-point tools). */
export function createDrawing(tool, p1, p2, opts = {}) {
  const points = tool === "hline" ? [{ time: p1.time, price: p1.price }]
    : tool === "vline" ? [{ time: p1.time, price: p1.price }]
      : [{ time: p1.time, price: p1.price }, { time: (p2 || p1).time, price: (p2 || p1).price }];
  return {
    id: opts.id || uid(),
    tool,
    points,
    color: opts.color || defaultColor(tool),
    width: opts.width || 1.5,
    text: opts.text || "",
    visible: opts.visible !== false,
  };
}

/** Serialize a drawing for export (stable key order, rounded numbers). */
export function serializeDrawing(d) {
  return {
    tool: d.tool,
    points: d.points.map((p) => ({ time: Math.round(p.time), price: +p.price })),
    color: d.color, width: d.width, text: d.text, visible: d.visible !== false,
  };
}

/** Strict validation of imported/stored drawings. Returns a safe drawing or null. */
export function validateDrawing(raw, validTools = new Set(["trendline", "hline", "vline", "ray", "rect", "fib", "text", "measure"])) {
  if (!raw || typeof raw !== "object") return null;
  if (!validTools.has(raw.tool)) return null;
  if (!Array.isArray(raw.points) || raw.points.length < 1 || raw.points.length > 2) return null;
  const points = [];
  for (const p of raw.points) {
    const time = Number(p?.time), price = Number(p?.price);
    if (!Number.isFinite(time) || !Number.isFinite(price)) return null;
    points.push({ time, price });
  }
  const color = typeof raw.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(raw.color) ? raw.color : defaultColor(raw.tool);
  const width = Number.isFinite(+raw.width) ? Math.min(6, Math.max(0.5, +raw.width)) : 1.5;
  const text = typeof raw.text === "string" ? raw.text.slice(0, 200) : "";
  return { id: uid(), tool: raw.tool, points, color, width, text, visible: raw.visible !== false };
}

export function drawingLabel(d) {
  if (d.tool === "hline") return `H ${d.points[0].price}`;
  if (d.tool === "vline") return "V";
  return d.tool;
}

// ---------------------------------------------------------------- hit testing

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

/** Screen-space hit test. `mapper` = { x(time) -> px, y(price) -> px }. */
export function hitTest(d, mapper, px, py, tolerance = 6) {
  if (!d.visible) return false;
  const pts = d.points.map((p) => ({ x: mapper.x(p.time), y: mapper.y(p.price) }));
  switch (d.tool) {
    case "hline": return Math.abs(py - pts[0].y) <= tolerance;
    case "vline": return Math.abs(px - pts[0].x) <= tolerance;
    case "trendline":
    case "rect":
    case "fib":
    case "measure": {
      if (pts.length < 2) return dist(px, py, pts[0].x, pts[0].y) <= tolerance;
      const [a, b] = pts;
      const onDiag = distToSegment(px, py, a.x, a.y, b.x, b.y) <= tolerance;
      const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
      const onEdge = Math.abs(px - left) <= tolerance || Math.abs(px - right) <= tolerance || Math.abs(py - top) <= tolerance || Math.abs(py - bottom) <= tolerance;
      if (d.tool === "trendline") return distToSegment(px, py, a.x, a.y, b.x, b.y) <= tolerance;
      return onEdge && px >= left - tolerance && px <= right + tolerance && py >= top - tolerance && py <= bottom + tolerance || onDiag;
    }
    case "ray": {
      if (pts.length < 2) return dist(px, py, pts[0].x, pts[0].y) <= tolerance;
      const [a, b] = pts;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      // Project the point onto the infinite ray from a through b.
      const t = ((px - a.x) * dx + (py - a.y) * dy) / (len * len);
      if (t < 0) return dist(px, py, a.x, a.y) <= tolerance;
      const qx = a.x + t * dx, qy = a.y + t * dy;
      return dist(px, py, qx, qy) <= tolerance;
    }
    case "text": {
      const w = Math.max(20, (d.text || "text").length * 7), h = 16;
      return px >= pts[0].x - 4 && px <= pts[0].x + w && py >= pts[0].y - h && py <= pts[0].y + 4;
    }
    default: return false;
  }
}

/** Move every anchor by a data-space delta (dTime in ms, dPrice in quote units). */
export function translateDrawing(d, dTime, dPrice) {
  return { ...d, points: d.points.map((p) => ({ time: Math.round(p.time + dTime), price: p.price + dPrice })) };
}

// ---------------------------------------------------------------- persistence + undo

function safeParse(raw) { try { return JSON.parse(raw); } catch { return null; } }

/**
 * Per-chart drawing store with undo/redo. Every mutation snapshots the previous
 * state so undo/redo is exact. Save failures (quota/private mode) are swallowed —
 * the in-memory drawing still works.
 */
export class DrawingModel {
  constructor(chartKey, onChange) {
    this.chartKey = chartKey;
    this.onChange = onChange || (() => { });
    this.list = [];
    this.undoStack = [];
    this.redoStack = [];
    this.load();
  }

  load() {
    const all = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
    const rows = Array.isArray(all[this.chartKey]) ? all[this.chartKey] : [];
    this.list = rows.map((r) => validateDrawing(r)).filter(Boolean);
    this.undoStack = []; this.redoStack = [];
    this.onChange();
  }

  save() {
    try {
      const all = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
      all[this.chartKey] = this.list.map(serializeDrawing);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch { /* storage full or unavailable — keep working in memory */ }
  }

  _snapshot() {
    this.undoStack.push(this.list.map(serializeDrawing));
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
  }

  _restore(rows) {
    this.list = rows.map((r) => validateDrawing(r)).filter(Boolean);
    this.save(); this.onChange();
  }

  add(d) { this._snapshot(); this.list.push(d); this.save(); this.onChange(); return d; }
  replace(id, patch) { this._snapshot(); this.list = this.list.map((d) => (d.id === id ? { ...d, ...patch } : d)); this.save(); this.onChange(); }
  remove(id) { this._snapshot(); this.list = this.list.filter((d) => d.id !== id); this.save(); this.onChange(); }
  clear() { if (!this.list.length) return; this._snapshot(); this.list = []; this.save(); this.onChange(); }
  find(id) { return this.list.find((d) => d.id === id) || null; }

  undo() { if (!this.undoStack.length) return false; this.redoStack.push(this.list.map(serializeDrawing)); this._restore(this.undoStack.pop()); return true; }
  redo() { if (!this.redoStack.length) return false; this.undoStack.push(this.list.map(serializeDrawing)); this._restore(this.redoStack.pop()); return true; }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  exportJson() { return JSON.stringify({ version: 1, chart: this.chartKey, drawings: this.list.map(serializeDrawing) }, null, 2); }
  importJson(text) {
    const parsed = safeParse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed?.drawings;
    if (!Array.isArray(rows)) throw new Error("No drawings array found in file.");
    const valid = rows.map((r) => validateDrawing(r)).filter(Boolean);
    if (!valid.length) throw new Error("No valid drawings found in file.");
    this._snapshot();
    this.list = valid;
    this.save(); this.onChange();
    return valid.length;
  }
}
