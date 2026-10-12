# PARCHXA Invoice Toolkit

A browser-first business toolkit for freelancers, built with semantic HTML, modern CSS, and vanilla JavaScript.

## Features

- Responsive landing page
- Invoice builder with live preview
- Dynamic line items and automatic subtotal, discount, tax, and total calculations
- Currency formatting for USD, ETB, EUR, GBP, and KES
- Save, load, and delete invoice drafts in browser local storage
- Print-friendly invoice layout (choose **Print → Save as PDF**)
- No framework, package manager, or build step required

## Run locally

JavaScript ES modules work best through a local web server. In VS Code, use Live Server, or run:

```bash
python -m http.server 5500
```

Open `http://localhost:5500`.

## Structure

```text
Invoice/
├── index.html
├── invoice.html
├── css/main.css
├── css/print.css
└── js/
    ├── app.js
    ├── invoice.js
    └── storage.js
```

## Data and privacy

Drafts stay in the current browser's local storage. They do not sync across devices. Do not enter passwords, payment-card data, or other sensitive information. This static version does not include accounts, cloud backup, payment processing, or tax compliance.

## Monetization roadmap

1. Publish the free core tools and measure actual usage.
2. Add downloadable quotation and proposal templates.
3. Test a paid template pack or optional premium export features.
4. Only add accounts and cloud sync after validating demand.

## License

No license has been granted yet. Add an explicit license before accepting external contributions or permitting reuse.