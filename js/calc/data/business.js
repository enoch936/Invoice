// Business & freelancing calculators — margins, pricing, growth and billing.
// Follows the shared catalog schema (see js/calc/catalog.js) and mirrors the style of finance.js.

import { breakEven, cac, ltv } from "../math.js";
import { formatCurrency, formatNumber } from "../format.js";

const money = (v, ctx) => formatCurrency(v, ctx.currency);
const num = (v) => formatNumber(v);

export const BUSINESS = [
  {
    slug: "profit-margin",
    title: "Profit margin calculator",
    h1: "Profit margin calculator",
    category: "business",
    tags: ["margin", "profit", "revenue", "pricing"],
    description: "Work out gross profit, gross margin, net profit and net margin from revenue, cost of goods sold and your operating expenses.",
    intro: "Profit margin shows what share of every sale you keep. Enter revenue, the cost of goods sold and your operating expenses to see both gross and net margins.",
    currency: true,
    inputs: [
      { key: "revenue", label: "Revenue", type: "number", default: 100000, min: 0, step: 1000, unit: "currency" },
      { key: "cogs", label: "Cost of goods sold (COGS)", type: "number", default: 55000, min: 0, step: 1000, unit: "currency" },
      { key: "opex", label: "Operating expenses", type: "number", default: 25000, min: 0, step: 1000, unit: "currency", help: "Rent, salaries, marketing and other running costs." },
    ],
    run(v, ctx) {
      if (v.revenue <= 0) throw new Error("Enter revenue above zero.");
      const grossProfit = v.revenue - v.cogs;
      const grossMargin = (grossProfit / v.revenue) * 100;
      const netProfit = v.revenue - v.cogs - v.opex;
      const netMargin = (netProfit / v.revenue) * 100;
      return {
        primary: { label: "Net profit margin", value: netMargin, format: "percent" },
        stats: [
          { label: "Gross profit", value: grossProfit, format: "currency" },
          { label: "Gross margin", value: grossMargin, format: "percent" },
          { label: "Net profit", value: netProfit, format: "currency" },
        ],
        steps: [
          `Gross profit = ${money(v.revenue, ctx)} − ${money(v.cogs, ctx)} = ${money(grossProfit, ctx)}.`,
          `Gross margin = ${money(grossProfit, ctx)} / ${money(v.revenue, ctx)} = ${num(grossMargin)}%.`,
          `Net profit = ${money(v.revenue, ctx)} − ${money(v.cogs, ctx)} − ${money(v.opex, ctx)} = ${money(netProfit, ctx)}, a ${num(netMargin)}% net margin.`,
        ],
        verdict: `Every ${money(100, ctx)} of sales leaves ${money(grossProfit, ctx)} of gross profit (${num(grossMargin)}%) and ${money(netProfit, ctx)} of net profit (${num(netMargin)}%).`,
      };
    },
    formula: "Gross margin = (Revenue − COGS) / Revenue × 100;  Net margin = (Revenue − COGS − OpEx) / Revenue × 100",
    example: [
      "Revenue $100,000, COGS $55,000, operating expenses $25,000.",
      "Gross profit = 100000 − 55000 = $45,000, so gross margin = 45%.",
      "Net profit = 100,000 − 55,000 − 25,000 = $20,000, a 20% net margin.",
    ],
    assumptions: [
      "COGS contains only costs that scale directly with sales.",
      "Operating expenses are fixed for the period shown.",
      "Tax and interest are not deducted — this is an operating profit.",
    ],
    faq: [
      { q: "Gross margin or net margin?", a: "Gross margin measures the profitability of what you sell; net margin also absorbs overheads, so it shows what the business actually keeps." },
      { q: "What is a good profit margin?", a: "It varies widely by industry. Software and services often run 60–80% gross margins, while retail and distribution run much thinner." },
      { q: "Why is my net margin negative?", a: "Operating expenses exceed the gross profit, so the business is losing money on its current sales volume." },
    ],
    related: ["markup", "contribution-margin", "break-even", "mrr-arr"],
  },

  {
    slug: "markup",
    title: "Markup calculator",
    h1: "Markup calculator",
    category: "business",
    tags: ["pricing", "margin", "retail"],
    description: "Convert a product cost and selling price into the markup percentage on cost, the gross profit per unit and the profit margin on price.",
    intro: "Markup and margin both describe profit, but markup is measured against cost while margin is measured against the selling price. This shows both.",
    currency: true,
    inputs: [
      { key: "cost", label: "Unit cost", type: "number", default: 40, min: 0, step: 1, unit: "currency" },
      { key: "price", label: "Selling price", type: "number", default: 100, min: 0, step: 1, unit: "currency" },
    ],
    run(v, ctx) {
      if (v.cost <= 0) throw new Error("Enter a cost above zero.");
      const profit = v.price - v.cost;
      const markup = (profit / v.cost) * 100;
      const margin = (profit / v.price) * 100;
      return {
        primary: { label: "Markup", value: markup, format: "percent" },
        stats: [
          { label: "Gross profit per unit", value: profit, format: "currency" },
          { label: "Profit margin", value: margin, format: "percent" },
          { label: "Selling price", value: v.price, format: "currency" },
        ],
        steps: [
          `Profit = ${money(v.price, ctx)} − ${money(v.cost, ctx)} = ${money(profit, ctx)}.`,
          `Markup = ${money(profit, ctx)} / ${money(v.cost, ctx)} = ${num(markup)}% of cost.`,
          `Margin = ${money(profit, ctx)} / ${money(v.price, ctx)} = ${num(margin)}% of price.`,
        ],
        verdict: `Selling at ${money(v.price, ctx)} gives a ${num(markup)}% markup on cost, which is a ${num(margin)}% profit margin.`,
      };
    },
    formula: "Markup % = (Price − Cost) / Cost × 100;  Margin % = (Price − Cost) / Price × 100",
    example: [
      "A product costs $40 and sells for $100.",
      "Profit = $100 − $40 = $60; markup = 60 / 40 = 150%.",
      "Margin = 60 / 100 = 60%, so a 150% markup is only a 60% margin.",
    ],
    assumptions: ["Only the unit cost is considered — fees, shipping and taxes are excluded.", "Both figures are for a single unit.", "The selling price actually covers the cost."],
    faq: [
      { q: "Why is markup higher than margin?", a: "Markup divides profit by the smaller cost figure, while margin divides it by the larger price, so markup is always the bigger number." },
      { q: "Can I just double the cost?", a: "Doubling the cost is a 100% markup, which is a 50% margin. That may not be enough to cover overheads." },
      { q: "Which should I quote to a supplier?", a: "Buyers usually speak in margin and sellers in markup — always check which one is meant to avoid a nasty surprise." },
    ],
    related: ["profit-margin", "discount", "project-quote"],
  },

  {
    slug: "break-even",
    title: "Break-even calculator",
    h1: "Break-even calculator",
    category: "business",
    tags: ["break-even", "costs", "sales"],
    description: "Find the number of units and the revenue you need to cover fixed costs, given the price and variable cost of each unit you sell.",
    intro: "Break-even is the sales volume where total revenue exactly covers total costs. Sell more and you make a profit; sell less and you make a loss.",
    currency: true,
    inputs: [
      { key: "fixed", label: "Fixed costs", type: "number", default: 10000, min: 0, step: 500, unit: "currency" },
      { key: "price", label: "Price per unit", type: "number", default: 50, min: 0, step: 1, unit: "currency" },
      { key: "variable", label: "Variable cost per unit", type: "number", default: 30, min: 0, step: 1, unit: "currency" },
    ],
    run(v, ctx) {
      const be = breakEven({ fixed: v.fixed, price: v.price, variable: v.variable });
      if (!(be.contribution > 0)) throw new Error("The price must be above the variable cost per unit.");
      const units = Math.ceil(be.units);
      return {
        primary: { label: "Break-even units", value: units, format: "integer" },
        stats: [
          { label: "Contribution per unit", value: be.contribution, format: "currency" },
          { label: "Break-even revenue", value: be.revenue, format: "currency" },
          { label: "Fixed costs", value: v.fixed, format: "currency" },
        ],
        steps: [
          `Contribution per unit = ${money(v.price, ctx)} − ${money(v.variable, ctx)} = ${money(be.contribution, ctx)}.`,
          `Units = ${money(v.fixed, ctx)} / ${money(be.contribution, ctx)} = ${num(be.units)} units.`,
          `Revenue at break-even = ${num(units)} × ${money(v.price, ctx)} = ${money(be.revenue, ctx)}.`,
        ],
        verdict: `You need to sell ${num(units)} units, worth ${money(be.revenue, ctx)}, before the business starts making a profit.`,
      };
    },
    formula: "Break-even units = Fixed costs / (Price − Variable cost per unit)",
    example: [
      "Fixed costs $10,000, price $50, variable cost $30 per unit.",
      "Contribution = $50 − $30 = $20 per unit.",
      "Units = 10000 / 20 = 500 units; revenue = 500 × $50 = $25,000.",
    ],
    assumptions: ["Fixed costs, price and variable cost are constant over the range of sales.", "Everything produced is sold.", "No volume discounts or step changes in cost are modelled."],
    faq: [
      { q: "Why round break-even units up?", a: "You cannot sell a fraction of a unit and still cover costs, so the practical target is the next whole unit." },
      { q: "What if price is below variable cost?", a: "Each sale then loses money, so break-even is impossible — raise the price or cut unit costs." },
      { q: "How do I lower my break-even point?", a: "Increase the contribution per unit (higher price or cheaper variable costs) or reduce fixed costs." },
    ],
    related: ["contribution-margin", "profit-margin", "markup"],
  },

  {
    slug: "contribution-margin",
    title: "Contribution margin calculator",
    h1: "Contribution margin calculator",
    category: "business",
    tags: ["margin", "costs", "break-even"],
    description: "Calculate the contribution margin per unit and as a percentage of sales, plus the break-even volume when fixed costs are known.",
    intro: "Contribution margin is what each sale leaves behind to pay fixed costs and profit. It is the building block of break-even and pricing decisions.",
    currency: true,
    inputs: [
      { key: "price", label: "Price per unit", type: "number", default: 50, min: 0, step: 1, unit: "currency" },
      { key: "variable", label: "Variable cost per unit", type: "number", default: 30, min: 0, step: 1, unit: "currency" },
      { key: "fixed", label: "Fixed costs", type: "number", default: 10000, min: 0, step: 500, unit: "currency", optional: true, help: "Optional — add it to see the break-even volume." },
    ],
    run(v, ctx) {
      if (v.price <= 0) throw new Error("Enter a price above zero.");
      const contribution = v.price - v.variable;
      if (!(contribution > 0)) throw new Error("The variable cost must be below the selling price.");
      const ratio = (contribution / v.price) * 100;
      const units = v.fixed > 0 ? v.fixed / contribution : NaN;
      return {
        primary: { label: "Contribution margin", value: ratio, format: "percent" },
        stats: [
          { label: "Contribution per unit", value: contribution, format: "currency" },
          { label: "Break-even units", value: v.fixed > 0 ? Math.ceil(units) : "Add fixed costs", format: v.fixed > 0 ? "integer" : "text" },
          { label: "Revenue per unit", value: v.price, format: "currency" },
        ],
        steps: [
          `Contribution = ${money(v.price, ctx)} − ${money(v.variable, ctx)} = ${money(contribution, ctx)} per unit.`,
          `Contribution margin = ${money(contribution, ctx)} / ${money(v.price, ctx)} = ${num(ratio)}%.`,
          v.fixed > 0 ? `Break-even = ${money(v.fixed, ctx)} / ${money(contribution, ctx)} = ${num(units)} units.` : "Add fixed costs to see the break-even volume.",
        ],
        verdict: `Each sale contributes ${money(contribution, ctx)} — ${num(ratio)}% of the price — towards fixed costs and profit.`,
      };
    },
    formula: "Contribution margin % = (Price − Variable cost) / Price × 100",
    example: [
      "Price $50, variable cost $30, fixed costs $10,000.",
      "Contribution = $20 per unit; contribution margin = 20 / 50 = 40%.",
      "Break-even = 10000 / 20 = 500 units.",
    ],
    assumptions: ["Variable cost is strictly per unit and does not change with volume.", "Fixed costs are constant.", "Price is the net price received before discounts."],
    faq: [
      { q: "Contribution margin vs gross margin?", a: "Contribution margin deducts only variable costs, while gross margin usually deducts all product costs including some fixed overhead." },
      { q: "What is a good contribution margin?", a: "Software and services often exceed 70%; physical retail can be under 30%. The key is whether it covers fixed costs." },
      { q: "Why does contribution matter for pricing?", a: "Discounting a low-margin product can wipe out the contribution entirely, so it shows the floor price you can accept." },
    ],
    related: ["break-even", "profit-margin", "markup"],
  },

  {
    slug: "burn-runway",
    title: "Burn rate and runway calculator",
    h1: "Burn rate and runway calculator",
    category: "business",
    tags: ["startup", "runway", "burn rate"],
    description: "Work out your monthly net burn rate and how many months of runway your cash on hand gives you before the money runs out.",
    intro: "Runway is how long your cash lasts at the current burn rate. Enter cash on hand, monthly revenue and monthly expenses to see the clock.",
    currency: true,
    inputs: [
      { key: "cash", label: "Cash on hand", type: "number", default: 120000, min: 0, step: 5000, unit: "currency" },
      { key: "revenue", label: "Monthly revenue", type: "number", default: 5000, min: 0, step: 500, unit: "currency" },
      { key: "expenses", label: "Monthly expenses", type: "number", default: 15000, min: 0, step: 500, unit: "currency" },
    ],
    run(v, ctx) {
      const burn = v.expenses - v.revenue;
      const burning = burn > 0;
      const months = burning ? v.cash / burn : Infinity;
      const whole = burning ? Math.floor(months) : 0;
      return {
        primary: { label: "Runway", value: burning ? `${Math.floor(whole / 12)} yr ${whole % 12} mo` : "Cash-flow positive", format: "text" },
        stats: [
          { label: "Monthly net burn", value: burn, format: "currency" },
          { label: "Annual net burn", value: burn * 12, format: "currency" },
          { label: "Runway (months)", value: burning ? months : "No burn", format: burning ? "number" : "text" },
        ],
        steps: [
          `Net burn = ${money(v.expenses, ctx)} − ${money(v.revenue, ctx)} = ${money(burn, ctx)} a month.`,
          burning ? `Runway = ${money(v.cash, ctx)} / ${money(burn, ctx)} = ${num(months)} months.` : "Revenue covers expenses, so cash is not being burned.",
          burning ? `At this rate the cash runs out after ${num(whole)} full months.` : `You are adding ${money(Math.abs(burn), ctx)} a month to the balance.`,
        ],
        verdict: burning
          ? `At a net burn of ${money(burn, ctx)} a month, ${money(v.cash, ctx)} buys about ${Math.floor(whole / 12)} years and ${whole % 12} months of runway.`
          : `You are profitable by ${money(Math.abs(burn), ctx)} a month, so runway is not limited by this cash balance.`,
      };
    },
    formula: "Net burn = Expenses − Revenue;  Runway = Cash / Net burn",
    example: [
      "Cash $120,000, monthly revenue $5,000, monthly expenses $15,000.",
      "Net burn = $15,000 − $5,000 = $10,000 a month.",
      "Runway = 120000 / 10000 = 12 months.",
    ],
    assumptions: ["Revenue and expenses stay flat; real startups rarely grow linearly.", "No new funding is raised during the period.", "Cash on hand is fully available to spend."],
    faq: [
      { q: "Gross burn vs net burn?", a: "Gross burn is total monthly spending; net burn subtracts revenue. Runway uses net burn because revenue offsets spending." },
      { q: "How much runway should a startup keep?", a: "Twelve to eighteen months is a common target, so there is time to raise or reach profitability without a rushed deal." },
      { q: "Does runway change if revenue grows?", a: "Yes. As revenue rises, net burn falls and runway extends — sometimes beyond the horizon shown here." },
    ],
    related: ["mrr-arr", "cac", "ltv"],
  },

  {
    slug: "cac",
    title: "Customer acquisition cost (CAC) calculator",
    h1: "Customer acquisition cost calculator",
    category: "business",
    tags: ["marketing", "acquisition", "cac"],
    description: "Calculate customer acquisition cost from your total sales and marketing spend and the number of new customers won in the period.",
    intro: "CAC is what it costs, on average, to win one new customer. Compare it with lifetime value to see whether growth is sustainable.",
    currency: true,
    inputs: [
      { key: "spend", label: "Sales & marketing spend", type: "number", default: 10000, min: 0, step: 500, unit: "currency" },
      { key: "customers", label: "New customers won", type: "number", default: 200, min: 0, step: 10 },
    ],
    run(v, ctx) {
      if (v.customers <= 0) throw new Error("Enter at least one new customer.");
      const cost = cac(v.spend, v.customers);
      return {
        primary: { label: "Customer acquisition cost", value: cost, format: "currency" },
        stats: [
          { label: "Total spend", value: v.spend, format: "currency" },
          { label: "New customers", value: v.customers, format: "integer" },
          { label: "Customers per $1,000", value: v.spend > 0 ? v.customers / (v.spend / 1000) : NaN, format: "number" },
        ],
        steps: [
          `CAC = spend / new customers.`,
          `= ${money(v.spend, ctx)} / ${num(v.customers)} = ${money(cost, ctx)} per customer.`,
          `At this rate ${money(1000, ctx)} of spend brings in ${num(v.spend > 0 ? v.customers / (v.spend / 1000) : NaN)} customers.`,
        ],
        verdict: `It costs about ${money(cost, ctx)} to win each new customer; keep lifetime value comfortably above that for healthy growth.`,
      };
    },
    formula: "CAC = Sales & marketing spend / New customers",
    example: [
      "Spend $10,000 on marketing and win 200 new customers.",
      "CAC = 10000 / 200 = $50 per customer.",
      "If each customer is worth $300 of gross profit, the payback is comfortable.",
    ],
    assumptions: ["All sales and marketing spend is included in the period.", "Customers are attributed correctly to that spend.", "No allowance for organic or referred customers."],
    faq: [
      { q: "What is a good CAC?", a: "It depends entirely on value earned per customer. A common rule is to keep LTV at least three times CAC." },
      { q: "Should CAC include salaries?", a: "Fully-loaded CAC includes marketing spend plus the salaries of the people doing sales and marketing." },
      { q: "Why did CAC rise?", a: "Channels saturate, competition bids up ad prices, or targeting got looser — check each channel separately." },
    ],
    related: ["ltv", "churn", "mrr-arr"],
  },

  {
    slug: "ltv",
    title: "Customer lifetime value (LTV) calculator",
    h1: "Customer lifetime value calculator",
    category: "business",
    tags: ["retention", "clv", "ltv"],
    description: "Estimate margin-adjusted customer lifetime value from monthly revenue per customer, gross margin and your monthly churn rate.",
    intro: "Lifetime value estimates the gross profit a customer brings before they leave. It uses your monthly churn rate to work out the average lifetime.",
    currency: true,
    inputs: [
      { key: "arpu", label: "Average revenue per user (monthly)", type: "number", default: 50, min: 0, step: 1, unit: "currency" },
      { key: "marginPct", label: "Gross margin", type: "number", default: 80, min: 0, max: 100, step: 1, unit: "percent" },
      { key: "churnPct", label: "Monthly churn rate", type: "number", default: 5, min: 0.1, max: 100, step: 0.1, unit: "percent" },
    ],
    run(v, ctx) {
      if (v.churnPct <= 0) throw new Error("Enter a churn rate above zero.");
      const value = ltv({ arpu: v.arpu, marginPct: v.marginPct, churnPct: v.churnPct });
      const lifetime = 100 / v.churnPct;
      const grossProfit = (v.arpu * v.marginPct) / 100;
      return {
        primary: { label: "Customer lifetime value", value: value, format: "currency" },
        stats: [
          { label: "Average customer lifetime", value: lifetime, format: "number" },
          { label: "Monthly gross profit per customer", value: grossProfit, format: "currency" },
          { label: "Annual revenue per customer", value: v.arpu * 12, format: "currency" },
        ],
        steps: [
          `Gross profit per month = ${money(v.arpu, ctx)} × ${num(v.marginPct)}% = ${money(grossProfit, ctx)}.`,
          `Average lifetime = 1 / churn = 1 / ${num(v.churnPct / 100)} = ${num(lifetime)} months.`,
          `LTV = ${money(grossProfit, ctx)} × ${num(lifetime)} = ${money(value, ctx)}.`,
        ],
        verdict: `At ${num(v.churnPct)}% monthly churn a customer stays about ${num(lifetime)} months and is worth ${money(value, ctx)} of gross profit.`,
      };
    },
    formula: "LTV = ARPU × Gross margin % / Monthly churn rate",
    example: [
      "ARPU $50 a month, 80% gross margin, 5% monthly churn.",
      "Average lifetime = 1 / 0.05 = 20 months.",
      "LTV = ($50 × 0.80) × 20 = $800 of gross profit.",
    ],
    assumptions: ["Churn and ARPU are constant over the customer's life.", "LTV is margin-adjusted — it measures gross profit, not revenue.", "No discounting of future cash flows is applied."],
    faq: [
      { q: "Why use margin-adjusted LTV?", a: "Revenue alone overstates value — only the gross profit left after serving the customer can pay for acquisition and overheads." },
      { q: "How does churn affect LTV?", a: "LTV is inversely proportional to churn. Halving churn doubles the average lifetime and the lifetime value." },
      { q: "What LTV:CAC ratio should I target?", a: "A ratio of about 3:1 is a common benchmark — enough margin to grow while staying efficient." },
    ],
    related: ["cac", "churn", "mrr-arr"],
  },

  {
    slug: "churn",
    title: "Churn rate calculator",
    h1: "Churn rate calculator",
    category: "business",
    tags: ["retention", "churn", "saas"],
    description: "Calculate your customer churn rate and retention rate from the number of customers you started with and how many were lost.",
    intro: "Churn is the share of customers who leave in a period. It drives growth, lifetime value and how hard you must work to stand still.",
    inputs: [
      { key: "start", label: "Customers at the start", type: "number", default: 1000, min: 0, step: 10 },
      { key: "lost", label: "Customers lost", type: "number", default: 40, min: 0, step: 1 },
    ],
    run(v) {
      if (v.start <= 0) throw new Error("Enter a starting customer count above zero.");
      const churn = (v.lost / v.start) * 100;
      const retention = 100 - churn;
      return {
        primary: { label: "Churn rate", value: churn, format: "percent" },
        stats: [
          { label: "Retention rate", value: retention, format: "percent" },
          { label: "Customers retained", value: v.start - v.lost, format: "integer" },
          { label: "Customers lost", value: v.lost, format: "integer" },
        ],
        steps: [
          `Churn = lost / starting customers = ${num(v.lost)} / ${num(v.start)} = ${num(churn)}%.`,
          `Retention = 100% − ${num(churn)}% = ${num(retention)}%.`,
        ],
        verdict: `Losing ${num(v.lost)} of ${num(v.start)} customers is a ${num(churn)}% churn rate, leaving ${num(retention)}% retention.`,
      };
    },
    formula: "Churn % = Customers lost / Customers at start × 100",
    example: [
      "Start the month with 1,000 customers and lose 40.",
      "Churn = 40 / 1000 = 4%.",
      "Retention = 100% − 4% = 96% for the month.",
    ],
    assumptions: ["Lost customers are counted once in the period.", "New customers are excluded from the base.", "The measure is customer churn, not revenue churn."],
    faq: [
      { q: "Customer churn vs revenue churn?", a: "Customer churn counts heads lost; revenue churn measures the money lost, which differs when customers pay different amounts." },
      { q: "How do I annualise churn?", a: "Monthly churn compounds: 1 − (1 − monthly)^12. A 4% monthly churn is roughly 39% a year." },
      { q: "Why does churn matter so much?", a: "It caps growth and shrinks customer lifetime value, so a leaking bucket needs ever more acquisition to stand still." },
    ],
    related: ["ltv", "mrr-arr", "cac"],
  },

  {
    slug: "mrr-arr",
    title: "MRR and ARR calculator",
    h1: "MRR and ARR calculator",
    category: "business",
    tags: ["saas", "revenue", "mrr", "arr"],
    description: "Convert your paying customer count and average monthly revenue per user into monthly recurring revenue and annual recurring revenue.",
    intro: "MRR and ARR are the standard gauges of subscription revenue. They scale a per-customer figure up to the whole base.",
    currency: true,
    inputs: [
      { key: "customers", label: "Paying customers", type: "number", default: 500, min: 0, step: 10 },
      { key: "arpu", label: "Average revenue per user (monthly)", type: "number", default: 49, min: 0, step: 1, unit: "currency" },
    ],
    run(v, ctx) {
      const mrr = v.customers * v.arpu;
      const arr = mrr * 12;
      return {
        primary: { label: "Monthly recurring revenue (MRR)", value: mrr, format: "currency" },
        stats: [
          { label: "Annual recurring revenue (ARR)", value: arr, format: "currency" },
          { label: "Average revenue per user", value: v.arpu, format: "currency" },
          { label: "Paying customers", value: v.customers, format: "integer" },
        ],
        steps: [
          `MRR = customers × ARPU = ${num(v.customers)} × ${money(v.arpu, ctx)} = ${money(mrr, ctx)}.`,
          `ARR = MRR × 12 = ${money(arr, ctx)}.`,
        ],
        verdict: `${num(v.customers)} customers paying ${money(v.arpu, ctx)} a month produce ${money(mrr, ctx)} MRR and ${money(arr, ctx)} ARR.`,
      };
    },
    formula: "MRR = Customers × ARPU;  ARR = MRR × 12",
    example: [
      "500 paying customers at $49 each a month.",
      "MRR = 500 × $49 = $24,500.",
      "ARR = $24,500 × 12 = $294,000.",
    ],
    assumptions: ["Every customer pays the same average amount.", "The base is stable — no new or churned customers in the period.", "All revenue is genuinely recurring."],
    faq: [
      { q: "MRR or ARR — which should I track?", a: "Use MRR for month-to-month decisions and ARR when comparing annual contracts or talking to investors." },
      { q: "Does ARR just multiply MRR by 12?", a: "For simple reporting, yes. Strictly it should be the annualised value of contracted recurring revenue." },
      { q: "How does churn interact with MRR?", a: "Net revenue retention nets new and expanded revenue against churn, showing whether the base grows on its own." },
    ],
    related: ["churn", "ltv", "cac"],
  },

  {
    slug: "inventory-turnover",
    title: "Inventory turnover calculator",
    h1: "Inventory turnover calculator",
    category: "business",
    tags: ["inventory", "operations", "retail"],
    description: "Calculate how many times your inventory turns over in a year and the average number of days stock sits on the shelf before it sells.",
    intro: "Inventory turnover shows how efficiently stock is sold and replaced. Higher turnover usually means less cash tied up in the warehouse.",
    currency: true,
    inputs: [
      { key: "cogs", label: "Annual cost of goods sold", type: "number", default: 600000, min: 0, step: 5000, unit: "currency" },
      { key: "avgInventory", label: "Average inventory value", type: "number", default: 100000, min: 0, step: 5000, unit: "currency" },
    ],
    run(v, ctx) {
      if (v.avgInventory <= 0) throw new Error("Enter an average inventory above zero.");
      if (v.cogs <= 0) throw new Error("Enter annual COGS above zero.");
      const turnover = v.cogs / v.avgInventory;
      const days = 365 / turnover;
      return {
        primary: { label: "Inventory turnover", value: turnover, format: "number" },
        stats: [
          { label: "Days inventory outstanding", value: days, format: "number" },
          { label: "Annual COGS", value: v.cogs, format: "currency" },
          { label: "Average inventory", value: v.avgInventory, format: "currency" },
        ],
        steps: [
          `Turnover = COGS / average inventory = ${money(v.cogs, ctx)} / ${money(v.avgInventory, ctx)} = ${num(turnover)}×.`,
          `Days = 365 / ${num(turnover)} = ${num(days)} days of stock on hand.`,
        ],
        verdict: `Stock is sold and replaced about ${num(turnover)} times a year, sitting in the warehouse for roughly ${num(days)} days on average.`,
      };
    },
    formula: "Inventory turnover = COGS / Average inventory;  Days = 365 / Turnover",
    example: [
      "Annual COGS $600,000 with an average inventory of $100,000.",
      "Turnover = 600000 / 100000 = 6 times a year.",
      "Days = 365 / 6 = 60.8 days of stock on hand.",
    ],
    assumptions: ["COGS and inventory levels are for the same period.", "Inventory is valued consistently at cost.", "Seasonality is averaged out over the year."],
    faq: [
      { q: "Is a higher turnover always better?", a: "Usually, because it frees cash, but too high can mean stockouts and lost sales — it depends on your margins and lead times." },
      { q: "Why use average inventory?", a: "Inventory swings through the year, so the average start-and-end value better represents the level actually held." },
      { q: "What counts as good turnover?", a: "It varies by industry: grocery can turn 15+ times, while a jewellery or furniture business might turn only twice." },
    ],
    related: ["profit-margin", "markup", "break-even"],
  },

  {
    slug: "vat",
    title: "VAT calculator",
    h1: "VAT calculator",
    category: "business",
    tags: ["vat", "tax", "pricing"],
    description: "Add VAT to a net amount or strip VAT out of a gross, tax-inclusive amount to find the tax charged and the pre-tax price.",
    intro: "VAT is a consumption tax added to the net price. Switch between adding it to a price and removing it from a tax-inclusive total.",
    currency: true,
    inputs: [
      { key: "amount", label: "Amount", type: "number", default: 1000, min: 0, step: 10, unit: "currency" },
      { key: "rate", label: "VAT rate", type: "number", default: 20, min: 0, max: 100, step: 0.5, unit: "percent" },
      {
        key: "mode", label: "Calculation", type: "select", default: "add",
        options: [{ value: "add", label: "Add VAT (amount is net)" }, { value: "remove", label: "Remove VAT (amount is gross)" }],
      },
    ],
    run(v, ctx) {
      const r = v.rate / 100;
      if (v.mode === "remove" && r <= -1) throw new Error("A VAT rate of −100% or less is not valid.");
      const adding = v.mode !== "remove";
      let net, vat, gross;
      if (adding) { net = v.amount; vat = net * r; gross = net + vat; }
      else { gross = v.amount; net = gross / (1 + r); vat = gross - net; }
      return {
        primary: { label: adding ? "Gross amount (incl. VAT)" : "Net amount (excl. VAT)", value: adding ? gross : net, format: "currency" },
        stats: [
          { label: "Net amount", value: net, format: "currency" },
          { label: "VAT amount", value: vat, format: "currency" },
          { label: "Gross amount", value: gross, format: "currency" },
        ],
        steps: [
          adding
            ? `VAT = ${money(v.amount, ctx)} × ${num(v.rate)}% = ${money(vat, ctx)}.`
            : `Net = ${money(v.amount, ctx)} / (1 + ${num(v.rate / 100)}) = ${money(net, ctx)}.`,
          `Gross = net + VAT = ${money(gross, ctx)}.`,
        ],
        verdict: `At a ${num(v.rate)}% VAT rate, ${money(v.amount, ctx)} corresponds to ${money(net, ctx)} net plus ${money(vat, ctx)} of VAT.`,
      };
    },
    formula: "Add: gross = net × (1 + rate).  Remove: net = gross / (1 + rate)",
    example: [
      "A net price of $1,000 at 20% VAT.",
      "VAT = 1000 × 0.20 = $200.",
      "Gross = $1,200. Removing VAT from $1,200 gives net $1,000 again.",
    ],
    assumptions: ["A single VAT rate applies to the whole amount.", "No zero-rated, reduced or exempt items are mixed in.", "Rounding is applied only for display."],
    faq: [
      { q: "Why isn't removing VAT just dividing by the rate?", a: "VAT is charged on the net amount, but a gross figure already includes it, so you divide by (1 + rate), not by the rate." },
      { q: "What rate should I use?", a: "Use the rate for your country and product category — standard rates range widely and some goods are reduced or zero-rated." },
      { q: "Is VAT the same as sales tax?", a: "They are similar, but VAT is collected at each stage of the supply chain while sales tax is usually charged once at the final sale." },
    ],
    related: ["sales-tax", "discount", "profit-margin"],
  },

  {
    slug: "sales-tax",
    title: "Sales tax calculator",
    h1: "Sales tax calculator",
    category: "business",
    tags: ["sales tax", "tax", "retail"],
    description: "Add sales tax to a price or work backwards from a tax-inclusive receipt total to find the tax paid and the pre-tax amount.",
    intro: "Sales tax is charged on the final sale. Use this to add it to a price or to extract it from a receipt total.",
    currency: true,
    inputs: [
      { key: "price", label: "Price", type: "number", default: 100, min: 0, step: 1, unit: "currency" },
      { key: "rate", label: "Sales tax rate", type: "number", default: 8, min: 0, max: 100, step: 0.05, unit: "percent" },
      {
        key: "mode", label: "Calculation", type: "select", default: "add",
        options: [{ value: "add", label: "Add tax (price is pre-tax)" }, { value: "remove", label: "Remove tax (price includes tax)" }],
      },
    ],
    run(v, ctx) {
      const r = v.rate / 100;
      let net, tax, gross;
      if (v.mode === "remove") { gross = v.price; net = gross / (1 + r); tax = gross - net; }
      else { net = v.price; tax = net * r; gross = net + tax; }
      const adding = v.mode !== "remove";
      return {
        primary: { label: adding ? "Total with tax" : "Pre-tax price", value: adding ? gross : net, format: "currency" },
        stats: [
          { label: "Pre-tax price", value: net, format: "currency" },
          { label: "Sales tax", value: tax, format: "currency" },
          { label: "Total price", value: gross, format: "currency" },
        ],
        steps: [
          adding ? `Tax = ${money(v.price, ctx)} × ${num(v.rate)}% = ${money(tax, ctx)}.` : `Pre-tax = ${money(v.price, ctx)} / (1 + ${num(v.rate / 100)}) = ${money(net, ctx)}.`,
          `Total = ${money(net, ctx)} + ${money(tax, ctx)} = ${money(gross, ctx)}.`,
        ],
        verdict: `At ${num(v.rate)}% sales tax, ${money(net, ctx)} before tax becomes ${money(gross, ctx)} including ${money(tax, ctx)} of tax.`,
      };
    },
    formula: "Add: total = price × (1 + rate).  Remove: price = total / (1 + rate)",
    example: [
      "A $100 item with 8% sales tax.",
      "Tax = 100 × 0.08 = $8.",
      "Total = $108; removing tax from $108 returns $100 pre-tax.",
    ],
    assumptions: ["One tax rate applies to the whole sale.", "No exemptions or multiple jurisdictions are combined.", "Display rounding only."],
    faq: [
      { q: "Why is the tax on a receipt not simply the rate times the total?", a: "The total already includes tax, so the tax portion is total × rate / (1 + rate), not total × rate." },
      { q: "Can sales tax be compounded?", a: "In some places state and local taxes stack, which can be modelled by adding the rates together here." },
      { q: "Do all goods get taxed?", a: "No. Many jurisdictions exempt food, medicine or clothing, so apply this to taxable items only." },
    ],
    related: ["vat", "discount", "profit-margin"],
  },

  {
    slug: "discount",
    title: "Discount calculator",
    h1: "Discount calculator",
    category: "business",
    tags: ["discount", "pricing", "retail"],
    description: "Work out the final price after a percentage discount plus any fixed money-off, and see the saving as a percentage of the original price.",
    intro: "Enter an original price, a percentage discount and any fixed amount off to see what the customer actually pays and saves.",
    currency: true,
    inputs: [
      { key: "price", label: "Original price", type: "number", default: 200, min: 0, step: 5, unit: "currency" },
      { key: "discountPct", label: "Discount", type: "number", default: 25, min: 0, max: 100, step: 1, unit: "percent" },
      { key: "extraFixed", label: "Extra fixed amount off", type: "number", default: 0, min: 0, step: 1, unit: "currency", optional: true },
    ],
    run(v, ctx) {
      if (v.price <= 0) throw new Error("Enter a price above zero.");
      const percentSaving = (v.price * v.discountPct) / 100;
      const saving = percentSaving + v.extraFixed;
      const final = Math.max(0, v.price - saving);
      const effective = (saving / v.price) * 100;
      return {
        primary: { label: "Final price", value: final, format: "currency" },
        stats: [
          { label: "You save", value: saving, format: "currency" },
          { label: "Effective discount", value: effective, format: "percent" },
          { label: "Percent discount saving", value: percentSaving, format: "currency" },
        ],
        steps: [
          `Percentage saving = ${money(v.price, ctx)} × ${num(v.discountPct)}% = ${money(percentSaving, ctx)}.`,
          `Total saving = ${money(percentSaving, ctx)} + ${money(v.extraFixed, ctx)} = ${money(saving, ctx)}.`,
          `Final price = ${money(v.price, ctx)} − ${money(saving, ctx)} = ${money(final, ctx)}.`,
        ],
        verdict: `You pay ${money(final, ctx)}, saving ${money(saving, ctx)} — an effective discount of ${num((saving / v.price) * 100)}% off the original price.`,
      };
    },
    formula: "Saving = Price × Discount% + Fixed off;  Final = max(0, Price − Saving)",
    example: [
      "A $200 item with 25% off plus a $10 voucher.",
      "Percentage saving = 200 × 0.25 = $50.",
      "Total saving = $60, so the final price is $140 (30% effective).",
    ],
    assumptions: ["The discount applies to the listed price.", "Any fixed amount comes off after the percentage.", "Tax is added afterwards, if applicable."],
    faq: [
      { q: "Do stacked discounts multiply or add?", a: "Retailers often apply them one after another, which multiplies — 20% then 10% is 28% off, not 30%. Enter the combined effective rate here." },
      { q: "Can the price go below zero?", a: "No. This calculator floors the final price at zero if the fixed amount exceeds the remaining price." },
      { q: "What is the effective discount?", a: "It is the total saving as a percentage of the original price — useful for comparing deals." },
    ],
    related: ["markup", "sales-tax", "vat"],
  },

  {
    slug: "freelance-rate",
    title: "Freelance hourly rate calculator",
    h1: "Freelance hourly rate calculator",
    category: "business",
    tags: ["freelance", "rate", "self-employed"],
    description: "Work out the hourly rate a freelancer must charge to hit a target take-home pay after business expenses and tax are covered.",
    intro: "Freelancers only bill part of their working time. This works backwards from the income you want to find the rate you must charge.",
    currency: true,
    inputs: [
      { key: "targetTakeHome", label: "Target take-home pay (per year)", type: "number", default: 80000, min: 0, step: 1000, unit: "currency" },
      { key: "expenses", label: "Business expenses (per year)", type: "number", default: 10000, min: 0, step: 500, unit: "currency" },
      { key: "taxRate", label: "Tax rate", type: "number", default: 25, min: 0, max: 99, step: 1, unit: "percent" },
      { key: "hoursPerWeek", label: "Billable hours per week", type: "number", default: 25, min: 1, max: 80, step: 1 },
      { key: "weeksPerYear", label: "Weeks worked per year", type: "number", default: 48, min: 1, max: 52, step: 1 },
    ],
    run(v, ctx) {
      const billableHours = v.hoursPerWeek * v.weeksPerYear;
      if (billableHours <= 0) throw new Error("Enter billable hours greater than zero.");
      if (v.taxRate >= 100) throw new Error("The tax rate must be below 100%.");
      const gross = v.targetTakeHome / (1 - v.taxRate / 100) + v.expenses;
      const rate = gross / billableHours;
      return {
        primary: { label: "Required hourly rate", value: rate, format: "currency" },
        stats: [
          { label: "Required gross revenue", value: gross, format: "currency" },
          { label: "Billable hours per year", value: billableHours, format: "integer" },
          { label: "Day rate (8 hours)", value: rate * 8, format: "currency" },
          { label: "Target take-home", value: v.targetTakeHome, format: "currency" },
        ],
        steps: [
          `Gross before tax needed for ${money(v.targetTakeHome, ctx)} take-home = ${money(v.targetTakeHome, ctx)} / (1 − ${num(v.taxRate / 100)}) = ${money(v.targetTakeHome / (1 - v.taxRate / 100), ctx)}.`,
          `Add ${money(v.expenses, ctx)} of expenses → ${money(gross, ctx)} of revenue.`,
          `Billable hours = ${num(v.hoursPerWeek)} × ${num(v.weeksPerYear)} = ${num(billableHours)}; rate = ${money(gross, ctx)} / ${num(billableHours)} = ${money(rate, ctx)}.`,
        ],
        verdict: `To take home ${money(v.targetTakeHome, ctx)} you must bill about ${money(rate, ctx)} an hour, or ${money(rate * 8, ctx)} for an eight-hour day.`,
      };
    },
    formula: "Rate = [Take-home / (1 − tax%) + Expenses] / (Hours per week × Weeks per year)",
    example: [
      "Target $80,000 take-home, $10,000 expenses, 25% tax, 25 billable hours a week for 48 weeks.",
      "Gross before tax = 80000 / 0.75 = $106,667; add expenses = $116,667.",
      "Billable hours = 1,200, so the rate is 116667 / 1200 = $97.22 an hour.",
    ],
    assumptions: ["Only billable hours are counted — admin and marketing time is unpaid.", "The tax rate is an average effective rate, not a marginal one.", "Expenses are annual and fully deductible."],
    faq: [
      { q: "Why is this higher than a salary equivalent?", a: "A salaried employee is paid for all hours, gets paid holidays and has employer taxes paid for them — freelancers must build all of that into the rate." },
      { q: "What counts as a billable hour?", a: "Only hours you can actually charge a client. Admin, invoicing, marketing and holidays are not billable." },
      { q: "Should I include a profit margin?", a: "Yes, ideally. Add a buffer to the expenses or target so the business funds itself rather than just paying you." },
    ],
    related: ["billable-utilization", "project-quote", "profit-margin"],
  },

  {
    slug: "project-quote",
    title: "Project quote calculator",
    h1: "Project quote calculator",
    category: "business",
    tags: ["freelance", "quote", "pricing"],
    description: "Build a client project quote from estimated hours and an hourly rate, adding a contingency buffer and applying any discount.",
    intro: "A good quote prices the work, cushions the estimate and shows any discount clearly. Enter the hours and rate to see the final total.",
    currency: true,
    inputs: [
      { key: "hours", label: "Estimated hours", type: "number", default: 40, min: 0, step: 1 },
      { key: "hourlyRate", label: "Hourly rate", type: "number", default: 85, min: 0, step: 5, unit: "currency" },
      { key: "contingencyPct", label: "Contingency buffer", type: "number", default: 10, min: 0, max: 100, step: 1, unit: "percent" },
      { key: "discountPct", label: "Client discount", type: "number", default: 5, min: 0, max: 100, step: 1, unit: "percent" },
    ],
    run(v, ctx) {
      const base = v.hours * v.hourlyRate;
      const contingency = (base * v.contingencyPct) / 100;
      const subtotal = base + contingency;
      const discount = (subtotal * v.discountPct) / 100;
      const total = subtotal - discount;
      const effective = v.hours > 0 ? total / v.hours : NaN;
      return {
        primary: { label: "Project total", value: total, format: "currency" },
        stats: [
          { label: "Base (hours × rate)", value: base, format: "currency" },
          { label: "Contingency", value: contingency, format: "currency" },
          { label: "Discount", value: discount, format: "currency" },
          { label: "Effective hourly rate", value: effective, format: "currency" },
        ],
        steps: [
          `Base = ${num(v.hours)} hours × ${money(v.hourlyRate, ctx)} = ${money(base, ctx)}.`,
          `Contingency = ${num(v.contingencyPct)}% of base = ${money(contingency, ctx)}, so the subtotal is ${money(subtotal, ctx)}.`,
          `Discount = ${num(v.discountPct)}% of subtotal = ${money(discount, ctx)}, giving a total of ${money(total, ctx)}.`,
        ],
        verdict: `Quote ${money(total, ctx)} for ${num(v.hours)} hours — an effective ${money(effective, ctx)} an hour after the contingency and discount.`,
      };
    },
    formula: "Total = (Hours × Rate) × (1 + Contingency%) × (1 − Discount%)",
    example: [
      "40 hours at $85 an hour is a $3,400 base.",
      "A 10% contingency adds $340, giving a $3,740 subtotal.",
      "A 5% discount takes off $187, so the quote is $3,553 (about $88.83 an hour).",
    ],
    assumptions: ["Hours is a realistic estimate of the work.", "Contingency is a fixed percentage of the base, not of the discounted total.", "Discount is applied after the contingency is added."],
    faq: [
      { q: "Why add a contingency?", a: "Projects rarely run exactly to estimate. A buffer absorbs small overruns without needing an awkward conversation or a change request." },
      { q: "Should the discount come before or after contingency?", a: "Applying it after the contingency (as here) treats the buffer as part of the price you are discounting from — decide deliberately." },
      { q: "When should I quote a fixed price?", a: "When the scope is clear and you can absorb the risk. Use an hourly rate for exploratory or changing work." },
    ],
    related: ["freelance-rate", "billable-utilization", "profit-margin"],
  },

  {
    slug: "billable-utilization",
    title: "Billable utilization calculator",
    h1: "Billable utilization calculator",
    category: "business",
    tags: ["freelance", "utilization", "productivity"],
    description: "Calculate billable utilization as a percentage of your total hours worked, and see how much non-billable time that leaves.",
    intro: "Utilization measures the share of your working time that is actually billable. The rest goes on admin, sales and admin overhead.",
    inputs: [
      { key: "billableHours", label: "Billable hours", type: "number", default: 25, min: 0, step: 1 },
      { key: "totalHours", label: "Total hours worked", type: "number", default: 40, min: 0, step: 1 },
    ],
    run(v) {
      if (v.totalHours <= 0) throw new Error("Enter total hours above zero.");
      const utilization = (v.billableHours / v.totalHours) * 100;
      const nonBillable = v.totalHours - v.billableHours;
      return {
        primary: { label: "Billable utilization", value: utilization, format: "percent" },
        stats: [
          { label: "Billable hours", value: v.billableHours, format: "number" },
          { label: "Non-billable hours", value: nonBillable, format: "number" },
          { label: "Total hours", value: v.totalHours, format: "number" },
        ],
        steps: [
          `Utilization = billable / total = ${num(v.billableHours)} / ${num(v.totalHours)} = ${num(utilization)}%.`,
          `Non-billable = ${num(v.totalHours)} − ${num(v.billableHours)} = ${num(v.nonBillable)} hours.`,
        ],
        verdict: `${num(utilization)}% of your time is billable, leaving ${num(v.totalHours - v.billableHours)} hours a week for admin, sales and everything else.`,
      };
    },
    formula: "Utilization % = Billable hours / Total hours × 100",
    example: [
      "25 billable hours out of a 40-hour week.",
      "Utilization = 25 / 40 = 62.5%.",
      "That leaves 15 non-billable hours for admin, marketing and breaks.",
    ],
    assumptions: ["Total hours are actual hours worked, not contracted hours.", "Billable time is recorded accurately.", "No allowance for paid holiday within the period."],
    faq: [
      { q: "What is a realistic utilization target?", a: "For freelancers 60–80% is typical; agencies often aim for 70–85% of available time, since nobody bills every hour." },
      { q: "Why not aim for 100%?", a: "Admin, invoicing, marketing and learning all take time. A 100% target is impossible and burns people out." },
      { q: "How does utilization affect my rate?", a: "Lower utilization means fewer billable hours, so the hourly rate must be higher to hit the same income." },
    ],
    related: ["freelance-rate", "project-quote", "profit-margin"],
  },
];
