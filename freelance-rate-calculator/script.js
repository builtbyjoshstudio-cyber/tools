/* ============================================================
   Freelance Rate Calculator — Tynkr Tools & Co
   Vanilla JS, self-contained. Theme is handled globally by ../kinetic.js
   ============================================================ */

/* Cross-tool deep-link registry (house pattern). Add finance tools here as they ship. */
var TYNKR_REGISTRY = {
  hub: "../index.html",
  "freelance-rate-calculator": "../freelance-rate-calculator/index.html"
  // "debt-payoff-calculator": "../debt-payoff-calculator/index.html",
};

function getToolUrl(toolId, params) {
  var base = TYNKR_REGISTRY[toolId] || "../index.html";
  if (!params) return base;
  var qs = new URLSearchParams(params).toString();
  return qs ? base + "?" + qs : base;
}

document.addEventListener("DOMContentLoaded", function () {
  // --- Inputs ---
  var targetIncomeInput = document.getElementById("target-income");
  var expensesInput     = document.getElementById("expenses");
  var taxRateInput      = document.getElementById("tax-rate");
  var taxBubble         = document.getElementById("tax-bubble");
  var billableInput     = document.getElementById("billable-hours");
  var weeksInput        = document.getElementById("weeks");
  var compareRateInput  = document.getElementById("compare-rate");

  // --- Outputs ---
  var rateOutput    = document.getElementById("rate-output");
  var rateSub       = document.getElementById("rate-sub");
  var grossOutput   = document.getElementById("gross-output");
  var taxOutput     = document.getElementById("tax-output");
  var hoursOutput   = document.getElementById("hours-output");
  var compareEcho   = document.getElementById("compare-echo");
  var compareOutput = document.getElementById("compare-output");
  var compareRow    = compareOutput ? compareOutput.closest(".anatomy-row") : null;
  var verdict       = document.getElementById("verdict");

  var inputs = [targetIncomeInput, expensesInput, taxRateInput, billableInput, weeksInput, compareRateInput];

  // --- Formatting helpers (house pattern: each tool defines its own) ---
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }

  var MONEY_MAX = 1e9; // sanity cap for money values, typed or loaded (those inputs have no max)

  function calculate() {
    var targetIncome = Math.min(MONEY_MAX, Math.max(0, num(targetIncomeInput, 0)));
    var expenses     = Math.min(MONEY_MAX, Math.max(0, num(expensesInput, 0)));
    var taxPct       = Math.min(40, Math.max(0, num(taxRateInput, 25)));
    var billable     = Math.min(80, Math.max(1, num(billableInput, 25)));
    var weeks        = Math.min(52, Math.max(1, num(weeksInput, 48)));
    var compareRate  = Math.min(MONEY_MAX, Math.max(0, num(compareRateInput, 0)));

    if (taxBubble) taxBubble.textContent = taxPct.toFixed(1).replace(/\.0$/, "") + "%";

    // Build the rate up from take-home.
    // Gross revenue must cover: target take-home + expenses, then gross up for tax
    // applied to (gross - expenses). Solve: (G - expenses) * (1 - t) = targetIncome
    //   => G = targetIncome / (1 - t) + expenses
    var t = taxPct / 100;
    var preTaxNeeded = (t >= 1) ? targetIncome : targetIncome / (1 - t);
    var gross = preTaxNeeded + expenses;
    var taxAmount = preTaxNeeded - targetIncome; // tax paid on the pre-tax earnings

    var billableHoursYear = billable * weeks;
    var requiredRate = gross / billableHoursYear;

    // What the compare rate actually nets after expenses & tax
    var compareGross = compareRate * billableHoursYear;
    var compareAfterExp = compareGross - expenses;
    var compareTakeHome = compareAfterExp > 0 ? compareAfterExp * (1 - t) : compareAfterExp;

    // --- Write results ---
    rateOutput.textContent  = money(requiredRate) + "/hr";
    grossOutput.textContent = money(gross);
    taxOutput.textContent   = money(taxAmount);
    hoursOutput.textContent = Math.round(billableHoursYear).toLocaleString("en-US") + " hrs";

    if (compareEcho)   compareEcho.textContent = money(compareRate) + "/hr";
    if (compareOutput) compareOutput.textContent = money(compareTakeHome);

    // --- Verdict copy + color cue ---
    var diff = compareTakeHome - targetIncome;
    if (compareRow) compareRow.classList.toggle("is-pos", diff >= 0);
    if (verdict) {
      if (compareRate <= 0) {
        verdict.textContent = "Enter a rate you're considering to see what it nets you after tax and expenses.";
      } else if (diff >= 0) {
        verdict.textContent = "Charging " + money(compareRate) + "/hr clears your " + money(targetIncome) +
          " goal with " + money(diff) + " to spare.";
      } else {
        verdict.textContent = "At " + money(compareRate) + "/hr you'd fall " + money(-diff) +
          " short of your " + money(targetIncome) + " goal. You need about " + money(requiredRate) + "/hr.";
      }
    }
    if (rateSub) {
      rateSub.textContent = "to net " + money(targetIncome) + " after tax, expenses, and non-billable time";
    }
  }

  // --- Inputs state: one sanitizer for saved inputs (localStorage) and share-link params ---
  var STORE_KEY = "tynkr-freelance-rate-calculator-v1";
  var fields = [
    { key: "income",   el: targetIncomeInput, min: 0, max: MONEY_MAX },
    { key: "expenses", el: expensesInput,     min: 0, max: MONEY_MAX },
    { key: "tax",      el: taxRateInput,      min: 0, max: 40 },
    { key: "billable", el: billableInput,     min: 1, max: 80 },
    { key: "weeks",    el: weeksInput,        min: 1, max: 52 },
    { key: "rate",     el: compareRateInput,  min: 0, max: MONEY_MAX }
  ];

  // Returns a safe value for the field's input, or null to ignore it.
  function cleanValue(f, raw) {
    if (raw === "" && f.el.type === "number") return ""; // a cleared field stays cleared
    if (typeof raw === "string" && raw.length <= 30 && /^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(raw)) raw = parseFloat(raw);
    if (typeof raw !== "number" || isNaN(raw)) return null;
    return String(Math.min(f.max, Math.max(f.min, raw)));
  }
  // get(key) returns the raw value or null; returns how many fields were set.
  function applyValues(get) {
    var used = 0;
    fields.forEach(function (f) {
      var v = cleanValue(f, get(f.key));
      if (v !== null) { f.el.value = v; used++; }
    });
    return used;
  }
  function currentValues() {
    var o = {};
    fields.forEach(function (f) { o[f.key] = f.el.value; });
    return o;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(currentValues())); } catch (e) {}
  }
  function loadSaved() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    if (!o || typeof o !== "object" || Array.isArray(o)) return;
    applyValues(function (k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; });
  }

  // --- URL param prefill (house pattern: tools hand off state via query string; Copy link uses the same names) ---
  function parseUrlParameters() {
    var p = new URLSearchParams(window.location.search);
    return applyValues(function (k) { return p.has(k) ? p.get(k) : null; }) > 0;
  }

  // A link's numbers win for this view but are not saved until something is changed here.
  if (!parseUrlParameters()) loadSaved();
  function onEdit() { calculate(); save(); }
  inputs.forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit);
  });

  // --- Reset to the example (the HTML value attributes) ---
  var resetBtn = document.getElementById("reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    var changed = fields.some(function (f) { return f.el.value !== f.el.defaultValue; });
    // a link view shows the link's numbers, not yours: if any are saved, ask before deleting them
    try { changed = changed || localStorage.getItem(STORE_KEY) !== null; } catch (e) {}
    if (changed && !confirm("Reset to the example numbers? This also clears the numbers saved in this browser.")) return;
    fields.forEach(function (f) { f.el.value = f.el.defaultValue; });
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    calculate();
  });

  // --- Copy link (only on click; the address bar is never rewritten) ---
  var copyBtn = document.getElementById("copy-link");
  var copyStatus = document.getElementById("copy-status");
  var statusTimer = null;
  function showStatus(msg) {
    copyStatus.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { copyStatus.textContent = ""; }, 4000);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    copyBtn.focus();
    return ok;
  }
  if (copyBtn && copyStatus) copyBtn.addEventListener("click", function () {
    var url = location.origin + location.pathname + "?" + new URLSearchParams(currentValues()).toString();
    function done(ok) { showStatus(ok ? "Link copied" : "Couldn't copy the link"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(fallbackCopy(url)); });
    } else done(fallbackCopy(url));
  });

  calculate();
});
