/* The Picture — interactive layer (optional). Loaded after main.js on every page.
   Header that hides while reading, reveal on scroll, card light, filter pop, search shortcuts, back to top.
   - Independent of main.js: it only looks at the DOM, so the site works the same without this file.
   - Anything that moves is switched off when the visitor prefers reduced motion; keyboard features always work.
   - No visible text lives here: the back-to-top label comes from data/i18n.json through the button's data-i18n-aria. */
(function () {
  var root = document.documentElement;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }

  var header = document.querySelector('.site-header');
  var nav = document.querySelector('.main-nav');
  var toTop = document.querySelector('.to-top');
  var main = document.getElementById('main');

  /* ---------- scroll: header shadow / hide, back-to-top ring (one rAF-throttled listener) ---------- */
  var lastY = window.pageYOffset, ticking = false;
  var ring = toTop && toTop.querySelector('.ring');
  var CIRC = 2 * Math.PI * 21;                               /* circumference of the ring in the SVG */
  if (ring) ring.style.strokeDasharray = String(CIRC);

  function update() {
    ticking = false;
    var y = window.pageYOffset;

    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      var navOpen = nav && nav.classList.contains('is-open');
      var focusInside = header.contains(document.activeElement);
      if (reduced() || y < 200 || navOpen || focusInside) {
        header.classList.remove('is-hidden');
        lastY = y;
      } else if (y > lastY + 6) { header.classList.add('is-hidden'); lastY = y; }
      else if (y < lastY - 6) { header.classList.remove('is-hidden'); lastY = y; }
    }

    if (toTop) {
      var max = root.scrollHeight - window.innerHeight;
      if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - (max > 0 ? Math.min(1, y / max) : 0)));
      toTop.hidden = y < 600;
    }
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (header) {
    /* keyboard: tabbing into a hidden header brings it back */
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', onScroll);
  }
  update();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      /* the button disappears at the top, so move keyboard focus to the start of the page content */
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    });
  }

  /* ---------- reveal: things below the first screen fade up as they scroll in ---------- */
  var REVEAL = '.band, .section-head, .section-title, .proj-card, .exp-card, .work-card, .cat-card, .stats-row .stat, .award-list li, .path li, ' +
    '.interest-list, .tool-grid > div, .mech, .cert-grid > *, .prose > h2, .prose > h3, .table-wrap, .figure, .duo > *, .related h2, .related-card, .post-nav a';
  var rio = null;

  function prepare(el) {
    if (el.__tpRv) return;
    el.__tpRv = true;                                          /* each element is looked at once */
    if (el.hidden || el.closest('[hidden]')) return;           /* not on screen right now (e.g. filtered out) */
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;   /* first screen, or already above it: show now, never hide */
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty('--d', (i % 4) * 70 + 'ms');
    el.classList.add('reveal-pre');
    rio.observe(el);
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches(REVEAL)) prepare(node);
    Array.prototype.forEach.call(node.querySelectorAll(REVEAL), prepare);
  }
  if (!reduced() && 'IntersectionObserver' in window && 'MutationObserver' in window) {
    rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        rio.unobserve(el);
        el.classList.remove('reveal-pre');
        el.classList.add('reveal-in');
        el.addEventListener('animationend', function () { el.classList.remove('reveal-in'); el.style.removeProperty('--d'); }, { once: true });
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    scan(document.body);
    /* cards and lists are built by main.js after the data files arrive: pick them up as they are added */
    var pending = [], queued = false;
    new MutationObserver(function (records) {
      records.forEach(function (r) { Array.prototype.forEach.call(r.addedNodes, function (n) { pending.push(n); }); });
      if (!queued && pending.length) {
        queued = true;
        window.requestAnimationFrame(function () { queued = false; var list = pending; pending = []; list.forEach(scan); });
      }
    }).observe(main || document.body, { childList: true, subtree: true });
  }

  /* ---------- filter results pop in when they come back (items toggled from hidden to visible) ---------- */
  if (!reduced() && 'MutationObserver' in window) {
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        var el = r.target;
        if (r.oldValue === null || el.hidden || !el.hasAttribute('data-cat')) return;   /* only hidden -> shown, only filterable items */
        el.classList.remove('pop');
        void el.offsetWidth;                                                              /* restart the animation if it is already running */
        el.classList.add('pop');
        el.addEventListener('animationend', function () { el.classList.remove('pop'); }, { once: true });
      });
    }).observe(document.body, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true, subtree: true });
  }

  /* ---------- cards: the light follows the mouse (one delegated listener, so cards added later work too) ---------- */
  var CARD = '.proj-card, .work-card, .cat-card, .exp-card';
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || reduced()) return;
    var c = e.target.closest && e.target.closest(CARD);
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- search: "/" or Ctrl/Cmd+K opens it, arrow keys walk through the results ---------- */
  var openBtns = document.querySelectorAll('[data-search-open]');
  var layer = document.querySelector('.search-layer');
  openBtns.forEach(function (b) { b.setAttribute('aria-keyshortcuts', '/ Control+K Meta+K'); });

  document.addEventListener('keydown', function (e) {
    if (!layer || !openBtns.length || e.isComposing) return;
    var el = e.target, tag = (el.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    var combo = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.code === 'KeyK' || (e.key || '').toLowerCase() === 'k');
    /* e.code as well as e.key: on a Thai keyboard layout the "/" key does not produce "/" */
    var slash = (e.key === '/' || e.code === 'Slash') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !typing;
    if (!combo && !slash) return;
    if (root.classList.contains('has-lightbox')) return;          /* a picture is open full screen */
    e.preventDefault();
    if (layer.hidden) openBtns[0].click();
  });

  if (layer) {
    layer.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var links = Array.prototype.slice.call(layer.querySelectorAll('.search-results a'));
      var input = layer.querySelector('input');
      if (!links.length) return;
      e.preventDefault();
      var i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') (links[i + 1] || links[0]).focus();
      else if (i <= 0) input.focus();
      else links[i - 1].focus();
    });
  }
})();
