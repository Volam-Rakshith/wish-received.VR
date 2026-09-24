/* =========================================================================
   Wish_Received.VR — textfx.js
   · split(el)        → wraps every grapheme (emoji-safe) in <span class="ch">
                        with a --ci index for staggered CSS reveals
   · scramble(el, txt)→ "ACCESS GRANTED"-style decode animation
   Honours prefers-reduced-motion (instant results, no animation).
   ========================================================================= */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- grapheme-safe clustering ----------
     Keeps emoji + variation selectors (❤️), ZWJ sequences and combining
     marks together so letters never split mid-glyph. */
  function graphemes(str) {
    var chars = Array.from(String(str));
    var out = [];
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var cp = c.codePointAt(0);
      var isJoiner =
        (cp >= 0xFE00 && cp <= 0xFE0F) ||  /* variation selectors */
        cp === 0x200D ||                    /* ZWJ */
        (cp >= 0x0300 && cp <= 0x036F);     /* combining marks */
      if (isJoiner && out.length) {
        out[out.length - 1] += c;
        if (cp === 0x200D && i + 1 < chars.length) {
          /* glue the ZWJ-joined glyph too (and any VS after it) */
          out[out.length - 1] += chars[++i];
          if (i + 1 < chars.length) {
            var nx = chars[i + 1].codePointAt(0);
            if (nx >= 0xFE00 && nx <= 0xFE0F) out[out.length - 1] += chars[++i];
          }
        }
      } else {
        out.push(c);
      }
    }
    return out;
  }

  /* ---------- letter splitting for staggered reveals ---------- */
  function split(root) {
    if (!root || root.getAttribute('data-split-done')) return;
    root.setAttribute('data-split-done', '1');
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          graphemes(child.textContent).forEach(function (g) {
            var s = document.createElement('span');
            s.className = 'ch';
            s.style.setProperty('--ci', i++);
            s.textContent = g;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('ch')) {
          if (child.style) child.style.setProperty('--ci', i++);
          walk(child);
        }
      });
    })(root);
    root.classList.add('letters');
  }

  /* ---------- decode / scramble ---------- */
  function scramble(el, text, opts) {
    if (!el) return;
    opts = opts || {};
    text = String(text);
    if (RM || !window.requestAnimationFrame) { el.textContent = text; return; }

    var glyphs = graphemes(text);
    var pool = opts.pool || '\u2591\u2592\u2593<>/\\|=+*#%@01';
    var dur = opts.dur || 780;
    var t0 = 0;

    function ease(t) { return t * t * (3 - 2 * t); }

    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var solved = Math.floor(ease(p) * glyphs.length);
      var out = '';
      for (var i = 0; i < glyphs.length; i++) {
        var g = glyphs[i];
        if (g === ' ' || g === '\u00a0') { out += g; continue; }
        out += i < solved ? g : pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = text;
      }
    }
    requestAnimationFrame(frame);
  }

  /* auto-split anything tagged in the HTML */
  function init() {
    var els = document.querySelectorAll('[data-letters]');
    for (var i = 0; i < els.length; i++) split(els[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.VR = window.VR || {};
  window.VR.textfx = { split: split, scramble: scramble, graphemes: graphemes };
})();
