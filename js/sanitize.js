// PARCHXA input-hardening helpers. Treat every URL param, LocalStorage value and user string as hostile.
// Pure, dependency-free, unit-testable. Educational site: no server, so the browser is the trust boundary.
// Educational use only. Not financial, tax or legal advice.

/** HTML-escape a string so it is safe inside text nodes and attribute values. */
export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

/** Remove anything that looks like a tag/control character from a string. */
export function stripTags(text) {
  return String(text ?? "").replace(/<\/?[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, "");
}

/**
 * Sanitize a free-text field destined for `textContent` rendering.
 * Strips control characters and angle brackets, collapses whitespace and enforces a length cap.
 */
export function sanitizeText(text, maxLength = 200) {
  return String(text ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, Math.max(0, Math.floor(maxLength)));
}

/** Allow only http(s), mailto, tel and same-origin relative URLs. Returns "" for anything else (javascript:, data:, etc.). */
export function safeUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  if (/^(mailto:|tel:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) { try { return new URL(raw).toString(); } catch { return ""; } }
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return ""; // any other scheme is rejected
  if (raw.startsWith("//")) return "";               // protocol-relative is ambiguous
  return raw.replace(/[\u0000-\u001f\u007f]/g, "");
}

/** Parse a base-10 number, clamped to [min, max]. Returns fallback for non-finite input. */
export function safeNumber(value, { min = -Infinity, max = Infinity, fallback = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Parse a non-negative integer, clamped. */
export function safeInt(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Parse a validated number from a URL param, with a regex guard before numeric coercion. */
export function safeQueryNumber(params, key, { min = -Infinity, max = Infinity, fallback = NaN } = {}) {
  const raw = typeof params?.get === "function" ? params.get(key) : null;
  if (raw == null || raw === "" || !/^-?\d{1,15}(\.\d{1,8})?$/.test(raw)) return fallback;
  return safeNumber(raw, { min, max, fallback });
}

/** Read a sanitized text URL param. */
export function safeQueryText(params, key, maxLength = 120) {
  return sanitizeText(typeof params?.get === "function" ? params.get(key) : "", maxLength);
}

/** Cryptographically-random id when available, else a time-based fallback. Never used for security decisions. */
export function randomId() {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* ignore */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// A conservative, non-exhaustive list for user-generated memorial text. Not a moderation system.
const PROFANITY = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|nigg\w*|fag\w*|slut\w*|whore\w*|retard\w*|asshole\w*|bastard\w*)\b/i;

/** True when the supplied text contains a flagged token. */
export function containsProfanity(...parts) {
  return PROFANITY.test(parts.map((p) => String(p ?? "")).join(" "));
}

/** Recursively freeze an object so shared config/registry objects cannot be mutated at runtime. */
export function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const value of Object.values(obj)) deepFreeze(value);
  }
  return obj;
}
