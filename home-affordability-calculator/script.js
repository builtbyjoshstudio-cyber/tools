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
  var hoaEl    = document.getElementById("hoa");
  var pmiEl    = document.getElementById("pmi");

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

  // Affordable price: maxPITI - hoa = factor*(price - down) + tiMo*price
  // -> price = (maxPITI - hoa + factor*down) / (factor + tiMo)
  // PMI (pmiMo per loan dollar a month) only applies under 20% down, and that
  // depends on the price: if the PMI-free price is under 20% down, solve again
  // with PMI in the factor; if PMI pulls the price to 20% down or more, the
  // most you can buy is exactly 20% down (5x the down payment), PMI-free.
  function affordablePrice(piti, down, factor, hoa, pmiMo) {
    var tiMo = TI_ANNUAL_RATE / 12;
    var budget = piti - hoa;
    if (budget <= 0) return 0;
    // Cash-constrained regime: if the down payment alone out-buys the formula
    // price, no loan is needed — T&I on the home is the binding limit.
    if (budget < tiMo * down) return budget / tiMo;
    var price = (budget + factor * down) / (factor + tiMo);
    if (down * 5 >= price) return price;
    return Math.max((budget + (factor + pmiMo) * down) / (factor + pmiMo + tiMo), down * 5);
  }

  // ---------- main render ----------
  function render() {
    var income = Math.max(num(incomeEl, 0), 0);
    var debts = Math.max(num(debtsEl, 0), 0);
    var down = Math.max(num(downEl, 0), 0);
    var apr = Math.min(Math.max(num(rateEl, 6.5), 3), 10);
    var hoa = Math.max(num(hoaEl, 0), 0);
    var pmiRate = Math.min(Math.max(num(pmiEl, 0), 0), 2);

    rateBub.textContent = apr + "% APR";

    var grossMo = income / 12;
    var factor = pmtFactor(apr);
    var tiMo = TI_ANNUAL_RATE / 12;
    var pmiMo = pmiRate / 100 / 12;

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

    if (piti <= hoa) {
      heroPrice.textContent = "$0";
      heroSub.textContent = piti <= 0 ? "Your monthly debts use up the whole 36% budget — paying some down comes before a mortgage."
        : "Your HOA dues use up the whole monthly housing budget.";
      pitiOut.textContent = "—";
      loanOut.textContent = "—";
      downOut.textContent = "—";
      bandsEl.innerHTML = "";
      splitEl.innerHTML = "";
      return;
    }

    var price = affordablePrice(piti, down, factor, hoa, pmiMo);
    var loan = Math.max(price - down, 0);
    var pAndI = loan * factor;
    var ti = price * tiMo;
    var hasPmi = down * 5 < price;
    var pmi = hasPmi ? loan * pmiMo : 0;
    var actualPiti = pAndI + ti + pmi + hoa;
    var downPct = price > 0 ? Math.min(down / price * 100, 100) : 0;

    heroPrice.textContent = money100(price);
    heroSub.textContent = "Standard 28/36 budget at " + apr + "% over 30 years, with " + money(down) + " down.";

    pitiOut.textContent = money(actualPiti) + "/mo";
    loanOut.textContent = money100(loan);
    downOut.textContent = downPct.toFixed(1) + "%";

    // three budget bands
    bandsEl.innerHTML = BANDS.map(function (b) {
      var bPiti = maxPiti(grossMo, debts, b.front, b.back);
      var bPrice = affordablePrice(bPiti, down, factor, hoa, pmiMo);
      var cur = b.key === "std" ? " is-current" : "";
      return '<div class="glass-lite anatomy-row' + cur + '">' +
        '<div class="ix">' + Math.round(b.front * 100) + "</div>" +
        '<div class="lbl"><h2>' + b.label + " &middot; " + Math.round(b.front * 100) + "/" + Math.round(b.back * 100) + "</h2><p>" + b.note + "</p></div>" +
        "<code>" + (bPrice > 0 ? money100(bPrice) : "&mdash;") + "</code>" +
      "</div>";
    }).join("");

    // payment split at the standard price; derive the T&I display from the
    // rounded total so the rows always sum to the total shown
    var pAndIDisp = Math.round(pAndI);
    var pmiDisp = Math.round(pmi);
    var hoaDisp = Math.round(hoa);
    var tiDisp = Math.round(actualPiti) - pAndIDisp - pmiDisp - hoaDisp;
    var split = [
      { ix: "P&amp;I", h: "Principal &amp; interest", p: "On a " + money100(loan) + " loan at " + apr + "%", code: money(pAndIDisp) },
      { ix: "T&amp;I", h: "Property tax &amp; insurance", p: "Est. 1.6%/yr of home value — varies by state", code: money(tiDisp) },
      { ix: "PMI", h: "Private mortgage insurance", p: hasPmi ? "Est. " + pmiRate + "%/yr of the loan while under 20% down" : "None — 20% or more down", code: money(pmiDisp) },
      { ix: "HOA", h: "HOA dues", p: hoa > 0 ? "As entered below" : "None entered", code: money(hoaDisp) },
      { ix: "&Sigma;", h: "Total monthly housing", p: Math.round(actualPiti / grossMo * 100) + "% of your gross monthly income", code: money(actualPiti) }
    ];
    splitEl.innerHTML = split.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- saved inputs + share links ----------
  // Inputs only (never results). One sanitizer for localStorage and for
  // ?income=&debts=&down=&rate=&hoa=&pmi= links; anything invalid is dropped
  // silently (and older saves without hoa/pmi keep the page defaults).
  var STORE_KEY = "tynkr-home-affordability-calculator-v1";
  var MAX_AMOUNT = 1e9;
  var resetBtn   = document.getElementById("reset-btn");
  var copyBtn    = document.getElementById("copy-link-btn");
  var copyStatus = document.getElementById("copy-status");
  var moreEl     = document.getElementById("more-inputs");
  var statusTimer;

  function clampNum(v, lo, hi) {
    if (typeof v !== "number" && typeof v !== "string") return null;
    if (String(v).length > 32) return null;
    if (typeof v === "string" && !/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(v)) return null; // plain numbers only, like a number input
    v = parseFloat(v);
    return isFinite(v) ? Math.min(Math.max(v, lo), hi) : null;
  }
  function sanitize(src) {
    var s = {};
    if (!src || typeof src !== "object") return s;
    var i = clampNum(src.income, 0, MAX_AMOUNT);
    var d = clampNum(src.debts, 0, MAX_AMOUNT);
    var dp = clampNum(src.down, 0, MAX_AMOUNT);
    var r = clampNum(src.rate, 3, 10);
    var h = clampNum(src.hoa, 0, MAX_AMOUNT);
    var p = clampNum(src.pmi, 0, 2);
    if (i !== null) s.income = i;
    if (d !== null) s.debts = d;
    if (dp !== null) s.down = dp;
    if (r !== null) s.rate = 3 + Math.round((r - 3) / 0.125) * 0.125; // slider step
    if (h !== null) s.hoa = h;
    if (p !== null) s.pmi = p;
    return s;
  }
  function apply(s) {
    if (s.income !== undefined) incomeEl.value = s.income;
    if (s.debts !== undefined) debtsEl.value = s.debts;
    if (s.down !== undefined) downEl.value = s.down;
    if (s.rate !== undefined) rateEl.value = s.rate;
    if (s.hoa !== undefined) hoaEl.value = s.hoa;
    if (s.pmi !== undefined) pmiEl.value = s.pmi;
    // show the HOA & PMI fields whenever they hold something other than the defaults
    if (s.hoa || (s.pmi !== undefined && s.pmi !== DEFAULTS.pmi)) moreEl.open = true;
  }
  function current() {
    return sanitize({ income: num(incomeEl, 0), debts: num(debtsEl, 0), down: num(downEl, 0), rate: num(rateEl, 6.5),
      hoa: num(hoaEl, 0), pmi: num(pmiEl, 0) });
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(current())); } catch (e) {}
  }

  var DEFAULTS = sanitize({ income: incomeEl.defaultValue, debts: debtsEl.defaultValue,
    down: downEl.defaultValue, rate: rateEl.defaultValue, hoa: hoaEl.defaultValue, pmi: pmiEl.defaultValue });

  // A shared link wins for this view but is not saved until the user edits here.
  var params = new URLSearchParams(location.search);
  var fromLink = sanitize({ income: params.get("income"), debts: params.get("debts"),
    down: params.get("down"), rate: params.get("rate"), hoa: params.get("hoa"), pmi: params.get("pmi") });
  if (Object.keys(fromLink).length) {
    apply(fromLink);
  } else {
    try { apply(sanitize(JSON.parse(localStorage.getItem(STORE_KEY)))); } catch (e) {}
  }

  resetBtn.addEventListener("click", function () {
    var saved = null; // on a link view the saved numbers aren't the ones shown
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    if ((JSON.stringify(current()) !== JSON.stringify(DEFAULTS) ||
        (saved !== null && JSON.stringify(sanitize(Object.assign({}, DEFAULTS, saved))) !== JSON.stringify(DEFAULTS))) &&
        !confirm("Reset to the example numbers? Your saved numbers in this browser will be cleared.")) return;
    apply(DEFAULTS);
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    render();
  });

  function showStatus(msg) {
    copyStatus.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { copyStatus.textContent = ""; }, 3000);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    var ok = false;
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    copyBtn.focus();
    showStatus(ok ? "Link copied" : "Couldn't copy the link");
  }
  copyBtn.addEventListener("click", function () {
    var s = current();
    var url = location.origin + location.pathname + "?income=" + s.income + "&debts=" + s.debts +
      "&down=" + s.down + "&rate=" + s.rate + "&hoa=" + s.hoa + "&pmi=" + s.pmi;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { showStatus("Link copied"); },
        function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  [incomeEl, debtsEl, downEl, rateEl, hoaEl, pmiEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });

  render();
});
