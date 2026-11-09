/* The Picture — glossary terms (optional component). Loaded before main.js on article pages.
   In an article:  <button type="button" class="term" data-term="pam">PAM</button>
   The explanation comes from data/glossary.json (key, term, definition, + optional term_en, definition_en).
   - hover or keyboard focus shows the box
   - a tap (or click) pins it: it stays until you tap outside, tap another term, or press Esc
   - the box never leaves the screen: it is kept inside the left and right edges and flips above the word when there is no room below
   No visible text is written here; everything comes from the JSON file. If glossary.json cannot be loaded the terms stay plain words. */
(function () {
  var TP = window.TP = window.TP || {};
  var root = document.documentElement;
  var buttons = document.querySelectorAll('.term[data-term]');
  if (!buttons.length) return;

  function start() {
    TP.load('glossary').then(init, function (e) { if (window.console) console.error(e); });
  }
  if (TP.ready) start(); else document.addEventListener('tp:ready', start, { once: true });

  function init(list) {
    var entries = {};
    list.forEach(function (d) { if (d && d.key) entries[d.key] = d; });

    var pop = document.createElement('div');
    pop.className = 'term-pop'; pop.id = 'term-pop'; pop.setAttribute('role', 'tooltip'); pop.hidden = true;
    document.body.appendChild(pop);
    var pinned = null, shown = null, quiet = false;      /* quiet: focus is being handed back after Esc, do not reopen the box */

    function fill(btn) {
      var d = entries[btn.getAttribute('data-term')];
      if (!d) return false;
      var en = TP.lang() === 'en';
      pop.textContent = '';
      var title = document.createElement('strong'); title.textContent = (en && d.term_en) || d.term || '';
      var text = document.createElement('span'); text.textContent = (en && d.definition_en) || d.definition || '';
      if (en && !d.definition_en) text.setAttribute('lang', 'th'); else text.removeAttribute('lang');
      pop.appendChild(title); pop.appendChild(text);
      return true;
    }
    /* keep the box inside the screen: centred on the word, clamped to the edges, above the word if it does not fit below */
    function place(btn) {
      var r = btn.getBoundingClientRect();
      var vw = root.clientWidth, vh = window.innerHeight, margin = 16;
      pop.style.left = '0px'; pop.style.top = '0px';
      var w = pop.offsetWidth, h = pop.offsetHeight;
      var left = Math.min(Math.max(margin, r.left + r.width / 2 - w / 2), Math.max(margin, vw - w - margin));
      var below = r.bottom + 10, above = r.top - h - 10;
      var top;
      if (below + h <= vh - 8) top = below;                                       /* fits under the word */
      else if (above >= 8) top = above;                                           /* no room below: above the word */
      else top = Math.max(8, vh - h - 8);                                         /* neither: at least stay on screen */
      pop.style.left = (left + window.pageXOffset) + 'px';
      pop.style.top = (top + window.pageYOffset) + 'px';
    }
    function show(btn) {
      if (!fill(btn)) return;
      if (shown && shown !== btn) shown.removeAttribute('aria-describedby');
      shown = btn;
      pop.hidden = false;
      btn.setAttribute('aria-describedby', 'term-pop');
      place(btn);
    }
    function hide() {
      pop.hidden = true; pinned = null;
      if (shown) shown.removeAttribute('aria-describedby');
      shown = null;
    }

    Array.prototype.forEach.call(buttons, function (b) {
      if (!entries[b.getAttribute('data-term')]) {                  /* a key that is not in glossary.json: leave it as a plain word */
        if (window.console) console.warn('Glossary term not found: ' + b.getAttribute('data-term'));
        return;
      }
      b.addEventListener('mouseenter', function () { if (!pinned) show(b); });
      b.addEventListener('mouseleave', function () { if (!pinned) hide(); });
      b.addEventListener('focus', function () { if (!pinned && !quiet) show(b); });
      b.addEventListener('blur', function () { if (pinned !== b) hide(); });
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (pinned === b) hide(); else { pinned = b; show(b); }
      });
    });
    document.addEventListener('click', function (e) {
      if (pinned && !(e.target.closest && e.target.closest('.term-pop'))) hide();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) { var back = shown; hide(); if (back && back.focus) { quiet = true; back.focus(); quiet = false; } }
    });
    window.addEventListener('resize', hide);
    document.addEventListener('tp:lang', function () { if (shown && !pop.hidden) show(shown); });   /* the box follows a language switch */
  }
})();
