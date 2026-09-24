/* =========================================================================
   Wish_Received.VR — link-builder.js
   Builds personalised experience URLs relative to wherever this site is
   deployed (GitHub Pages, local server…). No hardcoded repo/username.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var inName = $('#inName');
  var inRel = $('#inRel');
  var outUrl = $('#outUrl');
  var copyBtn = $('#copyBtn');
  var openBtn = $('#openBtn');
  var copyNote = $('#copyNote');

  /* Works both on GitHub Pages and when opened from disk (file://). */
  var base = './';
  try {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      base = location.href.replace(/[^/]*$/, '');
    }
  } catch (err) { /* keep './' */ }

  function build() {
    var n = inName.value.trim();
    var r = inRel.value.trim();
    var url = base;
    if (n || r) {
      url = base +
        '?name=' + encodeURIComponent(n) +
        '&relation=' + encodeURIComponent(r);
    }
    outUrl.value = url;
  }

  inName.addEventListener('input', build);
  inRel.addEventListener('input', build);

  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      inName.value = chip.getAttribute('data-name') || '';
      inRel.value = chip.getAttribute('data-rel') || '';
      build();
      inName.focus();
    });
  });

  copyBtn.addEventListener('click', function () {
    var text = outUrl.value;
    function done(ok) {
      copyNote.textContent = ok ? 'COPIED ✓ — READY TO SEND' : 'SELECT THE LINK AND COPY MANUALLY';
      copyNote.classList.toggle('copied', ok);
      setTimeout(function () {
        copyNote.textContent = 'TIP · PASTE DIRECTLY INTO WHATSAPP — IT STAYS PERSONALISED';
        copyNote.classList.remove('copied');
      }, 2600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      outUrl.removeAttribute('readonly');
      outUrl.select();
      outUrl.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      outUrl.setAttribute('readonly', '');
      window.getSelection && window.getSelection().removeAllRanges();
      done(ok);
    }
  });

  openBtn.addEventListener('click', function () {
    window.open(outUrl.value, '_blank', 'noopener');
  });

  build();
})();
