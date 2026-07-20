/* ============================================================
   Session Notes & NPC Log — Tynkr Tools & Co
   Campaign journal: session log / NPC list / loot, Markdown export.
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
  var STORE_KEY = "tynkr-session-notes-v1";
  var MAX_CAMPAIGNS = 20, MAX_SESSIONS = 200, MAX_NPCS = 300, MAX_LOOT = 200;
  var MAX_TEXT = 20000, MAX_NAME = 60, MAX_NOTE = 200, MAX_LOOT_TEXT = 120;

  var campSelect = document.getElementById("campaign-select");
  var newCampIn  = document.getElementById("new-campaign-name");
  var newCampBtn = document.getElementById("new-campaign-btn");
  var exportBtn  = document.getElementById("export-btn");
  var deleteBtn  = document.getElementById("delete-campaign");

  var newSessBtn = document.getElementById("new-session");
  var sessList   = document.getElementById("session-list");

  var npcNameIn  = document.getElementById("npc-name");
  var npcNoteIn  = document.getElementById("npc-note");
  var npcAddBtn  = document.getElementById("npc-add");
  var npcFilter  = document.getElementById("npc-filter");
  var npcList    = document.getElementById("npc-list");
  var npcStatus  = document.getElementById("npc-status");

  var lootIn     = document.getElementById("loot-text");
  var lootAddBtn = document.getElementById("loot-add");
  var lootList   = document.getElementById("loot-list");

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function todayLocal() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function cleanDate(v) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : todayLocal();
  }

  // ---------- state ----------
  var state = load();

  function newCampaign(name, seq) {
    return { id: "camp" + seq, name: String(name || "My Campaign").slice(0, MAX_NAME), sessions: [], npcs: [], loot: [] };
  }
  function blank() {
    var s = { campaigns: [newCampaign("My Campaign", 1)], active: "camp1", seq: 2 };
    return s;
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.campaigns)) return blank();
      // sanitize everything AND regenerate every id — stored ids are untrusted, and fresh
      // sequential ids guarantee uid() can never mint a duplicate of a kept one
      var seq = 1;
      var campaigns = [];
      var activeIdx = 0;
      var origActive = String(s.active || "");
      s.campaigns.slice(0, MAX_CAMPAIGNS).forEach(function (c) {
        if (!c || typeof c !== "object") return;
        if (origActive && String(c.id || "") === origActive) activeIdx = campaigns.length;
        var campNum = seq++;
        campaigns.push({
          id: "camp" + campNum,
          name: String(c.name || "Campaign " + campNum).slice(0, MAX_NAME),
          sessions: (Array.isArray(c.sessions) ? c.sessions : []).slice(0, MAX_SESSIONS)
            .filter(function (x) { return x && typeof x === "object"; })
            .map(function (x) {
              return { id: "s" + seq++, date: cleanDate(x.date), text: String(x.text || "").slice(0, MAX_TEXT) };
            }),
          npcs: (Array.isArray(c.npcs) ? c.npcs : []).slice(0, MAX_NPCS)
            .filter(function (x) { return x && typeof x === "object"; })
            .map(function (x) {
              return { id: "n" + seq++, name: String(x.name || "").slice(0, MAX_NAME), note: String(x.note || "").slice(0, MAX_NOTE) };
            }),
          loot: (Array.isArray(c.loot) ? c.loot : []).slice(0, MAX_LOOT)
            .filter(function (x) { return x && typeof x === "object"; })
            .map(function (x) {
              return { id: "l" + seq++, text: String(x.text || "").slice(0, MAX_LOOT_TEXT), done: !!x.done };
            })
        });
      });
      if (!campaigns.length) return blank();
      return {
        campaigns: campaigns,
        active: campaigns[Math.min(activeIdx, campaigns.length - 1)].id,
        seq: seq
      };
    } catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function activeCamp() {
    for (var i = 0; i < state.campaigns.length; i++) {
      if (state.campaigns[i].id === state.active) return state.campaigns[i];
    }
    state.active = state.campaigns[0].id;
    return state.campaigns[0];
  }
  function uid(prefix) {
    return prefix + state.seq++;
  }

  // ---------- campaign controls ----------
  function renderCampaigns() {
    campSelect.innerHTML = state.campaigns.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === state.active ? " selected" : "") + ">" + esc(c.name) + "</option>";
    }).join("");
  }

  campSelect.addEventListener("change", function () {
    state.active = campSelect.value;
    save(); renderAll();
  });

  newCampBtn.addEventListener("click", function () {
    var name = (newCampIn.value || "").trim();
    if (!name) { newCampIn.focus(); return; }
    if (state.campaigns.length >= MAX_CAMPAIGNS) return;
    var c = newCampaign(name, state.seq);
    c.id = uid("camp");
    state.campaigns.push(c);
    state.active = c.id;
    newCampIn.value = "";
    save(); renderAll();
  });
  newCampIn.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); newCampBtn.click(); }
  });

  deleteBtn.addEventListener("click", function () {
    var c = activeCamp();
    if (!window.confirm('Delete "' + c.name + '" and all its notes? This cannot be undone.')) return;
    state.campaigns = state.campaigns.filter(function (x) { return x.id !== c.id; });
    if (!state.campaigns.length) state.campaigns.push(newCampaign("My Campaign", state.seq++));
    state.active = state.campaigns[0].id;
    save(); renderAll();
  });

  // ---------- markdown export ----------
  exportBtn.addEventListener("click", function () {
    var c = activeCamp();
    var lines = ["# " + c.name, ""];
    lines.push("## Sessions", "");
    if (!c.sessions.length) lines.push("_No session entries yet._", "");
    c.sessions.forEach(function (s) {
      lines.push("### " + s.date, "", s.text || "_(no notes)_", "");
    });
    lines.push("## NPCs", "");
    if (!c.npcs.length) lines.push("_No NPCs logged yet._", "");
    c.npcs.forEach(function (n) {
      lines.push("- **" + n.name + "**" + (n.note ? " — " + n.note : ""));
    });
    lines.push("", "## Loot & Quests", "");
    if (!c.loot.length) lines.push("_Nothing tracked yet._", "");
    c.loot.forEach(function (l) {
      lines.push("- [" + (l.done ? "x" : " ") + "] " + l.text);
    });
    lines.push("");

    var blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "campaign") + "-notes.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  // ---------- sessions ----------
  function renderSessions() {
    var c = activeCamp();
    if (!c.sessions.length) {
      sessList.innerHTML = '<div class="empty-note">No entries yet. Hit "New session entry" when the dice come out — a few sentences per night is plenty.</div>';
      return;
    }
    sessList.innerHTML = c.sessions.map(function (s) {
      return '<div class="session">' +
        '<div class="session-head">' +
          '<input type="date" value="' + esc(s.date) + '" data-act="sdate" data-id="' + esc(s.id) + '" aria-label="Session date">' +
          '<span class="spacer"></span>' +
          '<button type="button" class="s-remove" data-act="sremove" data-id="' + esc(s.id) + '" aria-label="Delete session entry dated ' + esc(s.date) + '">&times;</button>' +
        '</div>' +
        '<textarea data-act="stext" data-id="' + esc(s.id) + '" maxlength="' + MAX_TEXT + '" placeholder="What happened tonight&hellip;" aria-label="Session notes">' + esc(s.text) + '</textarea>' +
      '</div>';
    }).join("");
  }

  newSessBtn.addEventListener("click", function () {
    var c = activeCamp();
    if (c.sessions.length >= MAX_SESSIONS) return;
    c.sessions.unshift({ id: uid("s"), date: todayLocal(), text: "" });
    save(); renderSessions();
    var ta = sessList.querySelector("textarea");
    if (ta) ta.focus();
  });

  function sessionById(id) {
    var c = activeCamp();
    for (var i = 0; i < c.sessions.length; i++) if (c.sessions[i].id === id) return c.sessions[i];
    return null;
  }

  sessList.addEventListener("input", function (e) {
    var t = e.target, act = t.getAttribute("data-act");
    var s = sessionById(t.getAttribute("data-id"));
    if (!s) return;
    if (act === "stext") { s.text = t.value.slice(0, MAX_TEXT); save(); }       // no re-render while typing
    else if (act === "sdate") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.value)) { t.value = s.date; return; }   // cleared field: keep stored date, restore display
      s.date = t.value; save();
    }
  });
  sessList.addEventListener("click", function (e) {
    var t = e.target.closest('[data-act="sremove"]');
    if (!t) return;
    if (!window.confirm("Delete this session entry?")) return;
    var c = activeCamp();
    c.sessions = c.sessions.filter(function (s) { return s.id !== t.getAttribute("data-id"); });
    save(); renderSessions();
  });

  // ---------- NPCs ----------
  function renderNpcs() {
    var c = activeCamp();
    var q = (npcFilter.value || "").trim().toLowerCase();
    var shown = c.npcs.filter(function (n) {
      return !q || n.name.toLowerCase().indexOf(q) > -1 || n.note.toLowerCase().indexOf(q) > -1;
    });
    if (!c.npcs.length) {
      npcStatus.textContent = "";
      npcList.innerHTML = '<div class="empty-note">Nobody logged yet. Add the name the moment the game master says it — future-you will be grateful.</div>';
      return;
    }
    if (!shown.length) {
      npcStatus.textContent = "No names match that filter.";
      npcList.innerHTML = '<div class="empty-note">No names match that filter.</div>';
      return;
    }
    npcStatus.textContent = q ? (shown.length + " of " + c.npcs.length + " NPCs shown") : "";
    npcList.innerHTML = shown.map(function (n) {
      return '<div class="npc-row">' +
        '<span class="nm">' + esc(n.name) + '</span>' +
        '<span class="nt">' + esc(n.note) + '</span>' +
        '<button type="button" class="x-remove" data-act="nremove" data-id="' + esc(n.id) + '" aria-label="Remove ' + esc(n.name) + '">&times;</button>' +
      '</div>';
    }).join("");
  }

  function addNpc() {
    var name = (npcNameIn.value || "").trim();
    if (!name) { npcNameIn.focus(); return; }
    var c = activeCamp();
    if (c.npcs.length >= MAX_NPCS) return;
    c.npcs.unshift({ id: uid("n"), name: name.slice(0, MAX_NAME), note: (npcNoteIn.value || "").trim().slice(0, MAX_NOTE) });
    npcNameIn.value = ""; npcNoteIn.value = "";
    npcNameIn.focus();
    save(); renderNpcs();
  }
  npcAddBtn.addEventListener("click", addNpc);
  [npcNameIn, npcNoteIn].forEach(function (el) {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addNpc(); }
    });
  });
  npcFilter.addEventListener("input", renderNpcs);
  npcList.addEventListener("click", function (e) {
    var t = e.target.closest('[data-act="nremove"]');
    if (!t) return;
    var c = activeCamp();
    c.npcs = c.npcs.filter(function (n) { return n.id !== t.getAttribute("data-id"); });
    save(); renderNpcs();
  });

  // ---------- loot ----------
  function renderLoot() {
    var c = activeCamp();
    if (!c.loot.length) {
      lootList.innerHTML = '<div class="empty-note">Nothing tracked yet. Unidentified swords, unpaid debts, unfinished quests — this is their line.</div>';
      return;
    }
    lootList.innerHTML = c.loot.map(function (l) {
      return '<div class="loot-row' + (l.done ? " done" : "") + '">' +
        '<label><input type="checkbox"' + (l.done ? " checked" : "") + ' data-act="ldone" data-id="' + esc(l.id) + '"><span class="lt">' + esc(l.text) + '</span></label>' +
        '<button type="button" class="x-remove" data-act="lremove" data-id="' + esc(l.id) + '" aria-label="Remove ' + esc(l.text) + '">&times;</button>' +
      '</div>';
    }).join("");
  }

  function addLoot() {
    var text = (lootIn.value || "").trim();
    if (!text) { lootIn.focus(); return; }
    var c = activeCamp();
    if (c.loot.length >= MAX_LOOT) return;
    c.loot.unshift({ id: uid("l"), text: text.slice(0, MAX_LOOT_TEXT), done: false });
    lootIn.value = "";
    lootIn.focus();
    save(); renderLoot();
  }
  lootAddBtn.addEventListener("click", addLoot);
  lootIn.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addLoot(); }
  });
  lootList.addEventListener("change", function (e) {
    var t = e.target;
    if (t.getAttribute("data-act") !== "ldone") return;
    var c = activeCamp();
    for (var i = 0; i < c.loot.length; i++) {
      if (c.loot[i].id === t.getAttribute("data-id")) c.loot[i].done = t.checked;
    }
    save();
    // toggle in place instead of re-rendering — keeps keyboard focus on the checkbox
    var row = t.closest(".loot-row");
    if (row) row.classList.toggle("done", t.checked);
  });
  lootList.addEventListener("click", function (e) {
    var t = e.target.closest('[data-act="lremove"]');
    if (!t) return;
    var c = activeCamp();
    c.loot = c.loot.filter(function (l) { return l.id !== t.getAttribute("data-id"); });
    save(); renderLoot();
  });

  // ---------- render all ----------
  function renderAll() {
    renderCampaigns();
    renderSessions();
    renderNpcs();
    renderLoot();
  }

  renderAll();
});
