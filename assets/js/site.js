/* Champs Musical Coffee Shop Productions
   Motion only. Nothing here is required to read the page — with JS off or
   reduced-motion on, every section is already in its final state. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Hero title sequence: once per browser session ------------------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var played = false;
    try { played = sessionStorage.getItem('champs:seq') === '1'; } catch (e) { played = false; }
    if (played || reduced) {
      hero.classList.add('no-seq');
    } else {
      hero.classList.add('seq');
      try { sessionStorage.setItem('champs:seq', '1'); } catch (e) {}
    }
  }

  /* ---- Section activation: reveals + cut-out arrival -------------------- */
  var bands = document.querySelectorAll('.band');

  if (reduced || !('IntersectionObserver' in window)) {
    bands.forEach(function (b) { b.classList.add('is-active'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('is-active', en.isIntersecting);
      });
    }, { rootMargin: '-12% 0px -12% 0px' });
    bands.forEach(function (b) { io.observe(b); });

    // The hero is above the fold; activate it immediately so nothing waits.
    if (hero) hero.classList.add('is-active');
  }

  /* ---- Parallax: backgrounds drift slower than the content over them ---- */
  var bgs = document.querySelectorAll('.band__bg');
  if (!reduced && bgs.length) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var vh = window.innerHeight;
        bgs.forEach(function (bg) {
          var r = bg.parentElement.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var progress = (r.top + r.height / 2 - vh / 2) / vh; // -1 .. 1
          bg.style.setProperty('--py', (progress * -46).toFixed(1) + 'px');
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Magnetic buttons: a few pixels toward the cursor, then settle ---- */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        btn.style.setProperty('--mx', dx.toFixed(1) + 'px');
        btn.style.setProperty('--my', dy.toFixed(1) + 'px');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---- Scrollspy: highlight the nav link for the section in view -------- */
  var spy = document.querySelectorAll('.nav a[data-spy]');
  if (spy.length && 'IntersectionObserver' in window) {
    var byId = {};
    spy.forEach(function (a) { byId[a.getAttribute('data-spy')] = a; });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = byId[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          spy.forEach(function (x) { x.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'page');
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sio.observe(el);
    });
  }
})();
