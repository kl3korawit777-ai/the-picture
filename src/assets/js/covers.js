/* The Picture — article cover slider (optional module). Loaded before main.js on the home page and on article pages.
   main.js calls  TP.covers.mount(host, covers, options)  with the "covers" list of an article from data/articles.json.
   Each cover is  { type: "helix" | "fold" | "image", src, alt, caption, credit }  (+ optional caption_en, credit_en, alt_en).
   - helix: a DNA helix that turns by itself and follows the mouse; it stops while it is off screen or not the current slide
   - fold:  an illustrative protein chain drawn part by part, coloured by AlphaFold's pLDDT confidence scale
   - image: a real picture (lazy loaded, with alt); an empty src shows the [ ] placeholder
   One cover = a still picture (no arrows, dots or autoplay). Several = a slider: arrows, dots, swipe, arrow keys,
   autoplay every 5 s with a progress bar (paused on hover, focus, hidden tab and while off screen).
   No visible text is written here: labels come from data/i18n.json through the helpers main.js shares as window.TP.
   If this file is missing, main.js shows the plain helix picture instead. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var TP = window.TP = window.TP || {};
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }
  var AUTOPLAY_MS = 5000;

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  /* strings that depend on the language are looked up again whenever main.js announces a language change */
  var updaters = [];
  document.addEventListener('tp:lang', function () { updaters.forEach(function (fn) { fn(); }); });
  function text(key, vars) { return TP.tr(TP.lang(), key, vars); }
  function localised(el, attr, key, vars) {
    var set = function () { el.setAttribute(attr, text(key, vars)); };
    set(); updaters.push(set);
  }

  function normalise(covers) {
    var list = (Array.isArray(covers) ? covers : []).filter(function (c) { return c && (c.type === 'helix' || c.type === 'fold' || c.type === 'image'); });
    return list.length ? list : [{ type: 'helix' }];
  }

  /* ---------- helix ---------- */
  function buildHelix(slide, host, W, H) {
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
    host.appendChild(svg);
    var cy = H / 2, A = H * 0.24, k = (Math.PI * 2) / (W / 2);
    var g = svgEl('g', {}), rungs = [], N = Math.round(W / 24);
    for (var i = 0; i < N; i++) {
      var l = svgEl('line', { 'class': i % 2 ? 'rung-a' : 'rung-b', 'stroke-width': '3', 'stroke-linecap': 'round' });
      g.appendChild(l);
      rungs.push({ el: l, x: (i + 0.5) * W / N });
    }
    var a = svgEl('path', { 'class': 'strand-a', fill: 'none', 'stroke-width': W > 700 ? '7' : '6', 'stroke-linecap': 'round' });
    var b = svgEl('path', { 'class': 'strand-b', fill: 'none', 'stroke-width': W > 700 ? '7' : '6', 'stroke-linecap': 'round' });
    svg.appendChild(g); svg.appendChild(b); svg.appendChild(a);

    var phase = 0, off = 0, offTarget = 0, last = null, running = false, inView = true, slideActive = true, rafId = 0;
    function draw() {
      var p = phase + off, d1 = '', d2 = '';
      for (var x = 0; x <= W; x += 6) {
        var s = Math.sin(k * x + p);
        d1 += (x ? 'L' : 'M') + x + ' ' + (cy + A * s).toFixed(1);
        d2 += (x ? 'L' : 'M') + x + ' ' + (cy - A * s).toFixed(1);
      }
      a.setAttribute('d', d1); b.setAttribute('d', d2);
      rungs.forEach(function (r) {
        var s = Math.sin(k * r.x + p), c = Math.cos(k * r.x + p);
        r.el.setAttribute('x1', r.x); r.el.setAttribute('x2', r.x);
        r.el.setAttribute('y1', (cy + A * s).toFixed(1)); r.el.setAttribute('y2', (cy - A * s).toFixed(1));
        r.el.style.opacity = (0.3 + 0.7 * (c + 1) / 2).toFixed(2);
      });
    }
    function frame(t) {
      if (last !== null) phase += (t - last) * 0.0007;
      last = t;
      off += (offTarget - off) * 0.06;
      draw();
      if (running) rafId = window.requestAnimationFrame(frame);
    }
    draw();
    if (reduced()) return;                                       /* a still helix for people who asked for less motion */
    function shouldRun() { return inView && slideActive && !document.hidden; }
    function sync() {
      if (shouldRun() && !running) { running = true; last = null; rafId = window.requestAnimationFrame(frame); }
      else if (!shouldRun() && running) { running = false; window.cancelAnimationFrame(rafId); }
    }
    host.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = host.getBoundingClientRect();
      offTarget = ((e.clientX - r.left) / r.width - 0.5) * Math.PI * 1.5;
    });
    host.addEventListener('pointerleave', function () { offTarget = 0; });
    slide.addEventListener('tp-slide', function (e) { slideActive = e.detail; sync(); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }).observe(host);   /* stops when scrolled off screen */
    }
    sync();
  }

  /* ---------- protein fold, coloured by pLDDT ---------- */
  function buildFold(host, W, H) {
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    host.appendChild(svg);
    var cx = W * 0.5, cy = H * 0.54, s = Math.min(W, H), N = 300, pts = [];
    var helices = [[0.12, 0.24], [0.36, 0.5], [0.62, 0.76]];
    for (var i = 0; i <= N; i++) {
      var t = i / N, a = t * Math.PI * 2 * 0.92;
      pts.push([cx + s * 0.44 * Math.sin(a + 0.4) + s * 0.16 * Math.cos(a * 3), cy + s * 0.27 * Math.sin(a * 2) + s * 0.1 * Math.sin(a * 5 + 1.2), t]);
    }
    var out = pts.map(function (p, i) {                          /* the helix parts coil along the chain */
      var inHelix = helices.some(function (h) { return p[2] >= h[0] && p[2] <= h[1]; });
      if (!inHelix || i === 0 || i === N) return [p[0], p[1], p[2], inHelix];
      var dx = pts[i + 1][0] - pts[i - 1][0], dy = pts[i + 1][1] - pts[i - 1][1], len = Math.hypot(dx, dy) || 1;
      var amp = s * 0.04 * Math.sin(i * 0.95);
      return [p[0] - dy / len * amp, p[1] + dx / len * amp, p[2], true];
    });
    function colour(t, helix) {                                  /* tokens in style.css :root: --plddt-* */
      if (t < 0.025 || t > 0.9) return 'var(--plddt-very-low)';
      if (t < 0.07 || t > 0.85) return 'var(--plddt-low)';
      return helix ? 'var(--plddt-very-high)' : 'var(--plddt-confident)';
    }
    function pt(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }
    var start = 0, runNo = 0;
    while (start < N) {                                          /* short runs of one colour, each fades in after the previous one */
      var col = colour(out[start][2], out[start][3]), end = start + 1;
      while (end < N && end - start < 14 && colour(out[end][2], out[end][3]) === col) end++;
      var g = svgEl('g', { 'class': 'seg' });
      g.style.transitionDelay = (runNo * 45) + 'ms';
      var halo = [], line = [];
      for (var q = start; q <= end; q++) { line.push(pt(out[q])); if (q > start) halo.push(pt(out[q])); }
      var o = svgEl('polyline', { points: halo.join(' '), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'class': 'seg-o', 'stroke-width': '14' });
      var c = svgEl('polyline', { points: line.join(' '), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '7' });
      c.style.stroke = col;
      g.appendChild(o); g.appendChild(c); svg.appendChild(g);
      start = end; runNo++;
    }
    /* colour legend */
    var legend = mk('span', 'fold-legend');
    legend.appendChild(TP.bk(mk('b'), 'fold.title'));
    [['vh', '>90', 'fold.veryHigh'], ['c', '70–90', 'fold.confident'], ['l', '50–70', 'fold.low'], ['vl', '<50', 'fold.veryLow']].forEach(function (row) {
      var item = mk('span', 'lg-item');
      item.appendChild(mk('i', 'lg-' + row[0]));
      item.appendChild(document.createTextNode(row[1] + ' '));
      item.appendChild(TP.bk(mk('span', 'lg-word'), row[2]));
      legend.appendChild(item);
    });
    host.appendChild(legend);
  }

  /* ---------- image ---------- */
  function resolveSrc(src) {
    src = String(src || '').trim();
    if (!src || /^(javascript|data|vbscript):/i.test(src)) return '';
    var base = root.getAttribute('data-base') || '';
    if (/^(https?:)?\/\//i.test(src)) return src;
    return base + (src.indexOf('/') === -1 ? 'assets/img/covers/' + src : src.replace(/^\//, ''));
  }
  function placeholder() { return TP.bk(mk('div', 'ph'), 'cover.placeholder'); }
  function buildImage(c, first, host) {
    var src = resolveSrc(c.src);
    if (!src) { host.appendChild(placeholder()); return; }       /* no file yet: the [ ] slot */
    var im = mk('img');
    im.decoding = 'async';
    im.draggable = false;
    im.loading = first ? 'eager' : 'lazy';                       /* the first picture is what you see on arrival: never lazy */
    var alt = function () { im.alt = (TP.lang() === 'en' && (c.alt_en || c.caption_en)) || c.alt || c.caption || ''; };
    alt(); updaters.push(alt);
    im.onerror = function () {                                   /* wrong file name: back to the placeholder instead of a broken picture */
      if (window.console) console.warn('Cover image not found: ' + src);
      host.textContent = ''; host.appendChild(placeholder());
    };
    if (/assets\/img\/(covers|gallery)\/[^\/]+\.webp$/.test(src)) {      /* a built picture: name.webp (1600 px) and name-800.webp */
      im.srcset = src.replace(/\.webp$/, '-800.webp') + ' 800w, ' + src + ' 1600w';
      im.sizes = '(max-width: 900px) 100vw, 900px';
    }
    im.src = src;
    host.appendChild(im);
  }

  /* ---------- mount ---------- */
  /* options: wide (21:9 instead of 16:9), portrait (4:5, the portfolio picture frame), link() -> <a> that wraps each slide (home page), captionEl -> <figcaption> to keep in step */
  function mount(host, covers, options) {
    options = options || {};
    var list = normalise(covers), multi = list.length > 1;
    var W = options.wide ? 900 : 600, H = options.wide ? 386 : 338;
    host.textContent = '';
    host.className = 'slider' + (options.wide ? ' wide' : '') + (options.portrait ? ' portrait' : '') + (multi ? '' : ' single');
    if (multi) {
      host.setAttribute('role', 'group');
      host.setAttribute('aria-roledescription', 'carousel');
      localised(host, 'aria-label', 'cover.label');
    }

    var slides = list.map(function (c, i) {
      var slide = mk('div', 'slide');
      var box = mk('div', c.type === 'image' ? 'cover-image' : c.type);   /* "helix" / "fold" / "cover-image" */
      if (c.type === 'helix') buildHelix(slide, box, W, H);
      else if (c.type === 'fold') buildFold(box, W, H);
      else buildImage(c, i === 0, box);
      var link = options.link ? options.link() : null;
      if (link) { link.classList.add('slide-link'); link.setAttribute('draggable', 'false'); link.appendChild(box); slide.appendChild(link); }
      else slide.appendChild(box);
      if (multi) {
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
        localised(slide, 'aria-label', 'cover.slide', { n: i + 1, total: list.length });
      }
      host.appendChild(slide);
      return slide;
    });

    /* caption and credit under the picture follow the current slide */
    function showCaption(i) {
      var el = options.captionEl;
      if (!el) return;
      var c = list[i];
      el.textContent = '';
      if (c.caption) el.appendChild(TP.bi(mk('span'), c.caption, c.caption_en || ''));
      if (c.credit) {
        var cr = mk('span', 'credit');
        TP.bi(cr, TP.tr('th', 'cover.credit', { credit: c.credit }), TP.tr('en', 'cover.credit', { credit: c.credit_en || c.credit }));
        el.appendChild(cr);
      }
      el.hidden = !el.firstChild;
    }

    if (!multi) {                                                /* a single cover is a still picture: no controls */
      slides[0].classList.add('is-active');
      showCaption(0);
      return;
    }

    /* ----- controls ----- */
    function arrow(dir, d) {
      var b = mk('button', 'slider-btn ' + dir); b.type = 'button';
      localised(b, 'aria-label', dir === 'prev' ? 'cover.prev' : 'cover.next');
      b.appendChild(svgEl('svg', { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })).appendChild(svgEl('path', { d: d }));
      return b;
    }
    var prev = arrow('prev', 'M15 6l-6 6 6 6'), next = arrow('next', 'M9 6l6 6-6 6');
    var dotsWrap = mk('div', 'slider-dots'), prog = mk('div', 'slider-progress'); prog.setAttribute('aria-hidden', 'true');
    host.appendChild(prev); host.appendChild(next); host.appendChild(dotsWrap); host.appendChild(prog);
    var dots = list.map(function (c, i) {
      var b = mk('button'); b.type = 'button';
      localised(b, 'aria-label', 'cover.dot', { n: i + 1 });
      b.appendChild(mk('span'));
      b.addEventListener('click', function () { go(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    var idx = 0, timer = null, hover = false, focused = false, inView = true;
    function go(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        var on = i === idx;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        Array.prototype.forEach.call(s.querySelectorAll('a, button'), function (el) { el.tabIndex = on ? 0 : -1; });   /* hidden slides are not tab stops */
        s.dispatchEvent(new CustomEvent('tp-slide', { detail: on }));
      });
      dots.forEach(function (d, i) { d.setAttribute('aria-current', String(i === idx)); });
      showCaption(idx);
    }
    function playing() { return !reduced() && !hover && !focused && !document.hidden && inView; }
    function kick() { prog.classList.remove('run'); void prog.offsetWidth; prog.classList.add('run'); }
    function restart() {
      clearInterval(timer); timer = null;
      prog.classList.remove('run');
      host.setAttribute('aria-live', playing() ? 'off' : 'polite');   /* do not announce slides that change by themselves */
      if (!playing()) return;
      timer = setInterval(function () { go(idx + 1); kick(); }, AUTOPLAY_MS);
      kick();
    }
    prev.addEventListener('click', function () { go(idx - 1); restart(); });
    next.addEventListener('click', function () { go(idx + 1); restart(); });
    host.addEventListener('mouseenter', function () { hover = true; restart(); });
    host.addEventListener('mouseleave', function () { hover = false; restart(); });
    host.addEventListener('focusin', function () { focused = true; restart(); });
    host.addEventListener('focusout', function (e) { if (!host.contains(e.relatedTarget)) { focused = false; restart(); } });
    document.addEventListener('visibilitychange', restart);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; restart(); }).observe(host);
    }
    host.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(idx - 1); restart(); }
      else if (e.key === 'ArrowRight') { go(idx + 1); restart(); }
    });

    /* swipe / drag. A drag must never open the link under the pointer: after a real move the next click is swallowed. */
    var sx = null, moved = false;
    host.addEventListener('pointerdown', function (e) {
      moved = false;
      if (e.button > 0 || (e.target.closest && e.target.closest('.slider-btn, .slider-dots'))) { sx = null; return; }
      sx = e.clientX;
    });
    host.addEventListener('pointermove', function (e) { if (sx !== null && Math.abs(e.clientX - sx) > 10) moved = true; });
    host.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
    });
    host.addEventListener('pointercancel', function () { sx = null; });
    host.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    host.addEventListener('dragstart', function (e) { e.preventDefault(); });
    if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', restart);

    go(0);
    restart();
  }

  TP.covers = { mount: mount };
})();
