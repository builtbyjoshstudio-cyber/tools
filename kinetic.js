/* =========================================================
   TYNKR KINETIC — shared behavior for tools.builtbyjoshstudio.com
   · Unified 3-mode theme switch (Light / Mist / Dark)
   · Circular View-Transition "wipe" on theme change
   · Injected top marquee (brand signature)
   · Scroll-reveal for content panels
   · Respects prefers-reduced-motion
   Load once per page:  <script src="../kinetic.js"></script>
   ========================================================= */
(function () {
  var doc = document, root = doc.documentElement;
  root.classList.add('kx-js');
  var ORDER = ['light', 'mist', 'dark'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- restore saved theme (back-compatible across old keys) ---- */
  function savedTheme() {
    try {
      var s = localStorage.getItem('themePref') ||
              localStorage.getItem('tynkr-theme') ||
              localStorage.getItem('tynkr-kinetic-theme');
      if (s && ORDER.indexOf(s) > -1) return s;
    } catch (e) {}
    var cur = root.getAttribute('data-theme');
    return ORDER.indexOf(cur) > -1 ? cur : 'dark';
  }

  function syncButtons(theme) {
    // .theme-switch / generic [data-set-theme]
    doc.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-set-theme') === theme);
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

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('themePref', theme);
      localStorage.setItem('tynkr-theme', theme);
      localStorage.setItem('tynkr-kinetic-theme', theme);
    } catch (e) {}
    syncButtons(theme);
  }

  function setTheme(theme, evt) {
    if (ORDER.indexOf(theme) < 0) return;
    if (!doc.startViewTransition || reduce) { applyTheme(theme); return; }
    var x = evt ? evt.clientX : innerWidth / 2;
    var y = evt ? evt.clientY : 40;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = doc.startViewTransition(function () { applyTheme(theme); });
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
        var cur = root.getAttribute('data-theme') || 'dark';
        var next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
        setTheme(next, e);
      });
    }
  }

  /* ---- top marquee (brand signature) ---- */
  function marqueeChunk() {
    return '<span><span class="kx-signal"><i></i><i></i><i></i><i></i></span>' +
      'Tynkr Tools &amp; Co<span class="kx-dot"></span>' +
      'Free <b>·</b> Ad-free <b>·</b> Local-first<span class="kx-dot"></span>' +
      'Kitchen calculators<span class="kx-dot"></span>' +
      'Runs in your browser<span class="kx-dot"></span>' +
      'No signup<span class="kx-dot"></span>' +
      'Light <b>/</b> Mist <b>/</b> Dark<span class="kx-dot"></span></span>';
  }
  function injectMarquee() {
    if (doc.querySelector('.kx-marquee')) return;
    var bar = doc.createElement('div');
    bar.className = 'kx-marquee';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<div class="kx-track">' + marqueeChunk() + marqueeChunk() + '</div>';
    doc.body.insertBefore(bar, doc.body.firstChild);
  }

  /* ---- scroll reveal (bulletproof: content can never stay hidden) ---- */
  function setupReveal() {
    var nodes = [];
    doc.querySelectorAll('.card, .glass:not(.hero), .glass-panel:not(.hero)').forEach(function (el) {
      if (el.closest('aside')) return;            // leave sticky sidebar alone
      el.classList.add('kx-reveal');
      nodes.push(el);
    });
    function reveal(el) { el.classList.add('kx-in'); }
    if (reduce || !('IntersectionObserver' in window)) {
      nodes.forEach(reveal);
      return;
    }
    var vh = window.innerHeight || 800;
    // anything already in (or near) the first viewport shows right away
    nodes.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 1.15) reveal(el);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          en.target.style.transitionDelay = Math.min(i * 55, 220) + 'ms';
          reveal(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach(function (el) { if (!el.classList.contains('kx-in')) io.observe(el); });
    // failsafe — if the observer never fires, reveal everything anyway
    setTimeout(function () { nodes.forEach(function (el) { if (!el.classList.contains('kx-in')) reveal(el); }); }, 1400);
  }

  function init() {
    injectMarquee();
    applyTheme(savedTheme());
    wire();
    setupReveal();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
