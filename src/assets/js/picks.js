/* The Picture — home page "Editor's picks" strip (optional module). Loaded before main.js on the home page.
   main.js calls  TP.picks.mount(section, posts, options)  from renderHome() with the articles it has already loaded
   (data/articles.json, published, newest first). Nothing is fetched here.
   - order: by the "pick" field (1-10) when at least one article has it (only those articles), otherwise the newest first; at most 10 cards
   - the strip is shown from 2 articles; mount() returns false when there are fewer (main.js then hides the section)
   - a card: picture 3:4 (first real cover, cropped around its "focus"; a dark block when the article has none), the black rank tab
     at the bottom left of the picture, the category and the title. The whole card is one link to the article
   - scrolling is the browser's own scroll-snap (no library). Desktop: round arrow buttons at the middle of the pictures, hidden at either end;
     mobile (<= 720px): cards 78% wide so the edge of the next one shows, swipe with a finger
   options = { base, link(post) -> <a>, cat(el, category), title(el, post) } (helpers of main.js: language and links follow the reader).
   No visible text is written here: the heading and the buttons are in index.html with data-i18n / data-i18n-aria. */
(function () {
  var TP = window.TP = window.TP || {};
  var MAX = 10;
  var POSITION = { center: '50% 50%', top: '50% 0%', bottom: '50% 100%', left: '0% 50%', right: '100% 50%' };
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function coverOf(p) {
    var list = Array.isArray(p.covers) ? p.covers : [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c && c.type === 'image' && String(c.src || '').trim()) return c;
    }
    return null;
  }
  /* by "pick" when any article has one (only those), else the newest first */
  function choose(posts) {
    var list = (posts || []).slice();
    var picked = list.filter(function (p) { return typeof p.pick === 'number' && p.pick >= 1; });
    if (picked.length) return picked.sort(function (a, b) { return a.pick - b.pick; }).slice(0, MAX);
    return list.slice(0, MAX);
  }
  function picture(c, base) {
    var img = document.createElement('img'), src = String(c.src).trim();
    if (/^(https?:)?\/\//i.test(src)) {
      img.src = src;
    } else {
      var b = base + 'assets/img/covers/' + src.replace(/^.*\//, '').replace(/\.[A-Za-z0-9]+$/, '');
      img.src = b + '.webp';
      img.srcset = b + '-800.webp 800w, ' + b + '.webp 1600w';
    }
    img.sizes = '(max-width: 720px) 78vw, 380px';
    img.alt = '';                                  /* the title next to it names the article */
    img.loading = 'lazy'; img.decoding = 'async';
    img.style.objectPosition = POSITION[c.focus] || POSITION.center;
    return img;
  }

  function mount(section, posts, o) {
    var track = section && section.querySelector('.picks-track');
    var list = choose(posts);
    if (!track || list.length < 2 || !TP.bi) return false;
    o = o || {};
    var base = o.base || '';
    track.textContent = '';

    list.forEach(function (p, i) {
      var li = mk('li', 'pick');
      var a = o.link ? o.link(p) : mk('a');
      if (!a.getAttribute('href')) a.href = base + 'articles/' + p.slug + '.html';
      a.className = 'pick-link';
      var media = mk('div', 'pick-media');
      var c = coverOf(p);
      if (c) media.appendChild(picture(c, base));
      var rank = mk('span', 'pick-rank', String(i + 1)); rank.setAttribute('aria-hidden', 'true');   /* the list itself is ordered */
      media.appendChild(rank);
      a.appendChild(media);
      var body = mk('div', 'pick-body');
      var cat = mk('span', 'pick-cat');
      if (o.cat) o.cat(cat, p.category); else cat.textContent = p.category;
      body.appendChild(cat);
      var title = mk('span', 'pick-title');
      if (o.title) o.title(title, p); else TP.bi(title, p.title, p.title_en || '');
      body.appendChild(title);
      a.appendChild(body);
      li.appendChild(a); track.appendChild(li);
    });

    var prev = section.querySelector('.picks-prev'), next = section.querySelector('.picks-next');
    section.hidden = false;
    function step() {
      var card = track.querySelector('.pick');
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : 300;
    }
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      var atStart = track.scrollLeft <= 2, atEnd = track.scrollLeft >= max;
      /* a button that is about to disappear must not keep the keyboard focus */
      if (next && atEnd && document.activeElement === next && prev && !atStart) prev.focus();
      if (prev && atStart && document.activeElement === prev && next && !atEnd) next.focus();
      if (next) next.hidden = atEnd;
      if (prev) prev.hidden = atStart;
      var m = track.querySelector('.pick-media');
      if (m) section.style.setProperty('--btn-top', (m.getBoundingClientRect().height / 2 - 30) + 'px');   /* the buttons sit at the middle of the pictures */
    }
    function scrollBy(dir) { track.scrollBy({ left: dir * step(), behavior: reduced() ? 'auto' : 'smooth' }); }
    if (next) next.addEventListener('click', function () { scrollBy(1); });
    if (prev) prev.addEventListener('click', function () { scrollBy(-1); });
    track.addEventListener('scroll', sync, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track); else window.addEventListener('resize', sync);
    track.querySelectorAll('img').forEach(function (img) { img.addEventListener('load', sync, { once: true }); });
    sync();
    return true;
  }

  TP.picks = { mount: mount };
})();
