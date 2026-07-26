/* ============================================================
   Character Name Generator — Tynkr Tools & Co
   Syllable-built original names, four styles. Vanilla JS.
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
  var STORE_KEY = "tynkr-name-generator-kept-v1";
  var MAX_KEPT = 30;

  var stage    = document.getElementById("result-stage");
  var genBtn   = document.getElementById("generate");
  var copyBtn  = document.getElementById("copy-btn");
  var keepBtn  = document.getElementById("keep-btn");
  var keptList = document.getElementById("kept-list");
  var clearBtn = document.getElementById("clear-kept");
  var styleSel = document.getElementById("style-select");

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

  // ---------- syllable pools (all invented) ----------
  var FLOW = {
    a: ["Ae", "El", "Il", "Ly", "Sy", "Tha", "Ari", "Ny", "Cae", "Ela", "Ithe", "Ola", "Yse", "Vae", "Lira", "Mira", "Sere", "Ana", "Ori", "Eli", "Fae", "Nima", "Sola", "Vessa"],
    b: ["l", "n", "r", "s", "th", "v", "w", "dr", "ll", "nn"],
    c: ["ien", "iel", "wen", "ara", "orin", "yra", "andor", "ise", "ael", "enna", "ithil", "or", "une", "alis", "eth", "ione", "avel", "yn"]
  };
  var HARSH = {
    a: ["Gro", "Kar", "Dru", "Bal", "Thok", "Mor", "Gar", "Skar", "Ur", "Kra", "Vor", "Dag", "Bro", "Hark", "Zar", "Grum", "Rok", "Thra", "Muz", "Karg"],
    b: ["k", "g", "d", "z", "gr", "rk", "zz", "rg", "dth"],
    c: ["ak", "ug", "nash", "dur", "grim", "rok", "thar", "zug", "nak", "mok", "gash", "or", "usk", "arn", "arg"]
  };
  var SHORT = {
    a: ["Bo", "Da", "Fen", "Gil", "Hap", "Jo", "Kip", "Lum", "Mo", "Ned", "Ollo", "Pip", "Rud", "Tam", "Wick", "Zed", "Bram", "Cort", "Dob", "Effy", "Gus", "Hettie", "Milo", "Nell"],
    c: ["", "s", "n", "t", "p", "k", "d", "bb", "ck"]
  };
  var NOBLE_ADJ = ["Bright", "Iron", "Storm", "Ash", "Winter", "Gold", "Raven", "Thorn", "Oak", "Frost", "Ember", "Stone", "Moon", "Swift", "Grey", "Vale", "Silver", "Dawn", "Hollow", "High"];
  var NOBLE_SUFFIX = ["mantle", "brook", "guard", "forge", "helm", "weaver", "march", "crest", "hollow", "spire", "ward", "field", "gate", "bane", "song", "reach"];

  function nameFlowing() {
    var n = pick(FLOW.a) + (rnd(2) ? pick(FLOW.b) : "") + pick(FLOW.c);
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  }
  function nameHarsh() {
    var n = pick(HARSH.a) + (rnd(2) ? pick(HARSH.b) : "") + pick(HARSH.c);
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  }
  function nameShort() {
    var n = pick(SHORT.a) + pick(SHORT.c);
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  }
  function nameNoble() {
    var first = rnd(2) ? nameFlowing() : nameHarsh();
    return first + " " + pick(NOBLE_ADJ) + pick(NOBLE_SUFFIX);
  }
  function makeName(style) {
    if (style === "any") style = pick(["flowing", "harsh", "short", "noble"]);
    if (style === "flowing") return nameFlowing();
    if (style === "harsh") return nameHarsh();
    if (style === "short") return nameShort();
    return nameNoble();
  }

  // ---------- generate / select ----------
  var current = "";
  var batch = [];

  // pick-status live region for screen readers (the stage announces generates; this announces picks)
  var pickStatus = document.createElement("span");
  pickStatus.className = "sr-only";
  pickStatus.setAttribute("role", "status");
  document.querySelector(".result-actions").appendChild(pickStatus);

  function render() {
    var html = '<span class="stage-label">Six names — pick one, then Copy or Keep</span>';
    batch.forEach(function (n, i) {
      html += '<button type="button" class="result-line pickable' + (n === current ? " picked" : "") + '" data-i="' + i + '">' +
        '<span class="rk">' + (n === current ? "● picked" : "name") + '</span>' +
        '<span class="rv' + (i === 0 ? " big" : "") + '">' + esc(n) + "</span></button>";
    });
    stage.innerHTML = html;
  }

  // in-place selection — no re-render, so the aria-live stage doesn't re-announce all six names
  function selectRow(i) {
    if (!batch[i]) return;
    current = batch[i];
    var rows = stage.querySelectorAll("[data-i]");
    for (var r = 0; r < rows.length; r++) {
      var on = parseInt(rows[r].getAttribute("data-i"), 10) === i;
      rows[r].classList.toggle("picked", on);
      rows[r].querySelector(".rk").textContent = on ? "● picked" : "name";
    }
    pickStatus.textContent = "Picked " + current;
  }

  function generate() {
    var style = styleSel.value;
    batch = [];
    var seen = {};
    while (batch.length < 6) {
      var n = makeName(style);
      if (seen[n]) continue;
      seen[n] = true;
      batch.push(n);
    }
    current = batch[0];
    render();
  }

  stage.addEventListener("click", function (e) {
    var row = e.target.closest("[data-i]");
    if (!row) return;
    selectRow(parseInt(row.getAttribute("data-i"), 10));
  });

  genBtn.addEventListener("click", generate);
  styleSel.addEventListener("change", generate);
  copyBtn.addEventListener("click", function () { if (current) copyText(current, copyBtn); });

  // ---------- kept list ----------
  var kept = loadKept();
  function loadKept() {
    try {
      var k = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(k) ? k.slice(0, MAX_KEPT).filter(function (x) { return typeof x === "string"; }).map(function (x) { return x.slice(0, 120); }) : [];
    } catch (e) { return []; }
  }
  function saveKept() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(kept)); } catch (e) {}
  }
  function renderKept() {
    if (!kept.length) {
      keptList.innerHTML = '<div class="empty-note">Nothing kept yet — the name you half-liked three clicks ago is gone forever. Keep the good ones.</div>';
      return;
    }
    keptList.innerHTML = kept.map(function (x, i) {
      return '<div class="kept-item"><span class="kt">' + esc(x) + '</span>' +
        '<button type="button" class="k-btn" data-copy="' + i + '" aria-label="Copy ' + esc(x) + '" title="Copy">&#10697;</button>' +
        '<button type="button" class="k-btn x" data-del="' + i + '" aria-label="Remove ' + esc(x) + '" title="Remove">&times;</button></div>';
    }).join("");
  }
  keepBtn.addEventListener("click", function () {
    if (!current || kept.indexOf(current) > -1) return;
    kept.unshift(current);
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
    if (!window.confirm("Clear all kept names?")) return;
    kept = [];
    saveKept(); renderKept();
  });

  generate();   // action-first: the page loads already rolled
  renderKept();
});
