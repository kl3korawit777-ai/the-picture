/* The Picture — home page full-width hero (optional module). Loaded before main.js on the home page.
   main.js calls  TP.hero.mount(host, posts, options)  from renderHome() with the articles it has already loaded
   (data/articles.json, published, newest first). Nothing is fetched here and no article page is opened:
   the reading time is "read_min" from articles.json.
   - slides: the featured articles first, then the newest, at most 5; only articles whose cover list has a real picture
     (type "image" with a file). Each slide uses the first such picture, cropped around its "focus"
   - desktop: a tab per article under the picture (01-05, title, progress line) and two round arrow buttons;
     mobile (<= 720px): 4:5 picture, dots and swipe instead
   - changes by itself every 6 s; paused on hover, keyboard focus, hidden tab, while off screen and with
     prefers-reduced-motion. Arrow keys work while the focus is inside; a drag never opens the link under it
   - mount() returns true when the hero is shown; false = main.js keeps the old featured article
   options = { base, link(post) -> <a>, cat(el, category), date(el, iso) } (helpers of main.js, so language and links follow the reader).
   No visible text is written here: it comes from data/i18n.json through the helpers main.js shares as window.TP. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var TP = window.TP = window.TP || {};
  var MAX = 5;
  var INTERVAL = 6000;                      /* keep in step with the 6s of tp-hero-fill in hero.css */
  var POSITION = { center: '50% 50%', top: '50% 0%', bottom: '50% 100%', left: '0% 50%', right: '100% 50%' };
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  /* strings that depend on the language are written again whenever main.js announces a language change */
  var updaters = [];
  document.addEventListener('tp:lang', function () { updaters.forEach(function (fn) { fn(); }); });
  function text(key, vars) { return TP.tr(TP.lang(), key, vars); }
  function localised(el, attr, key, vars) {
    var set = function () { el.setAttribute(attr, text(key, vars)); };
    set(); updaters.push(set);
  }
  function coverOf(p) {
    var list = Array.isArray(p.covers) ? p.covers : [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c && c.type === 'image' && String(c.src || '').trim()) return c;
    }
    return null;
  }
  /* the featured ones first, then the newest (articles.json is already newest first), only with a real cover picture */
  function choose(posts) {
    var withCover = (posts || []).filter(coverOf);
    return withCover.filter(function (p) { return p.featured === true; })
      .concat(withCover.filter(function (p) { return p.featured !== true; })).slice(0, MAX);
  }
  /* a title that never breaks inside a hyphenated word such as "Bio-Tech" (the word gets its own nowrap span).
     Written again on a language switch, so it is not a data-bi element (bi() would replace the span with plain text). */
  function titleText(el, p) {
    var set = function () {
      var en = TP.lang() === 'en' && !!p.title_en, s = en ? p.title_en : p.title;
      el.textContent = '';
      var re = /[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g, last = 0, m;
      while ((m = re.exec(s))) {
        if (m.index > last) el.appendChild(document.createTextNode(s.slice(last, m.index)));
        el.appendChild(mk('span', 'nw', m[0]));
        last = m.index + m[0].length;
      }
      if (last < s.length) el.appendChild(document.createTextNode(s.slice(last)));
      if (en) el.setAttribute('lang', 'en'); else el.removeAttribute('lang');
    };
    set(); updaters.push(set);
  }
  function picture(c, base, first) {
    var img = document.createElement('img'), src = String(c.src).trim();
    if (/^(https?:)?\/\//i.test(src)) {
      img.src = src;
    } else {
      var b = base + 'assets/img/covers/' + src.replace(/^.*\//, '').replace(/\.[A-Za-z0-9]+$/, '');
      img.src = b + '.webp';
      img.srcset = b + '-800.webp 800w, ' + b + '.webp 1600w';
    }
    img.sizes = '100vw';
    img.decoding = 'async';
    if (first) img.setAttribute('fetchpriority', 'high'); else img.loading = 'lazy';
    img.style.objectPosition = POSITION[c.focus] || POSITION.center;
    var alt = function () { img.alt = (TP.lang() === 'en' && c.alt_en) || c.alt || ''; };
    alt(); updaters.push(alt);
    return img;
  }
  function arrow(d) {
    var svg = document.createElementNS(NS, 'svg');
    [['width', '18'], ['height', '18'], ['viewBox', '0 0 24 24'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '2'],
     ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']].forEach(function (a) { svg.setAttribute(a[0], a[1]); });
    var path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); svg.appendChild(path);
    return svg;
  }

  function mount(host, posts, o) {
    var track = host && host.querySelector('.hero-track');
    var list = choose(posts);
    if (!track || !list.length || !TP.tr || !TP.bi) return false;
    o = o || {};
    var base = o.base || '';
    var slides = [], dots = [], tabs = [], idx = 0, timer = null, paused = false, inView = true;

    host.removeAttribute('aria-hidden');
    host.setAttribute('aria-roledescription', 'carousel');
    localised(host, 'aria-label', 'hero.label');

    var dotsWrap = mk('div', 'hero-dots');
    dotsWrap.setAttribute('role', 'group'); localised(dotsWrap, 'aria-label', 'hero.pick');

    list.forEach(function (p, i) {
      var c = coverOf(p);
      var s = mk('article', 'hero-slide');
      s.setAttribute('aria-roledescription', 'slide');
      localised(s, 'aria-label', 'cover.slide', { n: i + 1, total: list.length });
      s.appendChild(picture(c, base, i === 0));

      var copy = mk('div', 'hero-copy');
      var cat = mk('span', 'hero-cat');
      if (o.cat) o.cat(cat, p.category); else cat.textContent = p.category;
      copy.appendChild(cat);
      var h = mk(i === 0 ? 'h1' : 'h2', 'hero-title');
      var a = o.link ? o.link(p) : mk('a'); if (!a.getAttribute('href')) a.href = base + 'articles/' + p.slug + '.html';
      titleText(a, p); h.appendChild(a); copy.appendChild(h);
      var meta = mk('div', 'hero-meta');
      var when = mk('time');
      if (o.date && o.date(when, p.date)) { when.setAttribute('datetime', p.date); meta.appendChild(when); }
      if (p.read_min > 0) {
        if (meta.firstChild) { var bar = mk('span', 'bar'); bar.setAttribute('aria-hidden', 'true'); meta.appendChild(bar); }
        meta.appendChild(TP.bk(mk('span', 'read'), 'art.readTime', { n: p.read_min }));
      }
      if (meta.firstChild) copy.appendChild(meta);
      s.appendChild(copy);

      var credit = String(c.credit || '').trim();
      if (credit) {
        var cr = mk('span', 'hero-credit');
        var setCr = function () { cr.textContent = text('cover.credit', { credit: (TP.lang() === 'en' && c.credit_en) || credit }); };
        setCr(); updaters.push(setCr);
        s.appendChild(cr);
      }
      track.appendChild(s); slides.push(s);

      if (list.length > 1) {
        var d = mk('button'); d.type = 'button';
        localised(d, 'aria-label', 'cover.dot', { n: i + 1 });
        d.appendChild(mk('span'));
        d.addEventListener('click', function () { go(i); restart(); });
        dotsWrap.appendChild(d); dots.push(d);
      }
    });

    if (list.length > 1) {
      host.appendChild(dotsWrap);
      /* desktop: a tab per article with its title and a progress line, plus previous / next arrows */
      host.classList.add('has-bar');
      var barEl = mk('div', 'hero-bar');
      var tabWrap = mk('div', 'hero-tabs'); tabWrap.setAttribute('role', 'group'); localised(tabWrap, 'aria-label', 'hero.pick');
      list.forEach(function (p, i) {
        var t = mk('button', 'hero-tab'); t.type = 'button';
        t.appendChild(mk('span', 'fill'));
        var n = mk('span', 'n', (i < 9 ? '0' : '') + (i + 1)); n.setAttribute('aria-hidden', 'true'); t.appendChild(n);
        var tt = mk('span', 't'); titleText(tt, p); t.appendChild(tt);
        t.addEventListener('click', function () { go(i); restart(); });
        tabWrap.appendChild(t); tabs.push(t);
      });
      barEl.appendChild(tabWrap);
      var arrows = mk('div', 'hero-arrows');
      [['hero.prev', 'M15 6l-6 6 6 6', -1], ['hero.next', 'M9 6l6 6-6 6', 1]].forEach(function (d) {
        var b = mk('button', 'hero-arrow'); b.type = 'button';
        localised(b, 'aria-label', d[0]);
        b.appendChild(arrow(d[1]));
        b.addEventListener('click', function () { go(idx + d[2]); restart(); });
        arrows.appendChild(b);
      });
      barEl.appendChild(arrows);
      host.appendChild(barEl);
    }

    function go(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        var on = i === idx;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        s.querySelectorAll('a').forEach(function (a) { a.tabIndex = on ? 0 : -1; });
        if (on) { var im = s.querySelector('img'); if (im && im.loading === 'lazy') im.loading = 'eager'; }
      });
      dots.forEach(function (d, i) { d.setAttribute('aria-current', String(i === idx)); });
      tabs.forEach(function (t, i) { t.setAttribute('aria-current', String(i === idx)); });
      kick();
    }
    /* start the progress line again on the current tab */
    function kick() {
      var f = tabs[idx] && tabs[idx].querySelector('.fill');
      if (!f) return;
      f.style.animation = 'none'; void f.offsetWidth; f.style.animation = '';
    }
    function restart() {
      clearInterval(timer); timer = null;
      host.classList.remove('is-playing');
      host.setAttribute('aria-live', 'polite');
      if (slides.length < 2 || reduced() || paused || !inView || document.hidden) return;
      host.classList.add('is-playing'); kick();
      host.setAttribute('aria-live', 'off');         /* do not announce slides that change by themselves */
      timer = setInterval(function () { go(idx + 1); }, INTERVAL);
    }
    host.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { paused = true; restart(); } });
    host.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { paused = false; restart(); } });
    host.addEventListener('focusin', function (e) {      /* keyboard focus only: a mouse click on a tab must not stop it for good */
      var kb = true; try { kb = e.target.matches(':focus-visible'); } catch (err) { kb = true; }
      if (kb) { paused = true; restart(); }
    });
    host.addEventListener('focusout', function (e) { if (!host.contains(e.relatedTarget)) { paused = false; restart(); } });
    host.addEventListener('keydown', function (e) {
      if (slides.length < 2) return;
      if (e.key === 'ArrowRight') { go(idx + 1); restart(); }
      else if (e.key === 'ArrowLeft') { go(idx - 1); restart(); }
    });
    /* swipe / drag; a drag must never open the link under the finger or mouse */
    var sx = null, moved = false;
    host.addEventListener('pointerdown', function (e) { if (e.button > 0) return; sx = e.clientX; moved = false; });
    host.addEventListener('pointermove', function (e) { if (sx !== null && Math.abs(e.clientX - sx) > 10) moved = true; });
    host.addEventListener('pointercancel', function () { sx = null; });
    host.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (slides.length > 1 && Math.abs(dx) > 50) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
    });
    host.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    host.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('visibilitychange', restart);
    if (mq && mq.addEventListener) mq.addEventListener('change', restart);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; restart(); }).observe(host);
    go(0); restart();
    return true;
  }

  TP.hero = { mount: mount };
})();
