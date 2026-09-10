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

  /* ---- Video hero: home page only --------------------------------------
     Three things happen here, in order:
       1. the clip is held until it can actually paint a frame, then the disc
          fades up and glides from the section's centre to the right;
       2. the copy is released at the same moment, by handing the hero the
          .is-active class the other bands get from the observer;
       3. the pour runs once end to end, then hands over to the tail clip,
          which loops itself forever.

     On (3): the pour is one continuous motion, so restarting it from zero is
     a visible cut -- frame 0 against the last frame is a ~33x jump next to
     one ordinary frame step, where re-entering at 4.00s is ~3x and reads as
     nothing. 4.00s is also where the comp's own scene table marks the pour
     as finished. That re-entry is a separate 25-frame file rather than a
     seek because the source carries a single keyframe at frame 0: seeking
     back would re-decode 96 frames and stall on every repeat, and would need
     range requests the host may not serve. Two clips, no seeking. */
  var vhero = document.querySelector('.hero--video');
  if (vhero) {
    var pour = vhero.querySelector('.hero__video--pour');
    var tail = vhero.querySelector('.hero__video--tail');
    var released = false;

    var release = function () {
      if (released) return;
      released = true;
      vhero.classList.add('is-ready', 'is-active');
    };

    // Autoplay is only allowed muted. The attribute is in the markup, but set
    // the property too, since it is the property the policy actually reads.
    [pour, tail].forEach(function (v) { if (v) v.muted = true; });

    var playSafely = function (v) {
      if (!v) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    };

    if (!pour) {
      release();
    } else if (reduced) {
      // No pour. Rest on the tail's first frame, which is the poured cup the
      // loop settles on anyway, and reveal at once. currentTime is left at 0,
      // so this needs no seek either.
      vhero.classList.add('is-tail');
      release();
    } else {
      // Get the tail rolling while it is still invisible, so the handover
      // itself is only an opacity flip. Calling play() at the moment of the
      // cut is what fails in practice -- a stalled or partial fetch rejects
      // it and the hero freezes on one frame -- and by then there is no time
      // left to recover. Started early it has the whole pour to succeed.
      if (tail) {
        if (tail.readyState >= 2) playSafely(tail);
        else tail.addEventListener('loadeddata', function () { playSafely(tail); });
      }

      pour.addEventListener('ended', function () {
        if (tail) {
          // Cheap: time 0 is the tail's own keyframe, so this never decodes
          // forward or asks the host for a byte range.
          try { tail.currentTime = 0; } catch (e) {}
          if (tail.paused) playSafely(tail);   // backstop if the early start failed
        }
        vhero.classList.add('is-tail');
        pour.pause();          // stop decoding a clip nobody can see
      });

      var begin = function () {
        playSafely(pour);
        release();
      };
      pour.addEventListener('loadeddata', begin);
      // Blocked autoplay, a decode error or a stalled network must never cost
      // the reader the headline.
      pour.addEventListener('error', release);
      setTimeout(release, 2000);
      if (pour.readyState >= 2) begin();
    }
  }

  /* ---- Section activation: reveals + cut-out arrival -------------------- */
  // The video hero owns its own activation -- it holds the copy back until
  // the clip is ready -- so it is left out of both paths below.
  var bands = Array.prototype.filter.call(
    document.querySelectorAll('.band'),
    function (b) { return !b.classList.contains('hero--video'); }
  );

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
    if (hero && !hero.classList.contains('hero--video')) hero.classList.add('is-active');
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
