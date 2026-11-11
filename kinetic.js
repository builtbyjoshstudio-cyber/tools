/* =========================================================
   Shared behavior for tools.builtbyjoshstudio.com
   · Theme switch (Light / Dark); the site opens light
   · Circular View-Transition "wipe" on theme change
   · Service-worker registration
   · Respects prefers-reduced-motion
   Load once per page:  <script src="../kinetic.js"></script>
   ========================================================= */
(function () {
  var doc = document, root = doc.documentElement;
  var ORDER = ['light', 'dark'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- restore saved theme (back-compatible across old keys) ---- */
  function savedTheme() {
    try {
      var s = localStorage.getItem('themePref') ||
              localStorage.getItem('tynkr-theme') ||
              localStorage.getItem('tynkr-kinetic-theme');
      if (s === 'mist') return 'light';           // Mist was retired with the Kinetic skin
      if (s && ORDER.indexOf(s) > -1) return s;
    } catch (e) {}
    var cur = root.getAttribute('data-theme');
    return ORDER.indexOf(cur) > -1 ? cur : 'light';
  }

  function syncButtons(theme) {
    // .theme-switch / generic [data-set-theme]
    doc.querySelectorAll('[data-set-theme]').forEach(function (b) {
      var on = b.getAttribute('data-set-theme') === theme;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    // .modes style [data-m]
    doc.querySelectorAll('[data-m]').forEach(function (b) {
      var on = b.getAttribute('data-m') === theme;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    // legacy single cycling button
    var single = doc.getElementById('theme-toggle');
    if (single && !single.hasAttribute('data-set-theme')) {
      single.textContent = 'Theme: ' + theme.charAt(0).toUpperCase() + theme.slice(1);
    }
  }

  // save = true only when the visitor picked the theme; the default is never written
  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    if (save) {
      try {
        localStorage.setItem('themePref', theme);
        localStorage.setItem('tynkr-theme', theme);
        localStorage.setItem('tynkr-kinetic-theme', theme);
      } catch (e) {}
    }
    syncButtons(theme);
  }

  function setTheme(theme, evt) {
    if (ORDER.indexOf(theme) < 0) return;
    if (!doc.startViewTransition || reduce) { applyTheme(theme, true); return; }
    var x = evt ? evt.clientX : innerWidth / 2;
    var y = evt ? evt.clientY : 40;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = doc.startViewTransition(function () { applyTheme(theme, true); });
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
    vt.finished.catch(function () {});
  }

  /* ---- wire up controls ---- */
  function wire() {
    doc.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.addEventListener('click', function (e) { setTheme(b.getAttribute('data-set-theme'), e); });
    });
    doc.querySelectorAll('[data-m]').forEach(function (b) {
      b.addEventListener('click', function (e) { setTheme(b.getAttribute('data-m'), e); });
    });
    var single = doc.getElementById('theme-toggle');
    if (single && !single.hasAttribute('data-set-theme')) {
      single.addEventListener('click', function (e) {
        var cur = root.getAttribute('data-theme') || 'light';
        var next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
        setTheme(next, e);
      });
    }
  }

  /* ---- service worker (offline support; secure contexts only) ---- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var h = location.hostname;
    var local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    if (location.protocol !== 'https:' && !local) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(function () {});
  }

  function init() {
    applyTheme(savedTheme(), false);
    wire();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  // register after load so the SW never competes with first-paint assets
  if (doc.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
})();
