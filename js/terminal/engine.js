// PARCHXA Terminal — canvas chart engine.
//
// One engine instance == one chart pane. It renders candlesticks / derived chart
// types, overlay indicators, indicator panes (volume, oscillators), the crosshair
// and the vector drawings held in a DrawingModel. It performs NO indicator maths
// and NEVER fabricates prices — it renders exactly the candles and series handed
// to it.
//
// Coordinate contract:
//   * horizontal axis = candle index (see view.offset / view.bars)
//   * vertical axis   = price (linear or log)
//   * drawings live in data space (time + price) so they survive pan/zoom/reload

import { heikinAshi, renko } from "../quant.js";
import { hitTest, createDrawing } from "./drawings.js";

const AXIS_RIGHT = 66, AXIS_BOTTOM = 24, PAD_TOP = 8, PANE_GAP = 6, MIN_BARS = 8;

export const CHART_TYPES = [
  { id: "candles", label: "Candles", derived: false },
  { id: "hollow", label: "Hollow candles", derived: false },
  { id: "bars", label: "OHLC bars", derived: false },
  { id: "line", label: "Line", derived: false },
  { id: "area", label: "Area", derived: false },
  { id: "baseline", label: "Baseline", derived: false },
  { id: "heikinashi", label: "Heikin-Ashi (derived)", derived: true },
  { id: "renko", label: "Renko (derived)", derived: true },
];

const DEFAULTS = {
  chartType: "candles",
  logScale: false,
  grid: true,
  crosshair: true,
  upColor: "#26a69a",
  downColor: "#ef5350",
  axisColor: "#5b6880",
  gridColor: "#1e293b",
  textColor: "#9ba9bd",
  baseline: NaN,
  timezone: "local",
  intervalMs: 3600000,
};

function bisect(times, t) {
  let lo = 0, hi = times.length - 1;
  if (t <= times[0]) return 0;
  if (t >= times[hi]) return hi;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid; }
  return lo;
}

function fmtTime(t, intervalMs, timezone) {
  const d = new Date(t);
  const opts = timezone === "utc" ? { timeZone: "UTC" } : {};
  if (intervalMs < 60000) return d.toLocaleTimeString(undefined, { ...opts, hour12: false });
  if (intervalMs <= 86400000) return d.toLocaleString(undefined, { ...opts, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { ...opts, year: "numeric", month: "short", day: "numeric" });
}

export class ChartEngine {
  constructor(container, opts = {}) {
    this.id = opts.id || "chart";
    this.onEvent = opts.onEvent || (() => { });
    this.requestText = opts.requestText || (() => null);
    this.container = container;
    this.options = { ...DEFAULTS };
    this.candles = [];
    this.display = [];
    this.times = [];
    this.overlays = [];
    this.panes = [];
    this.view = { offset: 0, bars: 120 };
    this.priceView = null;
    this.hover = null;
    this.tool = "cursor";
    this.selection = null;
    this.model = null;
    this.draft = null;
    this.drag = null;
    this.destroyed = false;
    this.geom = { plotRight: 0, main: { top: PAD_TOP, height: 100, bottom: 100 }, panes: [] };
    this.scale = { y: () => 0, val: () => 0 };

    container.classList.add("ts-chart");
    container.replaceChildren();
    this.base = document.createElement("canvas");
    this.base.className = "ts-canvas ts-canvas--base";
    this.over = document.createElement("canvas");
    this.over.className = "ts-canvas ts-canvas--over";
    this.over.setAttribute("role", "img");
    this.over.setAttribute("aria-label", `${this.id} interactive price chart`);
    container.append(this.base, this.over);

    this._onWheel = (e) => this._wheel(e);
    this._onDown = (e) => this._down(e);
    this._onMove = (e) => this._move(e);
    this._onUp = (e) => this._up(e);
    this._onLeave = () => { this.hover = null; this._overlay(); this._emitLegend(); };
    this._onDbl = () => this.fit();
    this.over.addEventListener("wheel", this._onWheel, { passive: false });
    this.over.addEventListener("pointerdown", this._onDown);
    this.over.addEventListener("pointermove", this._onMove);
    this.over.addEventListener("pointerup", this._onUp);
    this.over.addEventListener("pointerleave", this._onLeave);
    this.over.addEventListener("dblclick", this._onDbl);
    this.over.style.touchAction = "none";

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  // ---------------------------------------------------------------- public API
  setModel(model) { this.model = model; this._render(); this._overlay(); }
  setTool(tool) { this.tool = tool; this.draft = null; this._overlay(); }
  setOptions(opts) {
    this.options = { ...this.options, ...opts };
    this._buildDisplay();
    this._render();
  }
  setChartType(type) { this.options.chartType = type; this._buildDisplay(); this._render(); }

  setData(candles, { keepView = false } = {}) {
    this.candles = Array.isArray(candles) ? candles : [];
    this._buildDisplay();
    if (!keepView) {
      const bars = Math.min(160, Math.max(MIN_BARS, this.display.length));
      this.view = { offset: Math.max(0, this.display.length - bars), bars };
    }
    this._clampView();
    this._render();
  }

  /** Live tick: replace or append the last candle without rebuilding the world. */
  updateLast(candle) {
    if (!this.candles.length) { this.setData([candle]); return false; }
    const last = this.candles[this.candles.length - 1];
    const atRight = this.view.offset >= this.display.length - this.view.bars - 2;
    if (candle.time === last.time) this.candles[this.candles.length - 1] = candle;
    else if (candle.time > last.time) {
      this.candles.push(candle);
      if (this.candles.length > 2000) this.candles.shift();
    } else return false;
    this._buildDisplay();
    if (atRight) this.view.offset = Math.max(0, this.display.length - this.view.bars);
    this._clampView();
    this._render();
    return true;
  }

  setIndicators(resolved) {
    const list = (resolved || []).filter(Boolean);
    this.overlays = list.filter((r) => r.overlay && r.main.length);
    this.panes = list.filter((r) => !r.overlay && r.pane);
    this._render();
  }

  fit() { const bars = Math.max(MIN_BARS, this.display.length); this.view = { offset: 0, bars }; this._render(); this._emitViewport(); }
  resetView() { const bars = Math.min(160, Math.max(MIN_BARS, this.display.length)); this.view = { offset: Math.max(0, this.display.length - bars), bars }; this._render(); this._emitViewport(); }
  jumpToLatest() { this.view.offset = Math.max(0, this.display.length - this.view.bars); this._clampView(); this._render(); this._emitViewport(); }
  panBars(n) { this.view.offset += n; this._clampView(); this._render(); this._emitViewport(); }
  setBars(bars) { this.view.bars = Math.max(MIN_BARS, Math.min(2000, Math.round(bars))); this._clampView(); this._render(); this._emitViewport(); }
  setView({ offset, bars } = {}) {
    if (Number.isFinite(bars)) this.view.bars = bars;
    if (Number.isFinite(offset)) this.view.offset = offset;
    this._clampView(); this._render();
  }
  /** Tear down listeners and the resize observer. */
  destroy() {
    this.destroyed = true;
    try { this.ro.disconnect(); } catch { }
    this.over.removeEventListener("wheel", this._onWheel);
    this.over.removeEventListener("pointerdown", this._onDown);
    this.over.removeEventListener("pointermove", this._onMove);
    this.over.removeEventListener("pointerup", this._onUp);
    this.over.removeEventListener("pointerleave", this._onLeave);
    this.over.removeEventListener("dblclick", this._onDbl);
    this.container.replaceChildren();
  }

  _emitViewport() { this.onEvent("viewport", { id: this.id, offset: this.view.offset, bars: this.view.bars }); }

  /** Show a crosshair at a data timestamp (used for multi-pane sync). */
  showCrosshairAtTime(t) {
    if (!this.times.length) return;
    const i = this.indexAtTime(t);
    this.hover = { x: this.xOfIndex(i), y: this.geom.main.bottom, time: this.timeAtIndex(i) };
    this._overlay();
  }
  clearCrosshair() { if (this.hover) { this.hover = null; this._overlay(); } }

  zoom(factor, anchorX = this.geom.plotRight / 2) {
    if (!this.display.length) return;
    const i0 = this.indexOfX(anchorX);
    const bars = Math.max(MIN_BARS, Math.min(Math.max(this.display.length, MIN_BARS), Math.round(this.view.bars * factor)));
    const frac = anchorX / (this.geom.plotRight || 1);
    this.view = { bars, offset: i0 - frac * bars };
    this._clampView();
    this._render();
  }

  deleteSelection() { if (this.model && this.selection && this.model.find(this.selection)) { this.model.remove(this.selection); this.selection = null; this._render(); return true; } return false; }
  clearDrawings() { if (this.model) { this.model.clear(); this.selection = null; this._render(); } }
  undo() { if (this.model && this.model.undo()) { this.selection = null; this._render(); return true; } return false; }
  redo() { if (this.model && this.model.redo()) { this.selection = null; this._render(); return true; } return false; }

  _clampView() {
    const n = this.display.length;
    this.view.bars = Math.max(MIN_BARS, Math.min(2000, Math.round(this.view.bars) || MIN_BARS));
    const maxOffset = Math.max(0, n - MIN_BARS);
    this.view.offset = Math.max(0, Math.min(maxOffset, this.view.offset));
    if (n && this.view.offset + this.view.bars > n) {
      // allow a little empty space on the right but not unbounded
      this.view.offset = Math.min(this.view.offset, Math.max(0, n - Math.round(this.view.bars * 0.5)));
    }
  }

  resize() {
    if (this.destroyed) return;
    this.width = Math.max(120, this.container.clientWidth || 300);
    this.height = Math.max(140, this.container.clientHeight || 260);
    const dpr = window.devicePixelRatio || 1;
    for (const cv of [this.base, this.over]) {
      cv.width = Math.max(1, Math.round(this.width * dpr));
      cv.height = Math.max(1, Math.round(this.height * dpr));
      cv.style.width = this.width + "px";
      cv.style.height = this.height + "px";
    }
    this.dpr = dpr;
    this._render();
    this._overlay();
  }

  _ctx(cv) { const g = cv.getContext("2d"); g.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0); return g; }

  // ---------------------------------------------------------------- mapping
  _buildDisplay() {
    const type = this.options.chartType;
    if (type === "heikinashi") this.display = heikinAshi(this.candles).filter(Boolean);
    else if (type === "renko") this.display = renko(this.candles, {});
    else this.display = this.candles;
    this.times = this.display.map((c) => c.time);
  }

  xOfIndex(i) { return ((i - this.view.offset + 0.5) / this.view.bars) * (this.geom.plotRight || 1); }
  indexOfX(x) { return this.view.offset + (x / (this.geom.plotRight || 1)) * this.view.bars - 0.5; }
  indexAtTime(t) {
    if (!this.times.length) return 0;
    const i = bisect(this.times, t);
    if (i >= this.times.length - 1) return i;
    const t0 = this.times[i], t1 = this.times[i + 1];
    const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
    return i + Math.max(0, Math.min(1, f));
  }
  timeAtIndex(i) {
    if (!this.times.length) return Date.now();
    const j = Math.max(0, Math.min(this.times.length - 1, Math.round(i)));
    return this.times[j];
  }

  _range() {
    const n = this.display.length;
    const bars = Math.max(MIN_BARS, Math.round(this.view.bars));
    let start = Math.max(0, Math.min(Math.round(this.view.offset), Math.max(0, n - 1)));
    let end = Math.min(n, start + bars);
    if (end - start < Math.min(bars, n)) start = Math.max(0, end - bars);
    return { start, end: Math.max(end, start + 1) };
  }

  _priceRange(start, end) {
    let min = Infinity, max = -Infinity;
    for (let i = start; i < end; i++) {
      const c = this.display[i]; if (!c) continue;
      if (Number.isFinite(c.low)) min = Math.min(min, c.low);
      if (Number.isFinite(c.high)) max = Math.max(max, c.high);
    }
    const scan = (arr) => { if (!Array.isArray(arr)) return; for (let i = start; i < end; i++) { const v = arr[i]; if (Number.isFinite(v)) { if (v < min) min = v; if (v > max) max = v; } } };
    for (const ind of this.overlays) for (const s of ind.main) {
      scan(s.data); scan(s.upper); scan(s.lower);
      if (s.type === "markers") for (const m of [...(s.highs || []), ...(s.lows || [])]) if (m.index >= start && m.index < end) { if (m.price < min) min = m.price; if (m.price > max) max = m.price; }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) { const b = this.display[end - 1]?.close ?? 1; min = b * 0.99; max = b * 1.01; }
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.06;
    min -= pad; max += pad;
    if (this.options.logScale && min <= 0) min = Math.max(1e-9, max * 1e-4);
    return { min, max };
  }

  _makeScale(pr) {
    const log = this.options.logScale;
    const tf = log ? Math.log : (x) => x;
    const a = tf(pr.min), b = tf(pr.max);
    const H = this.geom.main.height;
    return {
      y: (v) => PAD_TOP + (1 - (tf(v) - a) / (b - a || 1)) * H,
      val: (y) => { const t = 1 - (y - PAD_TOP) / (H || 1); return log ? Math.exp(a + t * (b - a)) : a + t * (b - a); },
    };
  }

  _computeLayout() {
    const plotRight = Math.max(40, this.width - AXIS_RIGHT);
    const fullH = Math.max(160, this.height - AXIS_BOTTOM);
    const nPanes = this.panes.length;
    const paneH = nPanes ? Math.min(Math.max(54, fullH * 0.15), 92) : 0;
    const totalPane = nPanes ? nPanes * (paneH + PANE_GAP) : 0;
    const mainH = Math.max(80, fullH - PAD_TOP - totalPane);
    this.geom = { plotRight, main: { top: PAD_TOP, height: mainH, bottom: PAD_TOP + mainH }, panes: [] };
    let y = PAD_TOP + mainH + PANE_GAP;
    for (const ind of this.panes) { this.geom.panes.push({ indicator: ind, top: y, height: paneH, bottom: y + paneH }); y += paneH + PANE_GAP; }
  }

  // ---------------------------------------------------------------- render
  _render() {
    if (this.destroyed || !this.width) return;
    this._computeLayout();
    const g = this._ctx(this.base);
    g.clearRect(0, 0, this.width, this.height);
    const { start, end } = this._range();
    const pr = this.priceView || this._priceRange(start, end);
    this.scale = this._makeScale(pr);
    this._shown = { start, end };
    this._drawGrid(g, pr);
    this._drawMain(g, start, end);
    this._drawOverlays(g, start, end);
    this._drawPanes(g, start, end);
    this._drawDrawings(g);
    this._drawTimeAxis(g, start, end);
    this._emitLegend();
  }

  _drawGrid(g, pr) {
    const { main, plotRight } = this.geom;
    g.save();
    g.font = "11px DM Sans, system-ui, sans-serif";
    g.textBaseline = "middle";
    if (this.options.grid) {
      g.strokeStyle = this.options.gridColor; g.lineWidth = 1;
      for (let k = 0; k <= 5; k++) {
        const y = main.top + (main.height * k) / 5;
        g.beginPath(); g.moveTo(0, y); g.lineTo(plotRight, y); g.stroke();
        const v = this.options.logScale ? Math.exp(Math.log(pr.min) + (Math.log(pr.max) - Math.log(pr.min)) * (1 - k / 5)) : pr.min + (pr.max - pr.min) * (1 - k / 5);
        g.fillStyle = this.options.textColor; g.textAlign = "left"; g.fillText(fmtAxis(v), plotRight + 6, y);
      }
    }
    g.restore();
  }

  _drawMain(g, start, end) {
    const { main, plotRight } = this.geom;
    const type = this.options.chartType;
    const bw = Math.max(1, (plotRight / Math.max(1, end - start)) * 0.68);
    g.save();
    g.beginPath(); g.rect(0, main.top - 2, plotRight, main.height + 4); g.clip();

    if (type === "line" || type === "area" || type === "baseline") {
      const pts = [];
      for (let i = start; i < end; i++) { const c = this.display[i]; if (c && Number.isFinite(c.close)) pts.push([this.xOfIndex(i), this.scale.y(c.close)]); }
      if (type === "area" && pts.length) {
        const grad = g.createLinearGradient(0, main.top, 0, main.bottom);
        grad.addColorStop(0, "rgba(141,175,255,0.35)"); grad.addColorStop(1, "rgba(141,175,255,0)");
        g.beginPath(); g.moveTo(pts[0][0], main.bottom); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(pts[pts.length - 1][0], main.bottom); g.closePath();
        g.fillStyle = grad; g.fill();
      }
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (type === "baseline") {
        const dv = this.display[Math.min(end, this.display.length) - 1]?.close ?? 0;
        g.strokeStyle = this.options.upColor; g.lineWidth = 1.6; g.stroke();
        const baseline = Number.isFinite(this.options.baseline) ? this.options.baseline : dv;
        g.strokeStyle = "rgba(141,175,255,0.45)"; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(0, this.scale.y(baseline)); g.lineTo(plotRight, this.scale.y(baseline)); g.stroke(); g.setLineDash([]);
      } else {
        g.strokeStyle = "#8dafff"; g.lineWidth = 1.6; g.stroke();
      }
      g.restore();
      return;
    }

    for (let i = start; i < end; i++) {
      const c = this.display[i]; if (!c) continue;
      const x = this.xOfIndex(i), upBar = c.close >= c.open, col = upBar ? this.options.upColor : this.options.downColor;
      if (type === "bars") {
        g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
        g.moveTo(x, this.scale.y(c.high)); g.lineTo(x, this.scale.y(c.low));
        g.moveTo(x - bw / 2, this.scale.y(c.open)); g.lineTo(x, this.scale.y(c.open));
        g.moveTo(x, this.scale.y(c.close)); g.lineTo(x + bw / 2, this.scale.y(c.close));
        g.stroke();
        continue;
      }
      g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(x, this.scale.y(c.high)); g.lineTo(x, this.scale.y(c.low)); g.stroke();
      const y1 = this.scale.y(c.open), y2 = this.scale.y(c.close);
      const top = Math.min(y1, y2), hgt = Math.max(1, Math.abs(y2 - y1));
      if (type === "hollow") {
        if (upBar) { g.strokeStyle = col; g.strokeRect(x - bw / 2, top, bw, hgt); }
        else { g.fillStyle = col; g.fillRect(x - bw / 2, top, bw, hgt); }
      } else { g.fillStyle = col; g.fillRect(x - bw / 2, top, bw, hgt); }
    }
    g.restore();
  }

  _drawOverlays(g, start, end) {
    g.save(); g.beginPath(); g.rect(0, this.geom.main.top - 2, this.geom.plotRight, this.geom.main.height + 4); g.clip();
    for (const ind of this.overlays) for (const s of ind.main) {
      if (s.type === "band") this._drawBand(g, s, start, end);
      else if (s.type === "markers") this._drawMarkers(g, s, start, end);
      else this._drawLine(g, s.data, s.color, s.width || 1.4, s.dash || [], start, end, this.scale.y);
    }
    g.restore();
  }

  _drawBand(g, s, start, end) {
    const { upper, lower } = s;
    if (!Array.isArray(upper) || !Array.isArray(lower)) return;
    g.save(); g.beginPath();
    let began = false;
    for (let i = start; i < end; i++) { const v = upper[i]; if (!Number.isFinite(v)) continue; const x = this.xOfIndex(i), y = this.scale.y(v); began ? g.lineTo(x, y) : (g.moveTo(x, y), began = true); }
    for (let i = end - 1; i >= start; i--) { const v = lower[i]; if (!Number.isFinite(v)) continue; g.lineTo(this.xOfIndex(i), this.scale.y(v)); }
    g.closePath(); g.fillStyle = "rgba(141,175,255,0.08)"; g.fill(); g.restore();
    this._drawLine(g, upper, s.color, 1, [], start, end, this.scale.y);
    this._drawLine(g, lower, s.color, 1, [], start, end, this.scale.y);
    if (s.data) this._drawLine(g, s.data, s.color, 1.2, [5, 4], start, end, this.scale.y);
  }

  _drawMarkers(g, s, start, end) {
    for (const m of s.highs || []) { if (m.index < start || m.index >= end) continue; const x = this.xOfIndex(m.index), y = this.scale.y(m.price); g.fillStyle = "#f38ba8"; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x - 4, y - 2); g.lineTo(x + 4, y - 2); g.closePath(); g.fill(); }
    for (const m of s.lows || []) { if (m.index < start || m.index >= end) continue; const x = this.xOfIndex(m.index), y = this.scale.y(m.price); g.fillStyle = "#a6e3a1"; g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x - 4, y + 2); g.lineTo(x + 4, y + 2); g.closePath(); g.fill(); }
  }

  _drawLine(g, data, color, width, dash, start, end, yFn) {
    if (!Array.isArray(data)) return;
    g.save(); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath();
    let began = false;
    for (let i = start; i < end; i++) { const v = data[i]; if (!Number.isFinite(v)) continue; const x = this.xOfIndex(i), y = yFn(v); began ? g.lineTo(x, y) : (g.moveTo(x, y), began = true); }
    g.stroke(); g.restore();
  }

  _drawPanes(g, start, end) {
    for (const pane of this.geom.panes) {
      const series = pane.indicator.pane.series || [];
      let min = Infinity, max = -Infinity;
      for (const s of series) for (let i = start; i < end; i++) { const v = s.data?.[i]; if (Number.isFinite(v)) { if (v < min) min = v; if (v > max) max = v; } }
      const fixed = pane.indicator.pane.fixedScale;
      if (Number.isFinite(fixed?.[0]) && Number.isFinite(fixed?.[1])) { min = fixed[0]; max = fixed[1]; }
      if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
      if (min === max) max = min + 1;
      const pad = (max - min) * 0.08; min -= pad; max += pad;
      const yFn = (v) => pane.bottom - ((v - min) / (max - min || 1)) * pane.height;
      g.save();
      g.strokeStyle = this.options.gridColor; g.strokeRect(0, pane.top, this.geom.plotRight, pane.height);
      g.font = "10px DM Sans, system-ui, sans-serif";
      for (const r of pane.indicator.pane.refs || []) { const y = yFn(r.value); g.strokeStyle = r.color; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(0, y); g.lineTo(this.geom.plotRight, y); g.stroke(); g.setLineDash([]); }
      const baseV = min <= 0 && max >= 0 ? 0 : min;
      const y0 = yFn(baseV);
      for (const s of series.filter((x) => x.type === "hist")) {
        for (let i = start; i < end; i++) { const v = s.data[i]; if (!Number.isFinite(v)) continue; const x = this.xOfIndex(i), y = yFn(v); g.fillStyle = v >= baseV ? "rgba(38,166,154,0.55)" : "rgba(239,83,80,0.55)"; g.fillRect(x - 2, Math.min(y0, y), 4, Math.max(1, Math.abs(y - y0))); }
      }
      for (const s of series.filter((x) => x.type !== "hist")) this._drawLine(g, s.data, s.color, 1.3, [], start, end, yFn);
      g.fillStyle = this.options.textColor; g.textAlign = "left"; g.textBaseline = "top";
      g.fillText(fmtAxis(max), this.geom.plotRight + 6, pane.top + 2);
      g.fillText(fmtAxis(min), this.geom.plotRight + 6, pane.bottom - 12);
    }
  }

  _drawTimeAxis(g, start, end) {
    const y = this.geom.main.bottom + 6;
    g.save(); g.fillStyle = this.options.textColor; g.font = "10px DM Sans, system-ui, sans-serif"; g.textBaseline = "top"; g.textAlign = "center";
    const step = Math.max(1, Math.round((end - start) / 6));
    for (let i = Math.ceil((start + 1) / step) * step; i < end; i += step) {
      const c = this.display[i]; if (!c) continue;
      g.fillText(fmtTime(c.time, this.options.intervalMs, this.options.timezone), this.xOfIndex(i), y);
    }
    g.restore();
  }

  // ---------------------------------------------------------------- drawings
  _mapper() { return { x: (t) => this.xOfIndex(this.indexAtTime(t)), y: (p) => this.scale.y(p) }; }

  _drawDrawings(g) {
    if (!this.model) return;
    const m = this._mapper();
    for (const d of this.model.list) this._drawDrawing(g, d, m);
  }

  _drawDrawing(g, d, m, draft = false) {
    if (!d.visible && !draft) return;
    const pts = d.points.map((p) => ({ x: m.x(p.time), y: m.y(p.price) }));
    const [a, b] = [pts[0], pts[1] || pts[0]];
    g.save(); g.strokeStyle = d.color; g.fillStyle = d.color; g.lineWidth = d.width; g.setLineDash(draft ? [5, 4] : []);
    switch (d.tool) {
      case "hline": g.beginPath(); g.moveTo(0, a.y); g.lineTo(this.geom.plotRight, a.y); g.stroke(); this._axisTag(g, d.points[0].price, a.y, d.color); break;
      case "vline": g.beginPath(); g.moveTo(a.x, this.geom.main.top); g.lineTo(a.x, this.geom.main.bottom); g.stroke(); break;
      case "trendline": g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); break;
      case "ray": {
        const dx = b.x - a.x, dy = b.y - a.y;
        const t = dx !== 0 ? (this.geom.plotRight - a.x) / dx : 1e6;
        const scale = Math.abs(t) > 0 && Math.abs(t) < 1e6 ? t : 1e6;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + dx * Math.max(1, scale), a.y + dy * Math.max(1, scale)); g.stroke(); break;
      }
      case "rect": {
        const x = Math.min(a.x, b.x), w = Math.abs(b.x - a.x), y = Math.min(a.y, b.y), h = Math.abs(b.y - a.y);
        g.globalAlpha = 0.12; g.fillRect(x, y, w, h); g.globalAlpha = 1; g.strokeRect(x, y, w, h); break;
      }
      case "fib": this._drawFib(g, a, b, d.color); break;
      case "measure": this._drawMeasure(g, d, a, b); break;
      case "text": g.font = "12px DM Sans, system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "bottom"; g.fillText(d.text || "text", a.x + 4, a.y - 2); break;
      default: break;
    }
    if (this.selection === d.id || draft) for (const p of pts) { g.fillStyle = "#fff"; g.strokeStyle = d.color; g.beginPath(); g.arc(p.x, p.y, 3.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.restore();
  }

  _axisTag(g, price, y, color) {
    g.save(); g.font = "10px DM Sans, system-ui, sans-serif"; g.textAlign = "right"; g.textBaseline = "middle";
    g.fillStyle = color; g.fillText(fmtAxis(price), this.geom.plotRight + 60, y); g.restore();
  }

  _drawFib(g, a, b, color) {
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x);
    g.save(); g.font = "10px DM Sans, system-ui, sans-serif"; g.textBaseline = "middle"; g.textAlign = "left";
    for (const lv of levels) {
      const y = a.y + (b.y - a.y) * lv;
      g.strokeStyle = color; g.globalAlpha = lv === 0 || lv === 1 ? 0.9 : 0.55; g.setLineDash(lv === 0 || lv === 1 ? [] : [4, 4]);
      g.beginPath(); g.moveTo(left, y); g.lineTo(right, y); g.stroke();
      g.globalAlpha = 1; g.fillStyle = color; g.fillText(lv.toFixed(3), left + 4, y - 7);
    }
    g.restore();
  }

  _drawMeasure(g, d, a, b) {
    g.save(); g.strokeStyle = d.color; g.fillStyle = d.color; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
    g.fillRect(a.x - 3, a.y - 3, 6, 6); g.fillRect(b.x - 3, b.y - 3, 6, 6);
    const dp = d.points[1].price - d.points[0].price;
    const pct = d.points[0].price ? (dp / d.points[0].price) * 100 : NaN;
    const label = `${dp >= 0 ? "+" : ""}${fmtAxis(dp)} (${Number.isFinite(pct) ? pct.toFixed(2) : "—"}%)`;
    g.font = "11px DM Sans, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
    const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 6, w = g.measureText(label).width + 10;
    g.fillStyle = "rgba(11,17,32,0.9)"; g.fillRect(cx - w / 2, cy - 16, w, 16);
    g.fillStyle = (d.points[1].price - d.points[0].price) >= 0 ? this.options.upColor : this.options.downColor;
    g.textAlign = "center"; g.fillText(label, cx, cy - 2);
    g.restore();
  }

  // ---------------------------------------------------------------- overlay layer
  _overlay() {
    if (this.destroyed || !this.width) return;
    const g = this._ctx(this.over);
    g.clearRect(0, 0, this.width, this.height);
    if (this.draft && this.model) this._drawDrawing(g, this.draft, this._mapper(), true);
    if (!this.options.crosshair || !this.hover) return;
    const { y } = this.hover;
    const idx = Math.max(0, Math.min(this.display.length - 1, Math.round(this.indexAtTime(this.hover.time))));
    const cx = this.xOfIndex(idx);
    g.save(); g.strokeStyle = "rgba(155,169,189,0.55)"; g.setLineDash([3, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, this.geom.main.top); g.lineTo(cx, this.geom.main.bottom); g.stroke();
    if (y >= this.geom.main.top && y <= this.geom.main.bottom) { g.beginPath(); g.moveTo(0, y); g.lineTo(this.geom.plotRight, y); g.stroke(); }
    g.setLineDash([]);
    if (y >= this.geom.main.top && y <= this.geom.main.bottom) {
      const price = this.scale.val(y);
      g.fillStyle = "#0b1120"; g.strokeStyle = this.options.axisColor;
      g.fillRect(this.geom.plotRight, y - 9, AXIS_RIGHT, 18); g.strokeRect(this.geom.plotRight, y - 9, AXIS_RIGHT, 18);
      g.fillStyle = "#f2f5fb"; g.font = "11px DM Sans, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(fmtAxis(price), this.geom.plotRight + AXIS_RIGHT / 2, y);
    }
    g.restore();
  }

  _emitLegend() {
    const n = this.display.length;
    const idx = n ? Math.max(0, Math.min(n - 1, Math.round(this.indexAtTime(this.hover ? this.hover.time : (this.times[n - 1] || Date.now()))))) : 0;
    const candle = this.display[idx] || null;
    const values = [];
    for (const ind of this.overlays) for (const s of ind.main) if (s.type !== "markers" && Array.isArray(s.data)) values.push({ name: s.name, color: s.color, value: s.data[idx] });
    for (const p of this.panes) for (const s of p.pane.series) values.push({ name: s.name, color: s.color, value: s.data?.[idx] });
    this.onEvent("crosshair", { id: this.id, index: idx, time: candle ? candle.time : null, candle, values, derived: this.display !== this.candles, active: !!this.hover });
  }

  // ---------------------------------------------------------------- interaction
  _pt(e) { const r = this.over.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  _dataAt(x, y) {
    const idx = this.indexOfX(x);
    const price = this.scale.val(Math.max(this.geom.main.top, Math.min(this.geom.main.bottom, y)));
    return { time: this.timeAtIndex(idx), price };
  }

  _wheel(e) {
    e.preventDefault();
    const { x } = this._pt(e);
    this.zoom(e.deltaY < 0 ? 0.85 : 1.18, x);
  }

  _down(e) {
    if (!this.display.length) return;
    const { x, y } = this._pt(e);
    try { this.over.setPointerCapture(e.pointerId); } catch { }
    if (this.tool === "cursor") {
      const m = this._mapper();
      let hit = null;
      if (this.model) for (let i = this.model.list.length - 1; i >= 0; i--) if (hitTest(this.model.list[i], m, x, y, 6)) { hit = this.model.list[i]; break; }
      if (hit) { this.selection = hit.id; this.drag = { mode: "drawing", id: hit.id, x0: x, y0: y, orig: hit.points.map((p) => ({ ...p })) }; }
      else { this.selection = null; this.drag = { mode: "pan", x0: x, offset0: this.view.offset }; }
      this._render();
    } else {
      const p = this._dataAt(x, y);
      this.draft = createDrawing(this.tool, p, p);
      this.drag = { mode: "draft" };
      this._overlay();
    }
  }

  _move(e) {
    const { x, y } = this._pt(e);
    if (this.drag?.mode === "pan") {
      const perBar = (this.geom.plotRight || 1) / this.view.bars;
      this.view.offset = this.drag.offset0 + (this.drag.x0 - x) / perBar;
      this._clampView(); this._render(); this._emitViewport(); return;
    }
    if (this.drag?.mode === "drawing") {
      const d = this.model?.find(this.drag.id); if (!d) return;
      const p0 = this._dataAt(this.drag.x0, this.drag.y0), p1 = this._dataAt(x, y);
      d.points = this.drag.orig.map((p) => ({ time: Math.round(p.time + (p1.time - p0.time)), price: p.price + (p1.price - p0.price) }));
      this._render(); return;
    }
    if (this.drag?.mode === "draft" && this.draft) {
      const p = this._dataAt(x, y);
      if (this.draft.points.length === 1) this.draft.points.push(p); else this.draft.points[1] = p;
      this._overlay(); return;
    }
    // hover / crosshair
    this.hover = { x, y, time: this.timeAtIndex(this.indexOfX(x)) };
    this._overlay();
    this._emitLegend();
  }

  _up(e) {
    try { this.over.releasePointerCapture(e.pointerId); } catch { }
    if (this.drag?.mode === "draft" && this.draft) {
      const d = this.draft; this.draft = null;
      if (d.tool === "text") {
        const t = this.requestText();
        if (t == null || t === "") { this.drag = null; this._render(); return; }
        d.text = String(t).slice(0, 200);
      }
      if (this.model) { this.model.add(d); this.selection = d.id; }
      this._render();
    }
    this.drag = null;
  }
}

function fmtAxis(v) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const dp = a >= 1000 ? 2 : a >= 100 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8;
  return v.toLocaleString(undefined, { maximumFractionDigits: dp });
}

export default ChartEngine;
