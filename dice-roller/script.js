/* ============================================================
   Dice Roller — Tynkr Tools & Co
   NdX notation with kh/kl, pool builder, adv/dis, history.
   Vanilla JS, self-contained. Theme is handled by ../kinetic.js
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
  var STORE_KEY = "tynkr-dice-roller-v1";
  var MAX_HISTORY = 20;
  var MAX_DICE_PER_TERM = 100;
  var MAX_TERMS = 12;

  var poolEl     = document.getElementById("pool");
  var notationIn = document.getElementById("notation");
  var modifierIn = document.getElementById("modifier");
  var rollBtn    = document.getElementById("roll-btn");
  var advBtn     = document.getElementById("adv-btn");
  var disBtn     = document.getElementById("dis-btn");
  var statsBtn   = document.getElementById("stats-btn");
  var clearPool  = document.getElementById("clear-pool");
  var errEl      = document.getElementById("err-msg");

  var resultLbl  = document.getElementById("result-label");
  var resultTot  = document.getElementById("result-total");
  var resultNot  = document.getElementById("result-notation");
  var diceOut    = document.getElementById("dice-out");

  var histEl     = document.getElementById("history");
  var clearHist  = document.getElementById("clear-history");

  // pool = { sides: count }, insertion-ordered by first tap
  var pool = {};
  var poolOrder = [];
  var history = loadHistory();

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var h = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(h)) return [];
      return h.slice(0, MAX_HISTORY)
        .filter(function (e) { return e && typeof e === "object"; })
        .map(function (e) {
          return { desc: String(e.desc || ""), detail: String(e.detail || ""), total: Number(e.total) || 0 };
        });
    } catch (e) { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(history)); } catch (e) {}
  }

  // ---------- RNG: unbiased die roll, crypto when available ----------
  function rollDie(sides) {
    if (window.crypto && window.crypto.getRandomValues) {
      var max = Math.floor(0x100000000 / sides) * sides; // rejection sampling
      var buf = new Uint32Array(1);
      do { window.crypto.getRandomValues(buf); } while (buf[0] >= max);
      return (buf[0] % sides) + 1;
    }
    return Math.floor(Math.random() * sides) + 1;
  }

  // ---------- notation parser ----------
  // Expression: terms joined by + or -. Term: NdX(khK|klK)? or integer.
  function parse(expr) {
    var s = String(expr || "").toLowerCase().replace(/\s+/g, "");
    if (!s) return { error: "Nothing to roll." };
    if (!/^[0-9dkhl+\-]+$/.test(s)) return { error: "Only dice notation here — like 3d6+2 or 4d6kh3." };

    var terms = [];
    var re = /([+-]?)(\d*d\d+(?:k[hl]\d+)?|\d+)/g;
    var m, consumed = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index !== consumed) return { error: "Couldn't read that — check the notation." };
      consumed = m.index + m[0].length;
      var sign = m[1] === "-" ? -1 : 1;
      var body = m[2];
      if (terms.length >= MAX_TERMS) return { error: "That's a lot of terms — keep it under " + MAX_TERMS + "." };

      if (body.indexOf("d") === -1) {
        terms.push({ kind: "mod", sign: sign, value: parseInt(body, 10) });
        continue;
      }
      var dm = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/.exec(body);
      if (!dm) return { error: "Couldn't read \"" + body + "\"." };
      var count = dm[1] === "" ? 1 : parseInt(dm[1], 10);
      var sides = parseInt(dm[2], 10);
      var keep = dm[3] ? { mode: dm[3], n: parseInt(dm[4], 10) } : null;
      if (count < 1 || count > MAX_DICE_PER_TERM) return { error: "Dice count must be 1–" + MAX_DICE_PER_TERM + "." };
      if (sides < 2 || sides > 1000) return { error: "Die sides must be 2–1000." };
      if (keep && (keep.n < 1 || keep.n > count)) return { error: "Can't keep " + (keep ? keep.n : 0) + " of " + count + " dice." };
      terms.push({ kind: "dice", sign: sign, count: count, sides: sides, keep: keep });
    }
    if (consumed !== s.length || !terms.length) return { error: "Couldn't read that — check the notation." };
    return { terms: terms };
  }

  // ---------- roll ----------
  function rollTerms(terms) {
    var total = 0;
    var out = []; // render items: {kind:'die', v, sides, dropped} | {kind:'mod', text}
    var descBits = [];

    terms.forEach(function (t) {
      if (t.kind === "mod") {
        var val = t.sign * t.value;
        if (val !== 0) {
          total += val;
          out.push({ kind: "mod", text: (val > 0 ? "+" : "−") + Math.abs(val) });
          descBits.push((t.sign < 0 ? "-" : (descBits.length ? "+" : "")) + t.value);
        }
        return;
      }
      var rolls = [];
      for (var i = 0; i < t.count; i++) rolls.push(rollDie(t.sides));

      var kept = rolls.map(function () { return true; });
      if (t.keep) {
        var idx = rolls.map(function (v, i2) { return { v: v, i: i2 }; });
        idx.sort(function (a, b) { return t.keep.mode === "h" ? b.v - a.v : a.v - b.v; });
        kept = rolls.map(function () { return false; });
        for (var k = 0; k < t.keep.n; k++) kept[idx[k].i] = true;
      }

      var sub = 0;
      rolls.forEach(function (v, i3) {
        if (kept[i3]) sub += v;
        out.push({
          kind: "die", v: v, sides: t.sides, dropped: !kept[i3],
          crit: t.sides === 20 && v === 20, fumble: t.sides === 20 && v === 1
        });
      });
      total += t.sign * sub;
      descBits.push((t.sign < 0 ? "-" : (descBits.length ? "+" : "")) +
        t.count + "d" + t.sides + (t.keep ? "k" + t.keep.mode + t.keep.n : ""));
    });

    return { total: total, out: out, desc: descBits.join("") };
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.className = "err on";
  }
  function clearError() {
    errEl.textContent = "";
    errEl.className = "err";
  }

  function doRoll(expr, label) {
    clearError();
    var parsed = parse(expr);
    if (parsed.error) { showError(parsed.error); return; }
    var r = rollTerms(parsed.terms);

    resultLbl.textContent = label || "Result";
    resultTot.textContent = r.total;
    resultNot.textContent = r.desc;

    var html = "";
    r.out.forEach(function (d) {
      if (d.kind === "mod") { html += '<span class="mod-face">' + d.text + "</span>"; return; }
      var cls = "die-face";
      if (d.dropped) cls += " dropped";
      else if (d.crit) cls += " crit";
      else if (d.fumble) cls += " fumble";
      html += '<span class="' + cls + '" title="d' + d.sides + '"><span class="df-k">d' + d.sides + "</span>" + d.v + "</span>";
    });
    diceOut.innerHTML = html;

    var detail = r.out.filter(function (d) { return d.kind === "die"; })
      .map(function (d) { return d.dropped ? "(" + d.v + ")" : d.v; }).join(" ");
    history.unshift({ desc: (label ? label + " · " : "") + r.desc, detail: detail, total: r.total });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();
    renderHistory();
  }

  // ---------- pool ----------
  function poolExpr() {
    var bits = poolOrder.filter(function (s) { return pool[s]; })
      .map(function (s) { return pool[s] + "d" + s; });
    return bits.join("+");
  }
  function renderPool() {
    var bits = poolOrder.filter(function (s) { return pool[s]; });
    if (!bits.length) {
      poolEl.innerHTML = '<span class="pool-empty">Pool is empty — tap dice above to add them.</span>';
      return;
    }
    poolEl.innerHTML = bits.map(function (s) {
      return '<span class="pool-chip">' + pool[s] + " × d" + s +
        '<button type="button" data-die="' + s + '" aria-label="Remove d' + s + ' from pool">&times;</button></span>';
    }).join("");
  }

  document.querySelectorAll(".die-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var s = btn.getAttribute("data-die");
      if (!pool[s]) {
        pool[s] = 0;
        if (poolOrder.indexOf(s) === -1) poolOrder.push(s);
      }
      if (pool[s] < MAX_DICE_PER_TERM) pool[s]++;
      notationIn.value = "";
      renderPool();
    });
  });
  poolEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-die]");
    if (!b) return;
    var s = b.getAttribute("data-die");
    pool[s] = Math.max(0, (pool[s] || 0) - 1);
    if (!pool[s]) {
      delete pool[s];
      poolOrder = poolOrder.filter(function (x) { return x !== s; });
    }
    renderPool();
  });
  clearPool.addEventListener("click", function () {
    pool = {}; poolOrder = [];
    renderPool();
  });

  // ---------- wire up ----------
  function modSuffix() {
    var mod = parseInt(modifierIn.value, 10);
    if (!isFinite(mod) || mod === 0) return "";
    return mod > 0 ? "+" + mod : String(mod);
  }

  rollBtn.addEventListener("click", function () {
    var typed = notationIn.value.replace(/\s+/g, "");
    var expr = typed || poolExpr();
    if (!expr) { showError("Tap some dice or type notation first."); return; }
    // typed notation carries its own modifiers; the pool gets the modifier field
    doRoll(typed ? typed : expr + modSuffix());
  });
  notationIn.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); rollBtn.click(); }
  });
  // typed notation takes over from the pool — empty it so the UI matches what will roll
  notationIn.addEventListener("input", function () {
    if (notationIn.value && poolOrder.length) {
      pool = {}; poolOrder = [];
      renderPool();
    }
  });
  advBtn.addEventListener("click", function () { doRoll("2d20kh1" + modSuffix(), "Advantage"); });
  disBtn.addEventListener("click", function () { doRoll("2d20kl1" + modSuffix(), "Disadvantage"); });
  statsBtn.addEventListener("click", function () { doRoll("4d6kh3", "Ability score"); });

  // ---------- history ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function renderHistory() {
    if (!history.length) {
      histEl.innerHTML = '<div class="empty-note">No rolls yet. The last ' + MAX_HISTORY + " land here — with their full breakdown — and stay put until you clear them.</div>";
      return;
    }
    histEl.innerHTML = history.map(function (h) {
      return '<div class="hist-row"><span class="hx">' + esc(h.desc) + '</span><span class="hd">' + esc(h.detail) + '</span><span class="hv">' + h.total + "</span></div>";
    }).join("");
  }
  clearHist.addEventListener("click", function () {
    history = [];
    saveHistory();
    renderHistory();
  });

  renderPool();
  renderHistory();
});
