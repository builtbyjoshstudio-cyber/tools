/* ============================================================
   Loot Generator — Tynkr Tools & Co
   Object + detail + history. Flavor only, no rules text.
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
  var STORE_KEY = "tynkr-loot-generator-kept-v1";
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

  // ---------- pools (all invented; flavor only, no mechanics) ----------
  var ITEMS = [
    "a dented circlet", "a shepherd's crook", "a set of six drinking cups", "a hand mirror", "a pair of dice",
    "a signet ring", "a folding knife", "an hourglass", "a small brass bell", "a music box",
    "a chess piece — the knight", "a heavy iron key", "a captain's spyglass", "a prayer book", "a tin whistle",
    "a coil of silk rope", "a surgeon's kit", "a decanter", "a child's toy soldier", "an embroidered map",
    "a lantern with shutters", "a pocket sundial", "a sealed letter", "a horn inkwell", "a pair of spectacles",
    "a ceremonial dagger", "a fishing lure", "a bracelet of flat stones", "a weather-vane rooster", "a locksmith's blank keys",
    "a drum no wider than a plate", "a carved walking cane", "a soup ladle", "a hooded falconry glove", "a jar of buttons",
    "a candle stub in a silver holder", "a marionette missing its strings", "an abacus", "a door knocker shaped like a fist",
    "a set of nesting boxes", "a tuning fork", "a barber's razor", "a hollow book", "a saint's medallion", "a bone comb"
  ];
  var DETAILS = [
    "warm to the touch, always, even in snow", "engraved with initials that have been scratched out and re-carved",
    "far heavier than it looks — two hands, minimum", "it hums, just below hearing, near running water",
    "the metal never tarnishes, but fingerprints stay on it for days", "wrapped in oilcloth by someone who clearly loved it",
    "there's dried wax sealing a seam that shouldn't exist", "it smells faintly of a sea nobody here has visited",
    "the maker's mark belongs to a workshop that burned down twice", "one part is a replacement, older than the original",
    "it's beautiful work interrupted — finished by a worse craftsman in a hurry", "small teeth marks, human, around one edge",
    "it casts a shadow a half-second late", "the inscription is a common blessing, misspelled the same way three times",
    "cold iron core under the gilt — this was built to survive something", "someone has hidden a second, tiny compartment inside",
    "the decoration tells a story that stops mid-scene", "it's been repaired with materials worth more than the item",
    "a tally is scratched inside: forty-one marks, then nothing", "it fits your hand as if measured for it",
    "the clasp only opens when no one is watching directly", "there's soot in the engraving that soap won't lift",
    "it weighs less every time it's weighed", "the wood is from a tree that doesn't grow within a thousand miles",
    "someone filed off the second of two maker's marks", "it's newer than it pretends to be — the wear is painted",
    "a hair-fine chain runs through it with nothing attached", "the surface is covered in fine scratches, all the same length",
    "it rattles — once — when first picked up each day", "the original owner's name is stitched, stamped, and burned into it, three different hands"
  ];
  var HISTORIES = [
    "listed in a temple inventory sixty years ago; the temple denies it",
    "identical to one buried with a minor queen, according to the engravings guild",
    "won and lost in the same card game four generations running",
    "the last three owners all left town abruptly, and well-funded",
    "a pawnbroker two cities away holds a standing offer for it, no questions",
    "it was evidence in a trial whose verdict was sealed",
    "the maker made two; the other is at the bottom of a specific lake",
    "a retired highwayman swears he stole this exact piece twice",
    "it's mentioned by name in a children's rhyme from the coast",
    "customs records show it entering the country five times, never leaving",
    "an order of monks reports one of these missing every hundred years, on schedule",
    "the noble family that commissioned it claims it was never finished",
    "a dead cartographer marked its location on three maps of three different places",
    "it was a wedding gift; the wedding never happened; the families won't say why",
    "the last appraiser declined to value it and retired the same month",
    "soldiers' letters from an old campaign mention drawing lots for it",
    "it should be in a crypt whose seal is unbroken",
    "a collector's ledger prices it at one coin — with the note 'never sell'",
    "the shop that sold it burned; this is the only stock that survived, unscorched",
    "a hermit upriver has been asking after it by its pet name",
    "it was thrown from a bridge in front of witnesses, decades ago",
    "the guild that made it dissolved the day it was delivered",
    "a song about its theft predates its manufacture",
    "the previous owner mailed it to themselves and never collected it",
    "an identical one hangs in the magistrate's office; the magistrate checks it daily",
    "it was part of a set of seven; the other six were destroyed deliberately",
    "a beggar at the crossroads blesses it on sight and won't touch it",
    "the estate that auctioned it lists it as 'returned' in the same ledger",
    "its first owner is a name every historian knows and none can place",
    "whoever holds it keeps being mistaken for someone taller"
  ];

  // ---------- generate ----------
  var current = null;

  function generate() {
    current = { item: pick(ITEMS), detail: pick(DETAILS), history: pick(HISTORIES) };
    stage.innerHTML =
      '<div class="result-line"><span class="rk">The find</span><span class="rv big" style="font-size:clamp(20px,3.5vw,30px);">' + esc(cap(current.item)) + "</span></div>" +
      '<div class="result-line"><span class="rk">The detail</span><span class="rv">' + esc(cap(current.detail)) + ".</span></div>" +
      '<div class="result-line"><span class="rk">The history</span><span class="rv">' + esc(cap(current.history)) + ".</span></div>";
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function asText(l) {
    return cap(l.item) + " — " + l.detail + ". " + cap(l.history) + ".";
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
      keptList.innerHTML = '<div class="empty-note">Nothing kept yet. Keep the pieces the party will fight over.</div>';
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
    if (!window.confirm("Clear all kept loot?")) return;
    kept = [];
    saveKept(); renderKept();
  });

  generate();   // action-first: the chest is already open
  renderKept();
});
