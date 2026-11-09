/* The Picture — shared behaviour for every page
   All interface text lives in data/i18n.json ({ "th": {...}, "en": {...} }); this file only holds logic.
   The one exception is FALLBACK_ERROR below, used when i18n.json itself cannot be loaded. */
(function () {
  var root = document.documentElement;
  var base = root.getAttribute('data-base') || '';
  /* language of the file's own content: <html lang="th"> for Thai files, "en" for articles/en/*.html */
  var pageLang = root.getAttribute('lang') === 'en' ? 'en' : 'th';
  var articleSlug = root.getAttribute('data-slug');
  var FALLBACK_ERROR = {
    th: 'โหลดเนื้อหาไม่สำเร็จ กรุณารีเฟรชหน้านี้ (ถ้าเปิดไฟล์จากเครื่องโดยตรง ให้รันผ่านเซิร์ฟเวอร์ เช่น python -m http.server)',
    en: 'Could not load the content. Please refresh the page (if you opened the file directly, run a local server such as python -m http.server).'
  };

  /* ---------- storage (may be unavailable) ---------- */
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* data files: fetched once, shared by every part of the page. asObject: the file holds one object (site.json) instead of a list */
  var dataCache = {};
  function loadData(name, asObject) {
    if (!dataCache[name]) {
      dataCache[name] = Promise.resolve().then(function () {
        return fetch(base + 'data/' + name + '.json');
      }).then(function (r) {
        if (!r.ok) throw new Error(name + '.json: HTTP ' + r.status);
        return r.json();
      }).then(function (d) {
        var ok = asObject ? (d && typeof d === 'object' && !Array.isArray(d)) : Array.isArray(d);
        if (!ok) throw new Error(name + '.json has the wrong shape');
        return d;
      });
      dataCache[name].catch(function () {});   /* errors are reported where the data is used */
    }
    return dataCache[name];
  }
  /* start every download at once instead of one after another (i18n -> data): the page waits for the slowest, not the sum */
  loadData('site', true);
  if (document.querySelector('[data-certificates]')) loadData('certificates');
  if (document.querySelector('[data-award-list]')) loadData('awards', true);
  if (document.querySelector('[data-activities]')) loadData('activities');
  if (document.querySelector('.term[data-term]')) loadData('glossary');       /* article components (glossary.js, mechanism.js) */
  if (document.querySelector('[data-mech]')) loadData('mechanism', true);
  if (document.getElementById('latest-list') || articleSlug || document.querySelector('.search-layer')) loadData('articles');
  if (document.getElementById('proj-grid') || root.getAttribute('data-project') || document.querySelector('.search-layer')) loadData('projects');

  /* everything else waits for the interface text */
  Promise.resolve().then(function () { return fetch(base + 'data/i18n.json'); })
    .then(function (r) { if (!r.ok) throw new Error('i18n.json: HTTP ' + r.status); return r.json(); })
    .catch(function (err) { if (window.console) console.error(err); return { th: {}, en: {} }; })
    .then(boot);

  function boot(dict) {
    dict.th = dict.th || {};
    dict.en = dict.en || {};
    var current = pageLang;

    /* ---------- text helpers ---------- */
    function fmt(s, vars) {
      return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
    }
    /* the string for a key in one language (falls back to Thai, then to the key itself so a gap is visible) */
    function tr(lang, key, vars) {
      var v = dict[lang][key];
      if (v == null) v = dict.th[key];
      if (v == null) return key;
      return typeof v === 'string' ? fmt(v, vars) : v;
    }
    function t(key, vars) { return tr(current, key, vars); }
    function has(key) { return dict.th[key] != null; }
    /* <html lang> stays the language of the file; text in the other language gets its own lang attribute */
    function tagLang(el, lang) {
      if (lang === pageLang) el.removeAttribute('lang'); else el.setAttribute('lang', lang);
    }
    /* text that has a Thai and an English version, kept in step by applyLang; no English text = Thai is shown in both */
    function bi(el, th, en) {
      el.setAttribute('data-bi', '');
      el.setAttribute('data-th', th);
      el.setAttribute('data-en', en || th);
      if (en) el.removeAttribute('data-noen'); else el.setAttribute('data-noen', '');
      var useEn = current === 'en' && !!en;
      el.textContent = useEn ? en : th;
      tagLang(el, useEn ? 'en' : 'th');
      return el;
    }
    function bk(el, key, vars) { return bi(el, tr('th', key, vars), tr('en', key, vars)); }
    function labelBi(el, prefix, id) {
      var k = prefix + '.' + id;
      if (has(k)) return bk(el, k);
      el.textContent = id; return el;
    }
    function mk(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    /* helpers shared with the optional modules (assets/js/covers.js) */
    var TP = window.TP = window.TP || {};
    TP.bi = bi; TP.bk = bk; TP.tr = tr; TP.mk = mk; TP.lang = function () { return current; };
    TP.load = loadData;      /* the shared data cache: components ask for data/<name>.json with TP.load('name') */

    /* ---------- language switching ---------- */
    function articleUrl(slug, lang) { return base + 'articles/' + (lang === 'en' ? 'en/' : '') + slug + '.html'; }
    /* article links: point to the English page when the reader chose English and that article has one */
    function updateArticleLinks() {
      document.querySelectorAll('a[data-article]').forEach(function (a) {
        var useEn = current === 'en' && a.getAttribute('data-has-en') === '1';
        a.href = articleUrl(a.getAttribute('data-article'), useEn ? 'en' : 'th');
      });
    }
    function applyLang(lang) {
      current = lang === 'en' ? 'en' : 'th';
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        if (el.__orig === undefined) el.__orig = el.textContent;   /* the text written in the HTML is the fallback */
        var v = dict[current][el.getAttribute('data-i18n')];
        if (v != null) { el.textContent = v; tagLang(el, current); } else { el.textContent = el.__orig; el.removeAttribute('lang'); }
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
        if (el.__orig === undefined) el.__orig = el.getAttribute('placeholder');
        var v = dict[current][el.getAttribute('data-i18n-ph')];
        el.setAttribute('placeholder', v != null ? v : el.__orig);
        if (v != null) tagLang(el, current);
      });
      document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        if (el.__orig === undefined) el.__orig = el.getAttribute('aria-label');
        var v = dict[current][el.getAttribute('data-i18n-aria')];
        el.setAttribute('aria-label', v != null ? v : el.__orig);
      });
      document.querySelectorAll('.lang-switch button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === current));
      });
      document.querySelectorAll('[data-bi]').forEach(function (el) {
        var useEn = current === 'en' && !el.hasAttribute('data-noen');
        el.textContent = el.getAttribute(useEn ? 'data-en' : 'data-th');
        tagLang(el, useEn ? 'en' : 'th');
      });
      /* the "Thai only" bar is for Thai files read in English; English files need no bar */
      var notice = document.querySelector('.en-notice');
      if (notice) notice.hidden = current !== 'en' || pageLang === 'en';
      updateArticleLinks();
      applySite(siteCache);
      renderDate();
      document.dispatchEvent(new CustomEvent('tp:lang', { detail: current }));   /* modules refresh attributes such as alt and aria-label */
    }

    /* The TH/EN buttons. On an article page the choice also decides which file is shown. */
    function switchLang(lang) {
      lang = lang === 'en' ? 'en' : 'th';
      save('tp-lang', lang);
      if (articleSlug) {
        if (pageLang === 'en') {                                   /* English file */
          if (lang === 'th') location.href = articleUrl(articleSlug, 'th') + location.hash;
          return;
        }
        if (lang === 'en') {                                       /* Thai file: go to the English file if there is one */
          loadData('articles').then(function (list) {
            var p = findArticle(list, articleSlug);
            if (p && p.has_en === true) location.href = articleUrl(articleSlug, 'en') + location.hash;
            else applyLang('en');                                  /* no English version: stay and show the notice */
          }, function () { applyLang('en'); });
          return;
        }
      }
      applyLang(lang);
    }
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.addEventListener('click', function () { switchLang(b.getAttribute('data-lang')); });
    });

    /* ---------- today's date (Thai: Buddhist Era, English: Gregorian) ---------- */
    function renderDate() {
      var el = document.querySelector('[data-today]');
      if (!el) return;
      var now = new Date();
      try {
        el.textContent = now.toLocaleDateString(String(t('date.locale')), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { el.textContent = now.toDateString(); }
    }
    /* "2026-11" or "2026-11-05" → { th: "5 พฤศจิกายน 2569", en: "5 November 2026" } using the patterns in i18n.json */
    function formatDate(d) {
      var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(d || '');
      if (!m || +m[2] < 1 || +m[2] > 12) return null;
      function one(lang) {
        var months = tr(lang, 'date.months');
        if (!Array.isArray(months)) return null;
        var pattern = tr(lang, m[3] ? 'date.fmt.day' : 'date.fmt.month');
        return fmt(pattern, { d: m[3] ? +m[3] : '', m: months[+m[2] - 1], y: +m[1] + (+tr(lang, 'date.yearOffset') || 0) });
      }
      var th = one('th'), en = one('en');
      return th && en ? { th: th, en: en } : null;
    }
    function dateBi(el, iso) {
      var d = formatDate(iso);
      if (d) bi(el, d.th, d.en);
      return !!d;
    }
    /* © year in the footer: Buddhist Era in Thai, Gregorian in English */
    document.querySelectorAll('[data-year]').forEach(function (el) {
      var y = new Date().getFullYear();
      bi(el, String(y + (+tr('th', 'date.yearOffset') || 0)), String(y + (+tr('en', 'date.yearOffset') || 0)));
    });

    /* ---------- mobile menu ---------- */
    var menuBtn = document.querySelector('.menu-btn');
    var nav = document.querySelector('.main-nav');
    if (menuBtn && nav) {
      menuBtn.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        menuBtn.setAttribute('aria-expanded', String(open));
      });
      /* Esc closes an open menu and puts the focus back on its button */
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !nav.classList.contains('is-open')) return;
        var search = document.querySelector('.search-layer');
        if (search && !search.hidden) return;                  /* the search box has its own Esc */
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        if (nav.contains(document.activeElement)) menuBtn.focus();
      });
    }

    /* ---------- filters (chips → items) ---------- */
    document.querySelectorAll('[data-filter-group]').forEach(function (group) {
      var target = document.getElementById(group.getAttribute('data-filter-group'));
      if (!target) return;
      var toggleOff = group.hasAttribute('data-toggle');
      var buttons = group.querySelectorAll('[data-filter]');
      var extra = group.getAttribute('data-also');
      var targets = [target];
      if (extra) extra.split(' ').forEach(function (id) { var e = document.getElementById(id); if (e) targets.push(e); });

      var chosen = null;
      function run(value) {
        chosen = value;
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === value)); });
        targets.forEach(function (tg) {
          var shown = 0;
          tg.querySelectorAll('[data-cat]').forEach(function (item) {
            var cats = item.getAttribute('data-cat').split(' ');
            var ok = !value || value === 'all' || cats.indexOf(value) !== -1;
            item.hidden = !ok;
            if (ok) shown++;
          });
          var empty = tg.querySelector('.empty');
          if (empty) empty.hidden = shown > 0;
        });
        /* print-only line that says which version is on the page */
        document.querySelectorAll('[data-version-print] [data-ver]').forEach(function (s) { s.hidden = s.getAttribute('data-ver') !== value; });
        var pv = document.querySelector('[data-version-print]');
        if (pv && group.hasAttribute('data-hash')) pv.hidden = !value || value === 'all';
      }
      /* data-hash: the filter lives in the address (page.html#chem) so a filtered link can be sent to someone */
      var hashed = group.hasAttribute('data-hash');
      function setHash(v) {
        try { history.replaceState(null, '', v ? '#' + v : location.href.split('#')[0]); } catch (e) {}
      }
      function applyHash() {
        var h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
        var known = false;
        buttons.forEach(function (b) { if (b.getAttribute('data-filter') === h) known = true; });
        if (known) run(h); else if (!h) run(null);
      }
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-filter');
          if (toggleOff && b.getAttribute('aria-pressed') === 'true') v = null;
          run(v);
          if (hashed) setHash(v);
        });
      });
      if (hashed) { applyHash(); window.addEventListener('hashchange', applyHash); }
      document.addEventListener('tp:refilter', function () { run(chosen); });          /* items drawn from JSON after the filter was set up */
      // external triggers, e.g. category cards
      document.querySelectorAll('[data-filter-trigger="' + group.getAttribute('data-filter-group') + '"]').forEach(function (trig) {
        trig.addEventListener('click', function () {
          run(trig.getAttribute('data-value'));
          group.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    });

    /* ---------- copy & share ---------- */
    function copyText(text, okMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { toast(text); });
      } else { toast(text); }
    }
    document.querySelectorAll('[data-copy-link]').forEach(function (b) {
      b.addEventListener('click', function () { copyText(location.href.split('#')[0], t('linkCopied')); });
    });
    /* copies the address as it is now, including a #chem / #bio filter */
    document.querySelectorAll('[data-copy-hash]').forEach(function (b) {
      b.addEventListener('click', function () { copyText(location.href, t('linkCopied')); });
    });
    document.querySelectorAll('[data-share]').forEach(function (b) {
      b.addEventListener('click', function () {
        var data = { title: document.title, url: location.href.split('#')[0] };
        if (navigator.share) { navigator.share(data).catch(function () {}); }
        else copyText(data.url, t('linkCopied'));
      });
    });
    document.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () { copyText(b.getAttribute('data-copy'), t('copied')); });
    });

    /* ---------- article: progress + table of contents ---------- */
    var bar = document.querySelector('.progress');
    var prose = document.querySelector('.prose');
    if (bar && prose) {
      var onScroll = function () {
        var r = prose.getBoundingClientRect();
        var total = r.height - window.innerHeight;
        var done = Math.min(1, Math.max(0, -r.top / (total > 0 ? total : 1)));
        bar.style.width = (done * 100).toFixed(1) + '%';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    /* table of contents is built from the h2/h3 headings inside .prose (the reference list is skipped) */
    var toc = document.querySelector('.toc');
    if (toc && prose) {
      var tocOl = toc.querySelector('ol');
      if (tocOl) {
        tocOl.textContent = '';
        var usedIds = {}, seq = 0;
        prose.querySelectorAll('[id]').forEach(function (e) { usedIds[e.id] = true; });
        prose.querySelectorAll('h2, h3').forEach(function (h) {
          if (h.closest('.refs')) return;
          if (!h.id) { do { seq++; } while (usedIds['sec-' + seq]); h.id = 'sec-' + seq; usedIds[h.id] = true; }
          var li = document.createElement('li'), a = document.createElement('a');
          a.href = '#' + h.id; a.textContent = h.textContent;
          if (h.tagName === 'H3') a.className = 'sub';
          li.appendChild(a); tocOl.appendChild(li);
        });
        if (tocOl.firstChild) tocOl.firstChild.firstChild.classList.add('is-active');
        toc.hidden = !tocOl.firstChild;
      }
    }

    /* reading time: word count of the page's own language (Intl.Segmenter), speed from i18n.json, placeholders and references left out */
    var readEl = document.querySelector('[data-read-time]');
    if (readEl && prose) {
      var copy = prose.cloneNode(true);
      copy.querySelectorAll('.refs, .author-card, .ph, .todo').forEach(function (e) { e.parentNode.removeChild(e); });
      var plain = copy.textContent.replace(/\s+/g, ' ').trim();
      var words;
      if (window.Intl && Intl.Segmenter) {
        words = Array.from(new Intl.Segmenter(pageLang, { granularity: 'word' }).segment(plain)).filter(function (s) { return s.isWordLike; }).length;
      } else { words = Math.round(plain.replace(/\s/g, '').length / 4); }
      var mins = Math.max(1, Math.round(words / (+tr(pageLang, 'art.wpm') || 200)));
      bk(readEl, 'art.readTime', { n: mins });
    }

    var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
    if (tocLinks.length && 'IntersectionObserver' in window) {
      var map = {};
      tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && map[en.target.id]) {
            tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
            map[en.target.id].classList.add('is-active');
          }
        });
      }, { rootMargin: '-90px 0px -70% 0px' });
      Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) io.observe(h); });
    }

    /* ---------- data: data/articles.json and data/projects.json ---------- */
    function findArticle(list, slug) {
      return list.filter(function (p) { return p && p.slug === slug; })[0];
    }

    /* ---------- data/site.json: name, initials, email, GitHub, profile photo (one place for every page) ---------- */
    var siteCache = null;
    function applySite(s) {
      if (!s) return;
      document.querySelectorAll('[data-site]').forEach(function (el) {
        var key = el.getAttribute('data-site');
        /* name_en / initials_en are used in English when filled in; empty value: keep the text written in the HTML */
        var v = (current === 'en' && s[key + '_en']) || s[key];
        if (v) { el.textContent = v; if (key === 'name' || key === 'initials') tagLang(el, current === 'en' && s[key + '_en'] ? 'en' : 'th'); }
      });
      document.querySelectorAll('[data-site-href]').forEach(function (el) {
        var v = safeUrl(s[el.getAttribute('data-site-href')]);
        if (v) {
          el.href = resolveUrl(v);
          if (isExternal(v)) { el.target = '_blank'; el.rel = 'noopener'; }
        } else if (el.parentNode) {
          el.parentNode.replaceChild(bk(mk('span', 'btn btn-soon'), 'proj.soonGh'), el);
        }
      });
      document.querySelectorAll('[data-copy-site]').forEach(function (el) {
        el.hidden = !s[el.getAttribute('data-copy-site')];
      });
    }
    document.querySelectorAll('[data-copy-site]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = siteCache && siteCache[b.getAttribute('data-copy-site')];
        if (v) copyText(v, t('copied'));
      });
    });

    /* ---------- image slots: <div class="ph" data-slot="activities" data-file="x.webp"> becomes the picture ---------- */
    /* data-slot = folder under assets/img/ (profile | activities | certificates | projects); the profile slot reads "photo" from site.json */
    function initSlots(scope) {
      var from = scope && scope.querySelectorAll ? scope : document;       /* (the promise chain also passes a value here: ignored) */
      from.querySelectorAll('[data-slot]').forEach(function (slot) {
        if (slot.__tpSlot) return;                                          /* each slot is turned into a picture once */
        slot.__tpSlot = true;
        var kind = slot.getAttribute('data-slot');
        var file = (slot.getAttribute('data-file') || '').trim();
        if (!file && kind === 'profile' && siteCache && siteCache.photo) file = String(siteCache.photo).trim();
        file = safeUrl(file);
        if (!file) return;                       /* no file yet: keep the [ ] placeholder */
        var src = isExternal(file) ? file : base + 'assets/img/' + kind + '/' + file.replace(/^\/+/, '');
        var alt = slot.getAttribute('data-alt');
        if (!alt) {
          var card = slot.closest('.exp-card'), h = card && card.querySelector('h3');
          if (h) alt = h.textContent;
          else if (kind === 'certificates') alt = t('alt.certificate');
          else if (kind === 'profile') alt = t('alt.profile') + (siteCache && siteCache.name ? ' ' + ((current === 'en' && siteCache.name_en) || siteCache.name) : '');
          else alt = '';
        }
        var fallback = slot.textContent;
        var im = mk('img');
        im.alt = alt; im.decoding = 'async';
        if (kind !== 'profile') im.loading = 'lazy';
        im.onerror = function () {               /* wrong file name: show the placeholder again instead of a broken picture */
          if (window.console) console.warn('Image not found: ' + src);
          slot.classList.remove('has-img'); slot.textContent = fallback;
        };
        im.src = src;
        slot.textContent = '';
        slot.classList.add('has-img');
        if (slot.hasAttribute('data-zoomable')) {
          var zb = mk('button', 'zoom-btn'); zb.type = 'button'; zb.setAttribute('data-zoom', '');
          if (slot.getAttribute('data-zoom-group')) zb.setAttribute('data-zoom-group', slot.getAttribute('data-zoom-group'));   /* pictures of one group can be paged through in the lightbox */
          zb.setAttribute('aria-label', t('zoom.label'));
          zb.appendChild(im); slot.appendChild(zb);
        } else { slot.appendChild(im); }
      });
    }
    /* ---------- certificates: data/certificates.json -> cards; certificates.js turns 4 or more into the moving strip ---------- */
    /* year is a Gregorian year in the JSON; shown as พ.ศ. in Thai and ค.ศ. in English (anything that is not a 4-digit year is shown as written) */
    function yearBi(el, y) {
      var s = String(y == null ? '' : y).trim();
      if (!s) return null;
      if (/^\d{4}$/.test(s)) return bi(el, String(+s + (+tr('th', 'date.yearOffset') || 0)), String(+s + (+tr('en', 'date.yearOffset') || 0)));
      el.textContent = s;
      return el;
    }
    function renderCertificates(list) {
      var host = document.querySelector('[data-certificates]');
      host.textContent = '';
      host.className = 'cert-grid';
      var n = 0;
      list.forEach(function (c) {
        if (!c) return;
        n++;
        var fig = mk('figure', 'cert');
        var ph = mk('div', 'ph');
        ph.setAttribute('data-slot', 'certificates');
        ph.setAttribute('data-zoomable', '');
        ph.setAttribute('data-zoom-group', 'certificates');
        ph.setAttribute('data-file', String(c.image || '').trim());
        if (c.alt || c.title) ph.setAttribute('data-alt', c.alt || c.title);
        ph.appendChild(bk(mk('span'), 'cert.placeholder', { n: n }));          /* the [ ] slot until there is a picture */
        fig.appendChild(ph);
        var cap = mk('figcaption');
        if (c.title) cap.appendChild(bi(mk('span', 'cert-title'), c.title, c.title_en || ''));
        var yr = yearBi(mk('span', 'cert-year'), c.year);
        if (yr) cap.appendChild(yr);
        if (!cap.firstChild) cap.appendChild(bk(mk('span', 'cert-title'), 'cert.caption'));
        fig.appendChild(cap);
        host.appendChild(fig);
      });
      initSlots(host);
      /* fewer than 4: it stays a plain grid. 4 or more: the strip (if certificates.js is loaded) */
      if (TP.certs) TP.certs.enhance(host);
    }

    /* ---------- awards.json (stats + award list), activities.json, and the about page lists from site.json ---------- */
    function refilter() { document.dispatchEvent(new CustomEvent('tp:refilter')); }
    function whenBi(el, o) {                                  /* a 4-digit year is Gregorian in the JSON (shown as พ.ศ. in Thai); anything else is shown as written */
      var w = String(o.when == null ? '' : o.when).trim();
      if (/^\d{4}$/.test(w)) return yearBi(el, w);
      return bi(el, w, o.when_en || '');
    }
    function renderAwards(d) {
      var stats = document.querySelector('[data-stats]'), list = document.querySelector('[data-award-list]');
      if (stats) {
        stats.textContent = '';
        (d.stats || []).forEach(function (x) {
          var b = mk('div', 'stat');
          b.appendChild(bi(mk('span', 'big'), x.big || '', x.big_en || ''));
          b.appendChild(bi(mk('span', 'what'), x.what || '', x.what_en || ''));
          stats.appendChild(b);
        });
      }
      if (list) {
        list.textContent = '';
        (d.items || []).forEach(function (x) {
          var li = mk('li');
          if (x.cat) li.setAttribute('data-cat', x.cat);
          li.appendChild(whenBi(mk('span', 'when'), x));
          var what = mk('span', 'what');
          what.appendChild(bi(mk('span', 'title'), x.title || '', x.title_en || ''));
          if (x.sub) what.appendChild(bi(mk('span', 'sub'), x.sub, x.sub_en || ''));
          li.appendChild(what);
          list.appendChild(li);
        });
      }
      refilter();
    }
    function renderActivities(list) {
      var host = document.querySelector('[data-activities]');
      if (!host) return;
      host.textContent = '';
      list.forEach(function (x) {
        if (!x) return;
        var card = mk('article', 'exp-card');
        if (x.cat) card.setAttribute('data-cat', x.cat);
        var ph = mk('div', 'ph');
        ph.setAttribute('data-slot', 'activities');
        ph.setAttribute('data-file', String(x.image || '').trim());
        if (x.alt) ph.setAttribute('data-alt', x.alt);
        ph.appendChild(bk(mk('span'), 'act.placeholder'));                  /* the [ ] slot until there is a picture */
        card.appendChild(ph);
        var body = mk('div', 'body');
        if (x.kicker) { var k = mk('span', 'kicker'); k.textContent = x.kicker; body.appendChild(k); }
        body.appendChild(bi(mk('h3'), x.title || '', x.title_en || ''));
        if (x.text) body.appendChild(bi(mk('p'), x.text, x.text_en || ''));
        card.appendChild(body);
        host.appendChild(card);
      });
      initSlots(host);
      refilter();
    }
    function renderAbout(s) {
      var ints = document.querySelector('[data-interests]');
      if (ints) { ints.textContent = ''; (s.interests || []).forEach(function (w) { var e = mk('span'); e.textContent = w; ints.appendChild(e); }); }
      var tools = document.querySelector('[data-tools]');
      if (tools) { tools.textContent = ''; (s.tools || []).forEach(function (w) { var e = mk('div'); e.textContent = w; tools.appendChild(e); }); }
      var path = document.querySelector('[data-path]');
      if (path) {
        path.textContent = '';
        var steps = s.path || [];
        steps.forEach(function (x, i) {
          var li = mk('li', x.state || '');
          var rail = mk('span', 'rail');
          rail.appendChild(mk('span', 'dot'));
          if (i < steps.length - 1) rail.appendChild(mk('span', 'line'));
          li.appendChild(rail);
          var step = mk('span', 'step');
          if (i === steps.length - 1) step.style.paddingBottom = '0';
          step.appendChild(bi(mk('span', 'stage'), x.stage || '', x.stage_en || ''));
          step.appendChild(bi(mk('span', 'title'), x.title || '', x.title_en || ''));
          if (x.sub) step.appendChild(bi(mk('span', 'sub'), x.sub, x.sub_en || ''));
          li.appendChild(step);
          path.appendChild(li);
        });
      }
    }

    /* printing: make sure lazy images are loaded before the browser lays out the pages */
    window.addEventListener('beforeprint', function () {
      document.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; });
    });
    function showError(err) {
      if (window.console) console.error(err);
      var th = dict.th['data.error'] || FALLBACK_ERROR.th, en = dict.en['data.error'] || FALLBACK_ERROR.en;
      if (location.protocol === 'file:' && dict.th['data.errorLocal']) { th += ' ' + dict.th['data.errorLocal']; en += ' ' + dict.en['data.errorLocal']; }
      document.querySelectorAll('[data-error]').forEach(function (el) { bi(el, th, en); el.hidden = false; });
    }

    /* published articles only, newest first */
    function publishedPosts(list, keepSlug) {
      return list.map(function (p, i) { return { p: p, i: i }; })
        .filter(function (x) { return x.p && x.p.slug && x.p.title && (x.p.status === 'published' || x.p.slug === keepSlug); })
        .sort(function (a, b) {
          var da = a.p.date || '', db = b.p.date || '';
          return da < db ? 1 : da > db ? -1 : a.i - b.i;
        })
        .map(function (x) { return x.p; });
    }
    function safeUrl(u) {
      u = String(u || '').trim();
      return /^(javascript|data|vbscript):/i.test(u) ? '' : u;
    }
    function isExternal(u) { return /^(https?:)?\/\//i.test(u); }
    function resolveUrl(u) { return isExternal(u) || u.charAt(0) === '#' ? u : base + u.replace(/^\//, ''); }
    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    /* a link to an article that follows the language (see updateArticleLinks); title_en / dek_en are optional fields */
    function articleLink(p, cls) {
      var a = mk('a', cls);
      a.setAttribute('data-article', p.slug);
      a.setAttribute('data-has-en', p.has_en === true ? '1' : '0');
      a.href = articleUrl(p.slug, p.has_en === true && current === 'en' ? 'en' : 'th');
      return a;
    }
    function titleBi(el, p) { return bi(el, p.title, p.title_en || ''); }

    function renderHome(posts) {
      var lead = document.getElementById('lead-main');
      var ol = document.getElementById('latest-ol');
      var empty = document.querySelector('#latest-list .empty');

      if (lead) {
        lead.textContent = '';
        var feat = posts.filter(function (p) { return p.featured === true; })[0] || posts[0];
        if (!feat) {
          lead.appendChild(bk(mk('p', 'empty'), 'home.noArticles'));
        } else {
          if (TP.covers) {
            /* the cover slider (covers.js): the article's "covers" list from articles.json; each slide links to the article */
            var coverHost = mk('div');
            lead.appendChild(coverHost);
            TP.covers.mount(coverHost, feat.covers, {
              wide: false,
              link: function () { var a = articleLink(feat); a.setAttribute('aria-labelledby', 'lead-title'); return a; }
            });
          } else {
            /* covers.js is not loaded: the plain helix picture */
            var cover = articleLink(feat, 'helix');
            cover.setAttribute('aria-labelledby', 'lead-title');
            var tpl = document.getElementById('helix-tpl');
            if (tpl && tpl.content) cover.appendChild(tpl.content.cloneNode(true));
            lead.appendChild(cover);
          }

          var meta = mk('div', 'lead-meta');
          meta.appendChild(labelBi(mk('span', 'cat'), 'cat', feat.category));
          if (feat.featured === true) {
            var sep = mk('span', 'sep', '·'); sep.setAttribute('aria-hidden', 'true');
            meta.appendChild(sep);
            meta.appendChild(bk(mk('span', 'note'), 'home.featured'));
          }
          lead.appendChild(meta);

          var h1 = mk('h1');
          var ha = titleBi(articleLink(feat), feat); ha.id = 'lead-title'; h1.appendChild(ha);
          lead.appendChild(h1);
          if (feat.dek) lead.appendChild(bi(mk('p', 'lead-dek'), feat.dek, feat.dek_en || ''));

          var by = mk('div', 'byline');
          /* name and initials are filled from data/site.json by applySite() */
          var av = mk('span', 'avatar'); av.setAttribute('aria-hidden', 'true'); av.setAttribute('data-site', 'initials');
          var who = mk('span', 'who');
          var nm = mk('span', 'name'); nm.setAttribute('data-site', 'name'); who.appendChild(nm);
          var when = mk('span', 'when');
          if (dateBi(when, feat.date)) who.appendChild(when);
          by.appendChild(av); by.appendChild(who);
          lead.appendChild(by);
        }
      }

      if (ol) {
        ol.textContent = '';
        posts.forEach(function (p, i) {
          var li = mk('li', 'is-live'); li.setAttribute('data-cat', p.category);
          li.appendChild(mk('span', 'num', pad2(i + 1)));
          var body = mk('span', 'body');
          body.appendChild(labelBi(mk('span', 'kicker'), 'cat', p.category));
          body.appendChild(titleBi(articleLink(p, 'title'), p));
          li.appendChild(body); ol.appendChild(li);
        });
        if (empty) empty.hidden = posts.length > 0;
      }

      document.querySelectorAll('.cat-card[data-value]').forEach(function (card) {
        var v = card.getAttribute('data-value');
        var n = posts.filter(function (p) { return p.category === v; }).length;
        var count = card.querySelector('.count');
        if (count) bk(count, n === 0 ? 'home.count.zero' : n === 1 ? 'home.count.one' : 'home.count.many', { n: n });
        card.classList.toggle('has-posts', n > 0);
      });
      applySite(siteCache);
    }

    function renderProjects(list) {
      var grid = document.getElementById('proj-grid');
      var empty = document.querySelector('#project-grid .empty');
      grid.textContent = '';
      var shown = 0;
      list.forEach(function (p) {
        if (!p || !p.slug || !p.name) return;
        shown++;
        var gh = safeUrl(p.github);
        var card = mk('div', 'proj-card');
        card.id = p.slug;
        card.setAttribute('data-cat', (p.types || []).join(' '));

        var thumb = mk('div', 'proj-thumb'); thumb.setAttribute('aria-hidden', 'true');
        if (/\.(png|jpe?g|webp|gif|svg)$/i.test(p.thumb || '')) { var im = mk('img'); im.src = resolveUrl(p.thumb); im.alt = ''; thumb.appendChild(im); }
        else thumb.textContent = p.thumb || p.name.charAt(0).toUpperCase();
        card.appendChild(thumb);

        var body = mk('div', 'proj-body');
        var name = mk('span', 'name');
        var a = mk('a', null, p.name); a.href = base + 'projects/' + p.slug + '.html';
        name.appendChild(a);
        body.appendChild(name);
        body.appendChild(bi(mk('span', 'desc'), p.desc_th || '', p.desc_en || ''));

        var tags = mk('span', 'tags');
        (p.types || []).forEach(function (ty) { tags.appendChild(labelBi(mk('span', 'tag'), 'type', ty)); });
        (p.tags || []).forEach(function (tg) { tags.appendChild(mk('span', 'tag', tg)); });
        body.appendChild(tags);

        if (gh) {
          var g = bk(mk('a', 'proj-gh'), 'proj.github');
          g.href = resolveUrl(gh);
          if (isExternal(gh)) { g.target = '_blank'; g.rel = 'noopener'; }
          body.appendChild(g);
        }
        card.appendChild(body);
        grid.appendChild(card);
      });
      if (empty) empty.hidden = shown > 0;
    }

    if (document.getElementById('latest-list')) {
      loadData('articles').then(function (l) { renderHome(publishedPosts(l)); }).catch(showError);
    }
    if (document.getElementById('proj-grid')) {
      loadData('projects').then(renderProjects).catch(showError);
    }
    if (document.querySelector('[data-certificates]')) {
      loadData('certificates').then(renderCertificates).catch(showError);
    }
    if (document.querySelector('[data-award-list]')) loadData('awards', true).then(renderAwards).catch(showError);
    if (document.querySelector('[data-activities]')) loadData('activities').then(renderActivities).catch(showError);

    /* ---------- project page: header and links come from projects.json (matched by data-project) ---------- */
    function projectLinks(box, p, showSoon) {
      box.textContent = '';
      function add(url, cls, key, soonKey) {
        url = safeUrl(url);
        if (url) {
          var a = bk(mk('a', 'btn ' + cls), key);
          a.href = resolveUrl(url);
          if (isExternal(url)) { a.target = '_blank'; a.rel = 'noopener'; }
          box.appendChild(a);
        } else if (showSoon) {
          box.appendChild(bk(mk('span', 'btn btn-soon'), soonKey));
        }
      }
      add(p.url, 'btn-dark', 'proj.open', 'proj.soonWeb');
      add(p.github, 'btn-line', 'proj.githubBtn', 'proj.soonGh');
    }
    function renderProjectPage(slug, list) {
      var p = list.filter(function (x) { return x && x.slug === slug; })[0];
      if (!p) {
        document.querySelectorAll('[data-error]').forEach(function (el) { bk(el, 'proj.notFound'); el.hidden = false; });
        return;
      }
      document.title = p.name + ' · The Picture';
      document.querySelectorAll('[data-project-name]').forEach(function (el) { el.textContent = p.name; });
      document.querySelectorAll('[data-project-desc]').forEach(function (el) { bi(el, p.desc_th || '', p.desc_en || ''); });
      document.querySelectorAll('[data-project-tags]').forEach(function (box) {
        box.textContent = '';
        (p.types || []).forEach(function (ty) { box.appendChild(labelBi(mk('span', 'tag'), 'type', ty)); });
        (p.tags || []).forEach(function (tg) { box.appendChild(mk('span', 'tag', tg)); });
      });
      document.querySelectorAll('[data-project-hero]').forEach(function (box) {
        box.textContent = '';
        if (/\.(png|jpe?g|webp|gif|svg)$/i.test(p.thumb || '')) { var im = mk('img'); im.src = resolveUrl(p.thumb); im.alt = ''; box.appendChild(im); }
        else box.textContent = p.thumb || p.name.charAt(0).toUpperCase();
      });
      document.querySelectorAll('[data-project-links]').forEach(function (box) {
        projectLinks(box, p, box.getAttribute('data-project-links') === 'soon');
      });
    }
    var projectSlug = root.getAttribute('data-project');
    if (projectSlug) {
      loadData('projects').then(function (l) { renderProjectPage(projectSlug, l); }).catch(showError);
    }

    /* ---------- lightbox: any <button data-zoom> that wraps an <img> opens it full screen ---------- */
    /* Buttons that share data-zoom-group (e.g. the certificates) can be paged through: arrows, keys, swipe. */
    var lb = null, lbImg = null, lbCap = null, lbClose = null, lbPrev = null, lbNext = null, lbCount = null, lbLast = null;
    var lbItems = [], lbIndex = 0;
    function closeLightbox() {
      if (!lb || lb.hidden) return;
      lb.hidden = true;
      root.classList.remove('has-lightbox');
      if (lbLast && lbLast.focus) lbLast.focus();
    }
    function lbCollect(btn) {
      var g = btn.getAttribute('data-zoom-group');
      if (!g) return [btn];
      return Array.prototype.filter.call(document.querySelectorAll('[data-zoom][data-zoom-group="' + g + '"]'), function (b) {
        return !b.closest('[inert]') && b.querySelector('img');        /* skip the hidden copies of a moving strip */
      });
    }
    function lbShow(i) {
      lbIndex = (i + lbItems.length) % lbItems.length;
      var btn = lbItems[lbIndex], im = btn.querySelector('img');
      lbLast = btn;                                                     /* closing returns focus to the picture you were looking at */
      lbImg.src = btn.getAttribute('data-full') || im.currentSrc || im.src;
      lbImg.alt = im.alt;
      lbCap.textContent = '';
      var fig = btn.closest('figure');
      var fc = (fig && fig.querySelector('figcaption')) || (btn.parentNode && btn.parentNode.querySelector('figcaption'));
      if (fc) Array.prototype.forEach.call(fc.childNodes, function (n) { lbCap.appendChild(n.cloneNode(true)); });
      var multi = lbItems.length > 1;
      lbPrev.hidden = lbNext.hidden = lbCount.hidden = !multi;
      if (multi) lbCount.textContent = t('lightbox.counter', { n: lbIndex + 1, total: lbItems.length });
    }
    function lbButton(cls, d) {
      var b = mk('button', 'icon-btn lightbox-nav ' + cls); b.type = 'button';
      b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
      return b;
    }
    function openLightbox(btn) {
      var im = btn.querySelector('img');
      if (!im) return;
      if (!lb) {
        lb = mk('div', 'lightbox'); lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.hidden = true;
        lbClose = mk('button', 'icon-btn lightbox-close'); lbClose.type = 'button';
        lbClose.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
        lbPrev = lbButton('prev', 'M15 6l-6 6 6 6'); lbNext = lbButton('next', 'M9 6l6 6-6 6');
        var fig = mk('figure'); lbImg = mk('img'); lbCap = mk('figcaption'); lbCount = mk('span', 'lightbox-count');
        lbImg.draggable = false;
        fig.appendChild(lbImg); fig.appendChild(lbCap);
        lb.appendChild(lbClose); lb.appendChild(lbPrev); lb.appendChild(lbNext); lb.appendChild(fig); lb.appendChild(lbCount);
        document.body.appendChild(lb);
        lbPrev.addEventListener('click', function () { lbShow(lbIndex - 1); });
        lbNext.addEventListener('click', function () { lbShow(lbIndex + 1); });
        /* click outside the picture (or on the close button) closes it; the arrows and the counter do not */
        lb.addEventListener('click', function (e) {
          if (e.target === lbImg || (e.target.closest && e.target.closest('figcaption a, .lightbox-nav'))) return;
          closeLightbox();
        });
        /* swipe sideways to page through a group */
        var sx = null;
        lb.addEventListener('pointerdown', function (e) { sx = e.target === lbImg ? e.clientX : null; });
        lb.addEventListener('pointerup', function (e) {
          if (sx === null || lbItems.length < 2) return;
          var dx = e.clientX - sx; sx = null;
          if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
        });
        lb.addEventListener('pointercancel', function () { sx = null; });
      }
      lb.setAttribute('aria-label', t('lightbox.label'));
      lbClose.setAttribute('aria-label', t('lightbox.close'));
      lbPrev.setAttribute('aria-label', t('lightbox.prev'));
      lbNext.setAttribute('aria-label', t('lightbox.next'));
      lbItems = lbCollect(btn);
      lbShow(Math.max(0, lbItems.indexOf(btn)));
      lb.hidden = false;
      root.classList.add('has-lightbox');
      lbClose.focus();
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-zoom]');
      if (b) openLightbox(b);
    });
    document.addEventListener('keydown', function (e) {
      if (!lb || lb.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft' && lbItems.length > 1) { e.preventDefault(); lbShow(lbIndex - 1); }
      else if (e.key === 'ArrowRight' && lbItems.length > 1) { e.preventDefault(); lbShow(lbIndex + 1); }
      else if (e.key === 'Tab') {                                       /* keep focus inside the dialog: close, previous, next */
        e.preventDefault();
        var ctl = [lbClose, lbPrev, lbNext].filter(function (c) { return !c.hidden; });
        var at = ctl.indexOf(document.activeElement);
        ctl[(at + (e.shiftKey ? -1 : 1) + ctl.length) % ctl.length].focus();
      }
    });

    loadData('site', true).then(function (s) { siteCache = s; renderAbout(s); applySite(s); }, function (e) { if (window.console) console.error(e); }).then(initSlots);

    /* ---------- article page: category, date, previous/next, same-category list ---------- */
    function navLink(p, cls, key) {
      var a = articleLink(p, cls);
      a.appendChild(bk(mk('span', 'dir'), key));
      a.appendChild(titleBi(mk('span', 'ttl'), p));
      return a;
    }
    function renderArticleExtras(slug, list) {
      /* the page's own article counts even while it is still a draft, so a draft can be previewed */
      var posts = publishedPosts(list, slug);
      var me = posts.filter(function (p) { return p.slug === slug; })[0];
      if (!me) return;

      /* cover slider in the article header (the plain helix written in the HTML stays if covers.js or the data is missing) */
      var coverFig = document.querySelector('figure.cover[data-cover]');
      if (coverFig && TP.covers) {
        coverFig.textContent = '';
        var coverHost = mk('div'), coverCap = mk('figcaption');
        coverFig.appendChild(coverHost); coverFig.appendChild(coverCap);
        TP.covers.mount(coverHost, me.covers, { wide: true, captionEl: coverCap });
      }

      var catEl = document.querySelector('[data-article-cat]');
      if (catEl) labelBi(catEl, 'cat', me.category);
      var dateEl = document.querySelector('[data-article-date]');
      if (dateEl && dateBi(dateEl, me.date)) {
        var sepEl = document.querySelector('[data-when-sep]'); if (sepEl) sepEl.hidden = false;
      }

      var i = posts.indexOf(me), newer = posts[i - 1], older = posts[i + 1];
      var navBox = document.querySelector('[data-post-nav]');
      if (navBox && (newer || older)) {
        navBox.textContent = '';
        if (older) navBox.appendChild(navLink(older, 'prev', 'art.prev'));
        if (newer) navBox.appendChild(navLink(newer, 'next', 'art.next'));
        navBox.hidden = false;
      }

      var box = document.querySelector('[data-related]');
      var grid = document.querySelector('[data-related-list]');
      var same = posts.filter(function (p) { return p.category === me.category && p.slug !== slug && p.status === 'published'; }).slice(0, 3);
      if (box && grid && same.length) {
        grid.textContent = '';
        same.forEach(function (p) {
          var a = articleLink(p, 'related-card');
          a.appendChild(labelBi(mk('span', 'kicker'), 'cat', p.category));
          a.appendChild(titleBi(mk('span', 'title'), p));
          var when = mk('span', 'when');
          if (dateBi(when, p.date)) a.appendChild(when);
          grid.appendChild(a);
        });
        box.hidden = false;
      }
    }
    if (articleSlug) {
      loadData('articles').then(function (l) { renderArticleExtras(articleSlug, l); }).catch(function (e) { if (window.console) console.error(e); });
    }

    /* ---------- search (built from the two data files + fixed pages) ---------- */
    var PAGES = [
      { kind: 'page', key: 'nav.portfolio', url: 'portfolio.html', words: 'portfolio tcas รางวัล award' },
      { kind: 'page', key: 'nav.about', url: 'about.html', words: 'about contact ติดต่อ' }
    ];
    var index = PAGES.slice();
    var searchFailed = false;
    var refreshSearch = null;

    function settle(name) {
      return loadData(name).then(function (v) { return v; }, function (e) { if (window.console) console.error(e); return null; });
    }
    Promise.all([settle('articles'), settle('projects')]).then(function (res) {
      var items = [];
      if (res[0]) publishedPosts(res[0]).forEach(function (p) {
        items.push({ kind: 'article', th: p.title, en: p.title_en || '', slug: p.slug, hasEn: p.has_en === true,
          words: [p.dek, p.dek_en, p.category, tr('th', 'cat.' + p.category), tr('en', 'cat.' + p.category)].join(' ') });
      });
      if (res[1]) res[1].forEach(function (p) {
        if (!p || !p.slug || !p.name) return;
        items.push({ kind: 'project', th: p.name, en: '', url: 'projects/' + p.slug + '.html',
          words: [p.desc_th, p.desc_en, (p.types || []).join(' '), (p.tags || []).join(' ')].join(' ') });
      });
      index = items.concat(PAGES);
      searchFailed = !res[0] || !res[1];
      if (refreshSearch) refreshSearch();
    });

    var layer = document.querySelector('.search-layer');
    var openBtn = document.querySelector('[data-search-open]');
    if (layer && openBtn) {
      var input = layer.querySelector('input');
      var list = layer.querySelector('.search-results');
      var lastFocus = null;
      var render = function () {
        var q = input.value.trim().toLowerCase();
        var rows = index.map(function (it) {
          var title = it.key ? t(it.key) : (current === 'en' && it.en ? it.en : it.th);
          var href = it.kind === 'article' ? articleUrl(it.slug, it.hasEn && current === 'en' ? 'en' : 'th') : base + it.url;
          var hay = [title, it.th, it.en, it.key ? tr('th', it.key) + ' ' + tr('en', it.key) : '', it.words].join(' ').toLowerCase();
          return { kind: it.kind, title: title, href: href, hit: !q || hay.indexOf(q) !== -1 };
        }).filter(function (r) { return r.hit; });
        list.innerHTML = '';
        if (searchFailed) { var warn = document.createElement('li'); warn.className = 'none'; warn.textContent = t('data.errorShort'); list.appendChild(warn); }
        if (!rows.length) { var li = document.createElement('li'); li.className = 'none'; li.textContent = t('search.none'); list.appendChild(li); return; }
        rows.forEach(function (r) {
          var li = document.createElement('li');
          var a = document.createElement('a'); a.href = r.href;
          var k = document.createElement('span'); k.className = 'kicker'; k.textContent = t('search.type.' + r.kind);
          var s = document.createElement('span'); s.textContent = r.title;
          a.appendChild(k); a.appendChild(s); li.appendChild(a); list.appendChild(li);
        });
      };
      refreshSearch = function () { if (!layer.hidden) render(); };
      var open = function () { lastFocus = document.activeElement; layer.hidden = false; input.value = ''; render(); input.focus(); };
      var close = function () { layer.hidden = true; if (lastFocus) lastFocus.focus(); };
      openBtn.addEventListener('click', open);
      input.addEventListener('input', render);
      layer.addEventListener('click', function (e) { if (e.target === layer) close(); });
      layer.querySelector('[data-search-close]').addEventListener('click', close);
      layer.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }

    /* ---------- start ---------- */
    if (pageLang === 'en') {
      /* an English file is always English; remember it so the other pages follow */
      save('tp-lang', 'en');
      applyLang('en');
    } else {
      var saved = load('tp-lang') === 'en' ? 'en' : 'th';
      applyLang(saved);
      /* English chosen earlier and this Thai article has an English file: go there (replace, so Back still works) */
      if (saved === 'en' && articleSlug) {
        loadData('articles').then(function (l) {
          var p = findArticle(l, articleSlug);
          if (p && p.has_en === true) location.replace(articleUrl(articleSlug, 'en') + location.hash);
        }).catch(function () {});
      }
    }
    /* the shared helpers and the language are ready: optional components (glossary.js, mechanism.js, ...) can start */
    TP.ready = true;
    document.dispatchEvent(new CustomEvent('tp:ready'));
  }
})();
