// PARCHXA calculator formatting helpers.
//
// Pure, dependency-free and safe to import in the browser, in the page generator and in unit
// tests. Nothing here touches the DOM or global state, so the same code formats on the server and
// in the client. Educational tools only — not financial, tax or legal advice.

/** Currencies offered by the shared calculator currency selector. */
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British pound" },
  { code: "ETB", symbol: "Br", name: "Ethiopian birr" },
  { code: "KES", symbol: "KSh", name: "Kenyan shilling" },
  { code: "NGN", symbol: "₦", name: "Nigerian naira" },
  { code: "INR", symbol: "₹", name: "Indian rupee" },
  { code: "ZAR", symbol: "R", name: "South African rand" },
  { code: "CAD", symbol: "C$", name: "Canadian dollar" },
  { code: "AUD", symbol: "A$", name: "Australian dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese yen" },
  { code: "AED", symbol: "AED ", name: "UAE dirham" },
];

export const DEFAULT_CURRENCY = "USD";

/** Symbol for a currency code (falls back to the code plus a space). */
export function currencySymbol(code) {
  const hit = CURRENCIES.find((c) => c.code === String(code || "").toUpperCase());
  return hit ? hit.symbol : `${code} `;
}

const finite = (n) => typeof n === "number" && Number.isFinite(n);

/** Format a number with thousands separators and a fixed maximum of decimals. */
export function formatNumber(value, { maxFrac = 2, minFrac = 0 } = {}) {
  if (!finite(value)) return "—";
  try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFrac, minimumFractionDigits: minFrac }).format(value); }
  catch { return value.toFixed(maxFrac); }
}

/** Format a value as currency for the given ISO code. */
export function formatCurrency(value, code = DEFAULT_CURRENCY, { maxFrac = 2 } = {}) {
  if (!finite(value)) return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: String(code).toUpperCase(), maximumFractionDigits: maxFrac }).format(value); }
  catch { return `${code} ${formatNumber(value, { maxFrac })}`; }
}

/** Format a percentage value (already multiplied by 100). */
export function formatPercent(value, { maxFrac = 2 } = {}) {
  if (!finite(value)) return "—";
  return `${formatNumber(value, { maxFrac })}%`;
}

/**
 * Render a single result value using its declared format.
 * @param {*} value
 * @param {"currency"|"percent"|"number"|"integer"|"text"} format
 * @param {{currency?:string}} ctx
 */
export function formatValue(value, format = "number", ctx = {}) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (!finite(value)) return "—";
  switch (format) {
    case "currency": return formatCurrency(value, ctx.currency || DEFAULT_CURRENCY);
    case "percent": return formatPercent(value);
    case "integer": return formatNumber(value, { maxFrac: 0 });
    default: return formatNumber(value);
  }
}

/** Round to a number of decimal places without floating-point surprises (half away from zero). */
export function round(value, dp = 2) {
  const n = Number(value);
  if (!finite(n)) return NaN;
  const f = Math.pow(10, dp);
  const scaled = n * f;
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled) + Number.EPSILON);
  return rounded / f;
}
