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
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18M3 6h18M3 18h18"/></svg>'
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
    var titles = { dashboard: 'Boshqaruv paneli', applications: 'Arizalar', results: 'Test natijalari', settings: 'Sozlamalar', audit: 'Audit jurnali' };
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
      { num: s.todayApps, lbl: 'Bugun kelgan', cls: 'accent-violet' },
      { num: s.enrolled, lbl: 'Qabul qilingan', cls: 'accent-green' },
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
        h('button', { class: 'btn btn-ghost', text: 'Yopish', on: { click: close } }),
        h('button', { class: 'btn btn-primary', text: 'Saqlash', on: { click: save } })
      ]
    );

    function close() { modal.remove(); }
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
