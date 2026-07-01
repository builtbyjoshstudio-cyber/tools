/* ============================================================
   Compound Interest Calculator — Tynkr Tools & Co
   Monthly compounding with end-of-month contributions.
   Vanilla JS, self-contained.
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
  var startEl   = document.getElementById("start-amount");
  var contribEl = document.getElementById("monthly-contrib");
  var rateEl    = document.getElementById("annual-rate");
  var yearsEl   = document.getElementById("years");
  var yearsBub  = document.getElementById("years-bubble");

  // Outputs
  var stageYears = document.getElementById("stage-years");
  var heroBal    = document.getElementById("hero-balance");
  var heroSub    = document.getElementById("hero-sub");
  var contribOut = document.getElementById("contrib-output");
  var growthOut  = document.getElementById("growth-output");
  var shareOut   = document.getElementById("share-output");
  var chartEl    = document.getElementById("chart");
  var milestones = document.getElementById("milestones");

  // ---------- helpers ----------
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }
  function yearsText(y) {
    return y + (y === 1 ? " year" : " years");
  }

  // ---------- simulation ----------
  // Monthly compounding; contribution added at end of each month.
  // Returns { balCurve[], contribCurve[], crossoverMonth } with curve[i] = value after month i.
  function simulate(start, contrib, annualRate, years) {
    var r = annualRate / 100 / 12;
    var months = Math.round(years * 12);
    var bal = start;
    var put = start;
    var balCurve = [bal];
    var contribCurve = [put];
    var crossover = -1;
    for (var m = 1; m <= months; m++) {
      bal = bal * (1 + r) + contrib;
      put += contrib;
      balCurve.push(bal);
      contribCurve.push(put);
      if (crossover < 0 && bal - put > put) crossover = m;
    }
    return { balCurve: balCurve, contribCurve: contribCurve, crossoverMonth: crossover };
  }

  // ---------- chart (SVG, balance vs contributions) ----------
  function drawChart(balCurve, contribCurve) {
    var W = 700, H = 240, PAD = 10;
    var maxM = balCurve.length - 1;
    var maxV = balCurve[maxM];
    if (maxM < 1 || maxV <= 0) { chartEl.innerHTML = ""; return; }
    function pts(curve) {
      var out = [];
      for (var i = 0; i < curve.length; i++) {
        var x = PAD + (W - 2 * PAD) * (i / maxM);
        var y = PAD + (H - 2 * PAD) * (1 - curve[i] / maxV);
        out.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      return out.join(" ");
    }
    chartEl.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<polyline class="chart-baseline" points="' + pts(contribCurve) + '" fill="none" stroke-width="2" stroke-dasharray="5 5"/>' +
        '<polyline class="chart-primary" points="' + pts(balCurve) + '" fill="none" stroke-width="3"/>' +
      "</svg>";
  }

  // ---------- milestones ----------
  function renderMilestones(sim, years, annualRate) {
    var rows = [];
    var months = sim.balCurve.length - 1;

    if (sim.crossoverMonth > 0) {
      var xy = Math.ceil(sim.crossoverMonth / 12);
      rows.push({
        ix: "&times;", h: "Growth overtakes you",
        p: "Around year " + xy + ", total growth passes total contributions",
        code: "yr " + xy
      });
    } else if (annualRate > 0) {
      rows.push({
        ix: "&times;", h: "Crossover not reached",
        p: "Growth doesn't pass contributions in this timeline — add years or rate",
        code: "&mdash;"
      });
    }

    var halfY = Math.max(1, Math.round(years / 2));
    var halfM = Math.min(halfY * 12, months);
    rows.push({
      ix: "&frac12;", h: "Halfway there",
      p: "Balance at year " + halfY + " — the second half grows much faster",
      code: money(sim.balCurve[halfM])
    });

    if (annualRate > 0) {
      var dbl = 72 / annualRate;
      rows.push({
        ix: "72", h: "Doubling time",
        p: "Rule of 72: at " + annualRate + "%, money doubles roughly every " + dbl.toFixed(1) + " years",
        code: "~" + dbl.toFixed(1) + " yrs"
      });
    }

    milestones.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h4>' + row.h + "</h4><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- main render ----------
  function render() {
    var start = Math.max(num(startEl, 0), 0);
    var contrib = Math.max(num(contribEl, 0), 0);
    var rate = Math.min(Math.max(num(rateEl, 0), 0), 30);
    var years = Math.min(Math.max(num(yearsEl, 30), 1), 50);

    yearsBub.textContent = yearsText(years);
    stageYears.textContent = yearsText(years);

    if (start <= 0 && contrib <= 0) {
      heroBal.textContent = "$0";
      heroSub.textContent = "Enter a starting amount or a monthly contribution to see growth.";
      contribOut.textContent = "—";
      growthOut.textContent = "—";
      shareOut.textContent = "—";
      chartEl.innerHTML = "";
      milestones.innerHTML = "";
      return;
    }

    var sim = simulate(start, contrib, rate, years);
    var finalBal = sim.balCurve[sim.balCurve.length - 1];
    var totalPut = sim.contribCurve[sim.contribCurve.length - 1];
    var growth = finalBal - totalPut;
    var share = finalBal > 0 ? Math.round(growth / finalBal * 100) : 0;

    heroBal.textContent = money(finalBal);
    if (growth > 0 && totalPut > 0) {
      heroSub.textContent = "You contribute " + money(totalPut) + "; compounding adds " + money(growth) +
        " on top — " + (finalBal / totalPut).toFixed(1) + "× your money.";
    } else {
      heroSub.textContent = "At 0% return the balance is just your deposits — try a realistic rate.";
    }

    contribOut.textContent = money(totalPut);
    growthOut.textContent = money(growth);
    shareOut.textContent = share + "%";

    drawChart(sim.balCurve, sim.contribCurve);
    renderMilestones(sim, years, rate);
  }

  [startEl, contribEl, rateEl, yearsEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
