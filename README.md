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
- **Programmatic SEO:** 56 currency converter pages, 11 hourly-to-salary pages and hub pages, each with unique copy, FAQ and JSON-LD
- **Rest & Remembrance:** sanitized `?name=&dates=&message=&theme=` memorial pages with candle animation and share card
- Shareable calculator links (state in the URL)
- Unit-tested quant library (`js/quant.js`, `tests/quant.test.mjs`)
- No framework, package manager, or build step required

## Run locally

JavaScript ES modules work best through a local web server. In VS Code, use Live Server, or run:

```bash
python -m http.server 5500
```

Open `http://localhost:5500`.

## Project structure

```text
Invoice/
├── index.html
├── invoice.html
├── quote.html
├── calculators.html
├── privacy.html
├── terms.html
├── css/
│   ├── main.css
│   └── print.css
└── js/
    ├── app.js
    ├── site.js
    ├── config.js
    ├── affiliates.js
    ├── quant.js
    ├── trading.js
    ├── money.js
    ├── student.js
    ├── invoice.js
    ├── quote.js
    ├── calculators.js
    ├── advanced.js
    └── storage.js
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

Run tests with `node tests/quant.test.mjs`.

## Not built yet

- Next.js migration, `html2pdf` export, premium license validation, WebSocket multi-pane charts, ambient audio for memorial pages, and country tax estimators (these need verified data).

## Monetization roadmap

1. Publish the free core tools and measure actual usage.
2. Test paid templates and optional branding/export features.
3. Validate demand before building accounts, cloud sync, or payment integrations.
4. Add privacy, terms, support, and clear pricing before accepting payments.

## License

No license has been granted yet. Add an explicit license before accepting external contributions or permitting reuse.