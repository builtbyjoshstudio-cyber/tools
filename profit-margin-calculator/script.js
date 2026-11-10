/* ============================================================
   Profit Margin Calculator — Tynkr Tools & Co
   Profit/margin after platform fees, markup on cost (before fees), break-even price,
   and required price for a target margin. Vanilla JS.
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
  var costEl   = document.getElementById("unit-cost");
  var priceEl  = document.getElementById("price");
  var feePctEl = document.getElementById("fee-pct");
  var feeFixEl = document.getElementById("fee-fixed");
  var targetEl = document.getElementById("target-margin");
  var targetBub = document.getElementById("target-bubble");

  // Outputs
  var heroProfit = document.getElementById("hero-profit");
  var heroSub    = document.getElementById("hero-sub");
  var marginOut  = document.getElementById("margin-output");
  var markupOut  = document.getElementById("markup-output");
  var breakOut   = document.getElementById("breakeven-output");
  var splitRows  = document.getElementById("split-rows");
  var targetRows = document.getElementById("target-rows");
  var marginCell = marginOut.closest(".stat-cell");

  // ---------- helpers ----------
  function money2(n) {
    if (!isFinite(n)) n = 0;
    var neg = n < 0;
    var s = "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return neg ? "−" + s : s;
  }
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }
  function pct(n) {
    if (!isFinite(n)) return "—";
    return (Math.round(n * 10) / 10) + "%";
  }

  // Required price for a margin target with % fees and a fixed fee:
  // price*(1 - fee - margin) = cost + fixed  ->  price = (cost + fixed) / (1 - fee - margin)
  function requiredPrice(cost, fixed, feeRate, marginRate) {
    var denom = 1 - feeRate - marginRate;
    if (denom <= 0) return Infinity;
    return (cost + fixed) / denom;
  }

  // ---------- main render ----------
  function render() {
    var cost = Math.max(num(costEl, 0), 0);
    var price = Math.max(num(priceEl, 0), 0);
    var feePct = Math.min(Math.max(num(feePctEl, 0), 0), 50) / 100;
    var feeFixed = Math.max(num(feeFixEl, 0), 0);
    var target = Math.min(Math.max(num(targetEl, 60), 10), 85) / 100;

    targetBub.textContent = Math.round(target * 100) + "%";

    if (price <= 0) {
      heroProfit.textContent = "$0";
      heroSub.textContent = "Enter a selling price to see your real profit.";
      marginOut.textContent = "—";
      markupOut.textContent = "—";
      breakOut.textContent = "—";
      splitRows.innerHTML = "";
      targetRows.innerHTML = "";
      return;
    }

    var fees = price * feePct + feeFixed;
    var profit = price - cost - fees;
    var margin = profit / price * 100;
    // Markup is before fees: (price - cost) / cost, the way cost-multiplier pricing formulas work
    var markup = cost > 0 ? (price - cost) / cost * 100 : Infinity;
    var breakeven = requiredPrice(cost, feeFixed, feePct, 0);

    heroProfit.textContent = money2(profit);
    if (profit < 0) {
      heroSub.textContent = "You lose " + money2(Math.abs(profit)) + " on every sale at this price — raise it above break-even.";
    } else {
      heroSub.textContent = "From a " + money2(price) + " sale: " + money2(cost) + " cost + " + money2(fees) + " fees leaves this.";
    }

    marginOut.textContent = pct(margin);
    marginCell.classList.toggle("neg", profit < 0);
    marginCell.classList.toggle("pos", profit >= 0);
    markupOut.textContent = cost > 0 ? pct(markup) : "—";
    breakOut.textContent = money2(breakeven);

    // where the price goes
    var split = [
      { ix: "C", h: "Your cost", p: "Materials, labor, packaging", code: money2(cost) },
      { ix: "F", h: "Platform fees", p: (feePct * 100).toFixed(1) + "% of price + " + money2(feeFixed) + " fixed", code: money2(fees) },
      { ix: "P", h: "Profit", p: profit >= 0 ? "Yours to keep — " + pct(margin) + " of the price" : "Negative — this price doesn't cover cost + fees", code: money2(profit) }
    ];
    splitRows.innerHTML = split.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");

    // target margin rows
    var reqPrice = requiredPrice(cost, feeFixed, feePct, target);
    var rows = [];
    if (isFinite(reqPrice)) {
      var reqProfit = reqPrice * target;
      rows.push({
        ix: Math.round(target * 100) + "", h: "Price for a " + Math.round(target * 100) + "% margin",
        p: "Earns " + money2(reqProfit) + " profit per sale after fees",
        code: money2(reqPrice)
      });
      rows.push({
        ix: "&Delta;", h: reqPrice > price ? "Gap to close" : "Room you have",
        p: reqPrice > price ? "Raise your price by this much to hit the target"
                            : "You're already above the target — this is your cushion",
        code: money2(Math.abs(reqPrice - price))
      });
    } else {
      rows.push({
        ix: "!", h: "Target can't be reached",
        p: "Fees plus this margin exceed 100% of the price — lower the target or the fees",
        code: "&mdash;"
      });
    }
    targetRows.innerHTML = rows.map(function (row) {
      return '<div class="glass-lite anatomy-row">' +
        '<div class="ix">' + row.ix + "</div>" +
        '<div class="lbl"><h2>' + row.h + "</h2><p>" + row.p + "</p></div>" +
        "<code>" + row.code + "</code>" +
      "</div>";
    }).join("");
  }

  // ---------- saved inputs (this browser only) + Copy link ----------
  // Storage and links share one shape, { cost, price, fee, fixed, target }, and both go
  // through clean() so they're checked like typed input. Only inputs are saved, never
  // results; a link (?cost=&price=&fee=&fixed=&target=) is only built on "Copy link".
  var STORE_KEY = "tynkr-profit-margin-calculator-v1";
  var FIELDS = [
    { key: "cost",   el: costEl,   min: 0,  max: Infinity },
    { key: "price",  el: priceEl,  min: 0,  max: Infinity },
    { key: "fee",    el: feePctEl, min: 0,  max: 50 },
    { key: "fixed",  el: feeFixEl, min: 0,  max: Infinity },
    { key: "target", el: targetEl, min: 10, max: 85, step: 5 }
  ];
  var resetBtn    = document.getElementById("reset-inputs");
  var copyBtn     = document.getElementById("copy-link");
  var shareStatus = document.getElementById("share-status");
  var statusTimer = null;

  // Number or short numeric text -> clamped number; anything else -> null (ignored).
  // 24 chars is the longest a JS number prints, so every copied value fits.
  function clean(f, raw) {
    if (typeof raw !== "number" && typeof raw !== "string") return null;
    if (typeof raw === "string" && (raw.length > 24 || !/\S/.test(raw))) return null;
    var v = Number(raw);
    if (!isFinite(v)) return null;
    if (f.step) v = Math.round(v / f.step) * f.step;
    return Math.min(Math.max(v, f.min), f.max);
  }
  // What's on screen: parsed the way render() reads it, not as untrusted text.
  function readState() {
    var s = {};
    FIELDS.forEach(function (f) {
      var v = parseFloat(f.el.value);
      s[f.key] = clean(f, isFinite(v) ? v : f.min);
    });
    return s;
  }
  function applyState(src) {
    FIELDS.forEach(function (f) {
      var v = clean(f, src[f.key]);
      if (v !== null) f.el.value = String(v);
    });
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(readState())); } catch (e) {}
  }

  // First visit keeps the example; saved numbers restore it; a shared link wins
  // for this view only (nothing is written until you edit here).
  try {
    var stored = JSON.parse(localStorage.getItem(STORE_KEY));
    if (stored && typeof stored === "object" && !Array.isArray(stored)) applyState(stored);
  } catch (e) {}
  var params = new URLSearchParams(location.search), fromLink = {};
  FIELDS.forEach(function (f) { if (params.has(f.key)) fromLink[f.key] = params.get(f.key); });
  applyState(fromLink);

  resetBtn.addEventListener("click", function () {
    var changed = FIELDS.some(function (f) { return clean(f, f.el.value) !== clean(f, f.el.defaultValue); });
    // a link view shows the link's numbers, not yours: if any are saved, ask before deleting them
    try { changed = changed || localStorage.getItem(STORE_KEY) !== null; } catch (e) {}
    if (changed && !confirm("Reset to the example numbers? This clears the numbers saved in this browser.")) return;
    FIELDS.forEach(function (f) { f.el.value = f.el.defaultValue; });
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    render();
  });

  copyBtn.addEventListener("click", function () {
    var s = readState(), p = new URLSearchParams();
    FIELDS.forEach(function (f) { p.set(f.key, String(s[f.key])); });
    var url = location.origin + location.pathname + "?" + p.toString();
    function done(ok) {
      clearTimeout(statusTimer);
      shareStatus.textContent = ok ? "Link copied" : "Couldn't copy the link";
      statusTimer = setTimeout(function () { shareStatus.textContent = ""; }, 4000);
    }
    function fallback() {
      var ta = document.createElement("textarea"), ok = false;
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      copyBtn.focus();
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, fallback);
    } else {
      fallback();
    }
  });

  function onEdit() {
    render();
    save();
  }
  [costEl, priceEl, feePctEl, feeFixEl, targetEl].forEach(function (el) {
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit);
  });

  render();
});
