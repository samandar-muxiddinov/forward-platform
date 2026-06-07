/* =====================================================================
   FORWARD — main.js
   Landing-page interactivity. Vanilla JS. No eval, no inline handlers.
   Uses window.FORWARD_SEC (security.js) and window.FORWARD_CONFIG (config.js)
   defensively (works even if they are missing).
   ===================================================================== */
(function () {
  'use strict';

  var SEC = window.FORWARD_SEC || {};
  var CFG = window.FORWARD_CONFIG || {};
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setText(el, t) {
    if (!el) return;
    if (typeof SEC.setText === 'function') { SEC.setText(el, t); }
    else { el.textContent = (t == null ? '' : String(t)); }
  }
  function sanitize(v, max) {
    if (typeof SEC.sanitizeText === 'function') return SEC.sanitizeText(v, max || 200);
    return String(v == null ? '' : v).trim().slice(0, max || 200);
  }

  /* ---------------------------------------------------------------
     1. Navigation: scrolled state + mobile drawer
  --------------------------------------------------------------- */
  var nav = $('#nav');
  var navToggle = $('#navToggle');
  var navMenu = $('#navMenu');

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    var toTop = $('#toTop');
    if (toTop) {
      var show = window.scrollY > 600;
      toTop.hidden = false;
      toTop.classList.toggle('show', show);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove('open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  }
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if (navMenu) {
    $$('a', navMenu).forEach(function (a) { a.addEventListener('click', closeMenu); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------------------------------------------------------------
     2. Back-to-top
  --------------------------------------------------------------- */
  var toTop = $('#toTop');
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------------
     3. Scroll reveal
  --------------------------------------------------------------- */
  var revealEls = $$('[data-reveal]');
  function revealInView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh - 40) el.classList.add('visible');
    });
  }
  if ('IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    revealInView();                       /* reveal above-the-fold instantly, no flash */
    window.addEventListener('load', revealInView);
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------------------------------------------------------------
     4. Stat count-up (only for purely-numeric stats)
  --------------------------------------------------------------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target) || !/^\d+$/.test(el.textContent.trim())) return; /* skip "1–11" etc. */
    if (prefersReduced) { setText(el, String(target)); return; }
    var dur = 1100, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      setText(el, String(Math.floor(p * target)));
      if (p < 1) requestAnimationFrame(tick); else setText(el, String(target));
    }
    requestAnimationFrame(tick);
  }
  var statEls = $$('.stat-num[data-count]');
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); sio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    statEls.forEach(function (el) { sio.observe(el); });
  }

  /* ---------------------------------------------------------------
     5. Config-driven content (contact, social, payments, year)
  --------------------------------------------------------------- */
  (function fillConfig() {
    var c = CFG.contact || {}, s = CFG.social || {};
    $$('[data-contact]').forEach(function (el) {
      switch (el.getAttribute('data-contact')) {
        case 'phone':
          if (c.phone) { setText(el, c.phone); if (c.phoneHref) el.setAttribute('href', 'tel:' + c.phoneHref); }
          break;
        case 'email':
          if (c.email) { setText(el, c.email); el.setAttribute('href', 'mailto:' + c.email); }
          break;
        case 'address':
          if (c.address) setText(el, c.address);
          break;
        case 'telegram':
          if (s.telegramHandle) setText(el, s.telegramHandle);
          if (s.telegram) el.setAttribute('href', s.telegram);
          break;
        case 'telegram-cta':
          if (s.telegram) el.setAttribute('href', s.telegram);
          break;
        case 'instagram':
          if (s.instagram) el.setAttribute('href', s.instagram);
          break;
      }
    });
    if (Array.isArray(CFG.payments)) {
      $$('[data-pay]').forEach(function (el) { setText(el, CFG.payments.join(' · ')); });
    }
    $$('[data-year]').forEach(function (el) { setText(el, String(new Date().getFullYear())); });
  }());

  /* ---------------------------------------------------------------
     6. Personalize tiers CTA from a saved test result
  --------------------------------------------------------------- */
  (function showTestResult() {
    var raw = (typeof SEC.safeLocalStorageGet === 'function')
      ? SEC.safeLocalStorageGet('forward_test_result')
      : (function () { try { return localStorage.getItem('forward_test_result'); } catch (e) { return null; } }());
    if (!raw) return;
    var data; try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || !data.tier) return;
    var ctaP = $('.tiers-cta p');
    if (ctaP) {
      var name = String(data.tier).charAt(0).toUpperCase() + String(data.tier).slice(1);
      setText(ctaP, 'Oxirgi natijangiz: ' + name + (data.percent != null ? ' (' + data.percent + '%)' : '') + '. Qayta urinib ko‘rasizmi?');
    }
  }());

  /* ---------------------------------------------------------------
     7. Registration form — validation + anti-abuse + submit
  --------------------------------------------------------------- */
  var form = $('#regForm');
  if (form) {
    /* anti-abuse init */
    if (SEC.form && SEC.form.honeypot && typeof SEC.form.honeypot.inject === 'function') {
      try { SEC.form.honeypot.inject(form); } catch (e) {}
    }
    if (SEC.form && SEC.form.timeTrap && typeof SEC.form.timeTrap.record === 'function') {
      try { SEC.form.timeTrap.record(); } catch (e) {}
    }

    var V = SEC.validators || {};
    function isName(v) { return typeof V.name === 'function' ? V.name(v) : (v.trim().length >= 2 && v.trim().length <= 80); }
    function isPhone(v) { return typeof V.phoneUz === 'function' ? V.phoneUz(v) : /^\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(v.trim()); }

    var rules = {
      fname:  { el: $('#fname'),  test: isName,  msg: 'Ismni to‘g‘ri kiriting.' },
      lname:  { el: $('#lname'),  test: isName,  msg: 'Familiyani to‘g‘ri kiriting.' },
      sinf:   { el: $('#sinf'),   test: function (v) { return v.trim() !== ''; }, msg: 'Sinfni tanlang.' },
      tel:    { el: $('#tel'),    test: isPhone, msg: 'Masalan: +998 90 000 00 00' },
      manzil: { el: $('#manzil'), test: function (v) { return v.trim().length >= 4; }, msg: 'Manzilni kiriting.' },
      pname:  { el: $('#pname'),  test: isName,  msg: 'Ota-ona ismini kiriting.' },
      ptel:   { el: $('#ptel'),   test: isPhone, msg: 'Masalan: +998 90 000 00 00' }
    };

    function showErr(key, message) {
      var slot = $('[data-err-for="' + key + '"]', form);
      if (slot) setText(slot, message || '');
      if (rules[key] && rules[key].el) rules[key].el.classList.toggle('invalid', !!message);
    }
    function validateField(key) {
      var r = rules[key]; if (!r || !r.el) return true;
      var ok = r.test(r.el.value || '');
      showErr(key, ok ? '' : r.msg);
      return ok;
    }
    Object.keys(rules).forEach(function (key) {
      if (rules[key].el) rules[key].el.addEventListener('blur', function () { validateField(key); });
    });

    function status(msg, kind) {
      var st = $('#formStatus');
      if (!st) return;
      setText(st, msg || '');
      st.className = 'form-status' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status('', '');

      /* honeypots (silent reject) */
      var hp = $('#company');
      if (hp && hp.value) return;
      if (SEC.form && SEC.form.honeypot && typeof SEC.form.honeypot.check === 'function') {
        try { if (SEC.form.honeypot.check(form)) return; } catch (e2) {}
      }
      /* time-trap */
      if (SEC.form && SEC.form.timeTrap && typeof SEC.form.timeTrap.check === 'function') {
        try { if (SEC.form.timeTrap.check()) { status('Iltimos, formani diqqat bilan to‘ldiring.', 'bad'); return; } } catch (e3) {}
      }
      /* rate limit */
      if (SEC.form && typeof SEC.form.rateLimit === 'function') {
        try {
          var rl = SEC.form.rateLimit('reg_submit', 5, 600000);
          if (rl && rl.allowed === false) {
            var mins = Math.ceil((rl.retryInMs || 0) / 60000);
            status('Juda ko‘p urinish. ' + mins + ' daqiqadan so‘ng qayta urining.', 'bad');
            return;
          }
        } catch (e4) {}
      }

      /* validate all */
      var valid = true;
      Object.keys(rules).forEach(function (key) { if (!validateField(key)) valid = false; });
      var division = form.querySelector('input[name="division"]:checked');
      if (!division) { showErr('division', 'Bo‘limni tanlang.'); valid = false; }
      else { showErr('division', ''); }

      if (!valid) { status('Iltimos, belgilangan maydonlarni to‘g‘rilang.', 'bad'); return; }

      /* build sanitized payload */
      var payload = {
        student: {
          firstName: sanitize($('#fname').value, 50),
          lastName:  sanitize($('#lname').value, 50),
          grade:     sanitize($('#sinf').value, 20),
          phone:     sanitize($('#tel').value, 20),
          address:   sanitize($('#manzil').value, 120),
          interests: sanitize(($('#qiziqish') || {}).value, 300)
        },
        parent: {
          name:  sanitize($('#pname').value, 80),
          phone: sanitize($('#ptel').value, 20)
        },
        division: division.value,
        ts: new Date().toISOString()
      };

      var apiBase = (CFG.api && typeof CFG.api.base === 'string') ? CFG.api.base : '';
      var endpoint = (CFG.form && CFG.form.endpoint)
        ? CFG.form.endpoint
        : (apiBase.replace(/\/+$/, '') + '/api/applications');
      var submitBtn = $('.form-submit', form);
      if (submitBtn) submitBtn.disabled = true;

      /* Mahalliy zaxira — server o‘chiq/oflayn bo‘lsa ham lead yo‘qolmaydi */
      function saveLocalBackup() {
        try {
          var key = 'forward_registrations';
          var arr = [];
          var prev = (typeof SEC.safeLocalStorageGet === 'function') ? SEC.safeLocalStorageGet(key) : localStorage.getItem(key);
          if (prev) { try { arr = JSON.parse(prev) || []; } catch (e5) { arr = []; } }
          arr.push(payload);
          var val = JSON.stringify(arr);
          if (typeof SEC.safeLocalStorageSet === 'function') SEC.safeLocalStorageSet(key, val);
          else localStorage.setItem(key, val);
        } catch (e6) {}
      }
      /* O‘quvchi profilini eslab qolamiz — daraja testi natijasi shu arizaga bog‘lanadi */
      function saveStudentProfile() {
        try {
          var prof = JSON.stringify({
            name: (payload.student.firstName + ' ' + payload.student.lastName).trim(),
            phone: payload.student.phone || ''
          });
          if (typeof SEC.safeLocalStorageSet === 'function') SEC.safeLocalStorageSet('forward_student', prof);
          else localStorage.setItem('forward_student', prof);
        } catch (e7) {}
      }

      function succeed() { saveStudentProfile(); renderSuccess(payload); }

      fetch(endpoint, {
        method: (CFG.form && CFG.form.method) || 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (r.ok) { succeed(); return; }
        if (r.status === 429) {
          if (submitBtn) submitBtn.disabled = false;
          status('Juda ko‘p urinish. Iltimos, birozdan so‘ng qayta urining.', 'bad');
          return;
        }
        /* Server xatosi — yo‘qotmaymiz: mahalliy zaxira + muvaffaqiyat */
        saveLocalBackup(); succeed();
      }).catch(function () {
        /* Tarmoq xatosi / oflayn — mahalliy zaxira + muvaffaqiyat */
        saveLocalBackup(); succeed();
      });
    });

    /* Build the success panel with DOM APIs (no innerHTML injection) */
    function renderSuccess(payload) {
      var panel = document.createElement('div');
      panel.className = 'form-success';

      var check = document.createElement('div');
      check.className = 'check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      panel.appendChild(check);

      var h = document.createElement('h3');
      h.textContent = 'Muvaffaqiyatli ro‘yxatdan o‘tdingiz!';
      panel.appendChild(h);

      var p = document.createElement('p');
      var nm = payload && payload.student ? payload.student.firstName : '';
      p.textContent = (nm ? nm + ', ' : '') + 'ma‘lumotlaringiz qabul qilindi. Tez orada siz bilan bog‘lanamiz va daraja testingizni yuboramiz.';
      panel.appendChild(p);

      var a = document.createElement('a');
      a.className = 'btn btn-primary';
      a.href = 'daraja-test.html';
      a.textContent = 'Daraja testini boshlash';
      panel.appendChild(a);

      form.replaceWith(panel);
      panel.setAttribute('tabindex', '-1');
      panel.focus();
    }
  }
}());
