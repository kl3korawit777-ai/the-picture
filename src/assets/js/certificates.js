/* The Picture — certificate strip (optional module). Loaded before main.js on the portfolio page.
   main.js builds the certificate cards from data/certificates.json as a plain grid, then calls
   TP.certs.enhance(gridElement).
   - fewer than 4 cards: nothing happens, it stays the plain grid
   - 4 or more, normal motion: a strip drifting right to left at a steady 40 px/s however many cards there are, with soft left and right
     edges. It is made seamless by a second copy of the cards (aria-hidden + inert). It stops on hover, on keyboard focus,
     and while off screen.
   - 4 or more, reduced motion: no drifting, no copy: a row you swipe or scroll yourself (focusable, so the keyboard can scroll it)
   Clicking a card opens the lightbox in main.js; cards share a data-zoom-group so the lightbox can page through them.
   No visible text is written here: labels come from data/i18n.json through the helpers main.js shares as window.TP. */
(function () {
  var TP = window.TP = window.TP || {};
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var SPEED = 40;          /* pixels per second */
  var MIN_FOR_STRIP = 4;

  function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function enhance(host, options) {
    var cards = Array.prototype.slice.call(host.children);
    if (cards.length < MIN_FOR_STRIP) return;                    /* a few certificates: the grid is better */

    var reduce = !!(mqReduce && mqReduce.matches);
    var wrap = mk('div', 'marquee-wrap'), strip = mk('div', 'marquee');
    host.parentNode.insertBefore(wrap, host);
    wrap.appendChild(strip);
    strip.appendChild(host);
    host.className = 'marquee-track';
    strip.setAttribute('role', 'region');
    var label = function () { strip.setAttribute('aria-label', TP.tr(TP.lang(), 'pf.certs')); };
    label(); document.addEventListener('tp:lang', label);

    if (reduce) {                                                /* a row to swipe or scroll yourself */
      strip.classList.add('is-scroll');
      strip.tabIndex = 0;                                        /* a scrollable area must be reachable by keyboard */
      return;
    }

    /* the second copy that makes the loop seamless: hidden from assistive technology and not focusable */
    cards.forEach(function (card) {
      var copy = card.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('inert', '');
      Array.prototype.forEach.call(copy.querySelectorAll('a, button'), function (el) { el.tabIndex = -1; });   /* browsers without inert */
      host.appendChild(copy);
    });

    /* distance of one full set (cards + gaps) and the time to travel it at SPEED px/s */
    function measure() {
      var gap = parseFloat(window.getComputedStyle(host).columnGap) || 0;
      var dist = (host.scrollWidth + gap) / 2;
      host.style.setProperty('--dist', dist + 'px');
      host.style.setProperty('--dur', (dist / SPEED) + 's');
    }
    measure();
    strip.classList.add('is-moving');
    if (window.ResizeObserver) new ResizeObserver(measure).observe(host); else window.addEventListener('resize', measure);

    /* no need to animate while it is not on screen */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { strip.classList.toggle('is-offscreen', !es[es.length - 1].isIntersecting); }).observe(strip);
    }
  }

  TP.certs = { enhance: enhance };
})();
