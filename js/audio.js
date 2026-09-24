/* =========================================================================
   Wish_Received.VR — audio.js
   Tiny WebAudio synth for optional UI sounds + a soft ambient music bed.
   Sound is OFF by default and only ever starts after the user
   explicitly toggles it on (browser gesture-safe).
   ========================================================================= */
(function () {
  'use strict';

  var ctx = null;
  var master = null;
  var enabled = false;

  /* --- music bed nodes --- */
  var musicNodes = null;
  var bellTimer = 0;

  function ensure() {
    if (!enabled) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return null; }
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.32; /* keep everything gentle */
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (err) {
      enabled = false;
      return null;
    }
  }

  /* One soft synthesised note. */
  function tone(freq, opts) {
    var c = ensure();
    if (!c) return;
    opts = opts || {};
    var t = opts.t || 0;
    var dur = opts.dur || 0.3;
    var type = opts.type || 'sine';
    var gain = opts.gain || 0.07;

    var osc = c.createOscillator();
    var g = c.createGain();
    var now = c.currentTime + t;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.glide, now + dur);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.08);
  }

  /* ---------- ambient music bed (very soft, breathes slowly) ---------- */
  var PAD = [130.81, 196.0, 261.63, 329.63]; /* C3 · G3 · C4 · E4 — warm open chord */
  var BELLS = [523.25, 587.33, 659.25, 783.99, 880.0];

  function startMusic() {
    var c = ensure();
    if (!c || musicNodes) return;

    var bus = c.createGain();
    bus.gain.value = 0.0001;
    var filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.4;

    /* slow breathing LFO on the bus gain */
    var lfo = c.createOscillator();
    var lfoGain = c.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);

    var oscs = PAD.map(function (f, i) {
      var o = c.createOscillator();
      o.type = i < 2 ? 'triangle' : 'sine';
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004); /* gentle detune */
      o.connect(filter);
      o.start();
      return o;
    });

    filter.connect(bus);
    bus.connect(master);
    lfo.connect(bus.gain);
    lfo.start();

    /* fade the pad in */
    bus.gain.setTargetAtTime(0.05, c.currentTime, 1.2);

    /* an occasional distant bell, rare and quiet */
    bellTimer = setInterval(function () {
      if (!enabled || !ctx) return;
      var f = BELLS[(Math.random() * BELLS.length) | 0];
      tone(f, { dur: 1.6, type: 'sine', gain: 0.018 });
      if (Math.random() < 0.4) tone(f * 1.5, { t: 0.25, dur: 1.4, type: 'sine', gain: 0.012 });
    }, 7400);

    musicNodes = { bus: bus, oscs: oscs, lfo: lfo };
  }

  function stopMusic() {
    if (bellTimer) { clearInterval(bellTimer); bellTimer = 0; }
    if (!musicNodes || !ctx) { musicNodes = null; return; }
    var n = musicNodes;
    musicNodes = null;
    try {
      n.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.35);
      setTimeout(function () {
        n.oscs.forEach(function (o) { try { o.stop(); } catch (err) {} });
        try { n.lfo.stop(); } catch (err) {}
        try { n.bus.disconnect(); } catch (err) {}
      }, 1300);
    } catch (err) { /* already gone */ }
  }

  window.VR = window.VR || {};

  window.VR.sound = {
    get enabled() { return enabled; },
    toggle: function () {
      enabled = !enabled;
      if (enabled) {
        ensure();
        startMusic();
      } else {
        stopMusic();
      }
      return enabled;
    },
    /* tiny confirmation click */
    tap: function () { tone(640, { dur: 0.12, type: 'triangle', gain: 0.05 }); },
    /* terminal unlock: two rising notes */
    unlock: function () {
      tone(392, { dur: 0.2, type: 'sine', gain: 0.06 });
      tone(784, { t: 0.1, dur: 0.36, type: 'triangle', gain: 0.065 });
    },
    /* typewriter tick */
    tick: function () { tone(1180, { dur: 0.045, type: 'square', gain: 0.012 }); },
    /* opening the wish: warm 3-note chime */
    open: function () {
      [523.25, 659.25, 783.99].forEach(function (f, i) {
        tone(f, { t: i * 0.075, dur: 0.5, type: 'triangle', gain: 0.055 });
      });
    },
    /* candle tap: sparkly wish chime */
    chime: function () {
      tone(1046.5, { dur: 0.5, type: 'sine', gain: 0.05 });
      tone(1568.0, { t: 0.09, dur: 0.6, type: 'sine', gain: 0.04 });
      tone(2093.0, { t: 0.18, dur: 0.7, type: 'sine', gain: 0.028 });
    },
    /* finale: gentle 4-note arpeggio + low pad */
    fanfare: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(f, { t: i * 0.1, dur: 0.55, type: 'sine', gain: 0.065 });
      });
      tone(261.63, { dur: 1.0, type: 'triangle', gain: 0.045 });
      tone(1318.5, { t: 0.42, dur: 0.7, type: 'sine', gain: 0.045 });
    }
  };
})();
