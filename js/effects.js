/* =========================================================================
   Wish_Received.VR — effects.js  (v2)
   One fixed Canvas 2D layer driving:
     · ambient dust that STRETCHES INTO WARP STREAKS on scene transitions
     · elegant confetti (gravity + flutter + squash)
     · FIREWORKS — rockets with trails that burst into twinkling sparks
     · expanding energy rings (button taps / reveals)
     · cursor sparkle trail (desktop, fine pointers)
     · smoothed pointer parallax (--par-x / --par-y CSS vars)
   Honours prefers-reduced-motion: one calm static frame, no loops.
   Performance: pre-rendered glow sprites (no shadowBlur), DPR cap 2,
   hard particle caps, loop pauses when the tab is hidden.
   ========================================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('fx');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var PALETTE = ['#3ee6ff', '#3d7bff', '#8b5cf6', '#ff4fd8', '#ff9ecf', '#ffffff'];
  var SPARK_PALETTE = PALETTE.concat(['#ffd166', '#ffe9a8']); /* fireworks get gold */

  var W = 0, H = 0;
  var dust = [], confetti = [], rings = [], rockets = [], sparks = [], trail = [];
  var raf = 0, running = false;

  /* warp: speed eases toward warpT; warpT relaxes back to 1 */
  var speed = 1, warpT = 1;

  /* pointer parallax: target vs smoothed */
  var tpx = 0, tpy = 0, px = 0, py = 0;

  /* ---------- helpers ---------- */
  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* Pre-rendered soft glow sprites — far cheaper than shadowBlur. */
  function makeGlowSprite(color) {
    var s = document.createElement('canvas');
    s.width = s.height = 64;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(color, 0.9));
    g.addColorStop(0.28, rgba(color, 0.32));
    g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    return s;
  }
  var SPRITES = PALETTE.map(makeGlowSprite);
  var SPARK_SPRITES = SPARK_PALETTE.map(makeGlowSprite);

  function scaleFit() { return Math.max(0.65, Math.min(1.25, Math.min(W, H) / 780)); }

  /* ---------- sizing & dust ---------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2); /* cap DPR for mobile GPUs */
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildDust();
    if (RM) drawStatic();
  }

  function buildDust() {
    var target = RM ? 22 : Math.max(24, Math.min(90, Math.round((W * H) / 22000)));
    dust = [];
    for (var i = 0; i < target; i++) dust.push(makeDust());
  }

  function makeDust() {
    var z = Math.random(); /* depth: 0 far → 1 near */
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      z: z,
      r: 1.4 + z * 3.2,
      a: 0.05 + z * 0.2,
      vx: (Math.random() - 0.5) * 0.06 * (0.4 + z),
      vy: -(0.04 + Math.random() * 0.14) * (0.4 + z),
      ph: Math.random() * Math.PI * 2,
      ts: 0.3 + Math.random() * 1.1,
      sp: SPRITES[(Math.random() * SPRITES.length) | 0]
    };
  }

  /* ---------- confetti ---------- */
  function spawnBurst(x, y, count, angle, spread, power) {
    if (RM) return;
    var s = scaleFit();
    for (var i = 0; i < count; i++) {
      if (confetti.length > 230) confetti.shift(); /* hard cap */
      var a = angle + (Math.random() - 0.5) * spread;
      var v = (4.6 + Math.random() * 6.4) * s * power;
      confetti.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 0.085 * s,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.28,
        wob: Math.random() * Math.PI * 2,
        ws: 0.05 + Math.random() * 0.12,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        round: Math.random() < 0.28,
        life: 0,
        max: 240 + Math.random() * 90
      });
    }
  }

  /* ---------- fireworks ---------- */
  function firework(xFrac, yFrac) {
    if (RM) return;
    if (rockets.length > 5) return;
    var s = scaleFit();
    rockets.push({
      x: W * xFrac + (Math.random() - 0.5) * W * 0.08,
      y: H + 8,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -(8.6 + Math.random() * 2.6) * s,
      ty: H * (yFrac || (0.22 + Math.random() * 0.16)),
      hue: SPARK_SPRITES[(Math.random() * SPARK_SPRITES.length) | 0],
      s: s
    });
  }

  function explode(r) {
    var n = Math.round((46 + Math.random() * 20) * r.s);
    var golden = Math.random() < 0.35;
    for (var i = 0; i < n; i++) {
      if (sparks.length > 340) sparks.shift(); /* hard cap */
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.12;
      var v = (1.4 + Math.random() * 3.1) * r.s;
      sparks.push({
        x: r.x, y: r.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 0.028 * r.s,
        drag: 0.982,
        r: 1.1 + Math.random() * 1.9,
        a: 0.85,
        ph: Math.random() * Math.PI * 2,
        tw: 0.15 + Math.random() * 0.3,
        life: 0,
        max: 62 + Math.random() * 52,
        sp: golden ? SPARK_SPRITES[SPARK_SPRITES.length - 1 - ((Math.random() * 2) | 0)] : r.hue
      });
    }
  }

  /* ---------- energy rings ---------- */
  function ring(x, y, color) {
    if (RM) return;
    rings.push({ x: x, y: y, r: 8, v: 3.4, a: 0.55, color: color || '#3ee6ff' });
    rings.push({ x: x, y: y, r: 2, v: 2.2, a: 0.4, color: color || '#ff4fd8' });
    if (rings.length > 14) rings.splice(0, rings.length - 14);
  }

  /* ---------- warp burst on scene change ---------- */
  function warp() {
    if (RM) return;
    warpT = 7.2;
  }

  /* ---------- simulation ---------- */
  function step() {
    /* warp dynamics */
    speed += (warpT - speed) * 0.09;
    warpT += (1 - warpT) * 0.035;

    /* parallax smoothing */
    px += (tpx - px) * 0.05;
    py += (tpy - py) * 0.05;
    if (FINE && !RM) {
      document.documentElement.style.setProperty('--par-x', px.toFixed(4));
      document.documentElement.style.setProperty('--par-y', py.toFixed(4));
    }

    var i, d;

    /* dust (warps into streaks) */
    for (i = 0; i < dust.length; i++) {
      d = dust[i];
      d.x += d.vx;
      d.y += d.vy * speed;
      d.ph += 0.012 * d.ts;
      if (d.y < -40) { d.y = H + 20; d.x = Math.random() * W; }
      if (d.y > H + 40) { d.y = -20; d.x = Math.random() * W; }
      if (d.x < -30) d.x = W + 20; else if (d.x > W + 30) d.x = -20;
    }

    /* confetti */
    for (i = confetti.length - 1; i >= 0; i--) {
      var p = confetti[i];
      p.vy += p.g;
      p.vx *= 0.988;
      p.vy *= 0.995;
      p.wob += p.ws;
      p.x += p.vx + Math.sin(p.wob) * 0.5;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      if (p.life > p.max || p.y > H + 50) confetti.splice(i, 1);
    }

    /* fireworks: rockets → sparks */
    for (i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.045 * r.s;
      if (trail.length < 60) {
        trail.push({ x: r.x + (Math.random() - 0.5) * 2, y: r.y, a: 0.5, r: 1.4, vx: 0, vy: 0.4, life: 0, max: 22, sp: r.hue });
      }
      if (r.vy >= -1.2 || r.y <= r.ty) {
        explode(r);
        rockets.splice(i, 1);
      }
    }

    for (i = sparks.length - 1; i >= 0; i--) {
      var k = sparks[i];
      k.vy += k.g;
      k.vx *= k.drag;
      k.vy *= k.drag;
      k.x += k.vx;
      k.y += k.vy;
      k.ph += k.tw;
      k.life++;
      if (k.life > k.max) sparks.splice(i, 1);
    }

    /* cursor sparkle trail */
    for (i = trail.length - 1; i >= 0; i--) {
      var t = trail[i];
      t.x += t.vx;
      t.y += t.vy;
      t.a *= 0.9;
      t.life++;
      if (t.a < 0.02 || t.life > t.max) trail.splice(i, 1);
    }

    /* energy rings */
    for (i = rings.length - 1; i >= 0; i--) {
      var rg = rings[i];
      rg.r += rg.v;
      rg.v *= 0.985;
      rg.a *= 0.94;
      if (rg.a < 0.02) rings.splice(i, 1);
    }
  }

  /* ---------- rendering ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var i, d;

    /* additive glow pass: dust + trail + sparks */
    ctx.globalCompositeOperation = 'lighter';

    for (i = 0; i < dust.length; i++) {
      d = dust[i];
      var ox = px * (14 + d.z * 44);
      var oy = py * (10 + d.z * 30);
      var tw = 0.65 + 0.35 * Math.sin(d.ph);

      if (speed > 1.45) {
        /* warp streak */
        var stretch = (speed - 1) * (2.2 + d.z * 4.4);
        ctx.globalAlpha = Math.min(0.5, d.a * 2.2);
        ctx.strokeStyle = 'rgba(170, 220, 255, 1)';
        ctx.lineWidth = Math.max(0.6, d.r * 0.55);
        ctx.beginPath();
        ctx.moveTo(d.x + ox, d.y + oy);
        ctx.lineTo(d.x + ox - d.vx * 4, d.y + oy - d.vy * stretch);
        ctx.stroke();
      }
      ctx.globalAlpha = d.a * tw;
      ctx.drawImage(d.sp, d.x + ox - d.r * 2, d.y + oy - d.r * 2, d.r * 4, d.r * 4);
    }

    for (i = 0; i < trail.length; i++) {
      var t = trail[i];
      ctx.globalAlpha = Math.max(0, t.a);
      ctx.drawImage(t.sp, t.x - t.r * 2, t.y - t.r * 2, t.r * 4, t.r * 4);
    }

    for (i = 0; i < sparks.length; i++) {
      var k = sparks[i];
      var twk = 0.55 + 0.45 * Math.sin(k.ph * 3);
      ctx.globalAlpha = Math.max(0, k.a * (1 - k.life / k.max) * twk);
      ctx.drawImage(k.sp, k.x - k.r * 2, k.y - k.r * 2, k.r * 4, k.r * 4);
    }

    /* rockets: bright head + short tail line */
    for (i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      ctx.globalAlpha = 0.95;
      ctx.drawImage(r.hue, r.x - 5, r.y - 5, 10, 10);
      ctx.strokeStyle = 'rgba(255, 235, 190, 0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.vx * 5, r.y - r.vy * 3.2);
      ctx.stroke();
    }

    /* confetti */
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < confetti.length; i++) {
      var p = confetti[i];
      var fade = p.life > p.max - 40 ? (p.max - p.life) / 40 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.wob * 1.4)));
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    /* energy rings */
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i];
      ctx.globalAlpha = Math.max(0, rg.a);
      ctx.strokeStyle = rg.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /* Reduced motion: one calm, faint frame — no animation loop at all. */
  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i];
      ctx.globalAlpha = d.a * 0.8;
      ctx.drawImage(d.sp, d.x - d.r * 2, d.y - d.r * 2, d.r * 4, d.r * 4);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- loop & lifecycle ---------- */
  function loop() {
    if (!running) return;
    step();
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || RM) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(resize, 160);
  }, { passive: true });

  /* pointer parallax + sparkle trail (desktop only) */
  if (FINE && !RM) {
    var lx = -1, ly = -1;
    window.addEventListener('pointermove', function (e) {
      tpx = (e.clientX / Math.max(1, W)) * 2 - 1;
      tpy = (e.clientY / Math.max(1, H)) * 2 - 1;
      if (lx >= 0) {
        var dx = e.clientX - lx, dy = e.clientY - ly;
        if (dx * dx + dy * dy > 26 * 26 && trail.length < 58) {
          trail.push({
            x: e.clientX + (Math.random() - 0.5) * 8,
            y: e.clientY + (Math.random() - 0.5) * 8,
            a: 0.5, r: 1 + Math.random() * 1.6,
            vx: dx * 0.02, vy: dy * 0.02 - 0.15,
            life: 0, max: 30,
            sp: SPRITES[(Math.random() * SPRITES.length) | 0]
          });
          lx = e.clientX; ly = e.clientY;
        }
      } else { lx = e.clientX; ly = e.clientY; }
    }, { passive: true });
  }

  resize();
  start();

  window.VR = window.VR || {};
  window.VR.fx = {
    celebrate: function () {
      var s = scaleFit();
      spawnBurst(W * 0.5, H * 0.66, Math.round(64 * s), -Math.PI / 2, 1.15, 1.15);
      setTimeout(function () { spawnBurst(W * 0.04, H * 0.94, 30, -Math.PI / 2.6, 0.5, 1.25); }, 140);
      setTimeout(function () { spawnBurst(W * 0.96, H * 0.94, 30, -Math.PI + Math.PI / 2.6, 0.5, 1.25); }, 240);
      firework(0.3, 0.3);
      setTimeout(function () { firework(0.72, 0.26); }, 380);
      setTimeout(function () { firework(0.5, 0.2); }, 760);
      setTimeout(function () { firework(0.86, 0.34); }, 1150);
    },
    firework: firework,
    ring: ring,
    warp: warp
  };
})();
