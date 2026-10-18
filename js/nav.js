// Single source of truth for the PARCHXA tool registry, shared by the nav, footer, command palette
// and the home page so new tools only have to be registered once.
// Educational tools only. Not financial, tax or legal advice.

/** @typedef {{href:string,label:string,group:string,keywords:string,nav?:boolean,desc?:string}} Tool */

/** @type {Tool[]} */
export const TOOLS = [
  { href: "invoice.html", label: "Invoice builder", group: "Get paid", nav: true, keywords: "invoice bill receipt client tax vat discount pdf status dashboard", desc: "Live-preview invoices with tax, discounts and a revenue dashboard." },
  { href: "quote.html", label: "Quotation builder", group: "Get paid", nav: true, keywords: "quote quotation proposal estimate scope terms", desc: "Scope, pricing and terms in one clean quotation." },
  { href: "calculators.html", label: "Freelance calculators", group: "Price work", nav: true, keywords: "hourly rate project price profit margin contingency billable", desc: "Hourly rate, project quote and profit estimates." },
  { href: "directory.html", label: "All calculators", group: "Price work", nav: true, keywords: "calculator directory finance loan interest business freelance trading crypto forex math statistics converter date health search", desc: "Search every PARCHXA calculator — finance, business, website income, trading, maths and more." },
  { href: "money.html", label: "Money planner", group: "Money", nav: true, keywords: "tax set-aside compound interest cagr retainer loan amortization vat", desc: "Tax set-aside, compound growth, loans, VAT and margins." },
  { href: "trading.html", label: "Trading risk suite", group: "Trading", nav: true, keywords: "position size liquidation kelly expectancy monte carlo risk of ruin var cvar", desc: "Position size, liquidation, Kelly, ruin and Monte Carlo." },
  { href: "chart.html", label: "Live chart & backtester", group: "Trading", nav: true, keywords: "candlestick ema rsi backtest signals confluence walk-forward", desc: "Candles, signals and a fee-aware backtester." },
  { href: "terminal.html", label: "Charting terminal", group: "Trading", nav: true, keywords: "terminal multi-chart panes watchlist alerts drawing tools replay heikin ashi renko live web socket indicators", desc: "A multi-pane terminal: live candles, 25+ studies, drawings, alerts and bar replay." },
  { href: "math.html", label: "Advanced math", group: "Learn", nav: true, keywords: "scientific calculator keypad statistics matrix function plotter regression converter t-test chi-square skew kurtosis sin cos tangent logarithm trigonometry", desc: "Scientific calculator keypad, statistics, matrices, regression and a function plotter." },
  { href: "profit.html", label: "Crypto profit calculators", group: "Trading", keywords: "crypto profit bitcoin ethereum solana roi break even fees pnl gains", desc: "Net profit, ROI and break-even after fees for major coins." },
  { href: "student.html", label: "Student toolkit", group: "Learn", nav: true, keywords: "gpa cgpa grade planner study schedule citation", desc: "GPA, grade planning and study tools." },
  { href: "convert.html", label: "Currency converter", group: "Convert", nav: true, keywords: "currency fx exchange rate usd eur gbp etb kes ngn inr zar", desc: "56 currency pairs with an indicative mid-market rate." },
  { href: "rates.html", label: "Hourly to salary", group: "Convert", nav: true, keywords: "salary annual pay wage hourly", desc: "Turn an hourly rate into a yearly salary in 11 currencies." },
  { href: "memorial.html", label: "Rest & remembrance", group: "More", keywords: "memorial candle tribute remembrance", desc: "Create a candle-lit memorial page and share card." },
];

/** Hrefs shown in the top navigation, in order. */
export const NAV_HREFS = ["invoice.html", "quote.html", "directory.html", "calculators.html", "money.html", "trading.html", "chart.html", "terminal.html", "math.html", "student.html"];

/** Short labels for the top navigation. */
export const NAV_LABELS = {
  "invoice.html": "Invoice",
  "quote.html": "Quotation",
  "directory.html": "Calculators",
  "calculators.html": "Freelance",
  "money.html": "Money",
  "trading.html": "Risk",
  "chart.html": "Charts",
  "terminal.html": "Terminal",
  "math.html": "Math",
  "student.html": "Student",
};

/** Navigation entries in order. */
export const NAV = NAV_HREFS.map((href) => {
  const tool = TOOLS.find((t) => t.href === href);
  return [href, NAV_LABELS[href] || tool?.label || href];
});

/** Simple fuzzy/substring match used by the command palette. */
export function matchTool(tool, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const haystack = `${tool.label} ${tool.group} ${tool.keywords} ${tool.desc || ""}`.toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/** Home page categories. hrefs may include pages outside the TOOLS registry (they still exist). */
export const TOOL_CATEGORIES = [
  { id: "documents", label: "Documents", blurb: "Invoices and quotations", hrefs: ["invoice.html", "quote.html", "project-quote.html"] },
  { id: "money", label: "Money", blurb: "Pricing, tax and loans", hrefs: ["money.html", "calculators.html", "freelance-rate.html", "rates.html", "compound-interest.html", "loan-payment.html", "profit-margin.html"] },
  { id: "trading", label: "Trading", blurb: "Risk, charts and crypto", hrefs: ["trading.html", "chart.html", "terminal.html", "profit.html", "crypto-profit.html", "forex-pip-value.html"] },
  { id: "math", label: "Math", blurb: "Statistics and algebra", hrefs: ["math.html", "percentage.html", "quadratic.html", "mean-median-mode.html"] },
  { id: "productivity", label: "Productivity", blurb: "Study, convert and remember", hrefs: ["student.html", "convert.html", "memorial.html", "cpm.html"] },
];

/** Reverse lookup: page href → category id. */
export const CATEGORY_BY_HREF = Object.fromEntries(TOOL_CATEGORIES.flatMap((c) => c.hrefs.map((h) => [h, c.id])));
