// Converters, dates and everyday health calculators.
//
// Written against the catalog schema in js/calc/catalog.js. Pure module: only ../math.js and
// ../format.js are imported, and run() never touches the DOM.

import { bmi, bmr, tdee, daysBetween, weekdaysBetween } from "../math.js";
import { formatNumber } from "../format.js";

const num = (v) => formatNumber(v);
const parseDate = (s) => {
  const d = new Date(`${String(s).trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Enter a date in YYYY-MM-DD form.");
  return d;
};
const fmtDate = (d) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- units
// Factor converts the unit to the category base unit (length→m, mass→kg, volume→L, area→m²,
// speed→m/s, time→s, data→byte). Temperature is non-linear and handled separately.
const UNITS = {
  length: {
    label: "Length",
    units: {
      m: { label: "metre (m)", factor: 1 },
      km: { label: "kilometre (km)", factor: 1000 },
      cm: { label: "centimetre (cm)", factor: 0.01 },
      mm: { label: "millimetre (mm)", factor: 0.001 },
      mi: { label: "mile (mi)", factor: 1609.344 },
      yd: { label: "yard (yd)", factor: 0.9144 },
      ft: { label: "foot (ft)", factor: 0.3048 },
      in: { label: "inch (in)", factor: 0.0254 },
    },
  },
  mass: {
    label: "Mass",
    units: {
      kg: { label: "kilogram (kg)", factor: 1 },
      g: { label: "gram (g)", factor: 0.001 },
      mg: { label: "milligram (mg)", factor: 0.000001 },
      lb: { label: "pound (lb)", factor: 0.45359237 },
      oz: { label: "ounce (oz)", factor: 0.028349523125 },
      t: { label: "tonne (t)", factor: 1000 },
    },
  },
  temperature: {
    label: "Temperature",
    units: {
      C: { label: "Celsius (°C)" },
      F: { label: "Fahrenheit (°F)" },
      K: { label: "Kelvin (K)" },
    },
  },
  volume: {
    label: "Volume",
    units: {
      L: { label: "litre (L)", factor: 1 },
      mL: { label: "millilitre (mL)", factor: 0.001 },
      gal: { label: "US gallon (gal)", factor: 3.785411784 },
      qt: { label: "US quart (qt)", factor: 0.946352946 },
      floz: { label: "US fluid ounce (fl oz)", factor: 0.0295735295625 },
    },
  },
  area: {
    label: "Area",
    units: {
      m2: { label: "square metre (m²)", factor: 1 },
      km2: { label: "square kilometre (km²)", factor: 1000000 },
      ha: { label: "hectare (ha)", factor: 10000 },
      ft2: { label: "square foot (ft²)", factor: 0.09290304 },
      ac: { label: "acre (ac)", factor: 4046.8564224 },
    },
  },
  speed: {
    label: "Speed",
    units: {
      ms: { label: "metre/second (m/s)", factor: 1 },
      kmh: { label: "kilometre/hour (km/h)", factor: 0.2777777777777778 },
      mph: { label: "mile/hour (mph)", factor: 0.44704 },
      kn: { label: "knot (kn)", factor: 0.5144444444444445 },
    },
  },
  time: {
    label: "Time",
    units: {
      s: { label: "second (s)", factor: 1 },
      min: { label: "minute (min)", factor: 60 },
      h: { label: "hour (h)", factor: 3600 },
      day: { label: "day", factor: 86400 },
      week: { label: "week", factor: 604800 },
    },
  },
  data: {
    label: "Data",
    units: {
      B: { label: "byte (B)", factor: 1 },
      KB: { label: "kilobyte (KB, 1024)", factor: 1024 },
      MB: { label: "megabyte (MB, 1024²)", factor: 1048576 },
      GB: { label: "gigabyte (GB, 1024³)", factor: 1073741824 },
      TB: { label: "terabyte (TB, 1024⁴)", factor: 1099511627776 },
    },
  },
};

/** Find which category a unit key belongs to. */
function unitCategory(key) {
  for (const [id, group] of Object.entries(UNITS)) {
    if (group.units[key]) return id;
  }
  return null;
}

/** All unit options for the shared from/to selects, labelled with their category. */
const UNIT_OPTIONS = Object.entries(UNITS).flatMap(([id, group]) =>
  Object.entries(group.units).map(([key, u]) => ({ value: key, label: `${u.label} · ${group.label}` })));

function toCelsius(value, unit) {
  if (unit === "F") return (value - 32) * (5 / 9);
  if (unit === "K") return value - 273.15;
  return value;
}
function fromCelsius(c, unit) {
  if (unit === "F") return c * (9 / 5) + 32;
  if (unit === "K") return c + 273.15;
  return c;
}

export const GENERAL = [
  {
    slug: "unit-converter",
    title: "Unit converter",
    h1: "Unit converter (length, mass, temperature, volume, area, speed, time, data)",
    category: "general",
    tags: ["convert", "units", "metric", "imperial"],
    description: "Convert between metric and imperial units of length, mass, temperature, volume, area, speed, time and data.",
    intro: "Convert a value from one unit to another across eight common categories, using exact standard conversion factors.",
    inputs: [
      {
        key: "category", label: "Category", type: "select", default: "length",
        options: Object.entries(UNITS).map(([id, g]) => ({ value: id, label: g.label })),
      },
      { key: "value", label: "Value to convert", type: "number", default: 1, step: "any" },
      { key: "from", label: "From unit", type: "select", default: "m", options: UNIT_OPTIONS },
      { key: "to", label: "To unit", type: "select", default: "ft", options: UNIT_OPTIONS, help: "Pick a unit from the same category as the one you are converting from." },
    ],
    run(v) {
      const { category, from, to } = v;
      const group = UNITS[category];
      if (!group) throw new Error("Choose a category.");
      if (!group.units[from]) throw new Error(`“${from}” is not a ${group.label.toLowerCase()} unit. Pick a ‘from’ unit from the selected category.`);
      if (!group.units[to]) throw new Error(`“${to}” is not a ${group.label.toLowerCase()} unit. Pick a ‘to’ unit from the selected category.`);
      const value = Number(v.value);

      let result;
      if (category === "temperature") {
        result = fromCelsius(toCelsius(value, from), to);
      } else {
        const base = value * group.units[from].factor;
        result = base / group.units[to].factor;
      }
      const fromLabel = group.units[from].label;
      const toLabel = group.units[to].label;
      return {
        primary: { label: `${num(value)} ${fromLabel} =`, value: `${formatNumber(result, { maxFrac: result !== 0 && (Math.abs(result) < 0.001 || Math.abs(result) >= 1e9) ? 6 : 4 })} ${toLabel.split(" (")[0]}`, format: "text" },
        stats: [
          { label: "From", value: `${num(value)} ${fromLabel}`, format: "text" },
          { label: "Category", value: group.label, format: "text" },
          { label: "Converted value", value: result, format: "number" },
        ],
        steps: [
          category === "temperature"
            ? `Convert ${num(value)} ${from} to Celsius, then to ${to}.`
            : `Convert ${num(value)} ${from} to the base unit, then divide by the ${to} factor.`,
          `${num(value)} ${from} = ${formatNumber(result, { maxFrac: 6 })} ${to}.`,
        ],
        verdict: `${num(value)} ${fromLabel} equals ${formatNumber(result, { maxFrac: 6 })} ${toLabel}.`,
      };
    },
    formula: "result = value × (factor_from / factor_to), with temperature handled by dedicated formulas",
    example: [
      "Convert 1 metre to feet: 1 × 1 / 0.3048 = 3.2808 ft.",
      "Convert 70 kg to pounds: 70 × 1 / 0.45359237 = 154.32 lb.",
      "Convert 100 °C to Fahrenheit: 100 × 9/5 + 32 = 212 °F.",
    ],
    assumptions: [
      "US (not imperial/UK) liquid gallons and fluid ounces are used for volume.",
      "Data units use binary multiples (1 KB = 1024 bytes).",
      "Factors are exact defined values; the displayed result is rounded for readability.",
    ],
    faq: [
      { q: "Why do I have to pick units from the same category?", a: "Converting metres to kilograms has no meaning. The unit labels show their category so you can pick a matching pair." },
      { q: "Are the conversion factors exact?", a: "Yes. The factors used (mile, foot, inch, pound, ounce, gallon and so on) are the international standard definitions, stored as exact decimals." },
      { q: "Why does a kilobyte show as 1024 bytes?", a: "Digital storage is commonly reported in binary multiples (1 KB = 1024 B). Some vendors use 1000; this tool follows the 1024 convention and says so." },
    ],
    related: ["percentage", "ratio", "bmi"],
  },

  {
    slug: "date-difference",
    title: "Date difference calculator",
    h1: "Date difference calculator",
    category: "general",
    tags: ["dates", "days between", "time"],
    description: "Find the number of days, weeks, months, years and business days between two dates.",
    intro: "Enter two dates to see the time between them in days and other units, including the number of weekdays.",
    inputs: [
      { key: "start", label: "Start date", type: "date", default: "2026-01-01" },
      { key: "end", label: "End date", type: "date", default: "2026-12-31" },
    ],
    run(v) {
      const a = parseDate(v.start), b = parseDate(v.end);
      const days = daysBetween(a, b);
      const business = weekdaysBetween(a, b);
      const sign = days < 0 ? -1 : 1;
      return {
        primary: { label: "Days between", value: Math.abs(days), format: "integer" },
        stats: [
          { label: "Weeks", value: Math.abs(days) / 7, format: "number" },
          { label: "Months (approx.)", value: Math.abs(days) / 30.4375, format: "number" },
          { label: "Years (approx.)", value: Math.abs(days) / 365.25, format: "number" },
          { label: "Weekdays (Mon–Fri)", value: Math.abs(business), format: "integer" },
        ],
        steps: [
          `${fmtDate(a)} → ${fmtDate(b)}.`,
          `Calendar days = ${Math.abs(days)}.`,
          `Weekdays (Monday–Friday) in the same span = ${Math.abs(business)}.`,
        ],
        verdict: `There are ${num(Math.abs(days))} days (${num(Math.abs(business))} weekdays) between ${fmtDate(a)} and ${fmtDate(b)}${sign < 0 ? ", counting backwards because the end is before the start" : ""}.`,
      };
    },
    formula: "days = floor((end − start) / 86,400,000)  ·  weekdays counted Mon–Fri",
    example: [
      "From 2026-01-01 to 2026-12-31.",
      "That is 364 calendar days.",
      "Of those, 260 are Monday–Friday (business days).",
    ],
    assumptions: [
      "Dates are treated as whole days; times of day are ignored.",
      "Months and years here are averages (30.44 and 365.25 days) for a single figure, not calendar months.",
      "Public holidays are not excluded — use the business-days calculator for that.",
    ],
    faq: [
      { q: "Are weekends excluded?", a: "The ‘business days’ figure counts Monday–Friday only. The headline ‘days’ figure counts every calendar day." },
      { q: "Is one endpoint included?", a: "The result is the number of whole days from the start up to (but not including) the end date, which is the usual convention for a duration." },
      { q: "Why is the month figure approximate?", a: "Calendar months have 28–31 days, so a single average is used. For exact month counting, compare the two dates month by month." },
    ],
    related: ["business-days", "age"],
  },

  {
    slug: "business-days",
    title: "Business days calculator",
    h1: "Business days calculator",
    category: "general",
    tags: ["dates", "working days", "business"],
    description: "Count working days between two dates, optionally excluding public holidays.",
    intro: "Work out how many Monday–Friday days fall between two dates, minus any public holidays you need to exclude.",
    inputs: [
      { key: "start", label: "Start date", type: "date", default: "2026-01-01" },
      { key: "end", label: "End date", type: "date", default: "2026-01-31" },
      { key: "holidays", label: "Public holidays to exclude", type: "number", default: 0, min: 0, max: 366, step: 1, optional: true },
    ],
    run(v) {
      const a = parseDate(v.start), b = parseDate(v.end);
      const calendar = daysBetween(a, b);
      const weekdays = weekdaysBetween(a, b);
      const working = weekdays - v.holidays;
      return {
        primary: { label: "Working days", value: working, format: "integer" },
        stats: [
          { label: "Calendar days", value: daysBetween(a, b), format: "integer" },
          { label: "Weekdays (Mon–Fri)", value: weekdays, format: "integer" },
          { label: "Holidays excluded", value: v.holidays, format: "integer" },
        ],
        steps: [
          `Weekdays between the two dates = ${weekdays}.`,
          `Subtract ${num(v.holidays)} public holiday${v.holidays === 1 ? "" : "s"}.`,
          `Working days = ${weekdays - v.holidays}.`,
        ],
        verdict: `There are ${weekdays - v.holidays} working days between ${fmtDate(a)} and ${fmtDate(b)}.`,
      };
    },
    formula: "working days = weekdays(Mon–Fri) − public holidays",
    example: [
      "From 2026-01-01 to 2026-01-31.",
      "There are 22 Monday–Friday days in that span.",
      "Excluding one public holiday leaves 21 working days.",
    ],
    assumptions: [
      "The working week is Monday–Friday.",
      "You enter the number of public holidays yourself, since holiday calendars differ by country.",
      "The start day is counted and the end day is not.",
    ],
    faq: [
      { q: "Does it know my country's holidays?", a: "No — holiday calendars vary and change, so you enter the count. The weekday count itself is exact." },
      { q: "Can the result be negative?", a: "If you exclude more holidays than there are weekdays, the count goes negative, which warns you to check the numbers." },
    ],
    related: ["date-difference", "age"],
  },

  {
    slug: "bmi",
    title: "BMI calculator",
    h1: "BMI calculator (body mass index)",
    category: "general",
    tags: ["health", "bmi", "weight"],
    description: "Calculate body mass index from height and weight in metric or imperial units, with the standard category.",
    intro: "BMI is a quick screening ratio of weight to height. It is a rough population measure, not a diagnosis.",
    inputs: [
      { key: "units", label: "Units", type: "select", default: "metric", options: [{ value: "metric", label: "Metric (kg, cm)" }, { value: "imperial", label: "Imperial (lb, in)" }] },
      { key: "weight", label: "Weight (kg or lb)", type: "number", default: 70, min: 1, step: 0.5 },
      { key: "height", label: "Height (cm or in)", type: "number", default: 175, min: 1, step: 0.5 },
    ],
    run(v) {
      let kg = Number(v.weight), cm = Number(v.height);
      if (v.units === "imperial") { kg = kg * 0.45359237; cm = cm * 2.54; }
      if (cm <= 0) throw new Error("Enter a height greater than zero.");
      const value = bmi(kg, cm);
      const band = value < 18.5 ? "Underweight" : value < 25 ? "Healthy weight" : value < 30 ? "Overweight" : "Obese";
      return {
        primary: { label: "Body mass index", value, format: "number" },
        stats: [
          { label: "Category", value: band, format: "text" },
          { label: "Height (cm)", value: cm, format: "number" },
          { label: "Weight (kg)", value: kg, format: "number" },
        ],
        steps: [
          `BMI = weight / height² = ${num(kg)} / (${num(cm / 100)})².`,
          `BMI = ${formatNumber(value, 1)}, which falls in the “${band}” band.`,
        ],
        verdict: `A BMI of ${formatNumber(value, 1)} sits in the “${band}” band (World Health Organization cut-offs). BMI ignores muscle, frame and fat distribution.`,
      };
    },
    formula: "BMI = weight(kg) / height(m)²",
    example: [
      "70 kg and 175 cm.",
      "Height in metres = 1.75 m; squared = 3.0625.",
      "BMI = 70 / 3.0625 = 22.9, in the healthy range.",
    ],
    assumptions: [
      "Uses the World Health Organization adult cut-offs (18.5, 25, 30).",
      "BMI does not distinguish muscle from fat and is not reliable for athletes, children or pregnancy.",
      "General population estimate only — not medical advice.",
    ],
    faq: [
      { q: "Is BMI a diagnosis?", a: "No. It is a screening tool for populations. A clinician looks at body composition, history and other measurements." },
      { q: "Why might BMI be misleading?", a: "Muscular people can have a high BMI while carrying little fat, and older adults can have a ‘healthy’ BMI with low muscle." },
      { q: "Are the cut-offs the same for everyone?", a: "No. Different thresholds are used for children and some populations; this tool uses the WHO adult scale." },
    ],
    related: ["bmr-tdee", "percentage"],
  },

  {
    slug: "bmr-tdee",
    title: "BMR and TDEE calculator",
    h1: "BMR and TDEE calculator (daily calories)",
    category: "general",
    tags: ["health", "calories", "bmr", "tdee"],
    description: "Estimate basal metabolic rate and total daily energy expenditure with the Mifflin-St Jeor equation and activity levels.",
    intro: "BMR is the energy you would burn at complete rest; TDEE adds your daily activity. Together they estimate calorie needs.",
    inputs: [
      { key: "weight", label: "Weight (kg)", type: "number", default: 70, min: 1, step: 0.5 },
      { key: "height", label: "Height (cm)", type: "number", default: 175, min: 1, step: 0.5 },
      { key: "age", label: "Age (years)", type: "number", default: 30, min: 1, max: 120, step: 1 },
      { key: "sex", label: "Sex", type: "select", default: "male", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }] },
      {
        key: "activity", label: "Activity level", type: "select", default: "moderate",
        options: [
          { value: "sedentary", label: "Sedentary (little exercise)" },
          { value: "light", label: "Light (1–3 days/week)" },
          { value: "moderate", label: "Moderate (3–5 days/week)" },
          { value: "active", label: "Active (6–7 days/week)" },
          { value: "athlete", label: "Very active / athlete" },
        ],
      },
    ],
    run(v) {
      const basal = bmr({ kg: v.weight, cm: v.height, age: v.age, sex: v.sex });
      const total = tdee(basal, v.activity);
      return {
        primary: { label: "Total daily energy (TDEE)", value: total, format: "number" },
        stats: [
          { label: "Basal metabolic rate (BMR)", value: basal, format: "number" },
          { label: "Mild weight loss (−250 kcal)", value: total - 250, format: "number" },
          { label: "Weight loss (−500 kcal)", value: total - 500, format: "number" },
          { label: "Weight gain (+500 kcal)", value: total + 500, format: "number" },
        ],
        steps: [
          `Mifflin-St Jeor BMR = 10 × ${num(v.weight)} + 6.25 × ${num(v.height)} − 5 × ${num(v.age)} ${v.sex === "female" ? "− 161" : "+ 5"}.`,
          `BMR = ${num(basal)} kcal/day.`,
          `TDEE = BMR × activity factor = ${num(total)} kcal/day.`,
        ],
        verdict: `Your estimated maintenance intake is about ${num(total)} kcal a day; BMR (at complete rest) is ${num(basal)} kcal.`,
      };
    },
    formula: "Mifflin-St Jeor: BMR = 10·kg + 6.25·cm − 5·age + (male ? +5 : −161)  ·  TDEE = BMR × activity factor",
    example: [
      "Male, 70 kg, 175 cm, 30 years, moderately active.",
      "BMR = 700 + 1093.75 − 150 + 5 = 1648.75 kcal.",
      "TDEE = 1648.75 × 1.55 ≈ 2556 kcal a day.",
    ],
    assumptions: [
      "Uses the Mifflin-St Jeor equation, a common clinical estimate.",
      "Activity multipliers are averages and can be off by a few hundred calories.",
      "General estimate only — not medical advice; individual needs vary.",
    ],
    faq: [
      { q: "BMR versus TDEE?", a: "BMR is the energy to stay alive at rest. TDEE is BMR multiplied by an activity factor, giving what you actually burn in a day." },
      { q: "How accurate is this?", a: "It is a good starting estimate but individual metabolism varies. Track weight over a few weeks and adjust." },
      { q: "Why is there a 5 / −161 difference?", a: "The Mifflin-St Jeor equation uses a different constant for males and females to account for average differences in body composition." },
    ],
    related: ["bmi", "percentage"],
  },

  {
    slug: "age",
    title: "Age calculator",
    h1: "Age calculator (exact age from a birth date)",
    category: "general",
    tags: ["dates", "age", "birthday"],
    description: "Calculate exact age in years, months and days from a birth date, plus total days and days to the next birthday.",
    intro: "Enter a birth date to see an exact age in years, months and days, along with totals and the next birthday.",
    inputs: [
      { key: "birth", label: "Date of birth", type: "date", default: "1990-06-15" },
      { key: "asof", label: "Age on date", type: "date", default: "2026-10-14" },
    ],
    run(v) {
      const birth = parseDate(v.birth), asof = parseDate(v.asof);
      if (birth > asof) throw new Error("The date of birth must be on or before the as-of date.");
      let years = asof.getFullYear() - birth.getFullYear();
      let months = asof.getMonth() - birth.getMonth();
      let days = asof.getDate() - birth.getDate();
      if (days < 0) { months -= 1; days += new Date(asof.getFullYear(), asof.getMonth(), 0).getDate(); }
      if (months < 0) { years -= 1; months += 12; }
      const totalDays = daysBetween(birth, asof);
      const next = new Date(asof.getFullYear(), birth.getMonth(), birth.getDate());
      if (next < asof) next.setFullYear(asof.getFullYear() + 1);
      const toNext = daysBetween(asof, next);
      return {
        primary: { label: "Exact age", value: `${years} years ${months} months ${days} days`, format: "text" },
        stats: [
          { label: "Total days", value: totalDays, format: "integer" },
          { label: "Total weeks", value: Math.floor(totalDays / 7), format: "integer" },
          { label: "Total months", value: years * 12 + months, format: "integer" },
          { label: "Days to next birthday", value: toNext, format: "integer" },
        ],
        steps: [
          `From ${fmtDate(birth)} to ${fmtDate(asof)}.`,
          `Whole years first, then whole months, then the remaining days: ${years} y ${months} mo ${days} d.`,
          `That is ${totalDays} days in total; the next birthday is in ${toNext} days.`,
        ],
        verdict: `On ${fmtDate(asof)} the person is ${years} years, ${months} months and ${days} days old (${totalDays} days in total).`,
      };
    },
    formula: "Count whole years, then whole months, then remaining days between the two dates.",
    example: [
      "Born 1990-06-15, aged on 2026-10-14.",
      "36 years and 3 months have passed, plus 29 days.",
      "Total days alive: 13,269; next birthday in 244 days.",
    ],
    assumptions: [
      "Whole-day arithmetic; the time of day is ignored.",
      "The as-of date defaults to a fixed date provided with the page.",
      "Leap days are handled by the calendar, not by an averaging formula.",
    ],
    faq: [
      { q: "Why months and days as well as years?", a: "Because ‘34 years’ hides how close someone is to 35. Exact years, months and days is what official forms usually ask for." },
      { q: "How is the next birthday counted?", a: "It is the number of whole days from the as-of date to the next occurrence of the birth month and day." },
    ],
    related: ["date-difference", "business-days"],
  },
];

export { UNITS, unitCategory };
