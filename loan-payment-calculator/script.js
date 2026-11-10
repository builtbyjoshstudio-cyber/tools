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
  var schedEl   = document.getElementById("schedule");
  var yearCap   = document.getElementById("schedule-year-caption");
  var yearRows  = document.getElementById("schedule-years");
  var monthEl   = document.getElementById("schedule-months");
  var monthCap  = document.getElementById("schedule-month-caption");
  var monthRows = document.getElementById("schedule-month-rows");

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
    d.setDate(1); // only month/year are shown; avoids end-of-month rollover
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

  // Simulate month by month; returns { months, totalInterest, curve[], rows[] }.
  // curve[i] = remaining balance after month i (curve[0] = starting principal).
  // rows[i] = { interest, principal, balance } for payment i + 1 (the schedule).
  var HARD_CAP = 1201; // > 100 yrs of months; guards degenerate inputs

  function simulate(principal, apr, payment, extra) {
    var r = apr / 100 / 12;
    var bal = principal;
    var totalInterest = 0;
    var curve = [bal];
    var rows = [];
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
      rows.push({ interest: interest, principal: principalPart, balance: Math.max(bal, 0) });
    }
    if (m >= HARD_CAP) return null;
    return { months: m, totalInterest: totalInterest, curve: curve, rows: rows };
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
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- payment schedule (yearly always; monthly only while open) ----------
  var schedPlan = null;
  // Shared formatters: same output as money2()/futureDate(), built once for the long monthly table.
  var centsFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
  function fillRows(tbody, rows) {
    var frag = document.createDocumentFragment();
    rows.forEach(function (cells) {
      var tr = document.createElement("tr");
      cells.forEach(function (text, i) {
        var cell = document.createElement(i ? "td" : "th");
        if (!i) cell.scope = "row";
        cell.textContent = text;
        tr.appendChild(cell);
      });
      frag.appendChild(tr);
    });
    tbody.textContent = "";
    tbody.appendChild(frag);
  }
  function renderMonths() {
    monthRows.textContent = "";
    if (!schedPlan || !schedEl.open || !monthEl.open) return;
    var d = new Date();
    d.setDate(1); // as futureDate(): step month by month from the 1st
    fillRows(monthRows, schedPlan.rows.map(function (row, i) {
      d.setMonth(d.getMonth() + 1);
      return [(i + 1) + "\u00a0· " + monthFmt.format(d).replace(" ", "\u00a0"), "$" + centsFmt.format(row.interest), "$" + centsFmt.format(row.principal), "$" + centsFmt.format(row.balance)];
    }));
  }
  function renderSchedule(plan, extra) {
    plan = plan && plan.rows.length ? plan : null;
    schedPlan = plan;
    schedEl.hidden = !plan;
    if (!plan) { yearRows.textContent = ""; renderMonths(); return; }
    var label = extra > 0 ? "with " + money(extra) + "/mo extra" : "scheduled payments only";
    yearCap.textContent = "Year by year, " + label;
    monthCap.textContent = "Month by month, " + label;
    var years = [];
    plan.rows.forEach(function (row, i) {
      var y = years[Math.floor(i / 12)] || (years[Math.floor(i / 12)] = { n: 0, interest: 0, principal: 0 });
      y.n++;
      y.interest += row.interest;
      y.principal += row.principal;
      y.balance = row.balance;
    });
    fillRows(yearRows, years.map(function (y, i) {
      return [(i + 1) + (y.n < 12 ? " (" + y.n + "\u00a0mo)" : ""), money2(y.interest), money2(y.principal), money2(y.balance)];
    }));
    renderMonths();
  }
  schedEl.addEventListener("toggle", renderMonths);
  monthEl.addEventListener("toggle", renderMonths);

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
      renderSchedule(null, 0);
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
      renderSchedule(null, 0);
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
    renderSchedule(plan, extra);
  }

  // ---------- saved inputs + share links ----------
  // Inputs only (never results). One sanitizer for localStorage and for
  // ?amount=&apr=&term=&extra= links; anything invalid is dropped silently.
  var STORE_KEY = "tynkr-loan-payment-calculator-v1";
  var MAX_AMOUNT = 1e15; // far above any real loan; String() stays plain (no "e+") below 1e21
  var TERMS = [].map.call(termEl.options, function (o) { return o.value; });
  var resetBtn   = document.getElementById("reset-btn");
  var copyBtn    = document.getElementById("copy-link-btn");
  var copyStatus = document.getElementById("copy-status");
  var statusTimer;

  function clampNum(v, lo, hi) {
    if (typeof v !== "number" && typeof v !== "string") return null;
    if (String(v).length > 32) return null;
    v = parseFloat(v);
    return isFinite(v) ? Math.min(Math.max(v, lo), hi) : null;
  }
  function sanitize(src) {
    var s = {};
    if (!src || typeof src !== "object") return s;
    var a = clampNum(src.amount, 0, MAX_AMOUNT);
    var r = clampNum(src.apr, 0, 60);
    var e = clampNum(src.extra, 0, 1000);
    if (a !== null) s.amount = a;
    if (r !== null) s.apr = r;
    if (TERMS.indexOf(String(src.term)) >= 0) s.term = String(src.term);
    if (e !== null) s.extra = Math.round(e / 25) * 25; // slider step
    return s;
  }
  function apply(s) {
    if (s.amount !== undefined) amountEl.value = s.amount;
    if (s.apr !== undefined) aprEl.value = s.apr;
    if (s.term !== undefined) termEl.value = s.term;
    if (s.extra !== undefined) extraEl.value = s.extra;
  }
  function current() {
    return sanitize({ amount: num(amountEl, 0), apr: num(aprEl, 0), term: termEl.value, extra: num(extraEl, 0) });
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(current())); } catch (e) {}
  }

  var defaultTerm = [].filter.call(termEl.options, function (o) { return o.defaultSelected; })[0];
  var DEFAULTS = sanitize({ amount: amountEl.defaultValue, apr: aprEl.defaultValue,
    term: defaultTerm ? defaultTerm.value : termEl.value, extra: extraEl.defaultValue });

  // A shared link wins for this view but is not saved until the user edits here.
  var params = new URLSearchParams(location.search);
  var fromLink = sanitize({ amount: params.get("amount"), apr: params.get("apr"),
    term: params.get("term"), extra: params.get("extra") });
  if (Object.keys(fromLink).length) {
    apply(fromLink);
  } else {
    try { apply(sanitize(JSON.parse(localStorage.getItem(STORE_KEY)))); } catch (e) {}
  }

  // On a link view the saved numbers aren't on screen, so check them too.
  function savedDiffers() {
    try {
      var s = sanitize(JSON.parse(localStorage.getItem(STORE_KEY)));
      return Object.keys(s).length > 0 && JSON.stringify(s) !== JSON.stringify(DEFAULTS);
    } catch (e) { return false; }
  }
  resetBtn.addEventListener("click", function () {
    if ((JSON.stringify(current()) !== JSON.stringify(DEFAULTS) || savedDiffers()) &&
        !confirm("Reset to the example loan? Your saved numbers in this browser will be cleared.")) return;
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
    var url = location.origin + location.pathname + "?amount=" + s.amount + "&apr=" + s.apr +
      "&term=" + s.term + "&extra=" + s.extra;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { showStatus("Link copied"); },
        function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  [amountEl, aprEl, termEl, extraEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });

  render();
});
