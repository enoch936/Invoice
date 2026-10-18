// Home page tool explorer: instant search + category chips over the static [data-tool-card] grid.
// Progressive enhancement — without JS every card is still visible and clickable.
export function initHomeTools() {
  const search = document.querySelector("[data-tool-search]");
  const cards = [...document.querySelectorAll("[data-tool-card]")];
  const chips = [...document.querySelectorAll("[data-filter]")];
  const groups = [...document.querySelectorAll("[data-cat-group]")];
  const result = document.querySelector("[data-tool-result]");
  if (!search || !cards.length) return;

  let active = "all";

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const okCat = active === "all" || card.dataset.category === active;
      const hay = (card.dataset.search || "") + " " + card.textContent.toLowerCase();
      const okQ = !q || hay.toLowerCase().includes(q);
      const show = okCat && okQ;
      card.hidden = !show;
      if (show) visible++;
    });
    groups.forEach((group) => { group.hidden = !group.querySelector("[data-tool-card]:not([hidden])"); });
    if (result) result.textContent = visible ? `${visible} tool${visible === 1 ? "" : "s"} shown` : "No tools match — try another word.";
  };

  chips.forEach((chip) => chip.addEventListener("click", () => {
    active = chip.dataset.filter || "all";
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    apply();
  }));

  search.addEventListener("input", apply);

  // Category rail tiles jump to the grid and pre-apply their filter.
  document.querySelectorAll("[data-cat-link]").forEach((link) => link.addEventListener("click", () => {
    const chip = chips.find((c) => c.dataset.filter === link.dataset.catLink);
    if (chip) chip.click();
  }));

  apply();
}
