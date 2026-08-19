/* ==========================================================================
   NEXORA OIL & GAS SERVICES LIMITED — interaction layer
   No dependencies. Every effect degrades to a usable static page.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- theme control ---
     The inline script in <head> has already applied the stored theme, so this
     only handles changing it. Dark is the default and the choice is remembered.
     Transitions are suppressed for the single frame of the swap: without that,
     the handful of elements that animate their background ease across while
     everything else snaps, which reads as a glitch rather than a change.
     ------------------------------------------------------------------------ */
  var THEME_KEY = 'nx-theme';
  var CHROME    = { dark: '#04121e', light: '#ffffff' };
  var themeBtn  = document.querySelector('[data-theme-toggle]');
  var root      = document.documentElement;

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(t, remember) {
    if (remember) {
      root.classList.add('is-themeswap');
      void root.offsetWidth;                        // flush, so the class lands
    }
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', CHROME[t]);
    if (themeBtn) {
      var label = 'Switch to ' + (t === 'light' ? 'dark' : 'light') + ' theme';
      themeBtn.setAttribute('title', label);
      var l = themeBtn.querySelector('[data-theme-label]');
      if (l) l.textContent = label;
    }
    if (remember) {
      try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { root.classList.remove('is-themeswap'); });
      });
    }
  }

  applyTheme(currentTheme(), false);                // sync the label and chrome
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
    });
  }

  /* ------------------------------------------------ current page in nav --- */
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
    if (a.getAttribute('data-nav').toLowerCase() === here) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ------------------------------------------------------- mobile drawer --- */
  var toggle = document.querySelector('[data-navtoggle]');
  var nav    = document.getElementById('primary-nav');
  var scrim  = document.querySelector('[data-navscrim]');

  function setNav(open) {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    if (scrim) scrim.classList.toggle('is-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.querySelector('[data-navtoggle-label]').textContent = open ? 'Close' : 'Menu';
    }
    document.body.style.overflowY = open ? 'hidden' : '';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('is-open'));
    });
  }
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) {
      setNav(false);
      if (toggle) toggle.focus();
    }
  });
  // Leaving the mobile breakpoint must not trap the page in drawer state
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) {
    if (m.matches) setNav(false);
  });

  /* ------------------------------------------------ staggered reveals ---
     The reveal below treats a block as one slab. That is right for a heading
     or a photograph and wrong for a group of rows: the rows ARE the sequence,
     so the rows should carry it. For the groups named here the container's
     `.rv` is handed down to its children at runtime, which leaves all four
     HTML files untouched and keeps one guarantee intact — the class that
     starts a row at opacity 0 is only ever applied when an observer exists to
     take it off again. No observer, no class, no invisible content.

     Delay is decided when a row arrives rather than assigned up front, and
     from the rows landing in the SAME observer callback, sorted by position on
     screen instead of position in the document so a grid cascades the way it
     is read. A row that comes into view on its own therefore waits for
     nothing: no part of this ever lags behind the scroll.
     ------------------------------------------------------------------- */
  if ('IntersectionObserver' in window && !reduced) {
    var STEP = new WeakMap();
    var STAGGER_CAP = 7;              // past this the tail is imperceptible
    var GROUPS = [
      /* container     rows               travels  ms apart */
      ['.svcindex',    '.svcindex__row',  true,    56],
      ['.method',      '.step',           true,    76],
      ['.grid3',       '.cell',           true,    66],
      ['.stmt',        '.stmt__b',        true,    86],
      ['.offices',     '.office',         true,    66],
      ['.facts',       '.fact',           true,    74],
      /* These fade without travelling. Shifting a `tr` fights the table's own
         layout, and the offerings lists sit inside a block that is already
         moving, so a second translate would read as slack rather than order. */
      ['.dataset',     'tbody tr',        false,   22],
      ['.speclist',    'li',              false,   18]
    ];

    var sio = new IntersectionObserver(function (entries) {
      var arrived = entries.filter(function (en) { return en.isIntersecting; });
      arrived.sort(function (a, b) {
        var dy = a.boundingClientRect.top - b.boundingClientRect.top;
        // Same row within a few pixels? Then order left to right.
        return Math.abs(dy) > 4 ? dy : a.boundingClientRect.left - b.boundingClientRect.left;
      });
      arrived.forEach(function (en, i) {
        var step = STEP.get(en.target) || 60;
        en.target.style.setProperty('--nx-d', (Math.min(i, STAGGER_CAP) * step) + 'ms');
        en.target.classList.add('is-in');
        sio.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    GROUPS.forEach(function (g) {
      Array.prototype.forEach.call(document.querySelectorAll(g[0]), function (box) {
        // Nothing above the fold: the hero runs its own load sequence, and a
        // page heading should be readable the instant it is painted.
        if (box.closest('.hero, .pagehead')) return;
        var rows = box.querySelectorAll(g[1]);
        if (!rows.length) return;
        box.classList.remove('rv', 'rv-d1', 'rv-d2', 'rv-d3');
        Array.prototype.forEach.call(rows, function (row) {
          STEP.set(row, g[3]);
          row.classList.add(g[2] ? 'nx-rv' : 'nx-soft');
          sio.observe(row);
        });
      });
    });

    /* Each section's rail draws itself down as the section is entered — the
       same gesture as the hero trace, at the scale of a single heading. */
    Array.prototype.forEach.call(document.querySelectorAll('.rail__line'), function (line) {
      line.classList.add('nx-rail');
      sio.observe(line);
    });
  }

  /* --------------------------------------------------- scroll reveals --- */
  var revealables = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || reduced) {
    Array.prototype.forEach.call(revealables, function (n) { n.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(revealables, function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------ read position ---
     How far through the document the reader has come, written to a custom
     property and drawn by `.masthead::after`. Throttled to one animation
     frame, and it reads only numbers the browser has already computed, so no
     layout is forced on a scroll.
     ---------------------------------------------------------------------- */
  var progressPending = false;

  function writeProgress() {
    progressPending = false;
    var span = root.scrollHeight - root.clientHeight;
    var seen = span > 8
      ? Math.min(Math.max((window.pageYOffset || root.scrollTop) / span, 0), 1)
      : 0;                                  // page does not scroll: no bar
    root.style.setProperty('--nx-prog', seen.toFixed(4));
  }

  function queueProgress() {
    if (progressPending) return;
    progressPending = true;
    requestAnimationFrame(writeProgress);
  }

  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress, { passive: true });
  writeProgress();

  /* -------------------------------------------------------- chart trace ---
     The hero's closing rule: a detector trace, drawn once, left to right.
     Built here rather than written into the markup because it states nothing
     — it is the visual form of the site's own argument, so a page that never
     gets it loses nothing a reader needed.
     One broad peak with a small second component on the tail, the shape a real
     detector writes. Monotonic in x, which is what lets a clip-path wipe pass
     for a pen. Baseline at 76 of 80 units, so it lands on the section divider
     at every viewport height.
     ---------------------------------------------------------------------- */
  var hero = document.querySelector('.hero');
  if (hero && !reduced) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var trace = document.createElementNS(SVGNS, 'svg');
    trace.setAttribute('class', 'hero__trace');
    trace.setAttribute('viewBox', '0 0 1200 80');
    trace.setAttribute('preserveAspectRatio', 'none');
    trace.setAttribute('aria-hidden', 'true');
    trace.setAttribute('focusable', 'false');

    var pen = document.createElementNS(SVGNS, 'path');
    pen.setAttribute('d',
      'M0 76 H420' +                       // baseline
      ' C462 76 486 68 508 52' +           // the rise begins
      ' C526 38 544 10 580 10' +           // apex, just left of centre
      ' C610 10 626 30 640 44' +           // the steep side of the fall
      ' C660 62 686 71 720 74' +           // and the long tail
      ' C760 76 790 76 830 76' +
      ' H880' +
      ' C906 76 918 66 934 60' +           // a second, minor component
      ' C948 55 960 62 972 71' +
      ' C980 74 988 76 1000 76' +
      ' H1200');
    /* Also set as an attribute, not only in CSS: older Safari honoured the
       presentation attribute but not the property, and without it the line
       thins to a hair on a phone and thickens on a wide monitor. */
    pen.setAttribute('vector-effect', 'non-scaling-stroke');
    trace.appendChild(pen);

    hero.appendChild(trace);
    hero.classList.add('nx-traced');       // gates the pen carriage in CSS
  }

  /* ------------------------------------------------- number counters --- */
  function countTo(el, target, decimals, prefix) {
    var start = performance.now();
    var dur = 900;
    function frame(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------ fact counters --- */
  var facts = document.querySelectorAll('[data-count]');
  if (facts.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(facts, function (f) {
        f.textContent = f.getAttribute('data-count');
      });
    } else {
      var fo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          countTo(
            el,
            parseFloat(el.getAttribute('data-count')),
            parseInt(el.getAttribute('data-decimals') || '0', 10),
            ''
          );
          fo.unobserve(el);
        });
      }, { threshold: 0.5 });
      Array.prototype.forEach.call(facts, function (f) { fo.observe(f); });
    }
  }

  /* ----------------------------------------------------- copyright year --- */
  var thisYear = new Date().getFullYear();
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (n) {
    n.textContent = thisYear;
  });

  /* ----------------------------------------------------- enquiry form ---
     Static site, no server. So rather than have the button report a result it
     cannot know, the fields are assembled into a message addressed to Nexora
     and handed to the visitor's own mail app: the send is real, they watch it
     happen, and nothing is asserted on Nexora's behalf.
     The form is never cleared — if no mail app opens, their typing is still
     there to copy, and the address is printed beside the form.
     Replace this whole block the day a mail endpoint exists.
     -------------------------------------------------------------------- */
  var form = document.querySelector('[data-form]');
  if (form) {
    var TO = 'info@nexoraeil.com';
    /* A mailto URL travels through the OS command line. Windows truncates at
       about 2 kB, so anything longer is refused outright rather than clipped
       and silently sent half-finished. */
    var URL_CEILING = 1900;

    var field = function (n) {
      var el = form.elements[n];
      return el && el.value ? String(el.value).trim() : '';
    };
    var say = function (note, text, ok) {
      note.textContent = text;
      note.classList.remove(ok ? 'is-warn' : 'is-ok');
      note.classList.add(ok ? 'is-ok' : 'is-warn');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('[data-formstatus]');

      if (!form.checkValidity()) {
        say(note, 'Some required fields are incomplete. Check the highlighted entries and send again.', false);
        var bad = form.querySelector(':invalid');
        if (bad) bad.focus();
        return;
      }

      var body = [
        'Name: ' + field('name'),
        'Company: ' + field('company'),
        'Email: ' + field('email'),
        'Telephone: ' + (field('phone') || 'not given'),
        'Enquiry type: ' + field('type'),
        'Location of operation: ' + (field('location') || 'not given'),
        '',
        field('brief'),
        '',
        'Sent from the enquiry form at nexoraeil.com'
      ].join('\r\n');

      var href = 'mailto:' + TO
        + '?subject=' + encodeURIComponent('Website enquiry: ' + field('company'))
        + '&body=' + encodeURIComponent(body);

      if (href.length > URL_CEILING) {
        say(note, 'This enquiry is too long to hand to your email app. Please send it to '
          + TO + ' instead — your text is still here, ready to copy.', false);
        return;
      }

      say(note, 'Your email app is opening with this enquiry ready to send to ' + TO
        + '. It is not sent until you press send there. If nothing opens, email us at that address.', true);
      window.location.href = href;
    });
  }
  /* ====================================================================
     LAYOUT DEBUGGER — off unless asked for.
     Append `#dbg` to any URL (or `?debug=layout`) and the page reports its
     own horizontal overflow: every box that reaches past the right edge is
     outlined in magenta and listed worst-first, with the headline number
     being scrollWidth − clientWidth, which is literally how many pixels the
     page can be dragged sideways. Built because three rounds of fixing this
     by reasoning about the CSS found real bugs but not the one that
     mattered. Measure, don't infer.
     ==================================================================== */
  function layoutAudit() {
    var vw = document.documentElement.clientWidth;
    var hits = [];
    var all = document.body.querySelectorAll('*');

    Array.prototype.forEach.call(all, function (el) {
      if (el.hasAttribute('data-dbg')) return;              // never audit the panel
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      var past = r.right - vw;
      var before = -r.left;
      var worst = Math.max(past, before);
      if (worst <= 1) return;
      el.style.outline = '2px solid #ff2d9b';
      el.style.outlineOffset = '-2px';
      hits.push({
        el: el,
        name: el.tagName.toLowerCase() +
              (el.id ? '#' + el.id : '') +
              (el.className && typeof el.className === 'string'
                ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
                : ''),
        w: Math.round(r.width),
        over: Math.round(worst),
        side: past >= before ? 'right' : 'left',
        pos: getComputedStyle(el).position
      });
    });

    hits.sort(function (a, b) { return b.over - a.over; });

    var scrollable = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    var panel = document.querySelector('[data-dbg]');
    if (!panel) {
      panel = document.createElement('div');
      panel.setAttribute('data-dbg', '');
      panel.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:9999;max-height:52vh;overflow:auto;' +
        'background:#0b0b12;color:#e8e8f0;font:11px/1.5 ui-monospace,Menlo,monospace;' +
        'padding:10px 12px;border-top:2px solid #ff2d9b;-webkit-overflow-scrolling:touch';
      document.body.appendChild(panel);
    }

    var rows = hits.slice(0, 14).map(function (h) {
      return '<div style="padding:3px 0;border-top:1px solid #24242e">' +
             '<b style="color:#ff2d9b">+' + h.over + 'px ' + h.side + '</b> &nbsp;' +
             h.name + '<br><span style="color:#8a8a9a">width ' + h.w +
             'px &middot; position:' + h.pos + '</span></div>';
    }).join('');

    panel.innerHTML =
      '<div style="display:flex;gap:10px;align-items:baseline;justify-content:space-between">' +
        '<b>LAYOUT AUDIT</b>' +
        '<button data-dbg-x style="background:#ff2d9b;color:#0b0b12;border:0;padding:3px 9px;' +
          'font:inherit;font-weight:700">CLOSE</button>' +
      '</div>' +
      '<div style="margin:6px 0 4px">viewport <b>' + vw + 'px</b> &middot; ' +
        'draggable sideways <b style="color:' + (scrollable > 0 ? '#ff2d9b' : '#5bc08a') + '">' +
        scrollable + 'px</b> &middot; offenders <b>' + hits.length + '</b></div>' +
      (hits.length
        ? rows
        : '<div style="color:#5bc08a;padding:4px 0">Nothing reaches past the viewport. ' +
          'Clean at this width.</div>');

    panel.querySelector('[data-dbg-x]').addEventListener('click', function () {
      panel.remove();
      Array.prototype.forEach.call(all, function (el) {
        el.style.outline = ''; el.style.outlineOffset = '';
      });
    });
  }

  if (/[?&]debug=layout\b/.test(location.search) || location.hash === '#dbg') {
    window.addEventListener('load', layoutAudit);
    var reaudit;
    window.addEventListener('resize', function () {
      clearTimeout(reaudit);
      reaudit = setTimeout(layoutAudit, 250);
    });
  }
})();
