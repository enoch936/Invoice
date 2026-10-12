document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
const themeToggle = document.querySelector("#theme-toggle");
if (themeToggle) {
  const stored = localStorage.getItem("parchxa.theme.v1") || "dark";
  document.documentElement.dataset.theme = stored;
  themeToggle.textContent = stored === "light" ? "Dark mode" : "Light mode";
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("parchxa.theme.v1", next);
    themeToggle.textContent = next === "light" ? "Dark mode" : "Light mode";
  });
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
