/* ============================================================
   Emergency Fund Calculator — Tynkr Tools & Co
   Target = essential expenses x coverage months; timeline at
   your savings pace, no interest assumed. Vanilla JS.
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
  var expensesEl = document.getElementById("expenses");
  var currentEl  = document.getElementById("current-savings");
  var monthlyEl  = document.getElementById("monthly-saving");
  var coverageEl = document.getElementById("coverage-months");
  var monthsBub  = document.getElementById("months-bubble");

  // Outputs
  var heroTarget = document.getElementById("hero-target");
  var heroSub    = document.getElementById("hero-sub");
  var coveredOut = document.getElementById("covered-output");
  var remainOut  = document.getElementById("remaining-output");
  var fundedOut  = document.getElementById("funded-output");
  var chartEl    = document.getElementById("chart");
  var checkpoints = document.getElementById("checkpoints");

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

  // ---------- chart (SVG: fund balance vs target line) ----------
  function drawChart(current, monthly, target, monthsToGoal) {
    var W = 700, H = 240, PAD = 10;
    if (target <= 0) { chartEl.innerHTML = ""; return; }
    // Extend the x-axis slightly past the goal so the target line reads as reached.
    var span = Math.max(monthsToGoal, 1);
    if (!isFinite(span)) span = 600;
    var pts = [];
    // Cap the point count so a tiny monthly amount (typed or from a link) can't hang the page.
    for (var k = 0, n = Math.min(span, 600); k <= n; k++) {
      var i = span * k / n;
      var bal = Math.min(current + monthly * i, target);
      var x = PAD + (W - 2 * PAD) * (i / span);
      var y = PAD + (H - 2 * PAD) * (1 - bal / target);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    var targetY = PAD.toFixed(1);
    chartEl.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<line class="chart-baseline" x1="' + PAD + '" y1="' + targetY + '" x2="' + (W - PAD) + '" y2="' + targetY + '" stroke-width="2" stroke-dasharray="5 5"/>' +
        '<polyline class="chart-primary" points="' + pts.join(" ") + '" fill="none" stroke-width="3"/>' +
      "</svg>";
  }

  // ---------- coverage checkpoints ----------
  function renderCheckpoints(expenses, current, monthly, coverage) {
    var rows = [];
    var maxShown = Math.min(coverage, 6);
    for (var m = 1; m <= maxShown; m++) {
      var checkpointAmt = expenses * m;
      var reached = current >= checkpointAmt;
      var monthsAway = monthly > 0 ? Math.ceil((checkpointAmt - current) / monthly) : Infinity;
      rows.push({
        ix: String(m),
        h: m + (m === 1 ? " month" : " months") + " covered",
        p: reached ? "Already there — " + money(checkpointAmt) + " banked"
                   : (isFinite(monthsAway) ? "Reached " + futureDate(monthsAway) + " at your pace" : "Set a monthly amount to get a date"),
        code: reached ? "&#10003;" : money(checkpointAmt)
      });
    }
    checkpoints.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- main render ----------
  function render() {
    var expenses = Math.max(num(expensesEl, 0), 0);
    var current = Math.max(num(currentEl, 0), 0);
    var monthly = Math.max(num(monthlyEl, 0), 0);
    var coverage = Math.min(Math.max(num(coverageEl, 3), 1), 12);

    monthsBub.textContent = coverage + (coverage === 1 ? " month" : " months");

    var target = expenses * coverage;
    if (expenses <= 0) {
      heroTarget.textContent = "$0";
      heroSub.textContent = "Enter your essential monthly expenses to size the fund.";
      coveredOut.textContent = "—";
      remainOut.textContent = "—";
      fundedOut.textContent = "—";
      chartEl.innerHTML = "";
      checkpoints.innerHTML = "";
      return;
    }

    heroTarget.textContent = money(target);
    heroSub.textContent = coverage + (coverage === 1 ? " month" : " months") + " of essential expenses at " + money(expenses) + "/mo.";

    var coveredMonths = current / expenses;
    coveredOut.textContent = coveredMonths >= coverage
      ? "Fully covered"
      : coveredMonths.toFixed(1) + " mo";

    var remaining = Math.max(target - current, 0);
    remainOut.textContent = money(remaining);

    var monthsToGoal = 0;
    if (remaining <= 0) {
      fundedOut.textContent = "Today";
    } else if (monthly > 0) {
      monthsToGoal = Math.ceil(remaining / monthly);
      fundedOut.textContent = futureDate(monthsToGoal);
    } else {
      fundedOut.textContent = "—";
    }

    if (remaining > 0 && monthly > 0) {
      heroSub.textContent += " Fully funded in " + monthsToText(monthsToGoal) + " at " + money(monthly) + "/mo.";
    }

    drawChart(current, monthly, target, monthsToGoal || 1);
    renderCheckpoints(expenses, current, monthly, coverage);
  }

  // ---------- saved inputs (this browser only) + Copy link ----------
  // Storage and links share one shape: { expenses, saved, monthly, months },
  // read back through clean() so both are re-validated like typed input.
  var STORE_KEY = "tynkr-emergency-fund-calculator-v1";
  var MONEY_MAX = 1000000000;
  var FIELDS = [
    { key: "expenses", el: expensesEl, min: 0, max: MONEY_MAX },
    { key: "saved",    el: currentEl,  min: 0, max: MONEY_MAX },
    { key: "monthly",  el: monthlyEl,  min: 0, max: MONEY_MAX },
    { key: "months",   el: coverageEl, min: 1, max: 12, whole: true }
  ];
  var resetBtn    = document.getElementById("reset-inputs");
  var copyBtn     = document.getElementById("copy-link");
  var shareStatus = document.getElementById("share-status");
  var statusTimer = null;

  function clean(f, raw) {
    if (typeof raw !== "number" && typeof raw !== "string") return null;
    if (typeof raw === "string" && (raw.length > 20 || !/^\s*-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i.test(raw))) return null;
    var v = Number(raw);
    if (!isFinite(v)) return null;
    if (f.whole) v = Math.round(v);
    return Math.min(Math.max(v, f.min), f.max);
  }
  function readState() {
    var s = {};
    FIELDS.forEach(function (f) {
      var v = clean(f, parseFloat(f.el.value)); // typed input: parsed like render(), no length cap
      s[f.key] = v === null ? f.min : v;
    });
    return s;
  }
  function applyState(src) {
    var any = false;
    FIELDS.forEach(function (f) {
      var v = clean(f, src[f.key]);
      if (v !== null) { f.el.value = String(v); any = true; }
    });
    return any;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(readState())); } catch (e) {}
  }

  // A shared link wins for this view (and isn't saved until you edit);
  // otherwise restore this browser's saved numbers; otherwise the example stays.
  var params = new URLSearchParams(window.location.search), fromLink = {};
  FIELDS.forEach(function (f) { if (params.has(f.key)) fromLink[f.key] = params.get(f.key); });
  if (!applyState(fromLink)) {
    try {
      var stored = JSON.parse(localStorage.getItem(STORE_KEY));
      if (stored && typeof stored === "object" && !Array.isArray(stored)) applyState(stored);
    } catch (e) {}
  }

  resetBtn.addEventListener("click", function () {
    function differs(src) { return FIELDS.some(function (f) { return clean(f, src[f.key]) !== clean(f, f.el.defaultValue); }); }
    // In a link view the saved numbers aren't on screen, so check them too.
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    var changed = differs(readState()) || (!!saved && typeof saved === "object" && differs(saved));
    if (changed && !confirm("Reset to the example numbers? This clears the numbers saved in this browser.")) return;
    FIELDS.forEach(function (f) { f.el.value = f.el.defaultValue; });
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    render();
  });

  copyBtn.addEventListener("click", function () {
    var s = readState(), p = new URLSearchParams();
    FIELDS.forEach(function (f) { p.set(f.key, String(s[f.key])); });
    var url = location.href.split("#")[0].split("?")[0] + "?" + p.toString();
    function done(ok) {
      clearTimeout(statusTimer);
      shareStatus.textContent = ok ? "Link copied" : "Couldn't copy the link";
      statusTimer = setTimeout(function () { shareStatus.textContent = ""; }, 4000);
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      copyBtn.focus();
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(fallback()); });
    } else done(fallback());
  });

  [expensesEl, currentEl, monthlyEl, coverageEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });

  render();
});
