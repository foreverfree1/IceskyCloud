/**
 * 大屏背景动效：粒子 + 连线（浅色底适配，无第三方依赖）
 */
(function () {
  'use strict';

  function prefersReduce() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function BgFx(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.raf = 0;
    this.running = false;
    this.count = 0;
    this._onResize = this.resize.bind(this);
    this._onVis = this.onVisibility.bind(this);
  }

  BgFx.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    // 面积自适应粒子数，大屏约 70~110
    this.count = Math.max(55, Math.min(110, Math.floor((w * h) / 22000)));
    this.initParticles();
  };

  BgFx.prototype.initParticles = function () {
    var list = [];
    for (var i = 0; i < this.count; i++) {
      list.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
        a: Math.random() * 0.25 + 0.12
      });
    }
    this.particles = list;
  };

  BgFx.prototype.step = function () {
    var p, i, j, dx, dy, dist, maxDist;
    var ctx = this.ctx;
    var w = this.w;
    var h = this.h;
    var ps = this.particles;
    maxDist = Math.min(140, w * 0.09);

    ctx.clearRect(0, 0, w, h);

    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = w + 10;
      else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      else if (p.y > h + 10) p.y = -10;
    }

    // 连线
    for (i = 0; i < ps.length; i++) {
      for (j = i + 1; j < ps.length; j++) {
        dx = ps[i].x - ps[j].x;
        dy = ps[i].y - ps[j].y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= maxDist) continue;
        ctx.strokeStyle = 'rgba(80, 130, 190,' + ((1 - dist / maxDist) * 0.12) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ps[i].x, ps[i].y);
        ctx.lineTo(ps[j].x, ps[j].y);
        ctx.stroke();
      }
    }

    // 粒子
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      ctx.beginPath();
      ctx.fillStyle = 'rgba(90, 140, 200,' + p.a + ')';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  BgFx.prototype.loop = function () {
    if (!this.running) return;
    this.step();
    this.raf = window.requestAnimationFrame(this._tick);
  };

  BgFx.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._tick = this.loop.bind(this);
    this.resize();
    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVis);
    this.loop();
  };

  BgFx.prototype.stop = function () {
    this.running = false;
    if (this.raf) window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVis);
  };

  BgFx.prototype.onVisibility = function () {
    if (document.hidden) {
      this.running = false;
      if (this.raf) window.cancelAnimationFrame(this.raf);
    } else if (!prefersReduce()) {
      this.running = true;
      this.loop();
    }
  };

  function mount() {
    var screen = document.querySelector('.screen');
    if (!screen) return;
    var canvas = document.getElementById('bgFx');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'bgFx';
      canvas.className = 'screen__bg-fx';
      canvas.setAttribute('aria-hidden', 'true');
      screen.insertBefore(canvas, screen.firstChild);
    }
    if (prefersReduce()) {
      // 静态一帧
      var fx = new BgFx(canvas);
      fx.resize();
      fx.step();
      return;
    }
    var fx = new BgFx(canvas);
    fx.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
