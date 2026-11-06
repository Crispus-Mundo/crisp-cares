/* Connect — member app (talks to the Apps Script backend in config.js) */
(function () {
  'use strict';
  var API = window.CONNECT_API;
  var LEARN = window.LEARN || {}, DIAGRAMS = window.DIAGRAMS || [];
  var TRACK_STATUS = ['Saved', 'Researching', 'Applied', 'Interviewing', 'Offer received', 'Offer accepted', 'Not selected', 'Not pursuing', 'Withdrew'];
  var TRACK_DONE = ['Offer accepted', 'Not selected', 'Not pursuing', 'Withdrew'];
  var LOG_TYPES = ['Hours', 'Mileage', 'Expense'];
  var S = { token: null, me: null, jobs: [], items: [], updates: [], unions: [], wisdom: [], resources: [], chat: [], aiOn: false, plans: [], products: [], orders: [], specialties: [], premium: null, admin: null, tab: 'home', edit: null, quiz: null, learnField: null, files: {}, outbox: [], offline: false, syncing: false, localFiles: {} };
  var app = document.getElementById('app');
  var Q = new URLSearchParams(location.search);
  var JOIN = Q.get('join') === '1', JOIN_SRC = (Q.get('src') || 'qr').replace(/[^a-z0-9_-]/gi, '').slice(0, 30);

  /* ---------------- helpers */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDate(s) { if (!s) return ''; var d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? String(s) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function daysUntil(s) { if (!s) return null; var d = new Date(s + 'T00:00:00'), t = new Date(today() + 'T00:00:00'); return Math.round((d - t) / 86400000); }
  function money(n) { var x = Number(n); return isNaN(x) ? String(n || '') : '$' + x.toFixed(x % 1 ? 2 : 0); }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }
  function items(kind) { return S.items.filter(function (i) { return i.kind === kind; }); }
  function field(id) { var el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------------- offline store (IndexedDB, falls back to localStorage) */
  var KV = (function () {
    var dbp = null;
    function db() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        try { var r = indexedDB.open('connect', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); }
      });
      return dbp;
    }
    function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('kv', mode), st = t.objectStore('kv'), out = fn(st); t.oncomplete = function () { res(out && out.result); }; t.onerror = function () { rej(t.error); }; }); }); }
    return {
      get: function (k) { return tx('readonly', function (st) { return st.get(k); }).catch(function () { var v = store('kv_' + k); try { return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; } }); },
      set: function (k, v) { return tx('readwrite', function (st) { st.put(v, k); }).catch(function () { try { store('kv_' + k, JSON.stringify(v)); } catch (e) {} }); },
      del: function (k) { return tx('readwrite', function (st) { st.delete(k); }).catch(function () { store('kv_' + k, null); }); }
    };
  })();
  function who() { return (S.me && S.me.email) || store('connect_email') || 'me'; }
  function isOffline(e) { return e && e.offline; }
  function offErr(msg) { var e = new Error(msg || 'You\'re offline. This part needs internet. Everything else still works and saves on your phone.'); e.offline = true; return e; }
  var ONLINE_ONLY = { requestCode: 'You need internet to get a sign-in code.', verifyCode: 'You need internet to sign in the first time on this phone.' };

  function api(action, data) {
    if (!API || API.indexOf('__') === 0) return Promise.reject(new Error('Connect is being set up. Please try again soon.'));
    if (navigator.onLine === false) return Promise.reject(offErr(ONLINE_ONLY[action]));
    var body = Object.assign({ action: action, token: S.token }, data || {});
    return fetch(API, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { throw offErr(ONLINE_ONLY[action] || 'Could not reach Connect. You may be offline. Your changes are kept on this phone.'); })
      .then(function (j) {
        if (!j.ok) {
          if (/sign in/i.test(j.error || '') && action !== 'verifyCode') { signOutLocal(); }
          throw new Error(j.error || 'Something went wrong.');
        }
        return j;
      });
  }
  function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label || 'Working…'; } else { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; } }
  function fail(e) { toast(e.message || String(e)); }

  /* ---------------- auth */
  function signInView(step, email, msg) {
    document.getElementById('tabs').hidden = true;
    document.getElementById('topRight').innerHTML = '';
    var bnv = document.getElementById('bottomNav'); if (bnv) bnv.hidden = true; document.body.classList.remove('has-bottom-nav');
    app.innerHTML =
      '<h1>Sign in to Connect</h1>' + (window.ConnectWatchButton ? ConnectWatchButton() : '') + '<p class="muted">Your job tracker, resume, license wallet and hours log stay private to you. Jobs and rule-change alerts are shared with everyone who signs up.</p>' +
      (msg ? '<div class="notice err" role="alert">' + h(msg) + '</div>' : '') +
      (step !== 'code' && JOIN
        ? '<form id="emailForm" class="card"><h2 style="margin-top:0">Join Connect</h2><p class="small muted">Free. Takes a minute. We\'ll email you a code to finish.</p><label for="jName">Full name</label><input id="jName" autocomplete="name" required><label for="jPhone">Mobile phone</label><input id="jPhone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="(248) 555-0123"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required value="' + h(email || '') + '"><p class="small muted" style="margin-top:8px">Your name, phone and email go to CMCC Training Institute, Crisp Cares and Crisp Clean so we can send you jobs, updates and your sign-in codes. Your tracker, resume and licenses stay private to you.</p><button class="primary" type="submit">Email me my code</button></form>'
        : step === 'code'
        ? '<form id="codeForm" class="card"><p>We emailed a 6-digit code to <b>' + h(email) + '</b>. It expires in 10 minutes.</p><label for="code">Code</label><input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required><div class="row" style="margin-top:12px"><button class="primary" type="submit">Sign in</button><button class="ghost" type="button" data-act="restart">Use a different email</button></div></form>'
        : '<form id="emailForm" class="card"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required value="' + h(email || '') + '"><p class="small muted" style="margin-top:8px">We\'ll email you a one-time code. No password needed.</p><button class="primary" type="submit">Email me a code</button></form>') +
      '<p class="small muted">New here? Signing in creates your free account. <a href="../">Back to Connect</a></p>';
    var f = document.getElementById(step === 'code' ? 'codeForm' : 'emailForm');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button[type=submit]');
      if (step === 'code') {
        busy(btn, true, 'Checking…');
        api('verifyCode', { email: email, code: field('code') }).then(function (j) { S.token = j.token; store('connect_token', j.token); store('connect_email', email); return load(); })
          .catch(function (err) { busy(btn, false); signInView('code', email, err.message); });
      } else {
        var em = field('email').toLowerCase();
        var extra = JOIN ? { name: field('jName'), phone: field('jPhone'), src: JOIN_SRC } : {};
        if (JOIN && (!extra.name || extra.phone.replace(/\D/g, '').length < 10)) { busy(btn, false); return signInView('email', em, 'Please enter your name and a 10-digit phone number.'); }
        busy(btn, true, 'Sending…');
        api('requestCode', Object.assign({ email: em }, extra)).then(function () { signInView('code', em); })
          .catch(function (err) { busy(btn, false); signInView('email', em, err.message); });
      }
    });
    var first = f.querySelector('input'); if (first) first.focus();
  }
  function signOutLocal() { S.token = null; store('connect_token', null); S.premium = null; S.admin = null; }

  function applyLoad(j) {
      S.me = j.me; S.jobs = j.jobs || []; S.items = j.items || []; S.updates = j.updates || []; S.unions = j.unions || []; S.wisdom = j.wisdom || []; S.resources = j.resources || []; S.aiOn = !!j.aiOn; S.plans = j.plans || []; S.products = j.products || []; S.orders = j.orders || []; S.specialties = j.specialties || [];
      var hash = (location.hash || '').replace('#', '');
      if (!S.me.name || !S.me.specialty) S.tab = 'profile';
      else if (TABS().some(function (t) { return t[0] === hash; })) S.tab = hash;
  }
  function cacheNow() {
    if (!S.me) return Promise.resolve();
    return KV.set('cache:' + S.me.email, { me: S.me, jobs: S.jobs, items: S.items, updates: S.updates, unions: S.unions, wisdom: S.wisdom, resources: S.resources, aiOn: S.aiOn, plans: S.plans, products: S.products, orders: S.orders, specialties: S.specialties, savedAt: new Date().toISOString() });
  }
  function saveOutbox() { return KV.set('outbox:' + who(), S.outbox); }
  function load() {
    app.innerHTML = '<p class="muted">Loading your Connect…</p>';
    var email = store('connect_email') || '';
    return KV.get('outbox:' + (email || 'me')).then(function (ob) { S.outbox = Array.isArray(ob) ? ob : []; })
      .then(function () { return api('me'); })
      .then(function (j) {
        S.offline = false; applyLoad(j);
        if (S.outbox.length) applyPendingLocally();
        render(); cacheNow();
        if (S.me.premium) api('premium').then(function (p) { S.premium = p.premium; KV.set('premium:' + S.me.email, p.premium); if (S.tab === 'learn') render(); }).catch(function () { KV.get('premium:' + S.me.email).then(function (pp) { if (pp) { S.premium = pp; if (S.tab === 'learn') render(); } }); });
        flush();
      })
      .catch(function (e) {
        if (isOffline(e) && S.token) {
          return KV.get('cache:' + email).then(function (c) {
            if (!c) { app.innerHTML = '<div class="notice err">You\'re offline, and this phone hasn\'t saved your Connect yet. Open it once with internet and it will work offline after that.</div><button class="primary" data-act="reload">Try again</button>'; return; }
            S.offline = true; applyLoad(c); applyPendingLocally();
            KV.get('premium:' + email).then(function (pp) { if (pp) S.premium = pp; render(); });
          });
        }
        if (!S.token) signInView('email', email, e.message); else app.innerHTML = '<div class="notice err">' + h(e.message) + '</div><button class="primary" data-act="reload">Try again</button>';
      });
  }

  /* ---------------- offline queue: changes save on the phone first, then sync */
  function newId() { return 'tmp-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function upsertLocal(kind, item) {
    var it = Object.assign({}, item, { kind: kind, updated: new Date().toISOString(), _pending: true });
    var i = S.items.findIndex(function (x) { return x.id === it.id; });
    if (i > -1) { if (S.items[i].files && !it.files) it.files = S.items[i].files; S.items[i] = it; } else S.items.push(it);
    return it;
  }
  function enqueue(op) {
    op.opId = op.opId || newId();
    if (op.op === 'save' && op.item.id) {   // fold repeat edits of the same entry into one change
      for (var k = S.outbox.length - 1; k >= 0; k--) { var o = S.outbox[k]; if (o.op === 'save' && o.item.id === op.item.id) { o.item = op.item; saveOutbox(); return; } if (o.op === 'upload' || o.op === 'delete') break; }
    }
    if (op.op === 'profile') { var pf = S.outbox.filter(function (o) { return o.op === 'profile'; })[0]; if (pf) { Object.assign(pf.profile, op.profile); saveOutbox(); return; } }
    S.outbox.push(op); saveOutbox();
  }
  function applyPendingLocally() {
    S.outbox.forEach(function (o) {
      if (o.op === 'save') upsertLocal(o.kind, o.item);
      else if (o.op === 'delete') S.items = S.items.filter(function (x) { return x.id !== o.id; });
      else if (o.op === 'profile' && S.me) { var r = o.profile; Object.keys(r).forEach(function (k) { S.me[k] = r[k]; }); }
      else if (o.op === 'upload') { var it = S.items.filter(function (x) { return x.id === o.upload.itemId; })[0]; if (it) { it.files = it.files || {}; it.files[o.upload.side] = { id: 'local:' + o.opId, mime: o.upload.mime, name: o.upload.name, local: true }; } S.localFiles['local:' + o.opId] = 'data:' + o.upload.mime + ';base64,' + o.upload.data; }
    });
  }
  function flush() {
    if (S.syncing || !S.outbox.length || !S.token || navigator.onLine === false) return Promise.resolve();
    S.syncing = true; renderStatus();
    var batch = S.outbox.slice(0, 50), sent = {};
    batch.forEach(function (o) { sent[o.opId] = 1; });
    return api('sync', { ops: batch }).then(function (r) {
      S.offline = false;
      var bad = r.results.filter(function (x) { return !x.ok; });
      S.outbox = S.outbox.filter(function (o) { return !sent[o.opId]; });
      // later changes may point at entries that just got real ids
      S.outbox.forEach(function (o) {
        if (o.item && r.ids[o.item.id]) o.item.id = r.ids[o.item.id];
        if (o.op === 'delete' && r.ids[o.id]) o.id = r.ids[o.id];
        if (o.op === 'upload' && r.ids[o.upload.itemId]) o.upload.itemId = r.ids[o.upload.itemId];
      });
      if (S.edit && S.edit.item && r.ids[S.edit.item.id]) S.edit.item.id = r.ids[S.edit.item.id];
      S.items = r.items; if (r.me) S.me = r.me;
      applyPendingLocally(); saveOutbox(); cacheNow();
      S.syncing = false;
      if (!S.edit) render(); else renderStatus();
      if (bad.length) toast(bad.length + ' change(s) could not be saved: ' + bad[0].error);
      else toast('Synced. Your changes are saved to your account.');
      if (S.outbox.length) return flush();
    }).catch(function (e) { S.syncing = false; if (isOffline(e)) S.offline = true; renderStatus(); });
  }
  function renderStatus() {
    var el = document.getElementById('netStatus'); if (!el) return;
    var n = S.outbox.length;
    el.innerHTML = S.syncing ? '<span class="pill net">Syncing…</span>' : (S.offline || navigator.onLine === false) ? '<span class="pill net off">Offline' + (n ? ' · ' + n + ' to sync' : '') + '</span>' : n ? '<button class="pill net" data-act="syncNow">' + n + ' to sync</button>' : '';
  }
  window.addEventListener('online', function () { S.offline = false; renderStatus(); flush(); });
  window.addEventListener('offline', function () { S.offline = true; renderStatus(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
  setInterval(function () { if (S.outbox.length) flush(); }, 60000);

  /* ---------------- shell */
  function TABS() {
    var t = [['home', 'Home'], ['ask', 'Ask & help'], ['jobs', 'Jobs'], ['unions', 'Unions'], ['tracker', 'My tracker'], ['wallet', 'Licenses'], ['log', 'Hours & miles'], ['learn', 'Learn'], ['wisdom', 'Wisdom'], ['resume', 'Resume'], ['upgrade', S.me && S.me.premium ? 'Pro & shop' : 'Upgrade'], ['profile', 'Profile']];
    if (S.me && S.me.role === 'admin') t.push(['admin', 'Admin']);
    return t;
  }
  function render() {
    var nav = document.getElementById('tabs'); nav.hidden = true;
    var MAIN = [['home', 'Home', 'home'], ['learn', 'Learn', 'bulb'], ['wisdom', 'Wisdom', 'mountain'], ['jobs', 'Jobs', 'briefcase'], ['more', 'More', 'people']];
    var inMain = MAIN.some(function (m) { return m[0] === S.tab; });
    var bn = document.getElementById('bottomNav'); bn.hidden = false; document.body.classList.add('has-bottom-nav');
    bn.innerHTML = MAIN.map(function (m) { var on = S.tab === m[0] || (m[0] === 'more' && !inMain); return '<button type="button" data-tab="' + m[0] + '"' + (on ? ' aria-current="page"' : '') + '><span class="bn-icon">' + ART[m[2]] + '</span><span>' + m[1] + '</span></button>'; }).join('');
    document.body.classList.toggle('feed-mode', S.tab === 'wisdom');
    document.getElementById('tabList').innerHTML = TABS().map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + h(t[1]) + '</button>'; }).join('');
    document.getElementById('topRight').innerHTML = '<span id="netStatus"></span>' + (S.me.premium ? '<span class="pill pro">Pro</span>' : '<button class="link" style="color:var(--gold)" data-tab="upgrade">Go Pro</button>');
    var fn = VIEWS[S.tab] || VIEWS.home;
    app.innerHTML = fn();
    var cur = document.querySelector('nav.tabs [aria-current]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
    renderStatus();
    if (S.tab === 'wallet' || S.tab === 'tracker') loadThumbs();
    if (S.tab === 'learn') afterLearnRender();
    if (S.tab === 'admin' && !S.admin) loadAdmin();
  }
  function go(tab) { S.tab = tab; S.edit = null; try { history.replaceState(null, '', '#' + tab); } catch (e) {} render(); window.scrollTo(0, 0); }

  /* ---------------- views */
  var VIEWS = {};
  var MORE = [['ask', 'Ask & help', 'chat', 'sky'], ['unions', 'Unions', 'handshake', 'sand'], ['tracker', 'My job tracker', 'briefcase', 'navy'], ['wallet', 'Licenses', 'shield', 'mint'], ['log', 'Hours & miles', 'clock', 'sun'], ['resume', 'Resume', 'book', 'lav'], ['upgrade', 'Pro & shop', 'coins', 'rose'], ['profile', 'Profile', 'people', 'sky'], ['howVideo', 'How it works', 'bulb', 'sun']];
  VIEWS.more = function () {
    var list = MORE.slice(); if (S.me.role === 'admin') list.push(['admin', 'Admin', 'law', 'navy']);
    return '<h1>Everything</h1><div class="tiles">' + list.map(function (m) { return '<button type="button" class="tile ' + m[3] + '" ' + (m[0] === 'howVideo' ? 'data-act="howVideo"' : 'data-tab="' + m[0] + '"') + '><span class="tile-art">' + ART[m[2]] + '</span><span class="tile-title">' + h(m[1]) + '</span></button>'; }).join('') + '</div>';
  };
  function quickTiles() {
    var q = [['learn', 'Learn', 'bulb', 'sun'], ['wisdom', 'Wisdom', 'mountain', 'lav'], ['jobs', 'Jobs', 'briefcase', 'navy'], ['unions', 'Unions', 'handshake', 'sand'], ['wallet', 'Licenses', 'shield', 'mint'], ['ask', 'Ask', 'chat', 'sky']];
    return '<div class="tiles small-tiles">' + q.map(function (m) { return '<button type="button" class="tile ' + m[3] + '" data-tab="' + m[0] + '"><span class="tile-art">' + ART[m[2]] + '</span><span class="tile-title">' + m[1] + '</span></button>'; }).join('') + '</div>';
  }

  VIEWS.home = function () {
    var me = S.me, first = (me.name || '').split(' ')[0];
    var certs = items('cert').filter(function (c) { var d = daysUntil(c.expires); return d !== null && d <= 90; }).sort(function (a, b) { return a.expires < b.expires ? -1 : 1; });
    var fol = items('track').filter(function (t) { return t.followUp && t.followUp <= today() && TRACK_DONE.indexOf(t.status) < 0; });
    var seen = Number(store('connect_updates_seen') || 0);
    var newUp = S.updates.filter(function (u) { return new Date(u.created).getTime() > seen && fieldMatches(u.field); });
    var yr = new Date().getFullYear() + '';
    var hrs = items('log').filter(function (l) { return l.type === 'Hours' && (l.date || '').indexOf(yr) === 0; }).reduce(function (s, l) { return s + (Number(l.hours) || 0); }, 0);
    return '<h1>' + (first ? 'Welcome back, ' + h(first) : 'Welcome') + '</h1>' +
      tickerHtml() + quickTiles() + (store('connect_seen_video') ? '' : (window.ConnectWatchButton ? ConnectWatchButton() : '')) + wisdomToday() +
      (newUp.length ? '<div class="notice"><b>' + newUp.length + ' rule change' + (newUp.length > 1 ? 's' : '') + ' for your field.</b> <button class="link" data-act="openUpdates">Read them</button></div>' : '') +
      '<div class="grid2">' +
      '<div class="stat"><b>' + items('track').filter(function (t) { return t.status === 'Applied' || t.status === 'Interviewing'; }).length + '</b>open applications</div>' +
      '<div class="stat"><b>' + items('cert').length + '</b>licenses saved</div>' +
      '<div class="stat"><b>' + (Math.round(hrs * 10) / 10) + '</b>hours logged in ' + yr + '</div>' +
      '<div class="stat"><b>' + S.jobs.filter(function (j) { return j.status === 'approved'; }).length + '</b>jobs on the board</div></div>' +
      (certs.length ? '<h2>Coming due</h2><div class="card">' + certs.map(function (c) { return '<div class="list-item spread"><span>' + h(c.name) + '</span>' + expTag(c.expires) + '</div>'; }).join('') + '</div>' : '') +
      (fol.length ? '<h2>Follow up today</h2><div class="card">' + fol.map(function (t) { return '<div class="list-item spread"><span>' + h(t.title) + (t.company ? ' — ' + h(t.company) : '') + '</span><button class="link" data-act="editTrack" data-id="' + h(t.id) + '">Open</button></div>'; }).join('') + '</div>' : '') +
      '<h2>Newest jobs</h2>' + (S.jobs.filter(function (j) { return j.status === 'approved'; }).slice(0, 3).map(jobCard).join('') || '<p class="muted">No jobs posted yet. You\'ll get an email when one is.</p>') +
      (!S.me.premium ? '<div class="card"><h3>Connect Pro</h3><p class="muted">Full exam prep for your field, advanced wiring diagrams, more refreshers and hands-free car-mode playlists.</p><button class="gold" data-tab="upgrade">See plans</button></div>' : '');
  };

  function tickerHtml() {
    var s = S.me.schoolStart;
    if (!s) return '<div class="ticker"><div class="big">Your years in the trade</div><p style="margin:6px 0 0">Add the date you started school under <button class="link" style="color:var(--gold)" data-tab="profile">Profile</button>. That counts as Year One.</p></div>';
    var start = new Date(s + 'T00:00:00'), now = new Date();
    var days = Math.max(0, Math.floor((now - start) / 86400000));
    var year = Math.floor(days / 365.25) + 1;
    var into = days - Math.floor((year - 1) * 365.25);
    return '<div class="ticker"><div class="small" style="color:#E6DDC8">In the trade since ' + h(fmtDate(s)) + '</div><div class="big">Year ' + year + '</div><div>Day ' + (into + 1) + ' of year ' + year + ' · ' + days.toLocaleString() + ' days total</div></div>';
  }
  function expTag(exp) {
    var d = daysUntil(exp);
    if (d === null) return '<span class="tag">No expiration</span>';
    if (d < 0) return '<span class="tag bad">Expired ' + h(fmtDate(exp)) + '</span>';
    if (d <= 30) return '<span class="tag bad">' + d + ' days left</span>';
    if (d <= 90) return '<span class="tag warn">' + d + ' days left</span>';
    return '<span class="tag ok">Good until ' + h(fmtDate(exp)) + '</span>';
  }
  function fieldMatches(f) { var sp = S.me.specialty; return f === 'All' || f === sp || (f === 'EPA 608' && sp === 'HVAC/R') || !sp; }

  /* jobs */
  function jobCard(j) {
    var saved = items('track').some(function (t) { return t.jobId === j.id; });
    var st = j.status !== 'approved' ? ' <span class="tag ' + (j.status === 'pending' ? 'warn' : 'bad') + '">' + h(j.status) + '</span>' : '';
    return '<div class="card job-card"><div class="spread"><div><h3>' + h(j.title) + st + '</h3><div class="muted small">' + [j.company, j.location, j.type, j.pay].filter(Boolean).map(h).join(' · ') + '</div></div><span class="tag">' + h(j.category) + '</span></div>' +
      (j.description ? '<p style="margin-top:8px;white-space:pre-line">' + h(j.description) + '</p>' : '') +
      (j.requirements ? '<p class="small" style="margin:6px 0 0"><b>What they want:</b> ' + h(j.requirements) + '</p>' : '') +
      (j.benefits ? '<p class="small" style="margin:6px 0 0"><b>Perks:</b> ' + h(j.benefits) + '</p>' : '') +
      (j.itin ? '<details class="small itin"><summary>Work papers &amp; ITIN</summary><p style="margin:6px 0 0">' + h(j.itin) + ' <button class="link" data-act="itinInfo">More about ITINs</button></p></details>' : '') +
      (j.source ? '<p class="small muted" style="margin:6px 0 0">' + h(j.source) + (j.checked ? ' · checked ' + h(fmtDate(j.checked)) : '') + '</p>' : '') +
      '<div class="row">' + (j.status === 'approved' ? (saved ? '<span class="tag ok">In your tracker</span>' : '<button class="primary" data-act="saveJob" data-id="' + h(j.id) + '">Save to my tracker</button>') : '') +
      (j.url ? '<a class="btn ghost" href="' + h(j.url) + '" target="_blank" rel="noopener">Apply / details</a>' : '') +
      (j.contact ? '<span class="small muted">Contact: ' + h(j.contact) + '</span>' : '') +
      (S.me.role === 'admin' && j.status === 'pending' ? '<button class="primary" data-act="reviewJob" data-id="' + h(j.id) + '" data-d="approve">Approve</button><button class="danger" data-act="reviewJob" data-id="' + h(j.id) + '" data-d="decline">Decline</button>' : '') +
      ((S.me.role === 'admin' || j.mine) && j.status === 'approved' ? '<button class="link" data-act="closeJob" data-id="' + h(j.id) + '">Close post</button>' : '') +
      '</div></div>';
  }
  function myFields() { return [S.me.specialty].concat(S.me.fields || []).filter(Boolean); }
  VIEWS.jobs = function () {
    var f = S.jobFilter || (S.me.role === 'admin' || S.me.role === 'partner' ? 'all' : 'mine');
    var mine = myFields();
    var list = S.jobs.filter(function (j) {
      if (j.status !== 'approved') return true;
      if (f === 'all') return true;
      if (f === 'mine') return !mine.length || mine.indexOf(j.category) > -1 || j.category === 'Other';
      return j.category === f;
    });
    var cats = S.jobs.filter(function (j) { return j.status === 'approved'; }).map(function (j) { return j.category; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
    var canPost = S.me.role === 'admin' || (S.me.role === 'partner' && S.me.partnerStatus === 'approved');
    return '<h1>Job board</h1><p class="muted">Openings found and checked by Lamira Clean in Southfield, plus posts from approved partners. Save one to track your application.</p>' +
      '<div class="chips" style="margin-bottom:10px"><button class="chip' + (f === 'mine' ? ' on' : '') + '" data-act="jobFilter" data-f="mine">My fields</button><button class="chip' + (f === 'all' ? ' on' : '') + '" data-act="jobFilter" data-f="all">All jobs</button>' +
      cats.map(function (c) { return '<button class="chip' + (f === c ? ' on' : '') + '" data-act="jobFilter" data-f="' + h(c) + '">' + h(c) + '</button>'; }).join('') + '</div>' +
      '<p class="small muted" style="margin:0 0 10px">Want jobs in other fields too? <button class="link" data-tab="profile">Pick more fields in Profile</button>.</p>' +
      itinCard() +
      (canPost ? '<div class="row" style="margin-bottom:12px"><button class="gold" data-act="newJob">Post a job</button></div>' : '') +
      (S.edit === 'newJob' ? jobForm() : '') +
      (list.map(jobCard).join('') || '<p class="muted">No jobs here yet. Turn on alerts in Profile and we\'ll email you when one is posted.</p>') +
      (!canPost ? '<p class="small muted">Hiring? Partners can post jobs here. Ask for partner access under <button class="link" data-tab="profile">Profile</button>.</p>' : '');
  };
  function itinCard() {
    return '<details class="card itin-card" id="itinCard"' + (S.itinOpen ? ' open' : '') + '><summary><b>Have an ITIN instead of a Social Security number?</b></summary>' +
      '<ul style="margin:8px 0 0 18px;padding:0" class="small">' +
      '<li>An ITIN (Individual Taxpayer Identification Number) is a tax number from the IRS. You use it to file taxes. It does not give permission to work.</li>' +
      '<li>For W-2 jobs, every employer has you fill out Form I-9 and show papers that prove you can work in the U.S., like a Social Security card with a photo ID, a green card, or a work permit (EAD). An ITIN by itself does not meet that.</li>' +
      '<li>Every job on this board is marked so you can see what it asks for before you apply. Tap "Work papers &amp; ITIN" on a job.</li>' +
      '<li>If you have a work permit, use the Social Security number that comes with it. If you are waiting on one, keep studying and earning your EPA 608. It travels with you.</li>' +
      '<li>Lamira Clean can help you apply for or renew an ITIN (Form W-7) and file your taxes. <button class="link" data-tab="upgrade">See tax help</button></li>' +
      '</ul><p class="small muted" style="margin:8px 0 0">General information, not legal advice. Rules on who can work are set by U.S. immigration law (8 U.S.C. 1324a) and the I-9 form instructions.</p></details>';
  }
  function specOptions(sel, extra) { return (extra || []).concat(S.specialties).map(function (s) { return '<option' + (s === sel ? ' selected' : '') + '>' + h(s) + '</option>'; }).join(''); }
  function jobForm() {
    return '<form class="card" data-form="postJob"><h3>Post a job</h3>' + (S.me.role !== 'admin' ? '<p class="small muted">Partner posts show after they are reviewed.</p>' : '<p class="small muted">Posting emails everyone in that field who has alerts on.</p>') +
      '<div class="form-grid"><div class="full"><label for="jTitle">Job title</label><input id="jTitle" required></div>' +
      '<div><label for="jCompany">Company</label><input id="jCompany" value="' + h(S.me.company || '') + '"></div><div><label for="jCat">Field</label><select id="jCat">' + specOptions(S.me.specialty) + '</select></div>' +
      '<div><label for="jPay">Pay</label><input id="jPay" placeholder="$25–30/hr"></div><div><label for="jType">Type</label><input id="jType" placeholder="Full time, part time, per call"></div>' +
      '<div><label for="jLoc">Location</label><input id="jLoc" placeholder="Southfield, MI"></div><div><label for="jContact">How to apply / contact</label><input id="jContact"></div>' +
      '<div class="full"><label for="jUrl">Link (optional)</label><input id="jUrl" type="url" placeholder="https://"></div>' +
      '<div class="full"><label for="jDesc">Description</label><textarea id="jDesc"></textarea></div>' +
      '<div class="full"><label for="jReq">What they want (licenses, experience)</label><textarea id="jReq" style="min-height:60px"></textarea></div>' +
      '<div class="full"><label for="jBen">Perks (pay schedule, van, training, bonus)</label><input id="jBen"></div>' +
      '<div class="full"><label for="jItin">Work papers / ITIN</label><input id="jItin" value="W-2 job: you will fill out Form I-9 and show work authorization. An ITIN by itself is a tax number, not work permission."></div>' +
      (S.me.role === 'admin' ? '<div class="full"><label class="check"><input type="checkbox" id="jQuiet"> Post quietly (don\'t email members)</label></div>' : '') + '</div>' +
      '<div class="row" style="margin-top:12px"><button class="primary" type="submit">Post</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div></form>';
  }

  /* tracker */
  var STAGE_NEXT = { Saved: 'Applied', Researching: 'Applied', Applied: 'Interviewing', Interviewing: 'Offer received', 'Offer received': 'Offer accepted' };
  function stageTag(st) { st = st || 'Saved'; var c = st === 'Offer accepted' ? 'ok' : st === 'Offer received' || st === 'Interviewing' ? 'warn' : TRACK_DONE.indexOf(st) > -1 ? 'bad' : 'navy'; return '<span class="tag ' + c + '">' + h(st) + '</span>'; }
  function trackLog(t) { var l = Array.isArray(t.log) ? t.log.slice() : []; return l.sort(function (a, b) { return a.d < b.d ? 1 : -1; }); }
  VIEWS.tracker = function () {
    var all = items('track').sort(function (a, b) { return (b.updated || '') > (a.updated || '') ? 1 : -1; });
    var tf = S.trackFilter || 'active';
    var list = all.filter(function (t) { var st = t.status || 'Saved'; return tf === 'all' || (tf === 'active' ? TRACK_DONE.indexOf(st) < 0 : tf === 'done' ? TRACK_DONE.indexOf(st) > -1 : st === tf); });
    var counts = TRACK_STATUS.map(function (s) { return [s, all.filter(function (t) { return (t.status || 'Saved') === s; }).length]; }).filter(function (c) { return c[1]; });
    var due = all.filter(function (t) { return t.followUp && t.followUp <= today() && TRACK_DONE.indexOf(t.status) < 0; }).length;
    var active = all.filter(function (t) { return TRACK_DONE.indexOf(t.status || 'Saved') < 0; }).length;
    return '<h1>My job tracker</h1><p class="muted">Only you can see this. It works without internet and syncs when you\'re back online.</p>' +
      '<div class="grid2"><div class="stat"><b>' + active + '</b>active</div><div class="stat"><b>' + all.filter(function (t) { return t.status === 'Applied'; }).length + '</b>applied</div><div class="stat"><b>' + all.filter(function (t) { return t.status === 'Interviewing'; }).length + '</b>interviewing</div><div class="stat"><b>' + due + '</b>follow-ups due</div></div>' +
      '<div class="chips" style="margin:10px 0"><button class="chip' + (tf === 'active' ? ' on' : '') + '" data-act="trackFilter" data-f="active">Active</button><button class="chip' + (tf === 'all' ? ' on' : '') + '" data-act="trackFilter" data-f="all">All (' + all.length + ')</button>' +
      counts.map(function (c) { return '<button class="chip' + (tf === c[0] ? ' on' : '') + '" data-act="trackFilter" data-f="' + h(c[0]) + '">' + h(c[0]) + ' ' + c[1] + '</button>'; }).join('') +
      '<button class="chip' + (tf === 'done' ? ' on' : '') + '" data-act="trackFilter" data-f="done">Closed</button></div>' +
      '<div class="row"><button class="primary" data-act="editTrack">Add a job I applied to</button><button class="ghost" data-tab="jobs">Find jobs</button>' + (all.length ? '<button class="ghost" data-act="exportTrack">Download (CSV)</button>' : '') + '</div>' +
      (S.edit && S.edit.kind === 'track' ? trackForm(S.edit.item) : '') +
      '<div style="margin-top:12px">' + (list.map(trackCard).join('') || '<p class="muted">' + (all.length ? 'Nothing in this view.' : 'Nothing tracked yet. Save a job from the board or add one you found elsewhere.') + '</p>') + '</div>';
  };
  function trackCard(t) {
    var st = t.status || 'Saved', nxt = STAGE_NEXT[st], f = t.files || {}, log = trackLog(t);
    var fd = t.followUp ? daysUntil(t.followUp) : null;
    return '<div class="card track-card"><div class="spread"><div><h3>' + h(t.title) + (t._pending ? ' <span class="tag">not synced</span>' : '') + '</h3><div class="muted small">' + [t.company, t.location, t.pay, t.type].filter(Boolean).map(h).join(' · ') + '</div></div>' + stageTag(st) + '</div>' +
      '<div class="kv small">' +
      (t.dateApplied ? '<div><span>Applied</span>' + h(fmtDate(t.dateApplied)) + '</div>' : '') +
      (t.appNumber ? '<div><span>App / confirmation #</span>' + h(t.appNumber) + '</div>' : '') +
      (t.interview ? '<div><span>Interview</span>' + h(fmtDate(t.interview.slice(0, 10))) + (t.interview.length > 10 ? ' ' + h(t.interview.slice(11, 16)) : '') + '</div>' : '') +
      (t.followUp ? '<div><span>Follow up</span>' + h(fmtDate(t.followUp)) + (fd !== null && fd <= 0 && TRACK_DONE.indexOf(st) < 0 ? ' <b style="color:#B3261E">due</b>' : '') + '</div>' : '') +
      (t.contact ? '<div><span>Contact</span>' + h(t.contact) + (t.contactInfo ? ' · ' + h(t.contactInfo) : '') + '</div>' : '') +
      (t.resumeUsed ? '<div><span>Resume used</span>' + h(t.resumeUsed) + '</div>' : '') +
      (t.nextStep ? '<div><span>Next step</span>' + h(t.nextStep) + '</div>' : '') +
      (t.source ? '<div><span>Found on</span>' + h(t.source) + '</div>' : '') +
      '</div>' +
      (t.notes ? '<p class="small" style="margin-top:6px;white-space:pre-line">' + h(t.notes) + '</p>' : '') +
      (log.length ? '<div class="tlog small">' + log.slice(0, 3).map(function (e) { return '<div><b>' + h(fmtDate(e.d)) + '</b> ' + h(e.t) + '</div>'; }).join('') + (log.length > 3 ? '<div class="muted">+' + (log.length - 3) + ' earlier</div>' : '') + '</div>' : '') +
      (S.logFor === t.id ? '<form class="row" data-form="trackLog" style="margin-top:8px"><input id="tlText" placeholder="What happened? (called, emailed, interview set…)" style="flex:1;min-width:200px" required><input type="hidden" id="tlId" value="' + h(t.id) + '"><button class="primary" type="submit">Add</button><button class="ghost" type="button" data-act="cancelLog">Cancel</button></form>' : '') +
      '<div class="thumbs">' + ['resume', 'cover', 'other'].filter(function (sd) { return f[sd]; }).map(function (sd) { var lbl = sd === 'cover' ? 'cover letter' : sd; return /^local:/.test(f[sd].id) ? '<span class="small muted">' + lbl + ' (uploads when online)</span>' : '<button class="link" data-act="viewDoc" data-id="' + h(f[sd].id) + '">Open ' + lbl + '</button>'; }).join(' ') + '</div>' +
      '<div class="row" style="margin-top:8px">' +
      (nxt ? '<button class="primary" data-act="trackStage" data-id="' + h(t.id) + '" data-s="' + h(nxt) + '">Mark ' + h(nxt) + '</button>' : '') +
      '<button class="ghost" data-act="trackLogOpen" data-id="' + h(t.id) + '">Log an update</button>' +
      (t.followUp && TRACK_DONE.indexOf(st) < 0 ? '<button class="ghost" data-act="trackFollowed" data-id="' + h(t.id) + '">I followed up</button>' : '') +
      '<button class="ghost" data-act="editTrack" data-id="' + h(t.id) + '">Edit</button>' +
      (t.url ? '<a class="btn ghost" href="' + h(t.url) + '" target="_blank" rel="noopener">Posting</a>' : '') +
      (t.confirmUrl ? '<a class="btn ghost" href="' + h(t.confirmUrl) + '" target="_blank" rel="noopener">Confirmation</a>' : '') +
      ['resume', 'cover'].map(function (sd) { return '<label class="btn ghost" style="margin:0;font-size:14px">' + (f[sd] ? 'Replace ' : 'Attach ') + (sd === 'cover' ? 'cover letter' : 'resume') + '<input type="file" hidden accept="application/pdf,image/*" data-upload="' + h(t.id) + '" data-side="' + sd + '"></label>'; }).join('') +
      '<button class="link" data-act="delItem" data-id="' + h(t.id) + '">Delete</button></div></div>';
  }
  function trackForm(t) {
    t = t || {};
    var resumes = [S.me.resume && S.me.resume.headline ? 'Connect resume — ' + S.me.resume.headline : 'Connect resume'];
    return '<form class="card" data-form="saveTrack" style="margin-top:12px"><h3>' + (t.id ? 'Edit job' : 'Add a job') + '</h3><div class="form-grid">' +
      '<div class="full"><label for="tTitle">Job title</label><input id="tTitle" required value="' + h(t.title) + '"></div>' +
      '<div><label for="tCompany">Company</label><input id="tCompany" value="' + h(t.company) + '"></div><div><label for="tStatus">Status</label><select id="tStatus">' + TRACK_STATUS.map(function (s) { return '<option' + (s === (t.status || 'Saved') ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="tCat">Field</label><select id="tCat">' + specOptions(t.category || S.me.specialty) + '</select></div><div><label for="tPay">Pay</label><input id="tPay" value="' + h(t.pay) + '"></div>' +
      '<div><label for="tType">Type</label><input id="tType" value="' + h(t.type) + '" placeholder="Full time, W-2, 1099"></div><div><label for="tLoc">Location</label><input id="tLoc" value="' + h(t.location) + '"></div>' +
      '<div><label for="tSource">Where you found it</label><input id="tSource" value="' + h(t.source) + '" placeholder="Indeed, a friend, company site"></div><div><label for="tApplied">Date applied</label><input id="tApplied" type="date" value="' + h(t.dateApplied) + '"></div>' +
      '<div><label for="tApp">Application / confirmation #</label><input id="tApp" value="' + h(t.appNumber) + '"></div><div><label for="tConfirm">Confirmation link</label><input id="tConfirm" type="url" value="' + h(t.confirmUrl) + '" placeholder="https://"></div>' +
      '<div><label for="tContact">Contact person</label><input id="tContact" value="' + h(t.contact) + '" placeholder="Recruiter or manager"></div><div><label for="tContactInfo">Their phone or email</label><input id="tContactInfo" value="' + h(t.contactInfo) + '"></div>' +
      '<div><label for="tInterview">Interview</label><input id="tInterview" type="datetime-local" value="' + h(t.interview) + '"></div><div><label for="tFollow">Follow up on</label><input id="tFollow" type="date" value="' + h(t.followUp) + '"></div>' +
      '<div><label for="tResume">Resume used</label><input id="tResume" list="resumeList" value="' + h(t.resumeUsed) + '"><datalist id="resumeList">' + resumes.map(function (r) { return '<option value="' + h(r) + '">'; }).join('') + '</datalist></div><div><label for="tNext">Next step</label><input id="tNext" value="' + h(t.nextStep) + '" placeholder="Send references, drug test…"></div>' +
      '<div class="full"><label for="tReq">What they want</label><input id="tReq" value="' + h(t.requirements) + '" placeholder="EPA 608, 2 years, driver license"></div>' +
      '<div class="full"><label for="tUrl">Link to the posting</label><input id="tUrl" type="url" value="' + h(t.url) + '"></div>' +
      '<div class="full"><label for="tNotes">Notes</label><textarea id="tNotes">' + h(t.notes) + '</textarea></div></div>' +
      '<input type="hidden" id="tId" value="' + h(t.id || '') + '"><input type="hidden" id="tJob" value="' + h(t.jobId || '') + '">' +
      '<div class="row" style="margin-top:12px"><button class="primary" type="submit">Save</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div><p class="small muted" style="margin-top:8px">We\'ll email you on your follow-up date. Save first, then attach your resume or cover letter on the card.</p></form>';
  }
  function exportTrack() {
    var cols = [['Title', 'title'], ['Company', 'company'], ['Status', 'status'], ['Field', 'category'], ['Pay', 'pay'], ['Type', 'type'], ['Location', 'location'], ['Found on', 'source'], ['Date applied', 'dateApplied'], ['App / confirmation #', 'appNumber'], ['Confirmation link', 'confirmUrl'], ['Contact', 'contact'], ['Contact info', 'contactInfo'], ['Interview', 'interview'], ['Follow up', 'followUp'], ['Resume used', 'resumeUsed'], ['Next step', 'nextStep'], ['What they want', 'requirements'], ['Posting', 'url'], ['Notes', 'notes']];
    var rows = [cols.map(function (c) { return c[0]; }).concat(['Updates'])].concat(items('track').map(function (t) { return cols.map(function (c) { return t[c[1]] || (c[1] === 'status' ? 'Saved' : ''); }).concat([trackLog(t).map(function (e) { return e.d + ': ' + e.t; }).join(' | ')]); }));
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'my-job-tracker-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function trackUpdate(id, patch, note) {
    var t = items('track').filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var it = Object.assign({}, t, patch); delete it.kind; delete it.updated; delete it._pending; delete it.files;
    if (note) it.log = (Array.isArray(t.log) ? t.log.slice() : []).concat([{ d: today(), t: note }]);
    return saveItem('track', it, null);
  }

  /* wallet */
  function commonLicenses() {
    var sp = S.me.specialty, list = ((LEARN[sp] || {}).licenses || []).slice();
    return list.filter(function (n) { return !items('cert').some(function (c) { return c.name === n; }); });
  }
  VIEWS.wallet = function () {
    var list = items('cert').sort(function (a, b) { return (a.expires || '9999') < (b.expires || '9999') ? -1 : 1; });
    var common = commonLicenses();
    return '<h1>License wallet</h1><p class="muted">Keep your licenses and certifications on your phone, front and back, with the file. Only you can see them. We\'ll email you before they expire.</p>' +
      '<button class="primary" data-act="editCert">Add a license or certification</button>' +
      (common.length ? '<div class="card" style="margin-top:12px"><h3>Often asked for in ' + h(S.me.specialty) + '</h3><p class="small muted">Tap to add. Check each job posting for what it requires.</p><div class="row">' + common.map(function (n) { return '<button class="ghost" data-act="editCert" data-name="' + h(n) + '">+ ' + h(n) + '</button>'; }).join('') + '</div></div>' : '') +
      (S.edit && S.edit.kind === 'cert' ? certForm(S.edit.item) : '') +
      '<div style="margin-top:12px">' + (list.map(function (c) {
        var f = c.files || {};
        return '<div class="card"><div class="spread"><div><h3>' + h(c.name) + '</h3><div class="muted small">' + [c.number ? '# ' + c.number : '', c.issuer, c.issued ? 'Issued ' + fmtDate(c.issued) : ''].filter(Boolean).map(h).join(' · ') + '</div></div>' + expTag(c.expires) + '</div>' +
          '<div class="thumbs" id="th-' + h(c.id) + '">' + ['front', 'back', 'file'].filter(function (s) { return f[s]; }).map(function (s) { return '<span class="small muted" data-file="' + h(f[s].id) + '" data-mime="' + h(f[s].mime) + '" data-side="' + s + '">Loading ' + s + '…</span>'; }).join('') + '</div>' +
          '<div class="row" style="margin-top:8px">' + ['front', 'back', 'file'].map(function (s) {
            var lbl = s === 'file' ? (f.file ? 'Replace file' : 'Add file (PDF)') : (f[s] ? 'Replace ' + s : 'Add ' + s + ' photo');
            return '<label class="btn ghost" style="margin:0;font-size:14px">' + lbl + '<input type="file" hidden accept="' + (s === 'file' ? 'application/pdf,image/*' : 'image/*') + '" data-upload="' + h(c.id) + '" data-side="' + s + '"' + (s !== 'file' ? ' capture="environment"' : '') + '></label>';
          }).join('') + '<button class="ghost" data-act="editCert" data-id="' + h(c.id) + '">Edit</button><button class="link" data-act="delItem" data-id="' + h(c.id) + '">Delete</button></div></div>';
      }).join('') || '<p class="muted">No licenses saved yet.</p>') + '</div>';
  };
  function certForm(c) {
    c = c || {};
    return '<form class="card" data-form="saveCert" style="margin-top:12px"><h3>' + (c.id ? 'Edit' : 'Add') + ' license or certification</h3><div class="form-grid">' +
      '<div class="full"><label for="cName">Name</label><input id="cName" required value="' + h(c.name) + '" placeholder="EPA 608 Universal"></div>' +
      '<div><label for="cNum">Number</label><input id="cNum" value="' + h(c.number) + '"></div><div><label for="cIssuer">Issued by</label><input id="cIssuer" value="' + h(c.issuer) + '"></div>' +
      '<div><label for="cIssued">Issued on</label><input id="cIssued" type="date" value="' + h(c.issued) + '"></div><div><label for="cExp">Expires on (leave blank if never)</label><input id="cExp" type="date" value="' + h(c.expires) + '"></div>' +
      '<div class="full"><label for="cNotes">Notes (CEUs needed, renewal steps)</label><textarea id="cNotes">' + h(c.notes) + '</textarea></div></div>' +
      '<input type="hidden" id="cId" value="' + h(c.id || '') + '"><div class="row" style="margin-top:12px"><button class="primary" type="submit">Save</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div><p class="small muted" style="margin-top:8px">After saving, add photos of the front and back.</p></form>';
  }
  function loadThumbs() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-file]'), function (el) {
      var id = el.getAttribute('data-file'), mime = el.getAttribute('data-mime'), side = el.getAttribute('data-side');
      var show = function (url) {
        if (/^image\//.test(mime)) el.outerHTML = '<img src="' + url + '" alt="' + h(side) + ' of license" data-act="zoom">';
        else el.outerHTML = '<a class="btn ghost" href="' + url + '" target="_blank" rel="noopener">Open ' + h(side) + ' (PDF)</a>';
      };
      if (S.files[id]) return show(S.files[id]);
      if (S.localFiles[id]) return show(S.localFiles[id]);
      var toUrl = function (j) { var bin = atob(j.data), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); S.files[id] = URL.createObjectURL(new Blob([arr], { type: j.mime })); show(S.files[id]); };
      KV.get('file:' + id).then(function (c) {
        if (c) return toUrl(c);
        return api('getFile', { fileId: id }).then(function (j) { if (j.data.length < 3000000) KV.set('file:' + id, { mime: j.mime, data: j.data }); toUrl(j); });
      }).catch(function () { el.textContent = S.offline ? side + ' shows when you\'re back online' : 'Could not load ' + side; });
    });
  }
  function readFileForUpload(file) {
    return new Promise(function (resolve, reject) {
      if (file.type === 'application/pdf') {
        if (file.size > 8 * 1024 * 1024) return reject(new Error('PDFs must be under 8 MB.'));
        var r = new FileReader(); r.onload = function () { resolve({ mime: 'application/pdf', data: String(r.result).split(',')[1] }); }; r.onerror = function () { reject(new Error('Could not read the file.')); }; r.readAsDataURL(file); return;
      }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, hgt = img.naturalHeight, k = Math.min(1, max / Math.max(w, hgt));
        var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(hgt * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        resolve({ mime: 'image/jpeg', data: cv.toDataURL('image/jpeg', 0.85).split(',')[1] });
      };
      img.onerror = function () { reject(new Error('That photo type could not be read. Try a JPG or PNG.')); };
      img.src = url;
    });
  }

  /* hours & mileage */
  VIEWS.log = function () {
    var yr = String(S.logYear || new Date().getFullYear());
    var list = items('log').filter(function (l) { return (l.date || '').indexOf(yr) === 0; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var sum = function (t, k) { return list.filter(function (l) { return l.type === t; }).reduce(function (s, l) { return s + (Number(l[k]) || 0); }, 0); };
    var by = {}; list.filter(function (l) { return l.type === 'Hours'; }).forEach(function (l) { var k = l.who || 'Unassigned'; by[k] = (by[k] || 0) + (Number(l.hours) || 0); });
    return '<h1>Hours &amp; mileage</h1><p class="muted">Log field or apprenticeship hours, work miles and expenses. Export it for your license application or your tax preparer.</p>' +
      '<div class="grid2"><div class="stat"><b>' + Math.round(sum('Hours', 'hours') * 10) / 10 + '</b>hours in ' + yr + '</div><div class="stat"><b>' + Math.round(sum('Mileage', 'miles')).toLocaleString() + '</b>work miles</div><div class="stat"><b>' + money(sum('Expense', 'amount')) + '</b>expenses</div></div>' +
      (Object.keys(by).length ? '<div class="card" style="margin-top:10px"><h3>Hours by employer / client</h3>' + Object.keys(by).map(function (k) { return '<div class="list-item spread"><span>' + h(k) + '</span><b>' + Math.round(by[k] * 10) / 10 + '</b></div>'; }).join('') + '</div>' : '') +
      '<div class="row" style="margin:12px 0"><button class="primary" data-act="editLog">Add entry</button><button class="ghost" data-act="exportLog">Export ' + yr + ' (CSV)</button>' +
      '<label for="logYear" style="margin:0">Year</label><select id="logYear" style="width:auto" data-act-change="logYear">' + [0, 1, 2].map(function (n) { var y = new Date().getFullYear() - n; return '<option' + (String(y) === yr ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></div>' +
      (S.edit && S.edit.kind === 'log' ? logForm(S.edit.item) : '') +
      '<div class="card">' + (list.map(function (l) {
        var amt = l.type === 'Hours' ? (l.hours + ' hr') : l.type === 'Mileage' ? (l.miles + ' mi') : money(l.amount);
        return '<div class="list-item spread"><div><b>' + h(amt) + '</b> <span class="tag">' + h(l.type) + '</span><div class="small muted">' + h(fmtDate(l.date)) + (l.who ? ' · ' + h(l.who) : '') + (l.category ? ' · ' + h(l.category) : '') + (l.notes ? ' · ' + h(l.notes) : '') + '</div></div><div class="row"><button class="link" data-act="editLog" data-id="' + h(l.id) + '">Edit</button><button class="link" data-act="delItem" data-id="' + h(l.id) + '">Delete</button></div></div>';
      }).join('') || '<p class="muted" style="margin:0">No entries for ' + yr + '.</p>') + '</div>' +
      '<p class="small muted">Your tax preparer applies the IRS standard mileage rate for the year. Keep a log as you go; it\'s what backs up the deduction.</p>';
  };
  function logForm(l) {
    l = l || { type: 'Hours', date: today() };
    return '<form class="card" data-form="saveLog"><h3>' + (l.id ? 'Edit' : 'Add') + ' entry</h3><div class="form-grid">' +
      '<div><label for="lType">Type</label><select id="lType">' + LOG_TYPES.map(function (t) { return '<option' + (t === l.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="lDate">Date</label><input id="lDate" type="date" required value="' + h(l.date) + '"></div>' +
      '<div><label for="lQty">Hours, miles or amount ($)</label><input id="lQty" inputmode="decimal" required value="' + h(l.type === 'Hours' ? l.hours : l.type === 'Mileage' ? l.miles : l.amount) + '"></div>' +
      '<div><label for="lWho">Employer / client / job</label><input id="lWho" value="' + h(l.who) + '"></div>' +
      '<div><label for="lCat">Category (e.g., install, service, tools, fuel)</label><input id="lCat" value="' + h(l.category) + '"></div>' +
      '<div><label for="lNotes">Notes / supervisor</label><input id="lNotes" value="' + h(l.notes) + '"></div></div><input type="hidden" id="lId" value="' + h(l.id || '') + '">' +
      '<div class="row" style="margin-top:12px"><button class="primary" type="submit">Save</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div></form>';
  }
  function exportLog() {
    var yr = String(S.logYear || new Date().getFullYear());
    var rows = [['Date', 'Type', 'Hours', 'Miles', 'Amount', 'Employer/Client', 'Category', 'Notes']].concat(items('log').filter(function (l) { return (l.date || '').indexOf(yr) === 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .map(function (l) { return [l.date, l.type, l.hours || '', l.miles || '', l.amount || '', l.who || '', l.category || '', l.notes || '']; }));
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'connect-hours-mileage-' + yr + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* learn */
  function learnFields() { var sp = S.me.specialty || 'HVAC/R'; var f = [sp].concat((window.LEARN_EXTRA || {})[sp] || []); Object.keys(LEARN).forEach(function (k) { if (f.indexOf(k) < 0 && k !== 'Other') f.push(k); }); return f; }
  function proQuiz(f) { return S.premium && S.premium.quizzes && S.premium.quizzes[f] || []; }
  function proRef(f) { return S.premium && S.premium.refreshers && S.premium.refreshers[f] || []; }
  function proDiagrams(f) { return S.premium && S.premium.diagrams ? S.premium.diagrams.filter(function (d) { return d.field === f; }) : []; }
  /* points and day streak (kept on this phone, per member) */
  function xpKey() { return 'connect_xp_' + (S.me && S.me.email || ''); }
  function xpGet() { try { return JSON.parse(store(xpKey()) || '{}'); } catch (e) { return {}; } }
  function xpAdd(n) {
    var x = xpGet(), t = today(), y = new Date(Date.now() - 86400000); y = y.getFullYear() + '-' + ('0' + (y.getMonth() + 1)).slice(-2) + '-' + ('0' + y.getDate()).slice(-2);
    if (x.last !== t) { x.streak = x.last === y ? (x.streak || 0) + 1 : 1; x.last = t; x.todayCount = 0; }
    x.pts = (x.pts || 0) + n; x.todayCount = (x.todayCount || 0) + 1; store(xpKey(), JSON.stringify(x)); return x;
  }
  function xpBar() {
    var x = xpGet(), alive = x.last === today() || (x.last && (new Date(today()) - new Date(x.last)) <= 86400000);
    var goal = Math.min(5, x.last === today() ? x.todayCount || 0 : 0);
    return '<div class="xpbar"><span class="xp-chip"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z" fill="#E8873A"/></svg><b>' + (alive ? x.streak || 0 : 0) + '</b> day streak</span>' +
      '<span class="xp-chip"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="#C9A961"/></svg><b>' + (x.pts || 0) + '</b> points</span>' +
      '<span class="xp-chip">Today <span class="goal">' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="' + (i < goal ? 'on' : '') + '"></i>'; }).join('') + '</span></span></div>';
  }
  function bigArt(text, fallback, cls) { return '<div class="art ' + (cls || '') + '">' + window.artFor(text, fallback) + '</div>'; }
  function autoRead() { return store('connect_autoread') === '1'; }
  function sayNow(text, label) { if (!speakable()) return; playList([{ text: text, show: label || text.slice(0, 60), lang: window.CONNECT_LANG }], label || 'Reading'); }

  VIEWS.learn = function () {
    var fields = learnFields(); var f = S.learnField && fields.indexOf(S.learnField) > -1 ? S.learnField : fields[0]; S.learnField = f;
    store('connect_updates_seen', String(Date.now()));
    if (S.quiz && S.quiz.field === f) return quizView();
    var mode = S.learnMode || 'hub';
    if (mode === 'cards') return cardsView(f);
    if (mode === 'diagrams') return diagramsView(f);
    if (mode === 'rules') return rulesView(f);
    var L = LEARN[f] || { refreshers: [], quiz: [] }, pro = !!S.me.premium;
    var nCards = L.refreshers.length + proRef(f).length, nQ = L.quiz.length + proQuiz(f).length;
    var nDiag = DIAGRAMS.filter(function (d) { return d.field === f; }).length + proDiagrams(f).length;
    var ups = rulesFor(f), newUps = ups.filter(function (u) { return Date.now() - new Date(u.created).getTime() < 45 * 86400000; }).length;
    var best = store('connect_best_' + f);
    var tile = function (act, extra, art, title, sub, badge, tone) { return '<button type="button" class="tile ' + (tone || '') + '" data-act="' + act + '"' + (extra || '') + '>' + (badge ? '<span class="badge">' + badge + '</span>' : '') + '<span class="tile-art">' + art + '</span><span class="tile-title">' + h(title) + '</span><span class="tile-sub">' + h(sub) + '</span></button>'; };
    return '<h1 class="sr-only">Learn</h1>' + xpBar() +
      '<div class="chips" role="tablist" aria-label="Field">' + fields.map(function (x) { return '<button type="button" role="tab" aria-selected="' + (x === f) + '" class="chip' + (x === f ? ' on' : '') + '" data-act="fieldChip" data-f="' + h(x) + '"><span class="chip-art">' + window.artField(x) + '</span>' + h(x) + '</button>'; }).join('') + '</div>' +
      '<label for="learnField" class="sr-only">Field</label><select id="learnField" class="sr-only" data-act-change="learnField">' + fields.map(function (x) { return '<option' + (x === f ? ' selected' : '') + '>' + h(x) + '</option>'; }).join('') + '</select>' +
      '<div class="tiles">' +
      tile('learnMode', ' data-m="cards"', ART.bulb, 'Flashcards', nCards + ' cards · tap to flip', '', 'sun') +
      tile('startQuiz', ' data-n="10"', ART.target, 'Quick quiz', (best ? 'Best ' + best : Math.min(10, nQ) + ' questions'), '', 'rose') +
      tile('openCar', '', ART.chat, 'Listen in the car', 'Plays out loud, hands-free', '', 'sky') +
      tile('learnMode', ' data-m="diagrams"', ART.wires, 'Diagrams', nDiag ? nDiag + ' pictures' : 'Coming soon', '', 'mint') +
      (ups.length ? tile('learnMode', ' data-m="rules"', ART.law, 'Rule changes', ups.length + ' updates', newUps ? newUps + ' new' : '', 'sand') : '') +
      tile('goWisdom', '', ART.mountain, 'Wisdom', 'Swipe short lessons', '', 'lav') +
      (pro && proQuiz(f).length ? tile('startQuiz', ' data-n="999"', ART.shield, 'Full exam prep', nQ + ' questions', 'Pro', 'navy') : (!pro ? tile('goUpgrade', '', ART.shield, 'Full exam prep', 'More cards, diagrams & quizzes', 'Pro', 'navy') : '')) +
      '</div>' +
      (L.refreshers[0] ? '<h2>Card of the day</h2>' + (function () { var r = L.refreshers[dayIndex() % L.refreshers.length]; return '<button type="button" class="feature" data-act="learnMode" data-m="cards">' + bigArt(r[0] + ' ' + r[1], f, 'sm') + '<span><b>' + h(r[0]) + '</b><br><span class="muted small">Tap to study</span></span></button>'; })() : '') +
      '<p class="small muted" style="margin-top:14px">Study aids only. Check your instructor, the manufacturer\'s data and the official study guide.</p>';
  };
  function rulesFor(f) { return S.updates.filter(function (u) { return u.field === f || u.field === 'All' || (f === 'HVAC/R' && u.field === 'EPA 608'); }); }
  function backBar(title) { return '<div class="backbar"><button type="button" class="ghost icon-btn" data-act="learnMode" data-m="hub" aria-label="Back to Learn">‹</button><h1>' + h(title) + '</h1><label class="toggle"><input type="checkbox" data-act-change="autoRead"' + (autoRead() ? ' checked' : '') + '> Read to me</label></div>'; }
  function deckFor(f) { var L = LEARN[f] || { refreshers: [] }; return L.refreshers.map(function (r) { return { t: r[0], b: r[1], pro: false }; }).concat(proRef(f).map(function (r) { return { t: r[0], b: r[1], pro: true }; })); }
  function cardsView(f) {
    var deck = deckFor(f); if (!deck.length) return backBar('Flashcards') + '<p class="muted">More cards for this field are coming.</p>';
    var i = Math.max(0, Math.min(S.cardI || 0, deck.length - 1)); S.cardI = i; var c = deck[i], flipped = !!S.cardFlip;
    return backBar('Flashcards') +
      '<div class="progress"><span style="width:' + Math.round((i + 1) / deck.length * 100) + '%"></span></div><p class="small muted center">' + (i + 1) + ' of ' + deck.length + (S.me.premium ? '' : ' · Pro adds more') + '</p>' +
      '<div class="flash' + (flipped ? ' flipped' : '') + '" id="flash" data-act="cardFlip" role="button" tabindex="0" aria-label="' + (flipped ? 'Show picture' : 'Show answer') + '">' +
      (!flipped ? bigArt(c.t + ' ' + c.b, f, 'xl') + '<div class="flash-title">' + h(c.t) + (c.pro ? ' <span class="tag navy">Pro</span>' : '') + '</div><div class="flash-hint">Tap to flip</div>'
        : '<div class="flash-title sm">' + h(c.t) + '</div><div class="flash-body">' + h(c.b) + '</div><div class="flash-hint">Tap to see the picture</div>') + '</div>' +
      '<div class="flash-actions"><button type="button" class="round" data-act="cardPrev" aria-label="Previous card"' + (i === 0 ? ' disabled' : '') + '>‹</button>' +
      '<button type="button" class="round" data-act="cardSpeak" aria-label="Read this card out loud"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<button type="button" class="round gold" data-act="cardGot" aria-label="Got it, next card">✓</button>' +
      '<button type="button" class="round" data-act="cardNext" aria-label="Next card"' + (i === deck.length - 1 ? ' disabled' : '') + '>›</button></div>' +
      '<p class="small muted center">Swipe left or right · tap ✓ when you know it (+5 points)</p>';
  }
  function diagramsView(f) {
    var free = DIAGRAMS.filter(function (d) { return d.field === f; }), pd = proDiagrams(f);
    return backBar('Diagrams') + (free.concat(pd).map(function (d, i) { return '<button type="button" class="card diag-card" data-act="diagZoom" data-i="' + i + '"><h3>' + h(d.title) + (i >= free.length ? ' <span class="tag navy">Pro</span>' : '') + '</h3><div class="diagram">' + drawDiagram(d) + '</div><span class="small muted">Tap to open full screen</span></button>'; }).join('') || '<p class="muted">Diagrams for this field are coming.</p>') +
      (!S.me.premium && f === 'HVAC/R' ? '<button type="button" class="card lock" data-act="goUpgrade"><h3>Heat pump, two-stage and zone valve wiring <span class="tag navy">Pro</span></h3><span class="small muted">Tap to see plans</span></button>' : '');
  }
  function rulesView(f) {
    return backBar('Rule changes') + rulesFor(f).map(function (u) {
      var isNew = Date.now() - new Date(u.created).getTime() < 45 * 86400000;
      return '<div class="card rule" id="rules">' + bigArt(u.title, 'law', 'sm') + '<div><div class="spread"><h3>' + h(u.title) + '</h3>' + (isNew ? '<span class="tag warn">New</span>' : '') + '</div><div class="small muted">' + h(u.field) + (u.effective ? ' · effective ' + h(fmtDate(u.effective)) : '') + '</div><p style="margin-top:6px">' + h(u.body) + '</p><div class="row">' + (u.source ? '<a class="small" href="' + h(u.source) + '" target="_blank" rel="noopener">Source</a>' : '') + '<button type="button" class="ghost small-btn" data-act="sayRule" data-id="' + h(u.id) + '">Read to me</button></div></div></div>';
    }).join('');
  }
  function afterLearnRender(force) {
    var q = S.quiz;
    if (q && q.list[q.i] && q.answered == null && autoRead() && (force || S._readQ !== q.i + ':' + q.list.length)) { S._readQ = q.i + ':' + q.list.length; var c = q.list[q.i]; sayNow(c.q + ' ' + c.o.map(function (o, k) { return String.fromCharCode(65 + k) + '. ' + o + '.'; }).join(' '), 'Question ' + (q.i + 1)); }
    var fl = document.getElementById('flash');
    if (fl) {
      var x0 = null;
      fl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      fl.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) { e.preventDefault(); var b = document.querySelector('[data-act=' + (dx < 0 ? 'cardNext' : 'cardPrev') + ']'); if (b && !b.disabled) b.click(); } });
      if (!S.cardFlip && autoRead() && (force || S._readC !== S.learnField + S.cardI)) { S._readC = S.learnField + S.cardI; var dc = deckFor(S.learnField)[S.cardI]; if (dc) sayNow(dc.t, dc.t); }
    }
  }
  function carSheet() {
    var f = S.learnField, ups = rulesFor(f);
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="sheet"><h2 style="margin-top:0">Listen in the car</h2><p class="muted small">Plays out loud, one after another. Keep your screen on.</p><div class="tiles">' +
      '<button type="button" class="tile sun" data-act="listen" data-what="ref"><span class="tile-art">' + ART.bulb + '</span><span class="tile-title">Flashcards</span><span class="tile-sub">Every card, read out</span></button>' +
      '<button type="button" class="tile rose" data-act="listen" data-what="quiz"><span class="tile-art">' + ART.target + '</span><span class="tile-title">Quiz + answers</span><span class="tile-sub">Question, pause, answer</span></button>' +
      (ups.length ? '<button type="button" class="tile sand" data-act="listen" data-what="ups"><span class="tile-art">' + ART.law + '</span><span class="tile-title">Rule changes</span><span class="tile-sub">' + ups.length + ' updates</span></button>' : '') +
      '<button type="button" class="tile lav" data-act="listen" data-what="wisdom"><span class="tile-art">' + ART.mountain + '</span><span class="tile-title">Wisdom</span><span class="tile-sub">Short lessons</span></button>' +
      '</div>' + (!S.me.premium ? '<p class="small muted">Pro adds the full exam-prep set to car mode.</p>' : '') + '<button type="button" class="ghost" data-close style="margin-top:10px">Close</button></div>';
    m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.hasAttribute('data-close') || ev.target.closest('[data-act=listen]')) m.remove(); });
    document.body.appendChild(m);
  }
  function quizView() {
    var q = S.quiz, cur = q.list[q.i];
    if (!cur) {
      var pct = q.list.length ? Math.round(q.score / q.list.length * 100) : 0, key = 'connect_best_' + q.field, prev = store(key);
      if (!prev || parseInt(prev, 10) < pct) store(key, pct + '%');
      var r = 54, circ = 2 * Math.PI * r;
      return '<div class="done"><svg viewBox="0 0 140 140" width="180" height="180" role="img" aria-label="' + pct + ' percent"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="#E4DCC8" stroke-width="14"/><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + (pct >= 70 ? '#2FA39A' : '#E8873A') + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (circ * pct / 100) + ' ' + circ + '" transform="rotate(-90 70 70)"/><text x="70" y="78" text-anchor="middle" font-size="30" font-weight="700" fill="#1B2951" font-family="Figtree,Arial">' + pct + '%</text></svg>' +
        '<h1>' + (pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Nice work!' : 'Keep going!') + '</h1><p class="muted">' + q.score + ' of ' + q.list.length + ' right · +' + (q.score * 10) + ' points</p>' + xpBar() +
        '<div class="row center-row"><button class="primary" data-act="startQuiz" data-n="' + q.n + '">Play again</button><button class="ghost" data-act="endQuiz">Back to Learn</button></div></div>';
    }
    var answered = q.answered != null, right = answered && q.answered === cur.a;
    return '<div class="backbar"><button type="button" class="ghost icon-btn" data-act="endQuiz" aria-label="Stop quiz">✕</button><h1>' + h(q.field) + ' quiz</h1><label class="toggle"><input type="checkbox" data-act-change="autoRead"' + (autoRead() ? ' checked' : '') + '> Read to me</label></div>' +
      '<div class="progress"><span style="width:' + Math.round(q.i / q.list.length * 100) + '%"></span></div><p class="small muted center">Question ' + (q.i + 1) + ' of ' + q.list.length + ' · ' + q.score + ' right</p>' +
      '<div class="qcard">' + bigArt(cur.q + ' ' + cur.why, q.field, 'md') + '<p class="qtext">' + h(cur.q) + '</p><button type="button" class="link small" data-act="speakQ">Read it to me</button></div>' +
      cur.o.map(function (o, k) {
        var cls = !answered ? '' : (k === cur.a ? ' right' : (k === q.answered ? ' wrong' : ' dim'));
        return '<button class="quiz-opt big' + cls + '" data-act="answer" data-k="' + k + '"' + (answered ? ' disabled' : '') + '><span class="letter">' + String.fromCharCode(65 + k) + '</span><span>' + h(o) + '</span></button>';
      }).join('') +
      (answered ? '<div class="feedback ' + (right ? 'ok' : 'no') + '"><b>' + (right ? 'Correct! +10' : 'Not quite.') + '</b> ' + h(cur.why) + '</div><button class="primary wide" data-act="nextQ">' + (q.i + 1 < q.list.length ? 'Next question' : 'See my score') + '</button>' : '');
  }

  function drawDiagram(d) {
    var out = ['<svg viewBox="0 0 ' + d.w + ' ' + d.h + '" role="img" aria-label="' + h(d.title) + '" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>'];
    d.el.forEach(function (e) {
      var t = e[0];
      if (t === 'box') out.push('<rect x="' + e[1] + '" y="' + e[2] + '" width="' + e[3] + '" height="' + e[4] + '" rx="8" fill="#FAF7F0" stroke="#1B2951" stroke-width="1.5"/><text x="' + (e[1] + e[3] / 2) + '" y="' + (e[2] + 18) + '" text-anchor="middle" font-size="12" font-weight="600" fill="#1B2951">' + h(e[5]) + '</text>');
      else if (t === 'text') out.push('<text x="' + e[1] + '" y="' + e[2] + '" font-size="' + (e[4] || 12) + '" text-anchor="' + (e[5] || 'start') + '" fill="' + (e[6] || '#121C38') + '">' + h(e[3]) + '</text>');
      else if (t === 'line') { var p = e[1], pts = []; for (var i = 0; i < p.length; i += 2) pts.push(p[i] + ',' + p[i + 1]); out.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + e[2] + '" stroke-width="' + (e[3] || 2.5) + '" stroke-linejoin="round"' + (e[4] ? ' marker-end="url(#ah)"' : '') + '/>'); }
      else if (t === 'term') out.push('<circle cx="' + e[1] + '" cy="' + e[2] + '" r="5" fill="#fff" stroke="#1B2951" stroke-width="1.5"/>' + (e[3] ? '<text x="' + (e[1] + (e[1] < d.w / 2 ? -9 : 9)) + '" y="' + (e[2] + 4) + '" font-size="11" font-weight="600" text-anchor="' + (e[1] < d.w / 2 ? 'end' : 'start') + '" fill="#121C38">' + h(e[3]) + '</text>' : ''));
      else if (t === 'tube') out.push('<rect x="' + (e[1] + 20) + '" y="' + e[2] + '" width="36" height="20" rx="4" fill="' + e[3] + '" stroke="#555"/><rect x="' + (e[1] + 22) + '" y="' + (e[2] + 20) + '" width="32" height="90" rx="10" fill="#fff" stroke="#999"/><text x="' + (e[1] + 38) + '" y="' + (e[2] + 135) + '" font-size="10.5" text-anchor="middle" fill="#121C38">' + h(e[4].split(' · ')[0]) + '</text><text x="' + (e[1] + 38) + '" y="' + (e[2] + 150) + '" font-size="10" text-anchor="middle" fill="#121C38">' + h(e[4].split(' · ')[1] || '') + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }
  /* resume */
  VIEWS.resume = function () {
    var r = S.me.resume || {}; r.exp = r.exp || []; r.edu = r.edu || [];
    var tracked = items('track');
    return '<h1>Resume builder</h1><p class="muted">Fill this in once, then print or save as PDF for each job. List only what you\'ve actually done.</p>' +
      '<form class="card" data-form="saveResume"><div class="form-grid">' +
      '<div class="full"><label for="rHead">Headline (under your name)</label><input id="rHead" value="' + h(r.headline) + '" placeholder="HVAC/R Technician · EPA 608 Universal"></div>' +
      '<div><label for="rCity">City, state</label><input id="rCity" value="' + h(r.city) + '"></div><div><label for="rEmail">Email on resume</label><input id="rEmail" value="' + h(r.email || S.me.email) + '"></div>' +
      '<div class="full"><label for="rSummary">Summary (2–3 sentences)</label><textarea id="rSummary">' + h(r.summary) + '</textarea></div></div>' +
      '<h3 style="margin-top:14px">Experience</h3><div id="expList">' + r.exp.map(expRow).join('') + '</div><button class="ghost" type="button" data-act="addExp">+ Add a job</button>' +
      '<h3 style="margin-top:14px">Education &amp; training</h3><div id="eduList">' + r.edu.map(eduRow).join('') + '</div><button class="ghost" type="button" data-act="addEdu">+ Add school or program</button>' +
      '<label for="rSkills">Skills (comma separated)</label><textarea id="rSkills" placeholder="Superheat/subcooling, thermostat wiring, brazing, customer service">' + h(r.skills) + '</textarea>' +
      '<label class="check" style="margin-top:10px"><input type="checkbox" id="rCerts"' + (r.includeCerts !== false ? ' checked' : '') + '> Include my licenses and certifications from the wallet</label>' +
      '<div class="row" style="margin-top:12px"><button class="primary" type="submit">Save resume</button></div></form>' +
      '<div class="card"><h3>Print for a job</h3><label for="rTarget">Tailor the summary to</label><select id="rTarget"><option value="">No specific job</option>' + tracked.map(function (t) { return '<option value="' + h(t.id) + '">' + h(t.title) + (t.company ? ' — ' + h(t.company) : '') + '</option>'; }).join('') + '</select>' +
      '<div class="row" style="margin-top:10px"><button class="ghost" data-act="previewResume">Preview</button><button class="primary" data-act="printResume">Print / save PDF</button></div></div>' +
      '<div id="resumePreview"></div>' +
      '<p class="small muted">Want a person to review it? See "Resume review by our team" under ' + (S.me.premium ? 'Pro &amp; shop' : 'Upgrade') + '.</p>';
  };
  function expRow(e) { e = e || {}; return '<div class="card flat exp"><div class="form-grid"><div><label>Title</label><input data-k="title" value="' + h(e.title) + '"></div><div><label>Company</label><input data-k="company" value="' + h(e.company) + '"></div><div><label>City, state</label><input data-k="city" value="' + h(e.city) + '"></div><div class="row" style="gap:8px"><div style="flex:1"><label>Start</label><input data-k="start" value="' + h(e.start) + '" placeholder="2024"></div><div style="flex:1"><label>End</label><input data-k="end" value="' + h(e.end) + '" placeholder="Present"></div></div><div class="full"><label>What you did (one per line)</label><textarea data-k="bullets">' + h(e.bullets) + '</textarea></div></div><button class="link" type="button" data-act="rmRow">Remove</button></div>'; }
  function eduRow(e) { e = e || {}; return '<div class="card flat edu"><div class="form-grid"><div><label>School or program</label><input data-k="school" value="' + h(e.school) + '"></div><div><label>Credential / program</label><input data-k="program" value="' + h(e.program) + '"></div><div><label>Year (or "Expected 2026")</label><input data-k="year" value="' + h(e.year) + '"></div></div><button class="link" type="button" data-act="rmRow">Remove</button></div>'; }
  function collectRows(sel) { return Array.prototype.map.call(document.querySelectorAll(sel), function (row) { var o = {}; Array.prototype.forEach.call(row.querySelectorAll('[data-k]'), function (i) { o[i.getAttribute('data-k')] = i.value.trim(); }); return o; }).filter(function (o) { return Object.keys(o).some(function (k) { return o[k]; }); }); }
  function resumeHtml(targetId) {
    var r = S.me.resume || {}, t = items('track').filter(function (x) { return x.id === targetId; })[0];
    var summary = r.summary || '';
    if (t) summary = 'Seeking the ' + t.title + ' role' + (t.company ? ' at ' + t.company : '') + '. ' + summary;
    var certs = r.includeCerts !== false ? items('cert') : [];
    var skills = (r.skills || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return '<div class="resume-sheet"><h1>' + h(S.me.name) + '</h1>' + (r.headline ? '<div class="tagline">' + h(r.headline) + '</div>' : '') +
      '<div class="contact">' + [r.city, S.me.phone, r.email || S.me.email].filter(Boolean).map(h).join(' · ') + '</div>' +
      (summary ? '<h4>Summary</h4><p>' + h(summary) + '</p>' : '') +
      ((r.exp || []).length ? '<h4>Relevant experience</h4>' + r.exp.map(function (e) { return '<div class="job"><span>' + h(e.title) + (e.company ? ', ' + h(e.company) : '') + (e.city ? ' — ' + h(e.city) : '') + '</span><span>' + h([e.start, e.end].filter(Boolean).join(' – ')) + '</span></div>' + (e.bullets ? '<ul>' + e.bullets.split('\n').filter(function (b) { return b.trim(); }).map(function (b) { return '<li>' + h(b.replace(/^[-•*]\s*/, '')) + '</li>'; }).join('') + '</ul>' : ''); }).join('') : '') +
      ((r.edu || []).length ? '<h4>Education &amp; training</h4>' + r.edu.map(function (e) { return '<div class="job"><span>' + h(e.program) + (e.school ? ', ' + h(e.school) : '') + '</span><span>' + h(e.year) + '</span></div>'; }).join('') : '') +
      (certs.length ? '<h4>Certifications &amp; licenses</h4><ul>' + certs.map(function (c) { return '<li>' + h(c.name) + (c.issued ? ' (' + h(String(c.issued).slice(0, 4)) + ')' : '') + '</li>'; }).join('') + '</ul>' : '') +
      (skills.length ? '<h4>Core skills</h4><p>' + skills.map(h).join(' · ') + '</p>' : '') + '</div>';
  }

  /* upgrade & shop */
  VIEWS.upgrade = function () {
    var me = S.me, pro = me.premium;
    var plans = S.plans.slice();
    var myOrders = S.orders.filter(function (o) { return o.status !== 'cancelled'; });
    return '<h1>' + (pro ? 'Pro &amp; shop' : 'Upgrade to Connect Pro') + '</h1>' +
      (pro ? '<div class="notice"><b>You have Connect Pro' + (me.role === 'admin' ? ' (admin)' : '') + '.</b>' + (me.premiumUntil && me.role !== 'admin' ? ' Active until ' + h(fmtDate(me.premiumUntil)) + '.' : '') + '</div>' : '') +
      '<div class="card"><h3>What Pro adds</h3><ul style="margin:6px 0 0 18px;padding:0"><li>Full exam-prep question sets for your field, including EPA 608</li><li>Advanced wiring diagrams (heat pump, two-stage, zone valves)</li><li>More refreshers: ladder diagrams, capacitor and contactor checks</li><li>Car mode plays the full exam-prep set out loud</li></ul><p class="small muted" style="margin:8px 0 0">The free version keeps your tracker, resume, license wallet, hours log, job board, basic quizzes and rule-change alerts.</p></div>' +
      '<h2>Plans</h2><p class="small muted">Pay first; Pro opens as soon as your payment is confirmed.</p>' +
      plans.map(function (p, i) {
        return '<div class="card"><div class="spread"><div><h3>' + h(p.name) + (i === 0 ? ' <span class="tag ok">Best value</span>' : '') + '</h3><div class="small muted">' + h(p.note) + '</div></div><div style="text-align:right"><b style="font-size:22px;color:var(--navy)">' + h(money(p.price)) + '</b><div class="small muted">' + (p.recurring ? 'per month' : 'one payment') + '</div></div></div>' +
          '<button class="' + (i === 0 ? 'gold' : 'primary') + '" style="margin-top:10px" data-act="order" data-kind="plan" data-id="' + h(p.id) + '">' + (p.recurring ? 'Set up monthly autopay' : 'Choose ' + h(p.name.replace(' of Connect Pro', ''))) + '</button></div>';
      }).join('') +
      '<h2>More from our companies</h2>' + S.products.map(function (p) {
        return '<div class="card"><div class="spread"><div><h3>' + h(p.name) + '</h3><div class="small muted">' + h(p.business) + '</div></div><b style="white-space:nowrap">' + h(p.price) + '</b></div><p style="margin:6px 0 10px">' + h(p.description) + '</p><button class="primary" data-act="order" data-kind="product" data-id="' + h(p.id) + '">' + (p.link ? 'Get started' : 'Request this') + '</button></div>';
      }).join('') +
      (myOrders.length ? '<h2>My orders</h2><div class="card">' + myOrders.map(function (o) { return '<div class="list-item spread"><div><b>' + h(o.name) + '</b><div class="small muted">' + h(fmtDate(o.created)) + (o.note ? ' · ' + h(o.note) : '') + '</div></div><div class="row"><span class="tag ' + (o.status === 'paid' ? 'ok' : 'warn') + '">' + (o.status === 'paid' ? 'Paid' : 'Waiting for payment') + '</span>' + (o.status === 'requested' ? '<button class="link" data-act="cancelOrder" data-id="' + h(o.id) + '">Cancel</button>' : '') + '</div></div>'; }).join('') + '</div>' : '') +
      '<p class="small muted">Questions about billing: <a href="mailto:LmiraC@crispcleans.com">LmiraC@crispcleans.com</a>.</p>';
  };

  /* profile */
  VIEWS.profile = function () {
    var me = S.me, needs = !me.name || !me.specialty;
    return '<h1>' + (needs ? 'Set up your profile' : 'Profile') + '</h1>' + (needs ? '<p class="muted">Two quick things so we can show the right jobs and study material.</p>' : '') +
      '<form class="card" data-form="saveProfile"><div class="form-grid">' +
      '<div><label for="pName">Full name</label><input id="pName" required autocomplete="name" value="' + h(me.name) + '"></div>' +
      '<div><label for="pPhone">Phone (optional)</label><input id="pPhone" type="tel" autocomplete="tel" value="' + h(me.phone) + '"></div>' +
      '<div><label for="pSpec">Your field</label><select id="pSpec" required><option value="">Choose…</option>' + specOptions(me.specialty) + '</select></div>' +
      '<div><label for="pSchool">Date you started school (Year One)</label><input id="pSchool" type="date" value="' + h(me.schoolStart) + '"></div>' +
      '<div><label for="pDigest">Email me an update with jobs, deadlines and a word of wisdom</label><select id="pDigest">' + [['daily', 'Every day'], ['weekly', 'Every week (Mondays)'], ['monthly', 'Every month (the 1st)'], ['off', 'Don\'t email updates']].map(function (o) { return '<option value="' + o[0] + '"' + ((me.digest || 'weekly') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="full"><span class="label">Also show me jobs in these fields</span><div class="chips">' + S.specialties.filter(function (sp) { return sp !== me.specialty; }).map(function (sp) { var on = (me.fields || []).indexOf(sp) > -1; return '<label class="chip check-chip"><input type="checkbox" data-xfield value="' + h(sp) + '"' + (on ? ' checked' : '') + '> ' + h(sp) + '</label>'; }).join('') + '</div></div>' +
      '<div class="full"><label class="check"><input type="checkbox" id="pAlerts"' + (me.alerts ? ' checked' : '') + '> Email me new jobs and rule changes for my fields</label></div>' +
      '<div class="full"><label class="check"><input type="checkbox" id="pShare"' + (me.share ? ' checked' : '') + '> Let Crisp Cares, Crisp Clean and CMCC see my resume and contact me about openings</label><p class="small muted" style="margin:4px 0 0 32px">Off by default. Your tracker, licenses and logs are never shared.</p></div>' +
      '</div><button class="primary" type="submit" style="margin-top:12px">Save</button></form>' +
      (me.role !== 'admin' ? '<div class="card"><h3>Post jobs as a partner</h3>' +
        (me.partnerStatus === 'approved' ? '<p class="small">You\'re an approved partner for ' + h(me.company) + '. Post from the Jobs tab.</p>' :
          me.partnerStatus === 'pending' ? '<p class="small">Your request for ' + h(me.company) + ' is waiting for approval.</p>' :
            '<p class="small muted">Contractors and employers can post jobs after approval.</p><form data-form="requestPartner"><label for="pCompany">Company name</label><input id="pCompany" value="' + h(me.company) + '"><button class="ghost" type="submit" style="margin-top:10px">Ask for partner access</button></form>') + '</div>' : '') +
      '<div class="card"><h3>Keep Connect on your phone</h3><p class="small muted" style="margin:0">iPhone: tap Share, then "Add to Home Screen." Android: open the browser menu and choose "Add to Home screen" or "Install app."</p></div>' +
      '<div class="row"><span class="small muted">Signed in as ' + h(me.email) + '</span><button class="ghost" data-act="signOut">Sign out</button></div>';
  };

  /* admin */
  function loadAdmin() { api('adminData').then(function (j) { S.admin = j; if (S.tab === 'admin') render(); }).catch(fail); }
  VIEWS.admin = function () {
    var a = S.admin;
    if (!a) return '<h1>Admin</h1><p class="muted">Loading…</p>';
    var partners = a.members.filter(function (m) { return m.partnerStatus === 'pending'; });
    var reqs = a.orders.filter(function (o) { return o.status === 'requested'; });
    var shared = a.members.filter(function (m) { return m.share; });
    return '<h1>Admin</h1><div class="row" style="margin-bottom:12px"><button class="gold" data-act="showQR">Show my QR code</button><button class="ghost" data-act="exportContacts">Download contacts (CSV)</button><button class="ghost" data-act="openBroadcast">Send an update to members</button><button class="ghost" data-act="importJobs">Load HVAC job list</button></div>' +
      (S.edit === 'broadcast' ? '<form class="card" data-form="broadcast"><h3>Send an update</h3><label for="bAud">To</label><select id="bAud"><option value="all">Everyone (' + a.members.length + ')</option>' + S.specialties.map(function (s) { var n = a.members.filter(function (m) { return m.specialty === s; }).length; return n ? '<option value="' + h(s) + '">' + h(s) + ' (' + n + ')</option>' : ''; }).join('') + '</select><label for="bSubj">Subject</label><input id="bSubj" required><label for="bBody">Message</label><textarea id="bBody" required style="min-height:140px"></textarea><p class="small muted">Sends one email per member from crispcleaninc (about ' + a.mailQuotaLeft + ' left today). Replies go to LmiraC@crispcleans.com.</p><div class="row"><button class="primary" type="submit">Send</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div></form>' : '') +
      '<div class="grid2"><div class="stat"><b>' + a.members.length + '</b>members</div><div class="stat"><b>' + a.members.filter(function (m) { return m.alerts; }).length + '</b>with alerts on</div><div class="stat"><b>' + a.pendingJobs.length + '</b>jobs to approve</div><div class="stat"><b>' + a.mailQuotaLeft + '</b>emails left today</div></div>' +
      '<p class="small" style="margin-top:8px"><a href="' + h(a.sheet) + '" target="_blank" rel="noopener">Open the Connect Members DB sheet</a> — edit prices and pay links in the Plans and Products tabs.</p>' +
      '<h2>Payments to confirm</h2>' + (reqs.length ? '<div class="card">' + reqs.map(function (o) { return '<div class="list-item"><div class="spread"><div><b>' + h(o.name) + '</b> — ' + h(o.price !== '' ? money(o.price) : '') + '<div class="small muted">' + h(o.email) + ' · ' + h(fmtDate(o.created)) + (o.note ? ' · ' + h(o.note) : '') + '</div><div class="small">Payment choice: <b>' + h(PAYOPT[o.payOption] || 'Pay now') + '</b></div>' + (o.docs && o.docs.length ? '<div class="row" style="margin-top:4px">' + o.docs.map(function (d, k) { return '<button class="link" data-act="viewDoc" data-id="' + h(d.id) + '">View proof ' + (k + 1) + '</button>'; }).join('') + '</div>' : '') + '</div></div><div class="row" style="margin-top:6px">' + (o.kind === 'plan' ? '<label for="mo-' + h(o.id) + '" style="margin:0">Months</label><input id="mo-' + h(o.id) + '" style="width:80px" inputmode="numeric" value="' + h(o.months) + '">' : '') + '<button class="primary" data-act="confirmOrder" data-id="' + h(o.id) + '">Mark paid</button><button class="danger" data-act="cancelOrder" data-id="' + h(o.id) + '">Cancel</button></div></div>'; }).join('') + '</div>' : '<p class="muted">None waiting.</p>') +
      '<h2>Jobs to approve</h2>' + (a.pendingJobs.map(function (j) { j.status = 'pending'; return jobCard(j); }).join('') || '<p class="muted">None waiting.</p>') +
      '<h2>Partner requests</h2>' + (partners.length ? '<div class="card">' + partners.map(function (m) { return '<div class="list-item spread"><div><b>' + h(m.company) + '</b><div class="small muted">' + h(m.name) + ' · ' + h(m.email) + '</div></div><div class="row"><button class="primary" data-act="reviewPartner" data-email="' + h(m.email) + '" data-d="approve">Approve</button><button class="danger" data-act="reviewPartner" data-email="' + h(m.email) + '" data-d="decline">Decline</button></div></div>'; }).join('') + '</div>' : '<p class="muted">None waiting.</p>') +
      '<h2>Post a rule change</h2><form class="card" data-form="postUpdate"><div class="form-grid"><div><label for="uField">Field</label><select id="uField">' + specOptions('EPA 608', ['All', 'EPA 608']) + '</select></div><div><label for="uEff">Effective date</label><input id="uEff" type="date"></div><div class="full"><label for="uTitle">Title</label><input id="uTitle" required></div><div class="full"><label for="uBody">What changed (plain words)</label><textarea id="uBody" required></textarea></div><div class="full"><label for="uSrc">Source link</label><input id="uSrc" type="url" placeholder="https://"></div></div><button class="primary" type="submit" style="margin-top:10px">Post and alert members</button></form>' +
      '<div class="card">' + a.updates.map(function (u) { return '<div class="list-item spread"><div><b>' + h(u.title) + '</b><div class="small muted">' + h(u.field) + (u.effective ? ' · ' + h(fmtDate(u.effective)) : '') + '</div></div><button class="link" data-act="delUpdate" data-id="' + h(u.id) + '">Delete</button></div>'; }).join('') + '</div>' +
      '<h2>Give Pro access</h2><form class="card row" data-form="grantPremium"><div style="flex:2;min-width:200px"><label for="gEmail">Member email</label><input id="gEmail" type="email" required></div><div style="flex:1;min-width:90px"><label for="gMonths">Months</label><input id="gMonths" inputmode="numeric" value="1"></div><button class="primary" type="submit" style="align-self:flex-end">Give access</button></form>' +
      '<h2>Members</h2><div class="card scroll"><table class="simple"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Field</th><th>Came from</th><th>Joined</th><th>Shares resume</th></tr></thead><tbody>' + a.members.map(function (m) { return '<tr><td>' + h(m.name) + (m.verified ? '' : ' <span class="tag warn">code not used yet</span>') + '</td><td>' + (m.phone ? '<a href="tel:' + h(String(m.phone).replace(/[^0-9+]/g, '')) + '">' + h(m.phone) + '</a>' : '') + '</td><td>' + h(m.email) + '</td><td>' + h(m.specialty) + '</td><td>' + h(m.source) + '</td><td>' + h(fmtDate(m.created)) + '</td><td>' + (m.share ? '<button class="link" data-act="viewShared" data-email="' + h(m.email) + '">View resume</button>' : 'No') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="small muted">' + shared.length + ' member(s) share their resume with you.</p>';
  };

  /* ask & help */
  var PAYOPT = { now: 'Pay now in full', plan: 'Payment plan', refund: 'Pay from my tax refund', help: 'Limited resources: reduced rate' };
  function productCard(p) { return '<div class="card"><div class="spread"><div><h3>' + h(p.name) + '</h3><div class="small muted">' + h(p.business) + '</div></div><b style="white-space:nowrap">' + h(p.price) + '</b></div><p style="margin:6px 0 10px">' + h(p.description) + '</p><button class="gold" data-act="order" data-kind="product" data-id="' + h(p.id) + '">Get started & see price</button></div>'; }
  function resourceCard(r) { var tel = (r.phone || '').match(/\(?\d{3}\)?[\s.-]?\d{3}-\d{4}/); return '<div class="card"><h3>' + h(r.name) + '</h3><div class="small muted">' + h(r.type) + '</div>' + (r.address ? '<p style="margin:6px 0 0">' + h(r.address) + '</p>' : '') + (r.phone ? '<p style="margin:4px 0 0"><b>' + h(r.phone) + '</b></p>' : '') + (r.note ? '<p class="small" style="margin:6px 0 0">' + h(r.note) + '</p>' : '') + '<div class="row" style="margin-top:8px">' + (tel ? '<a class="btn primary" href="tel:' + tel[0].replace(/\D/g, '') + '">Call</a>' : (/211/.test(r.phone) ? '<a class="btn primary" href="tel:211">Call 211</a>' : /988/.test(r.phone) ? '<a class="btn primary" href="tel:988">Call 988</a>' : '')) + (r.address ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://maps.google.com/?q=' + encodeURIComponent(r.address) + '">Map</a>' : '') + (r.website ? '<a class="btn ghost" target="_blank" rel="noopener" href="' + h(r.website) + '">Website</a>' : '') + '</div></div>'; }
  VIEWS.ask = function () {
    var chips = ['How do I file my taxes?', 'How do I join a union apprenticeship?', 'Where can my family see a dentist?', 'How do I start an LLC?', 'What does EPA 608 cover?'];
    return '<h1>Ask me anything</h1><p class="muted">Ask in any language. Answers come back in the language you picked at the top of the screen.</p>' +
      (!S.aiOn ? '<div class="notice">Instant answers are being set up. For now, we send your question to our team and they reply by email, and we show anything here that matches.</div>' : '') +
      '<div class="card" aria-live="polite" id="chatBox">' + (S.chat.length ? S.chat.map(function (m, i) {
        if (m.role === 'user') return '<div style="text-align:end;margin:8px 0"><span style="display:inline-block;background:var(--navy);color:var(--cream);border-radius:12px 12px 2px 12px;padding:8px 12px;max-width:85%;text-align:start">' + h(m.content) + '</span></div>';
        var extra = (m.suggest || []).map(function (id) { var p = S.products.filter(function (x) { return x.id === id; })[0]; return p ? productCard(p) : ''; }).join('') +
          (m.resources || []).map(function (id) { var r = S.resources.filter(function (x) { return x.id === id; })[0]; return r ? resourceCard(r) : ''; }).join('') +
          (m.unions || []).map(function (id) { var u = S.unions.filter(function (x) { return x.id === id; })[0]; return u ? '<div class="card"><h3>' + h(u.name) + '</h3><p class="small">' + h(u.deadlineNote) + '</p><button class="ghost" data-tab="unions">See union details</button></div>' : ''; }).join('');
        return '<div style="margin:8px 0">' + (m.content ? '<div style="background:#fff;border:1px solid var(--line);border-radius:12px 12px 12px 2px;padding:10px 12px;white-space:pre-line">' + h(m.content) + '</div><button class="link small" data-act="askSpeak" data-i="' + i + '">Read aloud</button>' : '<div class="notice">' + (m.mode === 'team' ? 'We sent your question to our team. They\'ll reply to ' + h(S.me.email) + '.' : '') + '</div>') + extra + '</div>';
      }).join('') : '<p class="muted" style="margin:0">Try one:</p><div class="row" style="margin-top:8px">' + chips.map(function (c) { return '<button class="ghost" data-act="askChip">' + h(c) + '</button>'; }).join('') + '</div>') + '</div>' +
      '<form data-form="ask" class="row"><label for="askQ" style="position:absolute;left:-9999px">Your question</label><textarea id="askQ" style="flex:1;min-height:56px" placeholder="Type your question…"></textarea><button class="primary" type="submit">Ask</button></form>' +
      (S.chat.length ? '<button class="link small" data-act="askClear">Start over</button>' : '') +
      '<p class="small muted">General information only. It isn\'t legal, medical or tax advice. In an emergency call 911.</p>' +
      '<h2>Health, dental &amp; help numbers</h2>' + S.resources.map(resourceCard).join('') +
      '<h2>Get started with our services</h2>' + S.products.map(productCard).join('');
  };
  function sendAsk() {
    var q = field('askQ'); if (!q) return;
    var hist = S.chat.slice(-6).map(function (m) { return { role: m.role, content: m.content }; });
    S.chat.push({ role: 'user', content: q }); render();
    var box = document.getElementById('chatBox'); box.insertAdjacentHTML('beforeend', '<p class="muted" id="thinking">Thinking…</p>');
    api('ask', { question: q, lang: window.CONNECT_LANG || 'en', history: hist }).then(function (r) {
      S.chat.push({ role: 'assistant', content: r.answer, suggest: r.suggest, resources: r.resources, unions: r.unions, mode: r.mode }); render();
      var b = document.getElementById('chatBox'); if (b) b.scrollIntoView({ block: 'end' });
    }).catch(function (e) {
      if (!isOffline(e)) { S.chat.pop(); render(); return fail(e); }
      var words = q.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
      var hits = S.resources.filter(function (r) { var t = (r.name + ' ' + r.type + ' ' + r.note).toLowerCase(); return words.some(function (w) { return t.indexOf(w) > -1; }); }).slice(0, 4);
      S.chat.push({ role: 'assistant', mode: 'offline', resources: hits, content: 'You\'re offline, so I can\'t look that up right now. Ask again when you\'re connected.' + (hits.length ? ' Here are saved numbers that may help:' : ' Your saved help numbers are under Ask & help.') });
      render();
    });
  }
  function quoteModal(kind, id) {
    var item = (kind === 'plan' ? S.plans : S.products).filter(function (x) { return x.id === id; })[0]; if (!item) return;
    var price = kind === 'plan' ? money(item.price) + (item.recurring ? ' / month' : '') : item.price;
    var opts = ['now', 'plan'].concat(kind === 'product' && /tax/i.test(item.name) ? ['refund'] : []).concat(['help']);
    if (kind === 'plan' && item.recurring) opts = ['now', 'help'];
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Your quote"><h2 style="margin-top:0">Your quote</h2>' +
      '<div class="card"><div class="spread"><div><h3>' + h(item.name) + '</h3><div class="small muted">' + h(item.business || 'Connect Pro') + '</div></div><b style="font-size:22px;color:var(--navy)">' + h(price) + '</b></div>' + (item.description || item.note ? '<p class="small" style="margin:6px 0 0">' + h(item.description || item.note) + '</p>' : '') + '</div>' +
      '<fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:600;margin-bottom:6px">How would you like to pay?</legend>' + opts.map(function (o, k) { return '<label class="check card" style="margin:0 0 8px"><input type="radio" name="payOpt" value="' + o + '"' + (k === 0 ? ' checked' : '') + '> <span><b>' + PAYOPT[o] + '</b><br><span class="small muted">' + ({ now: 'Pay securely now and get started.', plan: 'Split it into payments. We\'ll send the plan to approve.', refund: 'Your fee comes out of your refund, if the refund covers it.', help: 'Tell us your situation and attach proof (benefits letter, unemployment notice, pay stubs). We\'ll review it for a reduced rate.' })[o] + '</span></span></label>'; }).join('') + '</fieldset>' +
      '<div id="helpBox" hidden><label for="qNote">Tell us briefly about your situation</label><textarea id="qNote"></textarea><label for="qDocs">Proof of need (photo or PDF, up to 5)</label><input id="qDocs" type="file" multiple accept="image/*,application/pdf"><p class="small muted">Private: only you and our billing team can see it. Don\'t include Social Security or account numbers.</p></div>' +
      '<div class="row" style="margin-top:12px"><button class="gold" id="qGo">Continue</button><button class="ghost" data-close>Cancel</button></div><p class="small muted" style="margin-top:8px">You\'ll see a notice of what you\'re agreeing to before any payment.</p></div>';
    document.body.appendChild(m);
    var helpBox = m.querySelector('#helpBox');
    m.addEventListener('change', function (e) { if (e.target.name === 'payOpt') helpBox.hidden = e.target.value !== 'help'; });
    m.addEventListener('click', function (e) { if (e.target === m || e.target.hasAttribute('data-close')) { m.remove(); render(); } });
    m.querySelector('#qGo').addEventListener('click', function () {
      var btn = this, opt = m.querySelector('input[name=payOpt]:checked').value, note = (m.querySelector('#qNote') || {}).value || '';
      var files = Array.prototype.slice.call((m.querySelector('#qDocs') || {}).files || []).slice(0, 5);
      if (opt === 'help' && !files.length && !note.trim()) return toast('Add a short note or attach proof so we can review it.');
      busy(btn, true, 'Sending…');
      api('requestOrder', { kind: kind, refId: id, payOption: opt, note: note }).then(function (r) {
        var order = r.order;
        return files.reduce(function (p, f) { return p.then(function () { return readFileForUpload(f).then(function (d) { return api('uploadOrderDoc', { orderId: order.id, mime: d.mime, data: d.data, name: f.name }); }).then(function (x) { order = x.order; }); }); }, Promise.resolve()).then(function () { return { r: r, order: order }; });
      }).then(function (x) {
        S.orders.unshift(x.order);
        var r = x.r, sheet = m.querySelector('.sheet');
        var consent = '<div class="notice small"><b>Before you pay:</b> by paying you agree to the price shown for ' + h(item.name) + '. ' + (kind === 'plan' ? 'Pro access starts when payment is confirmed and ends on the date shown in your profile' + (item.recurring ? '; monthly autopay continues until you cancel in writing' : '') + '.' : 'Our team confirms the details of the service with you before work starts.') + ' Questions or changes go to LmiraC@crispcleans.com in writing.</div>';
        sheet.innerHTML = '<h2 style="margin-top:0">' + (opt === 'help' ? 'Request sent' : 'Next step') + '</h2>' +
          (opt === 'help' ? '<p>Thank you. Our team will review your request' + (x.order.docs.length ? ' and the ' + x.order.docs.length + ' document(s) you attached' : '') + ' and email ' + h(S.me.email) + ' with your rate.</p>'
            : opt === 'now' && r.payLink ? consent + '<a class="btn gold" href="' + h(r.payLink) + '" target="_blank" rel="noopener">Pay ' + h(price) + ' now</a>'
              : '<p>We\'ll email ' + h(S.me.email) + ' ' + (opt === 'plan' ? 'a payment plan to approve' : opt === 'refund' ? 'how refund payment works for your return' : 'your invoice' + (item.recurring ? ' with autopay (card on file)' : '')) + '.</p>' + consent) +
          (r.startLink ? '<p style="margin-top:12px"><a class="btn primary" href="' + h(r.startLink) + '" target="_blank" rel="noopener">Start your service now</a></p>' : '') +
          '<button class="ghost" data-close style="margin-top:10px">Done</button>';
      }).catch(function (e) { busy(btn, false); fail(e); });
    });
  }

  /* unions */
  VIEWS.unions = function () {
    var st = S.unionState || 'MI', tf = S.unionTrade || 'mine', sp = S.me.specialty;
    var list = S.unions.filter(function (u) { return (st === 'all' || u.state === st || u.state === 'All') && (tf === 'all' || u.trade === 'All' || !sp || sp === 'Other' || u.trade === sp); });
    return '<h1>Union apprenticeships</h1><p class="muted">How to get in, what you sign up for, hours, pay, and when applications open. Dates change every year; always confirm with the training center.</p>' +
      '<div class="row" style="margin-bottom:12px"><button class="' + (st === 'MI' ? 'primary' : 'ghost') + '" data-act="unionState" data-v="MI">Michigan</button><button class="' + (st === 'all' ? 'primary' : 'ghost') + '" data-act="unionState" data-v="all">All states</button>' +
      '<button class="' + (tf === 'mine' ? 'primary' : 'ghost') + '" data-act="unionTrade" data-v="mine">My field</button><button class="' + (tf === 'all' ? 'primary' : 'ghost') + '" data-act="unionTrade" data-v="all">All trades</button></div>' +
      (list.map(function (u) {
        var d = u.deadline ? daysUntil(u.deadline) : null;
        var tag = d === null ? '' : d < 0 ? '<span class="tag">Window date passed — check for news</span>' : d <= 30 ? '<span class="tag bad">' + (d === 0 ? 'Today' : d + ' days') + '</span>' : '<span class="tag warn">' + h(fmtDate(u.deadline)) + '</span>';
        var tracked = items('track').some(function (t) { return t.unionId === u.id; });
        var row = function (k, v) { return v ? '<p><b>' + k + '</b><br>' + h(v) + '</p>' : ''; };
        return '<div class="card"><div class="spread"><div><h3>' + h(u.name) + '</h3><div class="small muted">' + [u.trade, u.area].filter(Boolean).map(h).join(' · ') + '</div></div>' + tag + '</div>' +
          (u.deadlineNote ? '<div class="notice" style="margin-top:8px"><b>Applications:</b> ' + h(u.deadlineNote) + '</div>' : '') +
          '<details><summary style="cursor:pointer;font-weight:600;min-height:44px;display:flex;align-items:center">Full details</summary>' +
          row('What you sign up for', u.signUp) + row('What you need', u.requirements) + row('How to apply', u.howToApply) + row('Hours', u.hours) + row('Pay', u.pay) + row('How it works', u.howItWorks) +
          (u.address ? row('Where', u.address) : '') + '<p class="small muted">Checked ' + h(fmtDate(u.verified)) + (u.source ? ' · <a href="' + h(u.source) + '" target="_blank" rel="noopener">source</a>' : '') + '</p></details>' +
          '<div class="row">' + (u.website ? '<a class="btn primary" href="' + h(u.website) + '" target="_blank" rel="noopener">Website</a>' : '') + (u.phone ? '<a class="btn ghost" href="tel:' + h(u.phone.replace(/[^0-9+]/g, '')) + '">Call ' + h(u.phone) + '</a>' : '') +
          (tracked ? '<span class="tag ok">In your tracker</span>' : '<button class="ghost" data-act="trackUnion" data-id="' + h(u.id) + '">Add to my tracker</button>') + '</div></div>';
      }).join('') || '<p class="muted">Nothing listed for this filter yet.</p>') +
      '<p class="small muted">Your email updates include union dates coming up for your field. Know of a union we should add? Email LmiraC@crispcleans.com.</p>';
  };

  /* wisdom */
  var WCOLORS = { Money: ['#1E6B57', '#E7F5EF'], Business: ['#1B2951', '#EAF0FB'], Career: ['#7A4E14', '#FBF1E1'], Mindset: ['#5B3C99', '#F1EBFB'], Habits: ['#A23B3B', '#FCECEC'], People: ['#16707A', '#E6F6F7'] };
  function dayIndex() { var n = new Date(), s0 = new Date(n.getFullYear(), 0, 0); return Math.floor((n - s0) / 86400000); }
  function wisdomOrder() { var w = S.wisdom; if (!w.length) return []; var i = dayIndex() % w.length; return w.slice(i).concat(w.slice(0, i)); }
  function savedKey() { return 'connect_saved_' + (S.me && S.me.email || ''); }
  function savedList() { try { return JSON.parse(store(savedKey()) || '[]'); } catch (e) { return []; } }
  function wisdomToday() {
    var w = wisdomOrder()[0]; if (!w) return '';
    var col = WCOLORS[w.c] || WCOLORS.Business;
    return '<button type="button" class="wis-mini" style="background:' + col[1] + '" data-act="goWisdom"><span class="wis-mini-art">' + window.artFor(w.t + ' ' + w.b, w.c) + '</span><span><span class="wis-cat" style="color:' + col[0] + '">Today\'s wisdom · ' + h(w.c) + '</span><b class="wis-mini-title">' + h(w.t) + '</b><span class="small muted">Tap to swipe more</span></span></button>';
  }
  VIEWS.wisdom = function () {
    var cats = []; S.wisdom.forEach(function (x) { if (cats.indexOf(x.c) < 0) cats.push(x.c); });
    var cf = S.wisdomCat || 'All', saved = savedList();
    var list = wisdomOrder().filter(function (x) { return cf === 'All' ? true : cf === 'Saved' ? saved.indexOf(x.t) > -1 : x.c === cf; });
    return '<h1 class="sr-only">Wisdom</h1><div class="chips wis-chips"><button type="button" class="chip play-chip" data-act="wisPlayAll" aria-label="Play all out loud">▶ Play all</button>' + ['All', 'Saved'].concat(cats).map(function (c) { return '<button type="button" class="chip' + (c === cf ? ' on' : '') + '" data-act="wisdomCat" data-v="' + h(c) + '">' + (c === 'Saved' ? '♥ ' : '') + h(c) + (c === 'Saved' ? ' (' + saved.length + ')' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="wis-feed" id="wisFeed">' + (list.map(function (x, i) {
        var col = WCOLORS[x.c] || WCOLORS.Business, isSaved = saved.indexOf(x.t) > -1;
        return '<article class="wis-card" data-i="' + i + '" style="background:' + col[1] + '"><div class="wis-art">' + window.artFor(x.t + ' ' + x.b, x.c) + '</div>' +
          '<div class="wis-text"><span class="wis-cat" style="color:' + col[0] + '">' + h(x.c) + ' wisdom</span><h2 class="wis-title" style="color:' + col[0] + '">' + h(x.t) + '</h2><p class="wis-body">' + h(x.b) + '</p></div>' +
          '<div class="wis-actions"><button type="button" class="round" data-act="wisSay" data-i="' + i + '" aria-label="Read out loud"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
          '<button type="button" class="round' + (isSaved ? ' saved' : '') + '" data-act="wisHeart" data-t="' + h(x.t) + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? 'Remove from saved' : 'Save') + '">♥</button>' +
          '<button type="button" class="round" data-act="wisShare" data-i="' + i + '" aria-label="Share"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
          (i === 0 ? '<div class="swipe-hint">Swipe up for the next one ↑</div>' : '') + '</article>';
      }).join('') || '<p class="muted" style="padding:20px">Nothing saved yet. Tap ♥ on a card to keep it here.</p>') + '</div>' +
      '';
  };
  function wisList() { var cf = S.wisdomCat || 'All', saved = savedList(); return wisdomOrder().filter(function (x) { return cf === 'All' ? true : cf === 'Saved' ? saved.indexOf(x.t) > -1 : x.c === cf; }); }

  /* ---------------- car mode (speech) */
  var P = { q: [], i: 0, playing: false, timer: null };
  function speakable() { return 'speechSynthesis' in window; }
  function playList(list, label) {
    if (!speakable()) return toast('Your browser can\'t read out loud. Try Chrome or Safari.');
    stopPlayer(); P.q = list; P.i = 0; P.playing = true; P.label = label;
    document.getElementById('player').hidden = false;
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { P.lock = l; }).catch(function () {}); } catch (e) {}
    nextUtter();
  }
  function nextUtter() {
    clearTimeout(P.timer);
    if (!P.playing) return;
    var it = P.q[P.i];
    if (!it) { document.getElementById('plNow').textContent = 'Finished: ' + P.label; P.playing = false; document.getElementById('plPlay').textContent = '▶'; return; }
    document.getElementById('plNow').textContent = it.show || it.text;
    if (it.onstart) try { it.onstart(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(it.text);
    if (it.lang) u.lang = it.lang;
    u.rate = Number(document.getElementById('plRate').value) || 1;
    u.onend = function () { P.i++; P.timer = setTimeout(nextUtter, it.pause || 700); };
    u.onerror = function () { P.i++; P.timer = setTimeout(nextUtter, 300); };
    speechSynthesis.speak(u);
    document.getElementById('plPlay').textContent = '❚❚'; document.getElementById('plPlay').setAttribute('aria-label', 'Pause');
  }
  function stopPlayer() { P.playing = false; clearTimeout(P.timer); if (speakable()) speechSynthesis.cancel(); document.getElementById('player').hidden = true; try { if (P.lock) P.lock.release(); } catch (e) {} }
  document.getElementById('plStop').addEventListener('click', stopPlayer);
  document.getElementById('plNext').addEventListener('click', function () { speechSynthesis.cancel(); clearTimeout(P.timer); P.i++; P.playing = true; nextUtter(); });
  document.getElementById('plPlay').addEventListener('click', function () {
    var b = document.getElementById('plPlay');
    if (P.playing) { P.playing = false; speechSynthesis.cancel(); clearTimeout(P.timer); b.textContent = '▶'; b.setAttribute('aria-label', 'Play'); }
    else { P.playing = true; if (P.i >= P.q.length) P.i = 0; nextUtter(); }
  });
  function quizToSpeech(list) {
    var out = [];
    list.forEach(function (q, n) {
      out.push({ text: 'Question ' + (n + 1) + '. ' + q.q + ' ' + q.o.map(function (o, k) { return String.fromCharCode(65 + k) + '. ' + o + '.'; }).join(' '), show: 'Q' + (n + 1) + ': ' + q.q, pause: 4000 });
      out.push({ text: 'The answer is ' + String.fromCharCode(65 + q.a) + ', ' + q.o[q.a] + '. ' + q.why, show: 'Answer: ' + q.o[q.a], pause: 1500 });
    });
    return out;
  }
  function listen(what) {
    var f = S.learnField, L = LEARN[f] || { refreshers: [], quiz: [] };
    if (what === 'ref') { var refs = L.refreshers.concat(proRef(f)); if (!refs.length) return toast('No refreshers for this field yet.'); playList(refs.map(function (r) { return { text: r[0] + '. ' + r[1], show: r[0], pause: 1200 }; }), f + ' refreshers'); }
    else if (what === 'quiz') { var qs = shuffle(L.quiz.concat(proQuiz(f))); if (!qs.length) return toast('No quiz for this field yet.'); playList(quizToSpeech(qs), f + ' quiz'); }
    else if (what === 'wisdom') { playList(wisdomOrder().map(function (x) { return { text: x.c + ' wisdom. ' + x.t + '. ' + x.b, show: x.t, pause: 1500 }; }), 'Wisdom'); }
    else { var ups = S.updates.filter(function (u) { return u.field === f || u.field === 'All' || (f === 'HVAC/R' && u.field === 'EPA 608'); }); playList(ups.map(function (u) { return { text: 'Rule change. ' + u.title + '. ' + u.body, show: u.title, pause: 1500 }; }), 'Rule changes'); }
  }

  /* ---------------- actions */
  function saveItem(kind, item, btn) {
    busy(btn, true, 'Saving…');
    var local = function () {
      var it = Object.assign({}, item); if (!it.id) it.id = newId();
      enqueue({ op: 'save', kind: kind, item: it }); var out = upsertLocal(kind, it);
      S.offline = navigator.onLine === false || S.offline; cacheNow(); S.edit = null; render();
      toast('Saved on this phone. It syncs when you\'re back online.'); return out;
    };
    if (S.outbox.length || navigator.onLine === false || S.offline) { var o = local(); flush(); return Promise.resolve(o); }
    return api('saveItem', { kind: kind, item: item }).then(function (j) {
      var i = S.items.findIndex(function (x) { return x.id === j.item.id; });
      if (i > -1) S.items[i] = j.item; else S.items.push(j.item);
      S.edit = null; render(); cacheNow(); toast('Saved.'); return j.item;
    }).catch(function (e) { if (isOffline(e)) { S.offline = true; return local(); } busy(btn, false); fail(e); });
  }

  function saveProfileAny(prof, btn, after) {
    var first = !S.me.specialty;
    var local = function () { enqueue({ op: 'profile', profile: prof }); Object.keys(prof).forEach(function (k) { S.me[k] = prof[k]; }); cacheNow(); toast('Saved on this phone. It syncs when you\'re back online.'); after(first); };
    if (S.outbox.length || navigator.onLine === false || S.offline) { local(); return flush(); }
    return api('saveProfile', { profile: prof }).then(function (r) { S.me = r.me; cacheNow(); toast('Saved.'); after(first); })
      .catch(function (er) { if (isOffline(er)) { S.offline = true; return local(); } busy(btn, false); fail(er); });
  }

  document.addEventListener('click', function (e) {
    var tabBtn = e.target.closest('[data-tab]'); if (tabBtn) { e.preventDefault(); return go(tabBtn.getAttribute('data-tab')); }
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    switch (act) {
      case 'restart': return signInView('email', '');
      case 'reload': return load();
      case 'cancelEdit': S.edit = null; return render();
      case 'jobFilter': S.jobFilter = el.getAttribute('data-f'); return render();
      case 'newJob': S.edit = 'newJob'; return render();
      case 'saveJob': {
        var j = S.jobs.filter(function (x) { return x.id === id; })[0]; if (!j) return;
        return saveItem('track', { jobId: j.id, title: j.title, company: j.company, category: j.category, pay: j.pay, type: j.type, location: j.location, url: j.url, status: 'Saved', source: 'Connect job board', requirements: j.requirements || '', contact: j.contact || '', notes: '', log: [{ d: today(), t: 'Saved from the job board' }] }, el);
      }
      case 'reviewJob': busy(el, true); return api('reviewJob', { id: id, decision: el.getAttribute('data-d') }).then(function (r) { S.jobs = r.jobs; S.admin = null; render(); toast('Done.'); }).catch(function (er) { busy(el, false); fail(er); });
      case 'closeJob': if (!confirm('Close this job post?')) return; return api('closeJob', { id: id }).then(function (r) { S.jobs = r.jobs; render(); }).catch(fail);
      case 'editTrack': S.edit = { kind: 'track', item: id ? items('track').filter(function (x) { return x.id === id; })[0] : null }; if (S.tab !== 'tracker') { S.tab = 'tracker'; } return render();
      case 'editCert': S.edit = { kind: 'cert', item: id ? items('cert').filter(function (x) { return x.id === id; })[0] : (el.getAttribute('data-name') ? { name: el.getAttribute('data-name') } : null) }; return render();
      case 'editLog': S.edit = { kind: 'log', item: id ? items('log').filter(function (x) { return x.id === id; })[0] : null }; return render();
      case 'delItem': {
        if (!confirm('Delete this? This can\'t be undone.')) return;
        var dropLocal = function () { S.items = S.items.filter(function (x) { return x.id !== id; }); cacheNow(); render(); };
        if (/^tmp-/.test(id)) { S.outbox = S.outbox.filter(function (o) { return !((o.item && o.item.id === id) || (o.upload && o.upload.itemId === id)); }); saveOutbox(); dropLocal(); return toast('Deleted.'); }
        if (S.outbox.length || navigator.onLine === false || S.offline) { enqueue({ op: 'delete', id: id }); dropLocal(); flush(); return toast('Deleted on this phone. It syncs when you\'re back online.'); }
        return api('deleteItem', { id: id }).then(function () { dropLocal(); toast('Deleted.'); }).catch(function (er) { if (isOffline(er)) { enqueue({ op: 'delete', id: id }); dropLocal(); return toast('Deleted on this phone. It syncs when you\'re back online.'); } fail(er); });
      }
      case 'syncNow': return flush();
      case 'howVideo': store('connect_seen_video', '1'); if (window.ConnectHowItWorks) ConnectHowItWorks(); return;
      case 'trackFilter': S.trackFilter = el.getAttribute('data-f'); return render();
      case 'trackStage': { var ns = el.getAttribute('data-s'), patch = { status: ns }; var tt = items('track').filter(function (x) { return x.id === id; })[0]; if (ns === 'Applied' && tt && !tt.dateApplied) { patch.dateApplied = today(); if (!tt.followUp) { var fu = new Date(); fu.setDate(fu.getDate() + 7); patch.followUp = fu.toISOString().slice(0, 10); } } return trackUpdate(id, patch, 'Status: ' + ns); }
      case 'trackLogOpen': S.logFor = id; render(); var tl = document.getElementById('tlText'); if (tl) tl.focus(); return;
      case 'cancelLog': S.logFor = null; return render();
      case 'trackFollowed': { var nx = new Date(); nx.setDate(nx.getDate() + 7); return trackUpdate(id, { followUp: nx.toISOString().slice(0, 10) }, 'Followed up. Next check-in set for one week.'); }
      case 'exportTrack': return exportTrack();
      case 'itinInfo': S.itinOpen = true; render(); var ic = document.getElementById('itinCard'); if (ic) ic.scrollIntoView({ block: 'start' }); return;
      case 'importJobs': busy(el, true, 'Loading…'); return api('importJobs').then(function (r) { S.jobs = r.jobs; cacheNow(); busy(el, false); toast(r.added ? r.added + ' jobs added to the board.' : 'The board already has these jobs.'); }).catch(function (er) { busy(el, false); fail(er); });
      case 'exportLog': return exportLog();
      case 'zoom': { var m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="sheet"><img src="' + el.src + '" alt="' + h(el.alt) + '" style="width:100%;border-radius:8px"><button class="primary" style="margin-top:10px" data-close>Close</button></div>'; m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.hasAttribute('data-close')) m.remove(); }); document.body.appendChild(m); return; }
      case 'listen': if (!S.learnField) S.learnField = learnFields()[0]; return listen(el.getAttribute('data-what'));
      case 'unionState': S.unionState = el.getAttribute('data-v'); return render();
      case 'unionTrade': S.unionTrade = el.getAttribute('data-v'); return render();
      case 'wisdomCat': S.wisdomCat = el.getAttribute('data-v'); return render();
      case 'trackUnion': {
        var un = S.unions.filter(function (x) { return x.id === id; })[0]; if (!un) return;
        return saveItem('track', { unionId: un.id, title: 'Apply: ' + un.name, company: un.name, category: un.trade === 'All' ? 'Other' : un.trade, status: 'Saved', followUp: un.deadline || '', url: un.website, notes: un.deadlineNote || '' }, el);
      }
      case 'openUpdates': S.learnField = S.me.specialty; S.learnMode = 'rules'; go('learn'); setTimeout(function () { var r = document.getElementById('rules'); if (r) r.scrollIntoView(); }, 50); return;
      case 'startQuiz': {
        var f = S.learnField, L = LEARN[f] || { quiz: [] }, n = Number(el.getAttribute('data-n'));
        var pool = n > 100 ? L.quiz.concat(proQuiz(f)) : L.quiz.concat(S.me.premium ? proQuiz(f) : []);
        S.quiz = { field: f, list: shuffle(pool).slice(0, n), i: 0, score: 0, answered: null, n: n }; return render();
      }
      case 'answer': { var q = S.quiz; if (q.answered != null) return; q.answered = Number(el.getAttribute('data-k')); var good = q.answered === q.list[q.i].a; if (good) { q.score++; xpAdd(10); } render(); if (autoRead()) sayNow((good ? 'Correct. ' : 'Not quite. The answer is ' + q.list[q.i].o[q.list[q.i].a] + '. ') + q.list[q.i].why, 'Answer'); return; }
      case 'nextQ': S.quiz.i++; S.quiz.answered = null; render(); window.scrollTo(0, 0); return;
      case 'fieldChip': S.learnField = el.getAttribute('data-f'); S.quiz = null; S.learnMode = 'hub'; S.cardI = 0; S.cardFlip = false; return render();
      case 'learnMode': S.learnMode = el.getAttribute('data-m'); S.cardI = 0; S.cardFlip = false; if (S.learnMode === 'hub') S.quiz = null; render(); window.scrollTo(0, 0); return;
      case 'openCar': return carSheet();
      case 'goWisdom': return go('wisdom');
      case 'goUpgrade': return go('upgrade');
      case 'cardFlip': S.cardFlip = !S.cardFlip; render(); if (S.cardFlip && autoRead()) { var dc = deckFor(S.learnField)[S.cardI]; sayNow(dc.b, dc.t); } return;
      case 'cardPrev': if (S.cardI > 0) { S.cardI--; S.cardFlip = false; render(); } return;
      case 'cardNext': if (S.cardI < deckFor(S.learnField).length - 1) { S.cardI++; S.cardFlip = false; render(); } return;
      case 'cardGot': { xpAdd(5); var dk = deckFor(S.learnField); if (S.cardI < dk.length - 1) { S.cardI++; S.cardFlip = false; render(); toast('+5 points'); } else { toast('Deck done! +5 points'); S.learnMode = 'hub'; render(); } return; }
      case 'cardSpeak': { var cc = deckFor(S.learnField)[S.cardI]; return sayNow(cc.t + '. ' + cc.b, cc.t); }
      case 'diagZoom': { var all = DIAGRAMS.filter(function (d) { return d.field === S.learnField; }).concat(proDiagrams(S.learnField)); var dg = all[Number(el.getAttribute('data-i'))]; if (!dg) return; var mz = document.createElement('div'); mz.className = 'modal'; mz.innerHTML = '<div class="sheet" style="background:#fff"><h2 style="margin-top:0">' + h(dg.title) + '</h2><div class="diagram zoom">' + drawDiagram(dg) + '</div><p class="small muted">Turn your phone sideways or pinch to zoom.</p><button class="primary" data-close>Close</button></div>'; mz.addEventListener('click', function (ev) { if (ev.target === mz || ev.target.hasAttribute('data-close')) mz.remove(); }); document.body.appendChild(mz); return; }
      case 'sayRule': { var ru = S.updates.filter(function (u) { return u.id === id; })[0]; if (ru) sayNow(ru.title + '. ' + ru.body, ru.title); return; }
      case 'wisSay': { var wx = wisList()[Number(el.getAttribute('data-i'))]; if (wx) { xpAdd(2); sayNow(wx.t + '. ' + wx.b, wx.t); } return; }
      case 'wisHeart': { var t2 = el.getAttribute('data-t'), sv = savedList(), ix = sv.indexOf(t2); if (ix > -1) sv.splice(ix, 1); else { sv.push(t2); xpAdd(2); } store(savedKey(), JSON.stringify(sv)); el.classList.toggle('saved', ix < 0); el.setAttribute('aria-pressed', String(ix < 0)); toast(ix < 0 ? 'Saved' : 'Removed'); return; }
      case 'wisShare': { var ws = wisList()[Number(el.getAttribute('data-i'))]; if (!ws) return; var txt = ws.t + ' — ' + ws.b + ' (Connect: ' + location.origin + location.pathname.replace(/member\/?$/, '') + ')'; if (navigator.share) navigator.share({ title: ws.t, text: txt }).catch(function () {}); else { try { navigator.clipboard.writeText(txt); toast('Copied to share'); } catch (e) {} } return; }
      case 'wisPlayAll': { var feed = document.getElementById('wisFeed'); var items2 = wisList().map(function (x, i) { return { text: x.t + '. ' + x.b, show: x.t, pause: 1500, onstart: function () { var cardEl = feed && feed.querySelector('.wis-card[data-i="' + i + '"]'); if (cardEl && cardEl.scrollIntoView) cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }; }); return playList(items2, 'Wisdom'); }
      case 'speakQ': { var cq = S.quiz.list[S.quiz.i]; var parts = quizToSpeech([cq]); playList(S.quiz.answered != null ? parts : [parts[0]], 'This question'); return; }
      case 'endQuiz': S.quiz = null; S.learnMode = 'hub'; stopPlayer(); return render();
      case 'addExp': document.getElementById('expList').insertAdjacentHTML('beforeend', expRow()); return;
      case 'addEdu': document.getElementById('eduList').insertAdjacentHTML('beforeend', eduRow()); return;
      case 'rmRow': el.closest('.card').remove(); return;
      case 'previewResume': document.getElementById('resumePreview').innerHTML = '<h2>Preview</h2>' + resumeHtml(field('rTarget')); return;
      case 'printResume': document.getElementById('printArea').innerHTML = resumeHtml(field('rTarget')); window.print(); return;
      case 'order': return quoteModal(el.getAttribute('data-kind'), id);
      case 'cancelOrder': if (!confirm('Cancel this order?')) return; return api('cancelOrder', { id: id }).then(function (r) { if (r.orders) S.orders = r.orders; if (r.members) S.admin = r; render(); }).catch(fail);
      case 'confirmOrder': busy(el, true); return api('confirmOrder', { id: id, months: field('mo-' + id) }).then(function (r) { S.admin = r; render(); toast('Marked paid. Receipt emailed.'); }).catch(function (er) { busy(el, false); fail(er); });
      case 'reviewPartner': return api('reviewPartner', { email: el.getAttribute('data-email'), decision: el.getAttribute('data-d') }).then(function (r) { S.admin = r; render(); }).catch(fail);
      case 'delUpdate': if (!confirm('Delete this rule update?')) return; return api('deleteUpdate', { id: id }).then(function (r) { S.updates = r.updates; S.admin = null; render(); }).catch(fail);
      case 'viewShared': { var mem = S.admin.members.filter(function (x) { return x.email === el.getAttribute('data-email'); })[0]; var r2 = mem.resume || {}; var m3 = document.createElement('div'); m3.className = 'modal'; m3.innerHTML = '<div class="sheet"><h2 style="margin-top:0">' + h(mem.name) + '</h2><p class="small muted">' + h(mem.email) + (mem.phone ? ' · ' + h(mem.phone) : '') + ' · ' + h(mem.specialty) + '</p>' + (r2.headline ? '<p><b>' + h(r2.headline) + '</b></p>' : '') + (r2.summary ? '<p>' + h(r2.summary) + '</p>' : '') + (r2.exp || []).map(function (x) { return '<p><b>' + h(x.title) + '</b>' + (x.company ? ', ' + h(x.company) : '') + ' <span class="muted">' + h([x.start, x.end].filter(Boolean).join(' – ')) + '</span><br><span style="white-space:pre-line">' + h(x.bullets) + '</span></p>'; }).join('') + (r2.skills ? '<p><b>Skills:</b> ' + h(r2.skills) + '</p>' : '') + '<button class="primary" data-close>Close</button></div>'; m3.addEventListener('click', function (ev) { if (ev.target === m3 || ev.target.hasAttribute('data-close')) m3.remove(); }); document.body.appendChild(m3); return; }
      case 'viewDoc': return api('getFile', { fileId: id }).then(function (j) { var bin = atob(j.data), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); window.open(URL.createObjectURL(new Blob([arr], { type: j.mime })), '_blank'); }).catch(fail);
      case 'showQR': {
        var url = location.origin + location.pathname + '?join=1&src=qr';
        var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
        var mq = document.createElement('div'); mq.className = 'modal';
        mq.innerHTML = '<div class="sheet" style="text-align:center;background:#fff"><div class="mark" style="justify-content:center;color:var(--navy)">CONNECT</div><h2 style="margin:8px 0 4px">Scan to join</h2><p class="muted" style="margin:0 0 12px">Jobs, unions, study tools and more. Free.</p><div style="max-width:320px;margin:0 auto">' + qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true }) + '</div><p class="small muted" style="word-break:break-all;margin-top:10px">' + h(url) + '</p><button class="primary" data-close style="margin-top:8px">Done</button></div>';
        mq.addEventListener('click', function (ev) { if (ev.target === mq || ev.target.hasAttribute('data-close')) mq.remove(); });
        document.body.appendChild(mq);
        try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {}
        return;
      }
      case 'exportContacts': {
        var rows = [['Name', 'Phone', 'Email', 'Field', 'Came from', 'Joined']].concat(S.admin.members.map(function (m) { return [m.name, m.phone, m.email, m.specialty, m.source, fmtDate(m.created)]; }));
        var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
        var a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a2.download = 'connect-contacts-' + today() + '.csv'; document.body.appendChild(a2); a2.click(); a2.remove(); return;
      }
      case 'openBroadcast': S.edit = 'broadcast'; return render();
      case 'askSend': return sendAsk();
      case 'askChip': document.getElementById('askQ').value = el.textContent; return sendAsk();
      case 'askSpeak': { var msg = S.chat[Number(el.getAttribute('data-i'))]; if (msg) playList([{ text: msg.content, show: 'Answer', lang: window.CONNECT_LANG }], 'Answer'); return; }
      case 'askClear': S.chat = []; return render();
      case 'signOut': stopPlayer(); api('signOut').catch(function () {}); signOutLocal(); return signInView('email', S.me.email);
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.matches('[data-upload]')) {
      var file = el.files && el.files[0]; if (!file) return;
      var certId = el.getAttribute('data-upload'), side = el.getAttribute('data-side');
      toast('Saving ' + side + '…');
      readFileForUpload(file).then(function (f) {
        var up = { itemId: certId, side: side, mime: f.mime, data: f.data, name: file.name };
        var queue = function () { enqueue({ op: 'upload', upload: up }); applyPendingLocally(); cacheNow(); render(); toast('Saved on this phone. It uploads when you\'re back online.'); flush(); };
        if (/^tmp-/.test(certId) || S.outbox.length || navigator.onLine === false || S.offline) return queue();
        return api('uploadFile', up).then(function (j) { var i = S.items.findIndex(function (x) { return x.id === j.item.id; }); S.items[i] = j.item; cacheNow(); render(); toast('Saved ' + side + '.'); })
          .catch(function (er) { if (isOffline(er)) { S.offline = true; return queue(); } fail(er); });
      }).catch(fail);
      return;
    }
    var a = el.getAttribute('data-act-change');
    if (a === 'learnField') { S.learnField = el.value; S.quiz = null; S.learnMode = 'hub'; render(); }
    if (a === 'autoRead') { store('connect_autoread', el.checked ? '1' : '0'); if (el.checked) afterLearnRender(true); else stopPlayer(); }
    if (a === 'logYear') { S.logYear = el.value; render(); }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    var btn = f.querySelector('button[type=submit]'), kind = f.getAttribute('data-form');
    if (kind === 'saveTrack') {
      var tid = field('tId'), old = tid ? (items('track').filter(function (x) { return x.id === tid; })[0] || {}) : {};
      var tlog = Array.isArray(old.log) ? old.log.slice() : [];
      if (!tid) tlog.push({ d: today(), t: 'Added to tracker' }); else if (old.status !== field('tStatus')) tlog.push({ d: today(), t: 'Status: ' + field('tStatus') });
      return saveItem('track', { id: tid || undefined, jobId: field('tJob'), title: field('tTitle'), company: field('tCompany'), status: field('tStatus'), category: field('tCat'), pay: field('tPay'), type: field('tType'), location: field('tLoc'), source: field('tSource'), dateApplied: field('tApplied') || (field('tStatus') === 'Applied' && !old.dateApplied ? today() : old.dateApplied || ''), appNumber: field('tApp'), confirmUrl: field('tConfirm'), contact: field('tContact'), contactInfo: field('tContactInfo'), interview: field('tInterview'), resumeUsed: field('tResume'), followUp: field('tFollow'), nextStep: field('tNext'), requirements: field('tReq'), url: field('tUrl'), notes: field('tNotes'), log: tlog, unionId: old.unionId || undefined }, btn);
    }
    if (kind === 'trackLog') { var lid = field('tlId'); S.logFor = null; return trackUpdate(lid, {}, field('tlText')); }
    if (kind === 'saveCert') return saveItem('cert', { id: field('cId') || undefined, name: field('cName'), number: field('cNum'), issuer: field('cIssuer'), issued: field('cIssued'), expires: field('cExp'), notes: field('cNotes') }, btn);
    if (kind === 'saveLog') {
      var t = field('lType'), qty = parseFloat(field('lQty').replace(/[$,]/g, ''));
      if (isNaN(qty) || qty < 0) return toast('Enter a number for hours, miles or amount.');
      var it = { id: field('lId') || undefined, type: t, date: field('lDate'), who: field('lWho'), category: field('lCat'), notes: field('lNotes') };
      if (t === 'Hours') it.hours = qty; else if (t === 'Mileage') it.miles = qty; else it.amount = qty;
      return saveItem('log', it, btn);
    }
    if (kind === 'postJob') {
      busy(btn, true, 'Posting…');
      return api('postJob', { job: { title: field('jTitle'), company: field('jCompany'), category: field('jCat'), pay: field('jPay'), type: field('jType'), location: field('jLoc'), contact: field('jContact'), url: field('jUrl'), description: field('jDesc'), requirements: field('jReq'), benefits: field('jBen'), itin: field('jItin'), silent: field('jQuiet') } })
        .then(function (r) { S.jobs = r.jobs; S.edit = null; render(); toast(r.job.status === 'approved' ? 'Posted. Members in that field were emailed.' : 'Sent for approval.'); }).catch(function (er) { busy(btn, false); fail(er); });
    }
    if (kind === 'saveProfile') {
      if (!field('pName') || !field('pSpec')) return toast('Add your name and field.');
      busy(btn, true, 'Saving…');
      var prof = { name: field('pName'), phone: field('pPhone'), specialty: field('pSpec'), schoolStart: field('pSchool'), digest: field('pDigest'), alerts: field('pAlerts'), share: field('pShare'), fields: Array.prototype.map.call(document.querySelectorAll('[data-xfield]:checked'), function (c) { return c.value; }) };
      return saveProfileAny(prof, btn, function (first) { go(first ? 'home' : 'profile'); });
    }
    if (kind === 'ask') return sendAsk();
    if (kind === 'broadcast') {
      if (!confirm('Send this to ' + (field('bAud') === 'all' ? 'everyone' : field('bAud') + ' members') + '?')) return;
      busy(btn, true, 'Sending…');
      return api('broadcast', { audience: field('bAud'), subject: field('bSubj'), body: field('bBody') }).then(function (r) { S.edit = null; S.admin.mailQuotaLeft = r.mailQuotaLeft; render(); toast('Sent to ' + r.sent + ' member(s).'); }).catch(function (er) { busy(btn, false); fail(er); });
    }
    if (kind === 'requestPartner') { busy(btn, true); return api('requestPartner', { company: field('pCompany') }).then(function (r) { S.me = r.me; render(); toast('Request sent.'); }).catch(function (er) { busy(btn, false); fail(er); }); }
    if (kind === 'saveResume') {
      var resume = { headline: field('rHead'), city: field('rCity'), email: field('rEmail'), summary: field('rSummary'), exp: collectRows('#expList .exp'), edu: collectRows('#eduList .edu'), skills: field('rSkills'), includeCerts: field('rCerts') };
      busy(btn, true, 'Saving…');
      return saveProfileAny({ resume: resume }, btn, function () { render(); });
    }
    if (kind === 'postUpdate') {
      busy(btn, true, 'Posting…');
      return api('postUpdate', { update: { field: field('uField'), effective: field('uEff'), title: field('uTitle'), body: field('uBody'), source: field('uSrc') } })
        .then(function (r) { S.updates = r.updates; S.admin = null; render(); toast('Posted. ' + r.alerted + ' member(s) emailed.'); }).catch(function (er) { busy(btn, false); fail(er); });
    }
    if (kind === 'grantPremium') { busy(btn, true); return api('grantPremium', { email: field('gEmail'), months: field('gMonths') }).then(function (r) { S.admin = r; render(); toast('Pro access given.'); }).catch(function (er) { busy(btn, false); fail(er); }); }
  });

  /* ---------------- start */
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('../sw.js').catch(function () {}); });
  S.token = store('connect_token');
  if (S.token) load(); else signInView('email', store('connect_email') || '');
})();
