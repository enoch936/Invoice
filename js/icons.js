// PARCHXA icon set — small Lucide-style inline SVGs (stroke, 24px grid, currentColor).
// No icon-font or sprite dependency; markup is generated at runtime from these paths.
const ICONS = {
  "search": '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  "moon": '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  "files": '<path d="M15 2H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M15 2v5h5"/><path d="M5 8v12a2 2 0 0 0 2 2h9"/>',
  "wallet": '<path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M2 7V5a2 2 0 0 1 2-2h13v4"/><path d="M16 14h2"/>',
  "calculator": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4"/>',
  "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  "banknote": '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  "trending-up": '<path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
  "landmark": '<path d="M3 21h18M5 10v8M10 10v8M14 10v8M19 10v8M12 2 2 8h20L12 2z"/>',
  "percent": '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  "target": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  "bar-chart": '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17v-9M18 17v-3"/>',
  "monitor": '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  "coins": '<circle cx="9" cy="9" r="6"/><path d="M15.5 6.2A6 6 0 0 1 15 20.5"/><path d="M18.6 4.2A9.5 9.5 0 0 1 18 20.8"/>',
  "bitcoin": '<circle cx="12" cy="12" r="9"/><path d="M9 8h4a2.5 2.5 0 0 1 0 5H9m0-5v8m0-8H9m3 0v8m0-8h1.5a2.5 2.5 0 0 1 0 5H12M10 5v2m4-2v2m-4 10v2m4-2v2"/>',
  "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  "function": '<path d="M18 7V4H8l5 8-5 8h10v-3"/>',
  "activity": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  "sigma": '<path d="M18 7V4H6l6 8-6 8h12v-3"/>',
  "graduation-cap": '<path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>',
  "repeat": '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  "flame": '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3.5-6.5C14 10 13 11 12 11c0-2 1-4 0-6-3 2-6 4.5-6 8 0 4 3 7 6 7z"/>',
  "zap": '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  "eye": '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  "shield-check": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  "spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8"/>',
};

/** Return an inline SVG string for a named icon. Unknown names fall back to a spark glyph. */
export function iconSvg(name, size = 18, cls = "") {
  const body = ICONS[name] || ICONS.spark;
  const clsAttr = cls ? ` class="${cls}"` : "";
  return `<svg${clsAttr} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Replace every [data-icon] placeholder under root with its SVG (once). */
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    if (node.dataset.iconDone) return;
    node.innerHTML = iconSvg(node.dataset.icon, Number(node.dataset.iconSize) || 18);
    node.dataset.iconDone = "1";
  });
}
