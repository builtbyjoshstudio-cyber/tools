/* ============================================================
   Invoice Generator — Tynkr Tools & Co
   Line items, tax/discount/shipping, 16:9 letterhead upload (or
   business-name fallback), live preview, print-to-PDF.
   100% in-browser — nothing uploaded or stored.
   Theme handled globally by ../kinetic.js
   ============================================================ */

var TYNKR_REGISTRY = {
  hub: "../index.html",
  "freelance-rate-calculator": "../freelance-rate-calculator/index.html",
  "debt-payoff-calculator": "../debt-payoff-calculator/index.html",
  "budget-calculator": "../budget-calculator/index.html",
  "invoice-generator": "../invoice-generator/index.html"
};

document.addEventListener("DOMContentLoaded", function () {
  // ---- form els ----
  var f = {
    bizName: document.getElementById("biz-name"),
    bizDetails: document.getElementById("biz-details"),
    clientName: document.getElementById("client-name"),
    clientDetails: document.getElementById("client-details"),
    invNo: document.getElementById("inv-no"),
    invDate: document.getElementById("inv-date"),
    dueDate: document.getElementById("due-date"),
    currency: document.getElementById("currency"),
    taxRate: document.getElementById("tax-rate"),
    discount: document.getElementById("discount"),
    shipping: document.getElementById("shipping"),
    notes: document.getElementById("notes")
  };
  var itemRows = document.getElementById("item-rows");
  var addItemBtn = document.getElementById("add-item");
  var logoInput = document.getElementById("logo-input");
  var logoClear = document.getElementById("logo-clear");
  var logoStatus = document.getElementById("logo-status");
  var printBtn = document.getElementById("print-btn");
  var exampleNote = document.getElementById("example-note");
  var exampleClear = document.getElementById("example-clear");

  // ---- preview els ----
  var pv = {
    head: document.getElementById("pv-head"),
    logoImg: document.getElementById("pv-logo"),
    bizName: document.getElementById("pv-biz-name"),
    bizDetails: document.getElementById("pv-biz-details"),
    invNo: document.getElementById("pv-inv-no"),
    invDate: document.getElementById("pv-inv-date"),
    dueDate: document.getElementById("pv-due-date"),
    clientName: document.getElementById("pv-client-name"),
    clientDetails: document.getElementById("pv-client-details"),
    itemsBody: document.getElementById("pv-items"),
    subtotal: document.getElementById("pv-subtotal"),
    discountRow: document.getElementById("pv-discount-row"),
    discount: document.getElementById("pv-discount"),
    taxRow: document.getElementById("pv-tax-row"),
    tax: document.getElementById("pv-tax"),
    shipRow: document.getElementById("pv-ship-row"),
    ship: document.getElementById("pv-ship"),
    total: document.getElementById("pv-total"),
    notesWrap: document.getElementById("pv-notes-wrap"),
    notes: document.getElementById("pv-notes")
  };

  var CURRENCIES = { USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$", JPY: "¥" };
  var logoDataUrl = null;

  function num(el, d) { var v = parseFloat(el && el.value); return isFinite(v) ? v : d; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }
  function sym() { return CURRENCIES[f.currency.value] || "$"; }
  // JPY has no minor unit (ISO 4217); everything else bills in cents
  function dp() { return f.currency.value === "JPY" ? 0 : 2; }
  // maxDp lets a unit price keep its cents even in JPY (¥31.5/kWh) so qty x rate still matches the amount
  function fmt(n, maxDp) { if (!isFinite(n)) n = 0; return sym() + n.toLocaleString("en-US", { minimumFractionDigits: dp(), maximumFractionDigits: maxDp || dp() }); }
  // round half away from zero to the currency's precision, same as fmt() (toPrecision strips float noise so x.xx5 ties round up; credits round like charges and never leave -0)
  function roundCur(n) { var m = Math.pow(10, dp()); var r = Math.round(Number((Math.abs(n) * m).toPrecision(15))) / m; return n < 0 && r ? -r : r; }

  // ---------- line items ----------
  function addItem(desc, qty, rate) {
    var row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML =
      '<input type="text"   class="form-input it-desc" aria-label="Description" placeholder="Description" value="' + esc(desc || "") + '">' +
      '<input type="number" class="form-input it-qty"  aria-label="Qty" placeholder="Qty"  min="0" step="1"    inputmode="decimal" value="' + (qty != null ? qty : "") + '">' +
      '<input type="number" class="form-input it-rate" aria-label="Rate" placeholder="Rate" min="0" step="0.01" inputmode="decimal" value="' + (rate != null ? rate : "") + '">' +
      '<span class="it-amt">' + fmt(0) + '</span>' +
      '<button type="button" class="it-remove" aria-label="Remove line">&times;</button>';
    itemRows.appendChild(row);
    row.querySelector(".it-remove").addEventListener("click", function () { row.remove(); render(); });
    row.querySelectorAll("input").forEach(function (i) { i.addEventListener("input", render); });
    render();
  }

  function readItems() {
    var out = [];
    itemRows.querySelectorAll(".item-row").forEach(function (row) {
      var desc = row.querySelector(".it-desc").value;
      var qty = parseFloat(row.querySelector(".it-qty").value) || 0;
      var rate = parseFloat(row.querySelector(".it-rate").value) || 0;
      out.push({ desc: desc, qty: qty, rate: rate, amt: roundCur(qty * rate), el: row });
    });
    return out;
  }

  // ---------- totals ----------
  // every row is rounded before it is summed, so the printed rows always add up to the total;
  // discount is clamped to 0-100% of a positive subtotal and tax/shipping to >= 0 so a hidden row can't change the total
  function compute(items) {
    var subtotal = roundCur(items.reduce(function (s, it) { return s + it.amt; }, 0));
    var discountAmt = roundCur(Math.max(subtotal, 0) * (Math.min(Math.max(num(f.discount, 0), 0), 100) / 100));
    var base = roundCur(subtotal - discountAmt);
    var taxAmt = roundCur(base * (Math.max(num(f.taxRate, 0), 0) / 100));
    var ship = roundCur(Math.max(num(f.shipping, 0), 0));
    return { subtotal: subtotal, discountAmt: discountAmt, taxAmt: taxAmt, ship: ship, total: roundCur(base + taxAmt + ship) };
  }

  // ---------- render preview ----------
  function render() {
    var items = readItems();
    // update per-row amount labels
    items.forEach(function (it) { it.el.querySelector(".it-amt").textContent = fmt(it.amt); });

    // header: logo vs name fallback
    if (logoDataUrl) {
      pv.logoImg.src = logoDataUrl;
      pv.logoImg.style.display = "block";
      pv.bizName.style.display = "none";
      pv.head.classList.add("has-logo");
    } else {
      pv.logoImg.style.display = "none";
      pv.bizName.style.display = "block";
      pv.bizName.textContent = f.bizName.value.trim() || "Your Business Name";
      pv.head.classList.remove("has-logo");
    }

    pv.bizDetails.innerHTML = nl2br(f.bizDetails.value);
    pv.invNo.textContent = f.invNo.value.trim() || "—";
    pv.invDate.textContent = f.invDate.value || "—";
    pv.dueDate.textContent = f.dueDate.value || "—";
    pv.clientName.textContent = f.clientName.value.trim() || "Client name";
    pv.clientDetails.innerHTML = nl2br(f.clientDetails.value);

    // items table
    var visible = items.filter(function (it) { return it.desc.trim() || it.qty || it.rate; });
    pv.itemsBody.innerHTML = (visible.length ? visible : [{ desc: "", qty: 0, rate: 0, amt: 0 }]).map(function (it) {
      return '<tr>' +
        '<td>' + (esc(it.desc) || "&nbsp;") + '</td>' +
        '<td class="r">' + (it.qty || "") + '</td>' +
        '<td class="r">' + (it.rate ? fmt(it.rate, 2) : "") + '</td>' +
        '<td class="r">' + fmt(it.amt) + '</td>' +
      '</tr>';
    }).join("");

    var t = compute(items);
    pv.subtotal.textContent = fmt(t.subtotal);
    pv.discount.textContent = "-" + fmt(t.discountAmt);
    pv.discountRow.style.display = t.discountAmt > 0 ? "" : "none";
    pv.tax.textContent = fmt(t.taxAmt);
    pv.taxRow.style.display = num(f.taxRate, 0) > 0 ? "" : "none";
    pv.ship.textContent = fmt(t.ship);
    pv.shipRow.style.display = t.ship > 0 ? "" : "none";
    pv.total.textContent = fmt(t.total);

    var notes = f.notes.value.trim();
    pv.notes.innerHTML = nl2br(f.notes.value);
    pv.notesWrap.style.display = notes ? "" : "none";
  }

  // ---------- logo upload (16:9, in-browser only) ----------
  logoInput.addEventListener("change", function () {
    var file = logoInput.files && logoInput.files[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) {
      logoStatus.textContent = "Please choose an image file (PNG, JPG, WEBP).";
      logoStatus.style.color = "var(--neg)";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      logoStatus.textContent = "Image is over 5MB — please use a smaller file.";
      logoStatus.style.color = "var(--neg)";
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      logoDataUrl = e.target.result;
      logoStatus.textContent = "Letterhead added (shown as 16:9 banner). Nothing was uploaded — it stays on your device.";
      logoStatus.style.color = "var(--muted)";
      logoClear.style.display = "inline-flex";
      render();
    };
    reader.onerror = function () {
      logoStatus.textContent = "Couldn't read that file — try another image.";
      logoStatus.style.color = "var(--neg)";
    };
    reader.readAsDataURL(file);
  });

  logoClear.addEventListener("click", function () {
    logoDataUrl = null;
    logoInput.value = "";
    logoClear.style.display = "none";
    logoStatus.textContent = "No letterhead — your business name will be used instead.";
    logoStatus.style.color = "var(--muted)";
    render();
  });

  // ---------- first-visit example ----------
  // opens on a worked example so the first view (and the first Print) is a real invoice:
  // $600.00 - 10% = $540.00, + 8% tax $43.20 = $583.20. Obviously-sample names; the note and its
  // Clear button sit in the editor, which never prints. Nothing is stored, so every fresh load starts here.
  var EXAMPLE = { bizName: "Sample Studio", clientName: "Example Client Co.", taxRate: "8", discount: "10" };
  var EXAMPLE_ITEMS = [["Logo design", 1, 450], ["Revision rounds", 2, 75]];

  function exampleUntouched() {
    var lines = readItems().filter(function (it) { return it.desc.trim() || it.qty || it.rate; });
    return Object.keys(EXAMPLE).every(function (k) { return f[k].value === EXAMPLE[k]; }) &&
      lines.length === EXAMPLE_ITEMS.length &&
      EXAMPLE_ITEMS.every(function (e, i) { return lines[i].desc === e[0] && lines[i].qty === e[1] && lines[i].rate === e[2]; });
  }

  // empties only what the example filled in; if the user typed over any of it, ask first
  exampleClear.addEventListener("click", function () {
    if (!exampleUntouched() && !window.confirm("Clear the example and your edits to its names, line items, tax and discount?")) return;
    Object.keys(EXAMPLE).forEach(function (k) { f[k].value = f[k].defaultValue; });
    itemRows.innerHTML = "";
    addItem("", null, null);
    addItem("", null, null);
    exampleNote.style.display = "none";
    f.bizName.focus();
  });

  // ---------- print ----------
  printBtn.addEventListener("click", function () { window.print(); });

  // ---------- init ----------
  addItemBtn.addEventListener("click", function () { addItem(); });
  Object.keys(f).forEach(function (k) { if (f[k]) { f[k].addEventListener("input", render); f[k].addEventListener("change", render); } });

  // sensible defaults
  (function seed() {
    var today = new Date();
    var due = new Date(); due.setDate(due.getDate() + 14);
    // local calendar date (toISOString is UTC, which is already tomorrow on a US evening)
    function iso(d) { function p(n) { return (n < 10 ? "0" : "") + n; } return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
    f.invDate.value = iso(today);
    f.dueDate.value = iso(due);
    f.invNo.value = "INV-" + today.getFullYear() + "-001";
    addItem("", null, null);
    addItem("", null, null);
    render();
  })();

  // A form the browser restored is the user's invoice: never seed over it, but keep the note (and its Clear)
  // while any example value is still in it, so 8% / 10% never print unnoticed. Chrome puts restored values back
  // after load, just before pageshow (Firefox before DOMContentLoaded), so the example is decided on the first
  // pageshow; later pageshows (bfcache) only re-render.
  var seedChecked = false;
  window.addEventListener("pageshow", function () {
    if (!seedChecked) {
      seedChecked = true;
      var restored = ["bizName", "bizDetails", "clientName", "clientDetails", "taxRate", "discount", "shipping", "notes"].some(function (k) {
        return f[k].value !== f[k].defaultValue && f[k].value !== EXAMPLE[k];
      }) || readItems().some(function (it) { return it.desc.trim() || it.qty || it.rate; });
      if (!restored) {
        Object.keys(EXAMPLE).forEach(function (k) { f[k].value = EXAMPLE[k]; });
        itemRows.innerHTML = "";
        // filled by .value (not addItem's value attribute) so the rows' defaults stay blank and Chrome saves every typed value
        EXAMPLE_ITEMS.forEach(function (it) { addItem("", null, null); var ins = itemRows.lastChild.querySelectorAll("input"); ins[0].value = it[0]; ins[1].value = it[1]; ins[2].value = it[2]; });
      } else if (!Object.keys(EXAMPLE).some(function (k) { return f[k].value === EXAMPLE[k]; })) exampleNote.style.display = "none";
    }
    render();
  });
});
