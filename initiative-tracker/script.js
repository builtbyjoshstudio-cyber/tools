/* ============================================================
   Initiative Tracker — Tynkr Tools & Co
   Turn order / rounds / HP / conditions. Vanilla JS, self-contained.
   State persists in localStorage. Theme is handled by ../kinetic.js
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
  var STORE_KEY = "tynkr-initiative-tracker-v1";
  var MAX_COMBATANTS = 40;

  var nameIn   = document.getElementById("c-name");
  var initIn   = document.getElementById("c-init");
  var hpIn     = document.getElementById("c-hp");
  var typeIn   = document.getElementById("c-type");
  var addBtn   = document.getElementById("add-combatant");

  var roundLbl = document.getElementById("round-label");
  var curName  = document.getElementById("current-name");
  var onDeck   = document.getElementById("on-deck");
  var nextBtn  = document.getElementById("next-turn");
  var prevBtn  = document.getElementById("prev-turn");
  var resetBtn = document.getElementById("reset-encounter");
  var clearBtn = document.getElementById("clear-encounter");
  var listEl   = document.getElementById("combatant-list");

  var TYPE_LABEL = { pc: "Player", ally: "Ally / NPC", enemy: "Enemy" };

  // ---------- state ----------
  var state = load();

  function blank() {
    return { combatants: [], round: 1, turn: 0, seq: 1 };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.combatants)) return blank();
      // sanitize every field — drifted/hand-edited storage must never crash render or reach innerHTML unescaped
      var combatants = [];
      var fallbackSeq = 1;
      s.combatants.forEach(function (c) {
        if (!c || typeof c !== "object") return;
        var hp    = (c.hp    === null || c.hp    === undefined || !isFinite(Number(c.hp)))    ? null : Math.max(0, Math.floor(Number(c.hp)));
        var maxHp = (c.maxHp === null || c.maxHp === undefined || !isFinite(Number(c.maxHp))) ? null : Math.max(0, Math.floor(Number(c.maxHp)));
        combatants.push({
          id: "c" + fallbackSeq, // regenerated: stored ids are never trusted (duplicates, markup)
          seq: fallbackSeq, // regenerated too: storage order is insertion order, so tie order survives
          name: String(c.name || "Combatant").slice(0, 40),
          init: isFinite(Number(c.init)) ? Number(c.init) : 0,
          type: (c.type === "pc" || c.type === "ally") ? c.type : "enemy",
          hp: hp,
          maxHp: maxHp,
          conditions: Array.isArray(c.conditions)
            ? c.conditions.slice(0, 8).map(function (x) { return String(x).slice(0, 24); })
            : []
        });
        fallbackSeq++;
      });
      return {
        combatants: combatants,
        round: Math.max(1, parseInt(s.round, 10) || 1),
        turn:  Math.max(0, parseInt(s.turn, 10)  || 0),
        seq:   fallbackSeq // ids/seqs are 1..n, so the next minted "c" + seq can't collide
      };
    } catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // Sorted view: initiative desc, ties keep insertion order (stable via seq).
  function order() {
    return state.combatants.slice().sort(function (a, b) {
      if (b.init !== a.init) return b.init - a.init;
      return a.seq - b.seq;
    });
  }

  // ---------- add ----------
  function uniqueName(base) {
    var names = {};
    state.combatants.forEach(function (c) { names[c.name] = true; });
    if (!names[base]) return base;
    var n = 2;
    while (names[base + " " + n]) n++;
    return base + " " + n;
  }

  function addCombatant() {
    var base = (nameIn.value || "").trim();
    if (!base) { nameIn.focus(); return; }
    if (state.combatants.length >= MAX_COMBATANTS) return;
    var init = parseFloat(initIn.value);
    if (!isFinite(init)) init = 0;
    var hp = parseInt(hpIn.value, 10);
    var hasHp = isFinite(hp) && hp >= 0;

    // keep the active combatant's turn stable when the newcomer sorts above them
    var sortedBefore = order();
    var activeId = sortedBefore.length ? sortedBefore[Math.min(state.turn, sortedBefore.length - 1)].id : null;

    state.combatants.push({
      id: "c" + state.seq,
      seq: state.seq++,
      name: uniqueName(base),
      init: init,
      type: typeIn.value === "pc" || typeIn.value === "ally" ? typeIn.value : "enemy",
      hp: hasHp ? hp : null,
      maxHp: hasHp ? hp : null,
      conditions: []
    });

    if (activeId && (state.round > 1 || state.turn > 0)) { // before the first Next the top of the order stays active
      var sortedAfter = order();
      for (var i = 0; i < sortedAfter.length; i++) {
        if (sortedAfter[i].id === activeId) { state.turn = i; break; }
      }
    }

    nameIn.value = ""; initIn.value = ""; hpIn.value = "";
    nameIn.focus();
    save(); render();
  }

  addBtn.addEventListener("click", addCombatant);
  [nameIn, initIn, hpIn].forEach(function (el) {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addCombatant(); }
    });
  });

  // ---------- turns ----------
  nextBtn.addEventListener("click", function () {
    var n = state.combatants.length;
    if (!n) return;
    state.turn++;
    if (state.turn >= n) { state.turn = 0; state.round++; }
    save(); render();
  });

  prevBtn.addEventListener("click", function () {
    var n = state.combatants.length;
    if (!n) return;
    if (state.turn > 0) { state.turn--; }
    else if (state.round > 1) { state.round--; state.turn = n - 1; }
    save(); render();
  });

  resetBtn.addEventListener("click", function () {
    state.round = 1; state.turn = 0;
    save(); render();
  });

  clearBtn.addEventListener("click", function () {
    if (!state.combatants.length) return;
    if (!window.confirm("Remove every combatant and start over?")) return;
    state = blank();
    save(); render();
  });

  // ---------- per-combatant actions ----------
  function byId(id) {
    for (var i = 0; i < state.combatants.length; i++) {
      if (state.combatants[i].id === id) return state.combatants[i];
    }
    return null;
  }

  function removeCombatant(id) {
    var sorted = order();
    var removedIdx = -1;
    for (var i = 0; i < sorted.length; i++) if (sorted[i].id === id) removedIdx = i;
    state.combatants = state.combatants.filter(function (c) { return c.id !== id; });
    var n = state.combatants.length;
    if (!n) { state.turn = 0; }
    else {
      if (removedIdx !== -1 && removedIdx < state.turn) state.turn--;
      if (state.turn >= n) { state.turn = 0; state.round++; } // active last-in-order removed: turn wraps like Next
    }
    save(); render();
  }

  function bumpHp(id, delta) {
    var c = byId(id);
    if (!c || c.hp === null) return;
    c.hp = Math.max(0, c.hp + delta);
    save(); render();
  }

  function setHp(id, value) {
    var c = byId(id);
    if (!c) return;
    var m = /^\s*([+-]?)(\d+)\s*$/.exec(value);
    if (!m) { render(); return; } // emptied or spliced field ("3-70"): keep current HP, restore the display
    var v = parseInt(m[1] + m[2], 10);
    var next = m[1] ? c.hp + v : v; // "-7" = 7 damage, "+5" = heal 5
    if (!isFinite(next)) { render(); return; } // a 309-digit paste parses to Infinity
    c.hp = Math.max(0, next);
    save(); render();
  }

  function addCondition(id, text) {
    var c = byId(id);
    var t = (text || "").trim();
    if (!c || !t) return;
    t = t.slice(0, 24);
    var exists = c.conditions.some(function (x) { return x.toLowerCase() === t.toLowerCase(); });
    if (!exists && c.conditions.length < 8) c.conditions.push(t);
    save(); render();
  }

  function removeCondition(id, idx) {
    var c = byId(id);
    if (!c) return;
    c.conditions.splice(idx, 1);
    save(); render();
  }

  // ---------- render ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function fmtInit(v) {
    return String(v);
  }

  function render() {
    var sorted = order();
    var n = sorted.length;
    if (state.turn >= n) state.turn = 0;

    roundLbl.textContent = "Round " + state.round;

    if (!n) {
      curName.textContent = "Add combatants to start";
      onDeck.textContent = "";
      listEl.innerHTML = '<div class="empty-note">No one in the fight yet. Add your party and tonight’s monsters above — they’ll still be here next time you open this page.</div>';
      return;
    }

    var active = sorted[state.turn];
    var next = sorted[(state.turn + 1) % n];
    curName.textContent = active.name;
    onDeck.textContent = n > 1 ? "On deck: " + next.name : "";

    var html = "";
    for (var i = 0; i < n; i++) {
      var c = sorted[i];
      var cls = "combatant";
      if (i === state.turn) cls += " active";
      if (c.hp !== null && c.hp <= 0) cls += " down";

      var hpHtml;
      if (c.hp === null) {
        hpHtml = '<span class="no-hp">HP not tracked</span>';
      } else {
        hpHtml =
          '<span class="hp-lbl">HP</span>' +
          '<button type="button" class="hp-btn" data-act="hp" data-id="' + esc(c.id) + '" data-d="-1" aria-label="Damage ' + esc(c.name) + ' by 1">&minus;</button>' +
          '<input class="hp" type="text" inputmode="numeric" value="' + c.hp + '" data-act="hpset" data-id="' + esc(c.id) + '" aria-label="' + esc(c.name) + ' hit points" title="Type -7 for damage, +5 to heal, or a number to set HP">' +
          '<button type="button" class="hp-btn" data-act="hp" data-id="' + esc(c.id) + '" data-d="1" aria-label="Heal ' + esc(c.name) + ' by 1">+</button>' +
          (c.maxHp !== null ? '<span class="hp-max">/ ' + c.maxHp + '</span>' : '');
      }

      var condHtml = '';
      for (var j = 0; j < c.conditions.length; j++) {
        condHtml += '<span class="cond">' + esc(c.conditions[j]) +
          '<button type="button" data-act="uncond" data-id="' + esc(c.id) + '" data-idx="' + j + '" aria-label="Remove condition ' + esc(c.conditions[j]) + '">&times;</button></span>';
      }
      condHtml += '<input class="cond-add" type="text" list="cond-presets" placeholder="+ condition" maxlength="24" data-act="cond" data-id="' + esc(c.id) + '" aria-label="Add condition to ' + esc(c.name) + '">';

      html +=
        '<div class="' + cls + '">' +
          '<div class="init" title="Initiative" aria-label="Initiative ' + fmtInit(c.init) + '">' + fmtInit(c.init) + '</div>' +
          '<div class="who"><div class="nm">' + esc(c.name) + '</div><div class="tp ' + c.type + '">' + TYPE_LABEL[c.type] + '</div></div>' +
          '<div class="c-mid"><div class="hp-line">' + hpHtml + '</div><div class="cond-line">' + condHtml + '</div></div>' +
          '<button type="button" class="c-remove" data-act="remove" data-id="' + esc(c.id) + '" aria-label="Remove ' + esc(c.name) + '">&times;</button>' +
        '</div>';
    }
    listEl.innerHTML = html;
  }

  // Event delegation for the rendered list
  listEl.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.getAttribute("data-act");
    var id = t.getAttribute("data-id");
    if (act === "remove") removeCombatant(id);
    else if (act === "hp") bumpHp(id, parseInt(t.getAttribute("data-d"), 10));
    else if (act === "uncond") removeCondition(id, parseInt(t.getAttribute("data-idx"), 10));
  });
  listEl.addEventListener("change", function (e) {
    var t = e.target;
    var act = t.getAttribute("data-act");
    if (act === "hpset") setHp(t.getAttribute("data-id"), t.value);
    else if (act === "cond" && t.value) addCondition(t.getAttribute("data-id"), t.value); // datalist pick commits too
  });
  listEl.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key === "Enter" && t.getAttribute("data-act") === "cond") {
      e.preventDefault();
      addCondition(t.getAttribute("data-id"), t.value);
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && t.getAttribute("data-act") === "hpset") {
      e.preventDefault(); // the text HP box has no built-in stepping: Up heals 1, Down deals 1, like the old number box
      var id = t.getAttribute("data-id");
      var typed = t.value;
      t.value = String(byId(id).hp); // un-dirty the box so the re-render cannot fire a late change
      setHp(id, typed); // commit a typed entry first (an invalid one just re-renders)
      bumpHp(id, e.key === "ArrowUp" ? 1 : -1);
      var box = listEl.querySelector('input.hp[data-id="' + id + '"]');
      if (box) box.focus();
    }
  });
  listEl.addEventListener("focusin", function (e) {
    if (e.target.getAttribute("data-act") === "hpset") e.target.select(); // typing "-7" replaces the shown HP instead of splicing into it
  });

  // Datalist of common condition names (generic across systems)
  var dl = document.createElement("datalist");
  dl.id = "cond-presets";
  ["Blinded","Charmed","Concentrating","Deafened","Frightened","Grappled","Hidden","Invisible","Paralyzed","Poisoned","Prone","Restrained","Slowed","Stunned","Unconscious"]
    .forEach(function (name) {
      var o = document.createElement("option");
      o.value = name;
      dl.appendChild(o);
    });
  document.body.appendChild(dl);

  render();
});
