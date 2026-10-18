import "./site.js";
import { initTheme } from "./theme.js";
document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
initTheme();
if (document.querySelector("[data-tool-search]")) {
  import("./home.js").then((m) => m.initHomeTools()).catch(() => {});
}
const exportJson = (name, data) => {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {}
};
window.__exportJson = exportJson;
