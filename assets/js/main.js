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

  function readProgress() {
    if (!intro) return 0;
    var r = intro.getBoundingClientRect();
    var total = intro.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  if (video) {
    var ok = function () {
      if (hasVideo || !video.duration || !isFinite(video.duration)) return;
      hasVideo = true; intro.classList.add('has-video'); video.pause();
    };
    video.addEventListener('loadeddata', ok);
    video.addEventListener('loadedmetadata', ok);
    video.addEventListener('error', function () { intro.classList.remove('has-video'); }, true);
    if (video.readyState >= 1) ok();
    // Desbloqueo para iOS: un play/pause tras el primer toque
    window.addEventListener('touchstart', function once() {
      var p = video.play(); if (p && p.then) p.then(function () { video.pause(); }).catch(function () {});
      window.removeEventListener('touchstart', once);
    }, { passive: true });
  }

  /* Escenas de respaldo (canvas) */
  var ctx = canvas && canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  function resize() {
    if (!canvas) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

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
  var scene = SCENES[document.body.getAttribute('data-scene')] || SCENES.carpintero;
  if (ctx && !ctx.roundRect) { CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); }; }

  /* Bucle principal */
  var start = performance.now();
  function frame(now) {
    progress = readProgress();
    shown += (progress - shown) * (reduce ? 1 : .12);
    var t = (now - start) / 1000;
    if (hasVideo) {
      var target = shown * (video.duration - 0.05);
      if (Math.abs(video.currentTime - target) > 0.02) { try { video.currentTime = target; } catch (e) {} }
    } else if (ctx && intro.getBoundingClientRect().bottom > 0) {
      scene(shown, reduce ? 0 : t);
    }
    phases.forEach(function (ph) {
      var a = parseFloat(ph.dataset.from), b = parseFloat(ph.dataset.to);
      ph.classList.toggle('on', shown >= a && shown < b);
    });
    if (hint) hint.style.opacity = shown > .04 ? 0 : .8;
    if (bar2) bar2.style.width = (shown * 100) + '%';
    if (head) head.classList.toggle('solid', !intro || intro.getBoundingClientRect().bottom < 90);
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
