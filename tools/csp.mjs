// Single source of truth for the Content-Security-Policy applied to every page via a <meta> tag.
// Note: a meta CSP cannot set frame-ancestors/hsts; those are listed so the same string can be
// reused as a real response header if the site ever moves to a host that supports them.
//
// 'unsafe-inline' is required because the pages embed JSON-LD data blocks and ad units use inline
// styles. Everything else is locked down: no plugins, no cross-origin scripts beyond the known
// analytics/ads hosts, and forms can only post to the site itself.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://plausible.io https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://open.er-api.com https://api.binance.com https://data-api.binance.vision https://plausible.io https://*.umami.is",
  "object-src 'none'",
  "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** The exact <meta> tags to inject, as a single line. */
export const SECURITY_META =
  `<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
  `<meta name="referrer" content="strict-origin-when-cross-origin">`;
