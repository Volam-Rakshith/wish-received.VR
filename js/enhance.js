/* =========================================================================
   Wish_Received.VR — enhance.js
   Listens for scene-flow events (emitted by scenes.js) and layers on the
   big moments:
     · ACCESS GRANTED → screen flash + micro shake + text decode + ring burst
     · terminal typing → live percentage counter on the verify line
     · message scene   → soft energy rings behind the title
     · buttons         → ripple micro-interaction on every press
   ========================================================================= */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var doc = document;
  var FX = window.VR && window.VR.fx;
  var TFX = window.VR && window.VR.textfx;

  var stage = doc.getElementById('stage');
  var flash = doc.getElementById('flash');
  var accessCard = doc.getElementById('accessCard');
  var grantedH2 = doc.querySelector('.t-granted .granted');
  var pctEl = doc.getElementById('pct');
  var pctTimer = 0;

  /* ---------- helpers ---------- */
  function replayClass(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function clearClassLater(el, cls, ms) {
    setTimeout(function () {
      if (el) el.classList.remove(cls);
    }, ms);
  }

  /* ---------- ACCESS GRANTED: flash + shake + decode + rings ---------- */
  doc.addEventListener('vr:granted', function () {
    if (grantedH2) {
      replayClass(grantedH2, 'chroma');
      if (TFX) TFX.scramble(grantedH2, 'ACCESS GRANTED', { dur: 720 });
      clearClassLater(grantedH2, 'chroma', 1400);
    }
    if (!RM) {
      if (flash) replayClass(flash, 'boom');
      if (stage) replayClass(stage, 'shake');
    }
    if (FX && accessCard) {
      var r = accessCard.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      FX.ring(cx, cy, '#3ee6ff');
      setTimeout(function () { FX.ring(cx, cy, '#8b5cf6'); }, 160);
      setTimeout(function () { FX.ring(cx, cy, '#ff4fd8'); }, 320);
    }
  });

  /* ---------- typing percentage counter ---------- */
  function stopPct(finalValue) {
    if (pctTimer) { clearInterval(pctTimer); pctTimer = 0; }
    if (pctEl && finalValue != null) pctEl.textContent = finalValue;
  }
  doc.addEventListener('vr:typing', function (e) {
    if (e.detail && e.detail.i === 0 && pctEl && !RM) {
      stopPct(null);
      var v = 0;
      pctEl.textContent = '0%';
      pctTimer = setInterval(function () {
        v = Math.min(100, v + Math.round(4 + Math.random() * 11));
        pctEl.textContent = v + '%';
        if (v >= 100) stopPct('100%');
      }, 42);
    }
  });
  doc.addEventListener('vr:seqdone', function () { stopPct('100%'); });

  /* ---------- RELATIONSHIP DETECTED: decode the relation ---------- */
  doc.addEventListener('vr:relation', function () {
    var relEl = doc.querySelector('[data-slot="relation"]');
    if (relEl && TFX && !RM) {
      replayClass(relEl, 'chroma');
      TFX.scramble(relEl, relEl.textContent, { dur: 850 });
      clearClassLater(relEl, 'chroma', 1600);
    }
  });

  /* ---------- per-scene touches ---------- */
  doc.addEventListener('vr:scene', function (e) {
    var id = e.detail && e.detail.id;
    if (id === 'message' && FX && !RM) {
      setTimeout(function () {
        FX.ring(window.innerWidth / 2, window.innerHeight / 2, '#8b5cf6');
      }, 350);
      setTimeout(function () {
        FX.ring(window.innerWidth / 2, window.innerHeight / 2, '#3ee6ff');
      }, 650);
    }
  });

  /* ---------- button ripple micro-interaction ---------- */
  doc.addEventListener('pointerdown', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.btn') : null;
    if (!btn || RM) return;
    var r = btn.getBoundingClientRect();
    var d = Math.max(r.width, r.height) * 1.15;
    var s = doc.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d / 2) + 'px';
    s.style.top = (e.clientY - r.top - d / 2) + 'px';
    btn.appendChild(s);
    setTimeout(function () {
      if (s.parentNode) s.parentNode.removeChild(s);
    }, 700);
  }, { passive: true });
})();
