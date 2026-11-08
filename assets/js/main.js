/* The Picture — shared behaviour for every page */
(function () {
  var root = document.documentElement;
  var base = root.getAttribute('data-base') || '';

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

  /* ---------- language ---------- */
  var dict = {
    en: {
      'nav.articles': 'Articles', 'nav.projects': 'Projects', 'nav.portfolio': 'Portfolio', 'nav.about': 'About',
      'notice': 'English is coming soon. Some content is still in Thai only.',
      'cat.all': 'All', 'home.featured': 'Featured', 'home.latest': 'Latest', 'home.seeAll': 'See all',
      'home.categories': 'Browse by category', 'home.soon': 'Coming soon', 'home.onePost': '1 article →',
      'home.noPosts': 'No articles in this category yet.',
      'band.title': 'Portfolio for admissions', 'band.text': 'Achievements, competitions and lab experience, grouped by the program I am applying to.',
      'band.cta': 'Open portfolio →', 'stat.years': '3 years', 'stat.years.d': 'Biology and chemistry quiz competitions in a row',
      'stat.chem': '2nd runner-up', 'stat.chem.d': 'Chemistry exam, provincial level', 'stat.bio': '1st runner-up', 'stat.bio.d': 'Biology quiz, school level',
      'proj.title': 'Projects I have built', 'proj.dek': 'Websites, web apps and AI tools I designed and developed myself.',
      'proj.nexus': 'A catalogue of every human cell type, with a spider-web network linking the data.',
      'proj.pharrex': 'An educational drug-information website in Thai and English.',
      'proj.durian': 'A web app that detects durian leaf disease from a photo, using a Teachable Machine model.',
      'proj.crispr': 'A self-study course and teaching website on CRISPR-Cas9 and AlphaFold.',
      'proj.lucian': 'A personal JARVIS-style voice assistant.',
      'proj.english': 'A web app for learning English along an A1 to C1 roadmap, with shadowing practice.',
      'proj.none': 'No projects of this type yet.',
      'art.back': '← Back to all articles', 'art.toc': 'In this article', 'art.refs': 'References',
      'pf.about': 'About me', 'pf.version': 'Version for', 'pf.chem': 'Chemistry', 'pf.bio': 'Biology',
      'pf.awards': 'Achievements and awards', 'pf.exp': 'Lab work and activities', 'pf.work': 'Related work',
      'pf.allProjects': 'See all projects →', 'pf.certs': 'Certificates', 'pf.read': 'Read the article →',
      'ab.interests': 'What I am interested in', 'ab.path': 'The path ahead', 'ab.tools': 'Tools I build with',
      'ab.contact': 'Get in touch', 'ab.contactText': 'Happy to talk about articles, projects or anything I am learning.',
      'copy': 'Copy', 'copied': 'Copied', 'linkCopied': 'Link copied', 'search.ph': 'Search articles and projects', 'search.none': 'Nothing found'
    }
  };
  var thText = {};
  var current = 'th';

  function applyLang(lang) {
    current = lang === 'en' ? 'en' : 'th';
    root.lang = current;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!(key in thText)) thText[key] = el.textContent;
      el.textContent = current === 'en' && dict.en[key] ? dict.en[key] : thText[key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      if (!(key in thText)) thText[key] = el.getAttribute('placeholder');
      el.setAttribute('placeholder', current === 'en' && dict.en[key] ? dict.en[key] : thText[key]);
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === current));
    });
    var notice = document.querySelector('.en-notice');
    if (notice) notice.hidden = current !== 'en';
    renderDate();
  }
  function t(key) { return current === 'en' && dict.en[key] ? dict.en[key] : (thText[key] || key); }

  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); save('tp-lang', current); });
  });

  /* ---------- today's date ---------- */
  function renderDate() {
    var el = document.querySelector('[data-today]');
    if (!el) return;
    var now = new Date();
    try {
      el.textContent = current === 'en'
        ? now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { el.textContent = now.toDateString(); }
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.querySelector('.main-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(open));
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

    function run(value) {
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
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-filter');
        if (toggleOff && b.getAttribute('aria-pressed') === 'true') v = null;
        run(v);
      });
    });
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

  /* ---------- search ---------- */
  var index = [
    { type: 'ARTICLE', title: 'CRISPR และ AlphaFold เทคโนโลยีที่สามารถปฏิวัติวงการ Bio-Tech และการแพทย์', url: 'articles/crispr-alphafold.html', words: 'crispr cas9 alphafold biotech gene protein ยีน โปรตีน' },
    { type: 'PROJECT', title: 'Nexus', url: 'projects.html', words: 'cell เซลล์ network' },
    { type: 'PROJECT', title: 'Pharrex', url: 'projects.html', words: 'drug ยา pharmacology' },
    { type: 'PROJECT', title: 'หมอใบทุเรียน', url: 'projects.html', words: 'durian ทุเรียน ai teachable machine' },
    { type: 'PROJECT', title: 'CRISPR × AlphaFold', url: 'projects.html', words: 'course หลักสูตร crispr alphafold' },
    { type: 'PROJECT', title: 'Lucian', url: 'projects.html', words: 'voice assistant jarvis python เสียง' },
    { type: 'PROJECT', title: 'English Roadmap', url: 'projects.html', words: 'english ภาษาอังกฤษ shadowing' },
    { type: 'PAGE', title: 'พอร์ตโฟลิโอ', url: 'portfolio.html', words: 'portfolio tcas รางวัล award' },
    { type: 'PAGE', title: 'เกี่ยวกับฉัน', url: 'about.html', words: 'about contact ติดต่อ' }
  ];
  var layer = document.querySelector('.search-layer');
  var openBtn = document.querySelector('[data-search-open]');
  if (layer && openBtn) {
    var input = layer.querySelector('input');
    var list = layer.querySelector('.search-results');
    var lastFocus = null;
    var render = function () {
      var q = input.value.trim().toLowerCase();
      var hits = index.filter(function (it) { return !q || (it.title + ' ' + it.words).toLowerCase().indexOf(q) !== -1; });
      list.innerHTML = '';
      if (!hits.length) { var li = document.createElement('li'); li.className = 'none'; li.textContent = t('search.none'); list.appendChild(li); return; }
      hits.forEach(function (it) {
        var li = document.createElement('li');
        var a = document.createElement('a'); a.href = base + it.url;
        var k = document.createElement('span'); k.className = 'kicker'; k.textContent = it.type;
        var s = document.createElement('span'); s.textContent = it.title;
        a.appendChild(k); a.appendChild(s); li.appendChild(a); list.appendChild(li);
      });
    };
    var open = function () { lastFocus = document.activeElement; layer.hidden = false; input.value = ''; render(); input.focus(); };
    var close = function () { layer.hidden = true; if (lastFocus) lastFocus.focus(); };
    openBtn.addEventListener('click', open);
    input.addEventListener('input', render);
    layer.addEventListener('click', function (e) { if (e.target === layer) close(); });
    layer.querySelector('[data-search-close]').addEventListener('click', close);
    layer.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------- start ---------- */
  applyLang(load('tp-lang') || 'th');
})();
