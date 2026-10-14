# PARCHXA Invoice Toolkit

A browser-first business toolkit for freelancers, built with semantic HTML, modern CSS, and vanilla JavaScript.

## Features

- Responsive landing page
- Invoice builder with live preview, dynamic line items, discounts, tax, and totals
- Quotation builder with proposed items, quote validity, scope notes, and payment terms
- Freelance calculators for hourly rates, project quotes, and estimated profit
- Advanced scientific calculator (arithmetic, powers, roots, logs, exp, trigonometry, factorial, constants, normal distribution)
- Trend calculator with linear/exponential regression, fit quality (R²), statistics, and value forecasting
- Currency formatting for USD, ETB, EUR, GBP, and KES
- Save, load, and delete invoice and quotation drafts in browser local storage
- Print-friendly documents (choose **Print → Save as PDF**)
- Privacy notice and terms of use pages, with contact details
- **Money planner:** tax set-aside, compound growth with year-by-year table, retainer vs hourly, CAGR
- **Trading risk suite:** position size, liquidation price, break-even win rate, expectancy, Kelly, and a seeded 1,000-path Monte Carlo fan chart (educational, not advice)
- **Student toolkit:** GPA calculator and required-GPA grade planner
- Installable PWA with offline support (manifest + service worker)
- Consent banner, affiliate registry, ad slots and email/tip/premium CTAs (all off until configured)
- JSON-LD, canonical URLs, FAQ content, sitemap on every tool page
- **Live chart & backtester:** candlesticks (Binance public API, labelled demo fallback), EMA/RSI, signal markers, confluence score, no-look-ahead backtest with fees, trade table and CSV export
- **Invoice upgrades:** draft/sent/paid status, revenue dashboard, copy-link sharing (data stays inside the link)
- **Programmatic SEO:** 56 currency converter pages, 11 hourly-to-salary pages, 13 crypto profit calculator pages, and hub pages — each with unique copy, FAQ and JSON-LD
- **Rest & Remembrance:** sanitized `?name=&dates=&message=&theme=` memorial pages with candle animation and share card
- **Advanced math:** scientific calculator, descriptive statistics, correlation, linear/polynomial regression, Welch/paired t-tests, chi-square, a function plotter (numeric derivative + integral), 2×2–n×n matrix arithmetic and base converter
- **Money planner upgrades:** fixed-rate loan amortization with a yearly schedule, VAT/sales-tax add-or-extract, margin vs markup and break-even volume
- **Crypto profit calculators:** programmatically generated `profit-<coin>.html` pages (BTC, ETH, SOL, XRP, ADA, DOGE, BNB, LTC, DOT, MATIC, LINK, TRX) with net P/L after fees, ROI, break-even price and a what-if table — plus a one-click **live price** from Binance's public API (no key, no tracking)
- **Custom 404 page** (`404.html`) that GitHub Pages serves automatically, with a command-palette search trigger and links to every major tool
- **Command palette** (⌘K / Ctrl-K, or `/`) to jump between every tool and action
- **Viral share cards:** canvas-rendered, branded PNGs generated locally and shared via the Web Share API
- **Social preview:** a real 1200×630 PNG (`icons/og.png`) generated with a dependency-free Node encoder, wired to every page's `og:image` / `twitter:image`
- **Local-first analytics** (ring buffer + Web Vitals + scroll depth) that only forwards to Plausible/Umami after consent
- **Security hardening:** every URL param and stored value is validated, plus a site-wide `Content-Security-Policy` meta
- Shareable calculator links (state in the URL)
- Unit-tested quant library (`js/quant.js`, `tests/quant.test.mjs`)
- No framework and no runtime dependencies; a small Node toolchain handles generation and verification only

## Toolchain (Node ≥ 20, zero dependencies)

```bash
node tools/generate.mjs        # regenerate the profit-*.html family + sitemap.xml
node tools/apply-head.mjs      # (re)apply the CSP/security meta to every page
node tools/apply-og.mjs        # (re)apply the OG/Twitter preview-image meta to every page
node tools/og-image.mjs        # regenerate icons/og.png (1200x630 social preview)
node tools/serve.mjs           # local dev server at http://localhost:8080
node tests/quant.test.mjs      # unit tests
node tools/verify.mjs          # everything CI runs: syntax, tests, generator drift, CSP, OG, assets, JSON-LD, sitemap
```

`npm run verify` is an alias for the last command. CI (`.github/workflows/validate.yml`) runs it on every push and pull request.

## Run locally

JavaScript ES modules work best through a local web server. Use the built-in one:

```bash
node tools/serve.mjs
```

Open `http://localhost:8080`. (`python -m http.server 8080` also works.)

## Project structure

```text
Invoice/
├── index.html, invoice.html, quote.html, calculators.html, money.html,
│   trading.html, chart.html, math.html, student.html, memorial.html,
│   convert.html, rates.html, profit.html, offline.html, 404.html, privacy.html, terms.html
├── profit-<coin>.html            # generated programmatic-SEO pages
├── convert-<from>-to-<to>.html   # generated currency pairs
├── rates-<cur>-hourly-to-salary.html
├── css/
│   ├── main.css
│   ├── pro.css                   # monetization, command palette, toasts, products
│   └── print.css
├── icons/
│   ├── icon.svg
│   └── og.png                    # 1200x630 social preview, generated by tools/og-image.mjs
├── js/
│   ├── app.js, site.js           # shared runtime + boot
│   ├── config.js, nav.js         # site config and the single tool registry
│   ├── sanitize.js               # input hardening used everywhere
│   ├── analytics.js              # local-first event buffer + Web Vitals
│   ├── sharecard.js              # canvas share-card renderer
│   ├── command-palette.js        # ⌘K palette
│   ├── products.js, affiliates.js, money.js
│   ├── quant.js                  # pure, unit-tested math/risk engine
│   ├── advanced.js, math.js      # scientific calculator + math suite
│   ├── trading.js, chart.js, profit.js
│   ├── invoice.js, quote.js, calculators.js, invoice-dashboard.js
│   ├── student.js, convert.js, rates.js, memorial.js, storage.js
│   └── ...
├── tools/                        # Node generators, dev server and verifier
├── tests/quant.test.mjs
├── sw.js, manifest.webmanifest, offline.html, .nojekyll
└── sitemap.xml, robots.txt
```


## Data and privacy

Drafts stay in the current browser's local storage and do not sync across devices. Clearing browser data may remove them. Do not enter passwords, payment-card data, or other sensitive information. This static version does not include accounts, cloud backup, payment processing, or tax compliance.

## Current limitations

- This is a static browser app; it has no server or database.
- Users should verify tax rules, legal invoice requirements, and contractual terms for their jurisdiction.
- The quotation and invoice tools generate documents but do not sign contracts or collect money.
- The project has not yet been independently audited or browser-tested across devices.

## Turn on monetization

Everything is off by default. Edit `js/config.js` and `js/affiliates.js`:

1. Add your tracked affiliate links to `js/affiliates.js` (empty `url` entries never render). Links get `rel="sponsored noopener"` and a visible disclosure.
2. Set `adsense.client` to load ads after the visitor accepts the consent banner. Ad slots reserve space to avoid layout shift. Ad networks have their own approval and consent-platform rules.
3. Set `plausibleDomain` for privacy-friendly analytics, `newsletterUrl`, `tipJarUrl` and `premiumUrl` for lead capture, tips and paid template packs.
4. Update the privacy page to describe every third party you enable.

Run tests with `node tests/quant.test.mjs` (or `node tools/verify.mjs` for the full check).

## Not built yet

- Next.js migration, `html2pdf` export, premium license validation, WebSocket multi-pane charts, ambient audio for memorial pages, and country tax estimators (these need verified data).
- Streaming prices on the profit pages (there is a one-click live price, but it does not stream), portfolio import, and tax-lot tracking.

## Monetization roadmap

1. Publish the free core tools and measure actual usage.
2. Test paid templates and optional branding/export features.
3. Validate demand before building accounts, cloud sync, or payment integrations.
4. Add privacy, terms, support, and clear pricing before accepting payments.

## License

No license has been granted yet. Add an explicit license before accepting external contributions or permitting reuse.