/* ============================================================
   Air Fryer Conversion Calculator — Tynkr Tools & Co
   Oven -> air fryer: temp down ~25°F (15°C), time down ~20%,
   tuned per food type, with a first-check time. Vanilla JS.
   Theme is handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../",
  "reverse-roasting-calculator": "../reverse-roasting-calculator/",
  "perfect-roast-pull-temp-calculator": "../perfect-roast-pull-temp-calculator/",
  "brine-calculator": "../brine-calculator/",
  "meat-thawing-planner": "../meat-thawing-planner/",
  "air-fryer-conversion-calculator": "../air-fryer-conversion-calculator/"
};

document.addEventListener("DOMContentLoaded", function () {
  // Per-food adjustments: temp drop (°F), time multiplier, and basket tips.
  var FOODS = {
    general: {
      dtF: 25, timeFactor: 0.80,
      tips: [
        "<strong>Single layer beats a full basket</strong> — crowding steams food instead of crisping it. Cook in batches if you have to.",
        "<strong>Shake or flip halfway</strong> so both sides see the moving air.",
        "Every machine runs a little different — <strong>check at the first-check time</strong> and add minutes as needed."
      ]
    },
    frozen: {
      dtF: 25, timeFactor: 0.75,
      tips: [
        "<strong>No thawing needed</strong> — frozen fries, nuggets, and tots go straight in.",
        "<strong>Skip the extra oil</strong>; par-fried frozen foods already have plenty.",
        "<strong>Shake the basket twice</strong> — frozen pieces stick together early in the cook."
      ]
    },
    veg: {
      dtF: 25, timeFactor: 0.75,
      tips: [
        "<strong>Toss with a little oil and salt</strong> first — a teaspoon or two is enough for a basket.",
        "<strong>Cut evenly and keep one layer</strong>; dense veg like carrots want smaller pieces than zucchini.",
        "<strong>Shake halfway</strong> and pull them when the edges brown."
      ]
    },
    chicken: {
      dtF: 25, timeFactor: 0.80,
      tips: [
        "<strong>Flip halfway</strong> and finish skin-side up for the crispiest skin.",
        "<strong>Confirm 165&deg;F internal</strong> with a thermometer — time is only an estimate.",
        "Wings love a final 2–3 minutes at a higher temp for extra crunch."
      ]
    },
    roast: {
      dtF: 30, timeFactor: 0.85,
      tips: [
        "<strong>Leave air space around the roast</strong> — if it fills the basket wall-to-wall, the oven is the better tool.",
        "<strong>Cook to internal temperature, not time</strong> — a probe thermometer is essential at this size.",
        "<strong>Rest before carving</strong>, tented in foil, just like an oven roast."
      ]
    },
    fish: {
      dtF: 25, timeFactor: 0.75,
      tips: [
        "<strong>Oil the basket or use a liner</strong> — fish sticks more than anything else.",
        "<strong>Don't flip delicate fillets</strong>; the circulating air cooks both sides.",
        "Fish is done when it <strong>flakes at the thickest point</strong> — it goes from perfect to dry fast."
      ]
    },
    baked: {
      dtF: 25, timeFactor: 0.85,
      tips: [
        "<strong>Bake in a small pan or silicone liner</strong>, not loose on the basket.",
        "<strong>Check with a toothpick</strong> a few minutes early — small chambers brown tops quickly.",
        "If the top darkens too fast, <strong>drop another 10 degrees</strong> and add a minute or two."
      ]
    }
  };

  var unitFBtn = document.getElementById("unit-f");
  var unitCBtn = document.getElementById("unit-c");
  var foodEl   = document.getElementById("food-type");
  var tempEl   = document.getElementById("oven-temp");
  var timeEl   = document.getElementById("oven-time");
  var tempLabel = document.getElementById("temp-label");

  // Outputs
  var settingOut = document.getElementById("setting-output");
  var settingSub = document.getElementById("setting-sub");
  var tempOut    = document.getElementById("temp-output");
  var timeOut    = document.getElementById("time-output");
  var checkOut   = document.getElementById("check-output");
  var tipsList   = document.getElementById("tips-list");

  var unit = "F"; // "F" | "C"

  // ---------- helpers ----------
  function num(el, fallback) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : fallback;
  }
  function round5(n) { return Math.round(n / 5) * 5; }
  function deg(n) { return n + "&deg;" + unit; }

  // Temp drop in the active unit (°F table value, converted + rounded for °C).
  function tempDrop(dtF) {
    return unit === "F" ? dtF : round5(dtF / 1.8);
  }

  // ---------- unit switching ----------
  function setUnit(next) {
    if (next === unit) return;
    var t = num(tempEl, null);
    if (t !== null) {
      tempEl.value = next === "C" ? round5((t - 32) / 1.8) : round5(t * 1.8 + 32);
    }
    unit = next;
    tempLabel.innerHTML = "Oven temperature (&deg;" + unit + ")";
    if (unit === "C") { tempEl.min = 65; tempEl.max = 290; } else { tempEl.min = 150; tempEl.max = 550; }
    unitFBtn.classList.toggle("active", unit === "F");
    unitCBtn.classList.toggle("active", unit === "C");
    render();
  }
  unitFBtn.addEventListener("click", function () { setUnit("F"); });
  unitCBtn.addEventListener("click", function () { setUnit("C"); });

  // ---------- main render ----------
  function render() {
    var food = FOODS[foodEl.value] || FOODS.general;
    var ovenTemp = num(tempEl, 0);
    var ovenTime = num(timeEl, 0);

    if (ovenTemp <= 0 || ovenTime <= 0) {
      settingOut.innerHTML = "&mdash;";
      settingSub.textContent = "Enter the oven temperature and time to convert.";
      tempOut.innerHTML = "&mdash;";
      timeOut.innerHTML = "&mdash;";
      checkOut.innerHTML = "&mdash;";
      tipsList.innerHTML = "";
      return;
    }

    var afTemp = round5(ovenTemp - tempDrop(food.dtF));
    var minTemp = unit === "F" ? 120 : 50;
    if (afTemp < minTemp) afTemp = minTemp;

    var afTime = Math.max(Math.round(ovenTime * food.timeFactor), 1);
    var checkAt = Math.max(Math.round(afTime * 2 / 3), 2);
    if (checkAt >= afTime) checkAt = Math.max(afTime - 1, 1);

    settingOut.innerHTML = deg(afTemp) + " &middot; " + afTime + " min";
    settingSub.innerHTML = "Converted from " + deg(ovenTemp) + " for " + ovenTime +
      " minutes in the oven &mdash; " + tempDrop(food.dtF) + "&deg; lower, " +
      Math.round((1 - food.timeFactor) * 100) + "% less time.";

    tempOut.innerHTML = deg(afTemp);
    timeOut.innerHTML = "~" + afTime + " min";
    checkOut.innerHTML = checkAt + " min";

    tipsList.innerHTML = food.tips.map(function (t) { return "<li>" + t + "</li>"; }).join("");
  }

  [foodEl, tempEl, timeEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
});
