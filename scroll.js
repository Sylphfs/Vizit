/* ============================================================
   scroll.js — scroll-driven storytelling (без внешних библиотек)
   Работает полностью офлайн: IntersectionObserver + CSS-переходы
   для reveal, CSS 3D-transforms для hero-объекта, нативный smooth
   scroll. Никаких CDN/WebGL-зависимостей.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Год в футере
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---- Состояние ----
  var hero, heroObject, routeLine, rule, contact, contactList;
  var ruleDist = 0;
  var ticking = false;
  var heroBlocks = [];

  var HERO_DEFS = [
    { cls: '.blk-1', dx: 34, dy: 46, dr: 10 },
    { cls: '.blk-2', dx: 52, dy: -30, dr: -12 },
    { cls: '.blk-3', dx: -58, dy: -34, dr: 8 },
    { cls: '.blk-4', dx: 44, dy: 30, dr: 14 },
    { cls: '.blk-5', dx: -40, dy: 26, dr: -9 }
  ];

  // ---- Reduced motion: всё видно сразу, без движения ----
  if (prefersReduced) {
    document.querySelectorAll('[data-reveal],[data-card],[data-lines],[data-clip]').forEach(function (el) {
      el.classList.add('is-in');
    });
    window.__motionReady = true;
    return;
  }

  init();
  window.__motionReady = true;

  /* ---------- Инициализация ---------- */
  function init() {
    setupHeroObject();
    setupReveals();
    setupAboutLines();
    setupScrub();
    window.addEventListener('resize', onResize);
  }

  /* ---------- Hero-объект (CSS 3D-кластер) ---------- */
  function setupHeroObject() {
    hero = document.querySelector('.hero');
    heroObject = document.getElementById('hero-object');
    if (!hero || !heroObject) return;
    HERO_DEFS.forEach(function (d) {
      var el = heroObject.querySelector(d.cls);
      if (el) heroBlocks.push({ el: el, d: d });
    });
  }

  /* ---------- Reveal (IntersectionObserver + CSS-переходы) ---------- */
  function setupReveals() {
    // hero-текст — лёгкий stagger при загрузке
    var heroEls = Array.prototype.slice.call(document.querySelectorAll('.hero [data-reveal]'));
    heroEls.forEach(function (el, i) { el.style.transitionDelay = (i * 90) + 'ms'; });

    // карточки — stagger 70 мс
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-card]'));
    cards.forEach(function (el, i) { el.style.transitionDelay = (i * 70) + 'ms'; });

    var others = Array.prototype.slice.call(document.querySelectorAll('.section [data-reveal], [data-clip]'));

    observe(heroEls.concat(cards, others), function (el) {
      setTimeout(function () { el.style.transitionDelay = ''; }, 1500);
    });
  }

  function observe(elements, onReveal) {
    if (!elements.length) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          if (onReveal) onReveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    elements.forEach(function (el) { io.observe(el); });
  }

  /* ---------- «О себе»: построчно ---------- */
  function setupAboutLines() {
    var containers = Array.prototype.slice.call(document.querySelectorAll('#about [data-lines]'));
    if (!containers.length) return;

    var fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();

    fontsReady.then(function () {
      var allLines = [];
      containers.forEach(function (c) { allLines = allLines.concat(splitLines(c)); });
      if (!allLines.length) return;

      // строки — stagger 40 мс, контейнеры — простой fade
      allLines.forEach(function (line, i) { line.style.transitionDelay = (i * 40) + 'ms'; });
      observe(containers.concat(allLines), function (el) {
        setTimeout(function () { el.style.transitionDelay = ''; }, 1600);
      });
    });
  }

  function splitLines(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var words = text.split(' ');
    el.textContent = '';

    var probes = [];
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w;
      s.style.display = 'inline-block';
      el.appendChild(s);
      probes.push(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });

    var groups = [];
    var cur = [];
    var lastTop = null;
    probes.forEach(function (s) {
      var top = Math.round(s.getBoundingClientRect().top);
      if (lastTop === null || top === lastTop) { cur.push(s.textContent); }
      else { groups.push(cur); cur = [s.textContent]; }
      lastTop = top;
    });
    if (cur.length) groups.push(cur);

    el.textContent = '';
    groups.forEach(function (g) {
      var line = document.createElement('span');
      line.className = 'line';
      line.style.display = 'block';
      line.textContent = g.join(' ');
      el.appendChild(line);
    });

    return Array.prototype.slice.call(el.querySelectorAll('.line'));
  }

  /* ---------- Скролл-эффекты (scrub): hero, маршрут, контакт ---------- */
  function setupScrub() {
    routeLine = document.querySelector('.cases-route line');
    rule = document.querySelector('.contact-rule');
    contact = document.querySelector('#contact .contact');
    contactList = document.querySelector('.contact-list');

    computeRuleDist();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('load', requestTick);
    requestTick();
  }

  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(updateScrub); }
  }

  function onResize() {
    computeRuleDist();
    requestTick();
  }

  function computeRuleDist() {
    if (rule && contact && contactList) {
      ruleDist = Math.max(0, contactList.getBoundingClientRect().left - contact.getBoundingClientRect().left);
    }
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smoothstep(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }

  function updateScrub() {
    ticking = false;
    var vh = window.innerHeight || 1;

    // Hero-объект: блоки расходятся + поворот, затем растворение
    if (hero && heroObject && heroBlocks.length) {
      var hr = hero.getBoundingClientRect();
      var p = clamp01(-hr.top / Math.max(1, hr.height));
      var spread = smoothstep(0, 0.62, p);
      var fade = smoothstep(0.66, 0.96, p);

      heroBlocks.forEach(function (b) {
        b.el.style.transform = 'translate3d(' + (b.d.dx * spread).toFixed(1) + 'px,' +
          (b.d.dy * spread).toFixed(1) + 'px,0) rotate(' + (b.d.dr * spread).toFixed(1) + 'deg)';
      });

      var rotY = -14 - 20 * spread;
      var scale = 1 - 0.12 * fade;
      heroObject.style.transform = 'rotateX(8deg) rotateY(' + rotY.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
      heroObject.style.opacity = (1 - fade).toFixed(3);
    }

    // Линия-«маршрут» вдоль проектов
    if (routeLine) {
      var cases = document.querySelector('.cases');
      if (cases) {
        var cr = cases.getBoundingClientRect();
        var rp = clamp01((vh * 0.9 - cr.top) / (vh * 0.9 + cr.height * 0.7));
        routeLine.style.strokeDashoffset = String(100 - 100 * rp);
      }
    }

    // Контактная линия «доезжает» к списку
    if (rule && contact) {
      var crc = contact.getBoundingClientRect();
      var cp = clamp01((vh - crc.top) / (vh * 0.7));
      rule.style.transform = 'translate3d(' + (ruleDist * cp).toFixed(1) + 'px,0,0)';
      rule.style.opacity = cp.toFixed(3);
    }
  }
})();
