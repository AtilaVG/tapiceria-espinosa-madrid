/* Prototipo de rediseño — intro con scroll-scrubbing + respaldo en canvas */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Altura de la franja de aviso → variable CSS */
  var bar = document.querySelector('.proto-bar');
  function setBar() { root.style.setProperty('--bar-h', (bar ? bar.offsetHeight : 0) + 'px'); }
  setBar(); window.addEventListener('resize', setBar);

  /* Cabecera sólida al salir de la intro + menú móvil */
  var head = document.querySelector('.site-head');
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  if (nav) nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });

  /* Intro */
  var intro = document.querySelector('.intro');
  var video = intro && intro.querySelector('video');
  var canvas = intro && intro.querySelector('canvas');
  var phases = intro ? [].slice.call(intro.querySelectorAll('.phase')) : [];
  var hint = intro && intro.querySelector('.scroll-hint');
  var bar2 = intro && intro.querySelector('.progress');
  var progress = 0, shown = 0, hasVideo = false;
  var nFrames = intro ? parseInt(intro.getAttribute('data-frames') || '0', 10) : 0;
  var frames = [], loaded = [], hasFrames = false, lastIdx = -1;

  /* Medidas cacheadas (no se leen en cada fotograma) */
  var introTop = 0, introTotal = 1, vw = 0, vh = 0;
  function measure() {
    if (!intro) return;
    introTop = intro.getBoundingClientRect().top + window.scrollY;
    introTotal = Math.max(1, intro.offsetHeight - window.innerHeight);
  }
  function readProgress() {
    return Math.min(1, Math.max(0, (window.scrollY - introTop) / introTotal));
  }

  /* 1) Secuencia de imágenes (fluida también en móvil) */
  if (nFrames > 0 && canvas) {
    var pad = function (n) { return ('00' + n).slice(-3); };
    var load = function (i) {
      if (frames[i]) return;
      var img = new Image(); img.decoding = 'async';
      img.onload = function () {
        loaded[i] = true;
        if (i === 0) { hasFrames = true; intro.classList.add('has-frames'); lastIdx = -1; }
        else if (Math.abs(i - Math.round(shown * (nFrames - 1))) < 3) lastIdx = -1;
      };
      img.src = 'assets/frames/f' + pad(i + 1) + '.webp';
      frames[i] = img;
    };
    load(0);
    // Carga progresiva: primero uno de cada 8, luego el resto
    var order = [];
    for (var st = 8; st >= 1; st = st / 2 | 0) { for (var i = 0; i < nFrames; i += st) if (order.indexOf(i) < 0) order.push(i); if (st === 1) break; }
    var qi = 0;
    (function pump() {
      for (var k = 0; k < 6 && qi < order.length; k++) load(order[qi++]);
      if (qi < order.length) setTimeout(pump, 60);
    })();
    if (video) { video.removeAttribute('src'); video.preload = 'none'; }
  }
  /* 2) Vídeo, solo si no hay secuencia */
  else if (video) {
    var ok = function () {
      if (hasVideo || !video.duration || !isFinite(video.duration)) return;
      hasVideo = true; intro.classList.add('has-video'); video.pause();
    };
    video.addEventListener('loadeddata', ok);
    video.addEventListener('loadedmetadata', ok);
    if (video.dataset.src) { video.src = video.dataset.src; video.load(); }
    if (video.readyState >= 1) ok();
    window.addEventListener('touchstart', function once() {
      var p = video.play(); if (p && p.then) p.then(function () { video.pause(); }).catch(function () {});
      window.removeEventListener('touchstart', once);
    }, { passive: true });
  }

  function drawFrame(idx) {
    var j = idx, d = 0;
    while (!loaded[j] && d < nFrames) { d++; if (loaded[idx - d]) { j = idx - d; break; } if (loaded[idx + d]) { j = idx + d; break; } }
    var img = frames[j]; if (!img || !loaded[j]) return;
    var iw = img.naturalWidth, ih = img.naturalHeight, sc = Math.max(W / iw, H / ih);
    var dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  /* Canvas */
  var ctx = canvas && canvas.getContext('2d', { alpha: false });
  var W = 0, H = 0, DPR = 1;
  function resize(force) {
    measure();
    if (!canvas) return;
    var nw = canvas.clientWidth, nh = canvas.clientHeight;
    // En móvil la barra del navegador cambia la altura al hacer scroll: ignorar cambios pequeños
    if (!force && nw === vw && Math.abs(nh - vh) < 140) return;
    vw = nw; vh = nh;
    DPR = Math.min(window.devicePixelRatio || 1, nFrames ? 1.5 : (nw < 760 ? 1.5 : 2));
    W = nw; H = nh;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    lastIdx = -1;
  }
  window.addEventListener('resize', function () { resize(false); });
  window.addEventListener('load', function () { resize(true); });
  resize(true);

  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  var SCENES = {
    /* Taller de carpintería: muro de madera → baldas que se montan → librería llena */
    carpintero: function (p, t) {
      var cx = W / 2, cy = H / 2;
      var bg = ctx.createRadialGradient(cx, cy * .8, 10, cx, cy, Math.max(W, H) * .8);
      bg.addColorStop(0, '#3a2414'); bg.addColorStop(1, '#120a05');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var zoom = 1.9 - ease(p) * .9;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
      var fw = Math.min(W * .78, 900), fh = Math.min(H * .78, 640);
      var x0 = cx - fw / 2, y0 = cy - fh / 2;
      // tablones de fondo con veta
      var planks = 7, pw = fw / planks;
      for (var i = 0; i < planks; i++) {
        var px = x0 + i * pw;
        var g = ctx.createLinearGradient(px, 0, px + pw, 0);
        var tone = 0.85 + ((i * 37) % 10) / 60;
        g.addColorStop(0, 'rgba(' + (120 * tone | 0) + ',' + (78 * tone | 0) + ',' + (44 * tone | 0) + ',1)');
        g.addColorStop(1, 'rgba(' + (98 * tone | 0) + ',' + (62 * tone | 0) + ',' + (34 * tone | 0) + ',1)');
        ctx.fillStyle = g; ctx.fillRect(px, y0, pw - 2, fh);
        ctx.strokeStyle = 'rgba(40,22,10,.28)'; ctx.lineWidth = 1;
        for (var k = 0; k < 9; k++) {
          ctx.beginPath();
          var off = px + pw * (k + .5) / 9;
          for (var yy = y0; yy <= y0 + fh; yy += 12) {
            var xx = off + Math.sin(yy / (38 + k * 3) + i * 1.7 + k) * (3 + k % 3) + Math.sin(yy / 140 + i) * 4;
            yy === y0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
      }
      // marco lateral
      ctx.fillStyle = '#5b3a20';
      ctx.fillRect(x0 - 18, y0 - 18, 18, fh + 36); ctx.fillRect(x0 + fw, y0 - 18, 18, fh + 36);
      ctx.fillRect(x0 - 18, y0 - 18, fw + 36, 18);
      // baldas que entran
      var shelves = 4, sh = fh / shelves;
      for (var s = 0; s < shelves; s++) {
        var sp = ease(seg(p, .18 + s * .08, .36 + s * .08));
        var sy = y0 + sh * (s + 1) - 14;
        var sx = x0 - fw * (1 - sp) * (s % 2 ? -1 : 1);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx, sy + 14, fw, 10 * sp);
        var sg = ctx.createLinearGradient(0, sy, 0, sy + 16);
        sg.addColorStop(0, '#c58f5b'); sg.addColorStop(1, '#8a5a32');
        ctx.globalAlpha = sp; ctx.fillStyle = sg; ctx.fillRect(sx, sy, fw, 16); ctx.globalAlpha = 1;
        // libros / objetos
        var fill = ease(seg(p, .55 + s * .06, .82 + s * .04));
        var bx = x0 + 14, seed = s * 13 + 3;
        var colors = ['#d9b382', '#7c2f23', '#2f4a3a', '#e9dcc6', '#a8642f', '#3b3f52', '#b88a4a'];
        while (bx < x0 + fw - 30) {
          seed = (seed * 9301 + 49297) % 233280;
          var r = seed / 233280, bw = 14 + r * 22, bh = sh * (.45 + r * .35);
          if (r > .86) { bx += 40; continue; }
          var appear = Math.min(1, Math.max(0, fill * 1.4 - (bx - x0) / fw * .4));
          if (appear <= 0) break;
          ctx.globalAlpha = appear;
          ctx.fillStyle = colors[(seed >> 3) % colors.length];
          ctx.fillRect(bx, sy - bh * appear, bw - 3, bh * appear);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(bx + 3, sy - bh * appear + 8, bw - 9, 2);
          bx += bw;
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // luz cálida + polvo en suspensión
      var lg = ctx.createRadialGradient(W * .7, H * .15, 0, W * .7, H * .15, W * .7);
      lg.addColorStop(0, 'rgba(255,190,110,' + (.18 + p * .12) + ')'); lg.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      for (var d = 0; d < 60; d++) {
        var dx = (d * 97 % W + t * 8 * (1 + d % 3)) % W, dy = (d * 53 % H + Math.sin(t / 2 + d) * 20 + H) % H;
        ctx.fillStyle = 'rgba(255,220,170,' + (.15 + (d % 5) / 20) + ')';
        ctx.fillRect(dx, dy, 1.6, 1.6);
      }
    },

    /* Tapicería: trama de tela → hilo que dibuja un sofá → tapizado con costuras */
    tapiceria: function (p, t) {
      var cx = W / 2, cy = H / 2;
      var base = css('--dark') || '#132a2b';
      ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
      // trama de tejido que se cierra con el scroll
      var gap = 34 - ease(seg(p, 0, .35)) * 20;
      ctx.lineWidth = 1;
      for (var x = -40; x < W + 40; x += gap) {
        ctx.strokeStyle = 'rgba(212,165,90,' + (.10 + .05 * Math.sin(x)) + ')';
        ctx.beginPath();
        for (var y = 0; y <= H; y += 16) {
          var xx = x + Math.sin(y / 60 + t * .6 + x / 90) * 3;
          y === 0 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
        }
        ctx.stroke();
      }
      for (var y2 = -40; y2 < H + 40; y2 += gap) {
        ctx.strokeStyle = 'rgba(240,230,215,.06)';
        ctx.beginPath();
        for (var x2 = 0; x2 <= W; x2 += 16) {
          var yy2 = y2 + Math.sin(x2 / 70 + t * .5 + y2 / 80) * 3;
          x2 === 0 ? ctx.moveTo(x2, yy2) : ctx.lineTo(x2, yy2);
        }
        ctx.stroke();
      }
      // sofá
      var s = Math.min(W / 900, H / 620) * (0.9 + ease(p) * .25);
      ctx.save(); ctx.translate(cx, cy + 30 * s); ctx.scale(s, s);
      var sofa = new Path2D('M-330 60 Q-340 -40 -290 -60 L-270 -60 Q-260 -150 -180 -160 L180 -160 Q260 -150 270 -60 L290 -60 Q340 -40 330 60 L330 120 Q330 140 310 140 L-310 140 Q-330 140 -330 120 Z');
      var fillP = ease(seg(p, .45, .78));
      if (fillP > 0) {
        ctx.globalAlpha = fillP;
        var fg = ctx.createLinearGradient(0, -160, 0, 140);
        fg.addColorStop(0, '#d9a35a'); fg.addColorStop(1, '#9b6a2c');
        ctx.fillStyle = fg; ctx.fill(sofa);
        // cojines
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.beginPath(); ctx.roundRect(-250, -20, 245, 70, 22); ctx.roundRect(5, -20, 245, 70, 22); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.beginPath(); ctx.roundRect(-240, -130, 230, 95, 26); ctx.roundRect(10, -130, 230, 95, 26); ctx.fill();
        // patas
        ctx.fillStyle = '#3b2412';
        ctx.fillRect(-300, 140, 16, 34); ctx.fillRect(284, 140, 16, 34);
        ctx.globalAlpha = 1;
      }
      // hilo que dibuja el contorno
      var drawP = ease(seg(p, .12, .55));
      ctx.setLineDash([2400 * drawP, 2400]);
      ctx.lineWidth = 4; ctx.strokeStyle = '#f2e6d0'; ctx.lineCap = 'round';
      ctx.stroke(sofa);
      // pespunte
      var stitchP = seg(p, .7, .95);
      if (stitchP > 0) {
        ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 20;
        ctx.globalAlpha = stitchP; ctx.lineWidth = 2; ctx.strokeStyle = '#fff6e6';
        ctx.beginPath(); ctx.roundRect(-240, -130, 230, 95, 26); ctx.roundRect(10, -130, 230, 95, 26); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.setLineDash([]); ctx.restore();
      // aguja
      if (drawP > 0 && drawP < 1) {
        ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.arc(cx + Math.cos(t * 3) * 6, cy - 120 * s + Math.sin(t * 3) * 6, 3, 0, Math.PI * 2); ctx.fill();
      }
      var vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * .3, cx, cy, Math.max(W, H) * .75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  };
  /* Taberna: puertas de madera que se abren → barra de mármol → raciones con vapor */
  SCENES.taberna = function (p, t) {
    var cx = W / 2, cy = H / 2;
    ctx.fillStyle = '#0f1d17'; ctx.fillRect(0, 0, W, H);
    var zoom = 1 + ease(seg(p, 0, .5)) * .9;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
    var dw = Math.min(W * .5, 520), dh = Math.min(H * .78, 620), dx = cx - dw / 2, dy = cy - dh / 2 + 30;
    // fachada verde con molduras
    ctx.fillStyle = '#1d3a2c'; ctx.fillRect(dx - 80, dy - 90, dw + 160, dh + 120);
    ctx.strokeStyle = 'rgba(214,179,106,.55)'; ctx.lineWidth = 3; ctx.strokeRect(dx - 64, dy - 74, dw + 128, dh + 88);
    ctx.fillStyle = '#d6b36a'; ctx.fillRect(dx - 64, dy - 74, dw + 128, 36);
    // interior iluminado
    var ig = ctx.createLinearGradient(0, dy, 0, dy + dh);
    ig.addColorStop(0, '#f2c27a'); ig.addColorStop(.6, '#b06a2c'); ig.addColorStop(1, '#4a2611');
    ctx.fillStyle = ig; ctx.fillRect(dx, dy, dw, dh);
    // barra de mármol y raciones
    var by = dy + dh * .62;
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(dx, by, dw, 18);
    ctx.fillStyle = '#5a3418'; ctx.fillRect(dx, by + 18, dw, dh * .38 - 18);
    var plates = ease(seg(p, .5, .85));
    for (var i = 0; i < 4; i++) {
      var a = Math.min(1, Math.max(0, plates * 4 - i));
      if (a <= 0) continue;
      var px = dx + dw * (.16 + i * .23), py = by + 4;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fbf8f2'; ctx.beginPath(); ctx.ellipse(px, py, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i % 2 ? '#c98a3a' : '#e0b06a';
      for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(px - 14 + k * 14, py - 6, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,' + (.25 * a) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py - 14);
      for (var s = 1; s < 6; s++) ctx.lineTo(px + Math.sin(t * 2 + s + i) * 5, py - 14 - s * 9);
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // hojas de la puerta que se abren
    var open = ease(seg(p, .05, .45));
    for (var side = 0; side < 2; side++) {
      var w = dw / 2 * (1 - open * .92);
      var x = side ? dx + dw - w : dx;
      var dg = ctx.createLinearGradient(x, 0, x + w, 0);
      dg.addColorStop(0, '#3b2414'); dg.addColorStop(1, '#5a3a20');
      ctx.fillStyle = dg; ctx.fillRect(x, dy, w, dh);
      ctx.strokeStyle = 'rgba(214,179,106,.4)'; ctx.lineWidth = 2;
      if (w > 30) { ctx.strokeRect(x + w * .15, dy + dh * .08, w * .7, dh * .38); ctx.strokeRect(x + w * .15, dy + dh * .52, w * .7, dh * .38); }
    }
    ctx.restore();
    var lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .7);
    lg.addColorStop(0, 'rgba(255,190,110,' + (.05 + open * .15) + ')'); lg.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  };

  /* Asador: horno de leña que se enciende → brasas → cazuela de barro */
  SCENES.asador = function (p, t) {
    var cx = W / 2, cy = H / 2;
    ctx.fillStyle = '#140c08'; ctx.fillRect(0, 0, W, H);
    var zoom = 1.5 - ease(p) * .45;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
    var R = Math.min(W * .32, H * .42, 330), oy = cy + R * .35;
    // ladrillos
    for (var row = 0; row < 14; row++) for (var col = -10; col < 10; col++) {
      var bx = cx + col * 62 + (row % 2) * 31, byy = oy - R * 1.6 + row * 28;
      ctx.fillStyle = 'rgba(' + (110 + (row * 7 + col * 13) % 30) + ',52,30,1)';
      ctx.fillRect(bx, byy, 58, 24);
    }
    // boca del horno
    ctx.fillStyle = '#060302'; ctx.beginPath(); ctx.arc(cx, oy, R, Math.PI, 0); ctx.lineTo(cx + R, oy + 6); ctx.lineTo(cx - R, oy + 6); ctx.fill();
    var fire = ease(seg(p, .08, .55));
    var fg = ctx.createRadialGradient(cx, oy, 5, cx, oy, R);
    fg.addColorStop(0, 'rgba(255,170,60,' + fire + ')'); fg.addColorStop(.5, 'rgba(200,70,20,' + fire * .6 + ')'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, oy, R, Math.PI, 0); ctx.fill();
    // llamas
    for (var f = 0; f < 9; f++) {
      var fx = cx - R * .7 + f * R * .175, fh = R * (.25 + .35 * fire) * (.7 + .3 * Math.sin(t * 5 + f * 1.7));
      ctx.fillStyle = 'rgba(255,' + (140 + f * 10) + ',40,' + (.55 * fire) + ')';
      ctx.beginPath(); ctx.moveTo(fx - 18, oy); ctx.quadraticCurveTo(fx - 10 + Math.sin(t * 4 + f) * 8, oy - fh * .6, fx, oy - fh);
      ctx.quadraticCurveTo(fx + 12, oy - fh * .5, fx + 18, oy); ctx.fill();
    }
    // brasas
    for (var e = 0; e < 70; e++) {
      var life = (t * .35 + e * .137) % 1;
      var ex = cx + Math.sin(e * 12.9) * R * .8 + Math.sin(t + e) * 10, ey = oy - life * R * 1.8;
      ctx.fillStyle = 'rgba(255,' + (120 + e % 80) + ',40,' + ((1 - life) * fire) + ')';
      ctx.fillRect(ex, ey, 2.2, 2.2);
    }
    // cazuela de barro con asado
    var dish = ease(seg(p, .55, .9));
    if (dish > 0) {
      var dy2 = oy + 60 + (1 - dish) * 200;
      ctx.globalAlpha = dish;
      ctx.fillStyle = '#7a3a1a'; ctx.beginPath(); ctx.ellipse(cx, dy2, R * .62, R * .17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a24f22'; ctx.beginPath(); ctx.ellipse(cx, dy2 - 8, R * .56, R * .13, 0, 0, Math.PI * 2); ctx.fill();
      var rg = ctx.createRadialGradient(cx - 20, dy2 - 30, 5, cx, dy2 - 14, R * .4);
      rg.addColorStop(0, '#f0b45c'); rg.addColorStop(1, '#8a4a16');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(cx, dy2 - 18, R * .38, R * .1, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
      for (var v = 0; v < 3; v++) { ctx.beginPath(); ctx.moveTo(cx - 40 + v * 40, dy2 - 34);
        for (var s2 = 1; s2 < 7; s2++) ctx.lineTo(cx - 40 + v * 40 + Math.sin(t * 2 + s2 + v) * 6, dy2 - 34 - s2 * 12); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    var vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * .3, cx, cy, Math.max(W, H) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  };

  var scene = SCENES[document.body.getAttribute('data-scene')] || SCENES.carpintero;
  if (ctx && !ctx.roundRect) { CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); }; }

  /* Bucle principal: solo toca el DOM cuando algo cambia */
  var start = performance.now(), lastPhase = -1, lastSolid = null, lastHint = null, lastBar = -1;
  function frame(now) {
    progress = readProgress();
    var diff = progress - shown;
    shown = Math.abs(diff) < 0.0005 ? progress : shown + diff * (reduce ? 1 : .18);
    var t = (now - start) / 1000;
    var visible = window.scrollY < introTop + introTotal + window.innerHeight;
    if (visible && ctx) {
      if (hasFrames) {
        var idx = Math.round(shown * (nFrames - 1));
        if (idx !== lastIdx) { drawFrame(idx); lastIdx = idx; }
      } else if (hasVideo) {
        var target = shown * (video.duration - 0.05);
        if (Math.abs(video.currentTime - target) > 0.04 && !video.seeking) { try { video.currentTime = target; } catch (e) {} }
      } else if (!nFrames || !loaded[0]) {
        scene(shown, reduce ? 0 : t);
      }
    }
    var ph = -1;
    phases.forEach(function (el, i) { if (shown >= parseFloat(el.dataset.from) && shown < parseFloat(el.dataset.to)) ph = i; });
    if (ph !== lastPhase) { phases.forEach(function (el, i) { el.classList.toggle('on', i === ph); }); lastPhase = ph; }
    var hv = shown > .04;
    if (hint && hv !== lastHint) { hint.style.opacity = hv ? 0 : .8; lastHint = hv; }
    var bw = Math.round(shown * 1000) / 10;
    if (bar2 && bw !== lastBar) { bar2.style.transform = 'scaleX(' + (bw / 100) + ')'; lastBar = bw; }
    var solid = !intro || window.scrollY > introTop + introTotal + window.innerHeight - 90;
    if (head && solid !== lastSolid) { head.classList.toggle('solid', solid); lastSolid = solid; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Aparición de secciones */
  var io = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .15 });
  [].forEach.call(document.querySelectorAll('.reveal'), function (el) { io ? io.observe(el) : el.classList.add('in'); });

  /* Formulario de muestra: no envía nada (prototipo) */
  var form = document.querySelector('form[data-demo]');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var m = form.querySelector('.form-msg');
    if (m) m.textContent = 'Esto es un prototipo: el formulario aún no envía datos. En la web final llegaría directamente a vuestro correo.';
  });
})();
