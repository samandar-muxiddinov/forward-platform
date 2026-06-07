/* =====================================================================
   FORWARD — Admin SPA. Vanilla JS, freymvorksiz.
   Xavfsizlik: foydalanuvchi ma'lumoti faqat textContent orqali chiqadi
   (innerHTML faqat ishonchli, konstant SVG ikonkalar uchun). CSRF header
   har bir mutatsiyada yuboriladi. CSP: script-src 'self'.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------- DOM helper ---------------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null) return;
      if (k === 'text') el.textContent = String(v);
      else if (k === 'html') el.innerHTML = v; // faqat konstant ikon SVG
      else if (k === 'class') el.className = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
      else if (k === 'style') Object.keys(v).forEach(function (s) { el.style[s] = v[s]; }); // CSSOM (CSP-safe)
      else if (k === 'attrs') Object.keys(v).forEach(function (a) { el.setAttribute(a, v[a]); });
      else if (k.indexOf('-') > -1) el.setAttribute(k, v); // data-*, aria-* atributlar
      else el[k] = v;
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null) el.appendChild(node(x)); });
      else el.appendChild(node(c));
    }
    return el;
  }
  function node(x) { return typeof x === 'string' || typeof x === 'number' ? document.createTextNode(String(x)) : x; }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  /* ---------------- Cookies / API ---------------- */
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function api(path, opts) {
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var headers = { Accept: 'application/json' };
    var body;
    if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
    if (method !== 'GET' && method !== 'HEAD') {
      var csrf = getCookie('fwd_csrf');
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    var res = await fetch(path, { method: method, headers: headers, body: body, credentials: 'same-origin' });
    if (res.status === 401) {
      state.user = null;
      if (path !== '/api/auth/me') renderLogin();
      var e401 = new Error('unauthorized'); e401.status = 401; throw e401;
    }
    var data = null, ct = res.headers.get('content-type') || '';
    if (ct.indexOf('application/json') > -1) data = await res.json();
    if (!res.ok) { var e = new Error((data && data.error) || ('http_' + res.status)); e.status = res.status; e.data = data; throw e; }
    return data;
  }

  /* ---------------- Utils ---------------- */
  function fmtDate(s, withTime) {
    if (!s) return '—';
    var m = String(s).replace('T', ' ').match(/(\d{4})-(\d{2})-(\d{2})(?:[ ](\d{2}):(\d{2}))?/);
    if (!m) return s;
    var out = m[3] + '.' + m[2] + '.' + m[1];
    if (withTime && m[4]) out += ' ' + m[4] + ':' + m[5];
    return out;
  }
  function initials(name) {
    var p = String(name || 'A').trim().split(/\s+/);
    return ((p[0] || '')[0] || 'A').toUpperCase() + (p[1] ? p[1][0].toUpperCase() : '');
  }
  var toastTimer;
  function toast(msg, kind) {
    var t = $('#toast');
    t.textContent = msg; t.className = 'toast show' + (kind ? ' ' + kind : ''); t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  /* ---------------- Constants ---------------- */
  var STATUS = {
    'new': { label: 'Yangi', cls: 'st-new' },
    contacted: { label: "Bog'lanildi", cls: 'st-contacted' },
    enrolled: { label: 'Qabul qilindi', cls: 'st-enrolled' },
    rejected: { label: 'Rad etildi', cls: 'st-rejected' }
  };
  var DIVISION = { '1': '1–4 sinf', '2': '5–8 sinf', '3': '9–11 sinf', '': '—' };
  var TIER = {
    nexus: { label: 'Nexus', cls: 'ti-nexus', color: '#4e9eff' },
    dominion: { label: 'Dominion', cls: 'ti-dominion', color: '#7c5cbf' },
    imperial: { label: 'Imperial', cls: 'ti-imperial', color: '#c9a84c' }
  };
  var STATUS_COLOR = { 'new': '#4e9eff', contacted: '#e0a23a', enrolled: '#36c08a', rejected: '#e0564a' };
  var STUDENT_STATUS = {
    active: { label: 'Faol', cls: 'st-enrolled' },
    paused: { label: "To'xtatilgan", cls: 'st-contacted' },
    graduated: { label: 'Bitirgan', cls: 'st-new' },
    archived: { label: 'Arxiv', cls: 'st-rejected' }
  };
  var PAY_METHODS = ['Payme', 'Click', 'Uzum', 'Naqd'];
  var PLAN_LABEL = { nexus: 'Nexus', dominion: 'Dominion', imperial: 'Imperial', custom: 'Maxsus', '': '—' };
  function fmtMoney(n, cur) {
    var x = Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return x + (cur ? ' ' + cur : '');
  }
  function curMonth() { return new Date().toISOString().slice(0, 7); }

  var ICON = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 3h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2Z"/><path d="M7 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M8 12h8M8 16h5"/></svg>',
    results: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13l2 2 4-4"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
    students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    payments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    courses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  };

  function badge(map, key) {
    var item = map[key] || { label: key || '—', cls: '' };
    return h('span', { class: 'badge ' + item.cls }, h('span', { class: 'd' }), item.label);
  }

  /* ---------------- State ---------------- */
  var state = { user: null, route: 'dashboard', newCount: 0 };
  var root = $('#app');

  /* =====================================================================
     LOGIN
     ===================================================================== */
  function renderLogin() {
    clear(root);
    var msg = h('div', { class: 'form-msg' });
    var u = h('input', { class: 'input', id: 'lg-user', attrs: { autocomplete: 'username', name: 'username' } });
    var p = h('input', { class: 'input', type: 'password', id: 'lg-pass', attrs: { autocomplete: 'current-password', name: 'password' } });
    var btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit', text: 'Kirish' });

    var form = h('form', { class: 'login-card', on: { submit: doLogin } },
      h('div', { class: 'login-brand' },
        h('div', { class: 'mark', text: 'FORWARD' }),
        h('div', { class: 'sub', text: 'Boshqaruv paneli' })
      ),
      h('div', { class: 'login-title', text: 'Tizimga kirish' }),
      h('div', { class: 'field' }, h('label', { attrs: { for: 'lg-user' }, text: 'Foydalanuvchi nomi' }), u),
      h('div', { class: 'field' }, h('label', { attrs: { for: 'lg-pass' }, text: 'Parol' }), p),
      btn, msg
    );
    root.appendChild(h('div', { class: 'login-wrap' }, form));
    u.focus();

    async function doLogin(e) {
      e.preventDefault();
      msg.className = 'form-msg'; msg.textContent = '';
      btn.disabled = true;
      try {
        await api('/api/auth/login', { method: 'POST', body: { username: u.value, password: p.value } });
        await boot();
      } catch (err) {
        btn.disabled = false;
        var t = err.data && err.data.error;
        msg.className = 'form-msg bad';
        msg.textContent = t === 'locked' ? 'Akkaunt vaqtincha qulflandi. 15 daqiqadan so‘ng urinib ko‘ring.'
          : t === 'too_many_attempts' ? 'Juda ko‘p urinish. Birozdan so‘ng qayta urining.'
          : 'Login yoki parol noto‘g‘ri.';
        p.value = ''; p.focus();
      }
    }
  }

  /* =====================================================================
     SHELL
     ===================================================================== */
  var NAV = [
    { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'dashboard' },
    { id: 'applications', label: 'Arizalar', icon: 'apps' },
    { id: 'students', label: "O'quvchilar", icon: 'students' },
    { id: 'payments', label: "To'lovlar", icon: 'payments' },
    { id: 'courses', label: 'Kurslar', icon: 'courses' },
    { id: 'results', label: 'Test natijalari', icon: 'results' },
    { id: 'settings', label: 'Sozlamalar', icon: 'settings' },
    { id: 'audit', label: 'Audit jurnali', icon: 'audit' }
  ];

  function renderShell() {
    clear(root);
    var sidebar = h('aside', { class: 'sidebar', id: 'sidebar' },
      h('div', { class: 'sidebar-brand' },
        h('div', { class: 'mark', text: 'FORWARD' }),
        h('div', { class: 'sub', text: 'Admin Console' })
      ),
      h('nav', { class: 'nav', id: 'navList' }, NAV.map(function (n) {
        return h('a', { class: 'nav-item', attrs: { href: '#/' + n.id }, 'data-route': n.id },
          h('span', { html: ICON[n.icon] }), h('span', { text: n.label }),
          n.id === 'applications' ? h('span', { class: 'nav-badge', id: 'navNewBadge', hidden: true }) : null
        );
      })),
      h('div', { class: 'sidebar-user' },
        h('div', { class: 'avatar', text: initials(state.user.fullName || state.user.username) }),
        h('div', { class: 'who' },
          h('b', { text: state.user.fullName || state.user.username }),
          h('span', { text: '@' + state.user.username })
        ),
        h('button', { class: 'icon-btn', attrs: { title: 'Chiqish', 'aria-label': 'Chiqish' }, html: ICON.logout, on: { click: doLogout } })
      )
    );

    var main = h('main', { class: 'main' },
      h('header', { class: 'topbar' },
        h('button', { class: 'menu-toggle', attrs: { 'aria-label': 'Menyu' }, html: ICON.menu, on: { click: toggleSidebar } }),
        h('h1', { id: 'pageTitle', text: 'Boshqaruv paneli' }),
        h('div', { class: 'spacer' })
      ),
      h('div', { class: 'content', id: 'view' })
    );

    root.appendChild(h('div', { class: 'shell' }, sidebar, main));
  }

  function toggleSidebar() {
    var sb = $('#sidebar'); if (!sb) return;
    var open = sb.classList.toggle('open');
    if (open) {
      var scrim = h('div', { class: 'scrim', on: { click: toggleSidebar } });
      document.body.appendChild(scrim);
    } else {
      var s = $('.scrim'); if (s) s.remove();
    }
  }

  async function doLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    state.user = null;
    renderLogin();
  }

  function setActiveNav() {
    document.querySelectorAll('.nav-item').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === state.route);
    });
    var titles = { dashboard: 'Boshqaruv paneli', applications: 'Arizalar', students: "O'quvchilar", payments: "To'lovlar", courses: 'Kurslar', results: 'Test natijalari', settings: 'Sozlamalar', audit: 'Audit jurnali' };
    var t = $('#pageTitle'); if (t) t.textContent = titles[state.route] || 'FORWARD';
    if ($('.scrim')) toggleSidebar();
  }

  /* =====================================================================
     ROUTER
     ===================================================================== */
  var VIEWS = {};
  function navigate() {
    var r = (location.hash || '#/dashboard').replace(/^#\//, '');
    if (!VIEWS[r]) r = 'dashboard';
    state.route = r;
    setActiveNav();
    var view = $('#view');
    if (!view) return;
    clear(view);
    view.appendChild(h('div', { class: 'muted', text: 'Yuklanmoqda…' }));
    VIEWS[r](view);
  }
  window.addEventListener('hashchange', function () { if (state.user) navigate(); });

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  VIEWS.dashboard = async function (view) {
    var s;
    try { s = await api('/api/admin/stats'); } catch (e) { return showError(view, e); }
    state.newCount = s.newApps; updateNewBadge();
    clear(view);

    // stat cards
    var cards = [
      { num: s.totalApps, lbl: 'Jami arizalar', cls: '' },
      { num: s.newApps, lbl: 'Yangi arizalar', cls: 'accent-blue' },
      { num: s.activeStudents != null ? s.activeStudents : 0, lbl: 'Faol o‘quvchilar', cls: 'accent-green' },
      { num: fmtMoney(s.monthRevenue || 0), lbl: 'Bu oy tushum (so‘m)', cls: 'accent-violet' },
      { num: s.enrolled, lbl: 'Qabul qilingan', cls: '' },
      { num: s.totalTests, lbl: 'Test topshirganlar', cls: '' }
    ];
    view.appendChild(h('div', { class: 'stat-grid' }, cards.map(function (c) {
      return h('div', { class: 'stat ' + c.cls }, h('div', { class: 'num', text: c.num }), h('div', { class: 'lbl', text: c.lbl }));
    })));

    // trend chart + status distribution
    view.appendChild(h('div', { class: 'grid-2' },
      h('div', { class: 'card' }, h('div', { class: 'card-title', text: 'Arizalar — so‘nggi 14 kun' }), buildTrend(s.trend)),
      h('div', { class: 'card' }, h('div', { class: 'card-title', text: 'Holat bo‘yicha' }), buildStatusDist(s.byStatus, s.totalApps))
    ));

    // division + tier distribution
    view.appendChild(h('div', { class: 'grid-2 even' },
      h('div', { class: 'card' }, h('div', { class: 'card-title', text: 'Bo‘limlar bo‘yicha' }), buildDivDist(s.byDivision, s.totalApps)),
      h('div', { class: 'card' }, h('div', { class: 'card-title', text: 'Daraja taqsimoti (test)' }), buildTierDist(s.byTier, s.totalTests))
    ));

    // recent
    var rows = s.recent.map(function (r) {
      return h('tr', { class: 'clickable', on: { click: function () { openApplication(r.id); } } },
        h('td', { class: 'cell-name', text: r.student_first + ' ' + r.student_last }),
        h('td', {}, h('span', { class: 'div-pill', text: DIVISION[r.division || ''] })),
        h('td', {}, badge(STATUS, r.status)),
        h('td', { class: 'muted', text: fmtDate(r.created_at) })
      );
    });
    view.appendChild(h('div', { class: 'card' },
      h('div', { class: 'card-title', text: 'So‘nggi arizalar' }),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'O‘quvchi' }), h('th', { text: 'Bo‘lim' }), h('th', { text: 'Holat' }), h('th', { text: 'Sana' }))),
        h('tbody', {}, rows.length ? rows : [h('tr', {}, h('td', { class: 'muted', attrs: { colspan: '4' }, text: 'Hozircha ariza yo‘q.' }))])
      ))
    ));
  };

  function buildTrend(trend) {
    var map = {}; (trend || []).forEach(function (t) { map[t.d] = t.c; });
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000);
      var key = d.toISOString().slice(0, 10);
      days.push({ key: key, c: map[key] || 0, lbl: d.getDate() + '.' + (d.getMonth() + 1) });
    }
    var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.c; })));
    return h('div', { class: 'chart' }, days.map(function (d) {
      return h('div', { class: 'bar-col' },
        h('div', { class: 'bar-val', text: d.c || '' }),
        h('div', { class: 'bar', style: { height: Math.round((d.c / max) * 100) + '%' }, attrs: { title: d.lbl + ': ' + d.c } }),
        h('div', { class: 'bar-day', text: d.lbl })
      );
    }));
  }

  function distRow(name, count, total, color) {
    var pct = total ? Math.round((count / total) * 100) : 0;
    return h('div', { class: 'dist-row' },
      h('span', { class: 'dot', style: { background: color } }),
      h('span', { class: 'name', text: name }),
      h('span', { class: 'track' }, h('span', { class: 'fill', style: { width: pct + '%', background: color } })),
      h('span', { class: 'cnt', text: count })
    );
  }
  function buildStatusDist(by, total) {
    var map = {}; (by || []).forEach(function (x) { map[x.status] = x.c; });
    return h('div', {}, Object.keys(STATUS).map(function (k) {
      return distRow(STATUS[k].label, map[k] || 0, total, STATUS_COLOR[k]);
    }));
  }
  function buildDivDist(by, total) {
    var map = {}; (by || []).forEach(function (x) { map[x.division || ''] = x.c; });
    var colors = { '1': '#4e9eff', '2': '#7c5cbf', '3': '#c9a84c', '': '#6f7995' };
    return h('div', {}, ['1', '2', '3'].map(function (k) {
      return distRow(DIVISION[k], map[k] || 0, total, colors[k]);
    }));
  }
  function buildTierDist(by, total) {
    var map = {}; (by || []).forEach(function (x) { map[x.tier] = x; });
    return h('div', {}, Object.keys(TIER).map(function (k) {
      var row = map[k] || { c: 0, avg: 0 };
      return distRow(TIER[k].label + (row.avg ? ' (o‘rt. ' + row.avg + '%)' : ''), row.c || 0, total, TIER[k].color);
    }));
  }

  /* =====================================================================
     APPLICATIONS
     ===================================================================== */
  var appsQuery = { status: '', q: '', page: 1, pageSize: 20 };

  VIEWS.applications = async function (view) {
    clear(view);
    var searchInput = h('input', { class: 'input', attrs: { placeholder: 'Ism, familiya yoki telefon…', 'aria-label': 'Qidirish' }, value: appsQuery.q });
    var debounce;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { appsQuery.q = searchInput.value.trim(); appsQuery.page = 1; loadTable(); }, 300);
    });

    var statusChips = h('div', { class: 'chips' }, [{ k: '', l: 'Hammasi' }].concat(
      Object.keys(STATUS).map(function (k) { return { k: k, l: STATUS[k].label }; })
    ).map(function (c) {
      return h('button', {
        class: 'chip' + (appsQuery.status === c.k ? ' active' : ''), 'data-k': c.k, text: c.l,
        on: { click: function () { appsQuery.status = c.k; appsQuery.page = 1; refreshChips(); loadTable(); } }
      });
    }));
    function refreshChips() {
      statusChips.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-k') === appsQuery.status); });
    }

    var exportBtn = h('a', { class: 'btn btn-ghost btn-sm', attrs: { href: '/api/admin/export/applications.csv' }, html: ICON.download + '<span>CSV</span>' });

    view.appendChild(h('div', { class: 'toolbar' },
      h('div', { class: 'search' }, h('span', { html: ICON.search }), searchInput),
      statusChips,
      h('div', { class: 'spacer', style: { flex: '1' } }),
      exportBtn
    ));

    var tableWrap = h('div', { class: 'table-wrap' });
    var pager = h('div', { class: 'pager' });
    view.appendChild(tableWrap);
    view.appendChild(pager);

    async function loadTable() {
      clear(tableWrap); tableWrap.appendChild(h('div', { class: 'muted', style: { padding: '1rem' }, text: 'Yuklanmoqda…' }));
      var data;
      try {
        data = await api('/api/admin/applications?status=' + encodeURIComponent(appsQuery.status) +
          '&q=' + encodeURIComponent(appsQuery.q) + '&page=' + appsQuery.page + '&pageSize=' + appsQuery.pageSize);
      } catch (e) { return showError(tableWrap, e); }
      clear(tableWrap); clear(pager);

      if (!data.rows.length) {
        tableWrap.appendChild(h('div', { class: 'empty' }, h('div', { class: 'big', text: 'Ariza topilmadi' }),
          h('div', { text: 'Filtr yoki qidiruvni o‘zgartirib ko‘ring.' })));
        return;
      }

      var body = h('tbody', {}, data.rows.map(function (r) {
        return h('tr', { class: 'clickable', on: { click: function () { openApplication(r.id); } } },
          h('td', { class: 'num muted', text: '#' + r.id }),
          h('td', { class: 'cell-name', text: r.student_first + ' ' + r.student_last }),
          h('td', {}, h('span', { class: 'div-pill', text: DIVISION[r.division || ''] })),
          h('td', { text: r.student_phone || '—' }),
          h('td', {}, badge(STATUS, r.status)),
          h('td', { class: 'muted', text: fmtDate(r.created_at) })
        );
      }));
      tableWrap.appendChild(h('table', {},
        h('thead', {}, h('tr', {},
          h('th', { class: 'num', text: 'ID' }), h('th', { text: 'O‘quvchi' }), h('th', { text: 'Bo‘lim' }),
          h('th', { text: 'Telefon' }), h('th', { text: 'Holat' }), h('th', { text: 'Sana' })
        )),
        body
      ));

      // pager
      var pages = Math.max(1, Math.ceil(data.total / data.pageSize));
      pager.appendChild(h('div', { class: 'info', text: 'Jami: ' + data.total + ' ta · ' + data.page + '/' + pages + '-sahifa' }));
      pager.appendChild(h('div', { class: 'pages' },
        h('button', { class: 'btn btn-ghost btn-sm', text: '‹ Oldingi', disabled: data.page <= 1, on: { click: function () { appsQuery.page--; loadTable(); } } }),
        h('button', { class: 'btn btn-ghost btn-sm', text: 'Keyingi ›', disabled: data.page >= pages, on: { click: function () { appsQuery.page++; loadTable(); } } })
      ));
    }
    loadTable();
  };

  async function openApplication(id) {
    var data;
    try { data = await api('/api/admin/applications/' + id); } catch (e) { return toast('Yuklab bo‘lmadi', 'bad'); }
    var a = data.application;

    var statusSel = h('select', { class: 'select' }, Object.keys(STATUS).map(function (k) {
      return h('option', { value: k, text: STATUS[k].label, selected: a.status === k });
    }));
    var notes = h('textarea', { class: 'textarea', attrs: { placeholder: 'Ichki izoh (o‘quvchiga ko‘rinmaydi)…' }, value: a.notes || '' });

    var testRows = (data.tests || []).map(function (t) {
      return h('div', { class: 'dist-row' },
        badge(TIER, t.tier),
        h('span', { class: 'name', text: t.percent + '%' }),
        h('span', { class: 'muted', style: { marginLeft: 'auto', fontSize: '.8rem' }, text: fmtDate(t.created_at) })
      );
    });

    var modal = buildModal(a.student_first + ' ' + a.student_last,
      h('div', {},
        h('dl', { class: 'kv' },
          kv('Ariza ID', '#' + a.id),
          kv('Bo‘lim', DIVISION[a.division || '']),
          kv('Sinf', a.grade || '—'),
          kv('O‘quvchi tel.', a.student_phone || '—'),
          kv('Manzil', a.address || '—'),
          kv('Qiziqishlar', a.interests || '—'),
          kv('Ota-ona', a.parent_name || '—'),
          kv('Ota-ona tel.', a.parent_phone || '—'),
          kv('Yuborilgan', fmtDate(a.created_at, true))
        ),
        testRows.length ? h('div', {}, h('div', { class: 'card-title', text: 'Test natijalari' }), testRows) : null,
        h('div', { class: 'field' }, h('label', { text: 'Holat' }), statusSel),
        h('div', { class: 'field' }, h('label', { text: 'Izoh' }), notes)
      ),
      [
        h('button', { class: 'btn btn-danger', html: ICON.trash + '<span>O‘chirish</span>', on: { click: del } }),
        h('div', { style: { flex: '1' } }),
        h('button', { class: 'btn btn-ghost', html: ICON.students + '<span>O‘quvchiga aylantirish</span>', on: { click: enroll } }),
        h('button', { class: 'btn btn-ghost', text: 'Yopish', on: { click: close } }),
        h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } })
      ]
    );

    function close() { modal.remove(); }
    async function enroll() {
      try {
        var r = await api('/api/admin/applications/' + id + '/enroll', { method: 'POST' });
        toast('O‘quvchiga aylantirildi', 'good'); close(); refreshCurrent(); location.hash = '#/students';
      } catch (e) {
        if (e.status === 409) toast('Bu ariza allaqachon o‘quvchiga aylantirilgan', 'bad');
        else toast('Xatolik yuz berdi', 'bad');
      }
    }
    async function save() {
      try {
        await api('/api/admin/applications/' + id, { method: 'PATCH', body: { status: statusSel.value, notes: notes.value } });
        toast('Saqlandi', 'good'); close(); refreshCurrent();
      } catch (e) { toast('Saqlashda xatolik', 'bad'); }
    }
    async function del() {
      if (!confirm('Bu arizani o‘chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo‘lmaydi.')) return;
      try { await api('/api/admin/applications/' + id, { method: 'DELETE' }); toast('O‘chirildi', 'good'); close(); refreshCurrent(); }
      catch (e) { toast('O‘chirishda xatolik', 'bad'); }
    }
  }

  function refreshCurrent() {
    // statni yangilash uchun badge, va joriy ko'rinishni qayta yuklash
    if (state.route === 'applications' || state.route === 'dashboard') navigate();
    refreshNewCount();
  }

  /* =====================================================================
     RESULTS
     ===================================================================== */
  var resQuery = { tier: '', page: 1, pageSize: 20 };
  VIEWS.results = async function (view) {
    clear(view);
    var chips = h('div', { class: 'chips' }, [{ k: '', l: 'Hammasi' }].concat(
      Object.keys(TIER).map(function (k) { return { k: k, l: TIER[k].label }; })
    ).map(function (c) {
      return h('button', {
        class: 'chip' + (resQuery.tier === c.k ? ' active' : ''), 'data-k': c.k, text: c.l,
        on: { click: function () { resQuery.tier = c.k; resQuery.page = 1; chips.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-k') === resQuery.tier); }); load(); } }
      });
    }));
    view.appendChild(h('div', { class: 'toolbar' }, chips));
    var wrap = h('div', { class: 'table-wrap' });
    var pager = h('div', { class: 'pager' });
    view.appendChild(wrap); view.appendChild(pager);

    async function load() {
      clear(wrap); wrap.appendChild(h('div', { class: 'muted', style: { padding: '1rem' }, text: 'Yuklanmoqda…' }));
      var data;
      try { data = await api('/api/admin/results?tier=' + encodeURIComponent(resQuery.tier) + '&page=' + resQuery.page + '&pageSize=' + resQuery.pageSize); }
      catch (e) { return showError(wrap, e); }
      clear(wrap); clear(pager);
      if (!data.rows.length) { wrap.appendChild(h('div', { class: 'empty' }, h('div', { class: 'big', text: 'Natija yo‘q' }))); return; }
      wrap.appendChild(h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Ism' }), h('th', { text: 'Telefon' }), h('th', { text: 'Daraja' }), h('th', { class: 'num', text: 'Foiz' }), h('th', { text: 'Guruh' }), h('th', { text: 'Sana' }))),
        h('tbody', {}, data.rows.map(function (r) {
          return h('tr', {},
            h('td', { class: 'cell-name', text: r.name || '—' }),
            h('td', { text: r.phone || '—' }),
            h('td', {}, badge(TIER, r.tier)),
            h('td', { class: 'num', text: r.percent + '%' }),
            h('td', { class: 'muted', text: r.grade_group || '—' }),
            h('td', { class: 'muted', text: fmtDate(r.created_at) })
          );
        }))
      ));
      var pages = Math.max(1, Math.ceil(data.total / data.pageSize));
      pager.appendChild(h('div', { class: 'info', text: 'Jami: ' + data.total + ' ta · ' + data.page + '/' + pages + '-sahifa' }));
      pager.appendChild(h('div', { class: 'pages' },
        h('button', { class: 'btn btn-ghost btn-sm', text: '‹ Oldingi', disabled: data.page <= 1, on: { click: function () { resQuery.page--; load(); } } }),
        h('button', { class: 'btn btn-ghost btn-sm', text: 'Keyingi ›', disabled: data.page >= pages, on: { click: function () { resQuery.page++; load(); } } })
      ));
    }
    load();
  };

  /* =====================================================================
     SETTINGS
     ===================================================================== */
  VIEWS.settings = async function (view) {
    var data;
    try { data = await api('/api/admin/settings'); } catch (e) { return showError(view, e); }
    clear(view);
    function f(key, label, ph) {
      var inp = h('input', { class: 'input', value: data[key] || '', attrs: { placeholder: ph || '' }, 'data-key': key });
      return h('div', { class: 'field' }, h('label', { text: label }), inp);
    }
    var phone = f('public.phone', 'Telefon', '+998 ...');
    var email = f('public.email', 'Email', 'info@...');
    var address = f('public.address', 'Manzil', 'Shahar, ko‘cha');
    var tg = f('public.telegram', 'Telegram', 'https://t.me/...');
    var ig = f('public.instagram', 'Instagram', 'https://instagram.com/...');
    var wh = f('public.workingHours', 'Ish vaqti', 'Dush–Shan 9:00–19:00');
    var saveMsg = h('div', { class: 'form-msg' });

    view.appendChild(h('div', { class: 'grid-2 even' },
      h('div', { class: 'card' },
        h('div', { class: 'card-title', text: 'Aloqa ma‘lumotlari (saytda ko‘rinadi)' }),
        phone, email, address, tg, ig, wh,
        h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: saveContact } }), saveMsg
      ),
      buildPasswordCard()
    ));
    view.appendChild(buildTelegramCard(data));

    async function saveContact() {
      var body = {};
      [phone, email, address, tg, ig, wh].forEach(function (wrap) {
        var inp = $('input', wrap); body[inp.getAttribute('data-key')] = inp.value.trim();
      });
      try { await api('/api/admin/settings', { method: 'PUT', body: body }); saveMsg.className = 'form-msg good'; saveMsg.textContent = 'Saqlandi ✓'; toast('Sozlamalar saqlandi', 'good'); }
      catch (e) { saveMsg.className = 'form-msg bad'; saveMsg.textContent = 'Saqlashda xatolik.'; }
    }
  };

  function buildPasswordCard() {
    var cur = h('input', { class: 'input', type: 'password', attrs: { autocomplete: 'current-password' } });
    var nw = h('input', { class: 'input', type: 'password', attrs: { autocomplete: 'new-password' } });
    var nw2 = h('input', { class: 'input', type: 'password', attrs: { autocomplete: 'new-password' } });
    var msg = h('div', { class: 'form-msg' });
    async function change() {
      msg.className = 'form-msg';
      if (nw.value.length < 8) { msg.className = 'form-msg bad'; msg.textContent = 'Yangi parol kamida 8 belgidan iborat bo‘lsin.'; return; }
      if (nw.value !== nw2.value) { msg.className = 'form-msg bad'; msg.textContent = 'Parollar mos kelmadi.'; return; }
      try {
        await api('/api/admin/account/password', { method: 'POST', body: { current: cur.value, next: nw.value } });
        msg.className = 'form-msg good'; msg.textContent = 'Parol yangilandi ✓'; cur.value = nw.value = nw2.value = '';
        toast('Parol o‘zgartirildi', 'good');
      } catch (e) {
        msg.className = 'form-msg bad';
        msg.textContent = (e.data && e.data.error) === 'wrong_current' ? 'Joriy parol noto‘g‘ri.' : 'Xatolik yuz berdi.';
      }
    }
    return h('div', { class: 'card' },
      h('div', { class: 'card-title', text: 'Parolni o‘zgartirish' }),
      h('div', { class: 'field' }, h('label', { text: 'Joriy parol' }), cur),
      h('div', { class: 'field' }, h('label', { text: 'Yangi parol' }), nw),
      h('div', { class: 'field' }, h('label', { text: 'Yangi parol (takror)' }), nw2),
      h('button', { class: 'btn btn-primary', text: 'Parolni yangilash', on: { click: change } }), msg
    );
  }

  function buildTelegramCard(data) {
    var enabled = h('input', { type: 'checkbox' }); enabled.checked = data['telegram.enabled'] === '1';
    var token = h('input', { class: 'input', value: data['telegram.bot_token'] || '', attrs: { placeholder: '123456:ABC-DEF…' } });
    var chat = h('input', { class: 'input', value: data['telegram.chat_id'] || '', attrs: { placeholder: 'masalan -1001234567890 yoki @kanal' } });
    var msg = h('div', { class: 'form-msg' });
    async function save() {
      try {
        await api('/api/admin/settings', { method: 'PUT', body: { 'telegram.enabled': enabled.checked ? '1' : '0', 'telegram.bot_token': token.value.trim(), 'telegram.chat_id': chat.value.trim() } });
        msg.className = 'form-msg good'; msg.textContent = 'Saqlandi ✓'; toast('Telegram sozlamasi saqlandi', 'good');
      } catch (e) { msg.className = 'form-msg bad'; msg.textContent = 'Xatolik.'; }
    }
    async function test() {
      msg.className = 'form-msg'; msg.textContent = 'Yuborilmoqda…';
      try {
        var r = await api('/api/admin/telegram/test', { method: 'POST' });
        if (r.ok) { msg.className = 'form-msg good'; msg.textContent = '✓ Test xabar yuborildi.'; }
        else if (r.skipped) { msg.className = 'form-msg bad'; msg.textContent = 'Avval yoqing va token/chat_id ni saqlang.'; }
        else { msg.className = 'form-msg bad'; msg.textContent = 'Yuborilmadi: ' + (r.error || ('status ' + r.status)); }
      } catch (e) { msg.className = 'form-msg bad'; msg.textContent = 'Xatolik.'; }
    }
    return h('div', { class: 'card', style: { marginTop: '1.2rem' } },
      h('div', { class: 'card-title', text: 'Telegram bildirishnoma' }),
      h('div', { class: 'field' }, h('label', { style: { display: 'flex', alignItems: 'center', gap: '.5rem' } }, enabled, h('span', { text: 'Yangi ariza kelganda Telegram xabar yuborilsin' }))),
      h('div', { class: 'grid-2 even' }, field('Bot token', token), field('Chat ID (yoki @kanal)', chat)),
      h('div', { style: { display: 'flex', gap: '.6rem' } },
        h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } }),
        h('button', { class: 'btn btn-ghost', text: 'Test xabar', on: { click: test } })
      ),
      msg,
      h('p', { class: 'muted', style: { fontSize: '.78rem', marginTop: '.6rem' }, text: 'Bot yarating (@BotFather), tokenni kiriting; botni guruhga qo‘shing va chat_id ni bering.' })
    );
  }

  /* =====================================================================
     AUDIT
     ===================================================================== */
  var AUDIT_LABEL = {
    login_success: 'Tizimga kirdi', login_failed: 'Kirish urinishi (xato)',
    application_update: 'Ariza yangilandi', application_delete: 'Ariza o‘chirildi',
    settings_update: 'Sozlamalar yangilandi', password_change: 'Parol o‘zgartirildi'
  };
  VIEWS.audit = async function (view) {
    var data;
    try { data = await api('/api/admin/audit'); } catch (e) { return showError(view, e); }
    clear(view);
    if (!data.rows.length) { view.appendChild(h('div', { class: 'empty' }, h('div', { class: 'big', text: 'Jurnal bo‘sh' }))); return; }
    view.appendChild(h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: 'Vaqt' }), h('th', { text: 'Foydalanuvchi' }), h('th', { text: 'Amal' }), h('th', { text: 'Tafsilot' }), h('th', { text: 'IP' }))),
      h('tbody', {}, data.rows.map(function (r) {
        return h('tr', {},
          h('td', { class: 'muted', text: fmtDate(r.created_at, true) }),
          h('td', { text: r.username || '—' }),
          h('td', { text: AUDIT_LABEL[r.action] || r.action }),
          h('td', { class: 'muted', text: r.detail || '—' }),
          h('td', { class: 'muted', text: r.ip || '—' })
        );
      }))
    )));
  };

  /* =====================================================================
     Shared bits
     ===================================================================== */
  function kv(k, v) { return [h('dt', { text: k }), h('dd', { text: v })]; }

  function buildModal(title, bodyNode, footButtons) {
    var overlay = h('div', { class: 'overlay', on: { click: function (e) { if (e.target === overlay) overlay.remove(); } } });
    var modal = h('div', { class: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true' } },
      h('div', { class: 'modal-head' }, h('h2', { text: title }),
        h('button', { class: 'close', attrs: { 'aria-label': 'Yopish' }, html: ICON.close, on: { click: function () { overlay.remove(); } } })),
      h('div', { class: 'modal-body' }, bodyNode),
      h('div', { class: 'modal-foot' }, footButtons)
    );
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
    return overlay;
  }

  function showError(container, err) {
    if (err && err.status === 401) return; // login allaqachon ko'rsatildi
    clear(container);
    container.appendChild(h('div', { class: 'empty' },
      h('div', { class: 'big', text: 'Xatolik yuz berdi' }),
      h('div', { text: 'Ma‘lumotni yuklab bo‘lmadi. Sahifani yangilab ko‘ring.' })
    ));
  }

  function updateNewBadge() {
    var b = $('#navNewBadge'); if (!b) return;
    if (state.newCount > 0) { b.textContent = state.newCount; b.hidden = false; } else { b.hidden = true; }
  }
  async function refreshNewCount() {
    try { var s = await api('/api/admin/stats'); state.newCount = s.newApps; updateNewBadge(); } catch (e) {}
  }

  /* ---- shared bits for module views ---- */
  function field(label, control) { return h('div', { class: 'field' }, h('label', { text: label }), control); }
  function toIntSafe(v) { var n = parseInt(v, 10); return Number.isFinite(n) ? n : null; }
  function buildPager(pager, data, onGo) {
    clear(pager);
    var pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    pager.appendChild(h('div', { class: 'info', text: 'Jami: ' + data.total + ' ta · ' + data.page + '/' + pages + '-sahifa' }));
    pager.appendChild(h('div', { class: 'pages' },
      h('button', { class: 'btn btn-ghost btn-sm', text: '‹ Oldingi', disabled: data.page <= 1, on: { click: function () { onGo(data.page - 1); } } }),
      h('button', { class: 'btn btn-ghost btn-sm', text: 'Keyingi ›', disabled: data.page >= pages, on: { click: function () { onGo(data.page + 1); } } })
    ));
  }
  function selectFrom(opts, current) {
    return h('select', { class: 'select' }, opts.map(function (o) {
      return h('option', { value: o.v, text: o.l, selected: (current || '') === o.v });
    }));
  }
  var DIV_OPTS = [{ v: '', l: '—' }, { v: '1', l: '1–4 sinf' }, { v: '2', l: '5–8 sinf' }, { v: '3', l: '9–11 sinf' }];
  var TIER_OPTS = [{ v: '', l: '—' }, { v: 'nexus', l: 'Nexus' }, { v: 'dominion', l: 'Dominion' }, { v: 'imperial', l: 'Imperial' }];

  /* =====================================================================
     STUDENTS
     ===================================================================== */
  var stuQuery = { status: '', q: '', page: 1, pageSize: 20 };
  VIEWS.students = async function (view) {
    clear(view);
    var search = h('input', { class: 'input', attrs: { placeholder: 'Ism yoki telefon…', 'aria-label': 'Qidirish' }, value: stuQuery.q });
    var deb;
    search.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { stuQuery.q = search.value.trim(); stuQuery.page = 1; load(); }, 300); });
    var chips = h('div', { class: 'chips' }, [{ k: '', l: 'Hammasi' }].concat(
      Object.keys(STUDENT_STATUS).map(function (k) { return { k: k, l: STUDENT_STATUS[k].label }; })
    ).map(function (c) {
      return h('button', { class: 'chip' + (stuQuery.status === c.k ? ' active' : ''), 'data-k': c.k, text: c.l, on: { click: function () { stuQuery.status = c.k; stuQuery.page = 1; chips.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-k') === stuQuery.status); }); load(); } } });
    }));
    view.appendChild(h('div', { class: 'toolbar' },
      h('div', { class: 'search' }, h('span', { html: ICON.search }), search), chips,
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-primary btn-sm', html: ICON.plus + '<span>Yangi o‘quvchi</span>', on: { click: function () { openStudentForm(); } } })
    ));
    var wrap = h('div', { class: 'table-wrap' });
    var pager = h('div', { class: 'pager' });
    view.appendChild(wrap); view.appendChild(pager);
    async function load() {
      clear(wrap); wrap.appendChild(h('div', { class: 'muted', style: { padding: '1rem' }, text: 'Yuklanmoqda…' }));
      var data;
      try { data = await api('/api/admin/students?status=' + encodeURIComponent(stuQuery.status) + '&q=' + encodeURIComponent(stuQuery.q) + '&page=' + stuQuery.page + '&pageSize=' + stuQuery.pageSize); }
      catch (e) { return showError(wrap, e); }
      clear(wrap); clear(pager);
      if (!data.rows.length) { wrap.appendChild(h('div', { class: 'empty' }, h('div', { class: 'big', text: 'O‘quvchi topilmadi' }), h('div', { text: 'Arizalardan «O‘quvchiga aylantirish» orqali yoki «Yangi o‘quvchi».' }))); return; }
      wrap.appendChild(h('table', {},
        h('thead', {}, h('tr', {}, h('th', { class: 'num', text: 'ID' }), h('th', { text: 'Ism' }), h('th', { text: 'Bo‘lim' }), h('th', { text: 'Daraja' }), h('th', { text: 'Telefon' }), h('th', { text: 'Holat' }))),
        h('tbody', {}, data.rows.map(function (r) {
          return h('tr', { class: 'clickable', on: { click: function () { openStudent(r.id); } } },
            h('td', { class: 'num muted', text: '#' + r.id }),
            h('td', { class: 'cell-name', text: r.full_name }),
            h('td', {}, h('span', { class: 'div-pill', text: DIVISION[r.division || ''] })),
            h('td', {}, r.tier ? badge(TIER, r.tier) : h('span', { class: 'muted', text: '—' })),
            h('td', { text: r.phone || '—' }),
            h('td', {}, badge(STUDENT_STATUS, r.status))
          );
        }))
      ));
      buildPager(pager, data, function (p) { stuQuery.page = p; load(); });
    }
    load();
  };

  function studentFields(d) {
    d = d || {};
    function inp(val, ph) { return h('input', { class: 'input', value: val || '', attrs: ph ? { placeholder: ph } : {} }); }
    var full = inp(d.full_name), phone = inp(d.phone, '+998…'), grade = inp(d.grade, '7-sinf');
    var division = selectFrom(DIV_OPTS, d.division), tier = selectFrom(TIER_OPTS, d.tier);
    var status = h('select', { class: 'select' }, Object.keys(STUDENT_STATUS).map(function (k) { return h('option', { value: k, text: STUDENT_STATUS[k].label, selected: (d.status || 'active') === k }); }));
    var pname = inp(d.parent_name), pphone = inp(d.parent_phone, '+998…'), address = inp(d.address);
    var notes = h('textarea', { class: 'textarea', value: d.notes || '', attrs: { placeholder: 'Izoh…' } });
    var node = h('div', {}, field('To‘liq ism', full),
      h('div', { class: 'grid-2 even' }, field('Telefon', phone), field('Sinf', grade)),
      h('div', { class: 'grid-2 even' }, field('Bo‘lim', division), field('Daraja', tier)),
      field('Holat', status),
      h('div', { class: 'grid-2 even' }, field('Ota-ona', pname), field('Ota-ona tel.', pphone)),
      field('Manzil', address), field('Izoh', notes));
    function values() { return { full_name: full.value, phone: phone.value, grade: grade.value, division: division.value, tier: tier.value, status: status.value, parent_name: pname.value, parent_phone: pphone.value, address: address.value, notes: notes.value }; }
    return { node: node, values: values };
  }

  function openStudentForm() {
    var f = studentFields(null), msg = h('div', { class: 'form-msg' });
    var modal = buildModal('Yangi o‘quvchi', h('div', {}, f.node, msg), [
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-ghost', text: 'Bekor', on: { click: function () { modal.remove(); } } }),
      h('button', { class: 'btn btn-primary', text: 'Qo‘shish', on: { click: save } })
    ]);
    async function save() {
      var v = f.values();
      if ((v.full_name || '').trim().length < 2) { msg.className = 'form-msg bad'; msg.textContent = 'Ismni kiriting.'; return; }
      try { await api('/api/admin/students', { method: 'POST', body: v }); toast('Qo‘shildi', 'good'); modal.remove(); if (state.route === 'students') navigate(); }
      catch (e) { msg.className = 'form-msg bad'; msg.textContent = 'Saqlashda xatolik.'; }
    }
  }

  async function openStudent(id) {
    var data;
    try { data = await api('/api/admin/students/' + id); } catch (e) { return toast('Yuklab bo‘lmadi', 'bad'); }
    var s = data.student, f = studentFields(s);
    var tests = (data.tests || []).map(function (t) {
      return h('div', { class: 'dist-row' }, badge(TIER, t.tier), h('span', { class: 'name', text: t.percent + '%' }), h('span', { class: 'muted', style: { marginLeft: 'auto', fontSize: '.8rem' }, text: fmtDate(t.created_at) }));
    });
    var payList = h('div', {});
    function renderPays(pays) {
      clear(payList);
      if (!pays.length) { payList.appendChild(h('div', { class: 'muted', style: { fontSize: '.85rem' }, text: 'To‘lovlar yo‘q.' })); return; }
      pays.forEach(function (p) {
        payList.appendChild(h('div', { class: 'dist-row' },
          h('span', { class: 'name', style: { width: 'auto' }, text: fmtMoney(p.amount, p.currency) }),
          p.method ? h('span', { class: 'div-pill', text: p.method }) : null,
          h('span', { class: 'muted', style: { fontSize: '.8rem' }, text: p.period }),
          h('span', { class: 'muted', style: { marginLeft: 'auto', fontSize: '.8rem' }, text: fmtDate(p.paid_at || p.created_at) })
        ));
      });
    }
    renderPays(data.payments || []);
    function reloadPays() { api('/api/admin/students/' + id).then(function (d) { renderPays(d.payments || []); }).catch(function () {}); }
    var body = h('div', {}, f.node,
      tests.length ? h('div', {}, h('div', { class: 'card-title', style: { marginTop: '1rem' }, text: 'Test natijalari' }), tests) : null,
      h('div', { class: 'card-title', style: { marginTop: '1rem' }, text: 'To‘lovlar' }), payList,
      h('button', { class: 'btn btn-ghost btn-sm', style: { marginTop: '.6rem' }, html: ICON.plus + '<span>To‘lov qo‘shish</span>', on: { click: function () { openPaymentForm(s, reloadPays); } } })
    );
    var modal = buildModal(s.full_name, body, [
      h('button', { class: 'btn btn-danger', html: ICON.trash + '<span>O‘chirish</span>', on: { click: del } }),
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-ghost', text: 'Yopish', on: { click: function () { modal.remove(); } } }),
      h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } })
    ]);
    async function save() { var v = f.values(); if ((v.full_name || '').trim().length < 2) { toast('Ismni kiriting', 'bad'); return; } try { await api('/api/admin/students/' + id, { method: 'PATCH', body: v }); toast('Saqlandi', 'good'); modal.remove(); if (state.route === 'students') navigate(); } catch (e) { toast('Xatolik', 'bad'); } }
    async function del() { if (!confirm('O‘quvchini o‘chirishni tasdiqlaysizmi?')) return; try { await api('/api/admin/students/' + id, { method: 'DELETE' }); toast('O‘chirildi', 'good'); modal.remove(); if (state.route === 'students') navigate(); } catch (e) { toast('Xatolik', 'bad'); } }
  }

  async function openPaymentForm(student, onDone) {
    var fixedId = null, studentSel = null, topNode;
    if (student) { fixedId = student.id; topNode = field('O‘quvchi', h('input', { class: 'input', value: student.full_name, attrs: { disabled: 'disabled' } })); }
    else {
      var list = [];
      try { var d = await api('/api/admin/students?pageSize=100'); list = d.rows; } catch (e) {}
      studentSel = h('select', { class: 'select' }, [h('option', { value: '', text: '— tanlang —' })].concat(list.map(function (s) { return h('option', { value: String(s.id), text: s.full_name + ' (' + DIVISION[s.division || ''] + ')' }); })));
      topNode = field('O‘quvchi', studentSel);
    }
    var amount = h('input', { class: 'input', type: 'number', attrs: { min: '0', placeholder: 'masalan 300000' } });
    var method = h('select', { class: 'select' }, [h('option', { value: '', text: '—' })].concat(PAY_METHODS.map(function (m) { return h('option', { value: m, text: m }); })));
    var plan = selectFrom([{ v: '', l: '—' }, { v: 'nexus', l: 'Nexus' }, { v: 'dominion', l: 'Dominion' }, { v: 'imperial', l: 'Imperial' }, { v: 'custom', l: 'Maxsus' }], '');
    var period = h('input', { class: 'input', type: 'month', value: curMonth() });
    var status = selectFrom([{ v: 'paid', l: 'To‘langan' }, { v: 'pending', l: 'Kutilmoqda' }], 'paid');
    var note = h('input', { class: 'input', attrs: { placeholder: 'Izoh (ixtiyoriy)' } });
    var msg = h('div', { class: 'form-msg' });
    var body = h('div', {}, topNode,
      h('div', { class: 'grid-2 even' }, field('Summa', amount), field('Usul', method)),
      h('div', { class: 'grid-2 even' }, field('Reja', plan), field('Davr (oy)', period)),
      field('Holat', status), field('Izoh', note), msg);
    var modal = buildModal('To‘lov qo‘shish', body, [
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-ghost', text: 'Bekor', on: { click: function () { modal.remove(); } } }),
      h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } })
    ]);
    async function save() {
      var sid = fixedId || (studentSel && toIntSafe(studentSel.value));
      if (!sid) { msg.className = 'form-msg bad'; msg.textContent = 'O‘quvchini tanlang.'; return; }
      var amt = Number(amount.value) || 0;
      if (amt <= 0) { msg.className = 'form-msg bad'; msg.textContent = 'Summani kiriting.'; return; }
      try { await api('/api/admin/payments', { method: 'POST', body: { student_id: sid, amount: amt, method: method.value, plan: plan.value, period: period.value, status: status.value, note: note.value } }); toast('To‘lov qo‘shildi', 'good'); modal.remove(); if (typeof onDone === 'function') onDone(); if (state.route === 'payments') navigate(); }
      catch (e) { msg.className = 'form-msg bad'; msg.textContent = 'Saqlashda xatolik.'; }
    }
  }

  /* =====================================================================
     PAYMENTS
     ===================================================================== */
  var payQuery = { period: curMonth() };
  VIEWS.payments = async function (view) {
    clear(view);
    var monthInput = h('input', { class: 'input', type: 'month', value: payQuery.period });
    monthInput.addEventListener('change', function () { payQuery.period = monthInput.value || curMonth(); load(); });
    view.appendChild(h('div', { class: 'toolbar' },
      h('div', { class: 'field', style: { marginBottom: '0', maxWidth: '200px' } }, h('label', { text: 'Davr (oy)' }), monthInput),
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-primary btn-sm', html: ICON.plus + '<span>To‘lov qo‘shish</span>', on: { click: function () { openPaymentForm(null, function () { load(); }); } } })
    ));
    var summaryWrap = h('div', {});
    var tableWrap = h('div', { class: 'table-wrap' });
    var debtorsWrap = h('div', { class: 'card' });
    view.appendChild(summaryWrap);
    view.appendChild(h('div', { class: 'grid-2' },
      h('div', { class: 'card' }, h('div', { class: 'card-title', text: 'To‘lovlar' }), tableWrap),
      debtorsWrap
    ));
    async function load() {
      var sum;
      try { sum = await api('/api/admin/payments/summary?period=' + encodeURIComponent(payQuery.period)); } catch (e) { return showError(view, e); }
      clear(summaryWrap);
      summaryWrap.appendChild(h('div', { class: 'stat-grid' }, [
        { num: fmtMoney(sum.revenue), lbl: 'Tushum (so‘m) · ' + sum.period, cls: 'accent-green' },
        { num: sum.count, lbl: 'To‘lovlar soni', cls: '' },
        { num: sum.debtors.length, lbl: 'Qarzdorlar (faol)', cls: 'accent-blue' }
      ].map(function (c) { return h('div', { class: 'stat ' + c.cls }, h('div', { class: 'num', text: c.num }), h('div', { class: 'lbl', text: c.lbl })); })));

      clear(debtorsWrap);
      debtorsWrap.appendChild(h('div', { class: 'card-title', text: 'Qarzdorlar — ' + sum.period }));
      if (!sum.debtors.length) { debtorsWrap.appendChild(h('div', { class: 'muted', text: 'Barcha faol o‘quvchilar to‘lagan 🎉' })); }
      else {
        sum.debtors.forEach(function (dd) {
          debtorsWrap.appendChild(h('div', { class: 'dist-row' },
            h('span', { class: 'name', style: { width: 'auto' }, text: dd.full_name }),
            dd.tier ? badge(TIER, dd.tier) : null,
            h('button', { class: 'btn btn-ghost btn-sm', style: { marginLeft: 'auto' }, text: 'To‘lov', on: { click: function () { openPaymentForm({ id: dd.id, full_name: dd.full_name }, function () { load(); }); } } })
          ));
        });
      }

      clear(tableWrap); tableWrap.appendChild(h('div', { class: 'muted', style: { padding: '1rem' }, text: 'Yuklanmoqda…' }));
      var data;
      try { data = await api('/api/admin/payments?period=' + encodeURIComponent(payQuery.period) + '&pageSize=100'); } catch (e) { return showError(tableWrap, e); }
      clear(tableWrap);
      if (!data.rows.length) { tableWrap.appendChild(h('div', { class: 'empty' }, h('div', { class: 'big', text: 'To‘lov yo‘q' }))); return; }
      tableWrap.appendChild(h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'O‘quvchi' }), h('th', { class: 'num', text: 'Summa' }), h('th', { text: 'Usul' }), h('th', { text: 'Reja' }), h('th', { text: 'Holat' }), h('th', { text: 'Sana' }), h('th', { text: '' }))),
        h('tbody', {}, data.rows.map(function (p) {
          return h('tr', {},
            h('td', { class: 'cell-name', text: p.full_name }),
            h('td', { class: 'num', text: fmtMoney(p.amount, p.currency) }),
            h('td', { text: p.method || '—' }),
            h('td', { text: PLAN_LABEL[p.plan || ''] }),
            h('td', {}, h('span', { class: 'badge ' + (p.status === 'paid' ? 'st-enrolled' : 'st-contacted') }, h('span', { class: 'd' }), p.status === 'paid' ? 'To‘langan' : 'Kutilmoqda')),
            h('td', { class: 'muted', text: fmtDate(p.paid_at || p.created_at) }),
            h('td', {}, h('button', { class: 'icon-btn', html: ICON.trash, attrs: { title: 'O‘chirish' }, on: { click: function () { delPay(p.id); } } }))
          );
        }))
      ));
      async function delPay(pid) { if (!confirm('To‘lovni o‘chirasizmi?')) return; try { await api('/api/admin/payments/' + pid, { method: 'DELETE' }); toast('O‘chirildi', 'good'); load(); } catch (e) { toast('Xatolik', 'bad'); } }
    }
    load();
  };

  /* =====================================================================
     COURSES
     ===================================================================== */
  VIEWS.courses = async function (view) {
    clear(view);
    view.appendChild(h('div', { class: 'toolbar' },
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-primary btn-sm', html: ICON.plus + '<span>Yangi kurs</span>', on: { click: function () { openCourseForm(); } } })
    ));
    var grid = h('div', { class: 'stat-grid' });
    view.appendChild(grid);
    var data;
    try { data = await api('/api/admin/courses'); } catch (e) { return showError(view, e); }
    clear(grid);
    if (!data.rows.length) { view.appendChild(h('div', { class: 'empty' }, h('div', { class: 'big', text: 'Kurs yo‘q' }), h('div', { text: '«Yangi kurs» orqali qo‘shing.' }))); return; }
    data.rows.forEach(function (c) {
      grid.appendChild(h('div', { class: 'card', style: { cursor: 'pointer' }, on: { click: function () { openCourse(c.id); } } },
        h('div', { style: { display: 'flex', gap: '.5rem', marginBottom: '.6rem', flexWrap: 'wrap' } },
          c.division ? h('span', { class: 'div-pill', text: DIVISION[c.division] }) : null,
          c.tier ? badge(TIER, c.tier) : null,
          c.active ? null : h('span', { class: 'badge st-rejected' }, h('span', { class: 'd' }), 'Faol emas')
        ),
        h('h3', { style: { fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--white)', marginBottom: '.3rem' }, text: c.title }),
        h('p', { class: 'muted', style: { fontSize: '.85rem', marginBottom: '.6rem' }, text: c.description || '' }),
        h('div', { class: 'muted', style: { fontSize: '.8rem' }, text: c.lesson_count + ' ta dars' })
      ));
    });
  };

  function courseFieldSet(d) {
    d = d || {};
    var title = h('input', { class: 'input', value: d.title || '' });
    var division = selectFrom(DIV_OPTS, d.division), tier = selectFrom(TIER_OPTS, d.tier);
    var desc = h('textarea', { class: 'textarea', value: d.description || '' });
    var sort = h('input', { class: 'input', type: 'number', value: (d.sort != null ? d.sort : 0) });
    var active = h('input', { type: 'checkbox' }); active.checked = d.active == null ? true : !!d.active;
    var node = h('div', {}, field('Nomi', title),
      h('div', { class: 'grid-2 even' }, field('Bo‘lim', division), field('Daraja', tier)),
      field('Tavsif', desc),
      h('div', { class: 'grid-2 even' }, field('Tartib', sort),
        h('div', { class: 'field' }, h('label', { text: 'Faol' }), h('label', { style: { display: 'flex', alignItems: 'center', gap: '.5rem' } }, active, h('span', { class: 'muted', text: 'Ko‘rsatilsin' })))));
    function values() { return { title: title.value, division: division.value, tier: tier.value, description: desc.value, sort: Number(sort.value) || 0, active: active.checked }; }
    return { node: node, values: values };
  }

  function openCourseForm() {
    var f = courseFieldSet(null), msg = h('div', { class: 'form-msg' });
    var modal = buildModal('Yangi kurs', h('div', {}, f.node, msg), [
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-ghost', text: 'Bekor', on: { click: function () { modal.remove(); } } }),
      h('button', { class: 'btn btn-primary', text: 'Qo‘shish', on: { click: save } })
    ]);
    async function save() { var v = f.values(); if ((v.title || '').trim().length < 2) { msg.className = 'form-msg bad'; msg.textContent = 'Nomini kiriting.'; return; } try { await api('/api/admin/courses', { method: 'POST', body: v }); toast('Kurs qo‘shildi', 'good'); modal.remove(); if (state.route === 'courses') navigate(); } catch (e) { msg.className = 'form-msg bad'; msg.textContent = 'Xatolik.'; } }
  }

  async function openCourse(id) {
    var data;
    try { data = await api('/api/admin/courses/' + id); } catch (e) { return toast('Yuklab bo‘lmadi', 'bad'); }
    var c = data.course, f = courseFieldSet(c);
    var lessonsWrap = h('div', {});
    function renderLessons(lessons) {
      clear(lessonsWrap);
      if (!lessons.length) { lessonsWrap.appendChild(h('div', { class: 'muted', style: { fontSize: '.85rem' }, text: 'Dars yo‘q.' })); return; }
      lessons.forEach(function (l) {
        lessonsWrap.appendChild(h('div', { class: 'dist-row' },
          h('span', { class: 'name', style: { width: 'auto' }, text: l.title }),
          l.material ? h('span', { class: 'muted', style: { fontSize: '.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }, text: l.material }) : null,
          h('button', { class: 'icon-btn', style: { marginLeft: 'auto' }, html: ICON.edit, attrs: { title: 'Tahrirlash' }, on: { click: function () { openLessonForm(id, l, reload); } } }),
          h('button', { class: 'icon-btn', html: ICON.trash, attrs: { title: 'O‘chirish' }, on: { click: function () { delLesson(l.id); } } })
        ));
      });
    }
    renderLessons(data.lessons || []);
    function reload() { api('/api/admin/courses/' + id).then(function (d) { renderLessons(d.lessons || []); }).catch(function () {}); }
    async function delLesson(lid) { if (!confirm('Darsni o‘chirasizmi?')) return; try { await api('/api/admin/lessons/' + lid, { method: 'DELETE' }); reload(); } catch (e) { toast('Xatolik', 'bad'); } }
    var body = h('div', {}, f.node,
      h('div', { class: 'card-title', style: { marginTop: '1rem', display: 'flex', alignItems: 'center' } }, h('span', { text: 'Darslar' }),
        h('button', { class: 'btn btn-ghost btn-sm', style: { marginLeft: 'auto' }, html: ICON.plus + '<span>Dars</span>', on: { click: function () { openLessonForm(id, null, reload); } } })),
      lessonsWrap);
    var modal = buildModal(c.title, body, [
      h('button', { class: 'btn btn-danger', html: ICON.trash + '<span>O‘chirish</span>', on: { click: del } }),
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-ghost', text: 'Yopish', on: { click: function () { modal.remove(); } } }),
      h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } })
    ]);
    async function save() { var v = f.values(); if ((v.title || '').trim().length < 2) { toast('Nomini kiriting', 'bad'); return; } try { await api('/api/admin/courses/' + id, { method: 'PATCH', body: v }); toast('Saqlandi', 'good'); modal.remove(); if (state.route === 'courses') navigate(); } catch (e) { toast('Xatolik', 'bad'); } }
    async function del() { if (!confirm('Kursni va barcha darslarini o‘chirasizmi?')) return; try { await api('/api/admin/courses/' + id, { method: 'DELETE' }); toast('O‘chirildi', 'good'); modal.remove(); if (state.route === 'courses') navigate(); } catch (e) { toast('Xatolik', 'bad'); } }
  }

  function openLessonForm(courseId, lesson, onDone) {
    var d = lesson || {};
    var title = h('input', { class: 'input', value: d.title || '' });
    var material = h('textarea', { class: 'textarea', value: d.material || '', attrs: { placeholder: 'Matn yoki havola (URL)…' } });
    var sort = h('input', { class: 'input', type: 'number', value: (d.sort != null ? d.sort : 0) });
    var msg = h('div', { class: 'form-msg' });
    var modal = buildModal(lesson ? 'Darsni tahrirlash' : 'Yangi dars', h('div', {}, field('Sarlavha', title), field('Material', material), field('Tartib', sort), msg), [
      h('div', { style: { flex: '1' } }),
      h('button', { class: 'btn btn-ghost', text: 'Bekor', on: { click: function () { modal.remove(); } } }),
      h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } })
    ]);
    async function save() {
      var b = { course_id: courseId, title: title.value, material: material.value, sort: Number(sort.value) || 0 };
      if ((b.title || '').trim().length < 2) { msg.className = 'form-msg bad'; msg.textContent = 'Sarlavhani kiriting.'; return; }
      try { await api(lesson ? ('/api/admin/lessons/' + lesson.id) : '/api/admin/lessons', { method: lesson ? 'PATCH' : 'POST', body: b }); toast('Saqlandi', 'good'); modal.remove(); if (typeof onDone === 'function') onDone(); }
      catch (e) { msg.className = 'form-msg bad'; msg.textContent = 'Xatolik.'; }
    }
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  async function boot() {
    try {
      var me = await api('/api/auth/me');
      state.user = me.user;
      renderShell();
      navigate();
      refreshNewCount();
    } catch (e) {
      renderLogin();
    }
  }

  boot();
})();
