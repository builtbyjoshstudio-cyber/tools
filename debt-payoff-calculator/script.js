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
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // ---------- debt rows ----------
  var rowSeq = 0;
  function addRow(name, balance, apr, min) {
    if (rowsEl.children.length >= MAX_DEBTS) return;
    var id = ++rowSeq;
    var row = document.createElement("div");
    row.className = "debt-row";
    row.innerHTML =
      '<input type="text"   class="form-input d-name" placeholder="Debt name" value="' + (name || "") + '">' +
      '<input type="number" class="form-input d-bal"  placeholder="Balance" min="0" step="100" inputmode="numeric" value="' + (balance != null ? balance : "") + '">' +
      '<input type="number" class="form-input d-apr"  placeholder="APR %"   min="0" step="0.1" inputmode="decimal" value="' + (apr != null ? apr : "") + '">' +
      '<input type="number" class="form-input d-min"  placeholder="Min/mo"  min="0" step="10" inputmode="numeric" value="' + (min != null ? min : "") + '">' +
      '<button type="button" class="d-remove" aria-label="Remove debt">&times;</button>';
    rowsEl.appendChild(row);
    row.querySelector(".d-remove").addEventListener("click", function () {
      row.remove();
      syncAddBtn();
      calculate();
    });
    row.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", calculate);
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
  function simulate(debts, extra, strategy) {
    var d = debts.map(function (x) {
      return { name: x.name, bal: x.balance, apr: x.apr / 100 / 12, min: x.min, interest: 0, paidMonth: null };
    });
    var month = 0, totalInterest = 0;
    var schedule = [{ month: 0, balance: d.reduce(function (s, x) { return s + x.bal; }, 0) }];
    var MAX = 1200;

    function order() {
      var active = d.filter(function (x) { return x.bal > 0.005; });
      if (strategy === "avalanche") {
        active.sort(function (a, b) { return b.apr - a.apr || a.bal - b.bal; });
      } else if (strategy === "snowball") {
        active.sort(function (a, b) { return a.bal - b.bal || b.apr - a.apr; });
      } else {
        if (month < 3) active.sort(function (a, b) { return a.bal - b.bal; });
        else active.sort(function (a, b) { return b.apr - a.apr; });
      }
      return active;
    }

    while (d.some(function (x) { return x.bal > 0.005; }) && month < MAX) {
      month++;
      d.forEach(function (x) {
        if (x.bal > 0.005) { var i = x.bal * x.apr; x.bal += i; x.interest += i; totalInterest += i; }
      });
      var active = d.filter(function (x) { return x.bal > 0.005; });
      var budget = active.reduce(function (s, x) { return s + x.min; }, 0) + extra;
      active.forEach(function (x) { var pay = Math.min(x.min, x.bal); x.bal -= pay; budget -= pay; });
      var targets = order();
      for (var k = 0; k < targets.length && budget > 0.005; k++) {
        if (targets[k].bal <= 0.005) continue;
        var pay = Math.min(budget, targets[k].bal);
        targets[k].bal -= pay; budget -= pay;
      }
      d.forEach(function (x) { if (x.bal <= 0.005 && x.paidMonth === null) x.paidMonth = month; });
      schedule.push({ month: month, balance: d.reduce(function (s, x) { return s + Math.max(0, x.bal); }, 0) });
      // guard: if budget can't cover interest, balances grow — bail to avoid runaway
      if (month > 2 && schedule[month].balance > schedule[1].balance * 1.5) break;
    }

    return {
      months: month,
      stalled: d.some(function (x) { return x.bal > 0.005; }),
      totalInterest: totalInterest,
      schedule: schedule,
      payoffOrder: d.map(function (x) { return { name: x.name, month: x.paidMonth, interest: x.interest }; })
        .sort(function (a, b) { return (a.month || 1e9) - (b.month || 1e9); })
    };
  }

  // ---------- chart (hand-drawn inline SVG, dependency-free) ----------
  function drawChart(primary, baseline) {
    var W = 640, H = 240, padL = 8, padR = 8, padT = 14, padB = 22;
    var maxM = Math.max(primary.months, baseline.months, 1);
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
      '<path class="chart-baseline" d="' + path(baseline.schedule) + '" fill="none" ' +
      'stroke-width="2" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
      // primary plan — accent
      '<path class="chart-primary" d="' + path(primary.schedule) + '" fill="none" ' +
      'stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
      '</svg>';
    chartEl.innerHTML = svg;
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
      return;
    }

    var primary  = simulate(debts, extra, strategy);
    var baseline = simulate(debts, 0, "avalanche"); // minimums-only baseline
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
    } else {
      var saved = baseline.totalInterest - primary.totalInterest;
      var sooner = baseline.months - primary.months;

      heroMonths.textContent = monthsToText(primary.months);
      heroSub.textContent = (saved > 0 && sooner > 0)
        ? "Debt-free " + monthsToText(sooner) + " sooner and " + money(saved) + " less interest than paying minimums only."
        : "Your debt-free timeline at these numbers.";

      freeDateOut.textContent = futureDate(primary.months);
      interestOut.textContent = money(primary.totalInterest);
      savedOut.textContent = money(Math.max(0, saved));

      orderList.innerHTML = primary.payoffOrder.map(function (p, i) {
        return '<div class="glass-lite anatomy-row">' +
          '<div class="ix">' + (i + 1) + '</div>' +
          '<div class="lbl"><h4>' + escapeHtml(p.name) + '</h4>' +
          '<p>' + money(p.interest) + ' interest paid</p></div>' +
          '<code>' + (p.month ? futureDate(p.month) : "—") + '</code></div>';
      }).join("");

      drawChart(primary, baseline);
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

    // verdict
    if (verdict && !primary.stalled) {
      var diff = snow.totalInterest - aval.totalInterest;
      if (diff < 50) {
        verdict.textContent = "Snowball and avalanche cost almost the same here (" + money(diff) +
          " apart) — so pick the one you'll actually stick with. The early wins from snowball keep most people going.";
      } else {
        verdict.textContent = "Avalanche saves you " + money(diff) +
          " over snowball here. If the early wins of snowball keep you motivated, that gap is often worth it — the best plan is the one you finish.";
      }
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- URL prefill (optional handoff) ----------
  function parseUrlParameters() {
    var p = new URLSearchParams(window.location.search);
    if (p.has("extra")) extraInput.value = p.get("extra");
    if (p.has("strategy") && ["snowball", "avalanche", "hybrid"].indexOf(p.get("strategy")) >= 0) {
      strategySel.value = p.get("strategy");
    }
  }

  // ---------- init ----------
  addBtn.addEventListener("click", function () { addRow(); calculate(); });
  extraInput.addEventListener("input", calculate);
  strategySel.addEventListener("change", calculate);

  // seed with a realistic mix chosen to show how the strategies diverge
  addRow("Credit Card", 6000, 24.99, 150);
  addRow("Student Loan", 9000, 5.5, 110);
  addRow("Medical Bill", 1500, 0, 40);
  parseUrlParameters();
  calculate();
});
