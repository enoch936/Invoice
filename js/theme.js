// PARCHXA shared theme store. One source of truth for dark/light across the site.
// A tiny inline bootstrap (see tools/apply-head.mjs) applies the stored theme before first paint;
// this module keeps buttons and the command palette in sync with it.
const THEME_KEY = "parchxa.theme.v1";

export function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(next) {
  const theme = next === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* private mode */ }
  const label = theme === "light" ? "Dark mode" : "Light mode";
  const tip = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  document.querySelectorAll("[data-theme-toggle], #theme-toggle").forEach((btn) => {
    // Icon toggles keep their SVG children; only text buttons get relabelled.
    if (btn.querySelector("svg")) {
      btn.setAttribute("aria-label", tip);
      btn.setAttribute("title", tip);
    } else {
      btn.textContent = label;
    }
  });
}

export function toggleTheme() {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

export function initTheme() {
  setTheme(getTheme());
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-theme-toggle], #theme-toggle");
    if (btn) toggleTheme();
  });
}
