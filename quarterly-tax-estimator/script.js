/* ============================================================
   Quarterly Tax Estimator — Tynkr Tools & Co
   SE tax (15.3% on 92.35% of profit, SS portion capped) +
   2026 federal brackets after half-SE deduction, the
   standard deduction and QBI, split across the four IRS due dates.
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
  // QBI deduction (sec. 199A): threshold on taxable income before QBI, Rev. Proc. 2025-32 sec. 4.26;
  // $400 minimum with $1,000+ of active QBI, sec. 199A(i) (2026 amounts, indexed from 2027).
  var QBI_RATE = 0.20;
  var QBI_THRESHOLD = { single: 201750, mfj: 403500 };
  var QBI_MIN = 400, QBI_MIN_INCOME = 1000;
  var DUE_DATES = [
    { q: "Q1", covers: "Jan – Mar income", due: "April 15" },
    { q: "Q2", covers: "Apr – May income", due: "June 15" },
    { q: "Q3", covers: "Jun – Aug income", due: "September 15" },
    { q: "Q4", covers: "Sep – Dec income", due: "January 15 (next year)" }
  ];

  var profitEl = document.getElementById("net-profit");
  var statusEl = document.getElementById("filing-status");
  var stateEl  = document.getElementById("state-rate");
  var moreEl     = document.getElementById("more-inputs");
  var wagesEl    = document.getElementById("w2-wages");
  var otherEl    = document.getElementById("other-income");
  var withheldEl = document.getElementById("withheld");
  var lastYearEl = document.getElementById("last-year-tax");
  var highAgiEl  = document.getElementById("high-agi");

  // Outputs
  var heroQuarterly = document.getElementById("hero-quarterly");
  var heroSub   = document.getElementById("hero-sub");
  var seOut     = document.getElementById("se-output");
  var fedOut    = document.getElementById("fed-output");
  var totalOut  = document.getElementById("total-output");
  var dueDates  = document.getElementById("due-dates");
  var calcBreak = document.getElementById("calc-breakdown");
  var safeBlock = document.getElementById("safe-harbor");
  var safeRows  = document.getElementById("safe-harbor-rows");

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
  function seTax(profit, wages) {
    var base = profit * SE_FACTOR;
    if (base < 400) return 0;      // Schedule SE line 4c: under $400, no SE tax
    // Schedule SE lines 7-10: your own W-2 wages use up the Social Security cap first
    var ss = Math.min(base, Math.max(SS_WAGE_BASE - wages, 0)) * SE_SS_RATE;
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

  // 20% of QBI, capped at 20% of taxable income before QBI. Above the threshold the
  // service-business and W-2-wage limits apply; not modeled, so only the $400 minimum is used.
  function qbiDeduction(qbi, beforeQbi, status) {
    var ded = beforeQbi > QBI_THRESHOLD[status] ? 0 : Math.min(qbi, beforeQbi) * QBI_RATE;
    return qbi >= QBI_MIN_INCOME ? Math.max(ded, QBI_MIN) : ded;
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

  function renderBreakdown(profit, wages, other, status, se, halfSE, deduction, beforeQbi, qbi, taxable, fed, withheld, state, stateRate) {
    var base = profit * SE_FACTOR;
    var room = Math.max(SS_WAGE_BASE - wages, 0);
    var qbiInc = profit - halfSE;
    var over = beforeQbi > QBI_THRESHOLD[status];
    var rows = [
      { ix: "SE", h: "Self-employment tax", p: se > 0 ? "15.3% on " + money(base) + " (92.35% of profit)" +
          (wages > 0 && base > room ? "; the 12.4% Social Security part only on the " + money(room) + " your wages left under the cap" : "") : "None: 92.35% of profit is under $400", code: money(se) }
    ];
    if (wages + other > 0) {
      rows.push({ ix: "+", h: "Other income", p: "W-2 wages (" + money(wages) + ") + other income (" + money(other) + ")", code: "+" + money(wages + other) });
    }
    rows.push({ ix: "&minus;", h: "Adjustments", p: "Half of SE tax (" + money(halfSE) + ") + standard deduction (" + money(deduction) + ")", code: "&minus;" + money(halfSE + deduction) });
    if (qbi > 0 || over) {
      rows.push({ ix: "QBI", h: "QBI deduction", code: "&minus;" + money(qbi), p: over ?
        "Taxable income is over " + money(QBI_THRESHOLD[status]) + ", where the 20% deduction depends on your business type and wages paid, so it isn't modeled" + (qbi > 0 ? " (only the $400 minimum is)" : "") :
        Math.min(qbiInc, beforeQbi) * QBI_RATE < qbi ? "The $400 minimum for $1,000+ of business income" :
        beforeQbi < qbiInc ? "20% of " + money(beforeQbi) + " taxable income (less than your " + money(qbiInc) + " business income)" :
        "20% of " + money(qbiInc) + " business income (profit minus half of SE tax)" });
    }
    rows.push({ ix: "IT", h: "Federal income tax", p: "2026 brackets on " + money(taxable) + " taxable income", code: money(fed) });
    if (withheld > 0) {
      rows.push({ ix: "WH", h: "Already withheld", p: "Federal income tax withheld from paychecks this year", code: "&minus;" + money(withheld) });
    }
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

  // Form 1040-ES lines 12a-15: the smaller of 90% of this year's tax or 100% (110% if
  // last year's AGI was over $150,000) of last year's, minus withholding, in four parts.
  // Line 14b: under $1,000 of tax after withholding, no payments are required at all.
  function renderSafeHarbor(total, withheld, lastYear, highAgi, underMin) {
    safeBlock.hidden = lastYear === null;
    if (lastYear === null) { safeRows.innerHTML = ""; return; }
    var pct = highAgi ? 110 : 100;
    var cur = Math.round(Math.max(total * 0.9 - withheld, 0) / 4);
    var prior = Math.round(Math.max(lastYear * pct / 100 - withheld, 0) / 4);
    var MIN = "Penalty-safe minimum: the smaller of the two" + (withheld > 0 ? ", after withholding" : "");
    var ALSO = cur === prior ? "Same amount, also penalty-safe" : "Also avoids the penalty, but costs more per quarter";
    safeRows.innerHTML = (underMin ? [
      { ix: "IRS", h: "No payments required", p: "This year's tax after withholding is under $1,000, so there's no minimum to meet; pay with your return.", code: money(0) }
    ] : [
      { ix: "TY", h: "90% of this year's tax", p: prior < cur ? ALSO : MIN, code: money(cur) },
      { ix: "LY", h: pct + "% of last year's tax", p: prior < cur ? MIN : ALSO, code: money(prior) }
    ]).map(function (row) {
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
    var wages = Math.max(num(wagesEl, 0), 0);
    var other = Math.max(num(otherEl, 0), 0);
    var withheld = Math.max(num(withheldEl, 0), 0);
    var lastYear = num(lastYearEl, null);   // blank = not entered
    if (lastYear !== null) lastYear = Math.max(lastYear, 0);

    if (profit <= 0) {
      heroQuarterly.textContent = "$0";
      heroSub.textContent = "Enter your expected annual net profit to estimate payments.";
      seOut.textContent = "—";
      fedOut.textContent = "—";
      totalOut.textContent = "—";
      dueDates.innerHTML = "";
      calcBreak.innerHTML = "";
      renderSafeHarbor(0, 0, null, false);
      return;
    }

    var se = seTax(profit, wages);
    var halfSE = se / 2;
    var deduction = STD_DEDUCTION[status];
    var beforeQbi = Math.max(profit + wages + other - halfSE - deduction, 0);
    var qbi = qbiDeduction(profit - halfSE, beforeQbi, status);
    var taxable = Math.max(beforeQbi - qbi, 0);
    var fed = bracketTax(taxable, status);
    var state = profit * (stateRate / 100);
    var total = se + fed;          // federal only; state tax is paid to the state
    var due = Math.max(total - withheld, 0);
    var quarterly = due / 4;
    var underMin = Math.round(due) < 1000;

    heroQuarterly.textContent = money(quarterly);
    var pct = profit > 0 ? Math.round(total / profit * 100) : 0;
    heroSub.textContent = (withheld > 0 ? money(total) + " federal tax for the year, minus " + money(withheld) + " already withheld: " + money(due) + " left to pay" :
        wages + other > 0 ? money(total) + " federal tax for the year, including tax on your other income" :
        "About " + pct + "% of your profit goes to federal tax — " + money(total) + " for the year") +
      (underMin ? ". That's under $1,000, so quarterly payments generally aren't required; pay with your return." : ", split four ways.") +
      (wages + other > 0 && withheld === 0 ? " Enter the tax withheld from your paychecks to subtract it." : "") +
      (stateRate > 0 ? " Plus about " + money(state) + " for your state, paid separately." : "");

    seOut.textContent = money(se);
    fedOut.textContent = money(fed);
    totalOut.textContent = money(total);

    renderDueDates(quarterly, underMin, due, state, stateRate);
    renderBreakdown(profit, wages, other, status, se, halfSE, deduction, beforeQbi, qbi, taxable, fed, withheld, state, stateRate);
    renderSafeHarbor(total, withheld, lastYear, highAgiEl.checked, underMin);
  }

  // ---------- saved inputs + share links ----------
  // Inputs only (never results). One sanitizer for localStorage and for
  // ?profit=&status=&state= links (plus &wages=&other=&withheld=&lastyear=&over150k=
  // when set); anything invalid is dropped silently.
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
    var w = clampNum(src.wages, 0, Infinity);
    var o = clampNum(src.other, 0, Infinity);
    var h = clampNum(src.withheld, 0, Infinity);
    var y = clampNum(src.lastyear, 0, Infinity);
    if (w !== null) s.wages = w;
    if (o !== null) s.other = o;
    if (h !== null) s.withheld = h;
    if (y !== null) s.lastyear = y;
    if (src.over150k === true || src.over150k === "1") s.over150k = true;
    if (src.over150k === false || src.over150k === "0") s.over150k = false;
    return s;
  }
  function apply(s) {
    if (s.profit !== undefined) profitEl.value = s.profit;
    if (s.status !== undefined) statusEl.value = s.status;
    if (s.state !== undefined) stateEl.value = s.state;
    if (s.wages !== undefined) wagesEl.value = s.wages;
    if (s.other !== undefined) otherEl.value = s.other;
    if (s.withheld !== undefined) withheldEl.value = s.withheld;
    lastYearEl.value = s.lastyear !== undefined ? s.lastyear : "";   // blank unless given
    highAgiEl.checked = s.over150k === true;
    // show the optional fields whenever they hold something
    if (s.wages || s.other || s.withheld || s.lastyear !== undefined || s.over150k) moreEl.open = true;
  }
  function current() {
    return sanitize({ profit: num(profitEl, 0), status: statusEl.value, state: num(stateEl, 0),
      wages: num(wagesEl, 0), other: num(otherEl, 0), withheld: num(withheldEl, 0),
      lastyear: lastYearEl.value, over150k: highAgiEl.checked });
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(current())); } catch (e) {}
  }

  var DEFAULTS = sanitize({ profit: profitEl.defaultValue, status: "single", state: stateEl.defaultValue,
    wages: wagesEl.defaultValue, other: otherEl.defaultValue, withheld: withheldEl.defaultValue,
    lastyear: lastYearEl.defaultValue, over150k: false });

  // A shared link wins for this view but is not saved until the user edits here.
  var params = new URLSearchParams(location.search);
  var fromLink = sanitize({ profit: params.get("profit"), status: params.get("status"), state: params.get("state"),
    wages: params.get("wages"), other: params.get("other"), withheld: params.get("withheld"),
    lastyear: params.get("lastyear"), over150k: params.get("over150k") });
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
    var url = location.origin + location.pathname + "?profit=" + encodeURIComponent(s.profit) + "&status=" + s.status + "&state=" + s.state +
      (s.wages ? "&wages=" + encodeURIComponent(s.wages) : "") + (s.other ? "&other=" + encodeURIComponent(s.other) : "") +
      (s.withheld ? "&withheld=" + encodeURIComponent(s.withheld) : "") +
      (s.lastyear !== undefined ? "&lastyear=" + encodeURIComponent(s.lastyear) : "") + (s.over150k ? "&over150k=1" : "");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { showStatus("Link copied"); },
        function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  [profitEl, statusEl, stateEl, wagesEl, otherEl, withheldEl, lastYearEl, highAgiEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });

  render();
});
