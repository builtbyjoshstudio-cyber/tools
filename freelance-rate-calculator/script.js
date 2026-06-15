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

  function calculate() {
    var targetIncome = Math.max(0, num(targetIncomeInput, 0));
    var expenses     = Math.max(0, num(expensesInput, 0));
    var taxPct       = Math.min(40, Math.max(0, num(taxRateInput, 15.3)));
    var billable     = Math.max(1, num(billableInput, 25));
    var weeks        = Math.min(52, Math.max(1, num(weeksInput, 48)));
    var compareRate  = Math.max(0, num(compareRateInput, 0));

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

  // --- URL param prefill (house pattern: tools hand off state via query string) ---
  function parseUrlParameters() {
    var p = new URLSearchParams(window.location.search);
    var map = {
      income: targetIncomeInput,
      expenses: expensesInput,
      tax: taxRateInput,
      billable: billableInput,
      weeks: weeksInput,
      rate: compareRateInput
    };
    Object.keys(map).forEach(function (key) {
      if (p.has(key) && map[key]) map[key].value = p.get(key);
    });
  }

  parseUrlParameters();
  inputs.forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", calculate);
    el.addEventListener("change", calculate);
  });
  calculate();
});
