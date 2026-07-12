/* ============================================================
   Home Affordability Calculator — Tynkr Tools & Co
   28/36 debt-to-income rule -> affordable price range.
   30-yr fixed; property tax + insurance estimated at 1.6%/yr
   of home value. Vanilla JS, self-contained. Estimates only.
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
  "home-affordability-calculator": "../home-affordability-calculator/"
};

document.addEventListener("DOMContentLoaded", function () {
  var TERM_MONTHS = 360;        // 30-year fixed
  var TI_ANNUAL_RATE = 0.016;   // property tax + insurance, % of home value per year
  var BANDS = [
    { key: "safe",    label: "Conservative", front: 0.25, back: 0.33, note: "Extra room for savings and surprises" },
    { key: "std",     label: "Standard",     front: 0.28, back: 0.36, note: "The classic 28/36 lender guideline" },
    { key: "stretch", label: "Stretch",      front: 0.31, back: 0.43, note: "What approval math may allow — thin margins" }
  ];

  var incomeEl = document.getElementById("income");
  var debtsEl  = document.getElementById("debts");
  var downEl   = document.getElementById("down-payment");
  var rateEl   = document.getElementById("rate");
  var rateBub  = document.getElementById("rate-bubble");

  // Outputs
  var heroPrice = document.getElementById("hero-price");
  var heroSub   = document.getElementById("hero-sub");
  var pitiOut   = document.getElementById("piti-output");
  var loanOut   = document.getElementById("loan-output");
  var downOut   = document.getElementById("down-output");
  var bandsEl   = document.getElementById("bands");
  var splitEl   = document.getElementById("payment-split");

  // ---------- helpers ----------
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function money100(n) {
    if (!isFinite(n)) n = 0;
    return "$" + (Math.round(n / 100) * 100).toLocaleString("en-US");
  }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }

  // Monthly P&I per dollar of loan: r / (1 - (1+r)^-n). Zero-rate divides evenly.
  function pmtFactor(apr) {
    var r = apr / 100 / 12;
    if (r === 0) return 1 / TERM_MONTHS;
    return r / (1 - Math.pow(1 + r, -TERM_MONTHS));
  }

  // Max monthly housing budget (PITI) under a front/back ratio pair.
  function maxPiti(grossMo, debts, front, back) {
    return Math.min(grossMo * front, grossMo * back - debts);
  }

  // Affordable price: maxPITI = factor*(price - down) + tiMo*price
  // -> price = (maxPITI + factor*down) / (factor + tiMo)
  function affordablePrice(piti, down, factor) {
    var tiMo = TI_ANNUAL_RATE / 12;
    if (piti <= 0) return 0;
    return (piti + factor * down) / (factor + tiMo);
  }

  // ---------- main render ----------
  function render() {
    var income = Math.max(num(incomeEl, 0), 0);
    var debts = Math.max(num(debtsEl, 0), 0);
    var down = Math.max(num(downEl, 0), 0);
    var apr = Math.min(Math.max(num(rateEl, 6.5), 3), 10);

    rateBub.textContent = apr + "% APR";

    var grossMo = income / 12;
    var factor = pmtFactor(apr);
    var tiMo = TI_ANNUAL_RATE / 12;

    if (income <= 0) {
      heroPrice.textContent = "$0";
      heroSub.textContent = "Enter your household income to get a price range.";
      pitiOut.textContent = "—";
      loanOut.textContent = "—";
      downOut.textContent = "—";
      bandsEl.innerHTML = "";
      splitEl.innerHTML = "";
      return;
    }

    var stdBand = BANDS[1];
    var piti = maxPiti(grossMo, debts, stdBand.front, stdBand.back);

    if (piti <= 0) {
      heroPrice.textContent = "$0";
      heroSub.textContent = "Your monthly debts use up the whole 36% budget — paying some down comes before a mortgage.";
      pitiOut.textContent = "—";
      loanOut.textContent = "—";
      downOut.textContent = "—";
      bandsEl.innerHTML = "";
      splitEl.innerHTML = "";
      return;
    }

    var price = affordablePrice(piti, down, factor);
    // Cash-constrained regime: if the down payment alone out-buys the formula
    // price, no loan is needed — T&I on the home is the binding limit.
    if (piti < tiMo * down) price = piti / tiMo;
    var loan = Math.max(price - down, 0);
    var pAndI = loan * factor;
    var ti = price * tiMo;
    var actualPiti = pAndI + ti;
    var downPct = price > 0 ? Math.min(down / price * 100, 100) : 0;

    heroPrice.textContent = money100(price);
    heroSub.textContent = "Standard 28/36 budget at " + apr + "% over 30 years, with " + money(down) + " down.";

    pitiOut.textContent = money(actualPiti) + "/mo";
    loanOut.textContent = money100(loan);
    downOut.textContent = downPct.toFixed(1) + "%";

    // three budget bands
    bandsEl.innerHTML = BANDS.map(function (b) {
      var bPiti = maxPiti(grossMo, debts, b.front, b.back);
      var bPrice = affordablePrice(bPiti, down, factor);
      var cur = b.key === "std" ? " is-current" : "";
      return '<div class="glass-lite anatomy-row' + cur + '">' +
        '<div class="ix">' + Math.round(b.front * 100) + "</div>" +
        '<div class="lbl"><h4>' + b.label + " &middot; " + Math.round(b.front * 100) + "/" + Math.round(b.back * 100) + "</h4><p>" + b.note + "</p></div>" +
        "<code>" + (bPrice > 0 ? money100(bPrice) : "&mdash;") + "</code>" +
      "</div>";
    }).join("");

    // payment split at the standard price; derive the T&I display from the
    // rounded total so the rows always sum to the total shown
    var pAndIDisp = Math.round(pAndI);
    var tiDisp = Math.round(actualPiti) - pAndIDisp;
    var split = [
      { ix: "P&amp;I", h: "Principal &amp; interest", p: "On a " + money100(loan) + " loan at " + apr + "%", code: money(pAndIDisp) },
      { ix: "T&amp;I", h: "Property tax &amp; insurance", p: "Est. 1.6%/yr of home value — varies by state", code: money(tiDisp) },
      { ix: "&Sigma;", h: "Total monthly housing", p: Math.round(actualPiti / grossMo * 100) + "% of your gross monthly income", code: money(actualPiti) }
    ];
    splitEl.innerHTML = split.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h4>' + row.h + "</h4><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  [incomeEl, debtsEl, downEl, rateEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
