/* ============================================================
   Quarterly Tax Estimator — Tynkr Tools & Co
   SE tax (15.3% on 92.35% of profit, SS portion capped) +
   2025 federal brackets after half-SE deduction and the
   standard deduction, split across the four IRS due dates.
   Vanilla JS, self-contained. Estimates only — not tax advice.
   Theme is handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../money/index.html",
  "freelance-rate-calculator": "../freelance-rate-calculator/index.html",
  "debt-payoff-calculator": "../debt-payoff-calculator/index.html",
  "budget-calculator": "../budget-calculator/index.html",
  "invoice-generator": "../invoice-generator/index.html",
  "loan-payment-calculator": "../loan-payment-calculator/index.html",
  "compound-interest-calculator": "../compound-interest-calculator/index.html",
  "emergency-fund-calculator": "../emergency-fund-calculator/index.html",
  "savings-goal-calculator": "../savings-goal-calculator/index.html",
  "quarterly-tax-estimator": "../quarterly-tax-estimator/index.html",
  "profit-margin-calculator": "../profit-margin-calculator/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  // ---- 2025 federal figures (update annually) ----
  var SE_FACTOR = 0.9235;          // taxable share of net profit
  var SE_SS_RATE = 0.124;          // Social Security portion
  var SE_MEDICARE_RATE = 0.029;    // Medicare portion (uncapped)
  var SS_WAGE_BASE = 176100;       // 2025 Social Security wage base
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
  var DUE_DATES = [
    { q: "Q1", covers: "Jan – Mar income", due: "April 15" },
    { q: "Q2", covers: "Apr – May income", due: "June 15" },
    { q: "Q3", covers: "Jun – Aug income", due: "September 15" },
    { q: "Q4", covers: "Sep – Dec income", due: "January 15 (next year)" }
  ];

  var profitEl = document.getElementById("net-profit");
  var statusEl = document.getElementById("filing-status");
  var stateEl  = document.getElementById("state-rate");

  // Outputs
  var heroQuarterly = document.getElementById("hero-quarterly");
  var heroSub   = document.getElementById("hero-sub");
  var seOut     = document.getElementById("se-output");
  var fedOut    = document.getElementById("fed-output");
  var totalOut  = document.getElementById("total-output");
  var dueDates  = document.getElementById("due-dates");
  var calcBreak = document.getElementById("calc-breakdown");

  // ---------- helpers ----------
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }

  // ---------- tax math ----------
  function seTax(profit) {
    var base = profit * SE_FACTOR;
    var ss = Math.min(base, SS_WAGE_BASE) * SE_SS_RATE;
    var medicare = base * SE_MEDICARE_RATE;
    return ss + medicare;
  }

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

  // ---------- rows ----------
  function renderDueDates(quarterly) {
    dueDates.innerHTML = DUE_DATES.map(function (d) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + d.q + "</div>" +
        '<div class="lbl"><h4>Due ' + d.due + "</h4><p>" + d.covers + "</p></div>" +
        "<code>" + money(quarterly) + "</code>" +
      "</div>";
    }).join("");
  }

  function renderBreakdown(profit, se, halfSE, deduction, taxable, fed, state, stateRate) {
    var rows = [
      { ix: "SE", h: "Self-employment tax", p: "15.3% on " + money(profit * SE_FACTOR) + " (92.35% of profit)", code: money(se) },
      { ix: "&minus;", h: "Adjustments", p: "Half of SE tax (" + money(halfSE) + ") + standard deduction (" + money(deduction) + ")", code: "&minus;" + money(halfSE + deduction) },
      { ix: "IT", h: "Federal income tax", p: "2025 brackets on " + money(taxable) + " taxable income", code: money(fed) }
    ];
    if (stateRate > 0) {
      rows.push({ ix: "ST", h: "State income tax", p: "Flat " + stateRate + "% of net profit (rough)", code: money(state) });
    }
    calcBreak.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h4>' + row.h + "</h4><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- main render ----------
  function render() {
    var profit = Math.max(num(profitEl, 0), 0);
    var status = statusEl.value === "mfj" ? "mfj" : "single";
    var stateRate = Math.min(Math.max(num(stateEl, 0), 0), 15);

    if (profit <= 0) {
      heroQuarterly.textContent = "$0";
      heroSub.textContent = "Enter your expected annual net profit to estimate payments.";
      seOut.textContent = "—";
      fedOut.textContent = "—";
      totalOut.textContent = "—";
      dueDates.innerHTML = "";
      calcBreak.innerHTML = "";
      return;
    }

    var se = seTax(profit);
    var halfSE = se / 2;
    var deduction = STD_DEDUCTION[status];
    var taxable = Math.max(profit - halfSE - deduction, 0);
    var fed = bracketTax(taxable, status);
    var state = profit * (stateRate / 100);
    var total = se + fed + state;
    var quarterly = total / 4;

    heroQuarterly.textContent = money(quarterly);
    var pct = profit > 0 ? Math.round(total / profit * 100) : 0;
    heroSub.textContent = "About " + pct + "% of your profit goes to tax — " + money(total) + " for the year, split four ways.";

    seOut.textContent = money(se);
    fedOut.textContent = money(fed);
    totalOut.textContent = money(total);

    renderDueDates(quarterly);
    renderBreakdown(profit, se, halfSE, deduction, taxable, fed, state, stateRate);
  }

  [profitEl, statusEl, stateEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
