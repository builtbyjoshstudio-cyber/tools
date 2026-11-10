/* ============================================================
   Compound Interest Calculator — Tynkr Tools & Co
   Monthly compounding with end-of-month contributions.
   Vanilla JS, self-contained.
   Inputs persist in localStorage; "Copy link" shares them as ?params.
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
  var resetBtn   = document.getElementById("reset-btn");
  var copyBtn    = document.getElementById("copy-link-btn");
  var copyStatus = document.getElementById("copy-status");

  // ---------- helpers ----------
  function money(n) {
    if (!isFinite(n)) n = 0;
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function yearsText(y) {
    return y + (y === 1 ? " year" : " years");
  }

  // ---------- inputs: typing, saved inputs and share links share one clamp ----------
  // Only inputs (never results) are saved, in this browser's localStorage. A link carries
  // ?start=&monthly=&rate=&years= and is only ever built when "Copy link" is clicked.
  var STORE_KEY = "tynkr-compound-interest-calculator-v1";
  var KEYS = ["start", "contrib", "rate", "years"];
  var DEFAULTS = { start: 1000, contrib: 200, rate: 8, years: 30 }; // the shipped example (matches the HTML values)
  var FIELDS = {
    start:   { el: startEl,   param: "start",   min: 0, max: Infinity, empty: 0 }, // the money inputs declare no max
    contrib: { el: contribEl, param: "monthly", min: 0, max: Infinity, empty: 0 },
    rate:    { el: rateEl,    param: "rate",    min: 0, max: 30,  empty: 0 },
    years:   { el: yearsEl,   param: "years",   min: 1, max: 50,  empty: 30 }
  };

  // Number or numeric text -> clamped number; anything else (blank, junk, non-finite) -> null.
  function clampField(k, v) {
    var f = FIELDS[k];
    if (typeof v === "string") v = v.trim() === "" ? NaN : Number(v);
    if (typeof v !== "number" || !isFinite(v)) return null;
    v = Math.min(Math.max(v, f.min), f.max);
    return k === "years" ? Math.round(v) : v;
  }
  function readInputs() {
    var s = {};
    KEYS.forEach(function (k) {
      var v = clampField(k, FIELDS[k].el.value);
      s[k] = v === null ? FIELDS[k].empty : v;
    });
    return s;
  }
  function applyInputs(s) {
    KEYS.forEach(function (k) { FIELDS[k].el.value = String(s[k]); });
  }
  function isDefault(s) {
    return KEYS.every(function (k) { return s[k] === DEFAULTS[k]; });
  }
  function loadSaved() {
    var raw;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return null; } // storage blocked: the example still runs, it just won't save
    if (raw === null) return null; // nothing saved = first visit
    try {
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return null;
      var s = {};
      KEYS.forEach(function (k) {
        var v = clampField(k, o[k]);
        s[k] = v === null ? DEFAULTS[k] : v;
      });
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(readInputs())); } catch (e) {}
  }
  // Valid link params override this view only; unknown or invalid ones are ignored.
  function readLink(s) {
    var p = new URLSearchParams(location.search);
    var used = false;
    KEYS.forEach(function (k) {
      var v = clampField(k, p.get(FIELDS[k].param));
      if (v !== null) { s[k] = v; used = true; }
    });
    return used;
  }
  function shareLink() {
    var s = readInputs();
    return location.origin + location.pathname + "?" + KEYS.map(function (k) {
      return FIELDS[k].param + "=" + encodeURIComponent(String(s[k]));
    }).join("&");
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
  function renderMilestones(sim, annualRate) {
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

    var halfM = Math.round(months / 2);
    rows.push({
      ix: "&frac12;", h: "Halfway there",
      p: "Balance after " + (halfM < 12 ? halfM + " months" : yearsText(halfM / 12)) + " — the second half grows much faster",
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
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- main render ----------
  function render() {
    var s = readInputs();
    var start = s.start;
    var contrib = s.contrib;
    var rate = s.rate;
    var years = s.years;

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
    renderMilestones(sim, rate);
  }

  // ---------- copy link (explicit only; the address bar is never touched) ----------
  var statusTimer = null;
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
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    copyBtn.focus();
    return ok;
  }
  copyBtn.addEventListener("click", function () {
    var link = shareLink();
    function done(ok) { showStatus(ok ? "Link copied" : "Couldn't copy the link"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { done(true); }, function () { done(fallbackCopy(link)); });
    } else {
      done(fallbackCopy(link));
    }
  });

  resetBtn.addEventListener("click", function () {
    var saved = loadSaved();
    if ((!isDefault(readInputs()) || (saved && !isDefault(saved))) &&
        !confirm("Reset to the example? This clears the numbers saved in this browser.")) return;
    applyInputs(DEFAULTS);
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    render();
  });

  function onEdit() {
    render();
    save();
  }
  [startEl, contribEl, rateEl, yearsEl].forEach(function (el) {
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit);
  });

  // First visit shows the HTML example untouched; saved inputs, then a shared link, override it.
  // Nothing is written on load, so opening someone's link never replaces your own saved numbers.
  var saved = loadSaved();
  var initial = {};
  KEYS.forEach(function (k) { initial[k] = saved ? saved[k] : DEFAULTS[k]; });
  if (readLink(initial) || saved) applyInputs(initial);

  render();
});
