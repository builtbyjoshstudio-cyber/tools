/* ============================================================
   Budget Calculator (50/30/20 vs. your actual spending)
   Tynkr Tools & Co — vanilla JS, self-contained.
   Theme handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../index.html",
  "freelance-rate-calculator": "../freelance-rate-calculator/index.html",
  "debt-payoff-calculator": "../debt-payoff-calculator/index.html",
  "budget-calculator": "../budget-calculator/index.html"
};
function getToolUrl(toolId, params) {
  var base = TYNKR_REGISTRY[toolId] || "../index.html";
  if (!params) return base;
  var qs = new URLSearchParams(params).toString();
  return qs ? base + "?" + qs : base;
}

document.addEventListener("DOMContentLoaded", function () {
  var incomeInput  = document.getElementById("income");
  var tNeeds = document.getElementById("t-needs");
  var tWants = document.getElementById("t-wants");
  var tSavings = document.getElementById("t-savings");
  var tSumNote = document.getElementById("target-sum-note");

  var aNeeds = document.getElementById("a-needs");
  var aWants = document.getElementById("a-wants");
  var aSavings = document.getElementById("a-savings");

  var verdictBig = document.getElementById("verdict-big");
  var verdictSub = document.getElementById("verdict-sub");
  var rowsWrap   = document.getElementById("bucket-rows");
  var unallocOut = document.getElementById("unalloc-output");
  var debtLink   = document.getElementById("debt-link");

  function money(n) { if (!isFinite(n)) n = 0; return "$" + Math.round(n).toLocaleString("en-US"); }
  function num(el, f) { var v = parseFloat(el && el.value); return isFinite(v) ? v : f; }
  function pct(n) { return (n >= 0 ? "" : "") + n.toFixed(0) + "%"; }

  var BUCKETS = [
    { key: "needs",   label: "Needs",          desc: "Rent, utilities, groceries, insurance, minimum debt payments" },
    { key: "wants",   label: "Wants",          desc: "Dining out, subscriptions, hobbies, travel" },
    { key: "savings", label: "Savings & debt", desc: "Emergency fund, retirement, extra debt payoff" }
  ];

  function calculate() {
    var income = Math.max(0, num(incomeInput, 0));

    // targets (adjustable), normalize display
    var targets = {
      needs: Math.max(0, num(tNeeds, 50)),
      wants: Math.max(0, num(tWants, 30)),
      savings: Math.max(0, num(tSavings, 20))
    };
    var tSum = targets.needs + targets.wants + targets.savings;
    if (tSumNote) {
      if (Math.abs(tSum - 100) > 0.5) {
        tSumNote.textContent = "Targets add up to " + tSum.toFixed(0) + "% — adjust so they total 100%.";
        tSumNote.style.color = "var(--warn)";
      } else {
        tSumNote.textContent = "Targets total 100%.";
        tSumNote.style.color = "var(--muted)";
      }
    }

    var actual = {
      needs: Math.max(0, num(aNeeds, 0)),
      wants: Math.max(0, num(aWants, 0)),
      savings: Math.max(0, num(aSavings, 0))
    };
    var totalActual = actual.needs + actual.wants + actual.savings;
    var unalloc = income - totalActual;

    // per-bucket rows: ideal $, actual $, actual %, gap pts
    rowsWrap.innerHTML = BUCKETS.map(function (b) {
      var idealD = income * (targets[b.key] / 100);
      var actD = actual[b.key];
      var actP = income > 0 ? (actD / income * 100) : 0;
      var gap = actP - targets[b.key]; // + = over target
      // For needs/wants, over = bad (neg cue). For savings, under = bad.
      var bad;
      if (b.key === "savings") bad = gap < -1;
      else bad = gap > 1;
      var good = Math.abs(gap) <= 1;
      var cue = good ? "is-pos" : (bad ? "is-neg" : "");
      // bar widths capped at 100% of a shared scale (relative to income)
      var idealW = income > 0 ? Math.min(100, idealD / income * 100) : 0;
      var actW = income > 0 ? Math.min(100, actP) : 0;
      var gapTxt = (gap > 0 ? "+" : "") + gap.toFixed(0) + " pts";
      return '' +
        '<div class="bucket ' + cue + '">' +
          '<div class="bucket-top">' +
            '<div class="bucket-name"><h4>' + b.label + '</h4><p>' + b.desc + '</p></div>' +
            '<div class="bucket-nums">' +
              '<code>' + money(actD) + '</code>' +
              '<span class="bucket-pct">' + actP.toFixed(0) + '% of income</span>' +
            '</div>' +
          '</div>' +
          '<div class="bars">' +
            '<div class="bar-track"><div class="bar bar-actual" style="width:' + actW.toFixed(1) + '%"></div></div>' +
            '<div class="bar-track"><div class="bar bar-ideal" style="width:' + idealW.toFixed(1) + '%"></div></div>' +
          '</div>' +
          '<div class="bucket-foot">' +
            '<span>Target ' + targets[b.key].toFixed(0) + '% &middot; ' + money(idealD) + '</span>' +
            '<span class="gap-tag">' + (good ? "On target" : gapTxt) + '</span>' +
          '</div>' +
        '</div>';
    }).join("");

    // unallocated
    if (unallocOut) {
      if (income <= 0) {
        unallocOut.textContent = "Enter your income and what you spend to see your gaps.";
      } else if (Math.abs(unalloc) < 1) {
        unallocOut.textContent = "Every dollar is assigned — nice.";
      } else if (unalloc > 0) {
        unallocOut.textContent = money(unalloc) + " of your income isn't assigned to any bucket yet. That's the easiest money to send to savings or debt.";
      } else {
        unallocOut.textContent = "You've assigned " + money(-unalloc) + " more than your take-home income — your spending exceeds what's coming in.";
      }
    }

    // verdict — biggest miss
    var gaps = {
      needs: (income > 0 ? actual.needs / income * 100 : 0) - targets.needs,
      wants: (income > 0 ? actual.wants / income * 100 : 0) - targets.wants,
      savings: (income > 0 ? actual.savings / income * 100 : 0) - targets.savings
    };
    var issues = [];
    if (gaps.savings < -1) issues.push({ sev: -gaps.savings, msg: "You're saving " + Math.abs(gaps.savings).toFixed(0) + " points under your target. That's the gap to close first — it's what builds the cushion everything else depends on." });
    if (gaps.needs > 1) issues.push({ sev: gaps.needs, msg: "Your needs are " + gaps.needs.toFixed(0) + " points over target. If that's rent or fixed bills, the 50% guideline may just not fit your cost of living — consider a custom split like 60/30/10." });
    if (gaps.wants > 1) issues.push({ sev: gaps.wants, msg: "Your wants are " + gaps.wants.toFixed(0) + " points over target — usually the fastest place to free up money for savings or debt." });
    issues.sort(function (a, b) { return b.sev - a.sev; });

    if (income <= 0 || totalActual <= 0) {
      verdictBig.textContent = "—";
      verdictSub.textContent = "Add your income and spending to see where you stand against the targets.";
    } else if (!issues.length) {
      verdictBig.textContent = "On track";
      verdictSub.textContent = "Your spending lines up with your targets across all three buckets. The job now is keeping it there month after month.";
    } else {
      verdictBig.textContent = "Biggest gap";
      verdictSub.textContent = issues[0].msg;
    }

    // cross-link to debt tool when there's a savings/debt focus
    if (debtLink) {
      debtLink.href = getToolUrl("debt-payoff-calculator", actual.savings > 0 ? { extra: Math.round(actual.savings) } : null);
    }
  }

  // URL prefill
  (function () {
    var p = new URLSearchParams(window.location.search);
    if (p.has("income")) incomeInput.value = p.get("income");
  })();

  [incomeInput, tNeeds, tWants, tSavings, aNeeds, aWants, aSavings].forEach(function (el) {
    if (el) { el.addEventListener("input", calculate); el.addEventListener("change", calculate); }
  });
  calculate();
});
