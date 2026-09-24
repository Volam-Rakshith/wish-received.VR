/* =========================================================================
   Wish_Received.VR — main.js
   Wiring: boot overlay, buttons + micro-interactions, sound toggle,
   global keyboard shortcuts. Depends on the modules loaded before it.
   ========================================================================= */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = window.VR && window.VR.sound;
  var FX = window.VR && window.VR.fx;
  var flow = window.VR && window.VR.flow;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- boot overlay ---------- */
  var boot = $('boot');
  var bootDismissed = false;
  function dismissBoot() {
    if (bootDismissed || !boot) return;
    bootDismissed = true;
    boot.classList.add('done');
    document.body.classList.remove('booting'); /* release the scene reveals */
    setTimeout(function () {
      if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    }, 700);
  }
  if (!boot) {
    /* already gone / stripped */
  } else if (RM) {
    dismissBoot();
  } else {
    setTimeout(dismissBoot, 1750);
    boot.addEventListener('pointerdown', dismissBoot);
    boot.addEventListener('click', dismissBoot);
  }

  /* ---------- micro VFX helper ---------- */
  function ringAt(el, color) {
    if (!FX || !el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    FX.ring(r.left + r.width / 2, r.top + r.height / 2, color);
  }

  /* ---------- scene buttons ---------- */
  var openBtn = $('openBtn');
  if (openBtn) {
    openBtn.addEventListener('click', function (e) {
      ringAt(e.currentTarget, '#3ee6ff');
      if (S) S.open();
      flow.show('access');
    });
  }

  var continueBtn = $('continueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      if (S) S.tap();
      flow.show('message');
    });
  }

  var moreBtn = $('moreBtn');
  if (moreBtn) {
    moreBtn.addEventListener('click', function (e) {
      ringAt(e.currentTarget, '#ff4fd8');
      if (S) S.tap();
      flow.show('final');
    });
  }

  var replayBtn = $('replayBtn');
  if (replayBtn) {
    replayBtn.addEventListener('click', function () {
      if (S) S.tap();
      flow.show('open');
    });
  }

  /* ---------- candle cake: tap to make a wish ---------- */
  var cakeBtn = $('cakeBtn');
  if (cakeBtn) {
    cakeBtn.addEventListener('click', function () {
      cakeBtn.classList.remove('flaring');
      void cakeBtn.offsetWidth;
      cakeBtn.classList.add('flaring');
      setTimeout(function () { cakeBtn.classList.remove('flaring'); }, 700);
      if (FX) {
        var f = cakeBtn.querySelector('.flame');
        var r = (f || cakeBtn).getBoundingClientRect();
        FX.ring(r.left + r.width / 2, r.top + r.height / 2, '#ffd166');
        setTimeout(function () {
          FX.ring(r.left + r.width / 2, r.top + r.height / 2, '#ff9d3f');
        }, 130);
      }
      if (S) S.chime();
    });
  }

  /* ---------- share button removed ---------- */
  var shareBtn = $('shareBtn');
  if (shareBtn && shareBtn.parentNode) {
    shareBtn.parentNode.removeChild(shareBtn); /* safety no-op if any markup lingers */
  }

  /* ---------- sound toggle (OFF by default) ---------- */
  var soundToggle = $('soundToggle');
  if (soundToggle && S) {
    soundToggle.addEventListener('click', function () {
      var on = S.toggle();
      soundToggle.classList.toggle('is-on', on);
      soundToggle.setAttribute('aria-pressed', String(on));
      soundToggle.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
      if (on) S.tap(); /* instant audible confirmation */
    });
  } else if (soundToggle) {
    soundToggle.style.display = 'none';
  }

  /* ---------- global keyboard support ----------
     Enter / Space / → trigger the current scene's primary action when no
     control is focused. While the access terminal is playing, keys fast-
     forward it first (first key = skip, next key = advance). */
  document.addEventListener('keydown', function (e) {
    var isEnter = e.key === 'Enter';
    var isSpace = e.key === ' ' || e.key === 'Spacebar';
    if (!isEnter && !isSpace && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Escape') return;

    if (flow.isSeqRunning()) {
      flow.finishSeq();
      return;
    }

    if (!isEnter && !isSpace && e.key !== 'ArrowRight') return;

    var ae = document.activeElement;
    if (ae && ae !== document.body) {
      var tag = ae.tagName;
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    }

    var scene = document.querySelector('.scene.is-active');
    if (!scene) return;
    var btn = scene.querySelector('.seq-gate.on .btn') || scene.querySelector('.btn:not(.seq-gate .btn)');
    if (btn && !btn.disabled) {
      e.preventDefault();
      btn.click();
    }
  });
})();
