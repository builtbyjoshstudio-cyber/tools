/* ============================================================
   Loan Payment Calculator — Tynkr Tools & Co
   Fixed-rate amortization: payment, interest, payoff date,
   and extra-payment savings. Vanilla JS, self-contained.
   Theme is handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../money/index.html",
  "freelance-rate-calculator": "../freelance-rate-calculator/index.html",
  "debt-payoff-calculator": "../debt-payoff-calculator/index.html",
  "budget-calculator": "../budget-calculator/index.html",
  "invoice-generator": "../invoice-generator/index.html",
  "loan-payment-calculator": "../loan-payment-calculator/index.html",
  "compound-interest-calculator": "../compound-interest-calculator/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  var amountEl  = document.getElementById("loan-amount");
  var aprEl     = document.getElementById("loan-apr");
  var termEl    = document.getElementById("loan-term");
  var extraEl   = document.getElementById("extra-payment");
  var extraBub  = document.getElementById("extra-bubble");

  // Outputs
  var heroPay   = document.getElementById("hero-payment");
  var heroSub   = document.getElementById("hero-sub");
  var payoffOut = document.getElementById("payoff-output");
  var interOut  = document.getElementById("interest-output");
  var savedOut  = document.getElementById("saved-output");
  var chartEl   = document.getElementById("chart");
  var breakdown = document.getElementById("breakdown");

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
  function monthsToText(m) {
    if (m <= 0) return "0 months";
    var y = Math.floor(m / 12), mm = m % 12, parts = [];
    if (y) parts.push(y + (y === 1 ? " yr" : " yrs"));
    if (mm) parts.push(mm + " mo");
    return parts.join(" ");
  }
  function futureDate(m) {
    var d = new Date();
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // ---------- amortization ----------
  // Standard fixed payment: P * r / (1 - (1+r)^-n). Zero-rate loans divide evenly.
  function scheduledPayment(principal, apr, months) {
    if (principal <= 0 || months <= 0) return 0;
    var r = apr / 100 / 12;
    if (r === 0) return principal / months;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }

  // Simulate month by month; returns { months, totalInterest, curve[] }.
  // curve[i] = remaining balance after month i (curve[0] = starting principal).
  var HARD_CAP = 1201; // > 100 yrs of months; guards degenerate inputs

  function simulate(principal, apr, payment, extra) {
    var r = apr / 100 / 12;
    var bal = principal;
    var totalInterest = 0;
    var curve = [bal];
    var m = 0;
    while (bal > 0.005 && m < HARD_CAP) {
      m++;
      var interest = bal * r;
      var applied = payment + extra;
      // If payment doesn't cover interest, the loan never amortizes.
      if (applied <= interest && r > 0) return null;
      var principalPart = Math.min(applied - interest, bal);
      totalInterest += interest;
      bal -= principalPart;
      curve.push(Math.max(bal, 0));
    }
    if (m >= HARD_CAP) return null;
    return { months: m, totalInterest: totalInterest, curve: curve };
  }

  // ---------- chart (SVG, two balance curves) ----------
  function drawChart(planCurve, baseCurve, principal) {
    var W = 700, H = 240, PAD = 10;
    var maxM = Math.max(planCurve.length, baseCurve.length) - 1;
    if (maxM < 1 || principal <= 0) { chartEl.innerHTML = ""; return; }
    function pts(curve) {
      var out = [];
      for (var i = 0; i < curve.length; i++) {
        var x = PAD + (W - 2 * PAD) * (i / maxM);
        var y = PAD + (H - 2 * PAD) * (1 - curve[i] / principal);
        out.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      return out.join(" ");
    }
    chartEl.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<polyline class="chart-baseline" points="' + pts(baseCurve) + '" fill="none" stroke-width="2" stroke-dasharray="5 5"/>' +
        '<polyline class="chart-primary" points="' + pts(planCurve) + '" fill="none" stroke-width="3"/>' +
      "</svg>";
  }

  // ---------- breakdown rows ----------
  function renderBreakdown(principal, totalInterest, payment, extra, months) {
    var totalCost = principal + totalInterest;
    var rows = [
      { ix: "P", h: "Principal", p: "The amount you borrowed", code: money(principal) },
      { ix: "I", h: "Total interest", p: "What the loan costs you on top", code: money(totalInterest) },
      { ix: "&Sigma;", h: "Total of payments", p: "Principal + interest over " + monthsToText(months), code: money(totalCost) }
    ];
    if (extra > 0) {
      rows.push({ ix: "+", h: "Monthly outlay", p: "Payment " + money2(payment) + " + " + money(extra) + " extra", code: money2(payment + extra) });
    }
    breakdown.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h4>' + row.h + "</h4><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- main render ----------
  function render() {
    var principal = Math.max(num(amountEl, 0), 0);
    var apr = Math.min(Math.max(num(aprEl, 0), 0), 60);
    var months = parseInt(termEl.value, 10) || 60;
    var extra = num(extraEl, 0);

    extraBub.textContent = "$" + extra + "/mo extra";

    var payment = scheduledPayment(principal, apr, months);
    if (principal <= 0 || payment <= 0) {
      heroPay.textContent = "$0";
      heroSub.textContent = "Enter a loan amount to see your payment.";
      payoffOut.textContent = "—";
      interOut.textContent = "—";
      savedOut.textContent = "—";
      chartEl.innerHTML = "";
      breakdown.innerHTML = "";
      return;
    }

    var base = simulate(principal, apr, payment, 0);
    var plan = extra > 0 ? simulate(principal, apr, payment, extra) : base;
    if (!base || !plan) {
      heroPay.textContent = money2(payment);
      heroSub.textContent = "These numbers never pay the loan off — check the rate and term.";
      payoffOut.textContent = "—";
      interOut.textContent = "—";
      savedOut.textContent = "—";
      chartEl.innerHTML = "";
      breakdown.innerHTML = "";
      return;
    }

    heroPay.textContent = money2(payment);
    if (extra > 0) {
      var monthsSaved = base.months - plan.months;
      heroSub.textContent = "With " + money(extra) + "/mo extra you pay " + money2(payment + extra) +
        " and finish " + monthsToText(monthsSaved) + " early.";
    } else {
      heroSub.textContent = "Standard amortized payment over " + monthsToText(months) + " at " + apr + "% APR.";
    }

    payoffOut.textContent = futureDate(plan.months);
    interOut.textContent = money(plan.totalInterest);
    savedOut.textContent = extra > 0 ? money(base.totalInterest - plan.totalInterest) : "$0";

    drawChart(plan.curve, base.curve, principal);
    renderBreakdown(principal, plan.totalInterest, payment, extra, plan.months);
  }

  [amountEl, aprEl, termEl, extraEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
