/* The Picture — CRISPR-Cas9 mechanism diagram (optional component). Loaded before main.js on article pages.
   In an article put an empty  <div data-mech></div>  — this script builds everything else:
   the diagram, the three steps, the NHEJ / HDR switch, Play and Start over, and the two repair cards under it.
   Step 1: Cas9 slides along the DNA to the PAM.  Step 2: it cuts both strands.  Step 3: the cell repairs the cut (NHEJ or HDR).
   The sentences about the steps come from data/mechanism.json (article content, optional _en fields);
   labels and buttons come from data/i18n.json (mech.*). The caption is an aria-live region, so each step is announced. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var TP = window.TP = window.TP || {};
  var hosts = document.querySelectorAll('[data-mech]');
  if (!hosts.length) return;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }

  function start() {
    TP.load('mechanism', true).then(function (data) {
      Array.prototype.forEach.call(hosts, function (h, i) { build(h, data, i); });
    }, function (e) { if (window.console) console.error(e); });
  }
  if (TP.ready) start(); else document.addEventListener('tp:ready', start, { once: true });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  var updaters = [];
  document.addEventListener('tp:lang', function () { updaters.forEach(function (fn) { fn(); }); });
  function localised(node, attr, key) {                    /* an attribute (aria-label) that follows the language */
    var set = function () { node.setAttribute(attr, TP.tr(TP.lang(), key)); };
    set(); updaters.push(set);
  }
  function pair(node, obj, key) { return TP.bi(node, obj[key] || '', obj[key + '_en'] || ''); }   /* article text: Thai, and English when written */

  function build(host, data, n) {
    var steps = data.steps || [], repairs = data.repairs || {};
    var repairKeys = Object.keys(repairs);
    host.className = 'mech';
    host.setAttribute('data-step', '0');
    host.setAttribute('data-repair', repairKeys[0] || 'nhej');
    host.textContent = '';

    /* ----- the diagram ----- */
    var stage = el('div', 'mech-stage');
    var titleId = 'mech-title-' + n;
    var s = svg('svg', { viewBox: '0 0 640 268', role: 'img', 'aria-labelledby': titleId });
    var title = svg('title', { id: titleId }); TP.bk(title, 'mech.title'); s.appendChild(title);
    function group(cls) { var g = svg('g', { 'class': cls }); s.appendChild(g); return g; }
    function text(parent, key, attrs) { var t = svg('text', attrs); TP.bk(t, key); parent.appendChild(t); return t; }
    function line(parent, x1, y1, x2, y2, cls) { parent.appendChild(svg('line', { 'class': cls, x1: x1, y1: y1, x2: x2, y2: y2 })); }
    function ticks(parent, from, to) {                      /* the rungs between the two strands */
      var g = svg('g', { 'class': 'ticks' });
      for (var x = from; x < to; x += 14) {
        if (Math.abs(x - 385) < 3) continue;
        line(g, x, 114, x, 136, 'tick');
      }
      parent.appendChild(g);
    }
    var left = group('dna-left');
    left.appendChild(svg('rect', { 'class': 'target', x: 321, y: 104, width: 64, height: 42, rx: 4 }));
    line(left, 20, 110, 385, 110, 'strand'); line(left, 20, 140, 385, 140, 'strand');
    ticks(left, 27, 385);
    text(left, 'mech.target', { x: 380, y: 206, 'text-anchor': 'end' });

    var right = group('dna-right');
    right.appendChild(svg('rect', { 'class': 'pam', x: 392, y: 104, width: 42, height: 42, rx: 4 }));
    line(right, 385, 110, 620, 110, 'strand'); line(right, 385, 140, 620, 140, 'strand');
    ticks(right, 392, 620);
    text(right, 'mech.pam', { 'class': 'pam-label', x: 396, y: 206, 'text-anchor': 'start' });

    var cut = group('cutmark');
    line(cut, 385, 94, 385, 156, '');
    text(cut, 'mech.cut', { x: 385, y: 252, 'text-anchor': 'middle' });

    var indel = group('indel');
    indel.appendChild(svg('circle', { cx: 385, cy: 125, r: 8 }));
    text(indel, 'mech.indel', { x: 385, y: 252, 'text-anchor': 'middle' });

    var template = group('template');
    line(template, 315, 68, 455, 68, '');
    text(template, 'mech.template', { x: 385, y: 50, 'text-anchor': 'middle' });
    template.appendChild(svg('rect', { 'class': 'patch', x: 372, y: 106, width: 26, height: 38, rx: 3 }));

    var cas9 = group('cas9');
    cas9.appendChild(svg('ellipse', { cx: 110, cy: 125, rx: 64, ry: 46 }));
    text(cas9, 'mech.cas9', { x: 110, y: 106, 'text-anchor': 'middle' });
    cas9.appendChild(svg('path', { 'class': 'grna', d: 'M78 132 H142' }));
    text(cas9, 'mech.grna', { 'class': 'small', x: 110, y: 158, 'text-anchor': 'middle' });
    stage.appendChild(s);

    /* ----- caption, steps, controls ----- */
    var controls = el('div', 'mech-controls');
    var caption = el('p', 'mech-caption'); caption.setAttribute('aria-live', 'polite');
    controls.appendChild(caption);

    var stepList = el('ol', 'mech-steps'); localised(stepList, 'aria-label', 'mech.steps');
    var stepBtns = steps.map(function (st, i) {
      var li = el('li'), b = el('button'); b.type = 'button'; b.setAttribute('data-step-btn', String(i + 1)); b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'n', String(i + 1)));
      b.appendChild(pair(el('span'), st, 'step'));
      li.appendChild(b); stepList.appendChild(li);
      return b;
    });
    controls.appendChild(stepList);

    var bar = el('div', 'mech-bar');
    var seg = el('div', 'mech-seg'); seg.setAttribute('role', 'group'); localised(seg, 'aria-label', 'mech.repairGroup');
    var repairBtns = [];
    repairKeys.forEach(function (k) {
      var b = el('button', null, k.toUpperCase()); b.type = 'button'; b.setAttribute('data-repair-btn', k); b.setAttribute('aria-pressed', 'false');
      seg.appendChild(b); repairBtns.push(b);
    });
    var actions = el('div', 'mech-actions');
    var resetBtn = TP.bk(el('button', 'btn btn-line btn-sm'), 'mech.reset'); resetBtn.type = 'button';
    var playBtn = el('button', 'btn btn-dark btn-sm'); playBtn.type = 'button'; playBtn.setAttribute('aria-pressed', 'false');
    var icon = svg('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' });
    icon.appendChild(svg('path', { d: 'M7 4.5v15l13-7.5z' }));
    var playLabel = TP.bk(el('span'), 'mech.play');
    playBtn.appendChild(icon); playBtn.appendChild(playLabel);
    actions.appendChild(resetBtn); actions.appendChild(playBtn);
    bar.appendChild(seg); bar.appendChild(actions);
    controls.appendChild(bar);
    host.appendChild(stage); host.appendChild(controls);

    /* ----- the two repair cards under the diagram: choosing one jumps to step 3 with that repair ----- */
    var duo = el('div', 'duo mech-cards');
    repairKeys.forEach(function (k) {
      var r = repairs[k], b = el('button', 'repair-card'); b.type = 'button'; b.setAttribute('data-repair-btn', k); b.setAttribute('aria-pressed', 'false');
      b.appendChild(pair(el('span', 'label'), r, 'label'));
      b.appendChild(pair(el('p'), r, 'desc'));
      b.appendChild(TP.bk(el('span', 'hint'), 'mech.cardHint'));
      duo.appendChild(b); repairBtns.push(b);
    });
    if (host.insertAdjacentElement) host.insertAdjacentElement('afterend', duo); else host.parentNode.insertBefore(duo, host.nextSibling);

    /* ----- behaviour ----- */
    function set(step, repair) {
      host.setAttribute('data-step', String(step));
      if (repair) host.setAttribute('data-repair', repair);
      var rep = host.getAttribute('data-repair');
      stepBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-step-btn') === step)); });
      repairBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(step === 3 && b.getAttribute('data-repair-btn') === rep)); });
      if (step === 0) TP.bk(caption, 'mech.hint');
      else if (step < 3) pair(caption, steps[step - 1] || {}, 'caption');
      else pair(caption, repairs[rep] || {}, 'caption');
    }
    var timers = [];
    function stopPlay() {
      timers.forEach(clearTimeout); timers = [];
      playBtn.setAttribute('aria-pressed', 'false'); TP.bk(playLabel, 'mech.play');
    }
    stepBtns.forEach(function (b) { b.addEventListener('click', function () { stopPlay(); set(+b.getAttribute('data-step-btn')); }); });
    repairBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        stopPlay();
        set(3, b.getAttribute('data-repair-btn'));
        if (!host.contains(b) && host.scrollIntoView) host.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });   /* from a card: show the diagram */
      });
    });
    resetBtn.addEventListener('click', function () { stopPlay(); set(0); });
    playBtn.addEventListener('click', function () {
      if (timers.length) { stopPlay(); return; }
      playBtn.setAttribute('aria-pressed', 'true'); TP.bk(playLabel, 'mech.stop');
      var seq = [[1], [2], [3, repairKeys[0]], [3, repairKeys[1]]], gap = 1800;
      set(0);
      seq.forEach(function (st, i) { if (st[1] || st[0] < 3) timers.push(setTimeout(function () { set(st[0], st[1]); }, (i + 1) * gap)); });
      timers.push(setTimeout(function () { timers = []; stopPlay(); }, (seq.length + 1) * gap));
    });
    document.addEventListener('tp:lang', function () { set(+host.getAttribute('data-step'), host.getAttribute('data-repair')); });   /* caption follows a language switch */
    set(0, repairKeys[0]);
  }
})();
