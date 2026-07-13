/* ============================================================
   Take-Home Pay Calculator — Tynkr Tools & Co
   Salary -> net paycheck: 2025 federal brackets + standard
   deduction, FICA (SS capped, Medicare + 0.9% surtax), pre-tax
   401(k), optional flat state rate. Vanilla JS, self-contained.
   Estimates only — not tax advice.
   Theme is handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../money/",
  "freelance-rate-calculator": "../freelance-rate-calculator/",
  "debt-payoff-calculator": "../debt-payoff-calculator/",
  "budget-calculator": "../budget-calculator/",
  "invoice-generator": "../invoice-generator/",
  "loan-payment-calculator": "../loan-payment-calculator/",
  "compound-interest-calculator": "../compound-interest-calculator/",
  "emergency-fund-calculator": "../emergency-fund-calculator/",
  "savings-goal-calculator": "../savings-goal-calculator/",
  "quarterly-tax-estimator": "../quarterly-tax-estimator/",
  "profit-margin-calculator": "../profit-margin-calculator/",
  "home-affordability-calculator": "../home-affordability-calculator/",
  "take-home-pay-calculator": "../take-home-pay-calculator/"
};

document.addEventListener("DOMContentLoaded", function () {
  // ---- 2025 federal figures (update annually) ----
  var SS_RATE = 0.062;             // employee Social Security
  var SS_WAGE_BASE = 176100;       // 2025 Social Security wage cap
  var MEDICARE_RATE = 0.0145;      // employee Medicare
  var MEDICARE_SURTAX = 0.009;     // additional Medicare (withholding kicks in over $200k)
  var MEDICARE_SURTAX_FLOOR = 200000;
  var STD_DEDUCTION = { single: 15000, mfj: 30000 };
  var BRACKETS = {
    single: [
      { upTo: 11925,    rate: 0.10 },
      { upTo: 48475,    rate: 0.12 },
      { upTo: 103350,   rate: 0.22 },
      { upTo: 197300,   rate: 0.24 },
      { upTo: 250525,   rate: 0.32 },
      { upTo: 626350,   rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ],
    mfj: [
      { upTo: 23850,    rate: 0.10 },
      { upTo: 96950,    rate: 0.12 },
      { upTo: 206700,   rate: 0.22 },
      { upTo: 394600,   rate: 0.24 },
      { upTo: 501050,   rate: 0.32 },
      { upTo: 751600,   rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ]
  };
  var FREQ_LABEL = {
    52: "every week",
    26: "every two weeks",
    24: "twice a month",
    12: "every month"
  };

  var salaryEl = document.getElementById("salary");
  var statusEl = document.getElementById("filing-status");
  var freqEl   = document.getElementById("frequency");
  var stateEl  = document.getElementById("state-rate");
  var k401El   = document.getElementById("k401");
  var k401Bub  = document.getElementById("k401-bubble");

  // Outputs
  var stageLabel = document.getElementById("stage-label");
  var heroNet    = document.getElementById("hero-net");
  var heroSub    = document.getElementById("hero-sub");
  var monthlyOut = document.getElementById("monthly-output");
  var rateOut    = document.getElementById("rate-output");
  var annualOut  = document.getElementById("annual-output");
  var splitEl    = document.getElementById("paycheck-split");

  // ---------- helpers ----------
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function money2(n) {
    if (!isFinite(n)) n = 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }
  function cents(n) { return Math.round(n * 100) / 100; }

  // ---------- tax math (annual) ----------
  function bracketTax(taxable, status) {
    if (taxable <= 0) return 0;
    var tax = 0, lower = 0;
    var rows = BRACKETS[status] || BRACKETS.single;
    for (var i = 0; i < rows.length; i++) {
      var upper = Math.min(taxable, rows[i].upTo);
      if (upper > lower) tax += (upper - lower) * rows[i].rate;
      if (taxable <= rows[i].upTo) break;
      lower = rows[i].upTo;
    }
    return tax;
  }

  function fica(gross) {
    var ss = Math.min(gross, SS_WAGE_BASE) * SS_RATE;
    var medicare = gross * MEDICARE_RATE +
      Math.max(gross - MEDICARE_SURTAX_FLOOR, 0) * MEDICARE_SURTAX;
    return { ss: ss, medicare: medicare };
  }

  // ---------- main render ----------
  function render() {
    var gross = Math.max(num(salaryEl, 0), 0);
    var status = statusEl.value === "mfj" ? "mfj" : "single";
    var periods = parseInt(freqEl.value, 10) || 26;
    var stateRate = Math.min(Math.max(num(stateEl, 0), 0), 15) / 100;
    var kPct = Math.min(Math.max(num(k401El, 5), 0), 25) / 100;

    k401Bub.textContent = Math.round(kPct * 100) + "% of gross";
    stageLabel.textContent = "Take-home " + (FREQ_LABEL[periods] || "per paycheck");

    if (gross <= 0) {
      heroNet.textContent = "$0";
      heroSub.textContent = "Enter your annual salary to see your real paycheck.";
      monthlyOut.textContent = "—";
      rateOut.textContent = "—";
      annualOut.textContent = "—";
      splitEl.innerHTML = "";
      return;
    }

    // annual amounts
    var k401 = gross * kPct;
    var f = fica(gross);
    var fedTaxable = Math.max(gross - k401 - STD_DEDUCTION[status], 0);
    var fed = bracketTax(fedTaxable, status);
    var state = Math.max(gross - k401, 0) * stateRate;
    var totalTax = f.ss + f.medicare + fed + state;
    var netAnnual = gross - k401 - totalTax;

    // per-paycheck rows, rounded to cents; net derived from the rounded
    // pieces so the rows always sum exactly to the displayed net
    var grossCk = cents(gross / periods);
    var kCk     = cents(k401 / periods);
    var fedCk   = cents(fed / periods);
    var ssCk    = cents(f.ss / periods);
    var medCk   = cents(f.medicare / periods);
    var stCk    = cents(state / periods);
    var netCk   = cents(grossCk - kCk - fedCk - ssCk - medCk - stCk);

    heroNet.textContent = money2(netCk);
    heroSub.textContent = "From a " + money2(grossCk) + " gross paycheck — " +
      Math.round(netCk / grossCk * 100) + "% of it reaches your account.";

    monthlyOut.textContent = money(netAnnual / 12);
    rateOut.textContent = (totalTax / gross * 100).toFixed(1) + "%";
    annualOut.textContent = money(netAnnual);

    var rows = [
      { ix: "G", h: "Gross paycheck", p: "Salary &divide; " + periods + " pay periods", code: money2(grossCk), cls: "" }
    ];
    if (kCk > 0) rows.push({ ix: "401k", h: "401(k) contribution", p: "Pre-tax — still your money, just parked", code: "&minus;" + money2(kCk), cls: "" });
    rows.push({ ix: "FED", h: "Federal income tax", p: "2025 brackets on income after 401(k) + standard deduction", code: "&minus;" + money2(fedCk), cls: "" });
    rows.push({ ix: "SS", h: "Social Security", p: "6.2% of gross" + (gross > SS_WAGE_BASE ? " (capped at $176,100/yr)" : ""), code: "&minus;" + money2(ssCk), cls: "" });
    rows.push({ ix: "MED", h: "Medicare", p: "1.45% of gross" + (gross > MEDICARE_SURTAX_FLOOR ? " + 0.9% surtax over $200k" : ""), code: "&minus;" + money2(medCk), cls: "" });
    if (stCk > 0) rows.push({ ix: "ST", h: "State income tax", p: "Flat " + (stateRate * 100).toFixed(1) + "% after 401(k) (rough)", code: "&minus;" + money2(stCk), cls: "" });
    rows.push({ ix: "NET", h: "Lands in your account", p: "What the month actually runs on", code: money2(netCk), cls: " is-net" });

    splitEl.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row' + row.cls + '">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h4>' + row.h + "</h4><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  [salaryEl, statusEl, freqEl, stateEl, k401El].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
