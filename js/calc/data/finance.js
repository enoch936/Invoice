// Financial calculators — personal finance, loans and investing.
// Reference module for the catalog schema (see js/calc/catalog.js for the full contract).

import {
  amortization, compoundGrowth, futureValue, presentValue, npv, irr, cagr, roi,
  loanPayment,
} from "../math.js";
import { formatCurrency, formatNumber } from "../format.js";

const money = (v, ctx) => formatCurrency(v, ctx.currency);
const num = (v) => formatNumber(v);
const COMPOUNDING = { annually: 1, semiannually: 2, quarterly: 4, monthly: 12, daily: 365 };

export const FINANCE = [
  {
    slug: "compound-interest",
    title: "Compound interest calculator",
    h1: "Compound interest calculator",
    category: "finance",
    tags: ["savings", "investing", "interest"],
    description: "Project how a lump sum and regular contributions grow with compound interest, and see the year-by-year balance.",
    intro: "Compound interest pays interest on your interest. Enter a starting balance, any regular contributions and a rate to see the projected future value.",
    currency: true,
    inputs: [
      { key: "principal", label: "Starting amount", type: "number", default: 1000, min: 0, step: 100, unit: "currency" },
      { key: "contribution", label: "Contribution each period", type: "number", default: 100, min: 0, step: 10, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 5, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Years", type: "number", default: 10, min: 0, max: 100, step: 1 },
      {
        key: "compounding", label: "Compounding", type: "select", default: "monthly",
        options: [
          { value: "annually", label: "Annually" }, { value: "semiannually", label: "Semi-annually" },
          { value: "quarterly", label: "Quarterly" }, { value: "monthly", label: "Monthly" },
          { value: "daily", label: "Daily" },
        ],
      },
      {
        key: "timing", label: "Contributions made at", type: "select", default: "end",
        options: [{ value: "end", label: "End of period" }, { value: "begin", label: "Start of period" }],
      },
    ],
    run(v, ctx) {
      const perYear = COMPOUNDING[v.compounding] || 12;
      const g = compoundGrowth({ principal: v.principal, contribution: v.contribution, annualRate: v.rate, years: v.years, perYear, timing: v.timing });
      const rows = g.points.map((p) => [
        `Year ${p.x}`,
        { v: p.y, format: "currency" },
        { v: p.y - (v.principal + v.contribution * perYear * p.x), format: "currency" },
      ]);
      return {
        primary: { label: "Future value", value: g.futureValue, format: "currency" },
        stats: [
          { label: "Total contributed", value: g.contributed, format: "currency" },
          { label: "Interest earned", value: g.interest, format: "currency" },
          { label: "Growth multiple", value: g.contributed > 0 ? g.futureValue / g.contributed : NaN, format: "number" },
        ],
        chart: { points: g.points, xLabel: "Years", yLabel: "Balance" },
        table: { caption: "Projected balance by year", columns: [{ label: "Year" }, { label: "Balance", align: "right" }, { label: "Interest", align: "right" }], rows },
        steps: [
          `Compounded ${v.compounding} at ${num(v.rate)}% a year for ${num(v.years)} years.`,
          `Starting at ${money(v.principal, ctx)} with ${money(v.contribution, ctx)} added each period.`,
          `Future value = ${money(g.futureValue, ctx)}, of which ${money(g.interest, ctx)} is interest.`,
        ],
        verdict: `Contributing ${money(v.contribution, ctx)} per period turns ${money(v.contributed, ctx)} of your own money into ${money(g.futureValue, ctx)} at ${num(v.rate)}% over ${num(v.years)} years.`,
      };
    },
    formula: "FV = P(1 + r/n)^(n t) + PMT × [((1 + r/n)^(n t) − 1) / (r/n)]",
    example: [
      "Start with $1,000, add $100 a month, 5% a year compounded monthly, for 10 years.",
      "r/n = 0.05 / 12 = 0.0041667 and n·t = 120 periods.",
      "The lump sum grows to 1000 × 1.0041667^120 = $1,647.01.",
      "The contributions add a future-value annuity worth about $15,528, giving roughly $17,175 in total.",
    ],
    assumptions: [
      "The rate stays constant for the whole term — real rates move.",
      "Contributions are level and made at the time you selected.",
      "No tax, fees or inflation are deducted; the figure is a gross projection.",
    ],
    faq: [
      { q: "What does compounding frequency change?", a: "More frequent compounding means interest is added (and then earns interest) more often, so the same nominal rate produces a slightly larger result." },
      { q: "Is the result guaranteed?", a: "No. It is a mathematical projection of a constant rate. Real investment returns vary and can be negative." },
      { q: "What is the difference between the two contribution timings?", a: "A start-of-period contribution earns interest in the period it is paid; an end-of-period one does not." },
    ],
    related: ["simple-interest", "savings-goal", "roi", "cagr"],
  },

  {
    slug: "simple-interest",
    title: "Simple interest calculator",
    h1: "Simple interest calculator",
    category: "finance",
    tags: ["interest", "savings", "loans"],
    description: "Work out simple interest on a principal amount and see the total interest and final balance.",
    intro: "Simple interest is charged only on the original principal — it never compounds. Use it for short-term loans and flat-rate savings.",
    currency: true,
    inputs: [
      { key: "principal", label: "Principal", type: "number", default: 5000, min: 0, step: 100, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 6, min: 0, max: 200, step: 0.1, unit: "percent" },
      { key: "years", label: "Time", type: "number", default: 3, min: 0, step: 0.5, unit: "number" },
      { key: "unit", label: "Time unit", type: "select", default: "years", options: [{ value: "years", label: "Years" }, { value: "months", label: "Months" }] },
    ],
    run(v, ctx) {
      const years = v.unit === "months" ? v.years / 12 : v.years;
      const interest = v.principal * (v.rate / 100) * years;
      return {
        primary: { label: "Total interest", value: interest, format: "currency" },
        stats: [
          { label: "Final balance", value: v.principal + interest, format: "currency" },
          { label: "Principal", value: v.principal, format: "currency" },
          { label: "Effective period", value: years, format: "number" },
        ],
        steps: [
          `I = P × r × t = ${money(v.principal, ctx)} × ${num(v.rate / 100)} × ${num(years)}.`,
          `Interest = ${money(interest, ctx)}; balance = ${money(v.principal + interest, ctx)}.`,
        ],
        verdict: `At ${num(v.rate)}% simple interest for ${num(years)} years, ${money(v.principal, ctx)} earns ${money(interest, ctx)} and returns ${money(v.principal + interest, ctx)}.`,
      };
    },
    formula: "I = P × r × t",
    example: ["P = $5,000, r = 6% = 0.06, t = 3 years.", "I = 5000 × 0.06 × 3 = $900.", "Final balance = $5,000 + $900 = $5,900."],
    assumptions: ["The rate is fixed and the term is exact.", "Interest is not reinvested — that is what makes it simple."],
    faq: [
      { q: "Simple vs compound interest?", a: "Simple interest is always calculated on the original principal. Compound interest is calculated on the balance, so it grows faster over time." },
      { q: "Where is simple interest used?", a: "Short-term loans, some car finance, flat-rate savings products and legal judgments often use simple interest." },
    ],
    related: ["compound-interest", "loan-payment", "roi"],
  },

  {
    slug: "savings-goal",
    title: "Savings goal calculator",
    h1: "Savings goal calculator",
    category: "finance",
    tags: ["savings", "goals", "planning"],
    description: "Find out how long it takes to reach a savings target with a regular monthly deposit and a given interest rate.",
    intro: "Enter the amount you are saving towards, what you already have and what you can put aside each month to see how long it will take.",
    currency: true,
    inputs: [
      { key: "goal", label: "Savings goal", type: "number", default: 20000, min: 0, step: 500, unit: "currency" },
      { key: "current", label: "Already saved", type: "number", default: 2000, min: 0, step: 100, unit: "currency" },
      { key: "monthly", label: "Monthly deposit", type: "number", default: 300, min: 0, step: 10, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 3, min: 0, max: 100, step: 0.1, unit: "percent" },
    ],
    run(v, ctx) {
      if (v.current >= v.goal) return { primary: { label: "Time to goal", value: "Goal already met", format: "text" }, stats: [], steps: ["Your current savings already meet the goal."], verdict: "You have already reached this target." };
      if (v.monthly <= 0 && v.rate <= 0) throw new Error("Add a monthly deposit or a positive interest rate so the balance can grow.");
      const r = v.rate / 100 / 12;
      let balance = v.current, months = 0, contributed = 0, interest = 0;
      while (balance < v.goal && months < 1200) {
        const gain = balance * r;
        balance += gain + v.monthly; contributed += v.monthly; interest += gain; months++;
      }
      const reached = balance >= v.goal;
      const years = Math.floor(months / 12), rem = months % 12;
      const when = new Date(); when.setMonth(when.getMonth() + months);
      return {
        primary: { label: "Time to goal", value: reached ? `${years} yr ${rem} mo` : "Not reached in 100 years", format: "text" },
        stats: [
          { label: "Months", value: reached ? months : NaN, format: "integer" },
          { label: "Total deposited", value: contributed, format: "currency" },
          { label: "Interest earned", value: interest, format: "currency" },
          { label: "Target date", value: reached ? when.toISOString().slice(0, 10) : "—", format: "text" },
        ],
        verdict: reached ? `Saving ${money(v.monthly, ctx)} a month gets you to ${money(v.goal, ctx)} in ${years} years and ${rem} months.` : "The plan does not reach the goal within 100 years — increase the deposit or the rate.",
        steps: [
          `Goal ${money(v.goal, ctx)} from ${money(v.current, ctx)} at ${num(v.rate)}% with ${money(v.monthly, ctx)} a month.`,
          reached ? `Reached after ${months} monthly deposits; ${money(interest, ctx)} of that is interest.` : "The balance never reaches the goal.",
        ],
      };
    },
    formula: "Simulate each month: balance = balance × (1 + r/12) + deposit",
    example: ["Goal $20,000, already saved $2,000, deposit $300/month at 3%.", "Each month the balance earns 0.25% and grows by $300.", "The goal is reached in about 56 months (4 years 8 months)."],
    assumptions: ["The deposit and rate are constant.", "Interest is credited monthly.", "No tax or fees are applied."],
    faq: [
      { q: "Why does time fall when the rate rises?", a: "Higher interest adds more to the balance every month, so fewer deposits are needed to reach the target." },
      { q: "Does it assume I deposit on time?", a: "Yes — it assumes every monthly deposit is made in full." },
    ],
    related: ["compound-interest", "emergency-fund", "future-value"],
  },

  {
    slug: "loan-payment",
    title: "Loan payment calculator",
    h1: "Loan payment calculator",
    category: "finance",
    tags: ["loans", "amortization", "debt"],
    description: "Calculate the monthly payment on an amortising loan, plus the total interest and a year-by-year amortisation summary.",
    intro: "Enter the amount, interest rate and term to see the level monthly payment and what the loan really costs in interest.",
    currency: true,
    inputs: [
      { key: "amount", label: "Loan amount", type: "number", default: 20000, min: 0, step: 500, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 8, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Term (years)", type: "number", default: 5, min: 0.1, max: 50, step: 1 },
    ],
    run(v, ctx) {
      const months = Math.round(v.years * 12);
      const a = amortization({ principal: v.amount, annualRate: v.rate, months });
      if (a.error) throw new Error(a.error);
      const byYear = new Map();
      for (const row of a.rows) {
        const y = Math.ceil(row.period / 12);
        const acc = byYear.get(y) || { interest: 0, principal: 0, balance: 0 };
        acc.interest += row.interest; acc.principal += row.principal; acc.balance = row.balance;
        byYear.set(y, acc);
      }
      const rows = [...byYear.entries()].map(([y, d]) => [`Year ${y}`, { v: d.principal, format: "currency" }, { v: d.interest, format: "currency" }, { v: d.balance, format: "currency" }]);
      return {
        primary: { label: "Monthly payment", value: loanPayment(v.amount, v.rate / 100 / 12, months), format: "currency" },
        stats: [
          { label: "Total interest", value: a.totalInterest, format: "currency" },
          { label: "Total paid", value: a.totalPaid, format: "currency" },
          { label: "Number of payments", value: a.months, format: "integer" },
        ],
        table: { caption: "Amortisation by year", columns: [{ label: "Year" }, { label: "Principal", align: "right" }, { label: "Interest", align: "right" }, { label: "Balance", align: "right" }], rows },
        steps: [
          `Monthly rate = ${num(v.rate / 100 / 12)}; periods = ${months}.`,
          `Payment = P × r / (1 − (1 + r)^−n) = ${money(a.basePayment, ctx)}.`,
          `Total interest over the life of the loan = ${money(a.totalInterest, ctx)}.`,
        ],
        verdict: `A ${money(v.amount, ctx)} loan at ${num(v.rate)}% over ${num(v.years)} years costs ${money(a.basePayment, ctx)} a month and ${money(a.totalInterest, ctx)} in interest overall.`,
      };
    },
    formula: "PMT = P × r / (1 − (1 + r)^−n)",
    example: ["P = $20,000, r = 8%/12 = 0.0066667, n = 60.", "PMT = 20000 × 0.0066667 / (1 − 1.0066667^−60) = $405.53.", "Total paid = 60 × $405.53 = $24,332, so interest is about $4,332."],
    assumptions: ["Payments are level and made at the end of each month.", "The rate is fixed for the whole term.", "No arrangement fees or insurance are included."],
    faq: [
      { q: "Why is the interest front-loaded?", a: "Interest is charged on the outstanding balance, which is largest at the start, so early payments are mostly interest." },
      { q: "What if I pay extra?", a: "Extra principal payments shorten the term and cut total interest. Use the loan payoff calculator to model that." },
      { q: "Does this include fees?", a: "No. Add arrangement fees to the amount or compare APRs to include them." },
    ],
    related: ["mortgage-payment", "loan-payoff", "credit-card-payoff", "apr"],
  },

  {
    slug: "mortgage-payment",
    title: "Mortgage payment calculator",
    h1: "Mortgage payment calculator",
    category: "finance",
    tags: ["mortgage", "home", "loans"],
    description: "Estimate the full monthly mortgage payment including principal, interest, property tax, insurance and HOA fees.",
    intro: "Work out the principal-and-interest payment and the escrow costs (tax, insurance, HOA) that make up your real monthly housing bill.",
    currency: true,
    inputs: [
      { key: "price", label: "Home price", type: "number", default: 300000, min: 0, step: 5000, unit: "currency" },
      { key: "down", label: "Down payment", type: "number", default: 60000, min: 0, step: 1000, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 6.5, min: 0, max: 30, step: 0.1, unit: "percent" },
      { key: "years", label: "Term (years)", type: "number", default: 30, min: 1, max: 50, step: 1 },
      { key: "taxRate", label: "Property tax", type: "number", default: 1.1, min: 0, max: 20, step: 0.05, unit: "percent", help: "Annual property tax as a percent of home value." },
      { key: "insurance", label: "Home insurance (per year)", type: "number", default: 1200, min: 0, step: 50, unit: "currency" },
      { key: "hoa", label: "HOA / fees (per month)", type: "number", default: 0, min: 0, step: 10, unit: "currency", optional: true },
    ],
    run(v, ctx) {
      const principal = Math.max(0, v.price - v.down);
      if (principal <= 0) throw new Error("The down payment covers the whole price — there is no mortgage.");
      const months = Math.round(v.years * 12);
      const pi = loanPayment(principal, v.rate / 100 / 12, months);
      const tax = (v.price * (v.taxRate / 100)) / 12;
      const ins = v.insurance / 12;
      const total = pi + tax + ins + v.hoa;
      return {
        primary: { label: "Total monthly payment", value: total, format: "currency" },
        stats: [
          { label: "Principal & interest", value: pi, format: "currency" },
          { label: "Property tax", value: tax, format: "currency" },
          { label: "Insurance", value: ins, format: "currency" },
          { label: "Loan amount", value: principal, format: "currency" },
          { label: "Down payment", value: v.price > 0 ? (v.down / v.price) * 100 : NaN, format: "percent" },
        ],
        steps: [
          `Loan = ${money(v.price, ctx)} − ${money(v.down, ctx)} = ${money(principal, ctx)}.`,
          `Principal & interest = ${money(pi, ctx)} a month.`,
          `Add ${money(tax, ctx)} tax, ${money(ins, ctx)} insurance and ${money(v.hoa, ctx)} fees = ${money(total, ctx)}.`,
        ],
        verdict: `The full housing payment is about ${money(total, ctx)} a month, of which ${money(pi, ctx)} pays down the loan.`,
      };
    },
    formula: "Total = P&I + (value × tax%)/12 + insurance/12 + HOA",
    example: ["$300,000 home, $60,000 down, 6.5% over 30 years, 1.1% tax, $1,200 insurance.", "Loan = $240,000; P&I = $1,516.96.", "Tax = $275/mo, insurance = $100/mo, so the total is about $1,891.96."],
    assumptions: ["A fixed rate over the full term.", "Property tax is a flat percent of the purchase price.", "PMI, closing costs and maintenance are not included."],
    faq: [
      { q: "What is included in 'principal and interest'?", a: "Only the repayment of the loan and the interest on it. Tax, insurance and HOA are escrow or additional costs." },
      { q: "Should I put down more?", a: "A larger down payment lowers the loan, the payment and often avoids mortgage insurance, but ties up cash." },
      { q: "Does this include PMI?", a: "No. If your down payment is under 20%, lenders may add mortgage insurance — add it to the HOA/other field." },
    ],
    related: ["loan-payment", "loan-affordability", "amortization", "net-worth"],
  },

  {
    slug: "credit-card-payoff",
    title: "Credit card payoff calculator",
    h1: "Credit card payoff calculator",
    category: "finance",
    tags: ["debt", "credit card", "payoff"],
    description: "See how many months it takes to clear a credit card balance and how much interest you pay along the way.",
    intro: "Credit cards charge interest on the balance you carry. Enter the balance, APR and what you can pay each month to see the payoff time and true cost.",
    currency: true,
    inputs: [
      { key: "balance", label: "Card balance", type: "number", default: 4000, min: 0, step: 100, unit: "currency" },
      { key: "apr", label: "Annual percentage rate (APR)", type: "number", default: 22, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "payment", label: "Monthly payment", type: "number", default: 150, min: 0, step: 10, unit: "currency" },
    ],
    run(v, ctx) {
      const r = v.apr / 100 / 12;
      if (v.balance <= 0) return { primary: { label: "Months to payoff", value: 0, format: "integer" }, stats: [], steps: ["No balance outstanding."], verdict: "Nothing to pay off." };
      if (v.payment <= v.balance * r) throw new Error(`A payment of ${money(v.payment, ctx)} does not cover the ${money(v.balance * r, ctx)} monthly interest, so the balance never clears.`);
      let balance = v.balance, months = 0, interest = 0;
      while (balance > 0.005 && months < 1200) { const i = balance * r; interest += i; balance = balance + i - v.payment; months++; }
      return {
        primary: { label: "Months to payoff", value: months, format: "integer" },
        stats: [
          { label: "Years to payoff", value: months / 12, format: "number" },
          { label: "Total interest", value: interest, format: "currency" },
          { label: "Total paid", value: v.balance + interest, format: "currency" },
        ],
        steps: [
          `Monthly rate = ${num(v.apr / 100 / 12)}.`,
          `Each month interest ${money(balance * r, ctx)} is added before the payment.`,
          `Cleared in ${months} months, paying ${money(interest, ctx)} in interest.`,
        ],
        verdict: `Paying ${money(v.payment, ctx)} a month clears ${money(v.balance, ctx)} in ${months} months and costs ${money(interest, ctx)} in interest.`,
      };
    },
    formula: "Each month: balance = balance × (1 + APR/12) − payment",
    example: ["$4,000 at 22% APR paying $150 a month.", "The monthly rate is 22/12 = 1.833% and interest starts at $73.33.", "The balance clears in about 34 months with roughly $1,048 of interest."],
    assumptions: ["The APR and payment stay constant.", "No new spending is added to the card.", "Payments are made at the end of each month."],
    faq: [
      { q: "Why does a small payment take so long?", a: "When the payment barely exceeds the monthly interest, almost nothing reduces the balance, so the term stretches out." },
      { q: "Does the minimum payment clear the card?", a: "Minimum payments are often 1–3% of the balance and can take years. Use a fixed payment here to see the difference." },
    ],
    related: ["loan-payment", "debt-snowball", "debt-avalanche", "loan-payoff"],
  },

  {
    slug: "debt-snowball",
    title: "Debt snowball calculator",
    h1: "Debt snowball calculator",
    category: "finance",
    tags: ["debt", "payoff", "snowball"],
    description: "Order your debts smallest balance first, roll each cleared payment into the next, and see your debt-free date.",
    intro: "The snowball method pays the smallest balance first for quick wins, then rolls the freed-up payment into the next debt.",
    currency: true,
    inputs: [
      { key: "debts", label: "Your debts", type: "text", default: "Card, 800, 22, 40\nStore card, 1500, 19, 45\nCar loan, 6000, 7, 180", help: "One debt per line: name, balance, APR %, minimum payment." },
      { key: "extra", label: "Extra payment each month", type: "number", default: 100, min: 0, step: 10, unit: "currency" },
    ],
    run(v, ctx) {
      const debts = parseDebts(v.debts);
      if (!debts.length) throw new Error("Add at least one debt, one per line.");
      const res = simulateDebts(debts, v.extra, "balance");
      const rows = res.order.map((d) => [d.name, { v: d.months, format: "integer" }, { v: d.interest, format: "currency" }]);
      return {
        primary: { label: "Debt-free in", value: `${Math.floor(res.months / 12)} yr ${res.months % 12} mo`, format: "text" },
        stats: [
          { label: "Months", value: res.months, format: "integer" },
          { label: "Total interest", value: res.interest, format: "currency" },
          { label: "Total paid", value: res.paid, format: "currency" },
          { label: "Starting balance", value: res.startBalance, format: "currency" },
        ],
        table: { caption: "Order of payoff (smallest balance first)", columns: [{ label: "Debt" }, { label: "Months", align: "right" }, { label: "Interest", align: "right" }], rows },
        steps: [
          `Total minimum payments plus ${money(v.extra, ctx)} extra are paid each month.`,
          `Debts are cleared smallest balance first and each freed payment rolls on.`,
          `Debt-free in ${res.months} months, paying ${money(res.interest, ctx)} in interest.`,
        ],
        verdict: `Snowballing clears everything in ${res.months} months and costs ${money(res.interest, ctx)} in interest. Compare the avalanche method to see if ordering by rate saves money.`,
      };
    },
    formula: "Pay minimums on all debts, throw the surplus at the smallest, then roll it forward.",
    example: ["Card $800 @ 22%, store card $1,500 @ 19%, car $6,000 @ 7%, plus $100 extra.", "The $800 card is cleared first, then its payment joins the attack on the $1,500 card.", "Each cleared debt accelerates the next."],
    assumptions: ["Minimum payments are enough to cover each month's interest.", "No new borrowing.", "Payments are applied at the end of each month."],
    faq: [
      { q: "Snowball or avalanche?", a: "The snowball gives fast psychological wins; the avalanche (highest rate first) usually pays the least interest. Compare both here." },
      { q: "How do I format my debts?", a: "One per line as: name, balance, APR %, minimum payment — for example ‘Card, 800, 22, 40’." },
    ],
    related: ["debt-avalanche", "credit-card-payoff", "loan-payoff"],
  },

  {
    slug: "debt-avalanche",
    title: "Debt avalanche calculator",
    h1: "Debt avalanche calculator",
    category: "finance",
    tags: ["debt", "payoff", "avalanche"],
    description: "Order your debts by interest rate, pay the highest first, and minimise the total interest you pay.",
    intro: "The avalanche method attacks the highest interest rate first. It usually costs the least interest overall.",
    currency: true,
    inputs: [
      { key: "debts", label: "Your debts", type: "text", default: "Card, 800, 22, 40\nStore card, 1500, 19, 45\nCar loan, 6000, 7, 180", help: "One debt per line: name, balance, APR %, minimum payment." },
      { key: "extra", label: "Extra payment each month", type: "number", default: 100, min: 0, step: 10, unit: "currency" },
    ],
    run(v, ctx) {
      const debts = parseDebts(v.debts);
      if (!debts.length) throw new Error("Add at least one debt, one per line.");
      const res = simulateDebts(debts, v.extra, "rate");
      const rows = res.order.map((d) => [d.name, { v: d.months, format: "integer" }, { v: d.interest, format: "currency" }]);
      return {
        primary: { label: "Debt-free in", value: `${Math.floor(res.months / 12)} yr ${res.months % 12} mo`, format: "text" },
        stats: [
          { label: "Months", value: res.months, format: "integer" },
          { label: "Total interest", value: res.interest, format: "currency" },
          { label: "Total paid", value: res.paid, format: "currency" },
          { label: "Starting balance", value: res.startBalance, format: "currency" },
        ],
        table: { caption: "Order of payoff (highest rate first)", columns: [{ label: "Debt" }, { label: "Months", align: "right" }, { label: "Interest", align: "right" }], rows },
        steps: [
          `Total minimums plus ${money(v.extra, ctx)} extra are paid each month.`,
          `Debts are cleared highest rate first and each freed payment rolls on.`,
          `Debt-free in ${res.months} months, paying ${money(res.interest, ctx)} in interest.`,
        ],
        verdict: `Avalanching clears everything in ${res.months} months and costs ${money(res.interest, ctx)} in interest — usually the cheapest ordering.`,
      };
    },
    formula: "Pay minimums on all debts, throw the surplus at the highest rate, then roll it forward.",
    example: ["Same three debts, ordered by rate: 22%, 19%, 7%.", "The 22% card is attacked first because it costs the most per dollar owed.", "Interest saved versus a random order grows with the rate gap."],
    assumptions: ["Minimum payments cover each month's interest.", "No new borrowing.", "Rates stay fixed."],
    faq: [
      { q: "Why might snowball feel better?", a: "Clearing a whole debt sooner gives momentum, even if the avalanche is mathematically cheaper." },
      { q: "How much does the method matter?", a: "The gap is usually small unless one rate is much higher. Compare the two calculators with your own numbers." },
    ],
    related: ["debt-snowball", "credit-card-payoff", "loan-payoff"],
  },

  {
    slug: "roi",
    title: "ROI calculator",
    h1: "Return on investment (ROI) calculator",
    category: "finance",
    tags: ["investing", "return", "roi"],
    description: "Calculate return on investment, profit and annualised return from an initial amount and its final value.",
    intro: "ROI compares the profit from an investment with what it cost. Add the holding period to annualise it.",
    currency: true,
    inputs: [
      { key: "cost", label: "Amount invested", type: "number", default: 10000, min: 0, step: 500, unit: "currency" },
      { key: "value", label: "Final value", type: "number", default: 13500, min: 0, step: 500, unit: "currency" },
      { key: "years", label: "Holding period (years)", type: "number", default: 3, min: 0, step: 0.5, optional: true },
    ],
    run(v, ctx) {
      const profit = v.value - v.cost;
      const pct = roi(profit, v.cost);
      const annual = v.years > 0 && v.cost > 0 && v.value > 0 ? (Math.pow(v.value / v.cost, 1 / v.years) - 1) * 100 : NaN;
      return {
        primary: { label: "Return on investment", value: pct, format: "percent" },
        stats: [
          { label: "Profit", value: profit, format: "currency" },
          { label: "Annualised return", value: annual, format: "percent" },
          { label: "Final value", value: v.value, format: "currency" },
        ],
        steps: [
          `Profit = ${money(v.value, ctx)} − ${money(v.cost, ctx)} = ${money(profit, ctx)}.`,
          `ROI = profit / cost = ${num(pct)}%.`,
          v.years > 0 ? `Annualised = (${money(v.value, ctx)} / ${money(v.cost, ctx)})^(1/${num(v.years)}) − 1 = ${num(annual)}%.` : "Add a holding period to annualise the return.",
        ],
        verdict: `A ${money(v.cost, ctx)} investment returning ${money(v.value, ctx)} is a ${num(pct)}% return (${money(profit, ctx)} profit).`,
      };
    },
    formula: "ROI = (Final value − Cost) / Cost × 100",
    example: ["Invest $10,000; it ends at $13,500 after 3 years.", "Profit = $3,500; ROI = 3500 / 10000 = 35%.", "Annualised = (1.35)^(1/3) − 1 = 10.5% a year."],
    assumptions: ["No cash flows are added or removed during the period.", "Taxes, fees and inflation are not deducted.", "The annualised figure assumes smooth compounding."],
    faq: [
      { q: "Why annualise a return?", a: "A 35% return over 3 years is very different from 35% in one year. Annualising puts investments on the same footing." },
      { q: "Is ROI the same as profit?", a: "No. Profit is an amount; ROI expresses it as a percentage of what you invested." },
      { q: "Does ROI account for risk?", a: "No. Two investments with the same ROI can carry very different risk." },
    ],
    related: ["cagr", "npv", "compound-interest", "crypto-profit"],
  },

  {
    slug: "cagr",
    title: "CAGR calculator",
    h1: "CAGR calculator (compound annual growth rate)",
    category: "finance",
    tags: ["investing", "growth", "return"],
    description: "Calculate the compound annual growth rate between a starting and ending value over a number of years.",
    intro: "CAGR smooths an investment's growth into a single yearly rate, ignoring the bumps along the way.",
    inputs: [
      { key: "begin", label: "Beginning value", type: "number", default: 10000, min: 0, step: 500 },
      { key: "end", label: "Ending value", type: "number", default: 18000, min: 0, step: 500 },
      { key: "years", label: "Number of years", type: "number", default: 5, min: 0.1, step: 0.5 },
    ],
    run(v) {
      const g = cagr(v.begin, v.end, v.years);
      if (!Number.isFinite(g)) throw new Error("Enter a positive beginning value and a positive number of years.");
      const multiple = v.begin > 0 ? v.end / v.begin : NaN;
      return {
        primary: { label: "CAGR", value: g, format: "percent" },
        stats: [
          { label: "Total growth", value: (multiple - 1) * 100, format: "percent" },
          { label: "Growth multiple", value: multiple, format: "number" },
          { label: "Years", value: v.years, format: "number" },
        ],
        steps: [
          `CAGR = (ending / beginning)^(1/years) − 1.`,
          `= (${num(v.end)} / ${num(v.begin)})^(1/${num(v.years)}) − 1 = ${num(g)}%.`,
        ],
        verdict: `Growing from ${num(v.begin)} to ${num(v.end)} in ${num(v.years)} years is a ${num(g)}% compound annual growth rate.`,
      };
    },
    formula: "CAGR = (Ending / Beginning)^(1 / years) − 1",
    example: ["Start at $10,000, end at $18,000 after 5 years.", "Ratio = 1.8; CAGR = 1.8^(1/5) − 1 = 12.47% a year.", "Check: 10000 × 1.1247^5 ≈ $18,000, so the rate reconciles with the endpoints."],
    assumptions: ["Only the two endpoints matter — volatility in between is ignored.", "No contributions or withdrawals.", "No tax or fees."],
    faq: [
      { q: "Is CAGR the actual yearly return?", a: "No. It is the smoothed rate that would take you from the start to the end. Real years vary around it." },
      { q: "Can CAGR be negative?", a: "Yes, if the ending value is below the beginning value the CAGR is negative." },
    ],
    related: ["roi", "compound-interest", "future-value"],
  },

  {
    slug: "npv",
    title: "NPV and IRR calculator",
    h1: "NPV and IRR calculator",
    category: "finance",
    tags: ["investing", "valuation", "npv", "irr"],
    description: "Discount a stream of cash flows to find net present value and the internal rate of return.",
    intro: "NPV asks whether future cash flows are worth more than the money you put in today, once you discount them for time and risk.",
    currency: true,
    inputs: [
      { key: "rate", label: "Discount rate", type: "number", default: 10, min: -50, max: 100, step: 0.1, unit: "percent" },
      { key: "initial", label: "Initial investment (today)", type: "number", default: 10000, min: 0, step: 500, unit: "currency" },
      { key: "flows", label: "Cash flows per year", type: "text", default: "3000, 3200, 3400, 3600, 3800", help: "Comma- or space-separated: one value per year, starting next year." },
    ],
    run(v, ctx) {
      const flows = String(v.flows).split(/[\s,;]+/).map(Number).filter(Number.isFinite);
      if (!flows.length) throw new Error("Enter at least one cash flow.");
      const series = [-v.initial, ...flows];
      const value = npv(v.rate, series);
      const rate = irr(series);
      const undiscounted = flows.reduce((s, x) => s + x, 0);
      return {
        primary: { label: "Net present value", value, format: "currency" },
        stats: [
          { label: "Internal rate of return (IRR)", value: Number.isFinite(rate) ? rate : NaN, format: "percent" },
          { label: "Total cash returned", value: undiscounted, format: "currency" },
          { label: "Net profit (undiscounted)", value: undiscounted - v.initial, format: "currency" },
        ],
        steps: [
          `Discount ${flows.length} yearly cash flows at ${num(v.rate)}%.`,
          `NPV = Σ CFₜ / (1 + r)ᵗ = ${money(value, ctx)}.`,
          Number.isFinite(rate) ? `The IRR (where NPV = 0) is ${num(rate)}%.` : "No single IRR sign change was found.",
        ],
        verdict: value > 0 ? `At a ${num(v.rate)}% discount rate the project adds ${money(value, ctx)} of value — accept it on this basis.` : `At a ${num(v.rate)}% discount rate the project destroys ${money(Math.abs(value), ctx)} of value.`,
      };
    },
    formula: "NPV = Σ [ CFₜ / (1 + r)ᵗ ] − Initial",
    example: ["Invest $10,000 now; receive $3,000…$3,800 over five years.", "Discounting the five flows at 10% makes them worth about $12,745 today.", "NPV ≈ $2,745 and the IRR is roughly 19%."],
    assumptions: ["Cash flows arrive at the end of each year.", "One discount rate applies to every period.", "The discount rate is your required return or cost of capital."],
    faq: [
      { q: "NPV or IRR?", a: "NPV gives an absolute value and is usually preferred for choosing between projects; IRR gives a percentage that is easy to compare with a hurdle rate." },
      { q: "What discount rate should I use?", a: "Use your cost of capital or the return you could get elsewhere for similar risk." },
      { q: "Why does IRR sometimes fail?", a: "If cash flows change sign more than once, an IRR may not exist or there may be several — NPV is safer then." },
    ],
    related: ["roi", "cagr", "present-value"],
  },

  {
    slug: "inflation",
    title: "Inflation calculator",
    h1: "Inflation and purchasing-power calculator",
    category: "finance",
    tags: ["inflation", "money", "planning"],
    description: "See how inflation changes the cost of something over time and what today's money will be worth in the future.",
    intro: "Inflation erodes purchasing power. See what a future cost looks like and what today's money will buy later.",
    currency: true,
    inputs: [
      { key: "amount", label: "Amount today", type: "number", default: 1000, min: 0, step: 100, unit: "currency" },
      { key: "rate", label: "Average annual inflation", type: "number", default: 3, min: -20, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Years", type: "number", default: 10, min: 0, step: 1 },
    ],
    run(v, ctx) {
      const factor = Math.pow(1 + v.rate / 100, v.years);
      const futureCost = v.amount * factor;
      const futureValue = v.amount / factor;
      return {
        primary: { label: `Cost of the same goods in ${num(v.years)} years`, value: futureCost, format: "currency" },
        stats: [
          { label: "Purchasing power of today's amount", value: futureValue, format: "currency" },
          { label: "Cumulative inflation", value: (factor - 1) * 100, format: "percent" },
          { label: "Price increase", value: futureCost - v.amount, format: "currency" },
        ],
        steps: [
          `Inflation factor = (1 + ${num(v.rate / 100)})^${num(v.years)} = ${num(factor)}.`,
          `Something costing ${money(v.amount, ctx)} today costs ${money(futureCost, ctx)} later.`,
          `${money(v.amount, ctx)} left idle is worth only ${money(futureValue, ctx)} in today's terms.`,
        ],
        verdict: `At ${num(v.rate)}% inflation, ${money(v.amount, ctx)} today needs to become ${money(futureCost, ctx)} to buy the same things in ${num(v.years)} years.`,
      };
    },
    formula: "Future cost = Amount × (1 + i)^t   ·   Real value = Amount / (1 + i)^t",
    example: ["$1,000 at 3% inflation for 10 years.", "Factor = 1.03^10 = 1.3439.", "The same basket costs $1,343.92; today's $1,000 will only buy $743.99 of it."],
    assumptions: ["A single constant inflation rate.", "The same basket of goods throughout.", "No change in taxes or interest rates."],
    faq: [
      { q: "Why does cash lose value?", a: "If prices rise faster than the interest cash earns, the same amount of cash buys less each year." },
      { q: "Is my country's inflation the same?", a: "No. Enter the rate that matches your currency and economy — official statistics publish monthly figures." },
    ],
    related: ["future-value", "present-value", "compound-interest"],
  },

  {
    slug: "future-value",
    title: "Future value calculator",
    h1: "Future value calculator",
    category: "finance",
    tags: ["investing", "time value of money"],
    description: "Find the future value of a lump sum given an interest rate, term and compounding frequency.",
    intro: "Future value takes a present amount and projects what it becomes once interest or growth is applied for a number of years.",
    currency: true,
    inputs: [
      { key: "pv", label: "Present value", type: "number", default: 10000, min: 0, step: 500, unit: "currency" },
      { key: "rate", label: "Annual rate", type: "number", default: 7, min: -50, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Years", type: "number", default: 10, min: 0, step: 1 },
      { key: "compound", label: "Compounding", type: "select", default: "annually", options: [{ value: "annually", label: "Annually" }, { value: "quarterly", label: "Quarterly" }, { value: "monthly", label: "Monthly" }] },
    ],
    run(v, ctx) {
      const perYear = COMPOUNDING[v.compound] || 1;
      const fv = futureValue(v.pv, v.rate, v.years, perYear);
      return {
        primary: { label: "Future value", value: fv, format: "currency" },
        stats: [
          { label: "Growth", value: fv - v.pv, format: "currency" },
          { label: "Total return", value: v.pv > 0 ? ((fv / v.pv) - 1) * 100 : NaN, format: "percent" },
        ],
        steps: [
          `FV = PV × (1 + r/n)^(n t) with n = ${perYear}.`,
          `= ${money(v.pv, ctx)} × (1 + ${num(v.rate / 100 / perYear)})^${perYear * v.years} = ${money(fv, ctx)}.`,
        ],
        verdict: `${money(v.pv, ctx)} at ${num(v.rate)}% for ${num(v.years)} years grows to ${money(fv, ctx)}.`,
      };
    },
    formula: "FV = PV × (1 + r/n)^(n t)",
    example: ["PV = $10,000, r = 7%, t = 10 years, annual compounding.", "FV = 10000 × 1.07^10 = $19,671.51.", "Switch to monthly compounding and the same inputs give 10000 × (1 + 0.07/12)^120 ≈ $20,097."],
    assumptions: ["A constant rate.", "No contributions or withdrawals.", "Compounding is regular."],
    faq: [
      { q: "How is this different from compound interest?", a: "They are the same idea. This calculator is the pure lump-sum case without regular contributions." },
      { q: "Can the rate be negative?", a: "Yes — a negative rate models deflation or a loss and gives a future value below the present value." },
    ],
    related: ["present-value", "compound-interest", "inflation"],
  },

  {
    slug: "present-value",
    title: "Present value calculator",
    h1: "Present value calculator",
    category: "finance",
    tags: ["investing", "discounting", "time value of money"],
    description: "Discount a future amount back to today's value using an interest or discount rate.",
    intro: "Present value answers: what is a future sum worth today, once you account for the return it could earn?",
    currency: true,
    inputs: [
      { key: "fv", label: "Future value", type: "number", default: 20000, min: 0, step: 500, unit: "currency" },
      { key: "rate", label: "Annual rate", type: "number", default: 7, min: -50, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Years", type: "number", default: 10, min: 0, step: 1 },
      { key: "compound", label: "Compounding", type: "select", default: "annually", options: [{ value: "annually", label: "Annually" }, { value: "quarterly", label: "Quarterly" }, { value: "monthly", label: "Monthly" }] },
    ],
    run(v, ctx) {
      const perYear = COMPOUNDING[v.compound] || 1;
      const pv = presentValue(v.fv, v.rate, v.years, perYear);
      return {
        primary: { label: "Present value", value: pv, format: "currency" },
        stats: [
          { label: "Discount", value: v.fv - pv, format: "currency" },
          { label: "Discount rate", value: v.rate, format: "percent" },
        ],
        steps: [
          `PV = FV / (1 + r/n)^(n t) with n = ${perYear}.`,
          `= ${money(v.fv, ctx)} / (1 + ${num(v.rate / 100 / perYear)})^${perYear * v.years} = ${money(pv, ctx)}.`,
        ],
        verdict: `${money(v.fv, ctx)} in ${num(v.years)} years is worth ${money(pv, ctx)} today at a ${num(v.rate)}% discount rate.`,
      };
    },
    formula: "PV = FV / (1 + r/n)^(n t)",
    example: ["FV = $20,000 in 10 years at a 7% discount rate.", "PV = 20000 / 1.07^10 = $10,166.99.", "With monthly compounding the figure is a little lower: 20000 / (1 + 0.07/12)^120 ≈ $9,952."],
    assumptions: ["A constant discount rate.", "The future amount is certain.", "No tax on the return."],
    faq: [
      { q: "What does the discount rate represent?", a: "The return you could earn elsewhere, or the rate that reflects the risk of not receiving the money." },
      { q: "Why is present value lower than future value?", a: "Money today can be invested, so a future sum must be discounted to compare it fairly." },
    ],
    related: ["future-value", "npv", "inflation"],
  },

  {
    slug: "dti",
    title: "Debt-to-income ratio calculator",
    h1: "Debt-to-income (DTI) calculator",
    category: "finance",
    tags: ["debt", "mortgage", "credit"],
    description: "Calculate your debt-to-income ratio and see how lenders are likely to view it.",
    intro: "DTI compares your monthly debt payments with your gross monthly income. Lenders use it to judge how much you can borrow.",
    currency: true,
    inputs: [
      { key: "income", label: "Gross monthly income", type: "number", default: 6000, min: 0, step: 100, unit: "currency" },
      { key: "housing", label: "Housing payment", type: "number", default: 1600, min: 0, step: 50, unit: "currency" },
      { key: "debts", label: "Other monthly debt payments", type: "number", default: 700, min: 0, step: 50, unit: "currency" },
    ],
    run(v, ctx) {
      if (v.income <= 0) throw new Error("Enter your gross monthly income.");
      const total = v.housing + v.debts;
      const dti = (total / v.income) * 100;
      const front = (v.housing / v.income) * 100;
      const band = dti <= 36 ? "Healthy" : dti <= 43 ? "Acceptable" : dti <= 50 ? "Stretched" : "High risk";
      return {
        primary: { label: "Debt-to-income ratio", value: dti, format: "percent" },
        stats: [
          { label: "Total monthly debt", value: total, format: "currency" },
          { label: "Housing ratio (front-end)", value: front, format: "percent" },
          { label: "Assessment", value: band, format: "text" },
        ],
        steps: [
          `Total debt = ${money(v.housing, ctx)} + ${money(v.debts, ctx)} = ${money(total, ctx)}.`,
          `DTI = ${money(total, ctx)} / ${money(v.income, ctx)} = ${num(dti)}%.`,
        ],
        verdict: `A DTI of ${num(dti)}% is generally considered ${band.toLowerCase()}; many lenders prefer 36% or less, and 43% is a common ceiling for qualified mortgages.`,
      };
    },
    formula: "DTI = (Total monthly debt payments / Gross monthly income) × 100",
    example: ["Income $6,000; housing $1,600; other debts $700.", "Total = $2,300; DTI = 2300 / 6000 = 38.3%.", "That sits in the 'acceptable' band for many lenders."],
    assumptions: ["Gross (pre-tax) income is used, as lenders typically do.", "All listed payments are minimums.", "Lender thresholds vary by country and product."],
    faq: [
      { q: "What counts as debt?", a: "Mortgage or rent, car loans, student loans, credit card minimums and personal loans. Utilities are usually excluded." },
      { q: "Is a low DTI always good?", a: "It helps you qualify, but it does not measure your savings or emergency buffer." },
    ],
    related: ["mortgage-payment", "loan-payment", "loan-affordability"],
  },

  {
    slug: "loan-payoff",
    title: "Loan payoff calculator",
    h1: "Loan payoff calculator",
    category: "finance",
    tags: ["loans", "debt", "extra payments"],
    description: "See how much time and interest extra monthly payments save on your loan.",
    intro: "Adding a little to every payment attacks the principal directly. Compare the scheduled payoff with a plan that pays extra.",
    currency: true,
    inputs: [
      { key: "amount", label: "Loan amount", type: "number", default: 20000, min: 0, step: 500, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 8, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Term (years)", type: "number", default: 5, min: 0.1, max: 50, step: 1 },
      { key: "extra", label: "Extra each month", type: "number", default: 100, min: 0, step: 10, unit: "currency" },
    ],
    run(v, ctx) {
      const months = Math.round(v.years * 12);
      const base = amortization({ principal: v.amount, annualRate: v.rate, months });
      if (base.error) throw new Error(base.error);
      const withExtra = amortization({ principal: v.amount, annualRate: v.rate, months, extra: v.extra });
      const monthsSaved = base.months - withExtra.months;
      const interestSaved = base.totalInterest - withExtra.totalInterest;
      return {
        primary: { label: "Interest saved", value: interestSaved, format: "currency" },
        stats: [
          { label: "Months saved", value: monthsSaved, format: "integer" },
          { label: "Payoff time (with extra)", value: `${Math.floor(withExtra.months / 12)} yr ${withExtra.months % 12} mo`, format: "text" },
          { label: "Interest with extra", value: withExtra.totalInterest, format: "currency" },
          { label: "Interest without extra", value: base.totalInterest, format: "currency" },
        ],
        steps: [
          `Scheduled payment = ${money(base.basePayment, ctx)}; with extra you pay ${money(base.basePayment + v.extra, ctx)}.`,
          `The loan clears in ${withExtra.months} months instead of ${base.months}.`,
          `That saves ${money(interestSaved, ctx)} in interest.`,
        ],
        verdict: `Paying ${money(v.extra, ctx)} extra a month clears the loan ${Math.floor(monthsSaved / 12)} yr ${monthsSaved % 12} mo sooner and saves ${money(interestSaved, ctx)}.`,
      };
    },
    formula: "Same amortisation, with payment = PMT + extra applied entirely to principal",
    example: ["$20,000 at 8% over 5 years, paying $100 extra a month.", "Scheduled payment is $405.53; paying $505.53 shortens the term by about 8 months.", "Total interest falls by roughly $500."],
    assumptions: ["The lender applies extra payments straight to principal with no penalty.", "The rate is fixed.", "No prepayment fees."],
    faq: [
      { q: "Should I pay extra or invest?", a: "Compare the loan rate with the after-tax return you expect. Paying a 20% card is a guaranteed 20% saving; a 3% mortgage is often beaten elsewhere." },
      { q: "Does the extra go to interest first?", a: "With most lenders an explicitly-labelled principal payment goes to principal, which is what this calculator assumes." },
    ],
    related: ["loan-payment", "amortization", "credit-card-payoff"],
  },

  {
    slug: "amortization",
    title: "Amortization schedule calculator",
    h1: "Amortization schedule calculator",
    category: "finance",
    tags: ["loans", "amortization", "schedule"],
    description: "Generate a full monthly amortization schedule showing interest, principal and balance for every payment.",
    intro: "An amortization schedule breaks a loan into every payment: how much is interest, how much reduces the balance, and what is left.",
    currency: true,
    inputs: [
      { key: "amount", label: "Loan amount", type: "number", default: 250000, min: 0, step: 5000, unit: "currency" },
      { key: "rate", label: "Annual interest rate", type: "number", default: 6, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Term (years)", type: "number", default: 30, min: 0.1, max: 50, step: 1 },
      { key: "extra", label: "Extra each month", type: "number", default: 0, min: 0, step: 10, unit: "currency", optional: true },
    ],
    run(v, ctx) {
      const months = Math.round(v.years * 12);
      const a = amortization({ principal: v.amount, annualRate: v.rate, months, extra: v.extra });
      if (a.error) throw new Error(a.error);
      const rows = a.rows.map((row) => [
        { v: a.rows.indexOf(row) + 1, format: "integer" },
        { v: row.payment, format: "currency" },
        { v: row.interest, format: "currency" },
        { v: row.principal, format: "currency" },
        { v: Math.max(0, row.balance), format: "currency" },
      ]);
      return {
        primary: { label: "Monthly payment", value: a.basePayment + v.extra, format: "currency" },
        stats: [
          { label: "Total interest", value: a.totalInterest, format: "currency" },
          { label: "Total paid", value: a.totalPaid, format: "currency" },
          { label: "Payments", value: a.months, format: "integer" },
        ],
        table: { caption: "Monthly amortization schedule", columns: [{ label: "#" }, { label: "Payment", align: "right" }, { label: "Interest", align: "right" }, { label: "Principal", align: "right" }, { label: "Balance", align: "right" }], rows },
        steps: [`Monthly rate = ${num(v.rate / 100 / 12)} over ${months} payments.`, `Level payment = ${money(a.basePayment, ctx)}.`, `Total interest = ${money(a.totalInterest, ctx)}.`],
        verdict: `Every payment is ${money(a.basePayment + (v.extra || 0), ctx)}; across ${a.months} payments you hand over ${money(a.totalPaid, ctx)} of which ${money(a.totalInterest, ctx)} is interest.`,
      };
    },
    formula: "Interest each month = balance × r/12; principal = payment − interest; balance ↓",
    example: ["$250,000 at 6% over 30 years.", "Monthly rate 0.5%; payment $1,498.88.", "The first payment is $1,250 interest and $248.88 principal; the last is almost all principal."],
    assumptions: ["Fixed rate, level payments, monthly compounding.", "Payments at the end of each month.", "Extra payments reduce principal immediately."],
    faq: [
      { q: "Why does the schedule change over time?", a: "As the balance falls, the interest portion shrinks and more of each payment goes to principal." },
      { q: "What is a balloon payment?", a: "A large lump sum due at the end, common on interest-only or short-term commercial loans — not modelled here." },
    ],
    related: ["loan-payment", "mortgage-payment", "loan-payoff"],
  },

  {
    slug: "apr",
    title: "APR calculator",
    h1: "APR calculator",
    category: "finance",
    tags: ["loans", "apr", "fees"],
    description: "Estimate the annual percentage rate on a loan once arrangement fees are included.",
    intro: "The interest rate ignores fees; the APR folds them in, so it is the honest number to compare loans by.",
    currency: true,
    inputs: [
      { key: "amount", label: "Loan amount", type: "number", default: 20000, min: 0, step: 500, unit: "currency" },
      { key: "rate", label: "Nominal interest rate", type: "number", default: 7, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "years", label: "Term (years)", type: "number", default: 5, min: 0.1, max: 50, step: 1 },
      { key: "fees", label: "Upfront fees", type: "number", default: 500, min: 0, step: 50, unit: "currency" },
    ],
    run(v, ctx) {
      const months = Math.round(v.years * 12);
      const r = v.rate / 100 / 12;
      const payment = loanPayment(v.amount, r, months);
      if (!Number.isFinite(payment)) throw new Error("Enter a positive term.");
      const net = v.amount - v.fees;
      if (net <= 0) throw new Error("Fees cannot equal or exceed the loan amount.");
      const pvOf = (rate) => (rate === 0 ? payment * months : (payment * (1 - Math.pow(1 + rate, -months))) / rate);
      let lo = 0, hi = 1;
      for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (pvOf(mid) > net) lo = mid; else hi = mid; }
      const apr = ((lo + hi) / 2) * 12 * 100;
      return {
        primary: { label: "Estimated APR", value: apr, format: "percent" },
        stats: [
          { label: "Monthly payment", value: payment, format: "currency" },
          { label: "Nominal rate", value: v.rate, format: "percent" },
          { label: "Cost of fees", value: v.fees, format: "currency" },
          { label: "APR − nominal", value: apr - v.rate, format: "percent" },
        ],
        steps: [
          `Payment on ${money(v.amount, ctx)} at ${num(v.rate)}% = ${money(payment, ctx)}.`,
          `You actually receive ${money(net, ctx)} after fees.`,
          `The rate that makes those payments worth ${money(net, ctx)} is solved numerically to give an APR of ${num(apr)}%.`,
        ],
        verdict: `With ${money(v.fees, ctx)} of fees the true annual cost is about ${num(apr)}%, higher than the headline ${num(v.rate)}%.`,
      };
    },
    formula: "APR is the rate r where PV(payments at r) = amount − fees. Solved numerically.",
    example: ["Borrow $20,000 at 7% over 5 years with $500 fees.", "Payment = $396.02; you actually receive $19,500.", "The rate that equates those payments to $19,500 is about 7.6% APR."],
    assumptions: ["Fees are paid upfront and reduce the amount you receive.", "No ongoing fees.", "Solved by bisection to high precision."],
    faq: [
      { q: "Why is APR higher than the interest rate?", a: "Fees add cost without adding borrowing power, so the effective annual rate rises." },
      { q: "Is APR the same everywhere?", a: "No — jurisdictions define APR differently and some include insurance or compulsory charges." },
    ],
    related: ["loan-payment", "loan-payoff", "credit-card-payoff"],
  },

  {
    slug: "loan-affordability",
    title: "Loan affordability calculator",
    h1: "How much can I borrow? (loan affordability)",
    category: "finance",
    tags: ["loans", "mortgage", "budget"],
    description: "Work out the maximum loan you can afford from your income, debts, a target debt-to-income ratio, rate and term.",
    intro: "Lenders cap how much of your income can go to debt. Enter your income and a target ratio to estimate your borrowing ceiling.",
    currency: true,
    inputs: [
      { key: "income", label: "Gross monthly income", type: "number", default: 6000, min: 0, step: 100, unit: "currency" },
      { key: "debts", label: "Existing monthly debt payments", type: "number", default: 500, min: 0, step: 50, unit: "currency" },
      { key: "dti", label: "Target debt-to-income ratio", type: "number", default: 36, min: 1, max: 60, step: 1, unit: "percent" },
      { key: "rate", label: "Expected interest rate", type: "number", default: 7, min: 0, max: 40, step: 0.1, unit: "percent" },
      { key: "years", label: "Term (years)", type: "number", default: 25, min: 1, max: 50, step: 1 },
    ],
    run(v, ctx) {
      const maxPayment = v.income * (v.dti / 100) - v.debts;
      if (maxPayment <= 0) throw new Error("Your existing debts already meet the target ratio, so there is no room for a new loan payment.");
      const r = v.rate / 100 / 12;
      const months = Math.round(v.years * 12);
      const maxLoan = r === 0 ? maxPayment * months : (maxPayment * (1 - Math.pow(1 + r, -months))) / r;
      return {
        primary: { label: "Estimated maximum loan", value: maxLoan, format: "currency" },
        stats: [
          { label: "Maximum monthly payment", value: maxPayment, format: "currency" },
          { label: "Payments", value: months, format: "integer" },
          { label: "Total repaid", value: maxPayment * months, format: "currency" },
          { label: "Total interest", value: maxPayment * months - maxLoan, format: "currency" },
        ],
        steps: [
          `Allowable debt = ${num(v.dti)}% × ${money(v.income, ctx)} = ${money((v.income * v.dti) / 100, ctx)}.`,
          `Minus existing debts of ${money(v.debts, ctx)} leaves ${money(maxPayment, ctx)} a month.`,
          `Over ${months} months at ${num(v.rate)}% that supports a loan of ${money(maxLoan, ctx)}.`,
        ],
        verdict: `On ${money(v.income, ctx)} a month with ${money(v.debts, ctx)} of other debts, a ${num(v.dti)}% ceiling supports roughly ${money(maxLoan, ctx)} of borrowing.`,
      };
    },
    formula: "Max loan = PMT × (1 − (1 + r)^−n) / r",
    example: ["Income $6,000, debts $500, target 36%, 6% over 30 years.", "Max payment = 0.36 × 6000 − 500 = $1,660.", "That supports a loan of about $276,800."],
    assumptions: ["A target debt-to-income ratio stands in for a lender's own rules.", "Rates and income are fixed.", "Taxes, insurance and fees are excluded."],
    faq: [
      { q: "Is the borrowing ceiling a promise?", a: "No. It is an estimate from your chosen ratio; real lenders also weigh credit history, deposits and policy." },
      { q: "What ratio should I use?", a: "Many lenders prefer total debt below 36% of gross income, with housing under 28%." },
    ],
    related: ["mortgage-payment", "loan-payment", "dti"],
  },

  {
    slug: "emergency-fund",
    title: "Emergency fund calculator",
    h1: "Emergency fund calculator",
    category: "finance",
    tags: ["savings", "planning", "safety net"],
    description: "Work out how big your emergency fund should be and how long it takes to build.",
    intro: "An emergency fund covers essential spending if income stops. See a target for 3, 6 and 12 months, and how long it takes to save.",
    currency: true,
    inputs: [
      { key: "expenses", label: "Essential monthly expenses", type: "number", default: 2500, min: 0, step: 100, unit: "currency" },
      { key: "months", label: "Months of cover wanted", type: "number", default: 6, min: 1, max: 24, step: 1 },
      { key: "saved", label: "Already saved", type: "number", default: 1000, min: 0, step: 100, unit: "currency" },
      { key: "monthly", label: "Monthly saving toward it", type: "number", default: 400, min: 0, step: 50, unit: "currency" },
    ],
    run(v, ctx) {
      const target = v.expenses * v.months;
      const remaining = Math.max(0, target - v.saved);
      const months = v.monthly > 0 ? Math.ceil(remaining / v.monthly) : Infinity;
      return {
        primary: { label: "Emergency fund target", value: target, format: "currency" },
        stats: [
          { label: "Still to save", value: remaining, format: "currency" },
          { label: "Time to target", value: Number.isFinite(months) ? `${Math.floor(months / 12)} yr ${months % 12} mo` : "Add a monthly saving", format: "text" },
          { label: "3 months of cover", value: v.expenses * 3, format: "currency" },
          { label: "12 months of cover", value: v.expenses * 12, format: "currency" },
        ],
        steps: [
          `Target = ${money(v.expenses, ctx)} × ${num(v.months)} months = ${money(target, ctx)}.`,
          remaining > 0 ? `Save ${money(v.monthly, ctx)} a month to close ${money(remaining, ctx)} in ${months} months.` : "You already have full cover.",
        ],
        verdict: `Aim for ${money(target, ctx)} — about ${num(v.months)} months of essential spending — kept somewhere safe and easy to reach.`,
      };
    },
    formula: "Target = Essential monthly expenses × Months of cover",
    example: ["$2,500 of essential spending a month, 6 months of cover, $1,000 saved, saving $400/mo.", "Target = $15,000; remaining = $14,000.", "That takes 35 months at $400 a month."],
    assumptions: ["Expenses are your essentials, not your full lifestyle.", "No interest is modelled (keep this money liquid).", "Savings are regular."],
    faq: [
      { q: "How many months do I need?", a: "Three months for stable salaried work; six or more for freelancers, single-income households or volatile sectors." },
      { q: "Where should I keep it?", a: "Somewhere safe and instantly accessible — a separate savings account rather than investments you might have to sell at a loss." },
    ],
    related: ["savings-goal", "net-worth", "dti"],
  },

  {
    slug: "net-worth",
    title: "Net worth calculator",
    h1: "Net worth calculator",
    category: "finance",
    tags: ["net worth", "assets", "debt"],
    description: "Add up your assets and liabilities to find your net worth and your debt-to-asset ratio.",
    intro: "Net worth is everything you own minus everything you owe. Track it over time to see whether your finances are moving forward.",
    currency: true,
    inputs: [
      { key: "assets", label: "Total assets", type: "number", default: 50000, min: 0, step: 1000, unit: "currency", help: "Cash, savings, investments, property, valuables." },
      { key: "liabilities", label: "Total liabilities", type: "number", default: 20000, min: 0, step: 1000, unit: "currency", help: "Mortgage, loans, card balances, other debts." },
    ],
    run(v, ctx) {
      const net = v.assets - v.liabilities;
      return {
        primary: { label: "Net worth", value: net, format: "currency" },
        stats: [
          { label: "Total assets", value: v.assets, format: "currency" },
          { label: "Total liabilities", value: v.liabilities, format: "currency" },
          { label: "Debt-to-asset ratio", value: v.assets > 0 ? (v.liabilities / v.assets) * 100 : NaN, format: "percent" },
          { label: "Assets per unit of debt", value: v.liabilities > 0 ? v.assets / v.liabilities : NaN, format: "number" },
        ],
        steps: [`Net worth = ${money(v.assets, ctx)} − ${money(v.liabilities, ctx)}.`, `= ${money(net, ctx)}.`],
        verdict: net >= 0 ? `You own more than you owe: net worth is ${money(net, ctx)}.` : `Liabilities exceed assets by ${money(Math.abs(net), ctx)} — focus on reducing debt.`,
      };
    },
    formula: "Net worth = Total assets − Total liabilities",
    example: ["Assets $50,000, liabilities $20,000.", "Net worth = $30,000.", "Debt is 40% of assets, so there is a healthy buffer."],
    assumptions: ["Assets are entered at a realistic current value.", "Included only what you could convert or owe.", "Not a valuation of pensions you cannot access."],
    faq: [
      { q: "What counts as an asset?", a: "Anything with resale value you own: cash, deposits, investments, property, vehicles and valuable items." },
      { q: "Should I include my car?", a: "Include it at its current resale value, and only include the loan in liabilities — never the full purchase price." },
    ],
    related: ["emergency-fund", "dti", "roi"],
  },
];

// ---------------------------------------------------------------- shared helpers
/** Parse "name, balance, apr, minPayment" lines into debt objects. */
export function parseDebts(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;]\s*/);
      const name = (parts[0] || "Debt").trim() || "Debt";
      const balance = Number(parts[1]) || 0;
      const rate = Number(parts[2]) || 0;
      const min = Number(parts[3]) || 0;
      return { name, balance, rate, min };
    })
    .filter((d) => d.balance > 0);
}

/**
 * Simulate the debt rollover method.
 * @param {Array} debts
 * @param {number} extra      extra amount paid on top of the minimums
 * @param {"balance"|"rate"} order  ordering strategy
 */
export function simulateDebts(debts, extra, order) {
  const list = debts.map((d) => ({ ...d }));
  const startBalance = list.reduce((s, d) => s + d.balance, 0);
  const minTotal = list.reduce((s, d) => s + d.min, 0);
  const budget = minTotal + Math.max(0, extra);
  if (budget <= 0) throw new Error("Minimum payments and the extra amount cannot both be zero.");
  let interest = 0, months = 0;
  const perDebt = new Map(list.map((d) => [d.name, { interest: 0, months: 0 }]));
  while (list.some((d) => d.balance > 0.005) && months < 1200) {
    months++;
    let pool = budget;
    // 1) accrue interest and pay minimums
    for (const d of list) {
      if (d.balance <= 0) continue;
      const i = d.balance * (d.rate / 100 / 12);
      d.balance += i; interest += i; perDebt.get(d.name).interest += i;
    }
    for (const d of list) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.min, d.balance, pool);
      d.balance -= pay; pool -= pay;
    }
    // 2) throw the rest at the target debt
    const remaining = list.filter((d) => d.balance > 0.005);
    remaining.sort((a, b) => (order === "rate" ? b.rate - a.rate : a.balance - b.balance));
    for (const d of remaining) {
      if (pool <= 0) break;
      const pay = Math.min(pool, d.balance);
      d.balance -= pay; pool -= pay;
    }
    for (const d of list) if (d.balance <= 0.005 && perDebt.get(d.name).months === 0) perDebt.get(d.name).months = months;
  }
  return {
    months, interest,
    paid: startBalance + interest,
    startBalance,
    order: list.map((d) => ({ name: d.name, months: perDebt.get(d.name).months, interest: perDebt.get(d.name).interest })),
  };
}
