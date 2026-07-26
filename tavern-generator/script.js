/* ============================================================
   Tavern Generator — Tynkr Tools & Co
   Name + atmosphere + patron + rumor + menu, one click.
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
  var STORE_KEY = "tynkr-tavern-generator-kept-v1";
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
  var ADJ = ["Crooked", "Gilded", "Sleeping", "Thirsty", "Wandering", "Salty", "Copper", "Velvet", "Grinning", "Sunken",
             "Rusty", "Howling", "Patient", "Drowsy", "Broken", "Lucky", "Crimson", "Foggy", "Stubborn", "Silent",
             "Leaning", "Peculiar", "Honest", "Restless", "Amber", "Wobbly", "Frosted", "Merry", "Sour", "Hollow"];
  var NOUN = ["Lantern", "Anchor", "Badger", "Kettle", "Goblet", "Fiddle", "Boar", "Compass", "Thistle", "Wheelbarrow",
              "Griffin", "Barrel", "Sparrow", "Cauldron", "Hearthstone", "Mermaid", "Pony", "Tankard", "Willow", "Anvil",
              "Moth", "Signpost", "Turnip", "Chandler", "Otter", "Bellows", "Crow", "Teapot", "Millstone", "Fox",
              "Gargoyle", "Herring", "Acorn", "Spyglass", "Mule", "Candle"];
  var FEEL = [
    "low ceilings, lower conversations — everyone here is mid-scheme", "bright, loud, and packed; the barmaid knows everyone's usual",
    "half-empty and echoing, chairs still stacked from a fight nobody mentions", "warm as a bread oven, smells like rosemary and wet dog",
    "candles everywhere because the owner distrusts lamps", "sawdust floors, fresh today — draw your own conclusions",
    "quiet enough to hear the dice game upstairs", "every wall covered in portraits of previous owners, all frowning",
    "regulars only, and everyone clocks the door when it opens", "cheerfully shabby; the third chair leg is a famous local liar",
    "smoky, amber-lit, and somehow always five minutes from closing", "spotless in a way that feels like an alibi",
    "riverside damp, with a resident heron that judges patrons", "one long table, no exceptions, sit where there's room",
    "the fire is enormous and the room is still cold", "festival-loud tonight; nobody can hear a plot being hatched, which is the point",
    "genteel and faded, like a duchess renting out rooms", "the floor slopes toward the cellar door and drinks migrate accordingly",
    "decorated entirely with items patrons left as payment", "so narrow the bar is also the hallway",
    "warm, golden, suspiciously perfect — like a painting of a tavern", "underground, vaulted, and cool; sound carries in odd directions",
    "half the tables are boats sawn in half; the owner won't say whose", "new-built and creaking, still smells of pine tar"
  ];
  var PATRON = [
    "a courier asleep face-down on an undelivered parcel", "two guild clerks splitting one drink and three grudges",
    "a retired duelist who narrates other people's arguments", "a woman playing solitaire with a deck missing all its queens",
    "a stonemason sketching the room's load-bearing flaws on a napkin", "a priest off duty, collar in pocket, winning at darts",
    "an old sailor who buys a round whenever someone says the word 'north'", "a tax assessor everyone is being extremely nice to",
    "a young noble in bad disguise and worse boots", "the town's midwife, who knows everyone's real age",
    "a trapper with an empty chair reserved beside him, always", "a singer between songs, listening harder than she lets on",
    "a man teaching a raven to count coins, nearly successfully", "the previous owner, drinking quietly under new management",
    "a cartographer arguing with her own map", "a gravedigger celebrating something he won't name",
    "twins who finish each other's lies", "a bailiff off the clock, pretending not to hear any of it",
    "an apothecary testing which patrons sneeze at her satchel", "a bricklayer owed money by half the room, patient about it",
    "a pilgrim three shrines behind schedule and drinking about it", "the blacksmith's apprentice, spending his first real wages carefully",
    "a widow who plays chess against an empty seat and loses on purpose", "a customs officer writing poetry in the margins of a manifest",
    "an off-season shepherd who brought one (1) sheep inside", "a locksmith idly opening and closing a lock nobody gave him"
  ];
  var RUMOR = [
    "the mill's been grinding at night with nobody in it", "the toll bridge keeper hasn't been seen since market day",
    "somebody's buying up all the rope in town, quietly", "the well water tastes of iron and the priest won't bless it",
    "a lord's carriage went into the ford and came out empty", "they're paying double for cellar work at the old manor, no questions",
    "the lighthouse burned green twice this week", "the tax wagon left two days late and took the wrong road",
    "a stranger paid a year's rent on the corner house and never moved in", "the hunting dogs won't go past the treeline anymore",
    "someone's marking doors with chalk before dawn", "the ferryman has started asking riddles again, which is never good",
    "grain's vanishing from locked barns, sacks and all", "the constable posted a reward, then withdrew it by noon",
    "an old debt was paid at the counting house — in coins nobody recognizes", "the bells rang last night and the ringer swears he was home",
    "a fishing crew pulled up a locked strongbox and reburied it at sea", "the widow on the hill lit every lamp in the house for the first time in years",
    "two surveyors came to measure the commons and left before lunch, pale", "the innkeeper two towns over is paying for news about this one",
    "a caravan is hiring guards at triple rate for the low road", "the schoolmaster resigned mid-lesson and bought a mule by evening",
    "somebody unstacked the cairn on the ridge, stone by stone", "the river dropped a foot overnight and nobody upstream will say why",
    "the apothecary is out of everything that helps you sleep", "a letter arrived at the shrine addressed to someone born next spring"
  ];
  var MENU = [
    "a stew the menu calls 'brown' with defensive pride", "river eel pie, better than it has any right to be",
    "yesterday's bread fried in today's butter", "a cheese so sharp it's kept under a bell jar, by law of the house",
    "mutton and barley, ladled with genuine violence", "salt fish fritters and a mustard that fights back",
    "the harvest special: everything the garden panicked and produced at once", "dumplings the size of fists, priced per fist",
    "a roast that took the whole day and expects gratitude", "onion soup under a lid of toasted cheese, served scalding as tradition demands",
    "smoked sausage on a board with pickles arranged like a threat", "hen-and-leek pie with a pastry lid nobody can cut politely",
    "cider-braised pork that sells out before the bell", "flatbread with drippings, the honest end of the menu",
    "a pot pie whose contents rotate on a need-to-know basis", "black bread, hard cheese, soft apples — the traveler's truce",
    "spiced river crab in autumn only, ask nothing in spring", "beans baked with burnt honey, the cook's hill-country grudge",
    "a venison stew owed entirely to a poacher nobody names", "griddle cakes with berry mash, technically breakfast, served always",
    "trout in brown butter when the weir cooperates", "the wedding soup, served weekly, wedding or not"
  ];

  // ---------- generate ----------
  var current = null;

  function tavernName() {
    var r = rnd(3);
    if (r === 0) return "The " + pick(ADJ) + " " + pick(NOUN);
    if (r === 1) {
      var a = pick(NOUN), b = pick(NOUN);
      while (b === a) b = pick(NOUN);
      return "The " + a + " & " + b;
    }
    return "The " + pick(NOUN) + "'s " + pick(["Rest", "Folly", "Promise", "Wager", "Welcome", "Last Stand", "Luck", "Shadow"]);
  }

  function generate() {
    current = {
      name: tavernName(),
      feel: pick(FEEL),
      patron: pick(PATRON),
      rumor: pick(RUMOR),
      menu: pick(MENU)
    };
    stage.innerHTML =
      '<div class="result-line"><span class="rk">The sign</span><span class="rv big">' + esc(current.name) + "</span></div>" +
      '<div class="result-line"><span class="rk">The room</span><span class="rv">' + esc(cap(current.feel)) + "</span></div>" +
      '<div class="result-line"><span class="rk">Of note</span><span class="rv">' + esc(cap(current.patron)) + "</span></div>" +
      '<div class="result-line"><span class="rk">The rumor</span><span class="rv">' + esc(cap(current.rumor)) + "</span></div>" +
      '<div class="result-line"><span class="rk">The menu</span><span class="rv">' + esc(cap(current.menu)) + "</span></div>";
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function asText(t) {
    return t.name + " — " + t.feel + ". Of note: " + t.patron + ". Rumor: " + t.rumor + ". On the menu: " + t.menu + ".";
  }

  genBtn.addEventListener("click", generate);
  copyBtn.addEventListener("click", function () { if (current) copyText(asText(current), copyBtn); });

  // ---------- kept list ----------
  var kept = loadKept();
  function loadKept() {
    try {
      var k = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(k) ? k.slice(0, MAX_KEPT).filter(function (x) { return typeof x === "string"; }).map(function (x) { return x.slice(0, 600); }) : [];
    } catch (e) { return []; }
  }
  function saveKept() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(kept)); } catch (e) {}
  }
  function renderKept() {
    if (!kept.length) {
      keptList.innerHTML = '<div class="empty-note">Nothing kept yet. Keep one and it becomes the party&#39;s local for the whole campaign.</div>';
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
    if (!window.confirm("Clear all kept taverns?")) return;
    kept = [];
    saveKept(); renderKept();
  });

  generate();   // action-first: the door is already open
  renderKept();
});
