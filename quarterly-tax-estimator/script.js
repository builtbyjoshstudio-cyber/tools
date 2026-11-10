/* ============================================================
   Quarterly Tax Estimator — Tynkr Tools & Co
   SE tax (15.3% on 92.35% of profit, SS portion capped) +
   2026 federal brackets after half-SE deduction and the
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
  // ---- 2026 federal figures (update annually) ----
  // Brackets + standard deduction: IRS Rev. Proc. 2025-32 / IR-2025-103.
  // Wage base: SSA 2026 COLA fact sheet.
  var SE_FACTOR = 0.9235;          // taxable share of net profit
  var SE_SS_RATE = 0.124;          // Social Security portion
  var SE_MEDICARE_RATE = 0.029;    // Medicare portion (uncapped)
  var SS_WAGE_BASE = 184500;       // 2026 Social Security wage base
  var STD_DEDUCTION = { single: 16100, mfj: 32200 };
  var BRACKETS = {
    single: [
      { upTo: 12400,    rate: 0.10 },
      { upTo: 50400,    rate: 0.12 },
      { upTo: 105700,   rate: 0.22 },
      { upTo: 201775,   rate: 0.24 },
      { upTo: 256225,   rate: 0.32 },
      { upTo: 640600,   rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ],
    mfj: [
      { upTo: 24800,    rate: 0.10 },
      { upTo: 100800,   rate: 0.12 },
      { upTo: 211400,   rate: 0.22 },
      { upTo: 403550,   rate: 0.24 },
      { upTo: 512450,   rate: 0.32 },
      { upTo: 768700,   rate: 0.35 },
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
    if (base < 400) return 0;      // Schedule SE line 4c: under $400, no SE tax
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
  function renderDueDates(quarterly, underMin, total, state, stateRate) {
    var html;
    if (underMin) {
      html = '<div class="glass-lite anatomy-row">' +
        '<div class="ix">IRS</div>' +
        '<div class="lbl"><h2>Under $1,000 for the year</h2><p>Quarterly payments generally aren\'t required; pay with your return.</p></div>' +
        "<code>" + money(total) + "</code>" +
      "</div>";
    } else {
      html = DUE_DATES.map(function (d) {
        return '<div class="glass-lite anatomy-row">' +
          '<div class="ix">' + d.q + "</div>" +
          '<div class="lbl"><h2>Due ' + d.due + "</h2><p>" + d.covers + "</p></div>" +
          "<code>" + money(quarterly) + "</code>" +
        "</div>";
      }).join("");
    }
    if (stateRate > 0) {
      html += '<div class="glass-lite anatomy-row">' +
        '<div class="ix">ST</div>' +
        '<div class="lbl"><h2>State tax for the year</h2><p>Pay this to your state, not the IRS. Schedules vary (e.g., California is 30/40/0/30% on the same four dates).</p></div>' +
        "<code>" + money(state) + "</code>" +
      "</div>";
    }
    dueDates.innerHTML = html;
  }

  function renderBreakdown(profit, se, halfSE, deduction, taxable, fed, state, stateRate) {
    var rows = [
      { ix: "SE", h: "Self-employment tax", p: se > 0 ? "15.3% on " + money(profit * SE_FACTOR) + " (92.35% of profit)" : "None: 92.35% of profit is under $400", code: money(se) },
      { ix: "&minus;", h: "Adjustments", p: "Half of SE tax (" + money(halfSE) + ") + standard deduction (" + money(deduction) + ")", code: "&minus;" + money(halfSE + deduction) },
      { ix: "IT", h: "Federal income tax", p: "2026 brackets on " + money(taxable) + " taxable income", code: money(fed) }
    ];
    if (stateRate > 0) {
      rows.push({ ix: "ST", h: "State income tax", p: "Flat " + stateRate + "% of net profit (rough)", code: money(state) });
    }
    calcBreak.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
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
    var total = se + fed;          // federal only; state tax is paid to the state
    var quarterly = total / 4;
    var underMin = Math.round(total) < 1000;

    heroQuarterly.textContent = money(quarterly);
    var pct = profit > 0 ? Math.round(total / profit * 100) : 0;
    heroSub.textContent = "About " + pct + "% of your profit goes to federal tax — " + money(total) + " for the year" +
      (underMin ? ". That's under $1,000, so quarterly payments generally aren't required; pay with your return." : ", split four ways.") +
      (stateRate > 0 ? " Plus about " + money(state) + " for your state, paid separately." : "");

    seOut.textContent = money(se);
    fedOut.textContent = money(fed);
    totalOut.textContent = money(total);

    renderDueDates(quarterly, underMin, total, state, stateRate);
    renderBreakdown(profit, se, halfSE, deduction, taxable, fed, state, stateRate);
  }

  // ---------- saved inputs + share links ----------
  // Inputs only (never results). One sanitizer for localStorage and for
  // ?profit=&status=&state= links; anything invalid is dropped silently.
  var STORE_KEY = "tynkr-quarterly-tax-estimator-v1";
  var resetBtn   = document.getElementById("reset-btn");
  var copyBtn    = document.getElementById("copy-link");
  var copyStatus = document.getElementById("copy-status");
  var statusTimer;

  function clampNum(v, lo, hi) {
    if (typeof v !== "number" && typeof v !== "string") return null;
    if (String(v).length > 32) return null;
    // Same grammar a number input accepts: "80,000", "0x1F", "7%" are ignored.
    if (typeof v === "string" && !/^-?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?$/i.test(v)) return null;
    v = Number(v);
    return isFinite(v) ? Math.min(Math.max(v, lo), hi) : null;
  }
  function sanitize(src) {
    var s = {};
    if (!src || typeof src !== "object") return s;
    var p = clampNum(src.profit, 0, Infinity);
    var r = clampNum(src.state, 0, 15);
    if (p !== null) s.profit = p;
    if (src.status === "single" || src.status === "mfj") s.status = src.status;
    if (r !== null) s.state = r;
    return s;
  }
  function apply(s) {
    if (s.profit !== undefined) profitEl.value = s.profit;
    if (s.status !== undefined) statusEl.value = s.status;
    if (s.state !== undefined) stateEl.value = s.state;
  }
  function current() {
    return sanitize({ profit: num(profitEl, 0), status: statusEl.value, state: num(stateEl, 0) });
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(current())); } catch (e) {}
  }

  var DEFAULTS = sanitize({ profit: profitEl.defaultValue, status: "single", state: stateEl.defaultValue });

  // A shared link wins for this view but is not saved until the user edits here.
  var params = new URLSearchParams(location.search);
  var fromLink = sanitize({ profit: params.get("profit"), status: params.get("status"), state: params.get("state") });
  if (Object.keys(fromLink).length) {
    apply(fromLink);
  } else {
    try { apply(sanitize(JSON.parse(localStorage.getItem(STORE_KEY)))); } catch (e) {}
  }

  resetBtn.addEventListener("click", function () {
    // a link view shows the link's numbers, not yours: if any are saved, ask before deleting them
    var hasSaved = false;
    try { hasSaved = localStorage.getItem(STORE_KEY) !== null; } catch (e) {}
    if ((hasSaved || JSON.stringify(current()) !== JSON.stringify(DEFAULTS)) &&
        !confirm("Reset to the example? Your saved numbers in this browser will be cleared.")) return;
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
    var url = location.origin + location.pathname + "?profit=" + encodeURIComponent(s.profit) + "&status=" + s.status + "&state=" + s.state;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { showStatus("Link copied"); },
        function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  [profitEl, statusEl, stateEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });

  render();
});
