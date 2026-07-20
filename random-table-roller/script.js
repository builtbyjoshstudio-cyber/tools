/* ============================================================
   Random Table Roller — Tynkr Tools & Co
   Table library / line-paste parser / weighted ranges / crypto rolls.
   Vanilla JS, self-contained. State persists in localStorage.
   Theme is handled by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../tabletop/index.html",
  "initiative-tracker": "../initiative-tracker/index.html",
  "dice-roller": "../dice-roller/index.html",
  "session-notes": "../session-notes/index.html",
  "wargame-score-tracker": "../wargame-score-tracker/index.html",
  "random-table-roller": "../random-table-roller/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  var STORE_KEY = "tynkr-table-roller-v1";
  var MAX_TABLES = 50, MAX_ENTRIES = 500, MAX_HISTORY = 12;
  var MAX_NAME = 60, MAX_TEXT = 200, MAX_FACE = 1000;

  var tableSelect = document.getElementById("table-select");
  var newNameIn   = document.getElementById("new-table-name");
  var newTableBtn = document.getElementById("new-table-btn");
  var exportBtn   = document.getElementById("export-btn");
  var deleteBtn   = document.getElementById("delete-table");

  var pasteBox    = document.getElementById("paste-box");
  var parseBtn    = document.getElementById("parse-btn");
  var clearBtn    = document.getElementById("clear-entries");
  var oneIn       = document.getElementById("one-entry");
  var oneAdd      = document.getElementById("one-add");
  var dieNote     = document.getElementById("die-note");
  var entryList   = document.getElementById("entry-list");

  var resultLbl   = document.getElementById("result-label");
  var resultText  = document.getElementById("result-text");
  var resultSub   = document.getElementById("result-sub");
  var rollOneBtn  = document.getElementById("roll-one");
  var rollThreeBtn= document.getElementById("roll-three");
  var histEl      = document.getElementById("history");
  var clearHist   = document.getElementById("clear-history");

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function clampInt(v, lo, hi) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }
  function rollDie(sides) {
    if (window.crypto && window.crypto.getRandomValues) {
      var max = Math.floor(0x100000000 / sides) * sides; // rejection sampling
      var buf = new Uint32Array(1);
      do { window.crypto.getRandomValues(buf); } while (buf[0] >= max);
      return (buf[0] % sides) + 1;
    }
    return Math.floor(Math.random() * sides) + 1;
  }

  // ---------- state ----------
  var state = load();

  function blankTable(name, seq) {
    return { id: "t" + seq, name: String(name || "My Table").slice(0, MAX_NAME), entries: [] };
  }
  function blank() {
    return { tables: [blankTable("My Table", 1)], active: "t1", seq: 2, history: [] };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.tables)) return blank();
      // sanitize everything AND regenerate every id — stored data is untrusted
      var seq = 1;
      var tables = [];
      var activeIdx = 0;
      var origActive = String(s.active || "");
      s.tables.slice(0, MAX_TABLES).forEach(function (t) {
        if (!t || typeof t !== "object") return;
        if (origActive && String(t.id || "") === origActive) activeIdx = tables.length;
        var tblNum = seq++;
        tables.push({
          id: "t" + tblNum,
          name: String(t.name || "Table " + tblNum).slice(0, MAX_NAME),
          entries: (Array.isArray(t.entries) ? t.entries : []).slice(0, MAX_ENTRIES)
            .filter(function (x) { return x && typeof x === "object"; })
            .map(function (x) {
              var min = clampInt(x.min, 1, MAX_FACE);
              var max = clampInt(x.max, 1, MAX_FACE);
              if (max < min) { var sw = min; min = max; max = sw; }
              return { id: "e" + seq++, min: min, max: max, text: String(x.text || "").slice(0, MAX_TEXT) };
            })
        });
      });
      if (!tables.length) return blank();
      var history = (Array.isArray(s.history) ? s.history : []).slice(0, MAX_HISTORY)
        .filter(function (h) { return h && typeof h === "object"; })
        .map(function (h) {
          return { num: String(h.num || "").slice(0, 24), text: String(h.text || "").slice(0, MAX_TEXT + 60) };
        });
      return { tables: tables, active: tables[Math.min(activeIdx, tables.length - 1)].id, seq: seq, history: history };
    } catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function activeTable() {
    for (var i = 0; i < state.tables.length; i++) {
      if (state.tables[i].id === state.active) return state.tables[i];
    }
    state.active = state.tables[0].id;
    return state.tables[0];
  }
  function uid(prefix) {
    return prefix + state.seq++;
  }
  function tableMax(t) {
    var m = 0;
    t.entries.forEach(function (e) { if (e.max > m) m = e.max; });
    return m;
  }

  // ---------- paste parser ----------
  // "01-05: text" | "1–5 text" -> range ("00" as the upper bound means 100, d100-style);
  // "7: text" | "7. text" | "7) text" -> single (punctuation required — "10 gold pieces" stays content);
  // anything else -> auto-numbered after the current highest face.
  function faceNum(str) {
    var n = parseInt(str, 10);
    if (!isFinite(n)) return 1;
    if (n === 0) n = 100; // d100 convention: 00 reads as 100
    return Math.max(1, Math.min(MAX_FACE, n));
  }
  function parseLines(raw, startAt) {
    var out = [];
    var nextAuto = startAt + 1;
    String(raw).split(/\r?\n/).forEach(function (line) {
      var s = line.trim();
      if (!s) return;
      // 1-3 digit bounds so date-like lines ("2024-07-20: x") fall through to plain text
      var m = /^(\d{1,3})\s*[-–—]\s*(\d{1,3})[\s.:)]*(.*)$/.exec(s);
      if (m) {
        if (!m[3]) return; // bare range with no text — skip rather than mangle
        var lo = faceNum(m[1]), hi = faceNum(m[2]);
        if (hi < lo) { var sw = lo; lo = hi; hi = sw; }
        out.push({ min: lo, max: hi, text: m[3].trim().slice(0, MAX_TEXT) });
        if (hi >= nextAuto) nextAuto = hi + 1;
        return;
      }
      m = /^(\d{1,4})\s*[.:)]\s*(.*)$/.exec(s);
      if (m && m[2]) {
        var n = faceNum(m[1]);
        out.push({ min: n, max: n, text: m[2].trim().slice(0, MAX_TEXT) });
        if (n >= nextAuto) nextAuto = n + 1;
        return;
      }
      if (nextAuto > MAX_FACE) return; // table is at the face cap
      out.push({ min: nextAuto, max: nextAuto, text: s.slice(0, MAX_TEXT) });
      nextAuto++;
    });
    return out;
  }

  parseBtn.addEventListener("click", function () {
    var t = activeTable();
    var parsed = parseLines(pasteBox.value, tableMax(t));
    if (!parsed.length) { pasteBox.focus(); return; }
    var added = parsed.slice(0, Math.max(0, MAX_ENTRIES - t.entries.length));
    added.forEach(function (e) {
      t.entries.push({ id: uid("e"), min: e.min, max: e.max, text: e.text });
    });
    save(); renderEntries();
    if (added.length < parsed.length) {
      // keep the paste so nothing is lost; say what happened
      dieNote.textContent += " · " + (parsed.length - added.length) + " pasted lines dropped (table is full)";
    } else {
      pasteBox.value = "";
    }
  });

  oneAdd.addEventListener("click", function () {
    var text = (oneIn.value || "").trim();
    if (!text) { oneIn.focus(); return; }
    var t = activeTable();
    if (t.entries.length >= MAX_ENTRIES) return;
    var n = tableMax(t) + 1;
    if (n > MAX_FACE) return;
    t.entries.push({ id: uid("e"), min: n, max: n, text: text.slice(0, MAX_TEXT) });
    oneIn.value = "";
    oneIn.focus();
    save(); renderEntries();
  });
  oneIn.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); oneAdd.click(); }
  });

  clearBtn.addEventListener("click", function () {
    var t = activeTable();
    if (!t.entries.length) return;
    if (!window.confirm("Remove every entry from \"" + t.name + "\"?")) return;
    t.entries = [];
    save(); renderEntries();
  });

  // ---------- library ----------
  function renderTables() {
    tableSelect.innerHTML = state.tables.map(function (t) {
      return '<option value="' + esc(t.id) + '"' + (t.id === state.active ? " selected" : "") + ">" + esc(t.name) + "</option>";
    }).join("");
  }
  tableSelect.addEventListener("change", function () {
    state.active = tableSelect.value;
    save(); renderAll();
  });
  newTableBtn.addEventListener("click", function () {
    var name = (newNameIn.value || "").trim();
    if (!name) { newNameIn.focus(); return; }
    if (state.tables.length >= MAX_TABLES) return;
    var t = blankTable(name, 0);
    t.id = uid("t");
    state.tables.push(t);
    state.active = t.id;
    newNameIn.value = "";
    save(); renderAll();
  });
  newNameIn.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); newTableBtn.click(); }
  });
  deleteBtn.addEventListener("click", function () {
    var t = activeTable();
    if (!window.confirm('Delete "' + t.name + '" and all its entries? This cannot be undone.')) return;
    state.tables = state.tables.filter(function (x) { return x.id !== t.id; });
    if (!state.tables.length) {
      var nt = blankTable("My Table", 0);
      nt.id = uid("t");
      state.tables.push(nt);
    }
    state.active = state.tables[0].id;
    save(); renderAll();
  });

  exportBtn.addEventListener("click", function () {
    var t = activeTable();
    if (!t.entries.length) return;
    var lines = ["# " + t.name + " (d" + tableMax(t) + ")", ""];
    t.entries.forEach(function (e) {
      lines.push((e.min === e.max ? String(e.min) : e.min + "-" + e.max) + ": " + e.text);
    });
    lines.push("");
    var blob = new Blob([lines.join("\n")], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "table") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  // ---------- entries render ----------
  function renderEntries() {
    var t = activeTable();
    var max = tableMax(t);
    dieNote.textContent = t.entries.length
      ? "d" + max + " table · " + t.entries.length + (t.entries.length === 1 ? " entry" : " entries")
      : "Empty table";
    if (!t.entries.length) {
      entryList.innerHTML = '<div class="empty-note">No entries yet. Paste a list above — twenty lines makes a d20 table.</div>';
      return;
    }
    var sorted = t.entries.slice().sort(function (a, b) { return a.min - b.min || a.max - b.max; });
    entryList.innerHTML = sorted.map(function (e) {
      return '<div class="entry-row">' +
        '<span class="rng">' + (e.min === e.max ? e.min : e.min + "–" + e.max) + '</span>' +
        '<span class="txt">' + esc(e.text) + '</span>' +
        '<button type="button" class="x-remove" data-id="' + esc(e.id) + '" aria-label="Remove entry ' + (e.min === e.max ? e.min : e.min + " to " + e.max) + ': ' + esc(e.text.slice(0, 40)) + '">&times;</button>' +
      '</div>';
    }).join("");
  }
  entryList.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-id]");
    if (!b) return;
    var t = activeTable();
    t.entries = t.entries.filter(function (x) { return x.id !== b.getAttribute("data-id"); });
    save(); renderEntries();
    oneIn.focus(); // keyboard users land somewhere useful
  });

  // ---------- rolling ----------
  // Matches in numeric (display) order, so the first covering entry the user SEES is the one that wins.
  function findEntry(t, n) {
    var sorted = t.entries.slice().sort(function (a, b) { return a.min - b.min || a.max - b.max; });
    for (var i = 0; i < sorted.length; i++) {
      if (n >= sorted[i].min && n <= sorted[i].max) return sorted[i];
    }
    return null;
  }
  function pushHistory(num, text) {
    state.history.unshift({ num: num, text: text });
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    save(); renderHistory();
  }

  rollOneBtn.addEventListener("click", function () {
    var t = activeTable();
    var max = tableMax(t);
    if (!max) { resultText.textContent = "Add some entries first."; resultSub.textContent = ""; return; }
    var n = rollDie(max);
    var hit = findEntry(t, n);
    resultLbl.textContent = t.name; // textContent — no escaping needed
    if (hit) {
      resultText.innerHTML = '<span class="num">' + n + "</span> — " + esc(hit.text);
      resultSub.textContent = "d" + max;
      pushHistory("d" + max + " → " + n, hit.text);
    } else {
      resultText.innerHTML = '<span class="num">' + n + "</span> — no entry covers this number";
      resultSub.textContent = "d" + max + " · your ranges have a gap here";
      pushHistory("d" + max + " → " + n, "(gap — no entry)");
    }
  });

  rollThreeBtn.addEventListener("click", function () {
    var t = activeTable();
    var max = tableMax(t);
    if (!max) { resultText.textContent = "Add some entries first."; resultSub.textContent = ""; return; }
    var picked = [];
    var pickedIds = {};
    var attempts = 0;
    var target = Math.min(3, t.entries.length);
    while (picked.length < target && attempts < 200) {
      attempts++;
      var n = rollDie(max);
      var hit = findEntry(t, n);
      if (!hit || pickedIds[hit.id]) continue;
      pickedIds[hit.id] = true;
      picked.push({ n: n, text: hit.text });
    }
    if (!picked.length) {
      resultText.textContent = "Couldn't land on any entries — check your ranges for gaps.";
      resultSub.textContent = "d" + max;
      return;
    }
    resultLbl.textContent = t.name + " · batch";
    resultText.innerHTML = picked.map(function (r) {
      return '<span class="num">' + r.n + "</span> — " + esc(r.text);
    }).join("<br>");
    resultSub.textContent = "d" + max + " · " + picked.length + " distinct" + (picked.length < 3 && t.entries.length >= 3 ? " (gaps or overlaps limited the batch)" : "");
    picked.slice().reverse().forEach(function (r) { pushHistory("d" + max + " → " + r.n, r.text); }); // history reads top-to-bottom like the panel
  });

  // ---------- history ----------
  function renderHistory() {
    if (!state.history.length) {
      histEl.innerHTML = '<div class="empty-note">Rolls land here — the last ' + MAX_HISTORY + " stick around between sessions.</div>";
      return;
    }
    histEl.innerHTML = state.history.map(function (h) {
      return '<div class="hist-item"><span class="hn">' + esc(h.num) + '</span><span class="ht">' + esc(h.text) + "</span></div>";
    }).join("");
  }
  clearHist.addEventListener("click", function () {
    if (!state.history.length) return;
    if (!window.confirm("Clear roll history?")) return;
    state.history = [];
    save(); renderHistory();
  });

  // ---------- render all ----------
  function renderAll() {
    renderTables();
    renderEntries();
    renderHistory();
  }

  renderAll();
});
