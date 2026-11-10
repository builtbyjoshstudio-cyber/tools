/* ============================================================
   Debt Payoff Calculator — Tynkr Tools & Co
   Snowball / Avalanche / Hybrid. Vanilla JS, self-contained.
   Theme is handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../index.html",
  "freelance-rate-calculator": "../freelance-rate-calculator/index.html",
  "debt-payoff-calculator": "../debt-payoff-calculator/index.html"
};

function getToolUrl(toolId, params) {
  var base = TYNKR_REGISTRY[toolId] || "../index.html";
  if (!params) return base;
  var qs = new URLSearchParams(params).toString();
  return qs ? base + "?" + qs : base;
}

document.addEventListener("DOMContentLoaded", function () {
  var MAX_DEBTS = 10;
  var rowsEl       = document.getElementById("debt-rows");
  var addBtn       = document.getElementById("add-debt");
  var extraInput   = document.getElementById("extra-payment");
  var extraBubble  = document.getElementById("extra-bubble");
  var strategySel  = document.getElementById("strategy");

  // Outputs
  var heroMonths   = document.getElementById("hero-months");
  var heroSub      = document.getElementById("hero-sub");
  var freeDateOut  = document.getElementById("freedate-output");
  var interestOut  = document.getElementById("interest-output");
  var savedOut     = document.getElementById("saved-output");
  var orderList    = document.getElementById("payoff-order");
  var chartEl      = document.getElementById("chart");
  var compareBody  = document.getElementById("compare-body");
  var verdict      = document.getElementById("verdict");
  var planEl       = document.getElementById("plan");
  var planPhases   = document.getElementById("plan-phases");
  var planDetails  = document.getElementById("plan-details");
  var planSummary  = document.getElementById("plan-summary");
  var planMonths   = document.getElementById("plan-months");

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
  // one shared formatter: the every-month table formats hundreds of dates per slider tick
  var monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
  function futureDate(m) {
    var d = new Date();
    d.setDate(1); // only month/year are shown; avoids end-of-month rollover
    d.setMonth(d.getMonth() + m);
    return monthYear.format(d);
  }
  // a payment shows its cents unless it's whole dollars (a final payment, a $37.50 minimum)
  var payCents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var payWhole = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  function pay(n) {
    var c = Math.round(n * 100);
    return "$" + (c % 100 ? payCents : payWhole).format(c / 100);
  }

  // ---------- debt rows ----------
  var rowSeq = 0;
  function addRow(name, balance, apr, min) {
    if (rowsEl.children.length >= MAX_DEBTS) return;
    var id = ++rowSeq;
    var row = document.createElement("div");
    row.className = "debt-row";
    row.innerHTML =
      '<input type="text"   class="form-input d-name" aria-label="Debt name" placeholder="Debt name" value="' + escapeHtml(name || "") + '">' +
      '<input type="number" class="form-input d-bal"  aria-label="Balance" placeholder="Balance" min="0" step="100" inputmode="numeric" value="' + (balance != null ? balance : "") + '">' +
      '<input type="number" class="form-input d-apr"  aria-label="APR %" placeholder="APR %"   min="0" step="0.1" inputmode="decimal" value="' + (apr != null ? apr : "") + '">' +
      '<input type="number" class="form-input d-min"  aria-label="Min/mo" placeholder="Min/mo"  min="0" step="10" inputmode="numeric" value="' + (min != null ? min : "") + '">' +
      '<button type="button" class="d-remove" aria-label="Remove debt">&times;</button>';
    rowsEl.appendChild(row);
    row.querySelector(".d-remove").addEventListener("click", function () {
      row.remove();
      syncAddBtn();
      onEdit();
    });
    row.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", onEdit);
    });
    syncAddBtn();
  }
  function syncAddBtn() {
    addBtn.disabled = rowsEl.children.length >= MAX_DEBTS;
    addBtn.textContent = addBtn.disabled ? "Maximum 10 debts" : "+ Add a debt";
  }
  function readDebts() {
    var out = [];
    rowsEl.querySelectorAll(".debt-row").forEach(function (row) {
      var name = row.querySelector(".d-name").value.trim();
      var bal  = parseFloat(row.querySelector(".d-bal").value);
      var apr  = parseFloat(row.querySelector(".d-apr").value);
      var min  = parseFloat(row.querySelector(".d-min").value);
      if (isFinite(bal) && bal > 0) {
        out.push({
          name: name || "Debt",
          balance: bal,
          apr: isFinite(apr) ? Math.max(0, apr) : 0,
          min: isFinite(min) ? Math.max(0, min) : 0
        });
      }
    });
    return out;
  }

  // ---------- engine ----------
  // noRollover = the minimums-only baseline, where each debt only ever gets its
  // own minimum. Every real strategy keeps paying the same total each month, so
  // a cleared debt's minimum rolls into the next one (the snowball/avalanche).
  function simulate(debts, extra, strategy, noRollover) {
    var d = debts.map(function (x) {
      return { name: x.name, bal: x.balance, apr: x.apr / 100 / 12, min: x.min, interest: 0, paidMonth: null };
    });
    var fixedBudget = d.reduce(function (s, x) { return s + x.min; }, 0) + extra;
    var month = 0, totalInterest = 0;
    var schedule = [{ month: 0, balance: d.reduce(function (s, x) { return s + x.bal; }, 0) }];
    // payments[m - 1][i] = what debt i (input order) gets in month m; null once it's paid off
    var payments = [];
    var MAX = 1200;

    function order() {
      var active = d.filter(function (x) { return x.bal > 0.005; });
      if (strategy === "avalanche") {
        active.sort(function (a, b) { return b.apr - a.apr || a.bal - b.bal; });
      } else if (strategy === "snowball") {
        active.sort(function (a, b) { return a.bal - b.bal || b.apr - a.apr; });
      } else {
        // hybrid: snowball until the first debt is cleared, then avalanche
        var firstWin = d.some(function (x) { return x.paidMonth !== null; });
        if (!firstWin) active.sort(function (a, b) { return a.bal - b.bal; });
        else active.sort(function (a, b) { return b.apr - a.apr; });
      }
      return active;
    }

    while (d.some(function (x) { return x.bal > 0.005; }) && month < MAX) {
      month++;
      d.forEach(function (x) {
        x.paid = x.bal > 0.005 ? 0 : null;
        if (x.bal > 0.005) { var i = x.bal * x.apr; x.bal += i; x.interest += i; totalInterest += i; }
      });
      var active = d.filter(function (x) { return x.bal > 0.005; });
      var budget = noRollover
        ? active.reduce(function (s, x) { return s + x.min; }, 0) + extra
        : fixedBudget;
      active.forEach(function (x) { var pay = Math.min(x.min, x.bal); x.bal -= pay; x.paid += pay; budget -= pay; });
      var targets = order();
      for (var k = 0; k < targets.length && budget > 0.005; k++) {
        if (targets[k].bal <= 0.005) continue;
        var pay = Math.min(budget, targets[k].bal);
        targets[k].bal -= pay; targets[k].paid += pay; budget -= pay;
      }
      d.forEach(function (x) { if (x.bal <= 0.005 && x.paidMonth === null) x.paidMonth = month; });
      payments.push(d.map(function (x) { return x.paid; }));
      schedule.push({ month: month, balance: d.reduce(function (s, x) { return s + Math.max(0, x.bal); }, 0) });
      // guard: if budget can't cover interest, balances grow — bail to avoid runaway
      if (month > 2 && schedule[month].balance > schedule[1].balance * 1.5) break;
    }

    return {
      months: month,
      stalled: d.some(function (x) { return x.bal > 0.005; }),
      totalInterest: totalInterest,
      schedule: schedule,
      payments: payments,
      payoffOrder: d.map(function (x, i) { return { name: x.name, month: x.paidMonth, interest: x.interest, index: i }; })
        .sort(function (a, b) { return (a.month || 1e9) - (b.month || 1e9); })
    };
  }

  // ---------- chart (hand-drawn inline SVG, dependency-free) ----------
  function drawChart(primary, baseline) {
    var W = 640, H = 240, padL = 8, padR = 8, padT = 14, padB = 22;
    // a minimums-only baseline that never finishes would stretch the axis to
    // 100 years; cap it at twice the plan and cut the dashed line off there
    var maxM = baseline.stalled
      ? Math.max(primary.months, Math.min(baseline.months, primary.months * 2), 1)
      : Math.max(primary.months, baseline.months, 1);
    var baseSched = baseline.schedule.filter(function (p) { return p.month <= maxM; });
    var maxB = Math.max(
      primary.schedule[0].balance,
      baseline.schedule[0].balance, 1
    );
    function x(m) { return padL + (m / maxM) * (W - padL - padR); }
    function y(b) { return padT + (1 - b / maxB) * (H - padT - padB); }
    function path(sched) {
      return sched.map(function (p, i) {
        return (i ? "L" : "M") + x(p.month).toFixed(1) + " " + y(p.balance).toFixed(1);
      }).join(" ");
    }
    var svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" ' +
      'aria-label="Balance over time: your plan vs paying minimums only">' +
      // baseline (minimums only) — muted dashed
      '<path class="chart-baseline" d="' + path(baseSched) + '" fill="none" ' +
      'stroke-width="2" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
      // primary plan — accent
      '<path class="chart-primary" d="' + path(primary.schedule) + '" fill="none" ' +
      'stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
      '</svg>';
    chartEl.innerHTML = svg;
  }

  // ---------- monthly payment plan (the hero's own simulate() run) ----------
  var planResult = null;
  function planRow(label, sub, amounts) {
    return '<tr><th scope="row">' + label + '<span>' + sub + '</span></th>' +
      planResult.payoffOrder.map(function (p) {
        var v = amounts[p.index];
        return '<td>' + (v === null ? "—" : pay(v)) + '</td>';
      }).join("") + '</tr>';
  }
  // one column per debt, in payoff order, so paid-off debts clear from the left
  function planTable(caption, firstCol, body) {
    return '<table class="plan-table"><caption>' + caption + '</caption><thead><tr><th scope="col">' + firstCol + '</th>' +
      planResult.payoffOrder.map(function (p) { return '<th scope="col">' + escapeHtml(p.name) + '</th>'; }).join("") +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }
  // a phase = a run of months where every debt gets the same payment, to the cent
  function renderPhases() {
    var pm = planResult.payments, body = "", start = 0;
    function key(m) { return pm[m].map(function (v) { return v === null ? "-" : Math.round(v * 100); }).join(","); }
    for (var m = 1; m <= pm.length; m++) {
      if (m < pm.length && key(m) === key(start)) continue;
      body += start + 1 === m
        ? planRow("Month " + m, futureDate(m), pm[start])
        : planRow("Months " + (start + 1) + "–" + m, futureDate(start + 1) + " – " + futureDate(m), pm[start]);
      start = m;
    }
    var name = strategySel.value.charAt(0).toUpperCase() + strategySel.value.slice(1);
    planPhases.innerHTML = planTable(name + " plan, phase by phase", "Months", body);
  }
  // the full month-by-month table is only built while it's open
  function renderMonths() {
    if (!planResult || !planDetails.open) { planMonths.innerHTML = ""; return; }
    planMonths.innerHTML = planTable("Every month", "Month",
      planResult.payments.map(function (row, i) { return planRow("Month " + (i + 1), futureDate(i + 1), row); }).join(""));
  }
  function showPlan(result) {
    // a plan with no months (every balance under half a cent) hides like no plan
    planResult = result && result.payments.length ? result : null;
    planEl.hidden = !planResult;
    if (!planResult) { planPhases.innerHTML = ""; planMonths.innerHTML = ""; return; }
    renderPhases();
    planSummary.textContent = "Show every month (" + planResult.payments.length + ")";
    renderMonths();
  }

  // ---------- main ----------
  function calculate() {
    var debts = readDebts();
    var extra = Math.max(0, num(extraInput, 0));
    var strategy = strategySel.value;
    if (extraBubble) extraBubble.textContent = money(extra) + "/mo extra";

    if (!debts.length) {
      heroMonths.textContent = "—";
      heroSub.textContent = "Add at least one debt with a balance to see your payoff plan.";
      freeDateOut.textContent = "—"; interestOut.textContent = "—"; savedOut.textContent = "—";
      orderList.innerHTML = ""; chartEl.innerHTML = ""; compareBody.innerHTML = "";
      if (verdict) verdict.textContent = "";
      showPlan(null);
      return;
    }

    var primary  = simulate(debts, extra, strategy);
    var baseline = simulate(debts, 0, "avalanche", true); // minimums-only baseline
    var snow = simulate(debts, extra, "snowball");
    var aval = simulate(debts, extra, "avalanche");
    var hyb  = simulate(debts, extra, "hybrid");

    // stalled = minimum payments don't cover interest
    if (primary.stalled) {
      heroMonths.textContent = "Never";
      heroSub.textContent = "At these payments the balances don't shrink — the interest is outrunning the payments. Increase your minimums or the extra payment.";
      freeDateOut.textContent = "—";
      interestOut.textContent = "—";
      savedOut.textContent = "—";
      orderList.innerHTML = "";
      chartEl.innerHTML = "";
      showPlan(null);
    } else {
      var saved = baseline.totalInterest - primary.totalInterest;
      var sooner = baseline.months - primary.months;

      heroMonths.textContent = monthsToText(primary.months);
      // a stalled baseline stopped early, so its months and interest aren't a real total
      if (baseline.stalled) {
        heroSub.textContent = "Paying only the minimums would never make you debt-free — your plan gets you there in " + monthsToText(primary.months) + ".";
      } else {
        heroSub.textContent = (saved > 0 && sooner > 0)
          ? "Debt-free " + monthsToText(sooner) + " sooner and " + money(saved) + " less interest than paying minimums only."
          : "Your debt-free timeline at these numbers.";
      }

      freeDateOut.textContent = futureDate(primary.months);
      interestOut.textContent = money(primary.totalInterest);
      savedOut.textContent = baseline.stalled ? "—" : money(Math.max(0, saved));

      orderList.innerHTML = primary.payoffOrder.map(function (p, i) {
        return '<div class="glass-lite anatomy-row">' +
          '<div class="ix">' + (i + 1) + '</div>' +
          '<div class="lbl"><h2>' + escapeHtml(p.name) + '</h2>' +
          '<p>' + money(p.interest) + ' interest paid</p></div>' +
          '<code>' + (p.month ? futureDate(p.month) : "—") + '</code></div>';
      }).join("");

      drawChart(primary, baseline);
      showPlan(primary);
    }

    // comparison table — three strategies
    var rows = [
      { key: "snowball",  label: "Snowball",  note: "Smallest balance first", r: snow },
      { key: "avalanche", label: "Avalanche", note: "Highest interest first", r: aval },
      { key: "hybrid",    label: "Hybrid",    note: "Snowball start, then avalanche", r: hyb }
    ];
    var bestInterest = Math.min(snow.totalInterest, aval.totalInterest, hyb.totalInterest);
    var worstInterest = Math.max(snow.totalInterest, aval.totalInterest, hyb.totalInterest);
    var meaningfulGap = (worstInterest - bestInterest) >= 25;
    compareBody.innerHTML = rows.map(function (row) {
      var isBest = meaningfulGap && !row.r.stalled && Math.abs(row.r.totalInterest - bestInterest) < 1;
      var isCurrent = row.key === strategy;
      return '<div class="cmp-row' + (isCurrent ? " is-current" : "") + '">' +
        '<div class="cmp-method"><strong>' + row.label + '</strong>' +
          (isBest ? '<span class="cmp-tag">Saves most</span>' : '') +
          '<span class="cmp-note">' + row.note + '</span></div>' +
        '<div class="cmp-val"><span class="cmp-k">Debt-free</span>' +
          (row.r.stalled ? "Never" : monthsToText(row.r.months)) + '</div>' +
        '<div class="cmp-val"><span class="cmp-k">Interest</span>' +
          (row.r.stalled ? "—" : money(row.r.totalInterest)) + '</div>' +
        '</div>';
    }).join("");

    // verdict (cleared when the plan, snowball or avalanche never finishes)
    if (verdict && !primary.stalled && !snow.stalled && !aval.stalled) {
      var diff = snow.totalInterest - aval.totalInterest;
      if (diff < 50) {
        verdict.textContent = "Snowball and avalanche cost almost the same here (" + money(diff) +
          " apart) — so pick the one you'll actually stick with. The early wins from snowball keep most people going.";
      } else {
        verdict.textContent = "Avalanche saves you " + money(diff) +
          " over snowball here. If the early wins of snowball keep you motivated, that gap is often worth it — the best plan is the one you finish.";
      }
    } else if (verdict) {
      verdict.textContent = "";
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- saved inputs + share links ----------
  // One input state ({debts, extra, strategy}) is saved to this browser's
  // localStorage and built into Copy link URLs; whatever comes back from either
  // goes through the same clean-up before it touches the page.
  // Link format v1: one "debt" param per row, "name_balance_apr_min" (an empty
  // field stays empty; names may contain "_", so the last three fields are
  // split off the right), plus "extra" and "strategy", the names the budget
  // calculator hand-off already uses. A new format gets a new param name.
  var STORE_KEY = "tynkr-debt-payoff-calculator-v1";
  var STRATEGIES = ["avalanche", "snowball", "hybrid"];
  // seed with a realistic mix chosen to show how the strategies diverge
  var DEFAULT_STATE = {
    debts: [
      { name: "Credit Card", bal: 6000, apr: 24.99, min: 150 },
      { name: "Student Loan", bal: 9000, apr: 5.5, min: 110 },
      { name: "Medical Bill", bal: 1500, apr: 0, min: 40 }
    ],
    extra: 150,
    strategy: "avalanche"
  };
  var resetBtn   = document.getElementById("reset-inputs");
  var copyBtn    = document.getElementById("copy-link");
  var copyStatus = document.getElementById("copy-status");

  // a number in [0, max], or null for an empty or unreadable field
  function cleanNum(v, max) {
    var n = typeof v === "number" ? v : (typeof v === "string" && /^\s*-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i.test(v) ? Number(v) : NaN);
    return isFinite(n) ? Math.min(max, Math.max(0, n)) : null;
  }
  function cleanDebt(x) {
    if (!x || typeof x !== "object") return null;
    return {
      name: typeof x.name === "string" ? x.name.slice(0, 100) : "",
      bal: cleanNum(x.bal, 1e9),
      apr: cleanNum(x.apr, 1000),
      min: cleanNum(x.min, 1e9)
    };
  }
  function cleanState(raw) {
    if (!raw || typeof raw !== "object") raw = {};
    var debts = Array.isArray(raw.debts) ? raw.debts.slice(0, MAX_DEBTS).map(cleanDebt).filter(Boolean) : [];
    if (!Array.isArray(raw.debts) || (raw.debts.length && !debts.length)) debts = DEFAULT_STATE.debts;
    var extra = cleanNum(raw.extra, 2000);
    return {
      debts: debts,
      extra: extra === null ? DEFAULT_STATE.extra : extra,
      strategy: STRATEGIES.indexOf(raw.strategy) >= 0 ? raw.strategy : DEFAULT_STATE.strategy
    };
  }
  function readState() {
    var debts = [];
    rowsEl.querySelectorAll(".debt-row").forEach(function (row) {
      debts.push(cleanDebt({
        name: row.querySelector(".d-name").value,
        bal: row.querySelector(".d-bal").value,
        apr: row.querySelector(".d-apr").value,
        min: row.querySelector(".d-min").value
      }));
    });
    return { debts: debts, extra: cleanNum(extraInput.value, 2000), strategy: strategySel.value };
  }
  function applyState(s) {
    rowsEl.innerHTML = "";
    s.debts.forEach(function (x) { addRow(x.name, x.bal, x.apr, x.min); });
    syncAddBtn();
    extraInput.value = s.extra;
    strategySel.value = s.strategy;
  }
  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? cleanState(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(readState())); } catch (e) {}
  }
  // saving happens only here, on the person's own edits, never on load
  function onEdit() {
    calculate();
    saveState();
  }

  // link params override the example and saved inputs for this view only;
  // invalid or unknown params are ignored
  function withUrlParams(base) {
    var p = new URLSearchParams(window.location.search);
    var s = { debts: base.debts, extra: base.extra, strategy: base.strategy };
    var extra = p.has("extra") ? cleanNum(p.get("extra"), 2000) : null;
    if (extra !== null) s.extra = extra;
    if (STRATEGIES.indexOf(p.get("strategy")) >= 0) s.strategy = p.get("strategy");
    var debts = [];
    p.getAll("debt").forEach(function (v) {
      var f = v.length <= 200 ? v.split("_") : [];
      if (f.length < 4 || debts.length >= MAX_DEBTS) return;
      var min = f.pop(), apr = f.pop(), bal = f.pop();
      debts.push(cleanDebt({ name: f.join("_"), bal: bal, apr: apr, min: min }));
    });
    if (debts.length) s.debts = debts;
    return s;
  }
  function shareUrl() {
    var s = readState(), p = new URLSearchParams();
    s.debts.forEach(function (x) {
      p.append("debt", [x.name, x.bal, x.apr, x.min].map(function (v) { return v === null ? "" : v; }).join("_"));
    });
    p.set("extra", s.extra);
    p.set("strategy", s.strategy);
    return location.origin + location.pathname + "?" + p.toString();
  }
  var statusTimer = null;
  function showStatus(msg) {
    copyStatus.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { copyStatus.textContent = ""; }, 4000);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    copyBtn.focus();
    showStatus(ok ? "Link copied" : "Couldn't copy the link");
  }

  // ---------- init ----------
  addBtn.addEventListener("click", function () { addRow(); onEdit(); });
  extraInput.addEventListener("input", onEdit);
  strategySel.addEventListener("change", onEdit);
  planDetails.addEventListener("toggle", renderMonths);
  resetBtn.addEventListener("click", function () {
    // a link view shows the link's numbers, not yours: if any are saved, ask before deleting them
    var hasSaved = false;
    try { hasSaved = localStorage.getItem(STORE_KEY) !== null; } catch (e) {}
    if ((hasSaved || JSON.stringify(readState()) !== JSON.stringify(DEFAULT_STATE)) &&
        !confirm("Reset to the example debts? This clears the numbers saved in this browser.")) return;
    applyState(DEFAULT_STATE);
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    calculate();
  });
  copyBtn.addEventListener("click", function () {
    var url = shareUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { showStatus("Link copied"); }, function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  // first visit = the seeded example; nothing is stored until something changes
  applyState(withUrlParams(loadSaved() || DEFAULT_STATE));
  calculate();
});
