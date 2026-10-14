// Trading, forex and cryptocurrency calculators.
// Same schema and result shape as the finance reference module (see js/calc/catalog.js).
// Educational tools only — none of this is financial advice, and profits are never guaranteed.

import {
  pipValue, positionSize, liquidationPrice, tradePnl, dca, marketCap, parseSeries,
} from "../math.js";
import { formatCurrency, formatNumber, round } from "../format.js";

const money = (v, ctx) => formatCurrency(v, ctx.currency);
const num = (v) => formatNumber(v);

export const TRADING = [
  {
    slug: "forex-pip-value",
    title: "Forex pip value calculator",
    h1: "Forex pip value calculator",
    category: "trading",
    tags: ["forex", "pip", "lots", "currency"],
    description: "Calculate the value of one pip in your account currency for any forex pair, contract size and number of lots, in standard or fractional pips.",
    intro: "A pip value tells you what each price step is worth in your own currency. Enter the pip size, contract size and lots to convert a move into money.",
    currency: true,
    inputs: [
      {
        key: "pipSize", label: "Pip size", type: "select", default: "0.0001",
        options: [
          { value: "0.0001", label: "0.0001 — standard pairs" },
          { value: "0.01", label: "0.01 — JPY pairs" },
          { value: "0.00001", label: "0.00001 — fractional pip" },
        ],
        help: "The price increment one pip represents for the pair you trade.",
      },
      { key: "contractSize", label: "Contract size (units per lot)", type: "number", default: 100000, min: 1, step: 1000, help: "A standard lot is 100,000 units; mini is 10,000 and micro is 1,000." },
      { key: "lots", label: "Number of lots", type: "number", default: 1, min: 0, step: 0.01 },
      { key: "quoteToAccountRate", label: "Quote-to-account rate", type: "number", default: 1, min: 0, step: 0.0001, help: "Price of 1 unit of the quote currency in your account currency." },
    ],
    run(v, ctx) {
      const pipSize = Number(v.pipSize);
      const contractSize = Number(v.contractSize);
      const lots = Number(v.lots);
      const rate = Number(v.quoteToAccountRate);
      if (!(pipSize > 0)) throw new Error("Choose a positive pip size.");
      if (!(contractSize > 0)) throw new Error("Contract size must be greater than zero.");
      if (!(lots > 0)) throw new Error("Enter at least one lot to trade.");
      if (!(rate > 0)) throw new Error("The quote-to-account rate must be greater than zero.");
      const pipQuote = pipValue({ pipSize, contractSize, lots });
      const value = pipQuote * rate;
      const perLot = pipValue({ pipSize, contractSize, lots: 1 }) * rate;
      const units = contractSize * lots;
      return {
        primary: { label: "Value per pip", value, format: "currency" },
        stats: [
          { label: "Value per pip per lot", value: perLot, format: "currency" },
          { label: "Value per point (1/10 pip)", value: value / 10, format: "currency" },
          { label: "Position size", value: units, format: "number", hint: "Units of the base currency" },
          { label: "Quote-to-account rate", value: rate, format: "number" },
        ],
        steps: [
          `One pip is a ${num(pipSize)} move in the quote currency.`,
          `Pip value in the quote currency = ${num(pipSize)} × ${num(contractSize)} × ${num(lots)} = ${num(pipQuote)}.`,
          `Converted at ${num(rate)} that is ${money(value, ctx)} per pip in your account currency.`,
        ],
        verdict: `Each pip on ${num(lots)} lot${lots === 1 ? "" : "s"} is worth about ${money(value, ctx)}. A 50-pip move is roughly ${money(value * 50, ctx)} before spread, commission and slippage.`,
      };
    },
    formula: "Pip value = pip size × contract size × lots × quote-to-account rate",
    example: [
      "Standard lot: pip size 0.0001, contract size 100,000, 1 lot, quote-to-account rate 1.",
      "Value per pip = 0.0001 × 100,000 × 1 × 1 = $10.00.",
      "With 0.5 lots and a rate of 1.25: 0.0001 × 100,000 × 0.5 × 1.25 = $6.25 per pip.",
    ],
    assumptions: [
      "Contract size is a fixed number of base-currency units; mini and micro lots are modelled by entering fractional lots.",
      "The quote-to-account rate is treated as constant, but real exchange rates move with the market.",
      "Spreads, commissions, swap/funding and slippage are excluded, and a pip is assumed to be worth the same at entry and exit.",
    ],
    faq: [
      { q: "What exactly is a pip?", a: "A pip is the conventional smallest price move for a pair — 0.0001 for most pairs and 0.01 for JPY pairs. On five-digit brokers a fractional pip (point) is one tenth of that." },
      { q: "Why does pip value change between pairs?", a: "The pip is a move in the quote currency. If your account is in a different currency, the value must be converted at the current rate, so it changes with the market." },
      { q: "Does contract size matter?", a: "Yes. Pip value is proportional to position size, so a micro lot (1,000 units) is worth one hundredth of a standard lot (100,000 units)." },
    ],
    related: ["position-size", "risk-reward", "crypto-profit"],
  },

  {
    slug: "position-size",
    title: "Position size calculator",
    h1: "Position size calculator",
    category: "trading",
    tags: ["forex", "risk", "position size", "lots"],
    description: "Work out the forex position size in lots and units so a stop-loss only risks a set percentage of your account balance on each trade.",
    intro: "Position sizing keeps any single loss small. Enter your balance, the percentage you are willing to risk and the stop distance to see how many lots to trade.",
    currency: true,
    inputs: [
      { key: "balance", label: "Account balance", type: "number", default: 10000, min: 0, step: 100, unit: "currency" },
      { key: "riskPct", label: "Risk per trade", type: "number", default: 1, min: 0, max: 100, step: 0.1, unit: "percent" },
      { key: "stopPips", label: "Stop distance (pips)", type: "number", default: 25, min: 0, step: 1 },
      { key: "pipValuePerLot", label: "Pip value per lot", type: "number", default: 10, min: 0, step: 0.1, unit: "currency", help: "Value of one pip for a single lot, in your account currency." },
    ],
    run(v, ctx) {
      const balance = Number(v.balance);
      const riskPct = Number(v.riskPct);
      const stopPips = Number(v.stopPips);
      const pipValuePerLot = Number(v.pipValuePerLot);
      if (!(balance > 0)) throw new Error("Enter a positive account balance.");
      if (!(riskPct > 0)) throw new Error("The risk percentage must be greater than zero.");
      if (!(stopPips > 0)) throw new Error("The stop distance in pips must be greater than zero.");
      if (!(pipValuePerLot > 0)) throw new Error("The pip value per lot must be greater than zero.");
      const res = positionSize({ account: balance, riskPct, stopPips, pipValuePerLot });
      const lots = round(res.lots, 2);
      const units = Math.round(lots * 100000);
      const riskPerLot = stopPips * pipValuePerLot;
      return {
        primary: { label: "Position size", value: lots, format: "number", hint: "Lots" },
        stats: [
          { label: "Risk amount", value: res.riskAmount, format: "currency" },
          { label: "Risk per lot", value: riskPerLot, format: "currency" },
          { label: "Position size (units)", value: units, format: "number" },
          { label: "Risk of account", value: riskPct, format: "percent" },
        ],
        steps: [
          `Risk amount = ${money(balance, ctx)} × ${num(riskPct)}% = ${money(res.riskAmount, ctx)}.`,
          `Risk per lot = ${num(stopPips)} pips × ${money(pipValuePerLot, ctx)} = ${money(riskPerLot, ctx)}.`,
          `Lots = ${money(res.riskAmount, ctx)} / ${money(riskPerLot, ctx)} = ${num(lots)} lots (about ${num(units)} units).`,
        ],
        verdict: `Risking ${num(riskPct)}% of ${money(balance, ctx)} (${money(res.riskAmount, ctx)}) with a ${num(stopPips)}-pip stop sizes the trade at about ${num(lots)} lots. A loss near the stop should cost close to your risk amount, before spread and slippage.`,
      };
    },
    formula: "Lots = (balance × risk%) / (stop in pips × pip value per lot)",
    example: [
      "Balance $10,000, risking 1%, stop 25 pips, pip value $10 per lot.",
      "Risk amount = 10,000 × 1% = $100; risk per lot = 25 × $10 = $250.",
      "Lots = 100 / 250 = 0.40 lots, or about 40,000 units.",
    ],
    assumptions: [
      "The pip value per lot is constant and already known for the pair and lot size you trade.",
      "Both entry and stop are assumed to fill at the exact prices given; real fills can slip, especially in fast markets.",
      "Spread, commission, swap/funding and slippage are excluded from the risk estimate.",
    ],
    faq: [
      { q: "Why risk only a small percentage?", a: "Small, consistent risk keeps a losing streak survivable. Losing 1% ten times in a row costs about 10% of the account; risking 10% each time would nearly wipe it out." },
      { q: "How do I find the pip value per lot?", a: "Use the forex pip value calculator for the pair, or check your broker's contract specification." },
      { q: "Should I round the size down?", a: "Yes — rounding down keeps the risk at or below your limit. Rounding up quietly increases the amount at risk." },
    ],
    related: ["forex-pip-value", "risk-reward", "crypto-liquidation", "crypto-profit"],
  },

  {
    slug: "risk-reward",
    title: "Risk-reward ratio calculator",
    h1: "Risk-reward ratio calculator",
    category: "trading",
    tags: ["risk", "reward", "trading", "win rate"],
    description: "Compare the risk and reward of a trade from its entry, stop and target prices to get the reward-to-risk ratio and break-even win rate.",
    intro: "The distance to your stop is the risk; the distance to your target is the reward. This calculator turns those prices into a ratio and the win rate you need to break even.",
    currency: true,
    inputs: [
      { key: "entry", label: "Entry price", type: "number", default: 100, min: 0, step: 0.5, unit: "currency" },
      { key: "stop", label: "Stop price", type: "number", default: 95, min: 0, step: 0.5, unit: "currency" },
      { key: "target", label: "Target price", type: "number", default: 115, min: 0, step: 0.5, unit: "currency" },
      { key: "side", label: "Direction", type: "select", default: "long", options: [{ value: "long", label: "Long (buy)" }, { value: "short", label: "Short (sell)" }] },
      { key: "account", label: "Account balance", type: "number", default: 10000, min: 0, step: 100, unit: "currency", optional: true },
      { key: "riskPct", label: "Risk per trade", type: "number", default: 1, min: 0, max: 100, step: 0.1, unit: "percent", optional: true },
    ],
    run(v, ctx) {
      const entry = Number(v.entry);
      const stop = Number(v.stop);
      const target = Number(v.target);
      if (!(entry > 0)) throw new Error("Enter a positive entry price.");
      const risk = Math.abs(entry - stop);
      const reward = Math.abs(target - entry);
      if (!(risk > 0)) throw new Error("The stop price must be different from the entry price.");
      const rr = reward / risk;
      const account = Number(v.account) || 0;
      const riskPct = Number(v.riskPct) || 0;
      const hasRisk = account > 0 && riskPct > 0;
      const riskAmount = hasRisk ? account * (riskPct / 100) : NaN;
      const potentialProfit = hasRisk ? riskAmount * rr : NaN;
      const breakEvenWin = 100 / (1 + rr);
      return {
        primary: { label: "Reward-to-risk ratio", value: rr, format: "number", hint: "Reward per unit of risk" },
        stats: [
          { label: "Risk per unit", value: risk, format: "currency" },
          { label: "Reward per unit", value: reward, format: "currency" },
          { label: "Break-even win rate", value: breakEvenWin, format: "percent", hint: "Wins needed just to cover losses, before fees" },
          { label: "Amount at risk", value: riskAmount, format: "currency" },
          { label: "Potential profit", value: potentialProfit, format: "currency" },
        ],
        steps: [
          `Risk per unit = |${money(entry, ctx)} − ${money(stop, ctx)}| = ${money(risk, ctx)}.`,
          `Reward per unit = |${money(target, ctx)} − ${money(entry, ctx)}| = ${money(reward, ctx)}.`,
          `Ratio = ${money(reward, ctx)} / ${money(risk, ctx)} = ${num(rr)}; break-even win rate = 1 / (1 + ${num(rr)}) = ${num(breakEvenWin)}%.`,
        ],
        verdict: hasRisk
          ? `Risking ${money(riskAmount, ctx)} to target ${money(potentialProfit, ctx)} is a 1 : ${num(rr)} setup. You need to win more than ${num(breakEvenWin)}% of the time just to break even, before fees and slippage.`
          : `A risk-to-reward of 1 : ${num(rr)} needs a win rate above ${num(breakEvenWin)}% to break even. Add your balance and risk percentage to see the money amounts.`,
      };
    },
    formula: "Reward-to-risk = |target − entry| / |entry − stop|",
    example: [
      "Long: entry 100, stop 95, target 115.",
      "Risk = 5, reward = 15, so the reward-to-risk ratio is 3.0.",
      "Break-even win rate = 1 / (1 + 3) = 25%; a $10,000 account risking 1% puts $100 at risk for a $300 target.",
    ],
    assumptions: [
      "Only the entry, stop and target prices drive the ratio; position size is assumed to match the risk percentage you set.",
      "Spread, commission, swap/funding and slippage are excluded, and both stop and target are assumed to fill at the exact price.",
      "It assumes you exit at either the stop or the target, not somewhere in between.",
    ],
    faq: [
      { q: "What is a good risk-reward ratio?", a: "There is no single answer, but higher ratios tolerate lower win rates. At 1:2 you need to win over 33%; at 1:3, over 25%." },
      { q: "Does a high ratio guarantee profit?", a: "No. A high ratio only helps if your targets are actually reached. A strategy that rarely hits its target can still lose money." },
      { q: "How does the break-even win rate work?", a: "It is the win rate at which winnings exactly match losses: 1 / (1 + ratio). Fees and slippage push the real requirement higher." },
    ],
    related: ["position-size", "forex-pip-value", "crypto-profit"],
  },

  {
    slug: "crypto-profit",
    title: "Crypto profit calculator",
    h1: "Crypto profit calculator",
    category: "trading",
    tags: ["crypto", "profit", "roi", "fees"],
    description: "Calculate gross and net crypto profit or loss after round-trip fees for a long or short trade, plus return on investment.",
    intro: "Enter your entry and exit prices, quantity and fees to see the gross move, the fees you pay on both sides and what is really left.",
    currency: true,
    inputs: [
      { key: "entry", label: "Entry price", type: "number", default: 60000, min: 0, step: 100, unit: "currency" },
      { key: "exit", label: "Exit price", type: "number", default: 66000, min: 0, step: 100, unit: "currency" },
      { key: "quantity", label: "Quantity", type: "number", default: 0.5, min: 0, step: 0.001, help: "Amount of the coin or asset bought or sold." },
      { key: "feePct", label: "Round-trip fee", type: "number", default: 0.1, min: 0, max: 25, step: 0.01, unit: "percent", help: "Taker fee charged on both the entry and the exit value." },
      { key: "side", label: "Direction", type: "select", default: "long", options: [{ value: "long", label: "Long (buy then sell)" }, { value: "short", label: "Short (sell then buy back)" }] },
    ],
    run(v, ctx) {
      const entry = Number(v.entry);
      const exit = Number(v.exit);
      const quantity = Number(v.quantity);
      const feePct = Number(v.feePct);
      if (!(entry > 0)) throw new Error("Enter a positive entry price.");
      if (!(quantity > 0)) throw new Error("Enter a positive quantity.");
      if (!(feePct >= 0)) throw new Error("The fee percentage cannot be negative.");
      const p = tradePnl({ entry, exit, quantity, feePct, side: v.side });
      const cost = entry * quantity;
      const roiPct = cost > 0 ? (p.net / cost) * 100 : NaN;
      const leg = v.side === "long"
        ? `(${money(exit, ctx)} − ${money(entry, ctx)})`
        : `(${money(entry, ctx)} − ${money(exit, ctx)})`;
      return {
        primary: { label: "Net profit / loss", value: p.net, format: "currency" },
        stats: [
          { label: "Gross profit / loss", value: p.gross, format: "currency" },
          { label: "Round-trip fees", value: p.fees, format: "currency" },
          { label: "Return on investment", value: roiPct, format: "percent" },
          { label: "Position cost", value: cost, format: "currency" },
        ],
        steps: [
          `Gross P&L = ${leg} × ${num(quantity)} = ${money(p.gross, ctx)}.`,
          `Fees = (${money(entry, ctx)} + ${money(exit, ctx)}) × ${num(quantity)} × ${num(feePct)}% = ${money(p.fees, ctx)}.`,
          `Net = ${money(p.gross, ctx)} − ${money(p.fees, ctx)} = ${money(p.net, ctx)}, a ${num(roiPct)}% return on ${money(cost, ctx)}.`,
        ],
        verdict: p.net >= 0
          ? `This ${v.side} trade nets ${money(p.net, ctx)} after ${money(p.fees, ctx)} of fees. Profit is never guaranteed — slippage and a worse fill can reduce or erase it.`
          : `This ${v.side} trade loses ${money(Math.abs(p.net), ctx)} after fees. Losses are part of trading; the important figure is how it compares with your plan and risk limit.`,
      };
    },
    formula: "Net P&L = (exit − entry) × quantity − (entry + exit) × quantity × fee%  (sign flips for shorts)",
    example: [
      "Long 0.5 BTC: entry $60,000, exit $66,000, round-trip fee 0.1%.",
      "Gross = (66,000 − 60,000) × 0.5 = $3,000.",
      "Fees = (60,000 + 66,000) × 0.5 × 0.1% = $63, so the net is $2,937 — a 9.79% return on the $30,000 cost.",
    ],
    assumptions: [
      "The whole quantity is opened and closed at the two prices given.",
      "The fee is a round-trip (both sides) taker fee on the traded value; maker rebates and tiered fee schedules are not modelled.",
      "Funding, slippage, taxes and price impact are excluded, and the trade is assumed to be fully filled.",
    ],
    faq: [
      { q: "Why subtract fees twice?", a: "A round trip opens and closes a position, and most exchanges charge on both. The fee percentage here applies to the entry and exit values together." },
      { q: "Can a short profit when the price rises?", a: "No. A short gains when the price falls and loses when it rises, which is why the formula swaps entry and exit." },
      { q: "Is this a forecast?", a: "No. It is arithmetic on the prices you enter. It does not predict the market and no outcome is guaranteed." },
    ],
    related: ["crypto-dca", "crypto-fees", "crypto-liquidation", "roi"],
  },

  {
    slug: "crypto-dca",
    title: "Crypto DCA calculator",
    h1: "Crypto DCA (dollar-cost averaging) calculator",
    category: "trading",
    tags: ["crypto", "dca", "average cost", "investing"],
    description: "Find the average cost, total units and current profit or loss of a dollar-cost averaging plan across a series of buy prices.",
    intro: "Dollar-cost averaging spreads a fixed amount across several prices. Enter them to see your average cost and, if you like, the profit or loss at today's price.",
    currency: true,
    inputs: [
      { key: "prices", label: "Buy prices", type: "text", default: "10000, 11000, 12000", help: "Comma- or space-separated buy prices, one per purchase." },
      { key: "amountPerBuy", label: "Amount invested at each buy", type: "number", default: 100, min: 0, step: 10, unit: "currency" },
      { key: "current", label: "Current price", type: "number", default: 13000, min: 0, step: 100, unit: "currency", optional: true, help: "Leave 0 to skip the profit or loss estimate." },
    ],
    run(v, ctx) {
      const prices = parseSeries(v.prices).filter((p) => p > 0);
      const amount = Number(v.amountPerBuy);
      if (!prices.length) throw new Error("Enter at least one valid buy price, separated by commas.");
      if (!(amount > 0)) throw new Error("Enter a positive amount to invest at each buy.");
      const buys = prices.map((price) => ({ price, amount: amount / price }));
      const res = dca({ buys });
      const current = Number(v.current) || 0;
      const hasCurrent = current > 0;
      const value = hasCurrent ? res.totalUnits * current : NaN;
      const pnl = hasCurrent ? value - res.totalCost : NaN;
      const pnlPct = hasCurrent && res.totalCost > 0 ? (pnl / res.totalCost) * 100 : NaN;
      const rows = buys.map((b, i) => [
        { v: i + 1, format: "integer" },
        { v: b.price, format: "currency" },
        { v: b.amount, format: "number" },
        { v: amount, format: "currency" },
      ]);
      return {
        primary: { label: "Average cost per unit", value: res.average, format: "currency" },
        stats: [
          { label: "Total invested", value: res.totalCost, format: "currency" },
          { label: "Total units", value: res.totalUnits, format: "number" },
          { label: "Number of buys", value: prices.length, format: "integer" },
          { label: "Current value", value: value, format: "currency" },
          { label: "Profit / loss", value: pnl, format: "currency" },
          { label: "Return", value: pnlPct, format: "percent" },
        ],
        table: {
          caption: "Buys in this plan",
          columns: [{ label: "Buy" }, { label: "Price", align: "right" }, { label: "Units", align: "right" }, { label: "Invested", align: "right" }],
          rows,
        },
        steps: [
          `Investing ${money(amount, ctx)} at each of ${prices.length} prices buys ${num(res.totalUnits)} units for ${money(res.totalCost, ctx)}.`,
          `Average cost = ${money(res.totalCost, ctx)} / ${num(res.totalUnits)} = ${money(res.average, ctx)} per unit.`,
          hasCurrent
            ? `At ${money(current, ctx)} the position is worth ${money(value, ctx)}: ${pnl >= 0 ? "up" : "down"} ${money(Math.abs(pnl), ctx)} (${num(Math.abs(pnlPct))}%).`
            : "Add a current price to estimate the profit or loss.",
        ],
        verdict: hasCurrent
          ? `The plan averages ${money(res.average, ctx)} per unit and is now ${pnl >= 0 ? "up" : "down"} ${money(Math.abs(pnl), ctx)} (${num(Math.abs(pnlPct))}%). Dollar-cost averaging smooths entry prices but does not guarantee a profit.`
          : `The plan buys ${num(res.totalUnits)} units at an average cost of ${money(res.average, ctx)}. Add a current price to see whether that entry is in profit.`,
      };
    },
    formula: "Units bought = amount ÷ price at each buy; average cost = total invested ÷ total units",
    example: [
      "Invest $100 at $10,000, $11,000 and $12,000.",
      "Units = 0.01 + 0.009091 + 0.008333 = 0.027424; total invested = $300.",
      "Average cost = 300 / 0.027424 = $10,939.39; at a current price of $13,000 the position is worth $356.52 (+18.8%).",
    ],
    assumptions: [
      "The same cash amount is invested at each listed price.",
      "Buy prices are filled exactly; exchange fees, spread and slippage are excluded.",
      "A lower average cost is not a forecast — averaging down does not remove the risk of further losses.",
    ],
    faq: [
      { q: "How does DCA lower my average cost?", a: "Because you buy more units when the price is low and fewer when it is high, the average price you pay is below the simple average of the buy prices." },
      { q: "Is dollar-cost averaging safer?", a: "It reduces the risk of buying everything at a single bad price, but it does not protect against a market that keeps falling. You can still lose money." },
      { q: "What about fees on every buy?", a: "Each buy usually pays a trading fee. Many small buys mean more fees, so net returns are slightly lower than shown here." },
    ],
    related: ["crypto-profit", "crypto-fees", "crypto-liquidation"],
  },

  {
    slug: "crypto-liquidation",
    title: "Crypto liquidation price calculator",
    h1: "Crypto liquidation price calculator",
    category: "trading",
    tags: ["crypto", "leverage", "liquidation", "risk"],
    description: "Estimate the liquidation price of a leveraged long or short crypto position and how far the market must move to reach it.",
    intro: "Leverage magnifies both gains and losses. Enter the entry price, leverage and maintenance rate to see where an isolated position is estimated to liquidate.",
    currency: true,
    inputs: [
      { key: "entry", label: "Entry price", type: "number", default: 100, min: 0, step: 1, unit: "currency" },
      { key: "leverage", label: "Leverage", type: "number", default: 10, min: 1, max: 125, step: 1, unit: "number", help: "For example 10 means 10× the position size of your margin." },
      { key: "maintenanceRatePct", label: "Maintenance margin rate", type: "number", default: 0.5, min: 0, max: 50, step: 0.1, unit: "percent", help: "The exchange's maintenance margin requirement for the position." },
      { key: "side", label: "Direction", type: "select", default: "long", options: [{ value: "long", label: "Long (buy)" }, { value: "short", label: "Short (sell)" }] },
    ],
    run(v, ctx) {
      const entry = Number(v.entry);
      const leverage = Number(v.leverage);
      const maintenanceRatePct = Number(v.maintenanceRatePct);
      if (!(entry > 0)) throw new Error("Enter a positive entry price.");
      if (!(leverage > 0)) throw new Error("Leverage must be greater than zero.");
      if (!(maintenanceRatePct >= 0)) throw new Error("The maintenance margin rate cannot be negative.");
      const liq = liquidationPrice({ entry, leverage, maintenanceRatePct, side: v.side });
      if (!Number.isFinite(liq) || liq <= 0) throw new Error("Could not estimate a liquidation price from those inputs.");
      const distance = (Math.abs(liq - entry) / entry) * 100;
      const marginPct = 100 / leverage;
      const marginPerUnit = entry / leverage;
      const sign = v.side === "long" ? "−" : "+";
      const rateSign = v.side === "long" ? "+" : "−";
      return {
        primary: { label: "Estimated liquidation price", value: liq, format: "currency" },
        stats: [
          { label: "Distance to liquidation", value: distance, format: "percent" },
          { label: "Initial margin (per unit)", value: marginPerUnit, format: "currency" },
          { label: "Initial margin", value: marginPct, format: "percent", hint: "100 / leverage" },
          { label: "Maintenance rate", value: maintenanceRatePct, format: "percent" },
        ],
        steps: [
          `At ${num(leverage)}× the initial margin is 100 / ${num(leverage)} = ${num(marginPct)}% of the position value.`,
          `Liquidation = ${money(entry, ctx)} × (1 ${sign} ${num(1 / leverage)} ${rateSign} ${num(maintenanceRatePct / 100)}) = ${money(liq, ctx)}.`,
          `The price only has to move ${num(distance)}% against the position to reach it.`,
        ],
        verdict: `A ${v.side} entered at ${money(entry, ctx)} with ${num(leverage)}× leverage is estimated to liquidate near ${money(liq, ctx)}, about ${num(distance)}% away. Leverage magnifies losses as well as gains, and a liquidation can wipe out the margin backing the trade.`,
      };
    },
    formula: "Long: L = entry × (1 − 1/leverage + m).  Short: L = entry × (1 + 1/leverage − m)",
    example: [
      "Long 10× at $100 with a 0.5% maintenance margin rate.",
      "Liquidation = 100 × (1 − 0.10 + 0.005) = $90.50.",
      "That is a 9.5% fall; at 20× it would be 100 × (1 − 0.05 + 0.005) = $95.50, only 4.5% away.",
    ],
    assumptions: [
      "Isolated margin with a fixed maintenance margin rate; cross margin and tiered maintenance rates are not modelled.",
      "Funding payments, fees, slippage and any margin added or removed while the trade is open are ignored.",
      "Exchanges use a mark price and their own rules, so the real trigger price will differ from this estimate.",
    ],
    faq: [
      { q: "Why is the liquidation price not just the leverage?", a: "The exchange keeps a maintenance margin to cover the position, so liquidation happens a little closer than the pure 1/leverage point." },
      { q: "Is a liquidation avoidable?", a: "Adding margin or reducing the position can push the liquidation price further away, but leverage always keeps the risk of a total loss for the margin used." },
      { q: "Does this work for shorts?", a: "Yes. Choose short and the formula flips, so liquidation sits above the entry price." },
    ],
    related: ["crypto-profit", "position-size", "risk-reward", "crypto-fees"],
  },

  {
    slug: "crypto-fees",
    title: "Crypto trading fees calculator",
    h1: "Crypto trading fees calculator",
    category: "trading",
    tags: ["crypto", "fees", "costs", "trading"],
    description: "Add up cryptocurrency trading fees across many trades and see the total cost as a percentage of the total volume you traded.",
    intro: "Fees are easy to ignore trade by trade and expensive over a year. Enter your trade size, fee rate and number of trades to see the true cost.",
    currency: true,
    inputs: [
      { key: "tradeAmount", label: "Amount per trade", type: "number", default: 5000, min: 0, step: 100, unit: "currency" },
      { key: "feePct", label: "Fee per trade", type: "number", default: 0.1, min: 0, max: 25, step: 0.01, unit: "percent", help: "The taker or maker fee charged on each trade." },
      { key: "trades", label: "Number of trades", type: "number", default: 20, min: 0, step: 1 },
    ],
    run(v, ctx) {
      const amount = Number(v.tradeAmount);
      const feePct = Number(v.feePct);
      const trades = Math.round(Number(v.trades));
      if (!(amount > 0)) throw new Error("Enter a positive trade amount.");
      if (!(feePct >= 0)) throw new Error("The fee percentage cannot be negative.");
      if (!(trades > 0)) throw new Error("Enter at least one trade.");
      const feePerTrade = amount * (feePct / 100);
      const total = feePerTrade * trades;
      const volume = amount * trades;
      return {
        primary: { label: "Total fees", value: total, format: "currency" },
        stats: [
          { label: "Fee per trade", value: feePerTrade, format: "currency" },
          { label: "Total traded volume", value: volume, format: "currency" },
          { label: "Effective cost of volume", value: feePct, format: "percent" },
          { label: "Number of trades", value: trades, format: "integer" },
        ],
        steps: [
          `Fee per trade = ${money(amount, ctx)} × ${num(feePct)}% = ${money(feePerTrade, ctx)}.`,
          `Total fees = ${money(feePerTrade, ctx)} × ${num(trades)} = ${money(total, ctx)}.`,
          `That is ${num(feePct)}% of the ${money(volume, ctx)} of volume traded.`,
        ],
        verdict: `${num(trades)} trades of ${money(amount, ctx)} cost about ${money(total, ctx)} in fees, or ${num(feePct)}% of the volume traded. Frequent trading needs a bigger edge just to cover costs, and fees are certain even when trades are not profitable.`,
      };
    },
    formula: "Total fees = trade amount × fee% × number of trades",
    example: [
      "20 trades of $5,000 at a 0.1% fee.",
      "Fee per trade = 5,000 × 0.1% = $5.00.",
      "Total = 5 × 20 = $100 on $100,000 of volume, an effective cost of 0.1%.",
    ],
    assumptions: [
      "Every trade is the same size and pays the same fee rate.",
      "A round trip (a buy and a sell) counts as two trades if your exchange charges both sides.",
      "Spreads, slippage, funding and withdrawal fees are excluded; tiered or maker/taker schedules may change the rate over time.",
    ],
    faq: [
      { q: "Why do fees matter so much?", a: "They are paid on every trade whether it wins or loses. Many small trades can quietly cost more than the profit a strategy earns." },
      { q: "What is a maker versus taker fee?", a: "A taker fee applies when your order fills immediately against the book; a maker fee is usually lower and applies when you add liquidity with a resting limit order." },
      { q: "Should I include spreads?", a: "Yes, ideally. The spread is an extra cost on every fill; this calculator covers only the explicit fee you enter." },
    ],
    related: ["crypto-profit", "crypto-dca", "crypto-liquidation"],
  },

  {
    slug: "market-cap-fdv",
    title: "Market cap and FDV calculator",
    h1: "Market cap and FDV calculator",
    category: "trading",
    tags: ["crypto", "market cap", "fdv", "valuation"],
    description: "Calculate crypto market capitalisation and fully diluted valuation from price and supply, with the circulating supply share.",
    intro: "Market cap values only the coins in circulation; FDV values the maximum supply. Comparing the two shows how much future supply could dilute the price.",
    currency: true,
    inputs: [
      { key: "price", label: "Price per coin", type: "number", default: 2, min: 0, step: 0.01, unit: "currency" },
      { key: "circulatingSupply", label: "Circulating supply", type: "number", default: 100000000, min: 0, step: 1000000, help: "Coins currently available to trade." },
      { key: "totalSupply", label: "Total supply", type: "number", default: 200000000, min: 0, step: 1000000, help: "Coins that exist now, including locked or reserved ones." },
      { key: "maxSupply", label: "Max supply", type: "number", default: 0, min: 0, step: 1000000, unit: "number", optional: true, help: "Leave 0 if the supply is uncapped." },
    ],
    run(v, ctx) {
      const price = Number(v.price);
      const circulating = Number(v.circulatingSupply);
      const total = Number(v.totalSupply);
      const max = Number(v.maxSupply) || 0;
      if (!(price > 0)) throw new Error("Enter a positive price.");
      if (!(circulating > 0)) throw new Error("Circulating supply must be greater than zero.");
      if (!(total > 0)) throw new Error("Total supply must be greater than zero.");
      const cap = marketCap(price, circulating);
      const fdv = marketCap(price, total);
      const circPct = (circulating / total) * 100;
      const fdvAtMax = max > 0 ? marketCap(price, max) : NaN;
      return {
        primary: { label: "Market capitalisation", value: cap, format: "currency" },
        stats: [
          { label: "Fully diluted valuation (FDV)", value: fdv, format: "currency" },
          { label: "Circulating share of total", value: circPct, format: "percent" },
          ...(max > 0 ? [{ label: "FDV at max supply", value: fdvAtMax, format: "currency" }] : []),
          { label: "Supply still to unlock", value: Math.max(0, total - circulating), format: "number" },
        ],
        steps: [
          `Market cap = ${money(price, ctx)} × ${num(circulating)} = ${money(cap, ctx)}.`,
          `FDV = ${money(price, ctx)} × ${num(total)} = ${money(fdv, ctx)}.`,
          max > 0
            ? `At max supply, FDV = ${money(price, ctx)} × ${num(max)} = ${money(fdvAtMax, ctx)}.`
            : "No max supply given — many cryptocurrencies have an uncapped or unknown total.",
        ],
        verdict: `At ${money(price, ctx)} the market cap is ${money(cap, ctx)} and the FDV is ${money(fdv, ctx)} — the circulating supply is ${num(circPct)}% of the total. A valuation built on FDV assumes all future supply is unlocked, which can dilute holders.`,
      };
    },
    formula: "Market cap = price × circulating supply;  FDV = price × total (or max) supply",
    example: [
      "Price $2, circulating supply 100,000,000, total supply 200,000,000.",
      "Market cap = 2 × 100,000,000 = $200,000,000.",
      "FDV = 2 × 200,000,000 = $400,000,000, so only 50% of the supply is circulating.",
    ],
    assumptions: [
      "Price and supply figures are a single snapshot and change as coins are mined, burned, unlocked or reserved.",
      "Market cap is a notional value, not cash: it multiplies the price by supply rather than what buyers actually paid.",
      "Uncapped tokens have no meaningful max-supply FDV, so that field is optional.",
    ],
    faq: [
      { q: "What is the difference between market cap and FDV?", a: "Market cap uses circulating supply; FDV uses total or maximum supply. FDV is therefore always at least as large and shows the cost of valuing every eventual coin." },
      { q: "Why does FDV matter?", a: "A low market cap with a high FDV means a lot of supply has yet to be released. Those unlocks can add selling pressure, so the fully diluted figure is the more cautious valuation." },
      { q: "Is market cap the money invested?", a: "No. It is the price multiplied by supply. Only a small fraction of the coins may actually have traded at that price." },
    ],
    related: ["crypto-profit", "crypto-dca", "crypto-liquidation"],
  },
];
