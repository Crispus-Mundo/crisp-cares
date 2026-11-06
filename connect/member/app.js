/* Connect — member app (talks to the Apps Script backend in config.js) */
(function () {
  'use strict';
  var API = window.CONNECT_API;
  var LEARN = window.LEARN || {}, DIAGRAMS = window.DIAGRAMS || [];
  var TRACK_STATUS = ['Saved', 'Applied', 'Interviewing', 'Offer received', 'Offer accepted', 'Not selected', 'Withdrew'];
  var LOG_TYPES = ['Hours', 'Mileage', 'Expense'];
  var S = { token: null, me: null, jobs: [], items: [], updates: [], unions: [], wisdom: [], resources: [], chat: [], aiOn: false, plans: [], products: [], orders: [], specialties: [], premium: null, admin: null, tab: 'home', edit: null, quiz: null, learnField: null, files: {} };
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

  function api(action, data) {
    if (!API || API.indexOf('__') === 0) return Promise.reject(new Error('Connect is being set up. Please try again soon.'));
    var body = Object.assign({ action: action, token: S.token }, data || {});
    return fetch(API, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { throw new Error('Could not reach Connect. Check your connection and try again.'); })
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
    app.innerHTML =
      '<h1>Sign in to Connect</h1><p class="muted">Your job tracker, resume, license wallet and hours log stay private to you. Jobs and rule-change alerts are shared with everyone who signs up.</p>' +
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

  function load() {
    app.innerHTML = '<p class="muted">Loading your Connect…</p>';
    return api('me').then(function (j) {
      S.me = j.me; S.jobs = j.jobs || []; S.items = j.items || []; S.updates = j.updates || []; S.unions = j.unions || []; S.wisdom = j.wisdom || []; S.resources = j.resources || []; S.aiOn = !!j.aiOn; S.plans = j.plans || []; S.products = j.products || []; S.orders = j.orders || []; S.specialties = j.specialties || [];
      if (S.me.premium) api('premium').then(function (p) { S.premium = p.premium; if (S.tab === 'learn') render(); }).catch(function () {});
      var hash = (location.hash || '').replace('#', '');
      if (!S.me.name || !S.me.specialty) S.tab = 'profile';
      else if (TABS().some(function (t) { return t[0] === hash; })) S.tab = hash;
      render();
    }).catch(function (e) { if (!S.token) signInView('email', store('connect_email') || '', e.message); else app.innerHTML = '<div class="notice err">' + h(e.message) + '</div><button class="primary" data-act="reload">Try again</button>'; });
  }

  /* ---------------- shell */
  function TABS() {
    var t = [['home', 'Home'], ['ask', 'Ask & help'], ['jobs', 'Jobs'], ['unions', 'Unions'], ['tracker', 'My tracker'], ['wallet', 'Licenses'], ['log', 'Hours & miles'], ['learn', 'Learn'], ['wisdom', 'Wisdom'], ['resume', 'Resume'], ['upgrade', S.me && S.me.premium ? 'Pro & shop' : 'Upgrade'], ['profile', 'Profile']];
    if (S.me && S.me.role === 'admin') t.push(['admin', 'Admin']);
    return t;
  }
  function render() {
    var nav = document.getElementById('tabs'); nav.hidden = false;
    document.getElementById('tabList').innerHTML = TABS().map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + h(t[1]) + '</button>'; }).join('');
    document.getElementById('topRight').innerHTML = S.me.premium ? '<span class="pill pro">Pro</span>' : '<button class="link" style="color:var(--gold)" data-tab="upgrade">Go Pro</button>';
    var fn = VIEWS[S.tab] || VIEWS.home;
    app.innerHTML = fn();
    var cur = document.querySelector('nav.tabs [aria-current]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (S.tab === 'wallet') loadThumbs();
    if (S.tab === 'admin' && !S.admin) loadAdmin();
  }
  function go(tab) { S.tab = tab; S.edit = null; try { history.replaceState(null, '', '#' + tab); } catch (e) {} render(); window.scrollTo(0, 0); }

  /* ---------------- views */
  var VIEWS = {};

  VIEWS.home = function () {
    var me = S.me, first = (me.name || '').split(' ')[0];
    var certs = items('cert').filter(function (c) { var d = daysUntil(c.expires); return d !== null && d <= 90; }).sort(function (a, b) { return a.expires < b.expires ? -1 : 1; });
    var fol = items('track').filter(function (t) { return t.followUp && t.followUp <= today() && ['Offer accepted', 'Not selected', 'Withdrew'].indexOf(t.status) < 0; });
    var seen = Number(store('connect_updates_seen') || 0);
    var newUp = S.updates.filter(function (u) { return new Date(u.created).getTime() > seen && fieldMatches(u.field); });
    var yr = new Date().getFullYear() + '';
    var hrs = items('log').filter(function (l) { return l.type === 'Hours' && (l.date || '').indexOf(yr) === 0; }).reduce(function (s, l) { return s + (Number(l.hours) || 0); }, 0);
    return '<h1>' + (first ? 'Welcome back, ' + h(first) : 'Welcome') + '</h1>' +
      tickerHtml() + wisdomToday() +
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
    return '<div class="card"><div class="spread"><div><h3>' + h(j.title) + st + '</h3><div class="muted small">' + [j.company, j.location, j.type, j.pay].filter(Boolean).map(h).join(' · ') + '</div></div><span class="tag">' + h(j.category) + '</span></div>' +
      (j.description ? '<p style="margin-top:8px;white-space:pre-line">' + h(j.description) + '</p>' : '') +
      '<div class="row">' + (j.status === 'approved' ? (saved ? '<span class="tag ok">In your tracker</span>' : '<button class="primary" data-act="saveJob" data-id="' + h(j.id) + '">Save to my tracker</button>') : '') +
      (j.url ? '<a class="btn ghost" href="' + h(j.url) + '" target="_blank" rel="noopener">Apply / details</a>' : '') +
      (j.contact ? '<span class="small muted">Contact: ' + h(j.contact) + '</span>' : '') +
      (S.me.role === 'admin' && j.status === 'pending' ? '<button class="primary" data-act="reviewJob" data-id="' + h(j.id) + '" data-d="approve">Approve</button><button class="danger" data-act="reviewJob" data-id="' + h(j.id) + '" data-d="decline">Decline</button>' : '') +
      ((S.me.role === 'admin' || j.mine) && j.status === 'approved' ? '<button class="link" data-act="closeJob" data-id="' + h(j.id) + '">Close post</button>' : '') +
      '</div></div>';
  }
  VIEWS.jobs = function () {
    var f = S.jobFilter || (S.me.role === 'admin' || S.me.role === 'partner' ? 'all' : 'mine');
    var list = S.jobs.filter(function (j) { return f === 'all' || j.status !== 'approved' || !S.me.specialty || j.category === S.me.specialty || j.category === 'Other'; });
    var canPost = S.me.role === 'admin' || (S.me.role === 'partner' && S.me.partnerStatus === 'approved');
    return '<h1>Job board</h1><p class="muted">Jobs from Crisp Cares, Crisp Clean, CMCC and approved partners. Save one to track your application.</p>' +
      '<div class="row" style="margin-bottom:12px"><button class="' + (f === 'mine' ? 'primary' : 'ghost') + '" data-act="jobFilter" data-f="mine">My field</button><button class="' + (f === 'all' ? 'primary' : 'ghost') + '" data-act="jobFilter" data-f="all">All jobs</button>' +
      (canPost ? '<button class="gold" data-act="newJob">Post a job</button>' : '') + '</div>' +
      (S.edit === 'newJob' ? jobForm() : '') +
      (list.map(jobCard).join('') || '<p class="muted">No jobs here yet. Turn on alerts in Profile and we\'ll email you when one is posted.</p>') +
      (!canPost ? '<p class="small muted">Hiring? Partners can post jobs here. Ask for partner access under <button class="link" data-tab="profile">Profile</button>.</p>' : '');
  };
  function specOptions(sel, extra) { return (extra || []).concat(S.specialties).map(function (s) { return '<option' + (s === sel ? ' selected' : '') + '>' + h(s) + '</option>'; }).join(''); }
  function jobForm() {
    return '<form class="card" data-form="postJob"><h3>Post a job</h3>' + (S.me.role !== 'admin' ? '<p class="small muted">Partner posts show after Crisp Cares approves them.</p>' : '<p class="small muted">Posting emails everyone in that field who has alerts on.</p>') +
      '<div class="form-grid"><div class="full"><label for="jTitle">Job title</label><input id="jTitle" required></div>' +
      '<div><label for="jCompany">Company</label><input id="jCompany" value="' + h(S.me.company || '') + '"></div><div><label for="jCat">Field</label><select id="jCat">' + specOptions(S.me.specialty) + '</select></div>' +
      '<div><label for="jPay">Pay</label><input id="jPay" placeholder="$25–30/hr"></div><div><label for="jType">Type</label><input id="jType" placeholder="Full time, part time, per call"></div>' +
      '<div><label for="jLoc">Location</label><input id="jLoc" placeholder="Southfield, MI"></div><div><label for="jContact">How to apply / contact</label><input id="jContact"></div>' +
      '<div class="full"><label for="jUrl">Link (optional)</label><input id="jUrl" type="url" placeholder="https://"></div>' +
      '<div class="full"><label for="jDesc">Description</label><textarea id="jDesc"></textarea></div></div>' +
      '<div class="row" style="margin-top:12px"><button class="primary" type="submit">Post</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div></form>';
  }

  /* tracker */
  VIEWS.tracker = function () {
    var list = items('track').sort(function (a, b) { return (b.updated || '') > (a.updated || '') ? 1 : -1; });
    var counts = TRACK_STATUS.map(function (s) { return [s, list.filter(function (t) { return t.status === s; }).length]; }).filter(function (c) { return c[1]; });
    return '<h1>My job tracker</h1><p class="muted">Only you can see this.</p>' +
      (counts.length ? '<div class="row" style="margin-bottom:10px">' + counts.map(function (c) { return '<span class="tag navy">' + h(c[0]) + ': ' + c[1] + '</span>'; }).join('') + '</div>' : '') +
      '<button class="primary" data-act="editTrack">Add a job I applied to</button>' +
      (S.edit && S.edit.kind === 'track' ? trackForm(S.edit.item) : '') +
      '<div style="margin-top:12px">' + (list.map(function (t) {
        return '<div class="card"><div class="spread"><div><h3>' + h(t.title) + '</h3><div class="muted small">' + [t.company, t.location, t.pay].filter(Boolean).map(h).join(' · ') + '</div></div><span class="tag">' + h(t.status || 'Saved') + '</span></div>' +
          '<div class="small muted" style="margin-top:6px">' + [t.dateApplied ? 'Applied ' + fmtDate(t.dateApplied) : '', t.appNumber ? 'App # ' + t.appNumber : '', t.followUp ? 'Follow up ' + fmtDate(t.followUp) : '', t.resumeUsed ? 'Resume: ' + t.resumeUsed : ''].filter(Boolean).map(h).join(' · ') + '</div>' +
          (t.notes ? '<p class="small" style="margin-top:6px;white-space:pre-line">' + h(t.notes) + '</p>' : '') +
          '<div class="row" style="margin-top:8px"><button class="ghost" data-act="editTrack" data-id="' + h(t.id) + '">Edit</button>' + (t.url ? '<a class="btn ghost" href="' + h(t.url) + '" target="_blank" rel="noopener">Posting</a>' : '') + '<button class="link" data-act="delItem" data-id="' + h(t.id) + '">Delete</button></div></div>';
      }).join('') || '<p class="muted">Nothing tracked yet. Save a job from the board or add one you found elsewhere.</p>') + '</div>';
  };
  function trackForm(t) {
    t = t || {};
    return '<form class="card" data-form="saveTrack" style="margin-top:12px"><h3>' + (t.id ? 'Edit job' : 'Add a job') + '</h3><div class="form-grid">' +
      '<div class="full"><label for="tTitle">Job title</label><input id="tTitle" required value="' + h(t.title) + '"></div>' +
      '<div><label for="tCompany">Company</label><input id="tCompany" value="' + h(t.company) + '"></div><div><label for="tStatus">Status</label><select id="tStatus">' + TRACK_STATUS.map(function (s) { return '<option' + (s === (t.status || 'Saved') ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="tCat">Field</label><select id="tCat">' + specOptions(t.category || S.me.specialty) + '</select></div><div><label for="tPay">Pay</label><input id="tPay" value="' + h(t.pay) + '"></div>' +
      '<div><label for="tType">Type</label><input id="tType" value="' + h(t.type) + '"></div><div><label for="tLoc">Location</label><input id="tLoc" value="' + h(t.location) + '"></div>' +
      '<div><label for="tApplied">Date applied</label><input id="tApplied" type="date" value="' + h(t.dateApplied) + '"></div><div><label for="tApp">Application / confirmation #</label><input id="tApp" value="' + h(t.appNumber) + '"></div>' +
      '<div><label for="tResume">Resume used</label><input id="tResume" value="' + h(t.resumeUsed) + '"></div><div><label for="tFollow">Follow up on</label><input id="tFollow" type="date" value="' + h(t.followUp) + '"></div>' +
      '<div class="full"><label for="tUrl">Link</label><input id="tUrl" type="url" value="' + h(t.url) + '"></div>' +
      '<div class="full"><label for="tNotes">Notes</label><textarea id="tNotes">' + h(t.notes) + '</textarea></div></div>' +
      '<input type="hidden" id="tId" value="' + h(t.id || '') + '"><input type="hidden" id="tJob" value="' + h(t.jobId || '') + '">' +
      '<div class="row" style="margin-top:12px"><button class="primary" type="submit">Save</button><button class="ghost" type="button" data-act="cancelEdit">Cancel</button></div><p class="small muted" style="margin-top:8px">We\'ll email you on your follow-up date.</p></form>';
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
      api('getFile', { fileId: id }).then(function (j) {
        var bin = atob(j.data), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        S.files[id] = URL.createObjectURL(new Blob([arr], { type: j.mime })); show(S.files[id]);
      }).catch(function () { el.textContent = 'Could not load ' + side; });
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
  VIEWS.learn = function () {
    var fields = learnFields(); var f = S.learnField && fields.indexOf(S.learnField) > -1 ? S.learnField : fields[0]; S.learnField = f;
    var L = LEARN[f] || { refreshers: [], quiz: [] };
    var ups = S.updates.filter(function (u) { return u.field === f || u.field === 'All' || (f === 'HVAC/R' && u.field === 'EPA 608'); });
    var diags = DIAGRAMS.filter(function (d) { return d.field === f; });
    var pro = !!S.me.premium;
    var best = store('connect_best_' + f);
    store('connect_updates_seen', String(Date.now()));
    if (S.quiz && S.quiz.field === f) return quizView();
    return '<h1>Learn</h1>' +
      '<label for="learnField">Field</label><select id="learnField" data-act-change="learnField">' + fields.map(function (x) { return '<option' + (x === f ? ' selected' : '') + '>' + h(x) + '</option>'; }).join('') + '</select>' +
      '<div class="card" style="margin-top:12px"><h3>Car mode</h3><p class="small muted">Plays out loud, one after another, so you can listen while you drive. Keep your screen on.</p><div class="row">' +
      '<button class="primary" data-act="listen" data-what="ref">Listen: refreshers</button><button class="primary" data-act="listen" data-what="quiz">Listen: quiz with answers</button>' + (ups.length ? '<button class="ghost" data-act="listen" data-what="ups">Listen: rule changes</button>' : '') + '<button class="ghost" data-act="listen" data-what="wisdom">Listen: wisdom</button></div>' +
      (!pro ? '<p class="small muted" style="margin:8px 0 0">Pro adds the full exam-prep set to car mode.</p>' : '') + '</div>' +
      (ups.length ? '<h2 id="rules">Rule changes</h2>' + ups.map(function (u) {
        var isNew = Date.now() - new Date(u.created).getTime() < 45 * 86400000;
        return '<div class="card"><div class="spread"><h3>' + h(u.title) + '</h3>' + (isNew ? '<span class="tag warn">New</span>' : '') + '</div><div class="small muted">' + h(u.field) + (u.effective ? ' · effective ' + h(fmtDate(u.effective)) : '') + '</div><p style="margin-top:6px">' + h(u.body) + '</p>' + (u.source ? '<a class="small" href="' + h(u.source) + '" target="_blank" rel="noopener">Source</a>' : '') + '</div>';
      }).join('') : '') +
      '<h2>Practice quiz</h2><div class="card"><p>' + (L.quiz.length + proQuiz(f).length) + ' questions' + (best ? ' · your best: ' + h(best) : '') + '</p><div class="row"><button class="primary" data-act="startQuiz" data-n="10">Quick quiz (10)</button>' +
      (pro && proQuiz(f).length ? '<button class="gold" data-act="startQuiz" data-n="999">Full exam prep (Pro)</button>' : (!pro ? '<button class="ghost" data-tab="upgrade">Full exam prep · Pro</button>' : '')) + '</div></div>' +
      '<h2>Refreshers</h2>' + (L.refreshers.concat(proRef(f)).map(function (r, i) { return '<div class="card"><h3>' + h(r[0]) + (i >= L.refreshers.length ? ' <span class="tag navy">Pro</span>' : '') + '</h3><p style="margin:0">' + h(r[1]) + '</p></div>'; }).join('') || '<p class="muted">More refreshers for this field are coming.</p>') +
      (!pro && f === 'HVAC/R' ? '<div class="card lock"><h3>Ladder diagrams, capacitor and contactor checks <span class="tag navy">Pro</span></h3><p class="small muted">Part of Connect Pro.</p></div>' : '') +
      ((diags.length || proDiagrams(f).length) ? '<h2>Diagrams</h2>' + diags.concat(proDiagrams(f)).map(function (d, i) { return '<div class="card"><h3>' + h(d.title) + (i >= diags.length ? ' <span class="tag navy">Pro</span>' : '') + '</h3><div class="diagram">' + drawDiagram(d) + '</div></div>'; }).join('') : '') +
      (!pro && f === 'HVAC/R' ? '<div class="card lock"><h3>Heat pump, two-stage and zone valve wiring <span class="tag navy">Pro</span></h3><p class="small muted">Advanced wiring diagrams are part of Connect Pro.</p><button class="gold" data-tab="upgrade">See plans</button></div>' : '') +
      '<p class="small muted">Study aids only. Check your instructor, the manufacturer\'s data and the official study guide. Rules change; we post updates here when they do.</p>';
  };
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
  function quizView() {
    var q = S.quiz, cur = q.list[q.i];
    if (!cur) {
      var pct = Math.round(q.score / q.list.length * 100), key = 'connect_best_' + q.field, prev = store(key);
      if (!prev || parseInt(prev, 10) < pct) store(key, pct + '%');
      return '<h1>Quiz done</h1><div class="card"><p style="font-size:22px"><b>' + q.score + ' of ' + q.list.length + '</b> (' + pct + '%)</p><div class="row"><button class="primary" data-act="startQuiz" data-n="' + q.n + '">Try again</button><button class="ghost" data-act="endQuiz">Back to Learn</button></div></div>';
    }
    return '<div class="spread"><h1 style="font-size:24px">' + h(q.field) + ' quiz</h1><span class="muted">' + (q.i + 1) + ' / ' + q.list.length + '</span></div>' +
      '<div class="card"><p style="font-size:18px">' + h(cur.q) + '</p>' + cur.o.map(function (o, k) {
        var cls = q.answered == null ? '' : (k === cur.a ? ' right' : (k === q.answered ? ' wrong' : ''));
        return '<button class="quiz-opt' + cls + '" data-act="answer" data-k="' + k + '"' + (q.answered != null ? ' disabled' : '') + '>' + String.fromCharCode(65 + k) + '. ' + h(o) + '</button>';
      }).join('') +
      (q.answered != null ? '<div class="notice" style="margin-top:10px"><b>' + (q.answered === cur.a ? 'Correct.' : 'Not quite.') + '</b> ' + h(cur.why) + '</div><button class="primary" data-act="nextQ">' + (q.i + 1 < q.list.length ? 'Next question' : 'See score') + '</button> <button class="ghost" data-act="speakQ">Read aloud</button>' : '<button class="ghost" data-act="speakQ">Read aloud</button>') +
      '</div><button class="link" data-act="endQuiz">Stop quiz</button>';
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
      '<div class="full"><label class="check"><input type="checkbox" id="pAlerts"' + (me.alerts ? ' checked' : '') + '> Email me new jobs and rule changes for my field</label></div>' +
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
    return '<h1>Admin</h1><div class="row" style="margin-bottom:12px"><button class="gold" data-act="showQR">Show my QR code</button><button class="ghost" data-act="exportContacts">Download contacts (CSV)</button><button class="ghost" data-act="openBroadcast">Send an update to members</button></div>' +
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
    }).catch(function (e) { S.chat.pop(); render(); fail(e); });
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
  function dayIndex() { var n = new Date(), s0 = new Date(n.getFullYear(), 0, 0); return Math.floor((n - s0) / 86400000); }
  function wisdomOrder() { var w = S.wisdom; if (!w.length) return []; var i = dayIndex() % w.length; return w.slice(i).concat(w.slice(0, i)); }
  function wisdomCard(x, big) { return '<div class="card" style="' + (big ? 'border-left:4px solid var(--gold)' : 'min-height:200px;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center') + '"><div class="small" style="letter-spacing:.06em;text-transform:uppercase;color:#7A5F22">' + h(x.c) + ' wisdom</div><div style="font:600 ' + (big ? '22' : '26') + 'px/1.2 \'Cormorant Garamond\',Georgia,serif;margin:4px 0 6px">' + h(x.t) + '</div><p style="margin:0">' + h(x.b) + '</p></div>'; }
  function wisdomToday() { var w = wisdomOrder()[0]; return w ? wisdomCard(w, true) : ''; }
  VIEWS.wisdom = function () {
    var cats = []; S.wisdom.forEach(function (x) { if (cats.indexOf(x.c) < 0) cats.push(x.c); });
    var cf = S.wisdomCat || 'All';
    var list = wisdomOrder().filter(function (x) { return cf === 'All' || x.c === cf; });
    return '<h1>Wisdom</h1><p class="muted">Short lessons on money, business, career and getting ahead. Scroll, or play them out loud.</p>' +
      '<div class="row" style="margin-bottom:12px">' + ['All'].concat(cats).map(function (c) { return '<button class="' + (c === cf ? 'primary' : 'ghost') + '" data-act="wisdomCat" data-v="' + h(c) + '">' + h(c) + '</button>'; }).join('') + '</div>' +
      '<button class="gold" data-act="listen" data-what="wisdom" style="margin-bottom:12px">Play all out loud</button>' +
      '<div style="max-height:70vh;overflow-y:auto;scroll-snap-type:y mandatory">' + list.map(function (x) { return wisdomCard(x, false); }).join('') + '</div>';
  };

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
    return api('saveItem', { kind: kind, item: item }).then(function (j) {
      var i = S.items.findIndex(function (x) { return x.id === j.item.id; });
      if (i > -1) S.items[i] = j.item; else S.items.push(j.item);
      S.edit = null; render(); toast('Saved.'); return j.item;
    }).catch(function (e) { busy(btn, false); fail(e); });
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
        return saveItem('track', { jobId: j.id, title: j.title, company: j.company, category: j.category, pay: j.pay, type: j.type, location: j.location, url: j.url, status: 'Saved', notes: j.contact ? 'Contact: ' + j.contact : '' }, el);
      }
      case 'reviewJob': busy(el, true); return api('reviewJob', { id: id, decision: el.getAttribute('data-d') }).then(function (r) { S.jobs = r.jobs; S.admin = null; render(); toast('Done.'); }).catch(function (er) { busy(el, false); fail(er); });
      case 'closeJob': if (!confirm('Close this job post?')) return; return api('closeJob', { id: id }).then(function (r) { S.jobs = r.jobs; render(); }).catch(fail);
      case 'editTrack': S.edit = { kind: 'track', item: id ? items('track').filter(function (x) { return x.id === id; })[0] : null }; if (S.tab !== 'tracker') { S.tab = 'tracker'; } return render();
      case 'editCert': S.edit = { kind: 'cert', item: id ? items('cert').filter(function (x) { return x.id === id; })[0] : (el.getAttribute('data-name') ? { name: el.getAttribute('data-name') } : null) }; return render();
      case 'editLog': S.edit = { kind: 'log', item: id ? items('log').filter(function (x) { return x.id === id; })[0] : null }; return render();
      case 'delItem': if (!confirm('Delete this? This can\'t be undone.')) return; return api('deleteItem', { id: id }).then(function () { S.items = S.items.filter(function (x) { return x.id !== id; }); render(); toast('Deleted.'); }).catch(fail);
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
      case 'openUpdates': S.learnField = S.me.specialty; go('learn'); setTimeout(function () { var r = document.getElementById('rules'); if (r) r.scrollIntoView(); }, 50); return;
      case 'startQuiz': {
        var f = S.learnField, L = LEARN[f] || { quiz: [] }, n = Number(el.getAttribute('data-n'));
        var pool = n > 100 ? L.quiz.concat(proQuiz(f)) : L.quiz.concat(S.me.premium ? proQuiz(f) : []);
        S.quiz = { field: f, list: shuffle(pool).slice(0, n), i: 0, score: 0, answered: null, n: n }; return render();
      }
      case 'answer': { var q = S.quiz; if (q.answered != null) return; q.answered = Number(el.getAttribute('data-k')); if (q.answered === q.list[q.i].a) q.score++; return render(); }
      case 'nextQ': S.quiz.i++; S.quiz.answered = null; render(); window.scrollTo(0, 0); return;
      case 'speakQ': { var cq = S.quiz.list[S.quiz.i]; var parts = quizToSpeech([cq]); playList(S.quiz.answered != null ? parts : [parts[0]], 'This question'); return; }
      case 'endQuiz': S.quiz = null; return render();
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
      toast('Uploading ' + side + '…');
      readFileForUpload(file).then(function (f) { return api('uploadFile', { certId: certId, side: side, mime: f.mime, data: f.data, name: file.name }); })
        .then(function (j) { var i = S.items.findIndex(function (x) { return x.id === j.item.id; }); S.items[i] = j.item; render(); toast('Saved ' + side + '.'); }).catch(fail);
      return;
    }
    var a = el.getAttribute('data-act-change');
    if (a === 'learnField') { S.learnField = el.value; S.quiz = null; render(); }
    if (a === 'logYear') { S.logYear = el.value; render(); }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    var btn = f.querySelector('button[type=submit]'), kind = f.getAttribute('data-form');
    if (kind === 'saveTrack') return saveItem('track', { id: field('tId') || undefined, jobId: field('tJob'), title: field('tTitle'), company: field('tCompany'), status: field('tStatus'), category: field('tCat'), pay: field('tPay'), type: field('tType'), location: field('tLoc'), dateApplied: field('tApplied'), appNumber: field('tApp'), resumeUsed: field('tResume'), followUp: field('tFollow'), url: field('tUrl'), notes: field('tNotes') }, btn);
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
      return api('postJob', { job: { title: field('jTitle'), company: field('jCompany'), category: field('jCat'), pay: field('jPay'), type: field('jType'), location: field('jLoc'), contact: field('jContact'), url: field('jUrl'), description: field('jDesc') } })
        .then(function (r) { S.jobs = r.jobs; S.edit = null; render(); toast(r.job.status === 'approved' ? 'Posted. Members in that field were emailed.' : 'Sent for approval.'); }).catch(function (er) { busy(btn, false); fail(er); });
    }
    if (kind === 'saveProfile') {
      if (!field('pName') || !field('pSpec')) return toast('Add your name and field.');
      busy(btn, true, 'Saving…');
      return api('saveProfile', { profile: { name: field('pName'), phone: field('pPhone'), specialty: field('pSpec'), schoolStart: field('pSchool'), digest: field('pDigest'), alerts: field('pAlerts'), share: field('pShare') } })
        .then(function (r) { var first = !S.me.specialty; S.me = r.me; toast('Saved.'); go(first ? 'home' : 'profile'); }).catch(function (er) { busy(btn, false); fail(er); });
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
      return api('saveProfile', { profile: { resume: resume } }).then(function (r) { S.me = r.me; render(); toast('Resume saved.'); }).catch(function (er) { busy(btn, false); fail(er); });
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
