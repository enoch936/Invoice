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
├── css/
│   ├── main.css
│   └── print.css
└── js/
    ├── app.js
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

## Monetization roadmap

1. Publish the free core tools and measure actual usage.
2. Test paid templates and optional branding/export features.
3. Validate demand before building accounts, cloud sync, or payment integrations.
4. Add privacy, terms, support, and clear pricing before accepting payments.

## License

No license has been granted yet. Add an explicit license before accepting external contributions or permitting reuse.