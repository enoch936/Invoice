import "./app.js";
import "./site.js";
import { gpa, requiredGpa } from "./quant.js";
const $ = (id) => document.getElementById(id);
const SCALE = { "A+": 4, A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7, "C+": 2.3, C: 2, "C-": 1.7, "D+": 1.3, D: 1, F: 0 };
const KEY = "parchxa.gpaCourses.v1";
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return Array.isArray(v) ? v.slice(0, 40) : null; } catch { return null; } };
let rows = load() || [{ name: "Course 1", credits: 3, grade: "A" }, { name: "Course 2", credits: 3, grade: "B+" }, { name: "Course 3", credits: 4, grade: "A-" }];

function render() {
  const wrap = $("courses"); wrap.replaceChildren();
  rows.forEach((r, i) => {
    const row = document.createElement("div"); row.className = "course-row";
    const name = Object.assign(document.createElement("input"), { value: r.name, maxLength: 40, ariaLabel: "Course name" });
    const cr = Object.assign(document.createElement("input"), { type: "number", min: "0", max: "30", step: "0.5", value: r.credits, ariaLabel: "Credits" });
    const gr = document.createElement("select"); gr.ariaLabel = "Grade";
    Object.keys(SCALE).forEach((g) => gr.add(new Option(g, g, false, g === r.grade)));
    const del = Object.assign(document.createElement("button"), { type: "button", className: "remove-item", textContent: "×", ariaLabel: "Remove course" });
    name.oninput = () => { r.name = name.value.slice(0, 40); calc(); };
    cr.oninput = () => { r.credits = Number(cr.value); calc(); };
    gr.onchange = () => { r.grade = gr.value; calc(); };
    del.onclick = () => { rows.splice(i, 1); render(); calc(); };
    row.append(name, cr, gr, del); wrap.append(row);
  });
}
function calc() {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
  const res = gpa(rows.map((r) => ({ credits: r.credits, points: SCALE[r.grade] })));
  $("gpa-result").textContent = res ? res.gpa.toFixed(2) : "—";
  $("gpa-detail").textContent = res ? `${res.credits} credits on a 4.0 scale. Check your school's own scale.` : "Add a course with credits above 0.";
  const f = $("plan-form"), v = (n) => Number(f.elements[n].value);
  const need = requiredGpa({ currentGpa: v("cgpa"), currentCredits: v("ccred"), remainingCredits: v("rcred"), target: v("target") });
  $("plan-result").textContent = Number.isFinite(need) ? need.toFixed(2) : "—";
  $("plan-detail").textContent = !Number.isFinite(need) ? "Enter remaining credits above 0." : need > 4 ? "Above 4.0: this target is not reachable in the remaining credits on a 4.0 scale." : need <= 0 ? "You already exceed this target; any passing grades keep you above it." : "Average GPA you need across the remaining credits.";
}
$("add-course").onclick = () => { if (rows.length < 40) { rows.push({ name: "Course " + (rows.length + 1), credits: 3, grade: "B" }); render(); calc(); } };
$("plan-form").addEventListener("input", calc);
render(); calc();
