// Mathematics and statistics calculators.
//
// Pure, deterministic definitions: percentages, descriptive statistics, ratios,
// counting (permutations/combinations) and quadratic equations. Every run()
// throws a plain Error on invalid domain instead of returning NaN or null.

import { mean, median, mode, sum, variance, stdev, range, percentChange, factorial, nPr, nCr } from "../math.js";
import { formatNumber } from "../format.js";

const num = (v) => formatNumber(v);
const parseList = (s) => String(s).split(/[\s,;]+/).map(Number).filter(Number.isFinite);
/** Greatest common divisor, used to simplify ratios. */
const gcd = (a, b) => {
  let x = Math.abs(a), y = Math.abs(b);
  while (y) { const t = x % y; x = y; y = t; }
  return x;
};

export const MATH_CALCS = [
  {
    slug: "percentage",
    title: "Percentage calculator",
    h1: "Percentage calculator",
    category: "math",
    tags: ["percentage", "percent", "maths"],
    description: "Work out percentages three ways: find a percent of a number, express one number as a percent of another, or find the whole from a percent.",
    intro: "A percentage is a fraction out of one hundred. Pick the question you are asking and enter two numbers to get the answer with the working shown.",
    inputs: [
      {
        key: "mode", label: "What do you want to find?", type: "select", default: "of",
        options: [
          { value: "of", label: "A percent of a number" },
          { value: "what", label: "What percent one number is of another" },
          { value: "is", label: "The whole, given a part and a percent" },
        ],
      },
      { key: "a", label: "First value (A)", type: "number", default: 25, step: 1 },
      { key: "b", label: "Second value (B)", type: "number", default: 80, step: 1 },
    ],
    run(v) {
      const a = v.a, b = v.b;
      if (v.mode === "of") {
        const result = (a / 100) * b;
        return {
          primary: { label: `${num(a)}% of ${num(b)}`, value: result, format: "number" },
          stats: [
            { label: "A as a fraction", value: a / 100, format: "number" },
            { label: "Remainder of B", value: b - result, format: "number" },
          ],
          steps: [
            `Percent means per hundred, so ${num(a)}% = ${num(a)}/100 = ${num(a / 100)}.`,
            `Multiply by the whole: ${num(a / 100)} × ${num(b)} = ${num(result)}.`,
          ],
          verdict: `${num(a)}% of ${num(b)} is ${num(result)}.`,
        };
      }
      if (v.mode === "what") {
        if (b === 0) throw new Error("B cannot be zero when asking what percent A is of B.");
        const pct = (a / b) * 100;
        return {
          primary: { label: "Percentage", value: pct, format: "percent" },
          stats: [
            { label: "A as a fraction of B", value: a / b, format: "number" },
            { label: "Difference (B − A)", value: b - a, format: "number" },
          ],
          steps: [
            `Divide the part by the whole: ${num(a)} / ${num(b)} = ${num(a / b)}.`,
            `Turn it into a percentage: ${num(a / b)} × 100 = ${num(pct)}%.`,
          ],
          verdict: `${num(a)} is ${num(pct)}% of ${num(b)}.`,
        };
      }
      if (b === 0) throw new Error("The percentage B cannot be zero when finding the whole.");
      const whole = a / (b / 100);
      return {
        primary: { label: "Whole", value: whole, format: "number" },
        stats: [
          { label: "B as a fraction", value: b / 100, format: "number" },
          { label: "Difference (whole − A)", value: whole - a, format: "number" },
        ],
        steps: [
          `B% as a decimal is ${num(b)}/100 = ${num(b / 100)}.`,
          `Divide the part by that decimal: ${num(a)} / ${num(b / 100)} = ${num(whole)}.`,
        ],
        verdict: `${num(a)} is ${num(b)}% of ${num(whole)}.`,
      };
    },
    formula: "part = whole × percent/100   ·   percent = part/whole × 100   ·   whole = part / (percent/100)",
    example: [
      "A percent of a number: 25% of 80 → 25/100 = 0.25 and 0.25 × 80 = 20.",
      "What percent: 15 of 60 → 15 / 60 = 0.25, which is 25%.",
      "The whole: 12 is 30% of what → 30/100 = 0.3 and 12 / 0.3 = 40.",
    ],
    assumptions: [
      "Percentages are treated as exact proportions out of one hundred.",
      "The values can be any real numbers, including amounts, scores or counts.",
    ],
    faq: [
      { q: "What is the quick way to take a percent of something?", a: "Move the decimal point two places to turn the percent into a fraction (25% becomes 0.25), then multiply by the whole." },
      { q: "Why can B not be zero?", a: "Expressing A as a percent of B means dividing by B, and dividing by zero is undefined." },
      { q: "Is a 50% rise the same as a 50% fall?", a: "No. Rising 100 to 150 is +50%, but falling back 150 to 100 is only about −33.3% because the base changed." },
    ],
    related: ["percentage-change", "average", "ratio"],
  },

  {
    slug: "percentage-change",
    title: "Percentage change calculator",
    h1: "Percentage change calculator",
    category: "math",
    tags: ["percentage", "change", "increase"],
    description: "Calculate the percentage increase or decrease between two values, and see the absolute change and direction of the move.",
    intro: "Percentage change compares a new value with an original one. Enter the starting and finishing values to see how far they moved in percent terms.",
    inputs: [
      { key: "from", label: "Original / starting value", type: "number", default: 200, step: 1 },
      { key: "to", label: "New / finishing value", type: "number", default: 250, step: 1 },
    ],
    run(v) {
      const from = v.from, to = v.to;
      if (from === 0) throw new Error("The starting value cannot be zero — percentage change is undefined.");
      const change = percentChange(from, to);
      const diff = to - from;
      return {
        primary: { label: "Percentage change", value: change, format: "percent" },
        stats: [
          { label: "Absolute change", value: Math.abs(diff), format: "number" },
          { label: "Difference (to − from)", value: diff, format: "number" },
          { label: "Direction", value: diff > 0 ? "Increase" : diff < 0 ? "Decrease" : "No change", format: "text" },
        ],
        steps: [
          `Difference = ${num(v.to)} − ${num(v.from)} = ${num(diff)}.`,
          `Divide by the size of the starting value: ${num(diff)} / ${num(Math.abs(v.from))} = ${num(diff / Math.abs(v.from))}.`,
          `Multiply by 100: ${num(diff / Math.abs(v.from))} × 100 = ${num((diff / Math.abs(v.from)) * 100)}%.`,
        ],
        verdict: diff > 0
          ? `${num(v.from)} to ${num(v.to)} is an increase of ${num((diff / Math.abs(v.from)) * 100)}%.`
          : diff < 0
            ? `${num(v.from)} to ${num(v.to)} is a decrease of ${num(Math.abs((diff / Math.abs(v.from)) * 100))}%.`
            : `${num(v.from)} and ${num(v.to)} are the same, so the change is 0%.`,
      };
    },
    formula: "% change = (to − from) / |from| × 100",
    example: [
      "From 200 to 250: difference = 250 − 200 = 50.",
      "Divide by the starting value: 50 / 200 = 0.25.",
      "0.25 × 100 = 25%, so the value increased by 25%.",
    ],
    assumptions: [
      "The denominator is the absolute value of the starting figure, so the sign of the change is intuitive even when the base is negative.",
      "The change is a simple two-point comparison — it ignores anything happening between the two values.",
    ],
    faq: [
      { q: "Why does a rise then a fall not cancel out?", a: "Each percentage is measured against a different base, so moving 100 up 50% then down 50% ends at 75, not 100." },
      { q: "What if the starting value is negative?", a: "Using |from| avoids a sign flip. Rising from −100 to −50 is reported as +50%, a genuine increase." },
      { q: "Can the change be more than 100%?", a: "Yes. Doubling a value is a 100% increase; tripling it is a 200% increase." },
    ],
    related: ["percentage", "average", "roi"],
  },

  {
    slug: "average",
    title: "Average calculator",
    h1: "Average calculator",
    category: "math",
    tags: ["average", "mean", "statistics"],
    description: "Find the mean, sum, count, minimum, maximum and median of any list of numbers you paste in.",
    intro: "The average, or arithmetic mean, adds up a set of numbers and divides by how many there are. Paste your values to get it at once.",
    inputs: [
      { key: "numbers", label: "Numbers", type: "text", default: "10, 20, 30, 40, 50", help: "Separate values with commas, spaces or semicolons." },
    ],
    run(v) {
      const list = parseList(v.numbers);
      if (!list.length) throw new Error("Enter at least one number");
      const total = sum(list);
      const avg = mean(list);
      return {
        primary: { label: "Average (mean)", value: avg, format: "number" },
        stats: [
          { label: "Count", value: list.length, format: "integer" },
          { label: "Sum", value: total, format: "number" },
          { label: "Minimum", value: Math.min(...list), format: "number" },
          { label: "Maximum", value: Math.max(...list), format: "number" },
          { label: "Median", value: median(list), format: "number" },
        ],
        steps: [
          `Add the ${num(list.length)} values: ${list.join(" + ")} = ${num(total)}.`,
          `Divide the total by the count: ${num(total)} / ${num(list.length)} = ${num(avg)}.`,
        ],
        verdict: `The average of your ${num(list.length)} numbers is ${num(avg)}.`,
      };
    },
    formula: "mean = (x₁ + x₂ + … + xₙ) / n",
    example: [
      "Numbers: 10, 20, 30, 40, 50.",
      "Sum = 150 and the count is 5.",
      "Mean = 150 / 5 = 30; the median is also 30 and the range runs from 10 to 50.",
    ],
    assumptions: [
      "Every value carries the same weight — this is the simple arithmetic mean.",
      "The standard SQL-style average ignores blank entries; unreadable tokens are skipped.",
    ],
    faq: [
      { q: "What is the difference between mean and median?", a: "The mean divides the total by the count and is pulled by outliers; the median is the middle value and resists them." },
      { q: "Can the average be outside the range of the numbers?", a: "No. The arithmetic mean always lies between the smallest and largest values." },
      { q: "How should I separate my numbers?", a: "Commas, spaces, semicolons or new lines all work, so you can paste straight from a spreadsheet column." },
    ],
    related: ["mean-median-mode", "standard-deviation", "percentage-change"],
  },

  {
    slug: "mean-median-mode",
    title: "Mean, median and mode calculator",
    h1: "Mean, median and mode calculator",
    category: "math",
    tags: ["statistics", "mean", "median", "mode"],
    description: "Calculate the mean, median, mode, range and count of a data set to see how its values are centred and spread.",
    intro: "Mean, median and mode are three different ways to describe the centre of a data set. Together they reveal whether values cluster or skew.",
    inputs: [
      { key: "numbers", label: "Numbers", type: "text", default: "2, 4, 4, 4, 5, 5, 7, 9", help: "Separate values with commas, spaces or semicolons." },
    ],
    run(v) {
      const list = parseList(v.numbers);
      if (!list.length) throw new Error("Enter at least one number");
      const m = mean(list);
      const med = median(list);
      const mo = mode(list);
      const hasMode = Number.isFinite(mo);
      return {
        primary: { label: "Mean", value: m, format: "number" },
        stats: [
          { label: "Median", value: median(list), format: "number" },
          { label: "Mode", value: hasMode ? mode(list) : "No mode", format: hasMode ? "number" : "text" },
          { label: "Range", value: range(list), format: "number" },
          { label: "Count", value: list.length, format: "integer" },
        ],
        steps: [
          `Sum = ${num(sum(list))} over ${num(list.length)} values, so the mean is ${num(mean(list))}.`,
          `Sorted, the middle value gives the median ${num(median(list))}.`,
          Number.isFinite(mode(list)) ? `The most frequent value is ${num(mode(list))}, so that is the mode.` : "No value appears more than once, so there is no mode.",
          `Range = maximum − minimum = ${num(range(list))}.`,
        ],
        verdict: Number.isFinite(mode(list))
          ? `The data centres on a mean of ${num(mean(list))} and a median of ${num(median(list))}, with a mode of ${num(mode(list))} and a range of ${num(range(list))}.`
          : `The data centres on a mean of ${num(mean(list))} and a median of ${num(median(list))}; no value repeats, so there is no mode, and the range is ${num(range(list))}.`,
      };
    },
    formula: "mean = Σx / n   ·   median = middle value of the sorted list   ·   mode = most frequent value",
    example: [
      "Numbers: 2, 4, 4, 4, 5, 5, 7, 9.",
      "Sum = 40 over 8 values, so the mean is 5.",
      "Median = (4 + 5) / 2 = 4.5; mode = 4 (it appears three times); range = 9 − 2 = 7.",
    ],
    assumptions: [
      "The mode is reported only when a value actually repeats; otherwise the result is 'no mode'.",
      "For an even count the median is the average of the two middle values.",
    ],
    faq: [
      { q: "When is the median better than the mean?", a: "When the data is skewed or has outliers — for example house prices or incomes — the median describes a typical value more fairly." },
      { q: "Can there be more than one mode?", a: "Yes. A data set can be bimodal or multimodal; this tool reports the single most frequent value." },
      { q: "What does the range tell me?", a: "It is the distance between the largest and smallest values, a quick if crude measure of how spread out the data is." },
    ],
    related: ["average", "standard-deviation", "ratio"],
  },

  {
    slug: "standard-deviation",
    title: "Standard deviation calculator",
    h1: "Standard deviation calculator",
    category: "math",
    tags: ["statistics", "standard deviation", "variance"],
    description: "Measure the spread of a data set by calculating its standard deviation and variance for either a sample or a population.",
    intro: "Standard deviation says how far values typically sit from the mean. Choose sample or population to match how your data was collected.",
    inputs: [
      { key: "numbers", label: "Numbers", type: "text", default: "2, 4, 4, 4, 5, 5, 7, 9", help: "Separate values with commas, spaces or semicolons." },
      { key: "type", label: "Data set type", type: "select", default: "sample", options: [{ value: "sample", label: "Sample (n − 1)" }, { value: "population", label: "Population (n)" }] },
    ],
    run(v) {
      const list = parseList(v.numbers);
      if (!list.length) throw new Error("Enter at least one number");
      const sample = v.type === "sample";
      if (sample && list.length < 2) throw new Error("Enter at least two numbers for a sample standard deviation.");
      const m = mean(list);
      const varValue = variance(list, sample);
      const sd = stdev(list, sample);
      const denom = sample ? list.length - 1 : list.length;
      const ss = varValue * denom;
      return {
        primary: { label: "Standard deviation", value: sd, format: "number" },
        stats: [
          { label: "Mean", value: m, format: "number" },
          { label: "Variance", value: varValue, format: "number" },
          { label: "Standard deviation", value: sd, format: "number" },
          { label: "Sample size", value: list.length, format: "integer" },
        ],
        steps: [
          `Mean = ${num(m)}.`,
          `Sum of squared deviations from the mean = ${num(ss)}.`,
          `Divide by ${sample ? `${num(list.length)} − 1` : num(list.length)} (${sample ? "sample" : "population"}) to get variance ${num(varValue)}.`,
          `Standard deviation = √${num(varValue)} = ${num(sd)}.`,
        ],
        verdict: `Values in this ${sample ? "sample" : "population"} sit about ${num(sd)} away from the mean of ${num(m)} on average.`,
      };
    },
    formula: "sample s = √( Σ(x − x̄)² / (n − 1) )   ·   population σ = √( Σ(x − x̄)² / n )",
    example: [
      "Sample data: 2, 4, 4, 4, 5, 5, 7, 9 with a mean of 5.",
      "The squared deviations sum to 32 across 8 values.",
      "Population variance = 32/8 = 4, so σ = 2; sample variance = 32/7 ≈ 4.571, so s ≈ 2.138.",
    ],
    assumptions: [
      "The sample formula divides by n − 1 for an unbiased estimate; the population formula divides by n.",
      "Values are treated as a single flat data set; no grouping or weighting is applied.",
    ],
    faq: [
      { q: "Sample or population?", a: "Use sample when your numbers are a subset used to estimate a wider group; use population when you have every value in the group." },
      { q: "Why divide by n − 1?", a: "Using n − 1 corrects the tendency of a sample to underestimate the true spread of the population." },
      { q: "What does a small standard deviation mean?", a: "Values cluster tightly around the mean. A large one means they are widely spread." },
    ],
    related: ["average", "mean-median-mode", "percentage-change"],
  },

  {
    slug: "ratio",
    title: "Ratio calculator",
    h1: "Ratio calculator",
    category: "math",
    tags: ["ratio", "proportion", "simplify"],
    description: "Simplify any two numbers into their smallest ratio and see the decimal value and each side's share of the total.",
    intro: "A ratio compares two quantities. Enter two positive numbers to reduce them to their simplest form and see how the total splits.",
    inputs: [
      { key: "a", label: "First value (A)", type: "number", default: 4, min: 0, step: 1 },
      { key: "b", label: "Second value (B)", type: "number", default: 6, min: 0, step: 1 },
    ],
    run(v) {
      const a = v.a, b = v.b;
      if (!(a > 0) || !(b > 0)) throw new Error("Enter two positive numbers to form a ratio.");
      const g = gcd(a, b) || 1;
      const sa = a / g, sb = b / g;
      const total = a + b;
      const shareA = (a / total) * 100;
      const shareB = (b / total) * 100;
      const simplified = `${num(sa)} : ${num(sb)}`;
      return {
        primary: { label: "Simplified ratio", value: simplified, format: "text" },
        stats: [
          { label: "Simplified ratio", value: simplified, format: "text" },
          { label: "Decimal value (A ÷ B)", value: a / b, format: "number" },
          { label: "A as % of total", value: shareA, format: "percent" },
          { label: "B as % of total", value: shareB, format: "percent" },
        ],
        steps: [
          `Greatest common divisor of ${num(a)} and ${num(b)} is ${num(g)}.`,
          `Divide both sides by it: ${num(a)}/${num(g)} : ${num(b)}/${num(g)} = ${simplified}.`,
          `Total parts = ${num(total)}, so A is ${num(shareA)}% and B is ${num(shareB)}%.`,
        ],
        verdict: `${num(a)}:${num(b)} simplifies to ${simplified}, with A taking ${num(shareA)}% of the total and B ${num(shareB)}%.`,
      };
    },
    formula: "a : b = (a ÷ gcd) : (b ÷ gcd)   ·   A share = a / (a + b) × 100",
    example: [
      "Ratio 4 : 6, and gcd(4, 6) = 2.",
      "Divide both sides: 4/2 : 6/2 = 2 : 3.",
      "Total parts = 10, so A is 40% and B is 60%.",
    ],
    assumptions: [
      "Both values must be positive; ratios of zero or negatives are not reduced here.",
      "The ratio is scaled by the greatest common divisor, so the proportions between the two numbers never change.",
    ],
    faq: [
      { q: "What does simplifying a ratio do?", a: "It divides both sides by their greatest common divisor so the numbers are as small as possible while keeping the same proportion." },
      { q: "How do I share an amount using this ratio?", a: "Read the percentages: for 4:6, give 40% of the amount to A and 60% to B." },
      { q: "What if the numbers are decimals?", a: "The tool still finds a common divisor, so 1.5 : 2.5 simplifies to 3 : 5." },
    ],
    related: ["percentage", "average", "mean-median-mode"],
  },

  {
    slug: "permutations-combinations",
    title: "Permutations and combinations calculator",
    h1: "Permutations and combinations calculator",
    category: "math",
    tags: ["probability", "permutations", "combinations"],
    description: "Count the permutations or combinations of choosing r items from n, with the exact formula and factorials shown.",
    intro: "Both tools count selections of r items from n. Permutations count order, combinations do not. Choose which one your problem needs.",
    inputs: [
      {
        key: "mode", label: "Order matters?", type: "select", default: "permutations",
        options: [
          { value: "permutations", label: "Yes — permutations P(n, r)" },
          { value: "combinations", label: "No — combinations C(n, r)" },
        ],
      },
      { key: "n", label: "Total items (n)", type: "number", default: 5, min: 0, step: 1 },
      { key: "r", label: "Items chosen (r)", type: "number", default: 2, min: 0, step: 1 },
    ],
    run(v) {
      const n = Math.floor(Number(v.n)), r = Math.floor(Number(v.r));
      if (!Number.isFinite(n) || !Number.isFinite(r)) throw new Error("Enter whole numbers for n and r.");
      if (n < 0 || r < 0) throw new Error("n and r must be zero or greater.");
      if (r > n) throw new Error("r cannot be greater than n — you cannot choose more items than you have.");
      const isPerm = v.mode === "permutations";
      const result = isPerm ? nPr(n, r) : nCr(n, r);
      const factN = factorial(n);
      const formulaStr = isPerm ? "P(n, r) = n! / (n − r)!" : "C(n, r) = n! / (r! × (n − r)!)";
      return {
        primary: { label: isPerm ? `Permutations P(${num(n)}, ${num(r)})` : `Combinations C(${num(n)}, ${num(r)})`, value: result, format: "integer" },
        stats: [
          { label: `Factorial ${num(n)}!`, value: factN, format: "integer" },
          { label: "n", value: n, format: "integer" },
          { label: "r", value: r, format: "integer" },
          { label: "Formula", value: formulaStr, format: "text" },
        ],
        steps: [
          `Use ${formulaStr}.`,
          isPerm
            ? `P(${num(n)}, ${num(r)}) = ${num(factN)} / ${num(factorial(n - r))} = ${num(result)}.`
            : `C(${num(n)}, ${num(r)}) = ${num(factN)} / (${num(factorial(r))} × ${num(factorial(n - r))}) = ${num(result)}.`,
          isPerm ? "Order matters, so AB and BA are counted separately." : "Order does not matter, so AB and BA are the same choice.",
        ],
        verdict: isPerm
          ? `Choosing ${num(r)} from ${num(n)} where order matters gives ${num(result)} arrangements.`
          : `Choosing ${num(r)} from ${num(n)} ignoring order gives ${num(result)} combinations.`,
      };
    },
    formula: "P(n, r) = n! / (n − r)!   ·   C(n, r) = n! / (r! × (n − r)!)",
    example: [
      "Choose 2 from 5 where order matters: P(5, 2) = 5! / 3! = 120 / 6 = 20.",
      "Ignore order: C(5, 2) = 5! / (2! × 3!) = 120 / 12 = 10.",
      "Every combination corresponds to 2! = 2 orderings, which is why the results differ by exactly that factor.",
    ],
    assumptions: [
      "Items are all distinct and each can be used at most once (no repetition).",
      "n and r are treated as non-negative whole numbers; r must not exceed n.",
    ],
    faq: [
      { q: "Permutations or combinations?", a: "Use permutations when the order matters, such as finishing places in a race. Use combinations when it does not, such as choosing lottery numbers." },
      { q: "Why is C(n, r) always smaller than P(n, r)?", a: "Combinations collapse every ordering of the same r items into one group, so they divide out the r! arrangements." },
      { q: "What is 0! ?", a: "By definition 0! = 1, which makes the formulas work when you choose nothing or everything." },
    ],
    related: ["quadratic", "average", "standard-deviation"],
  },

  {
    slug: "quadratic",
    title: "Quadratic equation solver",
    h1: "Quadratic equation solver",
    category: "math",
    tags: ["algebra", "quadratic", "roots"],
    description: "Solve a quadratic equation for real or complex roots, with the discriminant, vertex and axis of symmetry shown.",
    intro: "A quadratic equation ax² + bx + c = 0 has roots given by the quadratic formula. Enter the coefficients to see the roots and the shape of the curve.",
    inputs: [
      { key: "a", label: "Coefficient a (of x²)", type: "number", default: 1, step: 1 },
      { key: "b", label: "Coefficient b (of x)", type: "number", default: -3, step: 1 },
      { key: "c", label: "Constant c", type: "number", default: 2, step: 1 },
    ],
    run(v) {
      const a = v.a, b = v.b, c = v.c;
      if (a === 0) throw new Error("a cannot be 0 — that is a linear equation, not a quadratic.");
      const disc = b * b - 4 * a * c;
      const vx = (-b / (2 * a)) || 0;
      const vy = (a * vx * vx + b * vx + c) || 0;
      let rootsValue, rootsText, kind;
      if (disc > 0) {
        const root = Math.sqrt(disc);
        const x1 = (-b + root) / (2 * a);
        const x2 = (-b - root) / (2 * a);
        rootsValue = `x = ${num(x1)} and x = ${num(x2)}`;
        rootsText = `The discriminant is positive, so there are two distinct real roots: x = ${num(x1)} and x = ${num(x2)}.`;
        kind = "Two distinct real roots (the parabola crosses the x-axis twice).";
      } else if (disc === 0) {
        const x0 = -b / (2 * a);
        rootsValue = `x = ${num(x0)}`;
        rootsText = `The discriminant is zero, so there is one repeated real root: x = ${num(x0)}.`;
        kind = "One repeated real root (the vertex touches the x-axis).";
      } else {
        const real = vx;
        const imag = Math.abs(Math.sqrt(-disc) / (2 * a));
        rootsValue = `x = ${num(vx)} ± ${num(Math.sqrt(-disc) / (2 * a))}i`;
        rootsText = `The discriminant is negative, so there are two complex roots: x = ${num(real)} ± ${num(Math.abs(Math.sqrt(-disc) / (2 * a)))}i.`;
        kind = "The discriminant is negative, so the curve never crosses the x-axis and the roots are complex conjugates.";
      }
      return {
        primary: { label: "Roots", value: rootsValue, format: "text" },
        stats: [
          { label: "Discriminant (b² − 4ac)", value: disc, format: "number" },
          { label: "Vertex x", value: vx, format: "number" },
          { label: "Vertex y", value: vy, format: "number" },
          { label: "Axis of symmetry", value: `x = ${num(vx)}`, format: "text" },
        ],
        steps: [
          `Discriminant D = b² − 4ac = (${num(b)})² − 4 × ${num(a)} × ${num(c)} = ${num(disc)}.`,
          rootsText,
          `Vertex at x = −b / 2a = ${num(vx)}, giving y = ${num(vy)}; the axis of symmetry is x = ${num(vx)}.`,
        ],
        verdict: disc > 0
          ? `This parabola crosses the x-axis twice, at ${num((-b + Math.sqrt(disc)) / (2 * a))} and ${num((-b - Math.sqrt(disc)) / (2 * a))}, with its vertex at (${num(vx)}, ${num(vy)}).`
          : disc === 0
            ? `This parabola touches the x-axis once, at x = ${num(vx)}, which is also its vertex.`
            : `This parabola never meets the x-axis; its roots are complex, x = ${num(vx)} ± ${num(Math.sqrt(-disc) / (2 * a))}i.`,
      };
    },
    formula: "x = ( −b ± √(b² − 4ac) ) / 2a   ·   discriminant D = b² − 4ac   ·   vertex x = −b / 2a",
    example: [
      "Solve x² − 3x + 2 = 0, so a = 1, b = −3, c = 2.",
      "Discriminant = (−3)² − 4 × 1 × 2 = 9 − 8 = 1, which is positive.",
      "Roots: x = (3 ± 1) / 2 = 2 and 1; the vertex sits at x = 1.5, y = −0.25.",
    ],
    assumptions: [
      "Coefficients are real numbers, so a negative discriminant produces a complex-conjugate pair.",
      "a must be non-zero, otherwise the equation is linear rather than quadratic.",
    ],
    faq: [
      { q: "What does the discriminant tell me?", a: "It decides the roots: positive means two real roots, zero means one repeated root, and negative means a complex-conjugate pair." },
      { q: "What is the vertex?", a: "The turning point of the parabola. It lies on the axis of symmetry x = −b / 2a, halfway between the real roots when they exist." },
      { q: "Why can a not be zero?", a: "If a is zero the x² term vanishes and the equation becomes linear, with a single root instead of the quadratic behaviour." },
    ],
    related: ["permutations-combinations", "percentage", "ratio"],
  },
];