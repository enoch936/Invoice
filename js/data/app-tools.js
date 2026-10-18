// PARCHXA stand-alone app pages (not generated calculators).
//
// `js/registry.js` merges these with the calculator catalog and the generated family pages into a
// single tool list. Each entry is intentionally data-only so the registry can be imported from
// Node (tests, generators) without touching the DOM.

/**
 * @typedef {Object} AppTool
 * @property {string} id
 * @property {string} href
 * @property {string} title
 * @property {string} h1
 * @property {string} type        "app" | "hub"
 * @property {string} category    one of the registry category ids
 * @property {string} description one-line summary for cards and search
 * @property {string[]} tags      extra search keywords
 * @property {boolean} [featured]
 * @property {boolean} [popular]
 */

/** @type {AppTool[]} */
export const APP_TOOLS = [
  {
    id: "directory", href: "directory.html", title: "Tool directory", h1: "Every PARCHXA tool in one place",
    type: "hub", category: "general", featured: true, popular: true,
    description: "Browse and search every calculator and tool on PARCHXA, filtered by category, type and view.",
    tags: ["directory", "index", "all tools", "browse", "catalog", "search"],
  },
  {
    id: "calculators", href: "calculators.html", title: "Freelance calculators", h1: "Freelance calculators",
    type: "hub", category: "business", featured: true,
    description: "Hourly rate, project quote and profit calculators for freelancers and contractors.",
    tags: ["freelance", "rate", "quote", "profit", "contractor"],
  },
  {
    id: "invoice", href: "invoice.html", title: "Invoice builder", h1: "Invoice builder",
    type: "app", category: "business", featured: true, popular: true,
    description: "Create, save and print a professional freelance invoice — free and fully private.",
    tags: ["invoice", "billing", "bill", "receipt", "pdf", "print", "freelance"],
  },
  {
    id: "quote", href: "quote.html", title: "Quotation builder", h1: "Quotation builder",
    type: "app", category: "business", featured: true,
    description: "Prepare a professional quotation with editable items, an expiry date and print-to-PDF output.",
    tags: ["quote", "quotation", "estimate", "proposal", "proposal builder", "freelance"],
  },
  {
    id: "money", href: "money.html", title: "Money planner", h1: "Freelancer money planner",
    type: "app", category: "finance", featured: true, popular: true,
    description: "Tax set-aside, compound growth and retainer-vs-hourly planning for independent work.",
    tags: ["money", "tax", "set aside", "growth", "retainer", "savings", "planner"],
  },
  {
    id: "trading", href: "trading.html", title: "Trading risk tools", h1: "Trading risk & position size",
    type: "app", category: "trading", featured: true, popular: true,
    description: "Position size, liquidation price, expectancy, Kelly and Monte Carlo risk-of-ruin calculators.",
    tags: ["trading", "risk", "position size", "liquidation", "kelly", "monte carlo", "expectancy"],
  },
  {
    id: "chart", href: "chart.html", title: "Crypto chart & backtester", h1: "Candlestick chart, signals & backtester",
    type: "app", category: "trading",
    description: "Interactive crypto candlestick chart with EMA and RSI, signal markers and a fee-aware backtester.",
    tags: ["chart", "candlestick", "ema", "rsi", "backtest", "signals", "crypto"],
  },
  {
    id: "terminal", href: "terminal.html", title: "Charting terminal", h1: "Multi-market charting terminal",
    type: "app", category: "trading",
    description: "In-browser terminal with real-time crypto and forex candles, indicators and drawing tools.",
    tags: ["terminal", "chart", "forex", "crypto", "indicators", "drawing", "alerts"],
  },
  {
    id: "profit", href: "profit.html", title: "Crypto profit calculators", h1: "Crypto profit calculators",
    type: "hub", category: "trading", featured: true, popular: true,
    description: "Per-coin profit, fee and break-even calculators for Bitcoin, Ethereum, Solana and more.",
    tags: ["crypto", "profit", "bitcoin", "ethereum", "solana", "fees", "break-even"],
  },
  {
    id: "convert", href: "convert.html", title: "Currency converters", h1: "Currency converters",
    type: "hub", category: "general", popular: true,
    description: "Convert between USD, EUR, GBP, ETB, KES, NGN, ZAR and INR with indicative mid-market rates.",
    tags: ["currency", "convert", "exchange rate", "forex", "usd", "eur", "gbp", "etb", "kes", "ngn", "zar", "inr"],
  },
  {
    id: "rates", href: "rates.html", title: "Hourly to salary calculators", h1: "Hourly to salary calculators",
    type: "hub", category: "finance", popular: true,
    description: "Turn an hourly rate into weekly, monthly and annual pay across 11 currencies.",
    tags: ["hourly", "salary", "wage", "annual pay", "income", "rates"],
  },
  {
    id: "math", href: "math.html", title: "Math workspace", h1: "Advanced math calculator",
    type: "app", category: "math", featured: true, popular: true,
    description: "Scientific calculator, graphing, equation solvers, statistics, matrices and unit converters.",
    tags: ["math", "scientific calculator", "graph", "plot", "statistics", "matrix", "algebra", "equation"],
  },
  {
    id: "student", href: "student.html", title: "GPA & grade planner", h1: "GPA calculator & grade planner",
    type: "app", category: "math",
    description: "Add courses, calculate your GPA on a 4.0 scale and see the GPA you need next term.",
    tags: ["gpa", "grade", "student", "school", "college", "university", "planner"],
  },
  {
    id: "memorial", href: "memorial.html", title: "Memorial page builder", h1: "Rest & remembrance",
    type: "app", category: "general",
    description: "Create a simple, shareable memorial page with a candle animation and a downloadable share card.",
    tags: ["memorial", "remembrance", "tribute", "candle", "share card"],
  },
];
