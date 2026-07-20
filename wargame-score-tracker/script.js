/* ============================================================
   Wargame Score Tracker — Tynkr Tools & Co
   Two players / battle rounds / primaries / secondaries / CP.
   Vanilla JS, self-contained. State persists in localStorage.
   Theme is handled by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../tabletop/index.html",
  "initiative-tracker": "../initiative-tracker/index.html",
  "dice-roller": "../dice-roller/index.html",
  "session-notes": "../session-notes/index.html",
  "wargame-score-tracker": "../wargame-score-tracker/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  var STORE_KEY = "tynkr-wargame-score-v1";
  var MIN_ROUNDS = 3, MAX_ROUNDS = 6, MAX_SECONDARIES = 12;
  var MAX_NAME = 24, MAX_SEC_NAME = 60, MAX_PTS = 999, MAX_CP = 99;

  var nameIns   = [document.getElementById("p1-name"), document.getElementById("p2-name")];
  var roundsSel = document.getElementById("rounds-select");
  var newMatch  = document.getElementById("new-match");

  var roundLbl  = document.getElementById("round-label");
  var dispN     = [document.getElementById("disp-n1"), document.getElementById("disp-n2")];
  var dispS     = [document.getElementById("disp-s1"), document.getElementById("disp-s2")];
  var leaderSub = document.getElementById("leader-sub");
  var nextBtn   = document.getElementById("next-round");
  var prevBtn   = document.getElementById("prev-round");

  var cpVals    = [document.getElementById("cp1-val"), document.getElementById("cp2-val")];
  var primRows  = [document.getElementById("prim1"), document.getElementById("prim2")];
  var secNameIn = [document.getElementById("sec1-name"), document.getElementById("sec2-name")];
  var secPtsIn  = [document.getElementById("sec1-pts"), document.getElementById("sec2-pts")];
  var secAddBtn = [document.getElementById("sec1-add"), document.getElementById("sec2-add")];
  var secLists  = [document.getElementById("sec1-list"), document.getElementById("sec2-list")];

  var DEFAULT_NAMES = ["Player one", "Player two"];

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function num(v, lo, hi) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) return 0;
    return Math.max(lo, Math.min(hi, n));
  }
  // read a points input: valueAsNumber handles "1e3"-style input correctly
  function readPts(el) {
    var v = isFinite(el.valueAsNumber) ? Math.round(el.valueAsNumber) : parseInt(el.value, 10);
    return num(v, 0, MAX_PTS);
  }

  // ---------- state ----------
  var state = load();

  // primaries always hold MAX_ROUNDS slots; only the first state.rounds are shown
  // and summed, so shrinking the rounds select is lossless.
  function blankPlayer() {
    var prims = [];
    for (var i = 0; i < MAX_ROUNDS; i++) prims.push(0);
    return { name: "", cp: 0, primaries: prims, secondaries: [] };
  }
  function blank() {
    return { players: [blankPlayer(), blankPlayer()], rounds: 5, round: 1, seq: 1 };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.players)) return blank();
      // sanitize everything AND regenerate secondary ids — stored data is untrusted
      var rounds = num(s.rounds, MIN_ROUNDS, MAX_ROUNDS) || 5;
      var seq = 1;
      var players = [];
      for (var p = 0; p < 2; p++) {
        var src = (s.players[p] && typeof s.players[p] === "object") ? s.players[p] : {};
        var prims = [];
        for (var r = 0; r < MAX_ROUNDS; r++) {
          prims.push(Array.isArray(src.primaries) ? num(src.primaries[r], 0, MAX_PTS) : 0);
        }
        players.push({
          name: String(src.name || "").slice(0, MAX_NAME),
          cp: num(src.cp, 0, MAX_CP),
          primaries: prims,
          secondaries: (Array.isArray(src.secondaries) ? src.secondaries : []).slice(0, MAX_SECONDARIES)
            .filter(function (x) { return x && typeof x === "object"; })
            .map(function (x) {
              return { id: "x" + seq++, name: String(x.name || "").slice(0, MAX_SEC_NAME), pts: num(x.pts, 0, MAX_PTS) };
            })
        });
      }
      return { players: players, rounds: rounds, round: num(s.round, 1, rounds) || 1, seq: seq };
    } catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function total(p) {
    var t = 0;
    state.players[p].primaries.slice(0, state.rounds).forEach(function (v) { t += v; });
    state.players[p].secondaries.forEach(function (x) { t += x.pts; });
    return t;
  }
  function shownName(p) {
    return state.players[p].name || DEFAULT_NAMES[p];
  }

  // ---------- scoreboard (in-place updates, no re-render) ----------
  function updateScore() {
    var a = total(0), b = total(1);
    dispS[0].textContent = a;
    dispS[1].textContent = b;
    dispN[0].textContent = shownName(0);
    dispN[1].textContent = shownName(1);
    roundLbl.textContent = "Battle round " + state.round + " of " + state.rounds;
    if (a === b) leaderSub.textContent = "Even game.";
    else {
      var lead = a > b ? 0 : 1;
      leaderSub.textContent = shownName(lead) + " leads by " + Math.abs(a - b) + ".";
    }
  }

  // ---------- setup ----------
  nameIns.forEach(function (el, p) {
    el.addEventListener("input", function () {
      state.players[p].name = el.value.slice(0, MAX_NAME);
      save(); updateScore();
      // keep the primary cells' accessible names current without a re-render
      var inputs = primRows[p].querySelectorAll("input");
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].setAttribute("aria-label", shownName(p) + " primary points, round " + (i + 1));
      }
    });
  });

  roundsSel.addEventListener("change", function () {
    var rounds = num(roundsSel.value, MIN_ROUNDS, MAX_ROUNDS) || 5;
    state.players.forEach(function (pl) {
      while (pl.primaries.length < MAX_ROUNDS) pl.primaries.push(0);
    });
    state.rounds = rounds; // hidden rounds keep their values — 5 -> 3 -> 5 is lossless
    if (state.round > rounds) state.round = rounds;
    save(); renderPrimaries(); updateScore();
  });

  newMatch.addEventListener("click", function () {
    if (!window.confirm("Zero all scores and start a new match? Player names stay.")) return;
    state.players.forEach(function (pl) {
      pl.cp = 0;
      pl.primaries = pl.primaries.map(function () { return 0; });
      pl.secondaries = [];
    });
    state.round = 1;
    save(); renderAll();
  });

  // ---------- rounds ----------
  nextBtn.addEventListener("click", function () {
    if (state.round < state.rounds) { state.round++; save(); renderPrimaries(); updateScore(); }
  });
  prevBtn.addEventListener("click", function () {
    if (state.round > 1) { state.round--; save(); renderPrimaries(); updateScore(); }
  });

  // ---------- command points ----------
  document.querySelectorAll(".cp-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = num(btn.getAttribute("data-p"), 0, 1);
      var d = parseInt(btn.getAttribute("data-d"), 10) || 0;
      state.players[p].cp = num(state.players[p].cp + d, 0, MAX_CP);
      cpVals[p].textContent = state.players[p].cp;
      save();
    });
  });

  // ---------- primaries ----------
  function renderPrimaries() {
    for (var p = 0; p < 2; p++) {
      var html = "";
      for (var r = 0; r < state.rounds; r++) {
        html += '<div class="prim-cell' + (r + 1 === state.round ? " now" : "") + '">' +
          '<span class="r">R' + (r + 1) + '</span>' +
          '<input type="number" inputmode="numeric" min="0" max="999" value="' + state.players[p].primaries[r] + '" data-p="' + p + '" data-r="' + r + '" aria-label="' + esc(shownName(p)) + ' primary points, round ' + (r + 1) + '">' +
        '</div>';
      }
      primRows[p].innerHTML = html;
    }
  }
  primRows.forEach(function (row) {
    row.addEventListener("input", function (e) {
      var t = e.target;
      if (t.tagName !== "INPUT") return;
      var p = num(t.getAttribute("data-p"), 0, 1);
      var r = num(t.getAttribute("data-r"), 0, MAX_ROUNDS - 1);
      if (r >= state.rounds) return;
      state.players[p].primaries[r] = readPts(t);
      save(); updateScore(); // totals update in place; the input keeps focus
    });
    // on commit (blur/change), reflect the sanitized value so the cell always matches the total
    row.addEventListener("change", function (e) {
      var t = e.target;
      if (t.tagName !== "INPUT") return;
      var p = num(t.getAttribute("data-p"), 0, 1);
      var r = num(t.getAttribute("data-r"), 0, MAX_ROUNDS - 1);
      t.value = state.players[p].primaries[r];
    });
  });

  // ---------- secondaries ----------
  function renderSecondaries(p) {
    var secs = state.players[p].secondaries;
    if (!secs.length) {
      secLists[p].innerHTML = '<div class="empty-note">No secondaries yet — type them as your mission names them.</div>';
      return;
    }
    secLists[p].innerHTML = secs.map(function (x) {
      return '<div class="sec-row">' +
        '<span class="sn">' + esc(x.name) + '</span>' +
        '<input type="number" inputmode="numeric" min="0" max="999" value="' + x.pts + '" data-p="' + p + '" data-id="' + esc(x.id) + '" aria-label="Points for ' + esc(x.name) + '">' +
        '<button type="button" class="x-remove" data-p="' + p + '" data-id="' + esc(x.id) + '" aria-label="Remove ' + esc(x.name) + '">&times;</button>' +
      '</div>';
    }).join("");
  }

  function addSecondary(p) {
    var name = (secNameIn[p].value || "").trim();
    if (!name) { secNameIn[p].focus(); return; }
    if (state.players[p].secondaries.length >= MAX_SECONDARIES) return;
    state.players[p].secondaries.push({
      id: "x" + state.seq++,
      name: name.slice(0, MAX_SEC_NAME),
      pts: readPts(secPtsIn[p])
    });
    secNameIn[p].value = ""; secPtsIn[p].value = "";
    secNameIn[p].focus();
    save(); renderSecondaries(p); updateScore();
  }

  for (var pi = 0; pi < 2; pi++) {
    (function (p) {
      secAddBtn[p].addEventListener("click", function () { addSecondary(p); });
      [secNameIn[p], secPtsIn[p]].forEach(function (el) {
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); addSecondary(p); }
        });
      });
      secLists[p].addEventListener("input", function (e) {
        var t = e.target;
        if (t.tagName !== "INPUT") return;
        var id = t.getAttribute("data-id");
        state.players[p].secondaries.forEach(function (x) {
          if (x.id === id) x.pts = readPts(t);
        });
        save(); updateScore(); // in place — the points input keeps focus
      });
      secLists[p].addEventListener("change", function (e) {
        var t = e.target;
        if (t.tagName !== "INPUT") return;
        var id = t.getAttribute("data-id");
        state.players[p].secondaries.forEach(function (x) {
          if (x.id === id) t.value = x.pts; // reflect sanitized value on commit
        });
      });
      secLists[p].addEventListener("click", function (e) {
        var t = e.target.closest("button[data-id]");
        if (!t) return;
        state.players[p].secondaries = state.players[p].secondaries.filter(function (x) {
          return x.id !== t.getAttribute("data-id");
        });
        save(); renderSecondaries(p); updateScore();
        secNameIn[p].focus(); // keyboard users land somewhere useful, not <body>
      });
    })(pi);
  }

  // ---------- render all ----------
  function renderAll() {
    nameIns[0].value = state.players[0].name;
    nameIns[1].value = state.players[1].name;
    roundsSel.value = String(state.rounds);
    cpVals[0].textContent = state.players[0].cp;
    cpVals[1].textContent = state.players[1].cp;
    renderPrimaries();
    renderSecondaries(0);
    renderSecondaries(1);
    updateScore();
  }

  renderAll();
});
