// Website, creator and advertising income calculators.
// Follows the catalog schema in js/calc/catalog.js and mirrors the style of data/finance.js.

import { cpmRevenue, cpcRevenue, ctr, sessionsForRevenue } from "../math.js";
import { formatCurrency, formatNumber, round } from "../format.js";

const money = (v, ctx) => formatCurrency(v, ctx.currency);
const num = (v) => formatNumber(v);

export const MONETIZATION = [
  {
    slug: "cpm",
    title: "CPM calculator",
    h1: "CPM calculator (cost per 1,000 impressions)",
    category: "monetization",
    tags: ["advertising", "cpm", "revenue"],
    description: "Turn impressions and a CPM rate into advertising revenue, and see what every 1,000 impressions earns you.",
    intro: "CPM is the price paid for 1,000 ad impressions. Enter your impressions and rate to estimate the revenue they generate.",
    currency: true,
    inputs: [
      { key: "impressions", label: "Impressions", type: "number", default: 100000, min: 0, step: 1000, help: "How many times the ad was shown." },
      { key: "cpm", label: "CPM", type: "number", default: 5, min: 0, step: 0.1, unit: "currency", help: "Amount paid per 1,000 impressions." },
    ],
    run(v, ctx) {
      if (v.impressions < 0) throw new Error("Impressions cannot be negative.");
      const revenue = cpmRevenue(v.impressions, v.cpm);
      const perThousand = v.impressions > 0 ? (revenue / v.impressions) * 1000 : NaN;
      return {
        primary: { label: "Advertising revenue", value: revenue, format: "currency" },
        stats: [
          { label: "Revenue per 1,000 impressions", value: perThousand, format: "currency" },
          { label: "Revenue per impression", value: v.impressions > 0 ? revenue / v.impressions : NaN, format: "currency" },
          { label: "Impressions", value: v.impressions, format: "integer" },
        ],
        steps: [
          `Revenue = (impressions / 1,000) × CPM.`,
          `= (${num(v.impressions)} / 1,000) × ${money(v.cpm, ctx)} = ${money(revenue, ctx)}.`,
          `That is ${money(perThousand, ctx)} for every 1,000 impressions.`,
        ],
        verdict: `At a ${money(v.cpm, ctx)} CPM, ${num(v.impressions)} impressions are worth about ${money(revenue, ctx)}.`,
      };
    },
    formula: "Revenue = (Impressions / 1,000) × CPM",
    example: [
      "A page shows 100,000 ad impressions in a month.",
      "The agreed CPM is $5 per 1,000 impressions.",
      "Revenue = (100,000 / 1,000) × $5 = $500.",
      "Each single impression is therefore worth about $0.005.",
    ],
    assumptions: [
      "Revenue is an estimate based only on the impressions and CPM you enter — real CPMs vary by traffic, season and advertiser demand.",
      "It assumes every impression is a paid, billable impression with no unfilled or invalid traffic.",
      "No income is guaranteed; ad networks may apply deductions, viewability rules or invalid-traffic clawbacks.",
    ],
    faq: [
      { q: "What does CPM stand for?", a: "Cost per mille — 'mille' is Latin for thousand, so CPM is the cost (or revenue) for 1,000 impressions." },
      { q: "Is CPM the same as RPM?", a: "No. CPM is what an advertiser pays per 1,000 ad impressions; RPM is revenue per 1,000 pageviews or sessions and includes all sources." },
      { q: "Why is my real revenue lower than this figure?", a: "Unfilled ad requests, invalid traffic filtering and network revenue shares all reduce the amount you actually receive." },
    ],
    related: ["page-rpm", "cpc", "traffic-for-revenue"],
  },

  {
    slug: "page-rpm",
    title: "Page RPM calculator",
    h1: "Page RPM calculator (revenue per 1,000 pageviews)",
    category: "monetization",
    tags: ["advertising", "rpm", "pageviews"],
    description: "Calculate page RPM from total revenue and pageviews, and see revenue per session and per view.",
    intro: "Page RPM is the money you make for every 1,000 pageviews. Enter revenue and pageviews to see how your site is performing.",
    currency: true,
    inputs: [
      { key: "pageviews", label: "Pageviews", type: "number", default: 100000, min: 0, step: 1000, help: "Total views of your pages in the period." },
      { key: "revenue", label: "Revenue", type: "number", default: 500, min: 0, step: 10, unit: "currency", help: "Total ad or site revenue for the same period." },
    ],
    run(v, ctx) {
      if (v.pageviews <= 0) throw new Error("Enter a positive number of pageviews.");
      const rpm = (v.revenue / v.pageviews) * 1000;
      const perView = v.revenue / v.pageviews;
      return {
        primary: { label: "Page RPM", value: rpm, format: "currency" },
        stats: [
          { label: "Revenue", value: v.revenue, format: "currency" },
          { label: "Pageviews", value: v.pageviews, format: "integer" },
          { label: "Revenue per pageview", value: perView, format: "currency" },
          { label: "Revenue per session", value: perView, format: "currency", hint: "Approximation that treats one pageview as one session." },
        ],
        steps: [
          `RPM = (revenue / pageviews) × 1,000.`,
          `= (${money(v.revenue, ctx)} / ${num(v.pageviews)}) × 1,000 = ${money(rpm, ctx)}.`,
          `Each pageview earns about ${money(v.revenue / v.pageviews, ctx)}.`,
        ],
        verdict: `Generating ${money(v.revenue, ctx)} from ${num(v.pageviews)} pageviews is a page RPM of about ${money(round(rpm, 2), ctx)}.`,
      };
    },
    formula: "RPM = (Revenue / Pageviews) × 1,000",
    example: [
      "A site earns $500 in a month from 100,000 pageviews.",
      "RPM = (500 / 100,000) × 1,000 = $5.00.",
      "Revenue per pageview = 500 / 100,000 = $0.005.",
    ],
    assumptions: [
      "RPM is an estimate from the revenue and pageviews you supply; real RPMs swing with traffic source, season and niche.",
      "It assumes all pageviews are valid and serve ads — no unfilled inventory or bot filtering is deducted.",
      "No income is guaranteed and network revenue shares are not modelled here.",
    ],
    faq: [
      { q: "What is a good page RPM?", a: "It varies hugely by niche and country — display entertainment sites often sit in the low single digits, while finance and insurance traffic can reach tens of dollars." },
      { q: "How is page RPM different from session RPM?", a: "Page RPM uses pageviews; session RPM uses sessions. If readers view several pages per session, page RPM is the lower of the two." },
      { q: "Why do RPMs differ by country?", a: "Advertisers pay more in higher-spending markets, so traffic from those countries typically earns a higher RPM." },
    ],
    related: ["cpm", "website-profit", "traffic-for-revenue"],
  },

  {
    slug: "cpc",
    title: "CPC calculator",
    h1: "CPC calculator (cost per click)",
    category: "monetization",
    tags: ["advertising", "cpc", "revenue"],
    description: "Estimate revenue from clicks and a cost-per-click rate, and see the average value of each click.",
    intro: "CPC is what an advertiser pays each time someone clicks. Enter your clicks and rate to estimate the revenue they produce.",
    currency: true,
    inputs: [
      { key: "clicks", label: "Clicks", type: "number", default: 2000, min: 0, step: 10, help: "Number of clicks on the ads." },
      { key: "cpc", label: "Cost per click", type: "number", default: 0.5, min: 0, step: 0.01, unit: "currency", help: "Amount paid for each click." },
    ],
    run(v, ctx) {
      const revenue = cpcRevenue(v.clicks, v.cpc);
      const avg = v.clicks > 0 ? revenue / v.clicks : NaN;
      return {
        primary: { label: "Advertising revenue", value: revenue, format: "currency" },
        stats: [
          { label: "Clicks", value: v.clicks, format: "integer" },
          { label: "Average cost per click", value: v.clicks > 0 ? avg : v.cpc, format: "currency" },
          { label: "Revenue per click", value: v.clicks > 0 ? revenue / v.clicks : NaN, format: "currency" },
        ],
        steps: [
          `Revenue = clicks × CPC.`,
          `= ${num(v.clicks)} × ${money(v.cpc, ctx)} = ${money(revenue, ctx)}.`,
          `The average cost per click is ${money(v.clicks > 0 ? revenue / v.clicks : v.cpc, ctx)}.`,
        ],
        verdict: `${num(v.clicks)} clicks at ${money(v.cpc, ctx)} each are worth about ${money(revenue, ctx)} in advertising revenue.`,
      };
    },
    formula: "Revenue = Clicks × CPC",
    example: [
      "A campaign receives 2,000 clicks in a month.",
      "The average cost per click is $0.50.",
      "Revenue = 2,000 × $0.50 = $1,000.",
      "Each click is therefore worth $0.50 on average.",
    ],
    assumptions: [
      "The estimate uses the clicks and CPC you enter; real CPCs swing with competition, keywords and audience quality.",
      "It assumes all clicks are valid and billable, with no click fraud or invalid-traffic deductions.",
      "No income is guaranteed and platform fees or revenue shares are not deducted.",
    ],
    faq: [
      { q: "What is a good CPC?", a: "It varies enormously by niche — display clicks can be cents, while competitive finance or legal keywords can cost tens of dollars." },
      { q: "Does every impression produce a click?", a: "No. The ratio of clicks to impressions is your click-through rate (CTR); use the CTR calculator to see it." },
      { q: "Is CPC revenue gross or net?", a: "This is a gross estimate. Networks keep a share, so your actual payout is usually lower." },
    ],
    related: ["cpm", "ctr", "traffic-for-revenue"],
  },

  {
    slug: "ctr",
    title: "CTR calculator",
    h1: "CTR calculator (click-through rate)",
    category: "monetization",
    tags: ["advertising", "ctr", "engagement"],
    description: "Calculate click-through rate from impressions and clicks, and see how engaging your ads or links are.",
    intro: "Click-through rate is the share of impressions that turn into clicks. Enter impressions and clicks to see your CTR.",
    inputs: [
      { key: "impressions", label: "Impressions", type: "number", default: 100000, min: 0, step: 1000, help: "How many times the ad or link was shown." },
      { key: "clicks", label: "Clicks", type: "number", default: 2500, min: 0, step: 10, help: "How many of those impressions were clicked." },
    ],
    run(v) {
      if (v.impressions <= 0) throw new Error("Impressions must be greater than zero to calculate CTR.");
      const rate = ctr(v.clicks, v.impressions);
      return {
        primary: { label: "Click-through rate", value: rate, format: "percent" },
        stats: [
          { label: "Clicks", value: v.clicks, format: "integer" },
          { label: "Impressions", value: v.impressions, format: "integer" },
          { label: "Clicks per 1,000 impressions", value: (v.clicks / v.impressions) * 1000, format: "number" },
        ],
        steps: [
          `CTR = (clicks / impressions) × 100.`,
          `= (${num(v.clicks)} / ${num(v.impressions)}) × 100 = ${num(v.impressions > 0 ? (v.clicks / v.impressions) * 100 : NaN)}%.`,
          `That is ${num((v.clicks / v.impressions) * 1000)} clicks per 1,000 impressions.`,
        ],
        verdict: `A CTR of ${num(v.impressions > 0 ? (v.clicks / v.impressions) * 100 : NaN)}% means ${num(v.clicks)} of your ${num(v.impressions)} impressions turned into clicks.`,
      };
    },
    formula: "CTR = (Clicks / Impressions) × 100",
    example: [
      "An ad is served 100,000 times in a month.",
      "It receives 2,500 clicks.",
      "CTR = (2,500 / 100,000) × 100 = 2.5%.",
      "That equals 25 clicks for every 1,000 impressions.",
    ],
    assumptions: [
      "CTR is an estimate from the two counts you provide; real rates depend on placement, creative, audience and season.",
      "It assumes impressions and clicks come from the same period and source.",
      "No income is guaranteed — a high CTR does not guarantee revenue, since CPCs vary.",
    ],
    faq: [
      { q: "What is a good CTR?", a: "For display ads 0.1–0.5% is common, while search ads often run 2–6%. Context matters far more than a single benchmark." },
      { q: "Can CTR be above 100%?", a: "Not meaningfully — if clicks exceed impressions, the counts come from different sources or periods and should be checked." },
      { q: "How do I improve CTR?", a: "Better placement, more relevant creative and clearer calls to action usually lift CTR, but test changes one at a time." },
    ],
    related: ["cpc", "cpm", "page-rpm"],
  },

  {
    slug: "traffic-for-revenue",
    title: "Traffic for revenue calculator",
    h1: "Traffic needed for a revenue goal calculator",
    category: "monetization",
    tags: ["traffic", "rpm", "planning"],
    description: "Find how many sessions and pageviews per month and per day you need to hit a revenue goal at a given RPM.",
    intro: "Working backwards from a revenue target, see the traffic you would need at your current RPM.",
    currency: true,
    inputs: [
      { key: "revenueGoal", label: "Monthly revenue goal", type: "number", default: 5000, min: 0, step: 100, unit: "currency" },
      { key: "rpm", label: "Session RPM", type: "number", default: 15, min: 0, step: 0.5, unit: "currency", help: "Revenue per 1,000 sessions." },
      { key: "pagesPerSession", label: "Pages per session", type: "number", default: 1.5, min: 0, step: 0.1, optional: true, help: "Used to estimate total pageviews." },
    ],
    run(v, ctx) {
      if (v.rpm <= 0) throw new Error("Enter a session RPM greater than zero to work out the traffic you need.");
      const sessions = sessionsForRevenue(v.revenueGoal, v.rpm);
      const perDay = sessions / 30;
      const pageviews = sessions * v.pagesPerSession;
      return {
        primary: { label: "Sessions needed per month", value: sessions, format: "integer" },
        stats: [
          { label: "Sessions per day", value: perDay, format: "integer" },
          { label: "Sessions per month", value: sessions, format: "integer" },
          { label: "Pageviews per month", value: pageviews, format: "integer" },
          { label: "Pageviews per day", value: pageviews / 30, format: "integer" },
        ],
        steps: [
          `Sessions = (goal / RPM) × 1,000 = (${money(v.revenueGoal, ctx)} / ${money(v.rpm, ctx)}) × 1,000 = ${num(sessions)}.`,
          `Sessions per day = ${num(sessions)} / 30 = ${num(perDay)}.`,
          `At ${num(v.pagesPerSession)} pages per session that is ${num(pageviews)} pageviews a month.`,
        ],
        verdict: `To earn ${money(v.revenueGoal, ctx)} a month at a ${money(v.rpm, ctx)} RPM you need about ${num(Math.round(sessions))} sessions, or roughly ${num(Math.round(perDay))} a day.`,
      };
    },
    formula: "Sessions = (Revenue goal / RPM) × 1,000",
    example: [
      "Revenue goal is $5,000 per month.",
      "Session RPM is $15 per 1,000 sessions.",
      "Sessions = (5,000 / 15) × 1,000 = 333,333 per month.",
      "That is about 11,111 sessions a day, or 500,000 pageviews at 1.5 pages per session.",
    ],
    assumptions: [
      "The RPM is assumed to hold as traffic grows — in practice RPM often changes with audience mix, season and ad demand.",
      "It assumes a 30-day month and a steady daily traffic pattern.",
      "Results are estimates only; no income is guaranteed and network deductions are ignored.",
    ],
    faq: [
      { q: "Why divide by 30?", a: "Monthly traffic divided by roughly 30 days gives the average daily sessions needed, assuming even traffic throughout the month." },
      { q: "What if my RPM changes with scale?", a: "Growth often changes RPM, so treat this as a snapshot. Re-run it with a conservative RPM to plan more safely." },
      { q: "Does this include all revenue sources?", a: "Only if the RPM you enter reflects all of them. Ad, affiliate and sponsorship income can be blended into one RPM." },
    ],
    related: ["page-rpm", "cpm", "website-profit"],
  },

  {
    slug: "affiliate-commission",
    title: "Affiliate commission calculator",
    h1: "Affiliate commission calculator",
    category: "monetization",
    tags: ["affiliate", "commission", "ecommerce"],
    description: "Estimate affiliate earnings from monthly sales, order value and commission rate, after refunds and chargebacks.",
    intro: "Affiliate income depends on how many orders you refer, their value and the commission rate. See the gross and net payout.",
    currency: true,
    inputs: [
      { key: "sales", label: "Orders per month", type: "number", default: 200, min: 0, step: 5, help: "Referrals that convert into a sale." },
      { key: "orderValue", label: "Average order value", type: "number", default: 80, min: 0, step: 5, unit: "currency" },
      { key: "commissionPct", label: "Commission rate", type: "number", default: 30, min: 0, max: 100, step: 1, unit: "percent" },
      { key: "refundPct", label: "Refund / chargeback rate", type: "number", default: 5, min: 0, max: 100, step: 0.5, unit: "percent", optional: true, help: "Share of orders later refunded, which usually reverses the commission." },
    ],
    run(v, ctx) {
      const gross = v.sales * v.orderValue * (v.commissionPct / 100);
      const refunds = (v.sales * (v.refundPct / 100)) * v.orderValue * (v.commissionPct / 100);
      const net = gross - refunds;
      const annual = net * 12;
      return {
        primary: { label: "Net commission per month", value: net, format: "currency" },
        stats: [
          { label: "Gross commission", value: gross, format: "currency" },
          { label: "Refunds / chargebacks", value: refunds, format: "currency" },
          { label: "Net per year", value: annual, format: "currency" },
          { label: "Commission per order", value: v.sales > 0 ? gross / v.sales : NaN, format: "currency" },
        ],
        steps: [
          `Gross = orders × order value × commission = ${num(v.sales)} × ${money(v.orderValue, ctx)} × ${num(v.commissionPct / 100)} = ${money(gross, ctx)}.`,
          `Refunds = ${num(v.refundPct)}% of orders × order value × commission = ${money(refunds, ctx)}.`,
          `Net = ${money(gross, ctx)} − ${money(refunds, ctx)} = ${money(gross - refunds, ctx)} a month.`,
        ],
        verdict: `About ${num(v.sales)} orders a month at ${money(v.orderValue, ctx)} with a ${num(v.commissionPct)}% commission nets roughly ${money(gross - refunds, ctx)} after refunds, or ${money(annual, ctx)} a year.`,
      };
    },
    formula: "Net = Orders × Order value × Commission% × (1 − Refund%)",
    example: [
      "200 affiliate referrals convert in a month.",
      "The average order is $80 and the commission rate is 30%.",
      "Gross = 200 × 80 × 0.30 = $4,800.",
      "With 5% refunds, net = 4,800 × 0.95 = $4,560 a month.",
    ],
    assumptions: [
      "The order value, commission rate and refund rate are treated as flat averages across the month.",
      "Refunds are assumed to reverse the commission in full, which not every programme does.",
      "Results depend on conversion and refund behaviour that will vary — this is an estimate and no income is guaranteed.",
    ],
    faq: [
      { q: "Why deduct refunds?", a: "Most affiliate programmes claw back commission when an order is refunded or charged back, so gross numbers overstate what you keep." },
      { q: "Are there recurring commissions?", a: "Some programmes pay on renewals. Add those separately, since this calculator models a single upfront payout." },
      { q: "Should I use average or actual order value?", a: "Use a realistic average. If a few large orders dominate, consider modelling them separately." },
    ],
    related: ["website-profit", "cpc", "traffic-for-revenue"],
  },

  {
    slug: "website-profit",
    title: "Website profit calculator",
    h1: "Website profit calculator",
    category: "monetization",
    tags: ["website", "profit", "costs"],
    description: "Calculate monthly website profit after hosting, tools, content and other costs, plus the margin and break-even RPM.",
    intro: "Revenue is not profit. Subtract your running costs to see what your site really earns, and the RPM needed to break even.",
    currency: true,
    inputs: [
      { key: "revenue", label: "Monthly revenue", type: "number", default: 4000, min: 0, step: 100, unit: "currency" },
      { key: "hosting", label: "Hosting & domains", type: "number", default: 20, min: 0, step: 5, unit: "currency" },
      { key: "tools", label: "Software & tools", type: "number", default: 100, min: 0, step: 10, unit: "currency" },
      { key: "content", label: "Content & marketing", type: "number", default: 300, min: 0, step: 25, unit: "currency" },
      { key: "other", label: "Other costs", type: "number", default: 50, min: 0, step: 10, unit: "currency", optional: true },
      { key: "pageviews", label: "Monthly pageviews", type: "number", default: 100000, min: 0, step: 1000, optional: true, help: "Used to work out the RPM needed to break even." },
    ],
    run(v, ctx) {
      if (v.revenue <= 0) throw new Error("Enter a monthly revenue greater than zero to calculate a margin.");
      const costs = v.hosting + v.tools + v.content + v.other;
      const profit = v.revenue - costs;
      const margin = (profit / v.revenue) * 100;
      const breakEvenRpm = v.pageviews > 0 ? (costs / v.pageviews) * 1000 : NaN;
      return {
        primary: { label: "Monthly profit", value: profit, format: "currency" },
        stats: [
          { label: "Total monthly costs", value: costs, format: "currency" },
          { label: "Profit margin", value: margin, format: "percent" },
          { label: "Annual profit", value: profit * 12, format: "currency" },
          { label: "RPM needed to break even", value: breakEvenRpm, format: "currency", hint: "Costs divided by pageviews; the RPM at which profit is zero." },
        ],
        steps: [
          `Costs = hosting + tools + content + other = ${money(costs, ctx)}.`,
          `Profit = revenue − costs = ${money(v.revenue, ctx)} − ${money(costs, ctx)} = ${money(profit, ctx)}.`,
          `Margin = profit / revenue = ${num(margin)}%.`,
          v.pageviews > 0 ? `Break-even RPM = (costs / pageviews) × 1,000 = ${money(breakEvenRpm, ctx)}.` : "Add pageviews to see the break-even RPM.",
        ],
        verdict: `Your site makes about ${money(profit, ctx)} a month (${num(margin)}% margin) once ${money(costs, ctx)} of costs are covered.`,
      };
    },
    formula: "Profit = Revenue − (Hosting + Tools + Content + Other) · Margin = Profit / Revenue × 100",
    example: [
      "Revenue is $4,000 a month.",
      "Costs are $20 hosting + $100 tools + $300 content + $50 other = $470.",
      "Profit = $4,000 − $470 = $3,530, a margin of 88.25%.",
      "At 100,000 pageviews the break-even RPM is (470 / 100,000) × 1,000 = $4.70.",
    ],
    assumptions: [
      "Costs are the monthly running amounts you enter; one-off or annual costs should be divided into a monthly figure.",
      "Revenue is an estimate from your own inputs and will vary with CPM/RPM, traffic and season. No income is guaranteed.",
      "Taxes, your own time and capital spending are not included unless you add them to 'other costs'.",
    ],
    faq: [
      { q: "What counts as a tool cost?", a: "Any recurring software subscription used to run the site, such as analytics, SEO, email or design software." },
      { q: "What does break-even RPM mean?", a: "It is the revenue per 1,000 pageviews you must earn just to cover your costs — below it the site loses money." },
      { q: "Should I pay myself a salary?", a: "If the site is your job, include a fair wage in costs; otherwise the 'profit' overstates the true return on your time." },
    ],
    related: ["page-rpm", "traffic-for-revenue", "cpc", "affiliate-commission"],
  },

  {
    slug: "youtube-revenue",
    title: "YouTube revenue calculator",
    h1: "YouTube revenue calculator",
    category: "monetization",
    tags: ["youtube", "creator", "rpm"],
    description: "Estimate monthly YouTube income from monetized views, RPM and sponsorship deals, plus the annual total.",
    intro: "YouTube income comes from ad revenue and sponsorships. Enter your views, RPM and deal fees to see the combined monthly total.",
    currency: true,
    inputs: [
      { key: "monetizedViews", label: "Monetized views per month", type: "number", default: 500000, min: 0, step: 1000, help: "Views that actually served an ad." },
      { key: "rpm", label: "RPM (per 1,000 monetized views)", type: "number", default: 4, min: 0, step: 0.1, unit: "currency" },
      { key: "sponsorDeals", label: "Sponsor deals per month", type: "number", default: 2, min: 0, step: 1 },
      { key: "sponsorFee", label: "Average fee per deal", type: "number", default: 1500, min: 0, step: 100, unit: "currency" },
    ],
    run(v, ctx) {
      const adRevenue = (v.monetizedViews / 1000) * v.rpm;
      const sponsor = v.sponsorDeals * v.sponsorFee;
      const total = adRevenue + sponsor;
      return {
        primary: { label: "Total monthly income", value: total, format: "currency" },
        stats: [
          { label: "Ad revenue", value: adRevenue, format: "currency" },
          { label: "Sponsorship income", value: sponsor, format: "currency" },
          { label: "Total per year", value: total * 12, format: "currency" },
          { label: "Ad share of income", value: total > 0 ? (adRevenue / total) * 100 : NaN, format: "percent" },
        ],
        steps: [
          `Ad revenue = (monetized views / 1,000) × RPM = (${num(v.monetizedViews)} / 1,000) × ${money(v.rpm, ctx)} = ${money(adRevenue, ctx)}.`,
          `Sponsorship = deals × fee = ${num(v.sponsorDeals)} × ${money(v.sponsorFee, ctx)} = ${money(sponsor, ctx)}.`,
          `Total = ${money(adRevenue, ctx)} + ${money(sponsor, ctx)} = ${money(total, ctx)} a month, or ${money(total * 12, ctx)} a year.`,
        ],
        verdict: `About ${money(adRevenue, ctx)} of ad revenue plus ${money(sponsor, ctx)} of sponsorships gives roughly ${money(total, ctx)} a month, or ${money(total * 12, ctx)} a year.`,
      };
    },
    formula: "Total = (Monetized views / 1,000) × RPM + Deals × Fee",
    example: [
      "500,000 monetized views in a month.",
      "RPM is $4 per 1,000 monetized views.",
      "Ad revenue = (500,000 / 1,000) × $4 = $2,000.",
      "Two sponsorship deals at $1,500 each add $3,000, giving a $5,000 month.",
    ],
    assumptions: [
      "The RPM is a blended estimate — real YouTube RPMs vary widely by niche, audience country, season and ad demand.",
      "Sponsorship fees and deal counts are treated as flat monthly averages; real campaigns are irregular.",
      "Figures are estimates only and ignore platform revenue shares, taxes and production costs; no income is guaranteed.",
    ],
    faq: [
      { q: "What is the difference between CPM and RPM on YouTube?", a: "CPM is what advertisers pay per 1,000 ad impressions; RPM is what the creator keeps per 1,000 monetized views after YouTube's share." },
      { q: "Why is my RPM different each month?", a: "Advertiser budgets, seasonality and the countries your viewers come from all move RPM up and down." },
      { q: "Do all views earn ad revenue?", a: "No. Only monetized views — those that served an ad — count, and not every viewer sees or watches an ad." },
    ],
    related: ["creator-hourly", "page-rpm", "cpm"],
  },

  {
    slug: "creator-hourly",
    title: "Creator hourly rate calculator",
    h1: "Creator hourly rate calculator",
    category: "monetization",
    tags: ["creator", "hourly", "income"],
    description: "Work out your effective hourly rate from creator income and the hours you worked, plus the 40-hour-week equivalent.",
    intro: "Turning income into an hourly figure shows what your time is really worth. Enter the period's revenue and hours worked.",
    currency: true,
    inputs: [
      { key: "revenue", label: "Revenue for the period", type: "number", default: 5000, min: 0, step: 100, unit: "currency" },
      { key: "hours", label: "Hours worked in the period", type: "number", default: 120, min: 0, step: 5, help: "Total hours spent creating, editing, publishing and promoting." },
    ],
    run(v, ctx) {
      if (v.hours <= 0) throw new Error("Enter hours worked greater than zero to calculate an hourly rate.");
      const hourly = v.revenue / v.hours;
      return {
        primary: { label: "Effective hourly rate", value: hourly, format: "currency" },
        stats: [
          { label: "Revenue for the period", value: v.revenue, format: "currency" },
          { label: "Hours worked", value: v.hours, format: "number" },
          { label: "40-hour-week equivalent", value: hourly * 40, format: "currency", hint: "What a full 40-hour week would pay at this effective rate." },
        ],
        steps: [
          `Hourly rate = revenue / hours = ${money(v.revenue, ctx)} / ${num(v.hours)} = ${money(hourly, ctx)}.`,
          `A 40-hour week at this rate would pay ${money(hourly * 40, ctx)}.`,
          `Per hour worked you earned about ${money(hourly, ctx)} before tax and costs.`,
        ],
        verdict: `Earning ${money(v.revenue, ctx)} for ${num(v.hours)} hours works out to about ${money(hourly, ctx)} an hour, or ${money(hourly * 40, ctx)} for a full 40-hour week.`,
      };
    },
    formula: "Hourly rate = Revenue ÷ Hours worked",
    example: [
      "You earn $5,000 in a month of creating.",
      "You worked 120 hours across filming, editing and admin.",
      "Hourly rate = 5,000 / 120 = $41.67 per hour.",
      "A 40-hour week at that rate would pay $1,666.67.",
    ],
    assumptions: [
      "Hours should include all unpaid admin and marketing time, not just production, or the rate will be overstated.",
      "Revenue is the gross amount you enter — tax, equipment and platform fees are not deducted.",
      "The figure is an estimate for a single period; income and hours vary, and no income is guaranteed.",
    ],
    faq: [
      { q: "Why include admin time?", a: "If you only count filming, the hourly rate looks far better than the reality of running a channel, which includes editing, thumbnails and emails." },
      { q: "Should this include affiliate and sponsor income?", a: "Yes — use total revenue from all sources so the hourly rate reflects what the work actually earns." },
      { q: "How can I raise my effective hourly rate?", a: "Either earn more (higher RPM, better sponsorship rates) or work fewer hours by reusing and batching content." },
    ],
    related: ["youtube-revenue", "website-profit", "freelance-rate"],
  },
];
