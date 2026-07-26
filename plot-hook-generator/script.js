/* ============================================================
   Plot Hook Generator — Tynkr Tools & Co
   Hook + twist, generated separately so the halves spark.
   Kept list persists in localStorage. Theme via ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../tabletop/index.html",
  "initiative-tracker": "../initiative-tracker/index.html",
  "dice-roller": "../dice-roller/index.html",
  "session-notes": "../session-notes/index.html",
  "wargame-score-tracker": "../wargame-score-tracker/index.html",
  "random-table-roller": "../random-table-roller/index.html",
  "character-name-generator": "../character-name-generator/index.html",
  "npc-generator": "../npc-generator/index.html",
  "tavern-generator": "../tavern-generator/index.html",
  "plot-hook-generator": "../plot-hook-generator/index.html",
  "loot-generator": "../loot-generator/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  var STORE_KEY = "tynkr-plot-hook-kept-v1";
  var MAX_KEPT = 20;

  var stage    = document.getElementById("result-stage");
  var genBtn   = document.getElementById("generate");
  var copyBtn  = document.getElementById("copy-btn");
  var keepBtn  = document.getElementById("keep-btn");
  var keptList = document.getElementById("kept-list");
  var clearBtn = document.getElementById("clear-kept");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function rnd(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var max = Math.floor(0x100000000 / n) * n;
      var buf = new Uint32Array(1);
      do { window.crypto.getRandomValues(buf); } while (buf[0] >= max);
      return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function copyText(text, btn) {
    function flash(ok) {
      if (!ok) return;
      if (!btn.getAttribute("data-label")) btn.setAttribute("data-label", btn.textContent);
      if (btn._flashT) clearTimeout(btn._flashT);
      btn.classList.add("copied"); btn.textContent = "Copied ✓";
      btn._flashT = setTimeout(function () { btn.classList.remove("copied"); btn.textContent = btn.getAttribute("data-label"); }, 1200);
    }
    function fallback(t) {
      var ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(true); }, function () { flash(fallback(text)); });
    } else flash(fallback(text));
  }

  // ---------- pools (all invented) ----------
  var HOOKS = [
    "A ferry crossing needs guards for one night only, paid in advance",
    "The village bell has rung twelve for three days; the tower is locked from inside",
    "A merchant wants a sealed crate carried to the next town without stopping at the weigh station",
    "The old bridge keeper is retiring and insists on interviewing his replacements personally",
    "A landowner is paying for every rat caught on her property — the rate doubled this week",
    "Someone is undercutting the gravedigger, and the graves are immaculate",
    "A wedding needs armed guests who can pass as cousins",
    "The mine reopened on its own — lanterns lit, carts moving, no miners",
    "A letter must reach a monastery before the first snow, and winter is early",
    "The harvest festival's prize bull has been replaced with an identical bull. The owner can tell. No one else can",
    "A widow will pay handsomely for one hour of conversation with anyone who knew her late husband — and the party's faces qualify",
    "The town's founding charter is due for renewal, and the original has gone missing along with the archivist",
    "Something upstream keeps winning the fishermen's nets",
    "A caravan wants an escort on the safe road — and insists, specifically, on the safe road",
    "The lighthouse keeper's supply boat has been sent back full three times",
    "An heir needs witnesses for a will reading in a house the servants refuse to reopen",
    "The local lord has outlawed whistling and is paying informants",
    "A cartographer wants protection while she maps a forest that keeps un-mapping itself",
    "Two villages both claim the same excellent blacksmith, and the matter goes to trial at the crossroads",
    "The orphanage's donor of twenty years missed a payment for the first time",
    "A ship arrived on schedule, crewed, cargo intact — a different ship than the one that left",
    "The bathhouse is hiring out its cellar as storage and the rates are suspiciously good",
    "A tax collector wants bodyguards for a route he's walked alone for a decade",
    "The shrine's offering box is being robbed nightly — and refilled by morning",
    "A tunnel appeared under the granary, dug from the inside",
    "The duke's portrait painter has requested subjects with 'interesting scars,' payment generous",
    "Every dog in town faces the same hill at dusk, ears forward",
    "A moneylender is forgiving debts in exchange for small, strange errands",
    "The last three travelers on the coast road arrived reporting completely different weather",
    "A theater troupe needs replacements for four actors who quit after the first rehearsal of a new play",
    "The beacon on the ridge was lit last night; the signal chain's next fire never answered",
    "A locked trunk washed ashore with a bill of lading dated next month",
    "The town well is being lowered a bucket at a time, and the rope keeps coming up cut",
    "A judge wants an escort to a trial she expects to lose on purpose",
    "Pilgrims are paying for guides to a shrine that was deconsecrated a generation ago",
    "The ice on the lake didn't melt this spring, and the fish inside it are still moving",
    "A courier collapsed at the gate carrying a message addressed to someone who died last winter",
    "The stonecutters broke into a sealed room in the quarry and resigned as one",
    "An auction house needs discreet security for a lot listed only as 'item 44'",
    "The ferryman's toll changed overnight: no coin — one true answer per crossing",
    "A farmstead is offering room, board, and silence in exchange for a week of night work",
    "The garrison's roster lists one more soldier than anyone can count",
    "A bell-founder wants an old bell retrieved from a flooded chapel before the salvage crews find it",
    "The road crew paving the north route keeps finding the same coin, every ten paces, face up"
  ];
  var TWISTS = [
    "the person paying is the reason the problem exists",
    "it's a test — the real job offer comes after",
    "someone else was hired for the same task, with opposite instructions",
    "the problem is real, but it's the bait",
    "success is the outcome nobody's prepared for",
    "the job is legitimate; the paperwork is not",
    "a rival crew got there first and made everything worse",
    "the 'villain' is cleaning up someone else's disaster",
    "the payment is genuine — its source will be missed",
    "the timeline is a lie; there are hours, not days",
    "one of the witnesses recognizes the party from somewhere they've never been",
    "the object at the center of it all is a duplicate — and so is the person guarding it",
    "the town knows. All of it. They're being polite",
    "whoever finishes the job inherits the enemy that comes with it",
    "the map, the letter, and the witness all disagree — and all three are honest",
    "it was solved a decade ago; something has undone the solution",
    "the client will vanish the moment the task is done — that's the point",
    "the simplest explanation is correct, and everyone refuses to accept it",
    "there is no danger at all — the danger arrives with the party",
    "the reward was never money; it just looks like money for now",
    "an old ally of the party is on the other side of this, reluctantly",
    "the deadline exists because someone else is counting down to the same moment",
    "the real employer is watching how, not whether, the job gets done",
    "everything goes exactly as planned — the plan belonged to someone else",
    "the previous hire didn't fail; they finished, and hid the result",
    "it's the second time this has happened; the first time was covered up beautifully",
    "the innocent explanation and the terrible one are both true",
    "the job cannot be completed — it can only be traded to the next crew",
    "the party was named specifically, by someone none of them has met",
    "refusing the job was the correct answer, and it's too late now"
  ];

  // ---------- generate ----------
  var current = null;

  function generate() {
    current = { hook: pick(HOOKS), twist: pick(TWISTS) };
    stage.innerHTML =
      '<div class="result-line"><span class="rk">The hook</span><span class="rv big" style="font-size:clamp(19px,3vw,26px);">' + esc(current.hook) + ".</span></div>" +
      '<div class="result-line"><span class="rk">The twist</span><span class="rv">But ' + esc(current.twist) + ".</span></div>";
  }
  function asText(h) {
    return h.hook + ". But " + h.twist + ".";
  }

  genBtn.addEventListener("click", generate);
  copyBtn.addEventListener("click", function () { if (current) copyText(asText(current), copyBtn); });

  // ---------- kept list ----------
  var kept = loadKept();
  function loadKept() {
    try {
      var k = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(k) ? k.slice(0, MAX_KEPT).filter(function (x) { return typeof x === "string"; }).map(function (x) { return x.slice(0, 500); }) : [];
    } catch (e) { return []; }
  }
  function saveKept() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(kept)); } catch (e) {}
  }
  function renderKept() {
    if (!kept.length) {
      keptList.innerHTML = '<div class="empty-note">Nothing kept yet. Keep the ones that itch — one of them is next session.</div>';
      return;
    }
    keptList.innerHTML = kept.map(function (x, i) {
      return '<div class="kept-item"><span class="kt">' + esc(x) + '</span>' +
        '<button type="button" class="k-btn" data-copy="' + i + '" aria-label="Copy ' + esc(x.slice(0, 40)) + '" title="Copy">&#10697;</button>' +
        '<button type="button" class="k-btn x" data-del="' + i + '" aria-label="Remove ' + esc(x.slice(0, 40)) + '" title="Remove">&times;</button></div>';
    }).join("");
  }
  keepBtn.addEventListener("click", function () {
    if (!current) return;
    var text = asText(current);
    if (kept.indexOf(text) > -1) return;
    kept.unshift(text);
    if (kept.length > MAX_KEPT) kept.length = MAX_KEPT;
    saveKept(); renderKept();
  });
  keptList.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) { copyText(kept[parseInt(c.getAttribute("data-copy"), 10)] || "", c); return; }
    var d = e.target.closest("[data-del]");
    if (d) {
      kept.splice(parseInt(d.getAttribute("data-del"), 10), 1);
      saveKept(); renderKept();
    }
  });
  clearBtn.addEventListener("click", function () {
    if (!kept.length) return;
    if (!window.confirm("Clear all kept hooks?")) return;
    kept = [];
    saveKept(); renderKept();
  });

  generate();   // action-first: the page loads mid-plot
  renderKept();
});
