/* ============================================================
   Savings Goal Calculator — Tynkr Tools & Co
   Date-to-goal at your pace (monthly compounding at APY),
   plus required monthly for 12/24/36-month deadlines.
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
  "compound-interest-calculator": "../compound-interest-calculator/index.html",
  "emergency-fund-calculator": "../emergency-fund-calculator/index.html",
  "savings-goal-calculator": "../savings-goal-calculator/index.html",
  "quarterly-tax-estimator": "../quarterly-tax-estimator/index.html",
  "profit-margin-calculator": "../profit-margin-calculator/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  var goalEl    = document.getElementById("goal-amount");
  var savedEl   = document.getElementById("already-saved");
  var apyEl     = document.getElementById("apy");
  var monthlyEl = document.getElementById("monthly-contrib");
  var monthlyBub = document.getElementById("monthly-bubble");

  // Outputs
  var heroDate  = document.getElementById("hero-date");
  var heroSub   = document.getElementById("hero-sub");
  var timeOut   = document.getElementById("time-output");
  var depositOut = document.getElementById("deposit-output");
  var interestOut = document.getElementById("interest-output");
  var chartEl   = document.getElementById("chart");
  var deadlines = document.getElementById("deadlines");

  var HARD_CAP = 1201; // > 100 yrs; guards goals that can't be reached

  // ---------- helpers ----------
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
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
    d.setDate(1); // only month/year are shown; avoids end-of-month rollover
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // ---------- simulation: months until balance >= goal ----------
  // Monthly compounding at APY/12, contribution at end of each month.
  // Returns { months, curve[], deposited, interest } or null if unreachable.
  function simulate(goal, saved, apy, monthly) {
    var r = apy / 100 / 12;
    var bal = saved;
    var deposited = saved;
    var curve = [bal];
    var m = 0;
    if (bal >= goal) return { months: 0, curve: curve, deposited: deposited, interest: 0 };
    while (bal < goal && m < HARD_CAP) {
      m++;
      bal = bal * (1 + r) + monthly;
      deposited += monthly;
      curve.push(bal);
    }
    if (m >= HARD_CAP && bal < goal) return null;
    return { months: m, curve: curve, deposited: deposited, interest: Math.max(bal - deposited, 0) };
  }

  // Required end-of-month contribution to reach goal in n months at APY.
  // goal = saved*(1+r)^n + c*(((1+r)^n - 1)/r)  ->  solve for c.
  function requiredMonthly(goal, saved, apy, n) {
    var r = apy / 100 / 12;
    if (n <= 0) return Infinity;
    if (r === 0) return Math.max((goal - saved) / n, 0);
    var growth = Math.pow(1 + r, n);
    var c = (goal - saved * growth) * r / (growth - 1);
    return Math.max(c, 0);
  }

  // ---------- chart (SVG: balance vs goal line) ----------
  function drawChart(curve, goal) {
    var W = 700, H = 240, PAD = 10;
    var maxM = curve.length - 1;
    if (maxM < 1 || goal <= 0) { chartEl.innerHTML = ""; return; }
    var maxV = Math.max(goal, curve[maxM]);
    var pts = [];
    for (var i = 0; i < curve.length; i++) {
      var x = PAD + (W - 2 * PAD) * (i / maxM);
      var y = PAD + (H - 2 * PAD) * (1 - curve[i] / maxV);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    var goalY = (PAD + (H - 2 * PAD) * (1 - goal / maxV)).toFixed(1);
    chartEl.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<line class="chart-baseline" x1="' + PAD + '" y1="' + goalY + '" x2="' + (W - PAD) + '" y2="' + goalY + '" stroke-width="2" stroke-dasharray="5 5"/>' +
        '<polyline class="chart-primary" points="' + pts.join(" ") + '" fill="none" stroke-width="3"/>' +
      "</svg>";
  }

  // ---------- deadline rows (12 / 24 / 36 months) ----------
  function renderDeadlines(goal, saved, apy) {
    var rows = [12, 24, 36].map(function (n) {
      var c = requiredMonthly(goal, saved, apy, n);
      return {
        ix: (n / 12) + "y",
        h: "Hit it in " + monthsToText(n),
        p: c > 0 ? "Save this much monthly to arrive by " + futureDate(n)
                 : "Already covered by what you've saved",
        code: c > 0 ? money(c) + "/mo" : "&#10003;"
      };
    });
    deadlines.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h4>' + row.h + "</h4><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- main render ----------
  function render() {
    var goal = Math.max(num(goalEl, 0), 0);
    var saved = Math.max(num(savedEl, 0), 0);
    var apy = Math.min(Math.max(num(apyEl, 0), 0), 15);
    var monthly = Math.max(num(monthlyEl, 0), 0);

    monthlyBub.textContent = "$" + monthly + "/mo";

    if (goal <= 0) {
      heroDate.textContent = "—";
      heroSub.textContent = "Enter a goal amount to get your date.";
      timeOut.textContent = "—";
      depositOut.textContent = "—";
      interestOut.textContent = "—";
      chartEl.innerHTML = "";
      deadlines.innerHTML = "";
      return;
    }

    var sim = simulate(goal, saved, apy, monthly);
    if (!sim) {
      heroDate.textContent = "—";
      heroSub.textContent = "This pace never reaches the goal — raise the monthly contribution.";
      timeOut.textContent = "100+ yrs";
      depositOut.textContent = "—";
      interestOut.textContent = "—";
      chartEl.innerHTML = "";
      renderDeadlines(goal, saved, apy);
      return;
    }

    if (sim.months === 0) {
      heroDate.textContent = "Today";
      heroSub.textContent = "What you've saved already covers this goal.";
    } else {
      heroDate.textContent = futureDate(sim.months);
      heroSub.textContent = money(goal) + " goal at " + money(monthly) + "/mo — interest included.";
    }

    timeOut.textContent = sim.months === 0 ? "Done" : monthsToText(sim.months);
    depositOut.textContent = sim.months === 0 ? money(0) : money(sim.deposited);
    interestOut.textContent = money(sim.interest);

    drawChart(sim.curve, goal);
    renderDeadlines(goal, saved, apy);
  }

  [goalEl, savedEl, apyEl, monthlyEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
