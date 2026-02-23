// MedCalculationPro MVP — client-side only

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STORAGE_KEY = "medcalcpro_history_v1";
const THEME_KEY  = "medcalcpro_theme_v1";
const FAV_KEY    = "medcalcpro_favorites_v1";

function roundTo(n, dp = 2){
  if (!isFinite(n)) return NaN;
  const p = Math.pow(10, dp);
  return Math.round(n * p) / p;
}

function toKg(value, unit){
  const v = Number(value);
  if (!isFinite(v) || v < 0) return NaN;
  return unit === "lb" ? v / 2.2046226218 : v;
}

function toCm(value, unit){
  const v = Number(value);
  if (!isFinite(v) || v < 0) return NaN;
  return unit === "in" ? v * 2.54 : v;
}

function scrToMgDl(value, unit){
  const v = Number(value);
  if (!isFinite(v) || v <= 0) return NaN;
  return unit === "umol" ? v / 88.4 : v;
}

/* ---- Badge helper ---- */
function badge(text, level){
  const cls = level === "ok" ? "badge-ok" : level === "warn" ? "badge-warn" : "badge-bad";
  return ` <span class="result-badge ${cls}">${text}</span>`;
}

function setResult(el, html, status=""){
  el.classList.remove("ok","bad");
  if (status) el.classList.add(status);
  el.innerHTML = html;
  injectResultActions(el);
}

/* ---- Copy / Print action buttons ---- */
function injectResultActions(el){
  const old = el.querySelector(".result-actions");
  if (old) old.remove();
  if (!el.innerHTML.trim()) return;
  const bar = document.createElement("div");
  bar.className = "result-actions";
  bar.innerHTML = `<button class="btn-copy" type="button" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button><button class="btn-print" type="button" title="Print"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print</button>`;
  el.appendChild(bar);
  bar.querySelector(".btn-copy").addEventListener("click", () => {
    const text = el.innerText.replace(/Copy|Print|Copied!/g, "").trim();
    navigator.clipboard.writeText(text).then(() => {
      const b = bar.querySelector(".btn-copy");
      const orig = b.innerHTML;
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => { b.innerHTML = orig; }, 1800);
    });
  });
  bar.querySelector(".btn-print").addEventListener("click", () => {
    const text = el.innerText.replace(/Copy|Print|Copied!/g, "").trim();
    const card = el.closest(".card");
    const title = card ? (card.querySelector("h2")?.textContent || "Result") : "Result";
    const w = window.open("","_blank","width=600,height=400");
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a}h1{font-size:20px;margin-bottom:12px}pre{white-space:pre-wrap;font-size:14px;line-height:1.6;background:#f5f5f5;padding:16px;border-radius:8px}footer{margin-top:24px;font-size:11px;color:#888}</style></head><body><h1>${title}</h1><pre>${text}</pre><footer>MedCalculationPro — ${new Date().toLocaleString()}</footer></body></html>`);
    w.document.close(); w.focus(); w.print();
  });
}

function nowStamp(){
  const d = new Date();
  return d.toLocaleString();
}

function loadHistory(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
}

function addHistoryItem(type, summary, valueLine){
  const items = loadHistory();
  items.unshift({
    t: nowStamp(),
    type,
    summary,
    valueLine
  });
  saveHistory(items);
  renderHistory();
}

function renderHistory(){
  const box = $("#history");
  const items = loadHistory();
  if (!items.length){
    box.innerHTML = `<p class="muted tiny">No saved results yet.</p>`;
    return;
  }
  box.innerHTML = items.map((it, idx) => `
    <div class="history-item" data-idx="${idx}">
      <div class="meta">${it.t} • ${escapeHtml(it.type)}</div>
      <div class="val">${escapeHtml(it.valueLine)}</div>
      <div class="muted tiny">${escapeHtml(it.summary)}</div>
    </div>
  `).join("");
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Navigation + search — smooth transition
function showCalc(id){
  const current = $(".calc.active");
  const next = document.getElementById(id);
  if (!next || next === current) return;

  $$(".nav-item").forEach(b => b.classList.remove("active"));
  const btn = $(`.nav-item[data-target="${id}"]`);
  if (btn) btn.classList.add("active");

  if (current) {
    current.classList.add("exiting");
    current.addEventListener("animationend", function handler(){
      current.removeEventListener("animationend", handler);
      current.classList.remove("active","exiting");
      next.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, { once: true });
    // Fallback in case animationend doesn't fire
    setTimeout(() => {
      if (current.classList.contains("exiting")){
        current.classList.remove("active","exiting");
        next.classList.add("active");
      }
    }, 350);
  } else {
    next.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

$$(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => showCalc(btn.dataset.target));
});

$("#searchInput").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const buttons = $$(".nav-item");
  buttons.forEach(b => {
    const target = document.getElementById(b.dataset.target);
    const name = (target?.dataset.name || "").toLowerCase();
    const show = !q || name.includes(q) || b.textContent.toLowerCase().includes(q);
    b.style.display = show ? "" : "none";
  });
  // Hide empty category headers while searching
  $$(".nav-category").forEach(cat => {
    if (!q) { cat.style.display = ""; return; }
    let next = cat.nextElementSibling;
    let anyVisible = false;
    while (next && !next.classList.contains("nav-category")) {
      if (next.classList.contains("nav-item") && next.style.display !== "none") anyVisible = true;
      next = next.nextElementSibling;
    }
    cat.style.display = anyVisible ? "" : "none";
  });
});

// Theme
const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
const SUN_SVG = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

function updateThemeIcon(theme){
  const icon = $("#iconTheme");
  if (icon) icon.innerHTML = theme === "dark" ? MOON_SVG : SUN_SVG;
}

function applyTheme(theme){
  if (theme === "light") document.documentElement.setAttribute("data-theme","light");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem(THEME_KEY, theme);
  updateThemeIcon(theme);
}
$("#btnTheme").addEventListener("click", () => {
  const cur = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
});

// Reset buttons
$$("[data-reset]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.reset;
    const form = document.getElementById(id);
    if (form) form.reset();
    // Clear related result box — auto-detect by convention: formXxx -> xxxResult or specific map
    const map = {
      formCrCl: "#crclResult",
      formMgKg: "#mgkgResult",
      formInfusion: "#infResult",
      formBsa: "#bsaResult",
      formGfr: "#gfrResult",
      formIbw: "#ibwResult",
      formBmi: "#bmiResult",
      formChadsvasc: "#chadsvascResult",
      formHeart: "#heartResult",
      formQtc: "#qtcResult",
      formMap: "#mapResult",
      formHasbled: "#hasbledResult",
      formGcs: "#gcsResult",
      formWellsPe: "#wellsPeResult",
      formWellsDvt: "#wellsDvtResult",
      formPerc: "#percResult",
      formCurb65: "#curb65Result",
      formQsofa: "#qsofaResult",
      formNews2: "#news2Result",
      formParkland: "#parklandResult",
      formNa: "#naResult",
      formCa: "#caResult",
      formAnion: "#anionResult",
      formWinters: "#wintersResult",
      formOsm: "#osmResult",
      formAa: "#aaResult",
      formFena: "#fenaResult",
      formMeld: "#meldResult",
      formChildpugh: "#childpughResult",
      formFib4: "#fib4Result",
      formNihss: "#nihssResult",
      formAbcd2: "#abcd2Result",
      formMdrd: "#mdrdResult",
      formFreewater: "#freewaterResult",
      formPsi: "#psiResult",
      formPesi: "#pesiResult",
      formYears: "#yearsResult",
      formAbg: "#abgResult",
      formSofa: "#sofaResult",
      formSirs: "#sirsResult",
      formApache2: "#apache2Result",
      formMaintenance: "#maintenanceResult",
      formAscvd: "#ascvdResult",
      formRcri: "#rcriResult",
      formGrace: "#graceResult",
      formLdl: "#ldlResult",
      formAlvarado: "#alvaradoResult",
      formGbs: "#gbsResult",
      formCaprini: "#capriniResult",
      formPadua: "#paduaResult",
      formCentor: "#centorResult",
      formCiwa: "#ciwaResult",
      formHoma: "#homaResult",
      formPhq9: "#phq9Result",
      formPecarn: "#pecarnResult",
      formPregnancy: "#pregnancyResult",
      formSteroid: "#steroidResult",
      formCanadian: "#canadianResult"
    };
    if (map[id]) setResult($(map[id]), "");
  });
});

// Clear history
$("#btnClearHistory").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
});

// ---- Calculator: CrCl (Cockcroft–Gault)
$("#formCrCl").addEventListener("submit", (e) => {
  e.preventDefault();
  const age = Number($("#crclAge").value);
  const sex = $("#crclSex").value;
  const wt = toKg($("#crclWeight").value, $("#crclWeightUnit").value);
  const scr = scrToMgDl($("#crclScr").value, $("#crclScrUnit").value);

  const out = $("#crclResult");
  if (!(age > 0) || !(wt > 0) || !(scr > 0)){
    setResult(out, `<span class="bad">Please enter valid positive values.</span>`, "bad");
    return;
  }

  let crcl = ((140 - age) * wt) / (72 * scr);
  if (sex === "female") crcl *= 0.85;

  crcl = roundTo(crcl, 1);
  setResult(out, `<div><strong>Estimated CrCl:</strong> <span class="ok">${crcl} mL/min</span></div>`, "ok");

  addHistoryItem(
    "CrCl",
    `Age ${age}y, wt ${roundTo(wt,1)}kg, SCr ${roundTo(scr,2)} mg/dL, sex ${sex}`,
    `CrCl ≈ ${crcl} mL/min`
  );
});

// ---- Calculator: mg/kg
$("#formMgKg").addEventListener("submit", (e) => {
  e.preventDefault();
  const wt = toKg($("#mgkgWeight").value, $("#mgkgWeightUnit").value);
  const dose = Number($("#mgkgDose").value);
  const maxDose = $("#mgkgMax").value.trim() ? Number($("#mgkgMax").value) : null;

  const out = $("#mgkgResult");
  if (!(wt > 0) || !(dose >= 0)){
    setResult(out, `<span class="bad">Please enter valid values.</span>`, "bad");
    return;
  }

  let total = wt * dose;
  const raw = total;

  let note = "";
  if (maxDose && isFinite(maxDose) && maxDose > 0 && total > maxDose){
    total = maxDose;
    note = ` (capped at max dose)`;
  }

  total = roundTo(total, 2);

  setResult(out,
    `<div><strong>Total dose:</strong> <span class="ok">${total} mg</span>${note}</div>
     <div class="muted tiny">Weight: ${roundTo(wt,2)} kg • Dose: ${dose} mg/kg • Raw: ${roundTo(raw,2)} mg</div>`,
    "ok"
  );

  addHistoryItem(
    "mg/kg",
    `wt ${roundTo(wt,2)}kg, dose ${dose} mg/kg${maxDose ? `, max ${maxDose}mg` : ""}`,
    `Total dose = ${total} mg`
  );
});

// ---- Calculator: Infusion
$("#formInfusion").addEventListener("submit", (e) => {
  e.preventDefault();
  const dose = Number($("#infDose").value);
  const doseUnit = $("#infDoseUnit").value;

  const wt = $("#infWeight").value.trim()
    ? toKg($("#infWeight").value, $("#infWeightUnit").value)
    : NaN;

  const conc = Number($("#infConc").value);
  const concUnit = $("#infConcUnit").value;

  const out = $("#infResult");
  if (!(dose >= 0) || !(conc > 0)){
    setResult(out, `<span class="bad">Please enter valid values.</span>`, "bad");
    return;
  }

  // Convert concentration to mcg/mL base
  const conc_mcg_ml = concUnit === "mgml" ? conc * 1000 : conc;

  // Convert ordered dose to mcg/min base
  let ordered_mcg_min = NaN;

  if (doseUnit === "mcgkgmin" || doseUnit === "mckgmin"){
    if (!(wt > 0)){
      setResult(out, `<span class="bad">Weight is required for mcg/kg/min.</span>`, "bad");
      return;
    }
    ordered_mcg_min = dose * wt;
  } else if (doseUnit === "mcgmin"){
    ordered_mcg_min = dose;
  } else if (doseUnit === "mghr"){
    // mg/hr -> mcg/min
    ordered_mcg_min = (dose * 1000) / 60;
  }

  if (!isFinite(ordered_mcg_min) || ordered_mcg_min < 0){
    setResult(out, `<span class="bad">Unable to interpret ordered dose.</span>`, "bad");
    return;
  }

  // mL/min = mcg/min ÷ (mcg/mL)
  const ml_min = ordered_mcg_min / conc_mcg_ml;
  const ml_hr = ml_min * 60;

  const mlhr = roundTo(ml_hr, 2);

  setResult(out,
    `<div><strong>Infusion rate:</strong> <span class="ok">${mlhr} mL/hr</span></div>
     <div class="muted tiny">Ordered: ${roundTo(ordered_mcg_min,2)} mcg/min • Concentration: ${roundTo(conc_mcg_ml,2)} mcg/mL</div>`,
    "ok"
  );

  addHistoryItem(
    "Infusion",
    `${dose} ${doseUnit}${(doseUnit.includes("kg") ? ` @ wt ${roundTo(wt,1)}kg` : "")}, conc ${conc} ${concUnit}`,
    `Rate = ${mlhr} mL/hr`
  );
});

// ---- Calculator: BSA
$("#formBsa").addEventListener("submit", (e) => {
  e.preventDefault();
  const wt = toKg($("#bsaWeight").value, $("#bsaWeightUnit").value);
  const ht = toCm($("#bsaHeight").value, $("#bsaHeightUnit").value);

  const out = $("#bsaResult");
  if (!(wt > 0) || !(ht > 0)){
    setResult(out, `<span class="bad">Please enter valid positive values.</span>`, "bad");
    return;
  }

  const bsa = Math.sqrt((ht * wt) / 3600);
  const bsaR = roundTo(bsa, 3);

  setResult(out,
    `<div><strong>BSA:</strong> <span class="ok">${bsaR} m²</span></div>
     <div class="muted tiny">Height: ${roundTo(ht,1)} cm • Weight: ${roundTo(wt,1)} kg</div>`,
    "ok"
  );

  addHistoryItem(
    "BSA",
    `ht ${roundTo(ht,1)}cm, wt ${roundTo(wt,1)}kg`,
    `BSA = ${bsaR} m²`
  );
});

// ---- Calculator: GFR CKD-EPI 2021
$("#formGfr").addEventListener("submit", (e) => {
  e.preventDefault();
  const age = Number($("#gfrAge").value);
  const sex = $("#gfrSex").value;
  const scr = scrToMgDl($("#gfrScr").value, $("#gfrScrUnit").value);
  const out = $("#gfrResult");
  if (!(age >= 18) || !(scr > 0)){
    setResult(out, `<span class="bad">Enter valid age (≥18) and creatinine.</span>`, "bad"); return;
  }
  // CKD-EPI 2021 (no race)
  const kappa = sex === "female" ? 0.7 : 0.9;
  const alpha = sex === "female" ? -0.241 : -0.302;
  const sexMult = sex === "female" ? 1.012 : 1.0;
  const scrK = scr / kappa;
  const gfr = 142 * Math.pow(Math.min(scrK, 1), alpha) * Math.pow(Math.max(scrK, 1), -1.200)
            * Math.pow(0.9938, age) * sexMult;
  const gfrR = roundTo(gfr, 1);
  let stage = "";
  if (gfr >= 90) stage = "G1 – Normal or high";
  else if (gfr >= 60) stage = "G2 – Mildly decreased";
  else if (gfr >= 45) stage = "G3a – Mild-mod decreased";
  else if (gfr >= 30) stage = "G3b – Mod-severely decreased";
  else if (gfr >= 15) stage = "G4 – Severely decreased";
  else stage = "G5 – Kidney failure";
  const ok = gfr >= 60 ? "ok" : "bad";
  setResult(out, `<div><strong>eGFR:</strong> <span class="${ok}">${gfrR} mL/min/1.73m²</span></div><div class="muted tiny">${stage}</div>`, ok);
  addHistoryItem("GFR", `Age ${age}, ${sex}, SCr ${roundTo(scr,2)} mg/dL`, `eGFR = ${gfrR} mL/min/1.73m²`);
});

// ---- Calculator: IBW (Devine)
$("#formIbw").addEventListener("submit", (e) => {
  e.preventDefault();
  const sex = $("#ibwSex").value;
  const ht = toCm($("#ibwHeight").value, $("#ibwHeightUnit").value);
  const actualRaw = $("#ibwActual").value.trim();
  const out = $("#ibwResult");
  if (!(ht > 0)){
    setResult(out, `<span class="bad">Enter a valid height.</span>`, "bad"); return;
  }
  const inches = ht / 2.54;
  const over60 = inches - 60;
  if (over60 < 0){ setResult(out, `<span class="bad">Height must be ≥ 60 inches (≈152 cm).</span>`, "bad"); return; }
  const ibw = sex === "male" ? 50 + 2.3 * over60 : 45.5 + 2.3 * over60;
  let html = `<div><strong>IBW:</strong> <span class="ok">${roundTo(ibw,1)} kg</span></div>`;
  let summary = `${sex}, ht ${roundTo(ht,1)}cm`;
  if (actualRaw){
    const actual = toKg(actualRaw, $("#ibwActualUnit").value);
    if (actual > 0){
      const abw = ibw + 0.4 * (actual - ibw);
      html += `<div class="muted tiny">ABW (0.4 factor): ${roundTo(abw,1)} kg | Actual: ${roundTo(actual,1)} kg</div>`;
      summary += `, actual ${roundTo(actual,1)}kg`;
    }
  }
  setResult(out, html, "ok");
  addHistoryItem("IBW", summary, `IBW = ${roundTo(ibw,1)} kg`);
});

// ---- Calculator: BMI
$("#formBmi").addEventListener("submit", (e) => {
  e.preventDefault();
  const wt = toKg($("#bmiWeight").value, $("#bmiWeightUnit").value);
  const ht = toCm($("#bmiHeight").value, $("#bmiHeightUnit").value);
  const out = $("#bmiResult");
  if (!(wt > 0) || !(ht > 0)){
    setResult(out, `<span class="bad">Enter valid weight and height.</span>`, "bad"); return;
  }
  const htM = ht / 100;
  const bmi = wt / (htM * htM);
  const bmiR = roundTo(bmi, 1);
  let cat = "";
  if (bmi < 18.5) cat = "Underweight";
  else if (bmi < 25) cat = "Normal weight";
  else if (bmi < 30) cat = "Overweight";
  else if (bmi < 35) cat = "Obesity Class I";
  else if (bmi < 40) cat = "Obesity Class II";
  else cat = "Obesity Class III";
  const ok = (bmi >= 18.5 && bmi < 25) ? "ok" : "bad";
  setResult(out, `<div><strong>BMI:</strong> <span class="${ok}">${bmiR} kg/m²</span></div><div class="muted tiny">${cat}</div>`, ok);
  addHistoryItem("BMI", `wt ${roundTo(wt,1)}kg, ht ${roundTo(ht,1)}cm`, `BMI = ${bmiR} (${cat})`);
});

// ---- Calculator: CHA₂DS₂-VASc
$("#formChadsvasc").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = [+"#cvAge","#cvSex","#cvChf","#cvHtn","#cvStroke","#cvVasc","#cvDm"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#chadsvascResult");
  const riskTable = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2];
  const risk = riskTable[Math.min(score, 9)] ?? ">15";
  let rec = "";
  if (score === 0) rec = "Low risk — no anticoagulation recommended (for males).";
  else if (score === 1) rec = "Low-moderate risk — consider anticoagulation.";
  else rec = "Moderate-high risk — anticoagulation recommended.";
  const ok = score <= 1 ? "ok" : "bad";
  setResult(out, `<div><strong>CHA₂DS₂-VASc:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">Annual stroke risk ≈ ${risk}% | ${rec}</div>`, ok);
  addHistoryItem("CHA₂DS₂-VASc", `Score ${score}`, `CHA₂DS₂-VASc = ${score}, risk ≈ ${risk}%`);
});

// ---- Calculator: HEART Score
$("#formHeart").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#heartH","#heartE","#heartA","#heartR","#heartT"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#heartResult");
  let risk, rec;
  if (score <= 3){ risk = "Low (1.7%)"; rec = "Consider early discharge."; }
  else if (score <= 6){ risk = "Moderate (12–16.6%)"; rec = "Admit for observation, serial troponins."; }
  else { risk = "High (50–65%)"; rec = "Urgent intervention recommended."; }
  const ok = score <= 3 ? "ok" : "bad";
  setResult(out, `<div><strong>HEART Score:</strong> <span class="${ok}">${score}/10</span></div><div class="muted tiny">Risk: ${risk} | ${rec}</div>`, ok);
  addHistoryItem("HEART", `Score ${score}`, `HEART = ${score} — ${risk}`);
});

// ---- Calculator: QTc
$("#formQtc").addEventListener("submit", (e) => {
  e.preventDefault();
  const qt = Number($("#qtcQt").value);
  const hr = Number($("#qtcHr").value);
  const out = $("#qtcResult");
  if (!(qt > 0) || !(hr > 0)){
    setResult(out, `<span class="bad">Enter valid QT and HR.</span>`, "bad"); return;
  }
  const rr = 60 / hr;
  const bazett = roundTo(qt / Math.sqrt(rr), 0);
  const fridericia = roundTo(qt / Math.pow(rr, 1/3), 0);
  const framingham = roundTo(qt + 154 * (1 - rr), 0);
  const hodges = roundTo(qt + 1.75 * (hr - 60), 0);
  const ok = bazett <= 470 ? "ok" : "bad";
  setResult(out,
    `<div><strong>Bazett QTc:</strong> <span class="${ok}">${bazett} ms</span></div>
     <div class="muted tiny">Fridericia: ${fridericia} ms | Framingham: ${framingham} ms | Hodges: ${hodges} ms</div>
     <div class="muted tiny">${bazett > 500 ? "⚠️ High risk of Torsades de Pointes" : bazett > 470 ? "Prolonged QTc" : "Normal range"}</div>`, ok);
  addHistoryItem("QTc", `QT ${qt}ms, HR ${hr}bpm`, `Bazett QTc = ${bazett} ms`);
});

// ---- Calculator: MAP
$("#formMap").addEventListener("submit", (e) => {
  e.preventDefault();
  const sbp = Number($("#mapSbp").value);
  const dbp = Number($("#mapDbp").value);
  const out = $("#mapResult");
  if (!(sbp > 0) || !(dbp >= 0)){
    setResult(out, `<span class="bad">Enter valid BP values.</span>`, "bad"); return;
  }
  const map = roundTo(dbp + (sbp - dbp) / 3, 1);
  const ok = (map >= 65 && map <= 110) ? "ok" : "bad";
  setResult(out, `<div><strong>MAP:</strong> <span class="${ok}">${map} mmHg</span></div><div class="muted tiny">${map < 65 ? "⚠️ Below target (< 65 mmHg) — risk of end-organ hypoperfusion." : map > 110 ? "Elevated MAP" : "Normal range"}</div>`, ok);
  addHistoryItem("MAP", `SBP ${sbp}, DBP ${dbp}`, `MAP = ${map} mmHg`);
});

// ---- Calculator: HAS-BLED
$("#formHasbled").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#hbHtn","#hbRenal","#hbLiver","#hbStroke","#hbBleed","#hbInr","#hbAge","#hbDrug","#hbAlc"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#hasbledResult");
  let risk;
  if (score <= 1) risk = "Low bleeding risk";
  else if (score === 2) risk = "Moderate bleeding risk";
  else risk = "High bleeding risk — weigh benefits vs risks of anticoagulation";
  const ok = score <= 2 ? "ok" : "bad";
  setResult(out, `<div><strong>HAS-BLED:</strong> <span class="${ok}">${score}/9</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("HAS-BLED", `Score ${score}`, `HAS-BLED = ${score} — ${risk}`);
});

// ---- Calculator: GCS
$("#formGcs").addEventListener("submit", (e) => {
  e.preventDefault();
  const eye = Number($("#gcsE").value);
  const verbal = Number($("#gcsV").value);
  const motor = Number($("#gcsM").value);
  const total = eye + verbal + motor;
  const out = $("#gcsResult");
  let severity;
  if (total <= 8) severity = "Severe (intubation likely indicated)";
  else if (total <= 12) severity = "Moderate";
  else severity = "Mild";
  const ok = total >= 13 ? "ok" : "bad";
  setResult(out, `<div><strong>GCS:</strong> <span class="${ok}">${total}/15</span> (E${eye} V${verbal} M${motor})</div><div class="muted tiny">${severity}</div>`, ok);
  addHistoryItem("GCS", `E${eye} V${verbal} M${motor}`, `GCS = ${total} — ${severity}`);
});

// ---- Calculator: Wells PE
$("#formWellsPe").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#wpeDvt","#wpePe","#wpeHr","#wpeImmob","#wpePrev","#wpeHemo","#wpeMalig"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#wellsPeResult");
  let risk, rec;
  if (score <= 1){ risk = "Low"; rec = "PE unlikely (< 2%). Consider PERC rule or D-dimer."; }
  else if (score <= 4){ risk = "Moderate"; rec = "Consider D-dimer to exclude PE."; }
  else { risk = "High"; rec = "PE likely (> 40%). Consider CT-PA."; }
  // Traditional 3-tier
  const ok = score <= 4 ? "ok" : "bad";
  setResult(out, `<div><strong>Wells PE Score:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">Risk: ${risk} | ${rec}</div>`, ok);
  addHistoryItem("Wells PE", `Score ${score}`, `Wells PE = ${score} — ${risk} risk`);
});

// ---- Calculator: Wells DVT
$("#formWellsDvt").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#wdCancer","#wdParalysis","#wdBedridden","#wdTender","#wdSwelling","#wdCalf","#wdPitting","#wdCollat","#wdPrevDvt","#wdAlt"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#wellsDvtResult");
  let risk;
  if (score <= 0) risk = "Low probability (5%)";
  else if (score <= 2) risk = "Moderate probability (17%)";
  else risk = "High probability (53%)";
  const ok = score <= 2 ? "ok" : "bad";
  setResult(out, `<div><strong>Wells DVT Score:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("Wells DVT", `Score ${score}`, `Wells DVT = ${score} — ${risk}`);
});

// ---- Calculator: PERC
$("#formPerc").addEventListener("submit", (e) => {
  e.preventDefault();
  const total = ["#percAge","#percHr","#percSat","#percHemo","#percEstrogen","#percPrior","#percSurgery","#percSwelling"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#percResult");
  if (total === 0){
    setResult(out, `<div><strong>PERC:</strong> <span class="ok">Negative — All criteria met</span></div><div class="muted tiny">PE can be safely ruled out without further testing (in low pretest probability patients).</div>`, "ok");
  } else {
    setResult(out, `<div><strong>PERC:</strong> <span class="bad">Positive — ${total} criteria present</span></div><div class="muted tiny">Cannot rule out PE by PERC. Consider D-dimer or further workup.</div>`, "bad");
  }
  addHistoryItem("PERC", `${total} criteria positive`, total === 0 ? "PERC negative — PE ruled out" : `PERC positive (${total} criteria)`);
});

// ---- Calculator: CURB-65
$("#formCurb65").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#cConfusion","#cUrea","#cRr","#cBp","#cAge65"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#curb65Result");
  let risk, rec;
  if (score <= 1){ risk = "Low (1.5%)"; rec = "Consider outpatient treatment."; }
  else if (score === 2){ risk = "Moderate (9.2%)"; rec = "Consider short inpatient stay or closely supervised outpatient."; }
  else { risk = "High (22%)"; rec = score >= 4 ? "ICU admission recommended." : "Hospitalize — consider ICU if score 4–5."; }
  const ok = score <= 1 ? "ok" : "bad";
  setResult(out, `<div><strong>CURB-65:</strong> <span class="${ok}">${score}/5</span></div><div class="muted tiny">30-day mortality: ${risk} | ${rec}</div>`, ok);
  addHistoryItem("CURB-65", `Score ${score}`, `CURB-65 = ${score} — mortality ${risk}`);
});

// ---- Calculator: qSOFA
$("#formQsofa").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#qsSbp","#qsRr","#qsGcs"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#qsofaResult");
  let interp;
  if (score <= 1) interp = "Low risk — not suggestive of sepsis.";
  else interp = "≥ 2: High risk of poor outcome. Investigate for organ dysfunction / sepsis.";
  const ok = score <= 1 ? "ok" : "bad";
  setResult(out, `<div><strong>qSOFA:</strong> <span class="${ok}">${score}/3</span></div><div class="muted tiny">${interp}</div>`, ok);
  addHistoryItem("qSOFA", `Score ${score}`, `qSOFA = ${score}`);
});

// ---- Calculator: NEWS2
$("#formNews2").addEventListener("submit", (e) => {
  e.preventDefault();
  // Parse values — some encoded with "3b" etc for same numeric value 3
  const parseN2 = (id) => { const v = $(id).value; return parseInt(v, 10); };
  const score = parseN2("#n2Rr") + parseN2("#n2Spo2") + parseN2("#n2Air")
              + parseN2("#n2Temp") + parseN2("#n2Sbp") + parseN2("#n2Hr") + parseN2("#n2Avpu");
  const out = $("#news2Result");
  let risk;
  if (score <= 4) risk = score === 0 ? "Low risk" : "Low risk — ward-based care";
  else if (score <= 6) risk = "Medium risk — urgent review needed";
  else risk = "High risk — emergency response, consider ICU";
  const ok = score <= 4 ? "ok" : "bad";
  setResult(out, `<div><strong>NEWS2:</strong> <span class="${ok}">${score}/20</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("NEWS2", `Score ${score}`, `NEWS2 = ${score} — ${risk}`);
});

// ---- Calculator: Parkland
$("#formParkland").addEventListener("submit", (e) => {
  e.preventDefault();
  const wt = toKg($("#pkWeight").value, $("#pkWeightUnit").value);
  const tbsa = Number($("#pkTbsa").value);
  const out = $("#parklandResult");
  if (!(wt > 0) || !(tbsa > 0 && tbsa <= 100)){
    setResult(out, `<span class="bad">Enter valid weight and %TBSA.</span>`, "bad"); return;
  }
  const total = 4 * wt * tbsa;
  const first8 = roundTo(total / 2, 0);
  const next16 = first8;
  const rateFirst = roundTo(first8 / 8, 0);
  const rateNext = roundTo(next16 / 16, 0);
  setResult(out,
    `<div><strong>Total 24h fluid:</strong> <span class="ok">${roundTo(total, 0)} mL</span> LR</div>
     <div class="muted tiny">First 8h: ${first8} mL (${rateFirst} mL/hr) | Next 16h: ${next16} mL (${rateNext} mL/hr)</div>`, "ok");
  addHistoryItem("Parkland", `wt ${roundTo(wt,1)}kg, ${tbsa}% TBSA`, `Total = ${roundTo(total,0)} mL LR`);
});

// ---- Calculator: Corrected Sodium
$("#formNa").addEventListener("submit", (e) => {
  e.preventDefault();
  const na = Number($("#naMeasured").value);
  const glu = Number($("#naGlucose").value);
  const out = $("#naResult");
  if (!isFinite(na) || !isFinite(glu)){
    setResult(out, `<span class="bad">Enter valid values.</span>`, "bad"); return;
  }
  const corrected = roundTo(na + 0.024 * (glu - 100), 1);
  const ok = (corrected >= 135 && corrected <= 145) ? "ok" : "bad";
  setResult(out, `<div><strong>Corrected Na⁺:</strong> <span class="${ok}">${corrected} mEq/L</span></div><div class="muted tiny">Measured Na ${na}, Glucose ${glu} mg/dL</div>`, ok);
  addHistoryItem("Corrected Na", `Na ${na}, Glucose ${glu}`, `Corrected Na = ${corrected} mEq/L`);
});

// ---- Calculator: Corrected Calcium
$("#formCa").addEventListener("submit", (e) => {
  e.preventDefault();
  const ca = Number($("#caCa").value);
  const alb = Number($("#caAlb").value);
  const out = $("#caResult");
  if (!isFinite(ca) || !isFinite(alb)){
    setResult(out, `<span class="bad">Enter valid values.</span>`, "bad"); return;
  }
  const corrected = roundTo(ca + 0.8 * (4.0 - alb), 1);
  const ok = (corrected >= 8.5 && corrected <= 10.5) ? "ok" : "bad";
  setResult(out, `<div><strong>Corrected Ca²⁺:</strong> <span class="${ok}">${corrected} mg/dL</span></div><div class="muted tiny">Measured Ca ${ca}, Albumin ${alb} g/dL</div>`, ok);
  addHistoryItem("Corrected Ca", `Ca ${ca}, Albumin ${alb}`, `Corrected Ca = ${corrected} mg/dL`);
});

// ---- Calculator: Anion Gap
$("#formAnion").addEventListener("submit", (e) => {
  e.preventDefault();
  const na = Number($("#agNa").value);
  const cl = Number($("#agCl").value);
  const hco3 = Number($("#agHco3").value);
  const albRaw = $("#agAlb").value.trim();
  const out = $("#anionResult");
  if (!isFinite(na) || !isFinite(cl) || !isFinite(hco3)){
    setResult(out, `<span class="bad">Enter valid lab values.</span>`, "bad"); return;
  }
  const ag = roundTo(na - (cl + hco3), 1);
  let html = `<div><strong>Anion Gap:</strong> <span class="${ag > 12 ? "bad" : "ok"}">${ag} mEq/L</span></div>`;
  if (albRaw){
    const alb = Number(albRaw);
    if (isFinite(alb)){
      const corrAg = roundTo(ag + 2.5 * (4.0 - alb), 1);
      html += `<div class="muted tiny">Albumin-corrected AG: ${corrAg} mEq/L</div>`;
    }
  }
  // Delta-delta
  if (ag > 12){
    const deltaAg = ag - 12;
    const deltaHco3 = 24 - hco3;
    const ratio = deltaHco3 > 0 ? roundTo(deltaAg / deltaHco3, 2) : "N/A";
    html += `<div class="muted tiny">Δ/Δ ratio: ${ratio} ${typeof ratio === "number" ? (ratio < 1 ? "(non-AG acidosis also)" : ratio > 2 ? "(concurrent metabolic alkalosis)" : "(pure AG acidosis)") : ""}</div>`;
  }
  setResult(out, html, ag > 12 ? "bad" : "ok");
  addHistoryItem("Anion Gap", `Na ${na}, Cl ${cl}, HCO₃ ${hco3}`, `AG = ${ag} mEq/L`);
});

// ---- Calculator: Winters' Formula
$("#formWinters").addEventListener("submit", (e) => {
  e.preventDefault();
  const hco3 = Number($("#wHco3").value);
  const out = $("#wintersResult");
  if (!isFinite(hco3) || hco3 <= 0){
    setResult(out, `<span class="bad">Enter a valid HCO₃⁻.</span>`, "bad"); return;
  }
  const expected = 1.5 * hco3 + 8;
  const low = roundTo(expected - 2, 1);
  const high = roundTo(expected + 2, 1);
  setResult(out,
    `<div><strong>Expected pCO₂:</strong> <span class="ok">${low} – ${high} mmHg</span></div>
     <div class="muted tiny">If pCO₂ is within range → appropriate respiratory compensation.<br/>Below range → concurrent respiratory alkalosis. Above range → concurrent respiratory acidosis.</div>`, "ok");
  addHistoryItem("Winters", `HCO₃ ${hco3}`, `Expected pCO₂ = ${low}–${high} mmHg`);
});

// ---- Calculator: Serum Osmolality
$("#formOsm").addEventListener("submit", (e) => {
  e.preventDefault();
  const na = Number($("#osmNa").value);
  const bun = Number($("#osmBun").value);
  const glu = Number($("#osmGlu").value);
  const etoh = Number($("#osmEtoh").value) || 0;
  const measuredRaw = $("#osmMeasured").value.trim();
  const out = $("#osmResult");
  if (!isFinite(na) || !isFinite(bun) || !isFinite(glu)){
    setResult(out, `<span class="bad">Enter valid values.</span>`, "bad"); return;
  }
  const calc = 2 * na + bun / 2.8 + glu / 18 + etoh / 4.6;
  const calcR = roundTo(calc, 1);
  let html = `<div><strong>Calculated Osm:</strong> <span class="ok">${calcR} mOsm/kg</span></div>`;
  if (measuredRaw){
    const measured = Number(measuredRaw);
    if (isFinite(measured)){
      const gap = roundTo(measured - calc, 1);
      html += `<div class="muted tiny">Osmol gap: ${gap} mOsm/kg ${gap > 10 ? "(⚠️ Elevated — consider toxic alcohols)" : "(Normal < 10)"}</div>`;
    }
  }
  setResult(out, html, "ok");
  addHistoryItem("Serum Osm", `Na ${na}, BUN ${bun}, Glu ${glu}`, `Calc Osm = ${calcR} mOsm/kg`);
});

// ---- Calculator: A-a Gradient
$("#formAa").addEventListener("submit", (e) => {
  e.preventDefault();
  const age = Number($("#aaAge").value);
  const fio2 = Number($("#aaFio2").value) / 100;
  const pao2 = Number($("#aaPao2").value);
  const paco2 = Number($("#aaPaco2").value);
  const out = $("#aaResult");
  if (!(age >= 0) || !(fio2 > 0) || !isFinite(pao2) || !isFinite(paco2)){
    setResult(out, `<span class="bad">Enter valid values.</span>`, "bad"); return;
  }
  const patm = 760; // sea level
  const ph2o = 47;
  const PAO2 = fio2 * (patm - ph2o) - paco2 / 0.8;
  const AaGrad = roundTo(PAO2 - pao2, 1);
  const normalAa = roundTo(age / 4 + 4, 1);
  const ok = AaGrad <= normalAa + 5 ? "ok" : "bad";
  setResult(out,
    `<div><strong>A-a Gradient:</strong> <span class="${ok}">${AaGrad} mmHg</span></div>
     <div class="muted tiny">PAO₂ = ${roundTo(PAO2,1)} mmHg | Expected normal ≈ ${normalAa} mmHg${AaGrad > normalAa ? " — Elevated (consider V/Q mismatch, shunt, diffusion impairment)" : ""}</div>`, ok);
  addHistoryItem("A-a Gradient", `Age ${age}, FiO₂ ${(fio2*100).toFixed(0)}%, PaO₂ ${pao2}, PaCO₂ ${paco2}`, `A-a = ${AaGrad} mmHg`);
});

// ---- Calculator: FENa
$("#formFena").addEventListener("submit", (e) => {
  e.preventDefault();
  const sNa = Number($("#fenaSerNa").value);
  const sCr = Number($("#fenaSerCr").value);
  const uNa = Number($("#fenaUrNa").value);
  const uCr = Number($("#fenaUrCr").value);
  const out = $("#fenaResult");
  if (!(sNa > 0) || !(sCr > 0) || !(uNa >= 0) || !(uCr > 0)){
    setResult(out, `<span class="bad">Enter valid values.</span>`, "bad"); return;
  }
  const fena = roundTo((uNa * sCr) / (sNa * uCr) * 100, 2);
  let interp;
  if (fena < 1) interp = "< 1% → Prerenal etiology";
  else if (fena <= 2) interp = "1–2% → Indeterminate";
  else interp = "> 2% → Intrinsic renal etiology";
  const ok = fena < 1 ? "ok" : "bad";
  setResult(out, `<div><strong>FENa:</strong> <span class="${ok}">${fena}%</span></div><div class="muted tiny">${interp}</div>`, ok);
  addHistoryItem("FENa", `SNa ${sNa}, SCr ${sCr}, UNa ${uNa}, UCr ${uCr}`, `FENa = ${fena}%`);
});

// ---- Calculator: MELD
$("#formMeld").addEventListener("submit", (e) => {
  e.preventDefault();
  let bili = Number($("#meldBili").value);
  const inr = Number($("#meldInr").value);
  let cr = Number($("#meldCr").value);
  const naRaw = $("#meldNa").value.trim();
  const dialysis = Number($("#meldDialysis").value);
  const out = $("#meldResult");
  if (!(bili > 0) || !(inr > 0) || !(cr > 0)){
    setResult(out, `<span class="bad">Enter valid lab values.</span>`, "bad"); return;
  }
  // Floor values at 1.0
  if (bili < 1) bili = 1;
  if (cr < 1) cr = 1;
  if (dialysis) cr = 4.0;
  if (cr > 4) cr = 4.0;
  const meld = Math.round(10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.120 * Math.log(inr) + 0.643));
  const meldClamped = Math.max(6, Math.min(40, meld));
  let html = `<div><strong>MELD Score:</strong> <span class="${meldClamped >= 20 ? "bad" : "ok"}">${meldClamped}</span></div>`;
  // MELD-Na if sodium provided
  if (naRaw){
    let na = Number(naRaw);
    if (isFinite(na)){
      na = Math.max(125, Math.min(137, na));
      const meldNa = Math.round(meldClamped + 1.32 * (137 - na) - 0.033 * meldClamped * (137 - na));
      const meldNaClamped = Math.max(6, Math.min(40, meldNa));
      html += `<div class="muted tiny">MELD-Na: ${meldNaClamped}</div>`;
    }
  }
  // Mortality estimate
  let mort = "";
  if (meldClamped <= 9) mort = "3-month mortality ≈ 1.9%";
  else if (meldClamped <= 19) mort = "3-month mortality ≈ 6%";
  else if (meldClamped <= 29) mort = "3-month mortality ≈ 19.6%";
  else if (meldClamped <= 39) mort = "3-month mortality ≈ 52.6%";
  else mort = "3-month mortality ≈ 71.3%";
  html += `<div class="muted tiny">${mort}</div>`;
  setResult(out, html, meldClamped >= 20 ? "bad" : "ok");
  addHistoryItem("MELD", `Bili ${bili}, INR ${inr}, Cr ${cr}`, `MELD = ${meldClamped}`);
});

// ---- Calculator: Child-Pugh
$("#formChildpugh").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#cpBili","#cpAlb","#cpInr","#cpAscites","#cpEnceph"]
    .reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#childpughResult");
  let classif, survival;
  if (score <= 6){ classif = "Class A — well-compensated"; survival = "1-year survival 100%, 2-year 85%"; }
  else if (score <= 9){ classif = "Class B — significant functional compromise"; survival = "1-year survival 81%, 2-year 57%"; }
  else { classif = "Class C — decompensated"; survival = "1-year survival 45%, 2-year 35%"; }
  const ok = score <= 6 ? "ok" : "bad";
  setResult(out, `<div><strong>Child-Pugh:</strong> <span class="${ok}">${score}/15</span></div><div class="muted tiny">${classif}<br/>${survival}</div>`, ok);
  addHistoryItem("Child-Pugh", `Score ${score}`, `Child-Pugh = ${score} — ${classif}`);
});

// ---- FIB-4 ----
$("#formFib4").addEventListener("submit", (e) => {
  e.preventDefault();
  const age = Number($("#fib4Age").value);
  const ast = Number($("#fib4Ast").value);
  const alt = Number($("#fib4Alt").value);
  const plt = Number($("#fib4Plt").value);
  const fib4 = (age * ast) / (plt * Math.sqrt(alt));
  const out = $("#fib4Result");
  let interp, ok;
  if (fib4 < 1.45){ interp = "Low risk — advanced fibrosis unlikely (NPV ~90%)"; ok = "ok"; }
  else if (fib4 <= 3.25){ interp = "Indeterminate — consider further workup"; ok = "ok"; }
  else { interp = "High risk — advanced fibrosis likely (PPV ~65%)"; ok = "bad"; }
  setResult(out, `<div><strong>FIB-4:</strong> <span class="${ok}">${roundTo(fib4, 2)}</span></div><div class="muted tiny">${interp}</div>`, ok);
  addHistoryItem("FIB-4", roundTo(fib4, 2), `FIB-4 = ${roundTo(fib4, 2)} — ${interp}`);
});

// ---- NIHSS ----
$("#formNihss").addEventListener("submit", (e) => {
  e.preventDefault();
  const ids = ["#ns1a","#ns1b","#ns1c","#ns2","#ns3","#ns4","#ns5a","#ns5b","#ns6a","#ns6b","#ns7","#ns8","#ns9","#ns10","#ns11"];
  const score = ids.reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#nihssResult");
  let sev;
  if (score === 0) sev = "No stroke symptoms";
  else if (score <= 4) sev = "Minor stroke";
  else if (score <= 15) sev = "Moderate stroke";
  else if (score <= 20) sev = "Moderate to severe stroke";
  else sev = "Severe stroke";
  const ok = score <= 4 ? "ok" : "bad";
  setResult(out, `<div><strong>NIHSS:</strong> <span class="${ok}">${score}/42</span></div><div class="muted tiny">${sev}</div>`, ok);
  addHistoryItem("NIHSS", `${score}/42`, `NIHSS = ${score} — ${sev}`);
});

// ---- ABCD2 ----
$("#formAbcd2").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#abAge","#abBp","#abClin","#abDur","#abDm"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#abcd2Result");
  let risk;
  if (score <= 3){ risk = "Low risk — 2-day stroke risk ~1%"; }
  else if (score <= 5){ risk = "Moderate risk — 2-day stroke risk ~4.1%"; }
  else { risk = "High risk — 2-day stroke risk ~8.1%"; }
  const ok = score <= 3 ? "ok" : "bad";
  setResult(out, `<div><strong>ABCD²:</strong> <span class="${ok}">${score}/7</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("ABCD²", `${score}/7`, `ABCD² = ${score} — ${risk}`);
});

// ---- MDRD ----
$("#formMdrd").addEventListener("submit", (e) => {
  e.preventDefault();
  let scr = Number($("#mdrdScr").value);
  if ($("#mdrdScrUnit").value === "umol") scr = scr / 88.4;
  const age = Number($("#mdrdAge").value);
  const sex = $("#mdrdSex").value;
  const black = Number($("#mdrdBlack").value);
  let gfr = 175 * Math.pow(scr, -1.154) * Math.pow(age, -0.203);
  if (sex === "female") gfr *= 0.742;
  if (black) gfr *= 1.212;
  const out = $("#mdrdResult");
  let stage, ok;
  if (gfr >= 90){ stage = "G1 — Normal or high"; ok = "ok"; }
  else if (gfr >= 60){ stage = "G2 — Mildly decreased"; ok = "ok"; }
  else if (gfr >= 45){ stage = "G3a — Mild-moderately decreased"; ok = "bad"; }
  else if (gfr >= 30){ stage = "G3b — Moderate-severely decreased"; ok = "bad"; }
  else if (gfr >= 15){ stage = "G4 — Severely decreased"; ok = "bad"; }
  else { stage = "G5 — Kidney failure"; ok = "bad"; }
  setResult(out, `<div><strong>MDRD GFR:</strong> <span class="${ok}">${roundTo(gfr, 1)} mL/min/1.73m²</span></div><div class="muted tiny">${stage}</div>`, ok);
  addHistoryItem("MDRD GFR", `${roundTo(gfr, 1)}`, `MDRD GFR = ${roundTo(gfr, 1)} — ${stage}`);
});

// ---- Free Water Deficit ----
$("#formFreewater").addEventListener("submit", (e) => {
  e.preventDefault();
  const sex = $("#fwSex").value;
  const ageGroup = $("#fwAge").value;
  let wt = Number($("#fwWeight").value);
  if ($("#fwWeightUnit").value === "lb") wt = wt / 2.205;
  const na = Number($("#fwNa").value);
  let factor;
  if (sex === "male") factor = ageGroup === "elderly" ? 0.5 : 0.6;
  else factor = ageGroup === "elderly" ? 0.45 : 0.5;
  const tbw = wt * factor;
  const deficit = tbw * ((na / 140) - 1);
  const out = $("#freewaterResult");
  const ok = deficit <= 3 ? "ok" : "bad";
  setResult(out, `<div><strong>Free Water Deficit:</strong> <span class="${ok}">${roundTo(deficit, 1)} L</span></div><div class="muted tiny">TBW = ${roundTo(tbw, 1)} L (factor ${factor})</div>`, ok);
  addHistoryItem("Free Water Deficit", `${roundTo(deficit, 1)} L`, `FWD = ${roundTo(deficit, 1)} L`);
});

// ---- PSI/PORT ----
$("#formPsi").addEventListener("submit", (e) => {
  e.preventDefault();
  let score = Number($("#psiAge").value);
  if ($("#psiSex").value === "female") score -= 10;
  const adds = ["#psiNursing","#psiNeoplasm","#psiLiver","#psiChf","#psiCvd","#psiRenal","#psiAms","#psiRr","#psiSbp","#psiTemp","#psiHr","#psiPh","#psiBun","#psiNa","#psiGlu","#psiHct","#psiPo2","#psiEffusion"];
  adds.forEach(id => score += Number($(id).value));
  const out = $("#psiResult");
  let cls, mort, ok;
  if (score <= 50){ cls = "Class I"; mort = "0.1% mortality"; ok = "ok"; }
  else if (score <= 70){ cls = "Class II"; mort = "0.6% mortality"; ok = "ok"; }
  else if (score <= 90){ cls = "Class III"; mort = "0.9–2.8%"; ok = "ok"; }
  else if (score <= 130){ cls = "Class IV"; mort = "8.2–9.3%"; ok = "bad"; }
  else { cls = "Class V"; mort = "27.0–31.1%"; ok = "bad"; }
  setResult(out, `<div><strong>PSI/PORT:</strong> <span class="${ok}">${score} — ${cls}</span></div><div class="muted tiny">${mort}</div>`, ok);
  addHistoryItem("PSI/PORT", `${score} (${cls})`, `PSI = ${score} — ${cls}, ${mort}`);
});

// ---- PESI ----
$("#formPesi").addEventListener("submit", (e) => {
  e.preventDefault();
  let score = Number($("#pesiAge").value);
  ["#pesiSex","#pesiCancer","#pesiHf","#pesiLung","#pesiHr","#pesiSbp","#pesiRr","#pesiTemp","#pesiAms","#pesiSpo2"].forEach(id => score += Number($(id).value));
  const out = $("#pesiResult");
  let cls, mort, ok;
  if (score <= 65){ cls = "Class I — Very low risk"; mort = "0–1.6%"; ok = "ok"; }
  else if (score <= 85){ cls = "Class II — Low risk"; mort = "1.7–3.5%"; ok = "ok"; }
  else if (score <= 105){ cls = "Class III — Intermediate"; mort = "3.2–7.1%"; ok = "bad"; }
  else if (score <= 125){ cls = "Class IV — High"; mort = "4.0–11.4%"; ok = "bad"; }
  else { cls = "Class V — Very high"; mort = "10.0–24.5%"; ok = "bad"; }
  setResult(out, `<div><strong>PESI:</strong> <span class="${ok}">${score} — ${cls}</span></div><div class="muted tiny">30-day mortality: ${mort}</div>`, ok);
  addHistoryItem("PESI", `${score}`, `PESI = ${score} — ${cls}`);
});

// ---- YEARS ----
$("#formYears").addEventListener("submit", (e) => {
  e.preventDefault();
  const items = Number($("#yrDvt").value) + Number($("#yrHemo").value) + Number($("#yrMost").value);
  const ddimer = Number($("#yrDdimer").value);
  const out = $("#yearsResult");
  let result, ok;
  if (items === 0 && ddimer < 1000){ result = "PE excluded — no CTPA needed"; ok = "ok"; }
  else if (items >= 1 && ddimer < 500){ result = "PE excluded — no CTPA needed"; ok = "ok"; }
  else { result = "PE not excluded — CTPA indicated"; ok = "bad"; }
  setResult(out, `<div><strong>YEARS:</strong> <span class="${ok}">${result}</span></div><div class="muted tiny">YEARS items: ${items}/3, D-dimer: ${ddimer} ng/mL</div>`, ok);
  addHistoryItem("YEARS", `${items} items`, result);
});

// ---- ABG Analyzer ----
$("#formAbg").addEventListener("submit", (e) => {
  e.preventDefault();
  const ph = Number($("#abgPh").value);
  const pco2 = Number($("#abgPco2").value);
  const hco3 = Number($("#abgHco3").value);
  const na = $("#abgNa").value ? Number($("#abgNa").value) : null;
  const cl = $("#abgCl").value ? Number($("#abgCl").value) : null;
  const out = $("#abgResult");
  let lines = [];
  // Primary disorder
  if (ph < 7.35) {
    if (pco2 > 45) lines.push("Primary: Respiratory Acidosis");
    if (hco3 < 22) lines.push("Primary: Metabolic Acidosis");
    if (pco2 <= 45 && hco3 >= 22) lines.push("Primary: Acidemia (mixed/unclear)");
  } else if (ph > 7.45) {
    if (pco2 < 35) lines.push("Primary: Respiratory Alkalosis");
    if (hco3 > 26) lines.push("Primary: Metabolic Alkalosis");
    if (pco2 >= 35 && hco3 <= 26) lines.push("Primary: Alkalemia (mixed/unclear)");
  } else {
    lines.push("pH is within normal range (7.35–7.45)");
  }
  // Compensation
  if (ph < 7.35 && hco3 < 22) {
    const expectedPco2 = 1.5 * hco3 + 8;
    lines.push(`Expected PaCO₂ (Winter's): ${roundTo(expectedPco2-2,1)}–${roundTo(expectedPco2+2,1)} mmHg`);
    if (pco2 < expectedPco2 - 2) lines.push("→ Concurrent respiratory alkalosis");
    else if (pco2 > expectedPco2 + 2) lines.push("→ Concurrent respiratory acidosis");
    else lines.push("→ Appropriate respiratory compensation");
  }
  // Anion gap
  if (na !== null && cl !== null) {
    const ag = na - cl - hco3;
    lines.push(`Anion Gap: ${roundTo(ag, 1)} (normal 8–12)`);
    if (ag > 12) {
      const deltaAg = ag - 12;
      const deltaHco3 = 24 - hco3;
      const ratio = deltaHco3 > 0 ? deltaAg / deltaHco3 : 0;
      lines.push(`Delta-delta ratio: ${roundTo(ratio, 2)}`);
      if (ratio < 1) lines.push("→ Suggests non-AG metabolic acidosis also present");
      else if (ratio > 2) lines.push("→ Suggests metabolic alkalosis also present");
    }
  }
  const ok = (ph >= 7.35 && ph <= 7.45) ? "ok" : "bad";
  setResult(out, `<div><strong>ABG Analysis:</strong></div>${lines.map(l => `<div class="muted tiny">${l}</div>`).join("")}`, ok);
  addHistoryItem("ABG", `pH ${ph}`, lines[0]);
});

// ---- SOFA ----
$("#formSofa").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#sofaResp","#sofaCoag","#sofaLiver","#sofaCns","#sofaCv","#sofaRenal"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#sofaResult");
  let mort;
  if (score <= 1) mort = "< 3.3%";
  else if (score <= 3) mort = "< 6.7%";
  else if (score <= 5) mort = "< 13.5%";
  else if (score <= 7) mort = "< 21.5%";
  else if (score <= 9) mort = "< 33.3%";
  else if (score <= 11) mort = "< 50%";
  else mort = "> 50%";
  const ok = score <= 5 ? "ok" : "bad";
  setResult(out, `<div><strong>SOFA:</strong> <span class="${ok}">${score}/24</span></div><div class="muted tiny">Estimated ICU mortality: ${mort}</div>`, ok);
  addHistoryItem("SOFA", `${score}/24`, `SOFA = ${score} — mortality ${mort}`);
});

// ---- SIRS ----
$("#formSirs").addEventListener("submit", (e) => {
  e.preventDefault();
  const criteria = ["#sirsTemp","#sirsHr","#sirsRr","#sirsWbc"].reduce((s, id) => s + Number($(id).value), 0);
  const infection = Number($("#sirsInfection").value);
  const organ = Number($("#sirsOrgan").value);
  const hypo = Number($("#sirsHypo").value);
  const out = $("#sirsResult");
  let lines = [];
  lines.push(`SIRS criteria met: ${criteria}/4`);
  if (criteria >= 2) lines.push("→ SIRS present (≥ 2 criteria)");
  else lines.push("→ SIRS not met (< 2 criteria)");
  if (criteria >= 2 && infection) lines.push("+ Infection → Sepsis");
  if (criteria >= 2 && infection && organ) lines.push("+ Organ dysfunction → Severe Sepsis");
  if (criteria >= 2 && infection && hypo) lines.push("+ Refractory hypotension → Septic Shock");
  const ok = criteria < 2 ? "ok" : "bad";
  setResult(out, lines.map(l => `<div class="muted tiny">${l}</div>`).join(""), ok);
  addHistoryItem("SIRS", `${criteria}/4`, lines[lines.length-1]);
});

// ---- APACHE II ----
$("#formApache2").addEventListener("submit", (e) => {
  e.preventDefault();
  function apScore(val, ranges) {
    for (const [lo, hi, pts] of ranges) { if (val >= lo && val <= hi) return pts; }
    return 0;
  }
  const temp = Number($("#apTemp").value);
  const map = Number($("#apMap").value);
  const hr = Number($("#apHr").value);
  const rr = Number($("#apRr").value);
  const fio2mode = $("#apFio2").value;
  const oxy = Number($("#apOxy").value);
  const ph = Number($("#apPh").value);
  const na = Number($("#apNa").value);
  const k = Number($("#apK").value);
  const cr = Number($("#apCr").value);
  const arf = Number($("#apArf").value);
  const hct = Number($("#apHct").value);
  const wbc = Number($("#apWbc").value);
  const gcs = Number($("#apGcs").value);
  const age = Number($("#apAge").value);
  const chronic = Number($("#apChronic").value);

  let score = 0;
  // Temperature
  score += apScore(temp, [[41,99,4],[39,40.9,3],[38.5,38.9,1],[36,38.4,0],[34,35.9,1],[32,33.9,2],[30,31.9,3],[-99,29.9,4]]);
  // MAP
  score += apScore(map, [[160,999,4],[130,159,3],[110,129,2],[70,109,0],[50,69,2],[-99,49,4]]);
  // HR
  score += apScore(hr, [[180,999,4],[140,179,3],[110,139,2],[70,109,0],[55,69,2],[40,54,3],[-99,39,4]]);
  // RR
  score += apScore(rr, [[50,999,4],[35,49,3],[25,34,1],[12,24,0],[10,11,1],[6,9,2],[-99,5,4]]);
  // Oxygenation
  if (fio2mode === "high") {
    score += apScore(oxy, [[500,999,4],[350,499,3],[200,349,2],[-99,199,0]]);
  } else {
    score += apScore(oxy, [[70,999,0],[61,70,1],[55,60,3],[-99,55,4]]);
  }
  // pH
  score += apScore(ph, [[7.7,99,4],[7.6,7.69,3],[7.5,7.59,1],[7.33,7.49,0],[7.25,7.32,2],[7.15,7.24,3],[-99,7.15,4]]);
  // Na
  score += apScore(na, [[180,999,4],[160,179,3],[155,159,2],[150,154,1],[130,149,0],[120,129,2],[-99,119,3]]);
  // K
  score += apScore(k, [[7,99,4],[6,6.9,3],[5.5,5.9,1],[3.5,5.4,0],[3,3.4,1],[2.5,2.9,2],[-99,2.5,4]]);
  // Cr
  let crPts = apScore(cr, [[3.5,999,4],[2,3.4,3],[1.5,1.9,2],[0.6,1.4,0],[-99,0.6,2]]);
  if (arf) crPts *= 2;
  score += crPts;
  // Hct
  score += apScore(hct, [[60,999,4],[50,59.9,2],[46,49.9,1],[30,45.9,0],[20,29.9,2],[-99,20,4]]);
  // WBC
  score += apScore(wbc, [[40,999,4],[20,39.9,2],[15,19.9,1],[3,14.9,0],[1,2.9,2],[-99,1,4]]);
  // GCS
  score += (15 - gcs);
  // Age
  if (age >= 75) score += 6;
  else if (age >= 65) score += 5;
  else if (age >= 55) score += 3;
  else if (age >= 45) score += 2;
  // Chronic
  score += chronic;

  const out = $("#apache2Result");
  let mort;
  if (score <= 4) mort = "~4%";
  else if (score <= 9) mort = "~8%";
  else if (score <= 14) mort = "~15%";
  else if (score <= 19) mort = "~25%";
  else if (score <= 24) mort = "~40%";
  else if (score <= 29) mort = "~55%";
  else if (score <= 34) mort = "~73%";
  else mort = "~85%+";
  const ok = score <= 14 ? "ok" : "bad";
  setResult(out, `<div><strong>APACHE II:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">Estimated mortality: ${mort}</div>`, ok);
  addHistoryItem("APACHE II", `${score}`, `APACHE II = ${score}, mortality ${mort}`);
});

// ---- Maintenance Fluids ----
$("#formMaintenance").addEventListener("submit", (e) => {
  e.preventDefault();
  let wt = Number($("#mfWeight").value);
  if ($("#mfWeightUnit").value === "lb") wt = wt / 2.205;
  let rate = 0;
  if (wt <= 10) rate = wt * 4;
  else if (wt <= 20) rate = 40 + (wt - 10) * 2;
  else rate = 60 + (wt - 20) * 1;
  const daily = rate * 24;
  const out = $("#maintenanceResult");
  setResult(out, `<div><strong>Maintenance Rate:</strong> <span class="ok">${roundTo(rate, 1)} mL/hr</span></div><div class="muted tiny">${roundTo(daily, 0)} mL/day (${roundTo(wt, 1)} kg)</div>`, "ok");
  addHistoryItem("Maintenance Fluids", `${roundTo(rate, 1)} mL/hr`, `${roundTo(rate, 1)} mL/hr = ${roundTo(daily, 0)} mL/day`);
});

// ---- ASCVD ----
$("#formAscvd").addEventListener("submit", (e) => {
  e.preventDefault();
  const age = Number($("#asvAge").value);
  const sex = $("#asvSex").value;
  const race = $("#asvRace").value;
  const tc = Number($("#asvTc").value);
  const hdl = Number($("#asvHdl").value);
  const sbp = Number($("#asvSbp").value);
  const bpRx = Number($("#asvBpRx").value);
  const dm = Number($("#asvDm").value);
  const smoke = Number($("#asvSmoke").value);

  // Pooled cohort equations (simplified coefficients)
  let lnAge, lnTc, lnHdl, lnSbpTx, lnSbpUn, lnSmoke, lnDm, meanCoeff, baseS;
  if (sex === "male" && race === "white") {
    lnAge = 12.344; lnTc = 11.853; lnHdl = -7.990; lnSbpTx = 1.797; lnSbpUn = 1.764;
    lnSmoke = 7.837; lnDm = 0.658; meanCoeff = 61.18; baseS = 0.9144;
  } else if (sex === "male" && race === "aa") {
    lnAge = 2.469; lnTc = 0.302; lnHdl = -0.307; lnSbpTx = 1.916; lnSbpUn = 1.809;
    lnSmoke = 0.549; lnDm = 0.645; meanCoeff = 19.54; baseS = 0.8954;
  } else if (sex === "female" && race === "white") {
    lnAge = -29.799; lnTc = 13.540; lnHdl = -13.578; lnSbpTx = 2.019; lnSbpUn = 1.957;
    lnSmoke = 7.574; lnDm = 0.661; meanCoeff = -29.18; baseS = 0.9665;
  } else {
    lnAge = 17.114; lnTc = 0.940; lnHdl = -18.920; lnSbpTx = 29.291; lnSbpUn = 27.820;
    lnSmoke = 0.691; lnDm = 0.874; meanCoeff = 86.61; baseS = 0.9533;
  }
  const lnSbpCoeff = bpRx ? lnSbpTx : lnSbpUn;
  let indSum = lnAge * Math.log(age) + lnTc * Math.log(tc) + lnHdl * Math.log(hdl) + lnSbpCoeff * Math.log(sbp) + lnSmoke * smoke + lnDm * dm;

  // Age interactions for female white
  if (sex === "female" && race === "white") {
    indSum += 4.884 * Math.log(age) * Math.log(tc);
    indSum += -1.665 * Math.log(age) * lnSmoke * smoke;
  }
  if (sex === "male" && race === "white") {
    indSum += -2.664 * Math.log(age) * Math.log(tc);
    indSum += -1.795 * Math.log(age) * lnSmoke * smoke;
  }

  const risk = (1 - Math.pow(baseS, Math.exp(indSum - meanCoeff))) * 100;
  const riskClamped = Math.max(0, Math.min(100, risk));
  const out = $("#ascvdResult");
  let cat, ok;
  if (riskClamped < 5){ cat = "Low risk"; ok = "ok"; }
  else if (riskClamped < 7.5){ cat = "Borderline risk"; ok = "ok"; }
  else if (riskClamped < 20){ cat = "Intermediate risk"; ok = "bad"; }
  else { cat = "High risk (≥ 20%)"; ok = "bad"; }
  setResult(out, `<div><strong>10-Year ASCVD Risk:</strong> <span class="${ok}">${roundTo(riskClamped, 1)}%</span></div><div class="muted tiny">${cat}</div>`, ok);
  addHistoryItem("ASCVD", `${roundTo(riskClamped, 1)}%`, `ASCVD 10-yr risk = ${roundTo(riskClamped, 1)}% — ${cat}`);
});

// ---- RCRI ----
$("#formRcri").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#rcHigh","#rcIhd","#rcChf","#rcCvd","#rcDm","#rcCr"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#rcriResult");
  let risk, ok;
  if (score === 0){ risk = "3.9% risk of major cardiac event"; ok = "ok"; }
  else if (score === 1){ risk = "6.0%"; ok = "ok"; }
  else if (score === 2){ risk = "10.1%"; ok = "bad"; }
  else { risk = "15%+ (≥ 3 risk factors)"; ok = "bad"; }
  setResult(out, `<div><strong>RCRI:</strong> <span class="${ok}">${score}/6</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("RCRI", `${score}/6`, `RCRI = ${score} — ${risk}`);
});

// ---- GRACE ----
$("#formGrace").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#grAge","#grHr","#grSbp","#grCr","#grKillip","#grArrest","#grSt","#grEnz"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#graceResult");
  let risk, ok;
  if (score <= 108){ risk = "Low (< 1% in-hospital mortality)"; ok = "ok"; }
  else if (score <= 140){ risk = "Intermediate (1–3%)"; ok = "bad"; }
  else { risk = "High (> 3%)"; ok = "bad"; }
  setResult(out, `<div><strong>GRACE:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("GRACE", `${score}`, `GRACE = ${score} — ${risk}`);
});

// ---- LDL (Friedewald) ----
$("#formLdl").addEventListener("submit", (e) => {
  e.preventDefault();
  const tc = Number($("#ldlTc").value);
  const hdl = Number($("#ldlHdl").value);
  const tg = Number($("#ldlTg").value);
  const out = $("#ldlResult");
  if (tg > 400) {
    setResult(out, `<div class="bad">Friedewald equation inaccurate when TG > 400 mg/dL.</div>`, "bad");
    return;
  }
  const ldl = tc - hdl - (tg / 5);
  let cat, ok;
  if (ldl < 100){ cat = "Optimal (< 100)"; ok = "ok"; }
  else if (ldl < 130){ cat = "Near optimal (100–129)"; ok = "ok"; }
  else if (ldl < 160){ cat = "Borderline high (130–159)"; ok = "bad"; }
  else if (ldl < 190){ cat = "High (160–189)"; ok = "bad"; }
  else { cat = "Very high (≥ 190)"; ok = "bad"; }
  setResult(out, `<div><strong>Calculated LDL:</strong> <span class="${ok}">${roundTo(ldl, 0)} mg/dL</span></div><div class="muted tiny">${cat}</div>`, ok);
  addHistoryItem("LDL", `${roundTo(ldl, 0)}`, `LDL = ${roundTo(ldl, 0)} mg/dL — ${cat}`);
});

// ---- Alvarado ----
$("#formAlvarado").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#alvMigrate","#alvAnorexia","#alvNausea","#alvRlq","#alvRebound","#alvTemp","#alvWbc","#alvShift"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#alvaradoResult");
  let interp, ok;
  if (score <= 4){ interp = "Appendicitis unlikely"; ok = "ok"; }
  else if (score <= 6){ interp = "Possible appendicitis — equivocal"; ok = "bad"; }
  else { interp = "Probable appendicitis — surgery recommended"; ok = "bad"; }
  setResult(out, `<div><strong>Alvarado:</strong> <span class="${ok}">${score}/10</span></div><div class="muted tiny">${interp}</div>`, ok);
  addHistoryItem("Alvarado", `${score}/10`, `Alvarado = ${score} — ${interp}`);
});

// ---- Glasgow-Blatchford ----
$("#formGbs").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#gbsBun","#gbsHb","#gbsSbp","#gbsHr","#gbsMelena","#gbsSyncope","#gbsLiver","#gbsHf"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#gbsResult");
  let interp, ok;
  if (score === 0){ interp = "Very low risk — outpatient management may be safe"; ok = "ok"; }
  else if (score <= 2){ interp = "Low risk"; ok = "ok"; }
  else { interp = "Hospital-based intervention likely needed"; ok = "bad"; }
  setResult(out, `<div><strong>Glasgow-Blatchford:</strong> <span class="${ok}">${score}/23</span></div><div class="muted tiny">${interp}</div>`, ok);
  addHistoryItem("Glasgow-Blatchford", `${score}`, `GBS = ${score} — ${interp}`);
});

// ---- Caprini ----
$("#formCaprini").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#capAge","#capSurgery","#capImmob","#capHxVte","#capMalig","#capObesity","#capHrt","#capPreg","#capVaricose","#capSepsis","#capChf"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#capriniResult");
  let risk, ok;
  if (score <= 1){ risk = "Very low risk (< 0.5%) — early ambulation"; ok = "ok"; }
  else if (score === 2){ risk = "Low risk (~1.5%) — pneumatic compression"; ok = "ok"; }
  else if (score <= 4){ risk = "Moderate risk (~3%) — heparin ± compression"; ok = "bad"; }
  else { risk = "High risk (~6%+) — heparin + compression"; ok = "bad"; }
  setResult(out, `<div><strong>Caprini:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("Caprini", `${score}`, `Caprini = ${score} — ${risk}`);
});

// ---- Padua ----
$("#formPadua").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#padCancer","#padVte","#padImmob","#padThrombo","#padTrauma","#padAge","#padHf","#padAmi","#padInfection","#padBmi","#padHormone"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#paduaResult");
  let risk, ok;
  if (score < 4){ risk = "Low risk — prophylaxis not recommended"; ok = "ok"; }
  else { risk = "High risk (≥ 4) — anticoagulant prophylaxis recommended"; ok = "bad"; }
  setResult(out, `<div><strong>Padua:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">${risk}</div>`, ok);
  addHistoryItem("Padua", `${score}`, `Padua = ${score} — ${risk}`);
});

// ---- Centor ----
$("#formCentor").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#cenAge","#cenExudate","#cenLymph","#cenTemp","#cenCough"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#centorResult");
  let rec, prob, ok;
  if (score <= 0){ rec = "No testing or antibiotics needed"; prob = "1–2.5%"; ok = "ok"; }
  else if (score === 1){ rec = "No testing or antibiotics needed"; prob = "5–10%"; ok = "ok"; }
  else if (score === 2){ rec = "Optional rapid Ag test"; prob = "11–17%"; ok = "ok"; }
  else if (score === 3){ rec = "Rapid Ag test and/or culture"; prob = "28–35%"; ok = "bad"; }
  else { rec = "Empiric antibiotics or rapid Ag test"; prob = "51–53%"; ok = "bad"; }
  setResult(out, `<div><strong>Centor:</strong> <span class="${ok}">${score}</span></div><div class="muted tiny">GAS probability: ${prob}<br/>${rec}</div>`, ok);
  addHistoryItem("Centor", `${score}`, `Centor = ${score}, GAS probability ${prob}`);
});

// ---- CIWA-Ar ----
$("#formCiwa").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#ciwaNausea","#ciwaTremor","#ciwaSweat","#ciwaAnxiety","#ciwaAgitation","#ciwaTactile","#ciwaAuditory","#ciwaVisual","#ciwaHeadache","#ciwaOrientation"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#ciwaResult");
  let sev, ok;
  if (score <= 8){ sev = "Mild withdrawal — no medication needed"; ok = "ok"; }
  else if (score <= 15){ sev = "Moderate withdrawal — consider medical management"; ok = "bad"; }
  else if (score <= 20){ sev = "Severe withdrawal — intensive care recommended"; ok = "bad"; }
  else { sev = "Very severe withdrawal — high risk of seizures/DT"; ok = "bad"; }
  setResult(out, `<div><strong>CIWA-Ar:</strong> <span class="${ok}">${score}/67</span></div><div class="muted tiny">${sev}</div>`, ok);
  addHistoryItem("CIWA-Ar", `${score}/67`, `CIWA-Ar = ${score} — ${sev}`);
});

// ---- HOMA-IR ----
$("#formHoma").addEventListener("submit", (e) => {
  e.preventDefault();
  let glu = Number($("#homaGlu").value);
  if ($("#homaGluUnit").value === "mmol") glu = glu * 18.0182;
  const ins = Number($("#homaIns").value);
  const homa = (ins * glu) / 405;
  const out = $("#homaResult");
  let interp, ok;
  if (homa < 1.0){ interp = "Normal insulin sensitivity"; ok = "ok"; }
  else if (homa < 2.0){ interp = "Borderline"; ok = "ok"; }
  else { interp = "Insulin resistance"; ok = "bad"; }
  setResult(out, `<div><strong>HOMA-IR:</strong> <span class="${ok}">${roundTo(homa, 2)}</span></div><div class="muted tiny">${interp}</div>`, ok);
  addHistoryItem("HOMA-IR", roundTo(homa, 2), `HOMA-IR = ${roundTo(homa, 2)} — ${interp}`);
});

// ---- PHQ-9 ----
$("#formPhq9").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = ["#phq1","#phq2","#phq3","#phq4","#phq5","#phq6","#phq7","#phq8","#phq9"].reduce((s, id) => s + Number($(id).value), 0);
  const out = $("#phq9Result");
  let sev, ok;
  if (score <= 4){ sev = "Minimal depression"; ok = "ok"; }
  else if (score <= 9){ sev = "Mild depression"; ok = "ok"; }
  else if (score <= 14){ sev = "Moderate depression"; ok = "bad"; }
  else if (score <= 19){ sev = "Moderately severe depression"; ok = "bad"; }
  else { sev = "Severe depression"; ok = "bad"; }
  setResult(out, `<div><strong>PHQ-9:</strong> <span class="${ok}">${score}/27</span></div><div class="muted tiny">${sev}</div>`, ok);
  addHistoryItem("PHQ-9", `${score}/27`, `PHQ-9 = ${score} — ${sev}`);
});

// ---- PECARN ----
$("#formPecarn").addEventListener("submit", (e) => {
  e.preventDefault();
  const ageGrp = $("#pecAge").value;
  const gcs = Number($("#pecGcs").value);
  const fracture = Number($("#pecFracture").value);
  const loc = Number($("#pecLoc").value);
  const mech = Number($("#pecMech").value);
  const act = Number($("#pecAct").value);
  const headache = Number($("#pecHeadache").value);
  const out = $("#pecarnResult");
  let risk, rec, ok;
  if (gcs || fracture) {
    risk = "High risk (ciTBI ~4.4%)";
    rec = "CT recommended";
    ok = "bad";
  } else if (loc || mech || act || headache) {
    risk = "Intermediate risk (ciTBI ~0.9%)";
    rec = "Observation vs CT based on clinical judgment, experience, worsening, parental preference, age";
    ok = "bad";
  } else {
    risk = "Low risk (ciTBI < 0.02%)";
    rec = "CT NOT recommended";
    ok = "ok";
  }
  setResult(out, `<div><strong>PECARN:</strong> <span class="${ok}">${risk}</span></div><div class="muted tiny">${rec}<br/>(Age group: ${ageGrp === "under2" ? "< 2 years" : "≥ 2 years"})</div>`, ok);
  addHistoryItem("PECARN", risk, rec);
});

// ---- Pregnancy Due Dates ----
$("#formPregnancy").addEventListener("submit", (e) => {
  e.preventDefault();
  const lmp = new Date($("#pregLmp").value + "T00:00:00");
  if (isNaN(lmp)) return;
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  const today = new Date(); today.setHours(0,0,0,0);
  const diffMs = today - lmp;
  const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const trimester = weeks < 13 ? "1st trimester" : weeks < 27 ? "2nd trimester" : "3rd trimester";
  const out = $("#pregnancyResult");
  const ok = totalDays >= 0 && totalDays <= 300 ? "ok" : "bad";
  const eddStr = edd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  setResult(out, `<div><strong>EDD:</strong> <span class="${ok}">${eddStr}</span></div><div class="muted tiny">Gestational age: ${weeks}w ${days}d — ${trimester}</div>`, ok);
  addHistoryItem("Pregnancy EDD", eddStr, `EDD = ${eddStr}, GA = ${weeks}w${days}d`);
});

// ---- Steroid Conversion ----
$("#formSteroid").addEventListener("submit", (e) => {
  e.preventDefault();
  const dose = Number($("#stDose").value);
  let fromEq = $("#stFrom").value;
  let toEq = $("#stTo").value;
  if (fromEq === "4t") fromEq = "4";
  if (toEq === "4t") toEq = "4";
  fromEq = Number(fromEq);
  toEq = Number(toEq);
  const result = (dose / fromEq) * toEq;
  const out = $("#steroidResult");
  setResult(out, `<div><strong>Equivalent dose:</strong> <span class="ok">${roundTo(result, 2)} mg</span></div><div class="muted tiny">${dose} mg of source = ${roundTo(result, 2)} mg of target</div>`, "ok");
  addHistoryItem("Steroid Convert", `${roundTo(result, 2)} mg`, `${dose} mg → ${roundTo(result, 2)} mg`);
});

// ---- Canadian CT Head Rule ----
$("#formCanadian").addEventListener("submit", (e) => {
  e.preventDefault();
  const highRisk = ["#canGcs","#canFracture","#canBasilar","#canVomit","#canAge65"].some(id => Number($(id).value) > 0);
  const medRisk = ["#canAmnesia","#canMech"].some(id => Number($(id).value) > 0);
  const out = $("#canadianResult");
  let result, ok;
  if (highRisk) {
    result = "High risk — CT recommended (neurosurgical intervention may be needed)";
    ok = "bad";
  } else if (medRisk) {
    result = "Medium risk — CT recommended (brain injury on CT likely)";
    ok = "bad";
  } else {
    result = "Low risk — CT NOT required by the rule";
    ok = "ok";
  }
  setResult(out, `<div><strong>Canadian CT Head:</strong> <span class="${ok}">${result}</span></div>`, ok);
  addHistoryItem("Canadian CT Head", ok === "ok" ? "Low risk" : "CT recommended", result);
});

// ---- Converter: mass
$("#formMass").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = Number($("#massValue").value);
  const from = $("#massFrom").value;
  const to = $("#massTo").value;

  const out = $("#massResult");
  if (!isFinite(v)){
    setResult(out, `<span class="bad">Enter a number.</span>`, "bad");
    return;
  }
  let res = v;
  if (from === "mg" && to === "mcg") res = v * 1000;
  if (from === "mcg" && to === "mg") res = v / 1000;

  setResult(out, `<strong>${roundTo(res, 6)}</strong> ${to}`, "ok");
});

// ---- Converter: weight
$("#formWeightConv").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = Number($("#wValue").value);
  const from = $("#wFrom").value;
  const to = $("#wTo").value;

  const out = $("#wResult");
  if (!isFinite(v)){
    setResult(out, `<span class="bad">Enter a number.</span>`, "bad");
    return;
  }

  let res = v;
  if (from === "kg" && to === "lb") res = v * 2.2046226218;
  if (from === "lb" && to === "kg") res = v / 2.2046226218;

  setResult(out, `<strong>${roundTo(res, 6)}</strong> ${to}`, "ok");
});

// ---- Converter: labs
$("#formLab").addEventListener("submit", (e) => {
  e.preventDefault();
  const analyte = $("#labAnalyte").value;
  const v = Number($("#labValue").value);
  const from = $("#labFrom").value;
  const to = $("#labTo").value;
  const out = $("#labResult");

  if (!isFinite(v)){
    setResult(out, `<span class="bad">Enter a number.</span>`, "bad");
    return;
  }

  // Helper: convert between mmol/L and mg/dL using factors
  // mg/dL = mmol/L * factor
  const factors = {
    glucose: 18.0182,
    cholesterol: 38.67,
    triglycerides: 88.57
  };

  let res = NaN;

  if (analyte === "creatinine"){
    // mg/dL <-> µmol/L
    // µmol/L = mg/dL * 88.4
    if (from === "mgdl" && to === "umol") res = v * 88.4;
    else if (from === "umol" && to === "mgdl") res = v / 88.4;
    else {
      setResult(out, `<span class="bad">Creatinine supports mg/dL ↔ µmol/L only.</span>`, "bad");
      return;
    }
    setResult(out, `<strong>${roundTo(res, 4)}</strong> ${to === "umol" ? "µmol/L" : "mg/dL"}`, "ok");
    return;
  }

  if (analyte === "urea"){
    // Common clinical conversion:
    // Urea (mmol/L) = BUN (mg/dL) * 0.357
    // BUN (mg/dL) = Urea (mmol/L) / 0.357
    if (from === "mgdl" && to === "mmol") res = v * 0.357;
    else if (from === "mmol" && to === "mgdl") res = v / 0.357;
    else {
      setResult(out, `<span class="bad">Urea supports BUN mg/dL ↔ Urea mmol/L only.</span>`, "bad");
      return;
    }
    setResult(out, `<strong>${roundTo(res, 4)}</strong> ${to === "mmol" ? "mmol/L" : "mg/dL"}`, "ok");
    return;
  }

  // glucose/lipids: mmol/L <-> mg/dL
  const f = factors[analyte];
  if (!f){
    setResult(out, `<span class="bad">Unsupported analyte.</span>`, "bad");
    return;
  }

  if (from === "mmol" && to === "mgdl") res = v * f;
  else if (from === "mgdl" && to === "mmol") res = v / f;
  else {
    setResult(out, `<span class="bad">This analyte supports mmol/L ↔ mg/dL only.</span>`, "bad");
    return;
  }

  setResult(out, `<strong>${roundTo(res, 4)}</strong> ${to === "mmol" ? "mmol/L" : "mg/dL"}`, "ok");
});

/* =============================================
   FAVORITES SYSTEM
   ============================================= */
function loadFavorites(){
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch { return []; }
}
function saveFavorites(arr){
  localStorage.setItem(FAV_KEY, JSON.stringify(arr));
}
function toggleFavorite(calcId){
  let favs = loadFavorites();
  const idx = favs.indexOf(calcId);
  if (idx > -1) favs.splice(idx,1); else favs.push(calcId);
  saveFavorites(favs);
  renderFavorites();
  updateFavStars();
}
function renderFavorites(){
  const section = $("#favoritesSection");
  const nav = $("#favoritesNav");
  if (!section || !nav) return;
  const favs = loadFavorites();
  if (!favs.length){ section.style.display = "none"; return; }
  section.style.display = "";
  nav.innerHTML = favs.map(id => {
    const card = document.getElementById(id);
    const name = card ? (card.dataset.name || id) : id;
    return `<button class="nav-item fav-nav-item" data-target="${id}">${name}</button>`;
  }).join("");
  nav.querySelectorAll(".fav-nav-item").forEach(btn => {
    btn.addEventListener("click", () => showCalc(btn.dataset.target));
  });
}
function updateFavStars(){
  const favs = loadFavorites();
  $$(".btn-fav").forEach(b => {
    const id = b.dataset.fav;
    b.classList.toggle("active", favs.includes(id));
    b.setAttribute("aria-pressed", favs.includes(id));
  });
}
function injectFavoriteButtons(){
  $$(".card").forEach(card => {
    if (card.querySelector(".btn-fav")) return;
    const calcEl = card.closest(".calc");
    if (!calcEl) return;
    if (calcEl.id === "calc-vancomycin") return; // skip vancomycin (own layout)
    const calcId = calcEl.id;
    const h2 = card.querySelector("h2");
    if (!h2) return;
    // Wrap h2 in card-header if not already
    let header = card.querySelector(".card-header");
    if (!header){
      header = document.createElement("div");
      header.className = "card-header";
      h2.parentNode.insertBefore(header, h2);
      header.appendChild(h2);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-fav";
    btn.dataset.fav = calcId;
    btn.setAttribute("aria-label","Toggle favorite");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    btn.addEventListener("click", () => toggleFavorite(calcId));
    header.appendChild(btn);
  });
  updateFavStars();
}

/* =============================================
   COLLAPSIBLE SIDEBAR CATEGORIES
   ============================================= */
function setupCollapsibleCategories(){
  $$(".nav-category").forEach(cat => {
    cat.addEventListener("click", () => {
      cat.classList.toggle("collapsed");
      let next = cat.nextElementSibling;
      while (next && !next.classList.contains("nav-category")){
        if (next.classList.contains("nav-item")){
          next.style.display = cat.classList.contains("collapsed") ? "none" : "";
        }
        next = next.nextElementSibling;
      }
    });
  });
}

/* =============================================
   KEYBOARD SHORTCUTS
   ============================================= */
document.addEventListener("keydown", (e) => {
  // Ctrl+K or Cmd+K → focus search
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){
    e.preventDefault();
    const inp = $("#searchInput");
    if (inp){ inp.focus(); inp.select(); }
  }
  // Escape → blur search or close
  if (e.key === "Escape"){
    const inp = $("#searchInput");
    if (document.activeElement === inp){
      inp.value = "";
      inp.dispatchEvent(new Event("input"));
      inp.blur();
    }
  }
});

/* =============================================
   BACK TO TOP BUTTON
   ============================================= */
(function setupBackToTop(){
  const btn = $("#btnBackToTop");
  if (!btn) return;
  const content = $(".content");
  const scrollTarget = content || window;
  function checkScroll(){
    const st = content ? content.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
    btn.classList.toggle("visible", st > 400);
  }
  (content || window).addEventListener("scroll", checkScroll, { passive: true });
  btn.addEventListener("click", () => {
    if (content) content.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

/* =============================================
   MOBILE BOTTOM NAV
   ============================================= */
$$(".mobile-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.mobile;
    if (action === "search"){
      const inp = $("#searchInput");
      if (inp){ inp.focus(); inp.select(); }
    } else if (action === "favorites"){
      const s = $("#favoritesSection");
      if (s) s.scrollIntoView({ behavior: "smooth" });
    } else if (action === "history"){
      const h = $(".history-section") || $("#history");
      if (h) h.scrollIntoView({ behavior: "smooth" });
    } else if (action === "theme"){
      const cur = localStorage.getItem(THEME_KEY) || "dark";
      applyTheme(cur === "dark" ? "light" : "dark");
    }
  });
});

/* =============================================
   INPUT VALIDATION HELPERS
   ============================================= */
function clearErrors(form){
  form.querySelectorAll(".has-error").forEach(el => el.classList.remove("has-error"));
  form.querySelectorAll(".field-error").forEach(el => el.remove());
}
function showFieldError(input, msg){
  input.classList.add("has-error");
  const err = document.createElement("div");
  err.className = "field-error";
  err.textContent = msg;
  input.parentNode.insertBefore(err, input.nextSibling);
}

/* =============================================
   PWA — SERVICE WORKER REGISTRATION
   ============================================= */
if ("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ===== Vancomycin Dosing Calculator (Sanford Guide) ===== */
// ========== STATE ==========
let scrUnit = 'mgdl';
let hasPrevDose = false;

// ========== HELPER FUNCTIONS ==========
function vEl(id) { return document.getElementById(id); }

function round250(dose) {
  return Math.round(dose / 250) * 250;
}

function formatDose(dose) {
  return dose.toLocaleString();
}

function setScrUnit(unit) {
  scrUnit = unit;
  vEl('scrMgDl').classList.toggle('active', unit === 'mgdl');
  vEl('scrUmolL').classList.toggle('active', unit === 'umol');
  calculate();
}

function setPrevDose(val) {
  hasPrevDose = val === 'yes';
  vEl('prevNo').classList.toggle('active', !hasPrevDose);
  vEl('prevYes').classList.toggle('active', hasPrevDose);
  vEl('prevDoseInputs').classList.toggle('hidden', !hasPrevDose);
  calculate();
}

// Get dose adjustment based on observed levels (Sanford Guide TDM)
function getDoseAdjustment(obsAUC, obsTrough, trMin, trMax) {
  // Returns: { factor: 1.0/1.25/0.75, type: 'maintain'|'increase'|'decrease'|'hold', reason: 'string' }
  
  // Priority 1: Check for HOLD conditions
  if (obsAUC > 600) {
    return { factor: 0, type: 'hold', reason: `AUC ${obsAUC} > 600 → HOLD dosing` };
  }
  if (obsTrough > 20) {
    return { factor: 0, type: 'hold', reason: `Trough ${obsTrough} > 20 → HOLD dosing` };
  }
  
  // Priority 2: AUC-based adjustment
  if (obsAUC > 0) {
    if (obsAUC < 400) {
      return { factor: 1.25, type: 'increase', reason: `AUC ${obsAUC} < 400 → ↑ dose 25%` };
    } else if (obsAUC >= 400 && obsAUC <= 600) {
      return { factor: 1.0, type: 'maintain', reason: `AUC ${obsAUC} therapeutic (400-600) → maintain dose` };
    }
  }
  
  // Priority 3: Trough-based adjustment (if no AUC)
  if (obsTrough > 0) {
    if (obsTrough < trMin) {
      return { factor: 1.25, type: 'increase', reason: `Trough ${obsTrough} < ${trMin} → ↑ dose 25%` };
    } else if (obsTrough >= trMin && obsTrough <= trMax) {
      return { factor: 1.0, type: 'maintain', reason: `Trough ${obsTrough} therapeutic (${trMin}-${trMax}) → maintain dose` };
    } else if (obsTrough > trMax && obsTrough <= 20) {
      return { factor: 0.75, type: 'decrease', reason: `Trough ${obsTrough} > ${trMax} → ↓ dose 25%` };
    }
  }
  
  // No observed levels
  return { factor: 1.0, type: 'none', reason: '' };
}

// ========== CALCULATIONS ==========
function calcBMI(weight, height) {
  if (!weight || !height) return null;
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

function calcIBW(sex, height) {
  if (!height) return null;
  const heightIn = height / 2.54;
  let ibw;
  if (sex === 'male') {
    ibw = 50 + 2.3 * (heightIn - 60);
  } else {
    ibw = 45.5 + 2.3 * (heightIn - 60);
  }
  // Floor: IBW should not be less than 30 kg (very short patients)
  return Math.max(ibw, 30);
}

function calcAdjBW(ibw, actualWt) {
  if (!ibw || !actualWt) return null;
  return ibw + 0.4 * (actualWt - ibw);
}

function calcCrCl(age, sex, weight, scrMgDl) {
  if (!age || !weight || !scrMgDl || scrMgDl <= 0) return null;
  let crcl = ((140 - age) * weight) / (72 * scrMgDl);
  if (sex === 'female') crcl *= 0.85;
  return Math.round(crcl);
}

// Sanford renal intervals - with ARC detection
// Fixed boundaries: >= for inclusive ranges per Sanford table
function getIntervalByCrCl(crcl) {
  if (crcl >= 130) return { interval: 'q8h', multiplier: 3, text: 'Every 8 hours (ARC)', isARC: true };
  if (crcl >= 100) return { interval: 'q8-12h', multiplier: 2.5, text: 'Every 8-12 hours', isRange: true };
  if (crcl >= 50) return { interval: 'q12h', multiplier: 2, text: 'Every 12 hours' };
  if (crcl >= 20) return { interval: 'q24h', multiplier: 1, text: 'Every 24 hours' };
  return { interval: 'q48h', multiplier: 0.5, text: 'Every 48 hours' };
}

function getRenalCategory(crcl) {
  if (crcl >= 130) return 'ARC (≥130)';
  if (crcl >= 100) return 'Normal (≥100)';
  if (crcl >= 50) return 'Mild (50-99)';
  if (crcl >= 20) return 'Moderate (20-49)';
  return 'Severe (<20)';
}

// ========== MAIN CALCULATION ==========
function calculate() {
  const age = +(vEl('age').value || 0);
  const sex = vEl('sex').value;
  const weight = +(vEl('weight').value || 0);
  const height = +(vEl('height').value || 0);
  let scrInput = +(vEl('scr').value || 0);
  const crclMethod = vEl('crclMethod').value;
  const directCrclVal = +(vEl('directCrcl').value || 0);
  const dialysis = vEl('dialysis').value;
  const indication = vEl('indication').value;
  
  // Auto-set route for fixed-route indications
  const routeSelect = vEl('route');
  if (indication === 'cdi') {
    routeSelect.value = 'oral';
    routeSelect.disabled = true;
  } else if (indication === 'intrathecal') {
    routeSelect.value = 'intrathecal';
    routeSelect.disabled = true;
  } else {
    routeSelect.disabled = false;
    // Reset to IV if coming from a fixed route
    if (routeSelect.value === 'oral' || routeSelect.value === 'intrathecal') {
      routeSelect.value = 'iv';
    }
  }
  const route = routeSelect.value;
  
  // Show/hide direct CrCl input and SCr input
  vEl('directCrclGroup').style.display = crclMethod === 'direct' ? 'block' : 'none';
  vEl('scrInputGroup').style.display = crclMethod === 'direct' ? 'none' : 'block';
  
  // Convert SCr to mg/dL
  let scrMgDl = scrInput;
  if (scrUnit === 'umol' && scrInput > 0) {
    scrMgDl = scrInput / 88.4;
  }
  
  // Calculate body weights
  const bmi = calcBMI(weight, height);
  const ibw = calcIBW(sex, height);
  const adjbw = ibw && weight > ibw ? calcAdjBW(ibw, weight) : null;
  const isObese = bmi && bmi >= 30;
  const isUnderweight = bmi && bmi < 18.5;
  const isOverweight = bmi && bmi >= 25 && bmi < 30;
  
  // Display weight calculations
  vEl('bmiOutput').textContent = bmi ? bmi.toFixed(1) : '—';
  vEl('ibwOutput').textContent = ibw ? ibw.toFixed(1) : '—';
  vEl('adjbwOutput').textContent = adjbw ? adjbw.toFixed(1) : '—';
  vEl('obesityTag').classList.toggle('hidden', !isObese);
  vEl('underweightTag').classList.toggle('hidden', !isUnderweight);
  
  // Dosing weight selection per Sanford Guide controversy note:
  // Recent review suggests: Loading = Actual BW, Maintenance = Adjusted BW (for obese)
  // - BMI < 18.5 (underweight): Use IBW for both
  // - BMI 18.5-29.9 (normal/overweight): Use Actual Body Weight for both
  // - BMI ≥ 30 (obese): Loading = Actual BW, Maintenance = Adjusted BW
  let loadingWt = weight; // Always actual BW for loading
  let maintWt = weight;   // Adjusted for obese patients
  let dosingWtMethod = 'ABW';
  
  if (isUnderweight && ibw) {
    loadingWt = ibw;
    maintWt = ibw;
    dosingWtMethod = 'IBW';
  } else if (isObese && adjbw) {
    loadingWt = weight;  // Actual BW for loading
    maintWt = adjbw;     // Adjusted BW for maintenance
    dosingWtMethod = 'ABW/AdjBW';
  }
  
  // For display purposes, show the maintenance weight
  let dosingWt = maintWt;
  
  // Display dosing weight with method
  let dosingWtText = dosingWt ? dosingWt.toFixed(1) : '—';
  if (dosingWt && bmi) {
    dosingWtText += ` <span style="color: var(--v-accent); font-size: 0.85rem;">(${dosingWtMethod})</span>`;
  }
  vEl('dosingWtOutput').innerHTML = dosingWtText;
  
  // Calculate CrCl
  let crcl = null;
  const onDialysis = dialysis !== 'none';
  
  if (!onDialysis) {
    if (crclMethod === 'direct' && directCrclVal > 0) {
      crcl = directCrclVal;
    } else if (age > 0 && scrMgDl > 0) {
      let cgWeight = weight;
      if (crclMethod === 'cg_ibw' && ibw) cgWeight = ibw;
      else if (crclMethod === 'cg_adj' && isObese && adjbw) cgWeight = adjbw;
      crcl = calcCrCl(age, sex, cgWeight, scrMgDl);
    }
  }
  
  vEl('crclOutput').textContent = crcl ? crcl : (onDialysis ? 'N/A (Dialysis)' : '—');
  vEl('renalCatOutput').textContent = crcl ? getRenalCategory(crcl) : (onDialysis ? dialysis.toUpperCase() : '—');
  
  // Handle special routes
  const isOral = route === 'oral';
  const isIntrathecal = route === 'intrathecal';
  
  vEl('specialRouteSection').classList.toggle('hidden', !isOral && !isIntrathecal);
  vEl('doseSection').classList.toggle('hidden', isOral || isIntrathecal || onDialysis);
  vEl('dialysisSection').classList.toggle('hidden', !onDialysis);
  
  if (isOral) {
    vEl('specialRouteTitle').textContent = 'Oral Dosing (C. difficile)';
    vEl('specialRouteContent').innerHTML = `
      <div class="dose-card">
        <div class="dose-title">Oral Vancomycin for C. difficile</div>
        <div class="dose-value">125-500 mg PO q6h</div>
        <div class="dose-hint">Duration: 10-14 days for initial episode. Not absorbed systemically.</div>
      </div>
    `;
    updateRegimen('Vancomycin 125 mg PO q6h × 10 days (C. difficile)', '');
    return;
  }
  
  if (isIntrathecal) {
    vEl('specialRouteTitle').textContent = 'Intrathecal Dosing';
    vEl('specialRouteContent').innerHTML = `
      <div class="dose-card">
        <div class="dose-title">Intrathecal/Intraventricular Vancomycin</div>
        <div class="dose-value">10-20 mg/day</div>
        <div class="dose-hint">Target CSF concentration: 10-20 µg/mL. Administer with systemic therapy.</div>
      </div>
    `;
    updateRegimen('Vancomycin 10-20 mg intrathecal daily (+ systemic therapy)', '');
    return;
  }
  
  // Handle dialysis - pass actual weight for loading, dosingWt for maintenance
  if (onDialysis && dosingWt > 0) {
    // Show nephrotoxin warning for dialysis patients too
    const hasNephrotoxin = vEl('concurrentNephrotoxin').checked;
    vEl('nephrotoxinWarning').classList.toggle('hidden', !hasNephrotoxin);
    
    calculateDialysisDose(dialysis, weight, dosingWt, hasPrevDose);
    return;
  }
  
  // ========== TDM MONITORING ==========
  const useAUC = vEl('useAUC').checked;
  const useTrough = vEl('useTrough').checked;
  const mic = +(vEl('mic').value || 1) || 1;
  const obsAUC = +(vEl('obsAUC').value || 0);
  const obsTrough = +(vEl('obsTrough').value || 0);
  const policyBand = vEl('policyBand').checked;
  const trMin = policyBand ? 15 : 10;
  const trMax = policyBand ? 20 : 15;
  
  // Update trough target hint
  vEl('troughTargetHint').textContent = `Target: ${trMin}-${trMax} mg/L${policyBand ? ' (Policy 15-20)' : ' (or 15-20 for serious MRSA)'}`;
  
  // Show/hide AUC and trough inputs
  vEl('aucInputRow').classList.toggle('hidden', !useAUC);
  vEl('troughInputRow').classList.toggle('hidden', !useTrough);
  
  // AUC status display
  if (useAUC && obsAUC > 0) {
    const aucMIC = Math.round(obsAUC / mic);
    if (obsAUC > 600) {
      vEl('aucStatusText').innerHTML = `<span style="color: #ef4444;">❌ AUC ${obsAUC} > 600 → HOLD</span>`;
    } else if (obsAUC < 400) {
      vEl('aucStatusText').innerHTML = `<span style="color: #fbbf24;">⚠️ AUC ${obsAUC} < 400 → ↑ dose 25%</span>`;
    } else {
      vEl('aucStatusText').innerHTML = `<span style="color: #34d399;">✓ AUC ${obsAUC} therapeutic (400-600)</span>`;
    }
  } else {
    vEl('aucStatusText').textContent = 'Enter observed AUC to check status';
  }
  
  // Trough status display
  if (useTrough && obsTrough > 0) {
    if (obsTrough > 20) {
      vEl('troughStatusText').innerHTML = `<span style="color: #ef4444;">❌ Trough ${obsTrough} > 20 → HOLD</span>`;
    } else if (obsTrough > trMax) {
      vEl('troughStatusText').innerHTML = `<span style="color: #fbbf24;">⚠️ Trough ${obsTrough} > ${trMax} → ↓ dose 25%</span>`;
    } else if (obsTrough < trMin) {
      vEl('troughStatusText').innerHTML = `<span style="color: #fbbf24;">⚠️ Trough ${obsTrough} < ${trMin} → ↑ dose 25%</span>`;
    } else {
      vEl('troughStatusText').innerHTML = `<span style="color: #34d399;">✓ Trough ${obsTrough} therapeutic (${trMin}-${trMax})</span>`;
    }
  } else {
    vEl('troughStatusText').textContent = 'Enter observed trough to check status';
  }
  
  // Get dose adjustment
  const adjustment = getDoseAdjustment(obsAUC, obsTrough, trMin, trMax);
  
  // Show global hold banner if needed
  const showHold = adjustment.type === 'hold';
  vEl('globalHoldBanner').classList.toggle('hidden', !showHold);
  if (showHold) {
    let holdReasons = [];
    if (obsAUC > 600) holdReasons.push(`AUC ${obsAUC} > 600`);
    if (obsTrough > 20) holdReasons.push(`Trough ${obsTrough} > 20 mg/L`);
    vEl('holdMessage').textContent = `${holdReasons.join(' & ')}. Hold dosing and recheck levels. Resume when therapeutic; adjust dose accordingly.`;
  }
  
  // Show dose adjustment box if applicable
  const showAdjustment = adjustment.type !== 'none' && !showHold;
  vEl('doseAdjustmentBox').style.display = showAdjustment ? 'block' : 'none';
  if (showAdjustment) {
    let adjClass = adjustment.type === 'increase' ? 'increase' : (adjustment.type === 'decrease' ? 'decrease' : 'maintain');
    vEl('doseAdjustmentText').innerHTML = `<span class="dose-adjustment ${adjClass}">${adjustment.reason}</span>`;
  }
  
  // Update monitoring plan
  let monitorPlan = [];
  if (useAUC) {
    const targetL = Math.round(400 / mic);
    const targetH = Math.round(600 / mic);
    monitorPlan.push(`AUC/MIC target: ${targetL}–${targetH} (MIC = ${mic} mg/L)`);
    // Warning if MIC > 1 creates unsafe AUC target
    if (mic > 1) {
      const requiredAUC = 400 * mic;
      if (requiredAUC > 600) {
        monitorPlan.push(`<span style="color: #ef4444;">⚠️ MIC ${mic}: Required AUC ${requiredAUC}-${600*mic} exceeds safety threshold of 600!</span>`);
      }
    }
  }
  if (useTrough) {
    monitorPlan.push(`Trough target: ${trMin}–${trMax} mg/L${policyBand ? ' (policy 15-20)' : ''}`);
  }
  if (useAUC && useTrough) {
    monitorPlan.push('If conflict: prioritize AUC for serious MRSA.');
  }
  if (!useAUC && !useTrough) {
    monitorPlan.push('Select AUC and/or trough monitoring method above.');
  }
  vEl('monitorPlanText').innerHTML = monitorPlan.join('<br>');
  
  // Previous dose calculation
  let prevTDD = 0;
  let prevSingleDose = 0;
  if (hasPrevDose) {
    prevSingleDose = +(vEl('prevDose').value || 0);
    const prevFreq = vEl('prevFreq').value;
    let multiplier = 2; // default q12h
    if (prevFreq === 'q8h') multiplier = 3;
    else if (prevFreq === 'q24h') multiplier = 1;
    else if (prevFreq === 'q48h') multiplier = 0.5;
    prevTDD = prevSingleDose * multiplier;
    vEl('prevTDD').textContent = prevTDD > 0 ? formatDose(prevTDD) : '—';
  }
  
  // If previous dose exists but no TDM levels entered, continue previous regimen
  const noLevelsEntered = obsAUC === 0 && obsTrough === 0;
  const usePreviousDose = hasPrevDose && prevSingleDose > 0 && noLevelsEntered;

  // Regular IV dosing
  if (dosingWt > 0 && crcl) {
    // Indication-specific dosing overrides
    let loadingMgKg, maintMgKg, forceInterval;
    
    if (indication === 'gbs_prophylaxis') {
      // GBS: 20 mg/kg loading + 20 mg/kg q8h
      loadingMgKg = 20;
      maintMgKg = 20;
      forceInterval = { interval: 'q8h', multiplier: 3, text: 'Every 8 hours (GBS protocol)' };
    } else if (indication === 'surgical_prophylaxis') {
      // Surgical prophylaxis: 15 mg/kg, no loading typically
      loadingMgKg = 15;
      maintMgKg = 15;
      forceInterval = null; // Use CrCl-based
    } else {
      // Standard dosing
      loadingMgKg = isObese ? 22.5 : 27.5; // Lower range for obese
      maintMgKg = 17.5;
      forceInterval = null;
    }
    
    let loadingDose = round250(loadingWt * loadingMgKg);
    const loadingCapped = loadingDose > 3000;
    if (loadingCapped) loadingDose = 3000;
    
    // Maintenance dose
    let maintDose = round250(maintWt * maintMgKg);
    let adjustmentHtml = '';
    let adjustmentNote = '';
    
    // If previous dose exists and adjustment available, use it
    if (hasPrevDose && prevSingleDose > 0 && adjustment.type !== 'none') {
      if (adjustment.type === 'hold') {
        // Hold - don't calculate new dose
        maintDose = 0;
        adjustmentNote = 'HOLD - Do not dose until levels recheck';
      } else {
        // Apply adjustment to previous dose
        maintDose = round250(prevSingleDose * adjustment.factor);
        if (adjustment.type === 'increase') {
          adjustmentHtml = `<span class="dose-adjustment increase">↑ +25% from previous</span>`;
          adjustmentNote = `Previous: ${formatDose(prevSingleDose)} mg → Adjusted: ${formatDose(maintDose)} mg`;
        } else if (adjustment.type === 'decrease') {
          adjustmentHtml = `<span class="dose-adjustment decrease">↓ -25% from previous</span>`;
          adjustmentNote = `Previous: ${formatDose(prevSingleDose)} mg → Adjusted: ${formatDose(maintDose)} mg`;
        } else if (adjustment.type === 'maintain') {
          maintDose = prevSingleDose; // Keep same dose
          adjustmentHtml = `<span class="dose-adjustment maintain">→ Maintained</span>`;
          adjustmentNote = `Therapeutic - maintaining ${formatDose(prevSingleDose)} mg`;
        }
      }
    } else if (usePreviousDose) {
      // Continue previous dose if no levels entered
      maintDose = prevSingleDose;
      adjustmentHtml = `<span class="dose-adjustment maintain">→ Continuing</span>`;
      adjustmentNote = `Continuing previous dose ${formatDose(prevSingleDose)} mg (enter levels for adjustment)`;
    }
    
    // Cap maintenance at 2g
    const maintCapped = maintDose > 2000;
    if (maintCapped) maintDose = 2000;
    
    // Get interval - use forced interval for specific indications or CrCl-based
    const intervalInfo = forceInterval || getIntervalByCrCl(crcl);
    
    // Handle ARC and nephrotoxin warnings
    const hasNephrotoxin = vEl('concurrentNephrotoxin').checked;
    vEl('nephrotoxinWarning').classList.toggle('hidden', !hasNephrotoxin);
    
    // Calculate daily dose - cap at 4500 mg per Sanford (rarely needed)
    let dailyDose = Math.round(maintDose * intervalInfo.multiplier);
    const dailyCapped = dailyDose > 4500;
    if (dailyCapped) {
      // Reduce maintenance dose to stay under 4.5g/day
      maintDose = round250(4500 / intervalInfo.multiplier);
      dailyDose = Math.round(maintDose * intervalInfo.multiplier);
    }
    
    // Calculate infusion time
    const infusionTime = loadingDose > 1000 ? '1.5-2 hours' : '1 hour';
    const infusionRate = Math.round(loadingDose / (loadingDose > 1000 ? 90 : 60));
    
    // Calculate Continuous Infusion dose (alternative)
    // Sanford: 30-40 mg/kg/day, adjusted by renal function
    let ciDaily;
    if (crcl >= 130) ciDaily = Math.round(dosingWt * 50); // ARC - higher dose
    else if (crcl >= 100) ciDaily = Math.round(dosingWt * 40); // Normal-high
    else if (crcl >= 50) ciDaily = Math.round(dosingWt * 35); // Normal-low to mild
    else if (crcl >= 25) ciDaily = Math.round(dosingWt * 25); // Moderate
    else ciDaily = Math.round(dosingWt * 15); // Severe
    
    // Display CI box only for IV continuous route (not oral/intrathecal)
    const isContinuous = route === 'continuous' && !isOral && !isIntrathecal;
    vEl('ciBox').classList.toggle('hidden', !isContinuous);
    if (isContinuous) {
      vEl('ciDoseOutput').textContent = `${formatDose(ciDaily)} mg/day`;
      vEl('ciHint').textContent = `Target Css 20-25 mg/L. Adjusted for CrCl ${crcl} mL/min.`;
    }
    
    // Display (if not HOLD)
    if (showHold) {
      vEl('loadingDoseOutput').innerHTML = `<span style="color: #ef4444;">HOLD</span>`;
      vEl('maintDoseOutput').innerHTML = `<span style="color: #ef4444;">HOLD - Do not dose</span>`;
      vEl('intervalOutput').textContent = '—';
      vEl('dailyDoseOutput').innerHTML = '—';
      vEl('loadingHint').textContent = 'Hold until levels normalize';
      vEl('maintHint').textContent = adjustment.reason;
      vEl('intervalHint').textContent = '';
      vEl('dailyHint').textContent = '';
      vEl('infusionOutput').textContent = '—';
      updateRegimen(`⛔ HOLD - ${adjustment.reason}`, 'Recheck levels and resume when therapeutic');
    } else {
      // Hide loading dose if patient was previously on vancomycin
      vEl('loadingDoseCard').classList.toggle('hidden', hasPrevDose);
      
      let loadingText = `${formatDose(loadingDose)} mg IV`;
      if (loadingCapped) loadingText += ' <span class="max-warning">⚠️ MAX 3g</span>';
      vEl('loadingDoseOutput').innerHTML = loadingText;
      
      // Loading hint - show correct mg/kg based on indication
      let loadingHintMgKg = indication === 'gbs_prophylaxis' ? '20' : (indication === 'surgical_prophylaxis' ? '15' : (isObese ? '20-25' : '25-30'));
      vEl('loadingHint').innerHTML = `${loadingHintMgKg} mg/kg × ${loadingWt.toFixed(1)} kg (ABW) = ${formatDose(Math.round(loadingWt * loadingMgKg))} mg`;
      
      let maintText = `${formatDose(maintDose)} mg IV ${adjustmentHtml}`;
      if (maintCapped) maintText += ' <span class="max-warning">⚠️ MAX 2g/dose</span>';
      vEl('maintDoseOutput').innerHTML = maintText;
      
      if (adjustmentNote) {
        vEl('maintHint').innerHTML = `<span style="color: var(--v-accent);">${adjustmentNote}</span>`;
      } else {
        // Maintenance hint - show correct mg/kg based on indication
        let maintHintMgKg = indication === 'gbs_prophylaxis' ? '20' : (indication === 'surgical_prophylaxis' ? '15' : '15-20');
        const wtLabel = isObese ? `${maintWt.toFixed(1)} kg (AdjBW)` : `${maintWt.toFixed(1)} kg`;
        vEl('maintHint').textContent = `${maintHintMgKg} mg/kg × ${wtLabel}${maintCapped ? ' (capped at 2g)' : ''}`;
      }
      
      vEl('intervalOutput').textContent = intervalInfo.text;
      vEl('intervalHint').textContent = forceInterval ? `${indication.replace(/_/g, ' ')} protocol` : `CrCl ${crcl} mL/min → ${intervalInfo.interval}`;
      
      // Daily dose display - show range for q8-12h
      let dailyText = `${formatDose(dailyDose)} mg/day`;
      if (dailyCapped) dailyText += ' <span class="max-warning">⚠️ MAX 4.5g/day</span>';
      vEl('dailyDoseOutput').innerHTML = dailyText;
      
      // Fix multiplier display for q8-12h (show 2-3 instead of 2.5)
      let multiplierText = intervalInfo.isRange ? '2-3' : intervalInfo.multiplier;
      vEl('dailyHint').textContent = `${formatDose(maintDose)} mg × ${multiplierText} doses/day${dailyCapped ? ' (Sanford: rarely need >4.5g)' : ''}`;
      
      // Hide infusion card if patient already on vancomycin (no loading needed)
      vEl('infusionCard').classList.toggle('hidden', hasPrevDose);
      vEl('infusionOutput').textContent = `Infuse over ${infusionTime} (~${infusionRate} mg/min)`;
      
      // Update indication note
      updateIndicationNote(indication);
      
      // Update regimen summary
      let regimenText;
      if (hasPrevDose) {
        // No loading dose for patients already on vancomycin
        regimenText = `Maintenance: ${formatDose(maintDose)} mg IV ${intervalInfo.interval}`;
      } else {
        regimenText = `Loading: ${formatDose(loadingDose)} mg IV over ${infusionTime}${loadingCapped ? ' (max 3g)' : ''}\nMaintenance: ${formatDose(maintDose)} mg IV ${intervalInfo.interval}`;
      }
      let notes = `CrCl: ${crcl} mL/min | Dosing weight: ${dosingWt.toFixed(1)} kg (${dosingWtMethod}) | Daily dose: ~${formatDose(dailyDose)} mg`;
      if (adjustmentNote) notes += ` | ${adjustmentNote}`;
      updateRegimen(regimenText, notes);
    }
  } else {
    clearOutputs();
  }
}

function calculateDialysisDose(dialysis, loadingWt, maintWt, hasPrevDose) {
  let loadingMgKg, maintMgKg, maintInterval, notes;
  
  switch (dialysis) {
    case 'hd_low_post':
      loadingMgKg = 25;
      maintMgKg = 7.5;
      maintInterval = 'after each HD session';
      notes = 'Low permeability membrane, post-HD dosing. Target pre-HD trough 15-20 mg/L.';
      break;
    case 'hd_high_post':
      loadingMgKg = 25;
      maintMgKg = 10;
      maintInterval = 'after each HD session';
      notes = 'High permeability membrane, post-HD dosing. Target pre-HD trough 15-20 mg/L.';
      break;
    case 'hd_low_intra':
      loadingMgKg = 30;
      maintMgKg = 8.75;
      maintInterval = 'during last 60-90 min of HD';
      notes = 'Low permeability membrane, intradialytic dosing (7.5-10 mg/kg).';
      break;
    case 'hd_high_intra':
      loadingMgKg = 35;
      maintMgKg = 12.5;
      maintInterval = 'during last 60-90 min of HD';
      notes = 'High permeability membrane, intradialytic dosing (10-15 mg/kg).';
      break;
    case 'capd':
      loadingMgKg = 0;
      maintMgKg = 7.5;
      maintInterval = 'q48-96h';
      notes = 'CAPD: Administer IV, adjust interval based on trough levels.';
      break;
    case 'crrt':
      loadingMgKg = 22.5;
      maintMgKg = 8.75;
      maintInterval = 'q12h';
      notes = 'CRRT (effluent 20-25 mL/kg/hr): TDM strongly recommended. Adjust based on AUC/trough.';
      break;
    case 'sled':
      loadingMgKg = 22.5;
      maintMgKg = 15;
      maintInterval = 'after each SLED session';
      notes = 'SLED/PIRRT: May also give during final 60-90 min of dialysis. TDM recommended.';
      break;
    case 'capd_ip_intermittent':
      loadingMgKg = 0;
      maintMgKg = 22.5;
      maintInterval = 'IP every 5-7 days';
      notes = 'CAPD Intraperitoneal (intermittent): 15-30 mg/kg IP in one exchange every 5-7 days. Dwell ≥6 hours preferred.';
      break;
    case 'capd_ip_continuous':
      loadingMgKg = 22.5;
      maintMgKg = 0;
      maintInterval = 'continuous 25 mg/L in all exchanges';
      notes = 'CAPD IP Continuous: Load 20-25 mg/kg IP, then 25 mg/L added to all exchanges.';
      break;
    case 'apd_ip':
      loadingMgKg = 0;
      maintMgKg = 15;
      maintInterval = 'IP every 4 days';
      notes = 'APD Intraperitoneal: 15 mg/kg IP every 4 days. Supplemental doses may be needed. Dwell ≥6 hours preferred.';
      break;
    default:
      return;
  }
  
  // Use loadingWt (actual BW) for loading, maintWt (AdjBW if obese) for maintenance
  let loadingDose = loadingMgKg > 0 ? round250(loadingWt * loadingMgKg) : 0;
  if (loadingDose > 3000) loadingDose = 3000;
  
  let maintDose = maintMgKg > 0 ? round250(maintWt * maintMgKg) : 0;
  // Cap maintenance dose at 2g per dose (consistent with non-dialysis)
  if (maintDose > 2000) maintDose = 2000;
  
  // Skip loading dose if patient was previously on vancomycin
  const showLoading = loadingMgKg > 0 && !hasPrevDose;
  
  // Special handling for IP continuous (mg/L not mg/kg)
  const isIPContinuous = dialysis === 'capd_ip_continuous';
  const routeLabel = dialysis.includes('ip') ? 'IP' : 'IV';
  
  let loadingHtml = '';
  if (showLoading) {
    loadingHtml = `
    <div class="dose-card">
      <div class="dose-title">Loading Dose</div>
      <div class="dose-value">${formatDose(loadingDose)} mg ${routeLabel}</div>
      <div class="dose-hint">${loadingMgKg} mg/kg × ${loadingWt.toFixed(1)} kg (ABW)</div>
    </div>`;
  } else if (hasPrevDose && loadingMgKg > 0) {
    loadingHtml = `
    <div class="dose-card" style="opacity: 0.6;">
      <div class="dose-title">Loading Dose</div>
      <div class="dose-value" style="color: var(--v-muted);">Not needed</div>
      <div class="dose-hint">Patient already on vancomycin</div>
    </div>`;
  }
  
  let html = loadingHtml + `
    <div class="dose-card">
      <div class="dose-title">Maintenance Dose</div>
      <div class="dose-value orange">${isIPContinuous ? '25 mg/L in all exchanges' : (maintDose > 0 ? formatDose(maintDose) + ' mg ' + routeLabel + ' ' + maintInterval : maintInterval)}${maintDose > 2000 ? ' <span class="max-warning">⚠️ MAX 2g</span>' : ''}</div>
      <div class="dose-hint">${maintMgKg > 0 ? maintMgKg + ' mg/kg × ' + maintWt.toFixed(1) + ' kg' : (isIPContinuous ? 'Add to each liter of dialysate' : '')}</div>
    </div>
    <div class="info-box" style="margin-top: 12px;">
      <strong>📌 Notes:</strong> ${notes}
    </div>
  `;
  
  vEl('dialysisContent').innerHTML = html;
  
  const maintText = isIPContinuous ? '25 mg/L in all exchanges' : `${formatDose(maintDose)} mg ${routeLabel} ${maintInterval}`;
  const regimenText = showLoading 
    ? `Loading: ${formatDose(loadingDose)} mg ${routeLabel}\nMaintenance: ${maintText}`
    : `Maintenance: ${maintText}`;
  updateRegimen(regimenText, notes);
}

function updateIndicationNote(indication) {
  const notes = {
    'bacteremia': 'MRSA bacteremia: Duration ≥14 days from first negative blood culture. AUC-guided dosing preferred. Consider ID consult.',
    'endocarditis': 'Endocarditis: Native valve 6 weeks; prosthetic ≥6 weeks with combination therapy. AUC 400-600.',
    'meningitis': 'CNS infection: Target trough 15-20 µg/mL or AUC 400-600. Consider intrathecal vancomycin (5-20 mg/day) if poor response.',
    'pneumonia': 'MRSA pneumonia: Duration 7-21 days based on response. Consider linezolid as alternative.',
    'osteomyelitis': 'Osteomyelitis: Duration ≥6 weeks (shorter if bone completely resected). AUC-guided dosing.',
    'ssti': 'SSTI: Uncomplicated 7-14 days, trough 10-15 µg/mL. Complicated: AUC monitoring recommended.',
    'sepsis': 'Sepsis/critically ill: Loading dose ASAP (within 1 hour). AUC 400-600. Check for ARC (CrCl ≥130).',
    'surgical_prophylaxis': 'Surgical prophylaxis: 15 mg/kg 60-120 min pre-incision. Repeat if surgery >4h. Stop ≤24h post-op.',
    'pji': 'Prosthetic joint infection: Duration 2-6 weeks. Combine with rifampin when appropriate after debridement.',
    'dfi': 'Diabetic foot infection: MRSA coverage 2-4 weeks without osteomyelitis. Add gram-negative coverage as needed.',
    'csf_shunt': 'CSF shunt infection: IV + intrathecal/intraventricular (5-20 mg/day). Remove hardware if possible. Duration per ID.',
    'gbs_prophylaxis': 'GBS maternal prophylaxis: 20 mg/kg (max 2g) loading, then 20 mg/kg q8h until delivery.',
    'cdi': 'C. difficile: Use ORAL vancomycin 125 mg q6h × 10 days. Fulminant: 500 mg q6h ± rectal enema + IV metronidazole.',
    'intrathecal': 'Intrathecal: 10-20 mg/day adult. Use preservative-free formulation. Target CSF 10-20 µg/mL.'
  };
  
  vEl('indicationNote').innerHTML = `<strong>📌 ${indication.replace(/_/g, ' ').toUpperCase()}:</strong> ${notes[indication] || 'No specific guidance.'}`;
}

function updateRegimen(regimenText, notes) {
  const box = vEl('regimenBox');
  if (!regimenText) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  vEl('regimenText').textContent = regimenText;
  vEl('regimenNotes').textContent = notes || '';
}

function clearOutputs() {
  vEl('loadingDoseOutput').textContent = '—';
  vEl('maintDoseOutput').textContent = '—';
  vEl('intervalOutput').textContent = '—';
  vEl('dailyDoseOutput').textContent = '—';
  vEl('infusionOutput').textContent = '—';
  vEl('loadingHint').textContent = '25-30 mg/kg IV (max 3 gm)';
  vEl('maintHint').textContent = '15-20 mg/kg IV';
  vEl('intervalHint').textContent = 'Based on CrCl per Sanford';
  vEl('dailyHint').textContent = 'Total mg/day';
  vEl('regimenBox').classList.add('hidden');
}

function copyRegimen() {
  // Collect all dosing info from outputs
  const loading = vEl('loadingDoseOutput').innerText;
  const maint = vEl('maintDoseOutput').innerText;
  const interval = vEl('intervalOutput').innerText;
  const daily = vEl('dailyDoseOutput').innerText;
  const infusion = vEl('infusionOutput').innerText;
  
  const text = `Loading: ${loading}\nMaintenance: ${maint}\nInterval: ${interval}\nDaily Dose: ${daily}\nInfusion: ${infusion}`;
  navigator.clipboard.writeText(text).then(() => {
    alert('Regimen copied to clipboard!');
  });
}

// IV Concentration Check
function checkConcentration() {
  const dose = +(vEl('concDose').value || 0);
  const vol = +(vEl('concVol').value || 0);
  
  if (dose > 0 && vol > 0) {
    const conc = dose / vol;
    let status, style;
    if (conc > 10) {
      status = '❌ UNSAFE: >10 mg/mL — Do not use';
      style = 'color: #ef4444;';
    } else if (conc > 5) {
      status = '⚠️ Caution: 5-10 mg/mL — Only if fluid-restricted';
      style = 'color: #fbbf24;';
    } else {
      status = '✓ OK: ≤5 mg/mL';
      style = 'color: #34d399;';
    }
    vEl('concResult').innerHTML = `<strong>${conc.toFixed(2)} mg/mL</strong> <span style="${style}">${status}</span>`;
  } else {
    vEl('concResult').textContent = 'Enter dose and volume to check concentration...';
  }
}

// Antibiotic Lock Calculator
function calcLock() {
  const vol = +(vEl('lockVol').value || 0);
  
  if (vol > 0) {
    const mgLow = (2.5 * vol).toFixed(1);
    const mgHigh = (5 * vol).toFixed(1);
    vEl('lockResult').innerHTML = `Mix <strong style="color: var(--v-accent);">${mgLow}-${mgHigh} mg</strong> vancomycin in ${vol} mL to achieve 2.5-5 mg/mL lock solution. Dwell per protocol (up to 72h).`;
  } else {
    vEl('lockResult').textContent = 'Enter lumen volume for lock calculation...';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  calculate();
  checkConcentration();
  calcLock();
});

// Init
(function init(){
  $("#year").textContent = String(new Date().getFullYear());
  renderHistory();

  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);

  // Favorites
  injectFavoriteButtons();
  renderFavorites();

  // Collapsible categories
  setupCollapsibleCategories();

  // Default calc already visible (CrCl)
})();
