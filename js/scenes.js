/* =========================================================================
   Wish_Received.VR — scenes.js
   Linear 4-scene flow (open → access → message → final) with:
     · staggered CSS transitions (classes only, no inline style churn)
     · a skippable "ACCESS GRANTED" terminal sequence
     · confetti + fanfare on the finale
     · progress dots with back-navigation to visited scenes
   ========================================================================= */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = window.VR && window.VR.sound;

  var FLOW = ['open', 'access', 'message', 'final'];
  var els = {};
  FLOW.forEach(function (id) { els[id] = document.getElementById('scene-' + id); });

  var current = 'open';
  var visited = { open: true };
  var onChange = [];

  /* ----- access-sequence elements ----- */
  var seqEls = {
    granted: document.getElementById('grantedBlock'),
    lines: [
      { root: document.getElementById('line1') },
      { root: document.getElementById('line2') }
    ],
    rel: document.getElementById('relBlock'),
    guest: document.getElementById('guestLine'),
    tease: document.getElementById('teaseLine'),
    cta: document.getElementById('continueBtn')
  };
  seqEls.lines.forEach(function (l) {
    l.tt = l.root.querySelector('.tt');
    l.ok = l.root.querySelector('.ok');
  });

  var seqTimers = [];
  var seqDone = true;
  var seqStarted = false;

  /* event bus: enhance.js listens for these to layer on the big VFX */
  function emit(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (err) { /* older browsers: events are optional sugar */ }
  }

  function clearTimers() {
    seqTimers.forEach(clearTimeout);
    seqTimers = [];
  }
  function at(ms, fn) { seqTimers.push(setTimeout(fn, ms)); }

  /* Reset the terminal so it can replay cleanly. */
  function prepSeq() {
    seqEls.lines.forEach(function (l) {
      if (!l.tt.getAttribute('data-text')) {
        l.tt.setAttribute('data-text', l.tt.textContent);
      }
      l.tt.textContent = RM ? l.tt.getAttribute('data-text') : '';
      if (l.ok) l.ok.classList.remove('show');
      l.root.classList.remove('typing');
    });
    els.access.querySelectorAll('.seq, .seq-gate').forEach(function (el) {
      el.classList.remove('on');
    });
    var pct = document.getElementById('pct');
    if (pct) pct.textContent = '0%';
    if (seqEls.granted) {
      var g = seqEls.granted.querySelector('.granted');
      if (g) g.classList.remove('chroma');
    }
    seqDone = false;
  }

  function typeLine(l, idx) {
    var text = l.tt.getAttribute('data-text');
    var i = 0;
    l.root.classList.add('on');   /* reveal the line… */
    l.root.classList.add('typing'); /* …then type it out */
    emit('vr:typing', { i: idx || 0 });
    (function tickTock() {
      if (seqDone) return;
      l.tt.textContent = text.slice(0, ++i);
      if (i % 3 === 0 && S) S.tick();
      if (i < text.length) {
        seqTimers.push(setTimeout(tickTock, 14 + Math.random() * 22));
      } else {
        l.root.classList.remove('typing');
        if (l.ok) l.ok.classList.add('show');
      }
    })();
  }

  function finishAccess() {
    if (seqDone) return;
    seqDone = true;
    clearTimers();
    seqEls.lines.forEach(function (l) {
      l.root.classList.remove('typing');
      l.root.classList.add('on');
      l.tt.textContent = l.tt.getAttribute('data-text');
      if (l.ok) l.ok.classList.add('show');
    });
    els.access.querySelectorAll('.seq, .seq-gate').forEach(function (el) {
      el.classList.add('on');
    });
    emit('vr:seqdone', {});
  }

  function runAccess() {
    prepSeq();
    seqStarted = true;
    if (RM) { finishAccess(); return; }

    at(140, function () {
      seqEls.granted.classList.add('on');
      emit('vr:granted', {});
      if (S) S.unlock();
    });
    at(700, function () { typeLine(seqEls.lines[0], 0); });
    at(1560, function () { typeLine(seqEls.lines[1], 1); });
    at(2400, function () {
      seqEls.rel.classList.add('on');
      emit('vr:relation', {});
    });
    at(2800, function () { seqEls.guest.classList.add('on'); });
    at(3100, function () { seqEls.tease.classList.add('on'); });
    at(3450, finishAccess);
  }

  /* ----- skip: any tap during the sequence completes it instantly -----
     (keyboard skipping is handled centrally in main.js) */
  els.access.addEventListener('pointerdown', function () {
    if (seqStarted && !seqDone) finishAccess();
  });

  /* ----- progress dots ----- */
  var dots = Array.prototype.slice.call(document.querySelectorAll('.progress .dot'));
  function updateDots() {
    dots.forEach(function (d) {
      var t = d.getAttribute('data-goto');
      d.classList.toggle('active', t === current);
      d.classList.toggle('done', !!visited[t] && t !== current);
    });
  }
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var t = d.getAttribute('data-goto');
      if (visited[t]) {
        if (S) S.tap();
        show(t);
      }
    });
  });

  /* ----- scene switching ----- */
  function show(id) {
    if (!els[id] || id === current) return;
    clearTimers();
    seqDone = true;

    var from = els[current];
    var to = els[id];

    from.classList.add('is-leaving');
    from.classList.remove('is-active');

    to.classList.remove('is-leaving');
    void to.offsetWidth; /* force reflow so child animations restart */
    to.classList.add('is-active');

    var prev = current;
    current = id;
    visited[id] = true;

    /* ambience: tint shift + warp streaks + event bus */
    document.body.setAttribute('data-scene', id);
    if (window.VR && window.VR.fx && window.VR.fx.warp) window.VR.fx.warp();
    emit('vr:scene', { id: id, prev: prev });

    updateDots();

    var f = to.querySelector('[data-focus]');
    if (f) f.focus({ preventScroll: true });

    if (id === 'access') runAccess();
    if (id === 'final') {
      setTimeout(function () {
        if (window.VR && window.VR.fx) window.VR.fx.celebrate();
        if (S) S.fanfare();
      }, RM ? 60 : 420);
    }

    for (var i = 0; i < onChange.length; i++) onChange[i](id);
  }

  /* Expose a tiny flow API for main.js */
  window.VR = window.VR || {};
  window.VR.flow = {
    show: show,
    isSeqRunning: function () { return seqStarted && !seqDone; },
    finishSeq: finishAccess,
    onChange: function (fn) { onChange.push(fn); }
  };

  document.body.setAttribute('data-scene', current);
  updateDots();
})();
