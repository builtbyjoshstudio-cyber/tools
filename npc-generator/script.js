/* ============================================================
   NPC Generator — Tynkr Tools & Co
   Name + occupation + quirk + motivation + secret, one click.
   "Add to Session Notes" writes into the Session Notes NPC log
   (same-origin localStorage; its loader sanitizes on next open).
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
  var STORE_KEY = "tynkr-npc-generator-kept-v1";
  var NOTES_KEY = "tynkr-session-notes-v1";
  var MAX_KEPT = 20;

  var stage    = document.getElementById("result-stage");
  var genBtn   = document.getElementById("generate");
  var copyBtn  = document.getElementById("copy-btn");
  var keepBtn  = document.getElementById("keep-btn");
  var keptList = document.getElementById("kept-list");
  var clearBtn = document.getElementById("clear-kept");
  var sendBtn  = document.getElementById("send-notes");

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

  // ---------- name engine (compact mix of the name generator's styles) ----------
  var NA = ["Ae", "El", "Ly", "Tha", "Cae", "Vae", "Mira", "Sere", "Ori", "Fae", "Gro", "Kar", "Bal", "Mor", "Vor", "Dag", "Bo", "Fen", "Gil", "Pip", "Tam", "Wick", "Bram", "Nell", "Hark", "Sola"];
  var NB = ["l", "n", "r", "s", "th", "k", "g", "dr", ""];
  var NC = ["ien", "wen", "ara", "orin", "ise", "eth", "ak", "dur", "rok", "arn", "is", "o", "a", "et", "yn", "une"];
  function makeName() {
    var n = pick(NA) + pick(NB) + pick(NC);
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  }

  // ---------- pools (all invented) ----------
  var OCCUPATIONS = [
    "innkeeper", "farrier", "gravedigger", "spice merchant", "rat-catcher", "town scribe", "lamplighter", "midwife",
    "toll collector", "fishmonger", "off-duty guard", "traveling tinker", "apprentice mason", "beekeeper", "moneylender",
    "street cook", "chandler", "retired soldier", "bargeman", "herbalist", "locksmith", "pig farmer", "map-seller",
    "bell-ringer", "tanner", "wandering preacher", "carriage driver", "pearl diver", "bookbinder", "well-digger",
    "fortune teller", "dock foreman", "cheese-maker", "night watchman", "seamstress", "horse trader", "brewer",
    "grave-mason", "puppeteer", "salt merchant", "falconer", "cooper", "letter-carrier", "washerwoman", "pit musician",
    "trapper", "glassblower", "orchard keeper"
  ];
  var QUIRKS = [
    "counts everything twice, out loud", "refers to themselves in the third person", "never sits with their back to a door",
    "collects buttons from strangers", "laughs at the wrong moments", "quotes their dead mentor constantly",
    "chews a wooden toothpick carved like a sword", "apologizes to furniture", "smells faintly of cold smoke",
    "keeps a ledger of favors owed", "whistles when lying", "wears one glove, always the left",
    "names every animal they meet", "hums funeral songs while working", "won't say the word 'luck'",
    "feeds crumbs to birds mid-conversation", "practices arguments under their breath", "always pays in exact change",
    "carries a chess piece for no stated reason", "taps doorframes twice before entering", "over-salts everything they cook",
    "remembers everyone's name but yours", "claims to have died once, briefly", "keeps checking the sky",
    "writes everything down in tiny script", "speaks to their shadow when stressed", "never finishes a drink",
    "wears clothes a size too fine for their trade", "laughs silently, shoulders only", "keeps a knife they clearly can't use",
    "quotes laws that don't exist", "insists on shaking hands twice", "collects rumors like coins",
    "always stands slightly too close", "has a different accent when tired", "carries letters they never send",
    "refuses to step on wooden bridges", "keeps bread in every pocket", "calls everyone 'captain'",
    "sharpens things absentmindedly", "wears a wedding ring on a cord, not a finger", "never says goodbye, just leaves",
    "mutters prices for everything they see", "keeps looking at your hands", "sketches strangers in a worn book",
    "flinches at church bells", "smiles only with the left side", "asks questions and never answers any"
  ];
  var MOTIVATIONS = [
    "to buy back the family shop", "to leave town before winter", "to be owed a favor by someone important",
    "to find out who their father really was", "to keep their sibling out of prison", "to retire without anyone noticing",
    "to impress a rival who doesn't know they exist", "to pay off a debt that keeps growing", "to be remembered for one great thing",
    "to keep a promise made at a deathbed", "to get invited to the guild's table", "to see the sea once before the end",
    "to protect a secret that isn't theirs", "to ruin one specific person, patiently", "to earn enough to stop counting",
    "to find the person who saved them years ago", "to prove the old story true", "to keep the peace at any small cost",
    "to make their child's life different", "to be left alone, completely", "to win back what was gambled away",
    "to learn to read without anyone knowing", "to bury something properly", "to open a second shop in the capital",
    "to outlive their enemies, nothing more", "to get the house back from the bank", "to hear an apology they'll never ask for",
    "to matter to someone powerful", "to disappear and be mourned", "to fix a mistake no one else remembers"
  ];
  var SECRETS = [
    "they've been paying someone to stay away", "the business is a front, and barely", "they saw who did it and said nothing",
    "they're not the original — the name came with the shop", "there's a letter they were supposed to deliver years ago",
    "they owe the wrong people a great deal", "they can hear the thing under the floorboards too",
    "the limp is fake and always has been", "they've been skimming, but for a good reason",
    "they used to have a different name and a worse reputation", "they know where the old owner actually went",
    "they're the one leaving the marks on doors", "the recipe everyone loves has a terrible source",
    "they've never once left this town, despite the stories", "someone else answers their letters",
    "they buried something in the cellar and moved the stairs", "the scar didn't come from a war",
    "they're paying two rents — the second one in silence", "the twin died; they answer to both names now",
    "they taught the villain everything, years ago", "they've been warned to leave three times",
    "the charm they sell actually works, once", "they keep the lights on for someone who won't come back",
    "they can read the old script on the ruins", "half the rumors in town started at their counter",
    "they're guarding the door, not the goods", "the debt was paid long ago; they collect anyway",
    "they remember the flood nobody else remembers", "their license is real; the name on it isn't",
    "they've already picked their successor, and it's one of you"
  ];

  // ---------- generate ----------
  var current = null;

  function generate() {
    current = {
      name: makeName(),
      occ: pick(OCCUPATIONS),
      quirk: pick(QUIRKS),
      want: pick(MOTIVATIONS),
      secret: pick(SECRETS)
    };
    stage.innerHTML =
      '<div class="result-line"><span class="rk">Name</span><span class="rv big">' + esc(current.name) + "</span></div>" +
      '<div class="result-line"><span class="rk">Role</span><span class="rv">' + esc(cap(current.occ)) + "</span></div>" +
      '<div class="result-line"><span class="rk">Quirk</span><span class="rv">' + esc(cap(current.quirk)) + "</span></div>" +
      '<div class="result-line"><span class="rk">Wants</span><span class="rv">' + esc(cap(current.want)) + "</span></div>" +
      '<div class="result-line"><span class="rk">Secret</span><span class="rv">' + esc(cap(current.secret)) + "</span></div>";
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function asText(n) {
    return n.name + " — " + n.occ + ". Quirk: " + n.quirk + ". Wants " + n.want + ". Secret: " + n.secret + ".";
  }

  genBtn.addEventListener("click", generate);
  copyBtn.addEventListener("click", function () { if (current) copyText(asText(current), copyBtn); });

  // ---------- Session Notes bridge ----------
  sendBtn.addEventListener("click", function () {
    if (!current) return;
    var ok = false;
    try {
      var s = JSON.parse(localStorage.getItem(NOTES_KEY) || "null");
      if (!s || !Array.isArray(s.campaigns) || !s.campaigns.length) {
        s = { campaigns: [{ id: "camp1", name: "My Campaign", sessions: [], npcs: [], loot: [] }], active: "camp1", seq: 2 };
      }
      var camp = null;
      for (var i = 0; i < s.campaigns.length; i++) {
        if (s.campaigns[i] && typeof s.campaigns[i] === "object" && s.campaigns[i].id === s.active) camp = s.campaigns[i];
      }
      if (!camp) {
        for (var j = 0; j < s.campaigns.length; j++) {
          if (s.campaigns[j] && typeof s.campaigns[j] === "object") { camp = s.campaigns[j]; break; }
        }
      }
      if (!camp) {
        // store exists but holds no usable campaign — rebuild the minimal shape
        camp = { id: "camp1", name: "My Campaign", sessions: [], npcs: [], loot: [] };
        s.campaigns = [camp];
        s.active = "camp1";
      }
      if (!Array.isArray(camp.npcs)) camp.npcs = [];
      s.seq = (parseInt(s.seq, 10) || 1) + 1;
      camp.npcs.unshift({
        id: "gen" + s.seq,
        name: String(current.name).slice(0, 60),
        note: String(current.occ + "; " + current.quirk).slice(0, 200)
      });
      localStorage.setItem(NOTES_KEY, JSON.stringify(s));
      ok = true;
    } catch (e) { ok = false; }
    var old = sendBtn.textContent;
    sendBtn.textContent = ok ? "Added to your NPC log ✓" : "Couldn't save — storage blocked";
    if (ok) sendBtn.classList.add("copied");
    setTimeout(function () { sendBtn.classList.remove("copied"); sendBtn.textContent = old; }, 1600);
  });

  // ---------- kept list ----------
  var kept = loadKept();
  function loadKept() {
    try {
      var k = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(k) ? k.slice(0, MAX_KEPT).filter(function (x) { return typeof x === "string"; }).map(function (x) { return x.slice(0, 400); }) : [];
    } catch (e) { return []; }
  }
  function saveKept() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(kept)); } catch (e) {}
  }
  function renderKept() {
    if (!kept.length) {
      keptList.innerHTML = '<div class="empty-note">Nothing kept yet. Keep the ones the party might meet again.</div>';
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
    if (!window.confirm("Clear all kept NPCs?")) return;
    kept = [];
    saveKept(); renderKept();
  });

  generate();   // action-first: the page loads with an NPC already standing there
  renderKept();
});
