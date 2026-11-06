/**
 * Connect — Members backend (Google Apps Script)
 * CMCC Training Institute · Crisp Cares · Crisp Clean
 *
 * Front end: https://crispus-mundo.github.io/crisp-cares/connect/member/
 * Storage:   "Connect Members DB" spreadsheet + "Connect Member Files" Drive folder (owner's Drive, never shared).
 *
 * First run: open this project, run setup() once, approve permissions, then
 * Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */

var APP_VERSION = 'connect-members v1.2 — 2026-11-06';
var ADMINS = ['crispcleaninc@gmail.com']; // ccyars26 is a regular member account by choice
var APP_URL = 'https://crispus-mundo.github.io/crisp-cares/connect/member/';
var HUB_URL = 'https://crispus-mundo.github.io/crisp-cares/connect/';
var SUPPORT_EMAIL = 'LmiraC@crispcleans.com';
var BRAND = 'Connect';
var ORG = 'CMCC Training Institute · Crisp Cares · Crisp Clean';
var NAVY = '#1B2951', GOLD = '#C9A961', CREAM = '#FAF7F0';
var SESSION_DAYS = 30;
var CODE_MINUTES = 10;
var MAX_FILE_BYTES = 8 * 1024 * 1024;        // after base64 decode
var KINDS = ['track', 'cert', 'log'];
var SPECIALTIES = ['HVAC/R', 'Tax preparation', 'Home care', 'Phlebotomy & medical', 'Barbering & cosmetology', 'Cleaning & environmental', 'Business owner', 'Other'];

var TABS = {
  Members: ['email', 'name', 'phone', 'specialty', 'schoolStart', 'alerts', 'share', 'role', 'partnerStatus', 'company', 'created', 'lastLogin', 'resume', 'premiumUntil', 'plan', 'digest', 'lastDigest', 'source', 'verified', 'fields'],
  Unions: ['id', 'name', 'trade', 'state', 'area', 'website', 'phone', 'address', 'signUp', 'requirements', 'howToApply', 'hours', 'pay', 'howItWorks', 'deadline', 'deadlineNote', 'verified', 'source', 'active', 'order'],
  Updates: ['id', 'field', 'title', 'body', 'effective', 'source', 'created', 'postedBy'],
  Plans: ['id', 'name', 'months', 'price', 'note', 'payLink', 'recurring', 'active', 'order'],
  Products: ['id', 'name', 'business', 'description', 'price', 'link', 'active', 'order', 'payLink'],
  Orders: ['id', 'email', 'kind', 'refId', 'name', 'status', 'months', 'price', 'created', 'paidAt', 'by', 'note', 'payOption', 'docs'],
  Resources: ['id', 'name', 'type', 'address', 'phone', 'website', 'note', 'verified', 'active', 'order'],
  Questions: ['id', 'email', 'lang', 'question', 'answer', 'mode', 'created', 'status'],
  Codes: ['email', 'codeHash', 'expires', 'tries'],
  Sessions: ['tokenHash', 'email', 'expires', 'created'],
  Jobs: ['id', 'title', 'company', 'category', 'pay', 'type', 'location', 'url', 'contact', 'description', 'postedBy', 'status', 'created', 'reviewedBy', 'source', 'requirements', 'benefits', 'itin', 'checked', 'key'],
  Items: ['id', 'email', 'kind', 'json', 'updated'],
  Log: ['when', 'email', 'action', 'detail']
};

/* ------------------------------------------------------------------ setup */

function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SALT')) props.setProperty('SALT', Utilities.getUuid() + Utilities.getUuid());
  var root = getOrMakeFolder_(DriveApp.getRootFolder(), 'Connect App');
  var ssId = props.getProperty('DB_ID');
  var ss;
  try { ss = ssId ? SpreadsheetApp.openById(ssId) : null; } catch (e) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create('Connect Members DB');
    DriveApp.getFileById(ss.getId()).moveTo(root);
    props.setProperty('DB_ID', ss.getId());
  }
  Object.keys(TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = TABS[name];
    var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
    if (cur.join('|') !== head.join('|')) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground(NAVY).setFontColor(CREAM);
      sh.setFrozenRows(1);
    }
  });
  seedCatalog_(ss);
  seedUnions_(ss);
  seedResources_(ss);
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  var files = getOrMakeFolder_(root, 'Connect Member Files');
  props.setProperty('FILES_ID', files.getId());
  // daily reminders at ~8am
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'dailyReminders'; });
  if (!has) ScriptApp.newTrigger('dailyReminders').timeBased().everyDays(1).atHour(8).create();
  var out = { ok: true, version: APP_VERSION, sheet: ss.getUrl(), files: files.getUrl(), mailQuotaLeft: MailApp.getRemainingDailyQuota() };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function getOrMakeFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ------------------------------------------------------------------ http */

function doGet(e) {
  return json_({ ok: true, app: BRAND, version: APP_VERSION, health: 'up', time: new Date().toISOString() });
}

function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'Bad request.' }); }
  try {
    var out = route_(req.action, req);
    return json_(Object.assign({ ok: true }, out || {}));
  } catch (err) {
    var msg = String(err && err.message || err);
    if (msg.indexOf('USER:') === 0) return json_({ ok: false, error: msg.slice(5) });
    logEvent_('', 'error', req.action + ': ' + msg);
    return json_({ ok: false, error: 'Something went wrong on our side. Please try again.' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(msg) { throw new Error('USER:' + msg); }

function route_(action, r) {
  switch (action) {
    case 'ping': return { version: APP_VERSION };
    case 'requestCode': return requestCode_(r);
    case 'verifyCode': return verifyCode_(r);
  }
  var me = auth_(r.token);
  switch (action) {
    case 'me': return loadAll_(me);
    case 'signOut': return signOut_(r.token);
    case 'saveProfile': return saveProfile_(me, r.profile || {});
    case 'requestPartner': return requestPartner_(me, r.company);
    case 'listJobs': return { jobs: listJobs_(me) };
    case 'postJob': return postJob_(me, r.job || {});
    case 'reviewJob': return reviewJob_(me, r.id, r.decision);
    case 'closeJob': return closeJob_(me, r.id);
    case 'reviewPartner': return reviewPartner_(me, r.email, r.decision);
    case 'saveItem': return saveItem_(me, r.kind, r.item || {});
    case 'sync': return sync_(me, r.ops || []);
    case 'importJobs': return importJobs_(me);
    case 'deleteItem': return deleteItem_(me, r.id);
    case 'uploadFile': return uploadFile_(me, r);
    case 'getFile': return getFile_(me, r.fileId);
    case 'adminData': return adminData_(me);
    case 'broadcast': return broadcast_(me, r);
    case 'postUpdate': return postUpdate_(me, r.update || {});
    case 'deleteUpdate': return deleteUpdate_(me, r.id);
    case 'requestOrder': return requestOrder_(me, r.kind, r.refId, r.payOption, r.note);
    case 'uploadOrderDoc': return uploadOrderDoc_(me, r);
    case 'ask': return ask_(me, r);
    case 'confirmOrder': return confirmOrder_(me, r.id, r.months);
    case 'cancelOrder': return cancelOrder_(me, r.id);
    case 'grantPremium': return grantPremium_(me, r.email, r.months);
    case 'premium': return premium_(me);
  }
  fail_('Unknown action.');
}

/* ------------------------------------------------------------------ sheet helpers */

function db_() { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_ID')); }
function sh_(name) { return db_().getSheetByName(name); }

function rows_(name) {
  var sh = sh_(name), head = TABS[name];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, head.length).getValues();
  return vals.map(function (v, i) {
    var o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = v[j]; });
    return o;
  });
}

function append_(name, obj) {
  var head = TABS[name];
  sh_(name).appendRow(head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}

function write_(name, obj) {
  var head = TABS[name];
  sh_(name).getRange(obj._row, 1, 1, head.length).setValues([head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; })]);
}

function delete_(name, row) { sh_(name).deleteRow(row); }

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function hash_(s) {
  var salt = PropertiesService.getScriptProperties().getProperty('SALT') || '';
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + s, Utilities.Charset.UTF_8);
  return d.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function clean_(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 500); }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function isEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
function bool_(v) { return v === true || v === 'TRUE' || v === 'true'; }

function logEvent_(email, action, detail) {
  try { append_('Log', { when: new Date(), email: email, action: action, detail: clean_(detail, 300) }); } catch (e) {}
}

/* ------------------------------------------------------------------ auth */

function requestCode_(r) {
  var email = clean_(r.email, 120).toLowerCase();
  if (!isEmail_(email)) fail_('Please enter a valid email address.');
  var cache = CacheService.getScriptCache();
  var key = 'rc:' + hash_(email).slice(0, 40);
  var n = Number(cache.get(key) || 0);
  if (n >= 3) fail_('Too many codes requested. Please wait 15 minutes and try again.');
  cache.put(key, String(n + 1), 900);
  var code = String(Math.floor(100000 + Math.random() * 900000));
  withLock_(function () {
    rows_('Codes').filter(function (c) { return c.email === email; }).reverse().forEach(function (c) { delete_('Codes', c._row); });
    append_('Codes', { email: email, codeHash: hash_(email + ':' + code), expires: new Date(Date.now() + CODE_MINUTES * 60000), tries: 0 });
  });
  var name = clean_(r.name, 80), phone = clean_(r.phone, 30).replace(/[^0-9+()\-. ]/g, ''), src = clean_(r.src, 40).replace(/[^a-z0-9_-]/gi, '');
  if (phone && phone.replace(/\D/g, '').length < 10) fail_('Please enter a 10-digit phone number.');
  var member = withLock_(function () {
    var m = rows_('Members').filter(function (x) { return x.email === email; })[0];
    if (!m && name) {
      append_('Members', { email: email, name: name, phone: phone, specialty: '', schoolStart: '', alerts: true, digest: 'weekly', lastDigest: '', share: false, role: ADMINS.indexOf(email) > -1 ? 'admin' : 'member', partnerStatus: '', company: '', created: new Date(), lastLogin: '', resume: '', source: src || 'join', verified: false });
      m = rows_('Members').filter(function (x) { return x.email === email; })[0];
      if (src.indexOf('qr') === 0) notifyAdmins_('New sign-up from your QR code: ' + name, '<p><b>' + esc_(name) + '</b> · ' + esc_(phone) + ' · ' + esc_(email) + '</p><p><a href="' + db_().getUrl() + '">Open the Members sheet</a> · <a href="' + APP_URL + '#admin">Connect admin</a></p>');
    } else if (m && (name || phone)) {
      if (name && !m.name) m.name = name;
      if (phone && !m.phone) m.phone = phone;
      write_('Members', m);
    }
    return m;
  });
  sendOtpEmail_(email, member && member.name, code);
  logEvent_(email, 'requestCode', '');
  return { sent: true };
}

function verifyCode_(r) {
  var email = clean_(r.email, 120).toLowerCase();
  var code = clean_(r.code, 10).replace(/\D/g, '');
  return withLock_(function () {
    var rec = rows_('Codes').filter(function (c) { return c.email === email; })[0];
    if (!rec) fail_('That code has expired. Request a new one.');
    if (new Date(rec.expires).getTime() < Date.now()) { delete_('Codes', rec._row); fail_('That code has expired. Request a new one.'); }
    if (Number(rec.tries) >= 5) { delete_('Codes', rec._row); fail_('Too many tries. Request a new code.'); }
    if (rec.codeHash !== hash_(email + ':' + code)) {
      rec.tries = Number(rec.tries) + 1; write_('Codes', rec);
      fail_('That code does not match. Check the latest email and try again.');
    }
    delete_('Codes', rec._row);
    var m = rows_('Members').filter(function (x) { return x.email === email; })[0];
    var isAdmin = ADMINS.indexOf(email) > -1;
    if (!m) {
      append_('Members', { source: 'sign-in', verified: true, email: email, name: '', phone: '', specialty: '', schoolStart: '', alerts: true, digest: 'weekly', lastDigest: '', share: false, role: isAdmin ? 'admin' : 'member', partnerStatus: '', company: '', created: new Date(), lastLogin: new Date(), resume: '' });
    } else {
      m.lastLogin = new Date(); m.verified = true;
      if (isAdmin) m.role = 'admin'; else if (m.role === 'admin') m.role = 'member';
      write_('Members', m);
    }
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    // prune expired sessions for this email
    rows_('Sessions').filter(function (s) { return s.email === email && new Date(s.expires).getTime() < Date.now(); }).reverse().forEach(function (s) { delete_('Sessions', s._row); });
    append_('Sessions', { tokenHash: hash_('t:' + token), email: email, expires: new Date(Date.now() + SESSION_DAYS * 86400000), created: new Date() });
    logEvent_(email, 'signIn', '');
    return { token: token };
  });
}

function auth_(token) {
  if (!token) fail_('Please sign in.');
  var h = hash_('t:' + token);
  var s = rows_('Sessions').filter(function (x) { return x.tokenHash === h; })[0];
  if (!s || new Date(s.expires).getTime() < Date.now()) fail_('Your sign-in expired. Please sign in again.');
  var m = rows_('Members').filter(function (x) { return x.email === s.email; })[0];
  if (!m) fail_('Please sign in again.');
  return m;
}

function signOut_(token) {
  var h = hash_('t:' + token);
  withLock_(function () {
    rows_('Sessions').filter(function (x) { return x.tokenHash === h; }).reverse().forEach(function (s) { delete_('Sessions', s._row); });
  });
  return { signedOut: true };
}

/* ------------------------------------------------------------------ member data */

function publicMe_(m) {
  var resume = {};
  try { resume = m.resume ? JSON.parse(m.resume) : {}; } catch (e) {}
  return {
    email: m.email, name: m.name, phone: m.phone, specialty: m.specialty,
    schoolStart: m.schoolStart ? Utilities.formatDate(new Date(m.schoolStart), 'America/Detroit', 'yyyy-MM-dd') : '',
    alerts: bool_(m.alerts), share: bool_(m.share), role: m.role, partnerStatus: m.partnerStatus, company: m.company,
    created: m.created, resume: resume,
    premiumUntil: m.premiumUntil ? new Date(m.premiumUntil).toISOString() : '', premium: isPremium_(m), plan: m.plan, digest: m.digest || 'weekly', fields: memberFields_(m)
  };
}

function isPremium_(m) { return m.role === 'admin' || (m.premiumUntil && new Date(m.premiumUntil).getTime() > Date.now()); }

function myItems_(email) {
  return rows_('Items').filter(function (i) { return i.email === email; }).map(function (i) {
    var o = {}; try { o = JSON.parse(i.json); } catch (e) {}
    o.id = i.id; o.kind = i.kind; o.updated = i.updated;
    return o;
  });
}

function loadAll_(m) {
  return {
    me: publicMe_(m), jobs: listJobs_(m), items: myItems_(m.email), specialties: SPECIALTIES, version: APP_VERSION,
    updates: listUpdates_(), unions: listUnions_(), wisdom: WISDOM, resources: listResources_(), langs: LANGS, aiOn: !!(PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')), plans: activeRows_('Plans'), products: activeRows_('Products'),
    orders: rows_('Orders').filter(function (o) { return o.email === m.email; }).map(orderOut_)
  };
}

function saveProfile_(m, p) {
  return withLock_(function () {
    m = rows_('Members').filter(function (x) { return x.email === m.email; })[0];
    if ('name' in p) m.name = clean_(p.name, 80);
    if ('phone' in p) m.phone = clean_(p.phone, 30);
    if ('specialty' in p) m.specialty = SPECIALTIES.indexOf(p.specialty) > -1 ? p.specialty : '';
    if ('schoolStart' in p) m.schoolStart = /^\d{4}-\d{2}-\d{2}$/.test(p.schoolStart) ? p.schoolStart : '';
    if ('alerts' in p) m.alerts = !!p.alerts;
    if ('share' in p) m.share = !!p.share;
    if ('company' in p) m.company = clean_(p.company, 100);
    if ('fields' in p) m.fields = (Array.isArray(p.fields) ? p.fields : []).filter(function (f) { return SPECIALTIES.indexOf(f) > -1; }).join(',');
    if ('digest' in p) m.digest = ['daily', 'weekly', 'monthly', 'off'].indexOf(p.digest) > -1 ? p.digest : 'weekly';
    if ('resume' in p) {
      var s = JSON.stringify(p.resume || {});
      if (s.length > 45000) fail_('Your resume is too long to save. Please shorten it.');
      m.resume = s;
    }
    write_('Members', m);
    return { me: publicMe_(m) };
  });
}

function requestPartner_(m, company) {
  company = clean_(company, 100);
  if (!company) fail_('Please enter your company name.');
  if (m.role === 'admin') fail_('Admins can already post jobs.');
  withLock_(function () {
    m = rows_('Members').filter(function (x) { return x.email === m.email; })[0];
    m.company = company; m.partnerStatus = m.partnerStatus === 'approved' ? 'approved' : 'pending';
    write_('Members', m);
  });
  notifyAdmins_('Partner request: ' + company,
    '<p><b>' + esc_(m.name || m.email) + '</b> (' + esc_(m.email) + ') asked to post jobs on Connect for <b>' + esc_(company) + '</b>.</p>' +
    '<p><a href="' + APP_URL + '#admin">Review in Connect admin</a> · <a href="' + db_().getUrl() + '">Open the Members sheet</a></p>');
  return { me: publicMe_(m) };
}

function reviewPartner_(me, email, decision) {
  if (me.role !== 'admin') fail_('Admins only.');
  email = clean_(email, 120).toLowerCase();
  return withLock_(function () {
    var m = rows_('Members').filter(function (x) { return x.email === email; })[0];
    if (!m) fail_('Member not found.');
    if (decision === 'approve') { m.partnerStatus = 'approved'; if (m.role !== 'admin') m.role = 'partner'; }
    else { m.partnerStatus = 'declined'; if (m.role === 'partner') m.role = 'member'; }
    write_('Members', m);
    logEvent_(me.email, 'reviewPartner', email + ' ' + decision);
    return adminData_(me);
  });
}

/* ------------------------------------------------------------------ jobs */

function jobOut_(j) {
  return { id: j.id, title: j.title, company: j.company, category: j.category, pay: j.pay, type: j.type, location: j.location, url: j.url, contact: j.contact, description: j.description, status: j.status, created: j.created, mine: false,
    source: j.source || '', requirements: j.requirements || '', benefits: j.benefits || '', itin: j.itin || '', checked: j.checked ? Utilities.formatDate(new Date(j.checked), 'America/Detroit', 'yyyy-MM-dd') : '' };
}

function listJobs_(m) {
  return rows_('Jobs').filter(function (j) {
    if (j.status === 'approved') return true;
    if (m.role === 'admin' && j.status === 'pending') return true;
    return j.postedBy === m.email && (j.status === 'pending' || j.status === 'declined');
  }).map(function (j) { var o = jobOut_(j); o.mine = j.postedBy === m.email; return o; })
    .sort(function (a, b) { return new Date(b.created) - new Date(a.created); });
}

function postJob_(m, j) {
  var canPost = m.role === 'admin' || (m.role === 'partner' && m.partnerStatus === 'approved');
  if (!canPost) fail_('Only approved partners can post jobs. Ask for partner access under Profile.');
  var job = {
    id: 'J' + Date.now().toString(36).toUpperCase(),
    title: clean_(j.title, 120), company: clean_(j.company || m.company, 100), category: SPECIALTIES.indexOf(j.category) > -1 ? j.category : 'Other',
    pay: clean_(j.pay, 60), type: clean_(j.type, 40), location: clean_(j.location, 80),
    url: /^https?:\/\//i.test(j.url || '') ? clean_(j.url, 400) : '', contact: clean_(j.contact, 120), description: clean_(j.description, 3000),
    postedBy: m.email, status: m.role === 'admin' ? 'approved' : 'pending', created: new Date(), reviewedBy: m.role === 'admin' ? m.email : '',
    source: m.role === 'admin' ? (clean_(j.source, 80) || JOB_SOURCE) : clean_(j.company || m.company, 100),
    requirements: clean_(j.requirements, 1500), benefits: clean_(j.benefits, 1000), itin: clean_(j.itin, 600), checked: new Date()
  };
  if (!job.title) fail_('Please give the job a title.');
  withLock_(function () { append_('Jobs', job); });
  logEvent_(m.email, 'postJob', job.id + ' ' + job.title);
  if (job.status === 'approved') { if (!(m.role === 'admin' && j.silent)) sendJobAlerts_(job); }
  else notifyAdmins_('Job waiting for approval: ' + job.title,
    '<p><b>' + esc_(job.title) + '</b> at ' + esc_(job.company) + ' was posted by ' + esc_(m.email) + ' and is waiting for your approval.</p>' +
    '<p><a href="' + APP_URL + '#admin">Approve in Connect admin</a> · <a href="' + db_().getUrl() + '">Open the Jobs sheet</a></p>');
  return { job: jobOut_(job), jobs: listJobs_(m) };
}

function reviewJob_(me, id, decision) {
  if (me.role !== 'admin') fail_('Admins only.');
  var job = withLock_(function () {
    var j = rows_('Jobs').filter(function (x) { return x.id === id; })[0];
    if (!j) fail_('Job not found.');
    var was = j.status;
    j.status = decision === 'approve' ? 'approved' : 'declined';
    j.reviewedBy = me.email;
    write_('Jobs', j);
    j._was = was;
    return j;
  });
  if (job.status === 'approved' && job._was !== 'approved') sendJobAlerts_(job);
  logEvent_(me.email, 'reviewJob', id + ' ' + decision);
  return { jobs: listJobs_(me) };
}

function closeJob_(me, id) {
  return withLock_(function () {
    var j = rows_('Jobs').filter(function (x) { return x.id === id; })[0];
    if (!j) fail_('Job not found.');
    if (me.role !== 'admin' && j.postedBy !== me.email) fail_('You can only close your own posts.');
    j.status = 'closed'; write_('Jobs', j);
    return { jobs: listJobs_(me) };
  });
}

function sendJobAlerts_(job) {
  var list = rows_('Members').filter(function (m) {
    return bool_(m.alerts) && isEmail_(m.email) && (!m.specialty || job.category === 'Other' || m.specialty === job.category || memberFields_(m).indexOf(job.category) > -1);
  }).map(function (m) { return m.email; });
  if (!list.length) return 0;
  var left = MailApp.getRemainingDailyQuota();
  if (left < list.length + 1) {
    logEvent_('', 'alertQuota', 'Needed ' + list.length + ', had ' + left);
    list = list.slice(0, Math.max(0, left - 1));
  }
  var body = emailShell_('New job on Connect: ' + job.title, 'New job posted',
    '<p style="margin:0 0 12px">A new job was posted on Connect.</p>' +
    '<table role="presentation" style="border-collapse:collapse;font-size:15px">' +
    row_('Job', job.title) + row_('Company', job.company) + row_('Field', job.category) + row_('Pay', job.pay) + row_('Type', job.type) + row_('Location', job.location) + '</table>' +
    button_(APP_URL + '#jobs', 'See the job and save it'),
    'You get job alerts because you turned them on in Connect. Turn them off any time under Profile.');
  for (var i = 0; i < list.length; i += 45) {
    MailApp.sendEmail({ to: SUPPORT_EMAIL, bcc: list.slice(i, i + 45).join(','), subject: 'New job: ' + job.title + (job.company ? ' — ' + job.company : ''), htmlBody: body, name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
  }
  return list.length;
}

/* ------------------------------------------------------------------ private items */

function saveItem_(m, kind, item) {
  if (KINDS.indexOf(kind) < 0) fail_('Unknown item type.');
  var copy = {};
  Object.keys(item).forEach(function (k) {
    if (k === 'id' || k === 'kind' || k === 'updated') return;
    var v = item[k];
    if (k === 'files' && v && typeof v === 'object') { copy.files = v; return; }
    if (typeof v === 'string') copy[k] = clean_(v, 4000);
    else if (typeof v === 'number' || typeof v === 'boolean') copy[k] = v;
    else if (v && typeof v === 'object') copy[k] = JSON.parse(JSON.stringify(v));
  });
  var s = JSON.stringify(copy);
  if (s.length > 20000) fail_('That entry is too long to save.');
  return withLock_(function () {
    var row;
    if (item.id) {
      row = rows_('Items').filter(function (i) { return i.id === item.id; })[0];
      if (!row || row.email !== m.email) fail_('Entry not found.');
      // keep server-side fields the client can't set
      var old = {}; try { old = JSON.parse(row.json); } catch (e) {}
      if (old.files) copy.files = old.files;
      if (old.reminded) copy.reminded = old.reminded;
      row.json = JSON.stringify(copy); row.updated = new Date();
      write_('Items', row);
    } else {
      if (rows_('Items').filter(function (i) { return i.email === m.email; }).length > 2000) fail_('You have reached the entry limit. Delete old entries first.');
      row = { id: kind.charAt(0).toUpperCase() + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000), email: m.email, kind: kind, json: JSON.stringify(copy), updated: new Date() };
      append_('Items', row);
    }
    var out = JSON.parse(row.json); out.id = row.id; out.kind = row.kind; out.updated = row.updated;
    return { item: out };
  });
}

function deleteItem_(m, id) {
  return withLock_(function () {
    var row = rows_('Items').filter(function (i) { return i.id === id; })[0];
    if (!row || row.email !== m.email) fail_('Entry not found.');
    var o = {}; try { o = JSON.parse(row.json); } catch (e) {}
    if (o.files) Object.keys(o.files).forEach(function (side) { try { DriveApp.getFileById(o.files[side].id).setTrashed(true); } catch (e) {} });
    delete_('Items', row._row);
    return { deleted: id };
  });
}

function memberFolder_(email) {
  var root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FILES_ID'));
  return getOrMakeFolder_(root, 'member-' + hash_('f:' + email).slice(0, 16));
}

function uploadFile_(m, r) {
  var side = ['front', 'back', 'file', 'resume', 'cover', 'other'].indexOf(r.side) > -1 ? r.side : '';
  if (!side) fail_('Choose which file this is.');
  var mime = String(r.mime || '');
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mime) && mime !== 'application/pdf') fail_('Upload a photo or a PDF.');
  var bytes;
  try { bytes = Utilities.base64Decode(String(r.data || '')); } catch (e) { fail_('That file could not be read.'); }
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) fail_('Files must be under 8 MB.');
  return withLock_(function () {
    var itemId = r.itemId || r.certId;
    var row = rows_('Items').filter(function (i) { return i.id === itemId; })[0];
    if (!row || row.email !== m.email || (row.kind !== 'cert' && row.kind !== 'track')) fail_('Entry not found. Save it first, then add files.');
    var o = {}; try { o = JSON.parse(row.json); } catch (e) {}
    o.files = o.files || {};
    if (o.files[side]) { try { DriveApp.getFileById(o.files[side].id).setTrashed(true); } catch (e) {} }
    var ext = mime === 'application/pdf' ? '.pdf' : '.' + mime.split('/')[1].replace('jpeg', 'jpg');
    var blob = Utilities.newBlob(bytes, mime, row.id + '-' + side + ext);
    var f = memberFolder_(m.email).createFile(blob);
    o.files[side] = { id: f.getId(), mime: mime, name: clean_(r.name, 120) || f.getName(), size: bytes.length, added: new Date().toISOString() };
    row.json = JSON.stringify(o); row.updated = new Date();
    write_('Items', row);
    var out = JSON.parse(row.json); out.id = row.id; out.kind = row.kind;
    return { item: out };
  });
}

function getFile_(m, fileId) {
  var own = rows_('Items').some(function (i) {
    if (i.email !== m.email || (i.kind !== 'cert' && i.kind !== 'track')) return false;
    var o = {}; try { o = JSON.parse(i.json); } catch (e) {}
    return o.files && Object.keys(o.files).some(function (s) { return o.files[s].id === fileId; });
  });
  if (!own && !orderDocOwned_(m, fileId)) fail_('File not found.');
  var blob = DriveApp.getFileById(fileId).getBlob();
  return { mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

/* ------------------------------------------------------------------ admin */

function adminData_(me) {
  if (me.role !== 'admin') fail_('Admins only.');
  var members = rows_('Members').map(function (m) {
    var o = { email: m.email, name: m.name, phone: m.phone, source: m.source, verified: bool_(m.verified), specialty: m.specialty, role: m.role, partnerStatus: m.partnerStatus, company: m.company, created: m.created, lastLogin: m.lastLogin, share: bool_(m.share), alerts: bool_(m.alerts) };
    if (o.share) { try { o.resume = m.resume ? JSON.parse(m.resume) : {}; } catch (e) { o.resume = {}; } }
    return o;
  });
  return {
    members: members,
    pendingJobs: rows_('Jobs').filter(function (j) { return j.status === 'pending'; }).map(jobOut_),
    jobs: listJobs_(me),
    orders: rows_('Orders').map(orderOut_).sort(function (a, b) { return new Date(b.created) - new Date(a.created); }).slice(0, 200),
    updates: listUpdates_(),
    sheet: db_().getUrl(),
    mailQuotaLeft: MailApp.getRemainingDailyQuota()
  };
}

function notifyAdmins_(subject, html) {
  try {
    MailApp.sendEmail({ to: 'crispcleaninc@gmail.com,crispcareses@gmail.com', subject: '[Connect] ' + subject, htmlBody: html, name: BRAND + ' alerts' });
  } catch (e) { logEvent_('', 'notifyFail', e.message); }
}

/* ------------------------------------------------------------------ daily reminders */

function dailyReminders() {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var marks = [60, 30, 14, 7, 1, 0];
  var byEmail = {};
  var items = rows_('Items');
  items.forEach(function (row) {
    var o = {}; try { o = JSON.parse(row.json); } catch (e) { return; }
    var lines = byEmail[row.email] || (byEmail[row.email] = { certs: [], followups: [] });
    if (row.kind === 'cert' && o.expires) {
      var exp = new Date(o.expires + 'T00:00:00');
      var days = Math.round((exp - today) / 86400000);
      var mark = marks.filter(function (k) { return days === k; })[0];
      o.reminded = o.reminded || [];
      if (mark !== undefined && o.reminded.indexOf(o.expires + ':' + mark) < 0) {
        lines.certs.push({ name: o.name || 'License', days: days, date: o.expires });
        o.reminded.push(o.expires + ':' + mark);
        row.json = JSON.stringify(o); write_('Items', row);
      }
    }
    if (row.kind === 'track' && o.followUp) {
      var f = new Date(o.followUp + 'T00:00:00');
      if (f.getTime() === today.getTime() && ['Offer accepted', 'Not selected', 'Withdrew'].indexOf(o.status) < 0) lines.followups.push({ title: o.title, company: o.company });
    }
  });
  rows_('Members').forEach(function (m) {
    if (!m.premiumUntil || m.role === 'admin') return;
    var d = Math.round((new Date(m.premiumUntil).setHours(0, 0, 0, 0) - today) / 86400000);
    if (d === 7 || d === 1) (byEmail[m.email] || (byEmail[m.email] = { certs: [], followups: [] })).premiumDays = d;
  });
  Object.keys(byEmail).forEach(function (email) {
    var l = byEmail[email];
    if (l.premiumDays) {
      l.certs = l.certs || [];
      l.extra = '<p style="margin:0 0 8px"><b>Your Connect Pro access ends in ' + l.premiumDays + ' day' + (l.premiumDays === 1 ? '' : 's') + '.</b> Renew under Upgrade to keep the full exam prep, advanced diagrams and car-mode playlists.</p>';
    }
    if (!l.certs.length && !l.followups.length && !l.extra) return;
    if (MailApp.getRemainingDailyQuota() < 2) return;
    var html = l.extra || '';
    if (l.certs.length) {
      html += '<p style="margin:0 0 8px"><b>Licenses and certifications coming due</b></p><ul style="margin:0 0 16px;padding-left:20px">' +
        l.certs.map(function (c) { return '<li>' + esc_(c.name) + ' — ' + (c.days === 0 ? 'expires today' : 'expires in ' + c.days + ' day' + (c.days === 1 ? '' : 's')) + ' (' + esc_(c.date) + ')</li>'; }).join('') + '</ul>';
    }
    if (l.followups.length) {
      html += '<p style="margin:0 0 8px"><b>Job follow-ups for today</b></p><ul style="margin:0 0 16px;padding-left:20px">' +
        l.followups.map(function (j) { return '<li>' + esc_(j.title) + (j.company ? ' — ' + esc_(j.company) : '') + '</li>'; }).join('') + '</ul>';
    }
    MailApp.sendEmail({ to: email, subject: 'Connect reminders for ' + Utilities.formatDate(today, 'America/Detroit', 'MMM d'),
      htmlBody: emailShell_('Your Connect reminders', 'Your reminders', html + button_(APP_URL, 'Open Connect'), 'These reminders come from the dates you saved in Connect.'),
      name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
  });
  try { runDigests_(); } catch (e) { logEvent_('', 'digestFail', e.message); }
  // clean up expired codes and sessions
  withLock_(function () {
    rows_('Codes').filter(function (c) { return new Date(c.expires).getTime() < Date.now(); }).reverse().forEach(function (c) { delete_('Codes', c._row); });
    rows_('Sessions').filter(function (s) { return new Date(s.expires).getTime() < Date.now(); }).reverse().forEach(function (s) { delete_('Sessions', s._row); });
  });
}

/* ------------------------------------------------------------------ emails */

function row_(k, v) { return v ? '<tr><td style="padding:3px 12px 3px 0;color:#586079">' + esc_(k) + '</td><td style="padding:3px 0"><b>' + esc_(v) + '</b></td></tr>' : ''; }
function button_(href, label) { return '<p style="margin:20px 0 4px"><a href="' + href + '" style="background:' + NAVY + ';color:' + CREAM + ';text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">' + esc_(label) + '</a></p>'; }

function emailShell_(preheader, title, inner, why) {
  return '<!doctype html><html><body style="margin:0;background:#EEEAE0;font-family:Arial,Helvetica,sans-serif;color:#121C38">' +
    '<div style="display:none;max-height:0;overflow:hidden">' + esc_(preheader) + '</div>' +
    '<table role="presentation" width="100%" style="background:#EEEAE0"><tr><td align="center" style="padding:20px 10px">' +
    '<table role="presentation" width="600" style="max-width:600px;width:100%;background:#fff;border-radius:6px;overflow:hidden">' +
    '<tr><td style="background:' + CREAM + ';padding:8px 24px;font-size:12px;color:#586079">' + esc_(preheader) + '</td></tr>' +
    '<tr><td style="padding:18px 24px;border-bottom:1px solid #E4DCC8"><table role="presentation" width="100%"><tr>' +
    '<td style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:' + NAVY + ';letter-spacing:1px">CONNECT<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:normal;color:#7A5F22;letter-spacing:.5px">' + esc_(ORG) + '</div></td>' +
    '<td align="right" style="font-size:14px"><a href="' + APP_URL + '" style="color:' + NAVY + '">Sign in</a></td></tr></table></td></tr>' +
    '<tr><td style="background:' + NAVY + ';color:' + CREAM + ';padding:16px 24px;font-size:22px;font-family:Georgia,serif">' + esc_(title) + '</td></tr>' +
    '<tr><td style="padding:24px;font-size:15px;line-height:1.55">' + inner + '</td></tr>' +
    '<tr><td style="padding:0 24px 20px;font-size:13px;color:#586079">' + esc_(why) + ' Questions? Email <a href="mailto:' + SUPPORT_EMAIL + '" style="color:' + NAVY + '">' + SUPPORT_EMAIL + '</a>.</td></tr>' +
    '<tr><td style="background:' + CREAM + ';padding:16px 24px;font-size:11px;color:#586079;line-height:1.5">This is an automated message from Connect, operated by CMCC Training Institute with Crisp Cares Environmental Services and Crisp Clean, Southfield and West Bloomfield, Michigan. Your saved information is private to your account and is shared with our companies only if you turn on profile sharing.</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function sendOtpEmail_(email, name, code) {
  var inner =
    '<p style="margin:0 0 14px">Hello' + (name ? ' ' + esc_(String(name).split(' ')[0]) : '') + ',</p>' +
    '<p style="margin:0 0 14px">Use this one-time passcode to sign in to Connect:</p>' +
    '<p style="margin:0 0 14px;font-size:32px;letter-spacing:6px;font-weight:bold;color:' + NAVY + '">' + code + '</p>' +
    '<p style="margin:0 0 18px;color:#586079">This code expires in ' + CODE_MINUTES + ' minutes and can be used once.</p>' +
    '<div style="border-left:4px solid ' + GOLD + ';background:' + CREAM + ';padding:12px 14px;margin:0 0 18px;font-size:14px"><b>Didn\'t ask for this code?</b> You can ignore this email; no one can sign in without it. Never share this code with anyone. Our team will never ask you for it. If you think someone is trying to get into your account, contact <a href="mailto:' + SUPPORT_EMAIL + '" style="color:' + NAVY + '">' + SUPPORT_EMAIL + '</a>.</div>' +
    '<p style="margin:0">Thank you,<br>The Connect team<br><span style="color:#586079">CMCC Training Institute</span></p>';
  MailApp.sendEmail({ to: email, subject: 'Your Connect passcode: ' + code, htmlBody: emailShell_('Your one-time passcode for Connect', 'Your one-time passcode', inner, 'You are receiving this because someone entered this email address to sign in to Connect.'), name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
}


/* ---------------- admin: send an update to members */
function broadcast_(me, r) {
  if (me.role !== 'admin') fail_('Admins only.');
  var subject = clean_(r.subject, 150), body = clean_(r.body, 6000), aud = String(r.audience || 'all');
  if (!subject || !body) fail_('Add a subject and a message.');
  var list = rows_('Members').filter(function (m) { return isEmail_(m.email) && (aud === 'all' || m.specialty === aud); }).map(function (m) { return m.email; });
  var left = MailApp.getRemainingDailyQuota();
  if (!list.length) fail_('No members match that group.');
  if (left < list.length + 1) fail_('Gmail allows ' + left + ' more emails today and this group has ' + list.length + '. Send to a smaller group or try tomorrow.');
  var html = emailShell_(subject, subject, '<div style="white-space:pre-line">' + esc_(body) + '</div>' + button_(APP_URL, 'Open Connect'), 'You are receiving this because you joined Connect. Change how often we email you under Profile.');
  for (var i = 0; i < list.length; i += 45) MailApp.sendEmail({ to: SUPPORT_EMAIL, bcc: list.slice(i, i + 45).join(','), subject: subject, htmlBody: html, name: 'Connect — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
  logEvent_(me.email, 'broadcast', subject + ' -> ' + list.length);
  return { sent: list.length, mailQuotaLeft: MailApp.getRemainingDailyQuota() };
}
/**
 * Connect — rule updates, paid plans, shop and orders.
 * Prices, pay links and products are edited in the "Plans" and "Products" tabs of Connect Members DB.
 * A plan or product with no pay link shows a "Request" button; you then send the client an invoice.
 */

function seedCatalog_(ss) {
  function seed(name, rows) {
    var sh = ss.getSheetByName(name);
    if (sh.getLastRow() > 1) return;
    var head = TABS[name];
    sh.getRange(2, 1, rows.length, head.length).setValues(rows.map(function (o) { return head.map(function (h) { return o[h] === undefined ? '' : o[h]; }); }));
  }
  seed('Plans', [
    { id: 'P6', name: '6 months of Connect Pro', months: 6, price: 159, note: 'Best value — about $26.50 a month', payLink: '', recurring: false, active: true, order: 1 },
    { id: 'P3', name: '3 months of Connect Pro', months: 3, price: 99, note: 'About $33 a month', payLink: '', recurring: false, active: true, order: 2 },
    { id: 'P1', name: '1 month of Connect Pro', months: 1, price: 59, note: 'One month only', payLink: '', recurring: false, active: true, order: 3 },
    { id: 'PM', name: 'Monthly autopay (card on file)', months: 1, price: 39, note: 'Billed every month to your card until you cancel', payLink: '', recurring: true, active: true, order: 4 }
  ]);
  seed('Products', [
    { id: 'S1', name: 'Tax return preparation', business: 'Crisp Clean', description: 'Your personal return prepared and reviewed. Start online and upload your documents.', price: 'From $150', link: 'https://script.google.com/macros/s/AKfycbzmI15RFTtntWe2eQaV-5nDaxVswtmttfMC3gV2qaPCTru5cV-aodWs7rGtr5GJOayGsg/exec?p=client&src=connect', active: true, order: 1 },
    { id: 'S2', name: 'AI tax prep software for preparers', business: 'Crisp Clean', description: 'Season license for tax preparers: documents keyed for you, flagged for review, you sign off.', price: '$499 per season', link: 'https://script.google.com/macros/s/AKfycbzmI15RFTtntWe2eQaV-5nDaxVswtmttfMC3gV2qaPCTru5cV-aodWs7rGtr5GJOayGsg/exec?p=pro&src=connect', active: true, order: 2 },
    { id: 'S3', name: 'Tax plan + client planner portal', business: 'Crisp Clean', description: 'A year-round tax plan with your own planner portal: net worth, documents and next steps in one place.', price: 'Ask for pricing', link: '', active: true, order: 3 },
    { id: 'S4', name: 'Bookkeeping document processor', business: 'CMCC Training Institute', description: 'Upload receipts and statements; they are cleaned of personal data, sorted into categories and filed for tax time.', price: 'Ask for pricing', link: '', active: true, order: 4 },
    { id: 'S5', name: 'CareLedger agency billing', business: 'Crisp Cares', description: 'Billing app for home care agencies, group homes and therapy practices.', price: 'Ask for pricing', link: '', active: true, order: 5 },
    { id: 'S6', name: 'Business command center', business: 'Crisp Clean', description: 'A command center for your business: apps, alerts and AI helpers that watch the work for you.', price: 'Ask for pricing', link: '', active: true, order: 6 },
    { id: 'S7', name: 'Resume review by our team', business: 'CMCC Training Institute', description: 'A person on our team reviews your Connect resume against a job you picked and sends back changes.', price: 'Ask for pricing', link: '', active: true, order: 7 }
  ]);
  seed('Updates', [
    { id: 'U1', field: 'EPA 608', title: 'R-410A: the January 1, 2026 installation deadline was removed', body: 'Since January 1, 2025, new residential and light-commercial AC and heat pump systems can no longer be made or imported with refrigerants above 700 GWP (R-410A is about 2,088). The 2023 rule also said leftover R-410A equipment had to be installed by January 1, 2026. EPA removed that installation deadline in a final rule issued May 21, 2026 (effective July 27, 2026) for equipment made or imported before January 1, 2025. Servicing existing R-410A systems with R-410A is still legal. New York kept the 2026 deadline under its own state rule. VRF/VRV systems made before January 1, 2026 still have to be installed by January 1, 2027.', effective: '2026-07-27', source: 'https://www.achrnews.com/articles/166226-epa-removes-r-410a-installation-deadline', created: new Date(), postedBy: 'setup' },
    { id: 'U2', field: 'EPA 608', title: 'Leak repair now covers HFC systems with 15 lb or more', body: 'Older 608 study material teaches leak repair for ozone-depleting refrigerants at 50 lb or more. Under EPA\'s 2024 Emissions Reduction and Reclamation rule (40 CFR Part 84), starting January 1, 2026, appliances holding 15 lb or more of an HFC refrigerant (GWP above 53) have leak repair, inspection and recordkeeping requirements. Residential and light-commercial AC and heat pumps are not included. Reclaimed HFC refrigerant may contain no more than 15% virgin HFC by weight. EPA has said it is reconsidering parts of this rule, so watch this space.', effective: '2026-01-01', source: 'https://www.epa.gov/system/files/documents/2026-01/er-r-fact-sheet-leak-repair-2026-01-13_1.pdf', created: new Date(), postedBy: 'setup' }
  ]);
}

function activeRows_(name) {
  return rows_(name).filter(function (r) { return bool_(r.active); })
    .sort(function (a, b) { return Number(a.order || 99) - Number(b.order || 99); })
    .map(function (r) { var o = {}; TABS[name].forEach(function (h) { o[h] = r[h]; }); o.recurring = bool_(r.recurring); return o; });
}

/* ---------------- rule updates */

function listUpdates_() {
  return rows_('Updates').map(function (u) {
    return { id: u.id, field: u.field, title: u.title, body: u.body, source: u.source,
      effective: u.effective instanceof Date ? Utilities.formatDate(u.effective, 'America/Detroit', 'yyyy-MM-dd') : String(u.effective || ''),
      created: u.created };
  }).sort(function (a, b) { return new Date(b.created) - new Date(a.created); });
}

function postUpdate_(me, u) {
  if (me.role !== 'admin') fail_('Admins only.');
  var fields = SPECIALTIES.concat(['EPA 608', 'All']);
  var row = { id: 'U' + Date.now().toString(36).toUpperCase(), field: fields.indexOf(u.field) > -1 ? u.field : 'All', title: clean_(u.title, 160), body: clean_(u.body, 4000),
    effective: /^\d{4}-\d{2}-\d{2}$/.test(u.effective || '') ? u.effective : '', source: /^https?:\/\//i.test(u.source || '') ? clean_(u.source, 400) : '', created: new Date(), postedBy: me.email };
  if (!row.title || !row.body) fail_('Give the update a title and the details.');
  withLock_(function () { append_('Updates', row); });
  // alert members in that field (EPA 608 goes to HVAC/R)
  var target = row.field === 'EPA 608' ? 'HVAC/R' : row.field;
  var list = rows_('Members').filter(function (m) { return bool_(m.alerts) && isEmail_(m.email) && (target === 'All' || !m.specialty || m.specialty === target); }).map(function (m) { return m.email; });
  var left = MailApp.getRemainingDailyQuota();
  list = list.slice(0, Math.max(0, left - 1));
  var html = emailShell_('Rule change: ' + row.title, 'A rule changed', '<p style="margin:0 0 8px"><b>' + esc_(row.title) + '</b>' + (row.effective ? ' (effective ' + esc_(row.effective) + ')' : '') + '</p><p style="margin:0 0 12px">' + esc_(row.body) + '</p>' + (row.source ? '<p style="margin:0 0 12px"><a href="' + esc_(row.source) + '" style="color:' + NAVY + '">Read the source</a></p>' : '') + button_(APP_URL + '#learn', 'Open in Connect'), 'You get rule-change alerts because job and update alerts are on in your Connect profile.');
  for (var i = 0; i < list.length; i += 45) MailApp.sendEmail({ to: SUPPORT_EMAIL, bcc: list.slice(i, i + 45).join(','), subject: 'Rule change: ' + row.title, htmlBody: html, name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
  return { updates: listUpdates_(), alerted: list.length };
}

function deleteUpdate_(me, id) {
  if (me.role !== 'admin') fail_('Admins only.');
  withLock_(function () { rows_('Updates').filter(function (u) { return u.id === id; }).reverse().forEach(function (u) { delete_('Updates', u._row); }); });
  return { updates: listUpdates_() };
}

/* ---------------- orders and Pro access */

function orderOut_(o) {
  var docs = []; try { docs = o.docs ? JSON.parse(o.docs) : []; } catch (e) {}
  return { id: o.id, email: o.email, kind: o.kind, refId: o.refId, name: o.name, status: o.status, months: o.months, price: o.price, created: o.created, paidAt: o.paidAt, note: o.note, payOption: o.payOption || 'now', docs: docs };
}

var PAY_OPTIONS = { now: 'Pay now in full', plan: 'Payment plan', refund: 'Pay from my tax refund', help: 'Limited resources — reduced rate request' };

function requestOrder_(m, kind, refId, payOption, note) {
  payOption = PAY_OPTIONS[payOption] ? payOption : 'now';
  note = clean_(note, 1000);
  if (['plan', 'product'].indexOf(kind) < 0) fail_('Unknown order type.');
  var item = activeRows_(kind === 'plan' ? 'Plans' : 'Products').filter(function (x) { return x.id === refId; })[0];
  if (!item) fail_('That option is not available right now.');
  var order = { id: 'O' + Date.now().toString(36).toUpperCase(), email: m.email, kind: kind, refId: item.id, name: item.name, status: 'requested',
    months: kind === 'plan' ? Number(item.months) || 0 : '', price: item.price, created: new Date(), paidAt: '', by: '', note: [item.recurring ? 'monthly autopay' : '', note].filter(String).join('; '), payOption: payOption, docs: '' };
  withLock_(function () { append_('Orders', order); });
  notifyAdmins_('New ' + (kind === 'plan' ? 'Pro plan' : 'shop') + ' request: ' + item.name,
    '<p><b>' + esc_(m.name || m.email) + '</b> (' + esc_(m.email) + (m.phone ? ', ' + esc_(m.phone) : '') + ') chose <b>' + esc_(item.name) + '</b>' + (item.price !== '' ? ' — ' + esc_(String(item.price)) : '') + '.</p><p>Payment choice: <b>' + esc_(PAY_OPTIONS[payOption]) + '</b>' + (note ? '<br>Their note: ' + esc_(note) : '') + (payOption === 'help' ? '<br>They may attach proof of need; view it in Connect admin.' : '') + '</p>' +
    (item.payLink || item.link ? '<p>They were sent to the payment link. Confirm the payment, then mark it paid.</p>' : '<p>No pay link is set for this option, so send them an invoice' + (item.recurring ? ' with autopay (card on file)' : '') + ', then mark it paid.</p>') +
    '<p><a href="' + APP_URL + '#admin">Mark paid in Connect admin</a> · <a href="' + db_().getUrl() + '">Open the Orders sheet</a></p>');
  return { order: orderOut_(order), payLink: payOption === 'now' ? item.payLink || '' : '', startLink: kind === 'product' ? item.link : '' };
}

function extendPremium_(email, months, planName) {
  var m = rows_('Members').filter(function (x) { return x.email === email; })[0];
  if (!m) fail_('Member not found.');
  var start = m.premiumUntil && new Date(m.premiumUntil).getTime() > Date.now() ? new Date(m.premiumUntil) : new Date();
  var until = new Date(start); until.setMonth(until.getMonth() + Number(months));
  m.premiumUntil = until; m.plan = planName || m.plan;
  write_('Members', m);
  return until;
}

function confirmOrder_(me, id, months) {
  if (me.role !== 'admin') fail_('Admins only.');
  var res = withLock_(function () {
    var o = rows_('Orders').filter(function (x) { return x.id === id; })[0];
    if (!o) fail_('Order not found.');
    if (o.status === 'paid') fail_('Already marked paid.');
    o.status = 'paid'; o.paidAt = new Date(); o.by = me.email;
    if (o.kind === 'plan') { var mo = Number(months || o.months) || 1; o.months = mo; o.note = (o.note ? o.note + '; ' : '') + 'Pro until ' + Utilities.formatDate(extendPremium_(o.email, mo, o.name), 'America/Detroit', 'MMM d, yyyy'); }
    write_('Orders', o);
    return o;
  });
  try {
    MailApp.sendEmail({ to: res.email, subject: 'Payment received — ' + res.name, name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL,
      htmlBody: emailShell_('Payment received for ' + res.name, 'Thank you — you\'re all set', '<p style="margin:0 0 12px">We received your payment for <b>' + esc_(res.name) + '</b>.</p>' + (res.kind === 'plan' ? '<p style="margin:0 0 12px">' + esc_(res.note.split('; ').pop()) + '. Your upgrades are open now.</p>' : '<p style="margin:0 0 12px">Our team will contact you about next steps.</p>') + button_(APP_URL, 'Open Connect'), 'You are receiving this because you made a purchase in Connect.') });
  } catch (e) { logEvent_(res.email, 'receiptFail', e.message); }
  logEvent_(me.email, 'confirmOrder', id);
  return adminData_(me);
}

function cancelOrder_(me, id) {
  var isAdmin = me.role === 'admin';
  withLock_(function () {
    var o = rows_('Orders').filter(function (x) { return x.id === id; })[0];
    if (!o || (!isAdmin && o.email !== me.email)) fail_('Order not found.');
    if (o.status === 'paid' && !isAdmin) fail_('Paid orders can only be changed by our team. Email ' + SUPPORT_EMAIL + '.');
    o.status = 'cancelled'; o.by = me.email; write_('Orders', o);
  });
  return isAdmin ? adminData_(me) : { orders: rows_('Orders').filter(function (o) { return o.email === me.email; }).map(orderOut_) };
}

function grantPremium_(me, email, months) {
  if (me.role !== 'admin') fail_('Admins only.');
  months = Number(months);
  if (!(months > 0 && months <= 24)) fail_('Months must be between 1 and 24.');
  withLock_(function () { extendPremium_(clean_(email, 120).toLowerCase(), months, 'Granted by admin'); });
  logEvent_(me.email, 'grantPremium', email + ' ' + months);
  return adminData_(me);
}

function premium_(m) {
  if (!isPremium_(m)) fail_('This is part of Connect Pro. Choose a plan under Upgrade to open it.');
  return { premium: PREMIUM_CONTENT };
}
/**
 * Connect Pro content — only sent to members with active Pro (or admins).
 * Diagrams use the same element format as the free ones in learn.js:
 *   ['box',x,y,w,h,label] ['text',x,y,text,size,anchor,color] ['line',[pts],color,width,arrow] ['term',x,y,label]
 */
var C_R = '#C0392B', C_C = '#2E5AAC', C_W = '#8A8A8A', C_Y = '#C9A227', C_G = '#2E8B57', C_O = '#E67E22', C_P = '#7D3C98';

var PREMIUM_CONTENT = {
  diagrams: [
    { field: 'HVAC/R', title: 'Heat pump thermostat wiring (with aux heat)', w: 660, h: 340, el: [
      ['box', 20, 20, 110, 300, 'Thermostat'],
      ['term', 130, 50, 'R'], ['term', 130, 90, 'C'], ['term', 130, 130, 'G'], ['term', 130, 170, 'W2/AUX'], ['term', 130, 210, 'E'], ['term', 130, 250, 'Y'], ['term', 130, 290, 'O/B'],
      ['box', 260, 20, 150, 220, 'Air handler'],
      ['term', 260, 50, 'R'], ['term', 260, 90, 'C'], ['term', 260, 130, 'G'], ['term', 260, 170, 'W2'],
      ['line', [130, 50, 260, 50], C_R], ['line', [130, 90, 260, 90], C_C], ['line', [130, 130, 260, 130], C_G], ['line', [130, 170, 260, 170], C_W],
      ['line', [130, 210, 200, 210, 200, 170], C_W, 2], ['text', 205, 200, 'E jumped to W2 (typical)', 10, 'start'],
      ['box', 500, 150, 140, 170, 'Outdoor unit / defrost board'],
      ['term', 500, 250, 'Y'], ['term', 500, 290, 'O/B'], ['term', 500, 210, 'C'], ['term', 500, 180, 'W2 out'],
      ['line', [130, 250, 500, 250], C_Y], ['line', [130, 290, 500, 290], C_O],
      ['line', [410, 90, 455, 90, 455, 210, 500, 210], C_C],
      ['line', [500, 180, 440, 180, 440, 170, 410, 170], C_W, 2, true], ['term', 410, 170, ''],
      ['text', 330, 330, 'O = reversing valve on in cooling (most brands). B = on in heating (some brands, e.g. Rheem/Ruud). Check the unit.', 10, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Two-stage furnace and two-stage cooling', w: 660, h: 320, el: [
      ['box', 20, 20, 110, 280, 'Thermostat'],
      ['term', 130, 50, 'R'], ['term', 130, 90, 'C'], ['term', 130, 130, 'W1'], ['term', 130, 170, 'W2'], ['term', 130, 210, 'G'], ['term', 130, 250, 'Y1'], ['term', 130, 290, 'Y2'],
      ['box', 260, 20, 150, 290, 'Furnace board'],
      ['term', 260, 50, 'R'], ['term', 260, 90, 'C'], ['term', 260, 130, 'W1'], ['term', 260, 170, 'W2'], ['term', 260, 210, 'G'], ['term', 260, 250, 'Y1'], ['term', 260, 290, 'Y2'],
      ['line', [130, 50, 260, 50], C_R], ['line', [130, 90, 260, 90], C_C], ['line', [130, 130, 260, 130], C_W], ['line', [130, 170, 260, 170], C_P], ['line', [130, 210, 260, 210], C_G], ['line', [130, 250, 260, 250], C_Y], ['line', [130, 290, 260, 290], C_O],
      ['box', 500, 170, 140, 130, 'Two-stage condenser'],
      ['term', 410, 250, ''], ['term', 410, 290, ''], ['term', 410, 90, ''],
      ['term', 500, 200, 'C'], ['term', 500, 240, 'Y1'], ['term', 500, 280, 'Y2'],
      ['line', [410, 90, 450, 90, 450, 200, 500, 200], C_C], ['line', [410, 250, 470, 250, 470, 240, 500, 240], C_Y], ['line', [410, 290, 480, 290, 480, 280, 500, 280], C_O],
      ['text', 560, 60, 'W1 = low fire', 12, 'middle'], ['text', 560, 80, 'W2 = high fire', 12, 'middle'], ['text', 560, 110, 'Y1 = low stage cool', 12, 'middle'], ['text', 560, 130, 'Y2 = high stage cool', 12, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Hydronic zone valves with end switches', w: 660, h: 320, el: [
      ['box', 20, 30, 120, 70, '24V transformer'], ['term', 140, 50, 'R'], ['term', 140, 80, 'C'],
      ['box', 20, 200, 110, 50, 'Zone 1 stat'], ['box', 20, 260, 110, 50, 'Zone 2 stat'],
      ['box', 260, 150, 150, 70, 'Zone valve 1'], ['term', 260, 170, '1'], ['term', 260, 200, '2'], ['term', 410, 170, '3'], ['term', 410, 200, '4'],
      ['box', 260, 240, 150, 70, 'Zone valve 2'], ['term', 260, 260, '1'], ['term', 260, 290, '2'], ['term', 410, 260, '3'], ['term', 410, 290, '4'],
      ['line', [140, 50, 200, 50, 200, 225, 130, 225], C_R], ['line', [200, 225, 200, 285, 130, 285], C_R],
      ['line', [130, 215, 230, 215, 230, 170, 260, 170], C_W], ['line', [130, 275, 240, 275, 240, 260, 260, 260], C_W],
      ['line', [140, 80, 220, 80, 220, 200, 260, 200], C_C], ['line', [220, 200, 220, 290, 260, 290], C_C],
      ['box', 520, 160, 120, 110, 'Boiler (TT)'], ['term', 520, 195, 'T'], ['term', 520, 235, 'T'],
      ['line', [410, 170, 470, 170, 470, 195, 520, 195], C_Y], ['line', [410, 260, 470, 260, 470, 195], C_Y],
      ['line', [410, 200, 490, 200, 490, 235, 520, 235], C_Y], ['line', [410, 290, 490, 290, 490, 235], C_Y],
      ['text', 330, 30, 'Stat closes → valve motor (1–2) opens valve → end switch (3–4) closes → boiler TT fires.', 11, 'middle'],
      ['text', 330, 50, 'End switches are wired in parallel so any zone can fire the boiler.', 11, 'middle']
    ] }
  ],
  quizzes: {
    'HVAC/R': [
      { q: 'On a heat pump, the O terminal usually…', o: ['Turns on aux heat', 'Energizes the reversing valve in cooling', 'Runs the outdoor fan only', 'Is the common'], a: 1, why: 'Most brands energize the reversing valve in cooling (O). A few use B in heating.' },
      { q: 'During defrost, a heat pump typically…', o: ['Shuts off completely', 'Switches to cooling mode, stops the outdoor fan, and brings on aux heat', 'Runs the outdoor fan faster', 'Opens the relief valve'], a: 1, why: 'Reversing to cooling warms the outdoor coil; aux heat tempers the supply air.' },
      { q: 'On a two-stage furnace, W2 calls for…', o: ['Low fire', 'High fire', 'The fan only', 'Cooling'], a: 1, why: 'W1 = low fire, W2 = high fire.' },
      { q: 'You charge a TXV system mainly by…', o: ['Superheat', 'Subcooling', 'Amp draw', 'Discharge temperature'], a: 1, why: 'TXV systems are charged by subcooling; fixed orifice/piston systems by superheat.' },
      { q: 'High superheat with low subcooling usually points to…', o: ['Overcharge', 'Undercharge', 'Dirty condenser', 'Too much airflow'], a: 1, why: 'A starved system: not enough refrigerant.' },
      { q: 'Low superheat with high subcooling usually points to…', o: ['Overcharge', 'Undercharge', 'Low airflow over the condenser', 'Bad capacitor'], a: 0, why: 'Too much refrigerant backs up in the condenser.' },
      { q: 'A dirty condenser coil usually causes…', o: ['Low head pressure', 'High head pressure', 'Low suction only', 'No change'], a: 1, why: 'Poor heat rejection raises condensing pressure.' },
      { q: 'A clogged filter in cooling can lead to…', o: ['A frozen evaporator coil', 'High suction pressure', 'High subcooling only', 'A tripped relief valve'], a: 0, why: 'Low airflow drops coil temperature below freezing.' },
      { q: 'Zone valve end switches are wired to…', o: ['The thermostat R', 'The boiler TT', 'The circulator line voltage only', 'Nothing'], a: 1, why: 'When the valve opens, the end switch closes the boiler TT circuit.' },
      { q: 'Why are zone valve end switches wired in parallel?', o: ['So all zones must call', 'So any one zone can fire the boiler', 'To lower voltage', 'For the aquastat'], a: 1, why: 'Parallel switches let any open zone call the boiler.' },
      { q: 'E on a heat pump thermostat is for…', o: ['Emergency heat', 'Economizer', 'Energy saver', 'Exhaust fan'], a: 0, why: 'Emergency heat locks out the compressor and runs the backup heat.' },
      { q: 'Condenser split is…', o: ['Suction minus discharge', 'Condensing temperature minus outdoor air temperature', 'Return minus supply air', 'Superheat minus subcooling'], a: 1, why: 'Condensing temperature minus outdoor ambient; higher-efficiency units run a smaller split.' }
    ],
    'EPA 608': [
      { q: 'Type I recovery: with the system compressor NOT working, recover…', o: ['50%', '80%', '90%', '100%'], a: 1, why: 'Using recovery equipment made after Nov 15, 1993: 80% with the compressor not working, 90% if it works (or 4 in. Hg vacuum).' },
      { q: 'Type I recovery with the compressor working: recover…', o: ['70%', '80%', '90%', '99%'], a: 2, why: '90% if the system compressor runs.' },
      { q: 'Under the long-standing ozone-depleting refrigerant rules, leak repair applies to appliances holding…', o: ['5 lb or more', '15 lb or more', '50 lb or more', '500 lb or more'], a: 2, why: '50 lb or more for ozone-depleting refrigerants. The newer HFC rule starts at 15 lb (see Rule changes).' },
      { q: 'Since January 1, 2026, HFC leak repair rules start at…', o: ['5 lb', '15 lb', '50 lb', '1,500 lb'], a: 1, why: 'The 2024 ER&R rule covers HFC appliances with 15 lb or more (residential and light-commercial AC excluded).' },
      { q: 'Leak rate threshold for comfort cooling under the ozone-depleting refrigerant rules?', o: ['10%', '20%', '30%', '35%'], a: 0, why: 'Comfort cooling 10%, commercial refrigeration 20%, industrial process refrigeration 30%.' },
      { q: 'Once a leak over the threshold is found, the repair deadline is generally…', o: ['7 days', '30 days', '90 days', '1 year'], a: 1, why: 'Generally 30 days, with verification tests.' },
      { q: 'Type III recovery for equipment made after Nov 15, 1993 pulls down to…', o: ['0 psig', '10 in. Hg', '25 mm Hg absolute', '500 microns'], a: 2, why: '25 mm Hg absolute for low-pressure appliances.' },
      { q: 'Since 2025, new residential AC systems must use refrigerant with GWP under…', o: ['150', '700', '1,500', '2,088'], a: 1, why: 'The Technology Transitions rule set a 700 GWP limit for new residential and light-commercial AC and heat pumps.' },
      { q: 'Can you still service an existing R-410A system with R-410A?', o: ['No, it is banned', 'Yes', 'Only in New York', 'Only before 2026'], a: 1, why: 'The rules restrict new equipment; servicing existing systems is still legal.' },
      { q: 'When a small appliance goes to the scrap yard, who makes sure the refrigerant was removed?', o: ['The manufacturer', 'The final person in the disposal chain', 'The EPA', 'Nobody'], a: 1, why: 'The final processor must verify the refrigerant was recovered.' }
    ],
    'Tax preparation': [
      { q: 'Self-employment tax applies when net SE earnings are at least…', o: ['$1', '$400', '$600', '$2,000'], a: 1, why: 'Schedule SE is required at $400 or more of net earnings from self-employment.' },
      { q: 'Form 8879 is…', o: ['The e-file signature authorization', 'An extension', 'Due diligence', 'An amended return'], a: 0, why: 'The taxpayer signs Form 8879 to authorize the e-file.' },
      { q: 'To use the standard mileage rate on a car you own, you generally must…', o: ['Choose it in the first year the car is used for business', 'Switch every year', 'Use it only for leased cars', 'Never keep a log'], a: 0, why: 'Choose standard mileage in the first business-use year; you may switch to actual later, not usually back.' },
      { q: 'Head of household generally requires the taxpayer to…', o: ['Be married filing jointly', 'Pay more than half the cost of keeping up a home for a qualifying person', 'Have no dependents', 'Earn under $10,000'], a: 1, why: 'Unmarried (or considered unmarried) and paying over half the cost of the home for a qualifying person.' },
      { q: 'Paid preparers keep a copy or list of returns they prepared for at least…', o: ['1 year', '3 years', '7 years', 'Forever'], a: 1, why: 'At least 3 years under IRC §6107.' },
      { q: 'A client has 1099-NEC income and a home office used regularly and only for work. The home office goes on…', o: ['Form 8829 / simplified method with Schedule C', 'Schedule A', 'Form 2441', 'Nowhere'], a: 0, why: 'Figured on Form 8829 or the simplified method and carried to Schedule C.' }
    ],
    'Phlebotomy & medical': [
      { q: 'A CBC is usually drawn in…', o: ['Light blue', 'Lavender (EDTA)', 'Gray', 'Red'], a: 1, why: 'EDTA preserves cell shape for hematology.' },
      { q: 'Why must a light blue tube be filled completely?', o: ['For color', 'The 9:1 blood-to-citrate ratio', 'To clot faster', 'It doesn\'t matter'], a: 1, why: 'Coagulation results depend on the 9:1 ratio.' },
      { q: 'A gray top is used for…', o: ['Glucose / lactate', 'CBC', 'Coags', 'Blood bank'], a: 0, why: 'Sodium fluoride stops glycolysis.' },
      { q: 'Before spinning an SST, let it clot for about…', o: ['1 minute', '30 minutes', '4 hours', 'It doesn\'t clot'], a: 1, why: 'About 30 minutes, upright.' },
      { q: 'Infant heel sticks go on the…', o: ['Back of the heel', 'Medial or lateral plantar surface', 'Center of the heel', 'Arch'], a: 1, why: 'Use the outer edges of the bottom of the heel to avoid bone.' }
    ]
  },
  refreshers: {
    'HVAC/R': [
      ['Reading a ladder diagram', 'Line voltage on the left rail, 24V control circuit on its own ladder. Read each rung left to right: the switches (contacts) on the left, the load (coil, motor) on the right. A rung only works when every switch in it is closed.'],
      ['Capacitor checks', 'Discharge first. Read µF with the leads off and compare to the label (usually within ±6%). A swollen top or leaking oil means replace.'],
      ['Contactor checks', 'Coil should read resistance (not open). Look for pitted or welded contacts. Measure voltage drop across closed contacts; more than a volt or so means worn contacts.']
    ]
  }
};
/**
 * Connect — unions directory, wisdom feed and email digests.
 * Unions live in the "Unions" tab of Connect Members DB; edit rows there as dates are announced.
 * Digests go out from dailyReminders(): daily, Mondays (weekly) or the 1st (monthly), as each member chose.
 */

var UNION_GUIDE = 'Most union trade apprenticeships are registered with the U.S. Department of Labor. You sign an apprenticeship agreement, work full days for union contractors and go to classes at the training center (often evenings or set days). Pay starts at a percentage of the journeyworker rate and rises at each step as you pass classes and log hours. You pay union dues. Some programs ask you to work in the union industry for a set time after training or repay training costs if you leave for non-union work, so ask before you sign.';

function seedUnions_(ss) {
  var sh = ss.getSheetByName('Unions');
  if (sh.getLastRow() > 1) return;
  var rows = [
    { id: 'UN636', name: 'Pipefitters, Steamfitters, Refrigeration & AC Service — UA Local 636', trade: 'HVAC/R', state: 'MI', area: 'Metro Detroit', website: 'http://www.pipefitters636tc.org', phone: '(248) 585-0636', address: 'Pipefitting Industry Training Center, 636 Executive Dr, Troy, MI (John R & Dequindre, north of 14 Mile)',
      signUp: 'A union construction apprenticeship for pipefitters, steamfitters and refrigeration / air-conditioning service techs: paid work with union contractors plus classes at the Troy training center. Ask the center how many years the program runs and what you agree to when you sign.',
      requirements: 'At least 18. Valid driver\'s license. High school diploma, GED or transcripts. Testing fee (it was $100 in 2024). Must pass a drug test that includes marijuana after selection.',
      howToApply: 'Online only, during the yearly application window. Pay the testing fee when you apply, take the test, then interview. Selected applicants take a drug test. Don\'t send resumes.',
      hours: 'Full workdays with a union contractor plus scheduled classes. Ask the center for the class schedule.', pay: 'Starts at a percentage of the journeyworker rate and rises as you advance. Ask the center for the current wage scale.',
      howItWorks: UNION_GUIDE, deadline: '2026-12-01', deadlineNote: 'Opens once a year in early December (2024: Dec 9–23; 2025: Dec 1–20). The 2026 dates weren\'t posted when we checked on Nov 6, 2026. Dec 1 is an estimate; watch their website.', verified: '2026-11-06',
      source: 'https://jobs.mitalent.org/job-seeker/job-details/JobCode/264804664', active: true, order: 1 },
    { id: 'UN80', name: 'SMART Sheet Metal Workers Local 80', trade: 'HVAC/R', state: 'MI', area: 'Wayne, Oakland, Macomb, Washtenaw, St. Clair and Sanilac counties', website: 'https://www.smw80.com', phone: '(248) 557-0297', address: 'Union office: 17100 W 12 Mile Rd, Southfield, MI. Training center in Warren, MI.',
      signUp: 'A 5-year Building Trades Apprenticeship registered with the U.S. Department of Labor: ductwork and sheet metal for HVAC systems, made in the shop and installed in the field. There\'s also an architectural sheet metal apprenticeship.',
      requirements: 'You must pass the Local 80 entrance exam. Call the training center for the other requirements and documents.',
      howToApply: 'Submit an application; that registers you for the entrance exam. Only those who pass are considered.',
      hours: 'Full workdays in the shop or field plus classes. Ask the training center for the schedule.', pay: 'No up-front cost for schooling or training materials (paid by the Local 80 apprenticeship fund). Ask for the current wage scale.',
      howItWorks: UNION_GUIDE, deadline: '', deadlineNote: 'Call the training center for the next application or exam date.', verified: '2026-11-06',
      source: 'https://hirevets.shrm.org/jobs/6699520921e7bf002fcfb016', active: true, order: 2 },
    { id: 'UN58', name: 'IBEW Local 58 — Detroit Electrical Industry Training Center', trade: 'Electrical', state: 'MI', area: 'Metro Detroit', website: 'https://www.detroiteitc.org', phone: '', address: 'IBEW Local 58, 1358 Abbott St, Detroit, MI',
      signUp: 'A 5-year electrical apprenticeship sponsored by IBEW Local 58 and NECA of Southeast Michigan. Earn while you learn, with no college debt.',
      requirements: 'High school diploma or GED, driver\'s license, physically able to do the work, drug test. Aptitude test and interview.',
      howToApply: 'Create an account on the training center\'s online portal (detroiteitc.org) during the application window, then complete the application, aptitude test and interview.',
      hours: 'Full workdays with an electrical contractor plus classes at the training center.', pay: 'About $22/hr to start, rising to over $50/hr by graduation (WDIV, May 2025).',
      howItWorks: UNION_GUIDE, deadline: '', deadlineNote: 'Check detroiteitc.org for the next window. Past windows required creating a portal account first.', verified: '2026-11-06',
      source: 'https://www.clickondetroit.com/news/local/2025/05/30/electrical-apprenticeship-program-offers-career-path-without-college-debt', active: true, order: 3 },
    { id: 'UN98', name: 'Plumbers Local 98 & MCA Detroit Training Center', trade: 'Plumbing', state: 'MI', area: 'Metro Detroit', website: '', phone: '', address: '',
      signUp: 'A tuition-free 5-year plumbing apprenticeship (classroom plus fieldwork) that prepares you for the Michigan journey plumbing license.',
      requirements: 'At least 18, high school diploma or GED, valid driver\'s license, drug-free at application and interview.',
      howToApply: 'Contact the training center for the application window and steps.', hours: 'Full workdays plus classes.', pay: 'Ask for the current wage scale.',
      howItWorks: UNION_GUIDE, deadline: '', deadlineNote: 'Ask the training center for the next window.', verified: '2026-11-06',
      source: 'https://www.best-trade-schools.net/schools/plumbing-industry-training-center/', active: true, order: 4 },
    { id: 'UNUS', name: 'Other states: find a union apprenticeship', trade: 'All', state: 'All', area: 'United States', website: 'https://www.apprenticeship.gov', phone: '', address: '',
      signUp: 'Every state has union training centers run by local unions: UA (plumbers, pipefitters, HVAC service — ua.org), IBEW (electricians — ibew.org), SMART (sheet metal — smart-union.org) and more.',
      requirements: 'Usually: at least 18, high school diploma or GED, driver\'s license, aptitude test, interview and drug test. Some locals require you to live in their area.',
      howToApply: 'Find the local for your city on the union\'s site or on apprenticeship.gov, then check its training center for the application window. Many open only once a year.',
      hours: 'Full workdays plus classes, typically about 2,000 work hours a year.', pay: 'A percentage of the local journeyworker rate, rising each step.', howItWorks: UNION_GUIDE,
      deadline: '', deadlineNote: 'Varies by local.', verified: '2026-11-06', source: 'https://www.apprenticeship.gov', active: true, order: 9 }
  ];
  var head = TABS.Unions;
  sh.getRange(2, 1, rows.length, head.length).setValues(rows.map(function (o) { return head.map(function (h) { return o[h] === undefined ? '' : o[h]; }); }));
}

function listUnions_() {
  return activeRows_('Unions').map(function (u) {
    ['deadline', 'verified'].forEach(function (k) { if (u[k] instanceof Date) u[k] = Utilities.formatDate(u[k], 'America/Detroit', 'yyyy-MM-dd'); else u[k] = String(u[k] || ''); });
    return u;
  });
}

/* ---------------- wisdom (original, secular) */
var WISDOM = [
  { c: 'Money', t: 'Pay yourself first', b: 'Move savings out the day you get paid, before bills and before fun. What you never see, you don\'t miss.' },
  { c: 'Money', t: 'Know your number', b: 'Add up what it costs you to live for one month. Until you know that number, every money decision is a guess.' },
  { c: 'Money', t: 'One month, then three', b: 'Build one month of expenses in savings first. Then three. An emergency fund turns a crisis into an inconvenience.' },
  { c: 'Money', t: 'Interest works both ways', b: 'Interest you earn quietly builds wealth. Interest you pay quietly takes it. Pay off the highest-rate debt first.' },
  { c: 'Money', t: 'Raises are a test', b: 'When your pay goes up, raise your savings before your spending. Lifestyle grows on its own; savings never do.' },
  { c: 'Money', t: 'Price it in hours', b: 'Before a big purchase, divide the price by what you take home per hour. Ask if it\'s worth that many hours of your life.' },
  { c: 'Money', t: 'Keep records as you go', b: 'Receipts, mileage and invoices are money. Ten seconds to log them today saves hours and dollars at tax time.' },
  { c: 'Money', t: 'Set money aside for taxes', b: 'If you get paid on a 1099, put a slice of every payment in a separate account for taxes. April shouldn\'t be a surprise.' },
  { c: 'Money', t: 'Credit is a reputation', b: 'Pay on time, keep balances low, don\'t open what you don\'t need. Lenders read your history the way employers read a reference.' },
  { c: 'Business', t: 'Cash flow beats profit on paper', b: 'A business with sales but no cash can still close. Know when money comes in and when it goes out.' },
  { c: 'Business', t: 'Charge for the value', b: 'Price by the problem you solve, not just the hours you spend. Cheap work attracts customers who only care about cheap.' },
  { c: 'Business', t: 'Write it down', b: 'Scope, price, dates, who does what: in writing, signed, before you start. Most disputes are just unclear agreements.' },
  { c: 'Business', t: 'Your reputation is the asset', b: 'Show up when you said, call when you\'re late, clean up after yourself. That is how referrals are earned.' },
  { c: 'Business', t: 'Follow up', b: 'Most sales happen after the second or third contact. A short, polite follow-up is not pushy; it\'s professional.' },
  { c: 'Business', t: 'Separate the accounts', b: 'Business money and personal money in different accounts. It protects you, simplifies taxes and shows you the truth about the business.' },
  { c: 'Business', t: 'Know your cost per job', b: 'Labor, materials, drive time, fuel, insurance, tools. If you don\'t know what a job costs you, you don\'t know if it made money.' },
  { c: 'Business', t: 'Systems set you free', b: 'Anything you do three times deserves a checklist. A business that runs on your memory can\'t run without you.' },
  { c: 'Business', t: 'Small customers become big ones', b: 'Treat the small job like the big one. The homeowner today manages a building tomorrow.' },
  { c: 'Business', t: 'Say no on purpose', b: 'Every yes uses time you can\'t get back. Turn down work that doesn\'t fit so you have room for work that does.' },
  { c: 'Career', t: 'Be the one they can count on', b: 'Skills get you hired. Being on time, prepared and easy to work with gets you kept, trusted and promoted.' },
  { c: 'Career', t: 'Learn the why', b: 'Anyone can follow steps. People who understand why the steps work can fix what nobody has seen before.' },
  { c: 'Career', t: 'Keep your papers current', b: 'Licenses, certifications and a fresh resume. Opportunity rarely waits for you to get your documents together.' },
  { c: 'Career', t: 'Ask better questions', b: 'Ask the experienced person what they\'d check first and why. One good question can save a week of trial and error.' },
  { c: 'Career', t: 'Write down what you did', b: 'Keep a running list of jobs, problems you solved and numbers you moved. It\'s your resume, your raise request and your interview prep.' },
  { c: 'Career', t: 'Your network is your net', b: 'Classmates, instructors and coworkers are tomorrow\'s job leads. Stay in touch before you need something.' },
  { c: 'Career', t: 'Safety is a skill', b: 'Lockout, PPE, a second look before you cut or connect. The best technicians go home the same way they came in.' },
  { c: 'Career', t: 'Get paid to learn', b: 'Apprenticeships, employer training and certifications let you grow without debt. Ask what training comes with every job.' },
  { c: 'Mindset', t: 'Progress over perfect', b: 'A finished job you can improve beats a perfect plan you never start. Start, then get better.' },
  { c: 'Mindset', t: 'Mistakes are tuition', b: 'You will get things wrong. Own it, fix it, write down what you learned. That is how experience is built.' },
  { c: 'Mindset', t: 'Control the controllable', b: 'You can\'t control the market or the weather. You can control your effort, your attitude and how prepared you are.' },
  { c: 'Mindset', t: 'Compare to yesterday', b: 'Someone will always be ahead. Measure yourself against who you were last month, not who someone else is today.' },
  { c: 'Mindset', t: 'Discomfort means growth', b: 'The new tool, the hard exam, the first big client: uncomfortable because you\'re stretching. Stay with it.' },
  { c: 'Mindset', t: 'Decide, then adjust', b: 'Waiting for perfect information is its own decision. Make the best call you can, then correct as you learn.' },
  { c: 'Habits', t: 'Plan tomorrow tonight', b: 'Five minutes before bed: the three things that matter tomorrow. You\'ll start the day already moving.' },
  { c: 'Habits', t: 'Do the hard thing first', b: 'Your energy is highest early. Spend it on the task you\'re most likely to avoid.' },
  { c: 'Habits', t: 'Small and daily wins', b: 'Fifteen minutes of study a day is over 90 hours a year. Consistency beats cramming.' },
  { c: 'Habits', t: 'Protect your sleep', b: 'Rest is part of the work. Tired people make expensive mistakes, on the job and with money.' },
  { c: 'Habits', t: 'Review the week', b: 'Once a week, look at what got done, what didn\'t and why. Then set the week ahead on purpose.' },
  { c: 'Habits', t: 'Keep your tools and space ready', b: 'A clean truck, a stocked bag, charged batteries. Readiness saves time and shows respect for the customer.' },
  { c: 'People', t: 'Listen first', b: 'Let the customer finish. They often tell you the problem, and they always tell you what they care about.' },
  { c: 'People', t: 'Explain it simply', b: 'If you can explain the repair in plain words, the customer trusts you more and says yes more often.' },
  { c: 'People', t: 'Give credit, take responsibility', b: 'Share the win with the team. Own the miss yourself. People follow leaders who do both.' },
  { c: 'People', t: 'Keep your word small and sure', b: 'Promise what you can deliver, then deliver a little more. Under-promise is not weakness; it\'s reliability.' },
  { c: 'People', t: 'Choose your circle', b: 'You become like the people you spend the most time with. Spend time with people who are building something.' }
];

function wisdomFor_(date) {
  var start = new Date(date.getFullYear(), 0, 0);
  var day = Math.floor((date - start) / 86400000);
  return WISDOM[day % WISDOM.length];
}

/* ---------------- digests */
function runDigests_() {
  var now = new Date();
  var dow = now.getDay(), dom = now.getDate();
  var members = rows_('Members');
  var jobs = rows_('Jobs').filter(function (j) { return j.status === 'approved'; });
  var ups = rows_('Updates');
  var unions = listUnions_();
  var items = rows_('Items');
  var w = wisdomFor_(now);
  members.forEach(function (m) {
    var freq = m.digest || 'weekly';
    if (freq === 'off' || !isEmail_(m.email)) return;
    var last = m.lastDigest ? new Date(m.lastDigest) : null;
    var due = freq === 'daily' ? true : freq === 'weekly' ? dow === 1 : dom === 1;
    if (!due) return;
    if (last && (now - last) < 20 * 3600000) return;
    if (MailApp.getRemainingDailyQuota() < 3) return;
    var since = last || new Date(now.getTime() - (freq === 'monthly' ? 31 : freq === 'weekly' ? 7 : 1) * 86400000);
    var fieldOk = function (f) { return !m.specialty || f === 'All' || f === 'Other' || f === m.specialty || (f === 'EPA 608' && m.specialty === 'HVAC/R'); };
    var newJobs = jobs.filter(function (j) { return new Date(j.created) > since && fieldOk(j.category); });
    var newUps = ups.filter(function (u) { return new Date(u.created) > since && fieldOk(u.field); });
    var horizon = freq === 'monthly' ? 45 : freq === 'weekly' ? 21 : 10;
    var soonUnions = unions.filter(function (u) {
      if (!u.deadline) return false;
      var d = Math.round((new Date(u.deadline + 'T00:00:00') - now) / 86400000);
      return d >= -14 && d <= horizon && (u.trade === 'All' || !m.specialty || u.trade === m.specialty || m.specialty === 'Other');
    });
    var certs = items.filter(function (i) { return i.email === m.email && i.kind === 'cert'; }).map(function (i) { try { return JSON.parse(i.json); } catch (e) { return {}; } })
      .filter(function (c) { if (!c.expires) return false; var d = Math.round((new Date(c.expires + 'T00:00:00') - now) / 86400000); return d >= 0 && d <= 60; });
    var sec = function (title, list) { return list ? '<p style="margin:18px 0 6px"><b>' + title + '</b></p><ul style="margin:0;padding-left:20px">' + list + '</ul>' : ''; };
    var html =
      '<div style="border-left:4px solid ' + GOLD + ';background:' + CREAM + ';padding:12px 14px;margin:0 0 6px"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#7A5F22">' + esc_(w.c) + ' wisdom</div><div style="font-family:Georgia,serif;font-size:19px;margin:4px 0">' + esc_(w.t) + '</div><div>' + esc_(w.b) + '</div></div>' +
      sec('New jobs for you', newJobs.slice(0, 8).map(function (j) { return '<li>' + esc_(j.title) + (j.company ? ' — ' + esc_(j.company) : '') + (j.pay ? ' · ' + esc_(j.pay) : '') + '</li>'; }).join('')) +
      sec('Rule changes', newUps.map(function (u) { return '<li>' + esc_(u.title) + '</li>'; }).join('')) +
      sec('Union apprenticeship dates coming up', soonUnions.map(function (u) { return '<li>' + esc_(u.name) + ': ' + esc_(u.deadlineNote || u.deadline) + '</li>'; }).join('')) +
      sec('Licenses coming due', certs.map(function (c) { return '<li>' + esc_(c.name) + ' — expires ' + esc_(c.expires) + '</li>'; }).join('')) +
      button_(APP_URL, 'Open Connect');
    MailApp.sendEmail({ to: m.email, subject: 'Your Connect ' + (freq === 'daily' ? 'daily' : freq === 'weekly' ? 'weekly' : 'monthly') + ' update: ' + w.t,
      htmlBody: emailShell_(w.t + ' · your Connect update', 'Your ' + freq + ' update', html, 'You chose ' + freq + ' updates. Change how often (or turn them off) under Profile in Connect.'),
      name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
    m.lastDigest = now; write_('Members', m);
  });
}
/**
 * Connect — "Ask me anything", community resources, quotes with payment options and proof of need.
 * AI answers need ONE key in Script Properties: ANTHROPIC_API_KEY (Claude) or GEMINI_API_KEY (Google).
 * Optional: AI_MODEL to change the model. Without a key, questions go to the team and matching
 * services/resources are suggested from Connect's own data.
 */

var ASK_PER_DAY = 25;
var LANGS = { en: 'English', es: 'Spanish', ar: 'Arabic', ur: 'Urdu', pa: 'Punjabi', hi: 'Hindi', bn: 'Bengali', zh: 'Chinese (Simplified)', tl: 'Tagalog', vi: 'Vietnamese', fr: 'French', ko: 'Korean', ru: 'Russian', ht: 'Haitian Creole', pt: 'Portuguese', so: 'Somali' };

function seedResources_(ss) {
  var sh = ss.getSheetByName('Resources');
  if (sh.getLastRow() > 1) return;
  var rows = [
    { id: 'R1', name: 'Covenant Community Care — Michigan Ave', type: 'Health & dental', address: '5716 Michigan Ave, Detroit, MI 48210', phone: 'Medical (313) 554-1095 · Dental (313) 554-3880', website: 'https://www.covenantcommunitycare.org', note: 'Medical, dental, women\'s health and counseling for everyone, regardless of ability to pay (federally qualified health center). Takes Medicaid, Medicare and many plans.', verified: '2026-11-06', active: true, order: 1 },
    { id: 'R2', name: 'Covenant Community Care — Moross Rd', type: 'Health & dental', address: '20901 Moross Rd, Detroit, MI 48236', phone: 'Medical (313) 626-2600 · Dental (313) 626-2620', website: 'https://www.covenantcommunitycare.org', note: 'Medical, dental and counseling.', verified: '2026-11-06', active: true, order: 2 },
    { id: 'R3', name: 'Covenant Community Care — Joy Rd', type: 'Health & dental', address: '18917 Joy Rd, Detroit, MI 48228', phone: '(313) 446-8800', website: 'https://www.covenantcommunitycare.org', note: 'Primary care location.', verified: '2026-11-06', active: true, order: 3 },
    { id: 'R4', name: 'Covenant Community Care — other numbers', type: 'Health & dental', address: '', phone: 'Main office (313) 554-0485 · Mobile dental (313) 575-7502 · Substance use treatment (313) 625-1336', website: 'https://www.covenantcommunitycare.org', note: 'Call the main office to find the location closest to you, including Oakland County.', verified: '2026-11-06', active: true, order: 4 },
    { id: 'R5', name: 'FernCare Free Clinic', type: 'Health (free)', address: '751 E 9 Mile Rd, Suite 2, Ferndale, MI 48220', phone: '', website: '', note: 'Free medical care for adults 19–64 with no health insurance and no regular doctor.', verified: '2026-11-06', active: true, order: 5 },
    { id: 'R6', name: 'Michigan 2-1-1', type: 'Help finding services', address: '', phone: 'Dial 211', website: 'https://www.mi211.org', note: 'Free help finding food, rent, utility, health and other local assistance, 24/7, in many languages.', verified: '2026-11-06', active: true, order: 6 },
    { id: 'R7', name: '988 Suicide & Crisis Lifeline', type: 'Crisis', address: '', phone: 'Call or text 988', website: 'https://988lifeline.org', note: 'Free, confidential support 24/7.', verified: '2026-11-06', active: true, order: 7 },
    { id: 'R8', name: 'Health Insurance Marketplace', type: 'Insurance', address: '', phone: '(800) 318-2596', website: 'https://www.healthcare.gov', note: 'Shop for health coverage and see if you qualify for lower costs.', verified: '2026-11-06', active: true, order: 8 }
  ];
  var head = TABS.Resources;
  sh.getRange(2, 1, rows.length, head.length).setValues(rows.map(function (o) { return head.map(function (h) { return o[h] === undefined ? '' : o[h]; }); }));
}

function listResources_() { return activeRows_('Resources').map(function (r) { if (r.verified instanceof Date) r.verified = Utilities.formatDate(r.verified, 'America/Detroit', 'yyyy-MM-dd'); return r; }); }

/* ---------------- ask */

function askContext_() {
  var products = activeRows_('Products').map(function (p) { return p.id + ' | ' + p.name + ' (' + p.business + ') | ' + p.price + ' | ' + p.description; }).join('\n');
  var plans = activeRows_('Plans').map(function (p) { return p.id + ' | ' + p.name + ' | $' + p.price + (p.recurring ? '/month' : ''); }).join('\n');
  var res = listResources_().map(function (r) { return r.id + ' | ' + r.name + ' | ' + r.address + ' | ' + r.phone + ' | ' + r.note; }).join('\n');
  var uni = listUnions_().map(function (u) { return u.id + ' | ' + u.name + ' | ' + u.trade + ' | ' + u.deadlineNote; }).join('\n');
  return 'You are the helper inside "Connect", an app run by CMCC Training Institute with Crisp Cares Environmental Services (home care, HVAC "Crisp Cares Heating & Cooling", cleaning, medical support staffing) and Crisp Clean (tax preparation, tax planning, business setup, bookkeeping) in Southfield and West Bloomfield, Michigan. ' +
    'Members are trade students, instructors and workers, many new to the U.S. Answer any everyday question clearly and kindly in plain words (short sentences, under 180 words). ' +
    'Give general information only: you are not a lawyer, doctor or tax professional, so for decisions say they should confirm with a professional — and when one of our services fits, suggest it. Never ask for Social Security numbers, account numbers or medical details. For emergencies say to call 911; for crisis, 988. ' +
    'When a service of ours fits the question, include its id in "suggest". When a community resource fits, include its id in "resources". When a union fits, include its id in "unions". Only use ids from the lists. Do not invent prices; use the listed ones.\n\n' +
    'OUR SERVICES (id | name | price | what it is):\n' + products + '\nCONNECT PRO PLANS:\n' + plans + '\nCOMMUNITY RESOURCES:\n' + res + '\nUNIONS:\n' + uni + '\n\n' +
    'Reply ONLY with JSON: {"answer": "...", "suggest": ["S1"], "resources": ["R1"], "unions": ["UN636"]}';
}

function callAI_(system, messages) {
  var props = PropertiesService.getScriptProperties();
  var ak = props.getProperty('ANTHROPIC_API_KEY'), gk = props.getProperty('GEMINI_API_KEY');
  var model = props.getProperty('AI_MODEL');
  var text;
  if (ak) {
    var r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': ak, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ model: model || 'claude-haiku-5-5', max_tokens: 900, system: system, messages: messages }) });
    if (r.getResponseCode() !== 200) throw new Error('AI ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
    text = JSON.parse(r.getContentText()).content.map(function (c) { return c.text || ''; }).join('');
  } else if (gk) {
    var r2 = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (model || 'gemini-2.5-flash') + ':generateContent?key=' + encodeURIComponent(gk), { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: messages.map(function (m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }; }), generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900 } }) });
    if (r2.getResponseCode() !== 200) throw new Error('AI ' + r2.getResponseCode() + ': ' + r2.getContentText().slice(0, 200));
    text = JSON.parse(r2.getContentText()).candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
  } else return null;
  var m = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : text); } catch (e) { return { answer: text, suggest: [] }; }
}

function keywordMatch_(q) {
  var SYN = { dentist: 'dental', teeth: 'dental', doctor: 'medical health', clinic: 'health', sick: 'medical health', insurance: 'insurance', taxes: 'tax', refund: 'tax', irs: 'tax', llc: 'business', ein: 'business', books: 'bookkeeping', union: 'union apprenticeship', apprentice: 'apprenticeship', job: 'apprenticeship', resume: 'resume', food: 'help', rent: 'help', bills: 'help', crisis: 'crisis' };
  var words = [];
  String(q).toLowerCase().split(/[^a-z0-9]+/).forEach(function (w) {
    if (SYN[w]) words = words.concat(SYN[w].split(' '));
    else if (SYN[w.replace(/s$/, '')]) words = words.concat(SYN[w.replace(/s$/, '')].split(' '));
    if (w.length > 3) words.push(w.length > 6 ? w.slice(0, 5) : w);
  });
  var score = function (s) { s = String(s).toLowerCase(); return words.filter(function (w) { return s.indexOf(w) > -1; }).length; };
  var pick = function (list, f) { return list.map(function (x) { return [x.id, score(f(x))]; }).filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (x) { return x[0]; }); };
  return {
    suggest: pick(activeRows_('Products'), function (p) { return p.name + ' ' + p.description; }),
    resources: pick(listResources_(), function (r) { return r.name + ' ' + r.type + ' ' + r.note; }),
    unions: pick(listUnions_(), function (u) { return u.name + ' ' + u.trade + ' union apprenticeship'; })
  };
}

function ask_(m, r) {
  var q = clean_(r.question, 1500);
  if (!q) fail_('Type a question.');
  var lang = LANGS[r.lang] ? r.lang : 'en';
  var cache = CacheService.getScriptCache(), key = 'ask:' + hash_(m.email).slice(0, 20) + ':' + Utilities.formatDate(new Date(), 'America/Detroit', 'yyyyMMdd');
  var n = Number(cache.get(key) || 0);
  if (n >= ASK_PER_DAY && m.role !== 'admin') fail_('You have reached today\'s limit of ' + ASK_PER_DAY + ' questions. Try again tomorrow.');
  cache.put(key, String(n + 1), 86400);
  var hist = (Array.isArray(r.history) ? r.history : []).slice(-6).map(function (x) { return { role: x.role === 'assistant' ? 'assistant' : 'user', content: clean_(x.content, 1500) }; }).filter(function (x) { return x.content; });
  var out = null, mode = 'ai';
  try {
    out = callAI_(askContext_() + '\nWrite the "answer" in ' + LANGS[lang] + '.', hist.concat([{ role: 'user', content: q }]));
  } catch (e) { logEvent_(m.email, 'askError', e.message); out = null; }
  if (!out) {
    mode = 'team';
    out = keywordMatch_(q);
    out.answer = '';
  }
  var valid = function (ids, list) { var ok = list.map(function (x) { return x.id; }); return (Array.isArray(ids) ? ids : []).filter(function (id) { return ok.indexOf(id) > -1; }).slice(0, 3); };
  var res = { answer: clean_(out.answer, 3000), suggest: valid(out.suggest, activeRows_('Products')), resources: valid(out.resources, listResources_()), unions: valid(out.unions, listUnions_()), mode: mode };
  withLock_(function () { append_('Questions', { id: 'Q' + Date.now().toString(36).toUpperCase(), email: m.email, lang: lang, question: q, answer: res.answer, mode: mode, created: new Date(), status: mode === 'team' ? 'needs answer' : 'answered' }); });
  if (mode === 'team') notifyAdmins_('Question from ' + (m.name || m.email), '<p><b>' + esc_(m.name || m.email) + '</b> (' + esc_(m.email) + ', language: ' + esc_(LANGS[lang]) + ') asked:</p><blockquote>' + esc_(q) + '</blockquote><p>AI answers are off (no API key in Script Properties), so please reply by email.</p><p><a href="' + db_().getUrl() + '">Open the Questions sheet</a></p>');
  return res;
}

/* ---------------- proof of need for an order */

function uploadOrderDoc_(m, r) {
  var mime = String(r.mime || '');
  if (!/^image\/(jpeg|png|webp)$/.test(mime) && mime !== 'application/pdf') fail_('Upload a photo or a PDF.');
  var bytes; try { bytes = Utilities.base64Decode(String(r.data || '')); } catch (e) { fail_('That file could not be read.'); }
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) fail_('Files must be under 8 MB.');
  return withLock_(function () {
    var o = rows_('Orders').filter(function (x) { return x.id === r.orderId; })[0];
    if (!o || o.email !== m.email) fail_('Order not found.');
    var docs = []; try { docs = o.docs ? JSON.parse(o.docs) : []; } catch (e) {}
    if (docs.length >= 5) fail_('You can attach up to 5 documents.');
    var f = memberFolder_(m.email).createFile(Utilities.newBlob(bytes, mime, o.id + '-proof-' + (docs.length + 1) + (mime === 'application/pdf' ? '.pdf' : '.jpg')));
    docs.push({ id: f.getId(), mime: mime, name: clean_(r.name, 120), added: new Date().toISOString() });
    o.docs = JSON.stringify(docs); write_('Orders', o);
    return { order: orderOut_(o) };
  });
}

function orderDocOwned_(m, fileId) {
  return rows_('Orders').some(function (o) {
    if (m.role !== 'admin' && o.email !== m.email) return false;
    var d = []; try { d = o.docs ? JSON.parse(o.docs) : []; } catch (e) {}
    return d.some(function (x) { return x.id === fileId; });
  });
}
/* ------------------------------------------------------------------ v1.2: offline sync, extra fields, curated jobs */

var JOB_SOURCE = 'Found by Lamira Clean (Southfield)';

function memberFields_(m) {
  return String(m.fields || '').split(',').map(function (f) { return f.trim(); }).filter(function (f) { return SPECIALTIES.indexOf(f) > -1; });
}

// Replays changes a member made while offline. Ops run in order; one bad op doesn't stop the rest.
function sync_(m, ops) {
  if (!Array.isArray(ops)) fail_('Nothing to sync.');
  if (ops.length > 300) fail_('Too many changes at once. Sync again to send the rest.');
  var ids = {}, results = [];
  ops.forEach(function (op) {
    var res = { opId: op.opId, ok: true };
    try {
      if (op.op === 'save') {
        var item = JSON.parse(JSON.stringify(op.item || {}));
        var tmp = '';
        if (item.id && /^tmp-/.test(item.id)) { tmp = item.id; item.id = ids[tmp] || ''; }
        var out = saveItem_(m, op.kind, item).item;
        if (tmp) ids[tmp] = out.id;
        res.item = out; res.tmp = tmp;
      } else if (op.op === 'delete') {
        var id = /^tmp-/.test(op.id || '') ? ids[op.id] : op.id;
        if (id) { try { deleteItem_(m, id); } catch (e) { if (!/not found/i.test(e.message)) throw e; } }
      } else if (op.op === 'upload') {
        var rr = JSON.parse(JSON.stringify(op.upload || {}));
        var iid = rr.itemId || rr.certId;
        if (/^tmp-/.test(iid || '')) iid = ids[iid];
        if (!iid) fail_('The entry for this file was not saved.');
        rr.itemId = iid; delete rr.certId;
        res.item = uploadFile_(m, rr).item;
      } else if (op.op === 'profile') {
        res.me = saveProfile_(m, op.profile || {}).me;
      } else fail_('Unknown change.');
    } catch (e) { res.ok = false; res.error = e.message; }
    results.push(res);
  });
  logEvent_(m.email, 'sync', ops.length + ' changes');
  return { results: results, ids: ids, items: myItems_(m.email), me: publicMe_(rows_('Members').filter(function (x) { return x.email === m.email; })[0]) };
}

function syncHeads_(names) {
  var ss = db_();
  names.forEach(function (name) {
    var sh = ss.getSheetByName(name), head = TABS[name];
    var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
    if (cur.join('|') !== head.join('|')) sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground(NAVY).setFontColor(CREAM);
  });
}

// HVAC / mechanical openings from the Lamira Clean job list. Posted quietly (no alert blast); adds only ones not already on the board.
var CURATED_JOBS = [
  { key: 'continuum-pm', title: 'HVAC Preventative Maintenance Technician (Entry-Level)', company: 'Continuum Services', pay: '$45,481–$58,769/yr', type: 'Full-time, W-2', location: 'Detroit, MI (dispatched from home)', url: 'https://to.indeed.com/aaxl2mdtfqj2',
    description: 'Entry-level preventive maintenance on commercial HVAC. Trade-school students welcome.', requirements: 'Entry level. Trade-school students welcome.', benefits: 'Company van, gas card and iPad. Paid training, 401(k), health insurance. W-2 hours can count toward Michigan mechanical license experience.' },
  { key: 'mhc-apprentice', title: 'HVAC Install Technician – Apprentice Track', company: 'Mechanical Heating and Cooling', pay: '$24–$45/hr', type: 'Full-time, W-2', location: 'Dearborn Heights, MI', url: 'https://to.indeed.com/aa6cqygvzskv',
    description: 'Apprentice track built for trade-school students. Supervised install work.', requirements: 'Hand and power tools. Willing to learn installs under a lead.', benefits: 'Lead installers earn up to $45/hr. Supervised hours toward licensing.' },
  { key: 'corewell-plant', title: 'Plant and Facilities Tech', company: 'Corewell Health (Grosse Pointe Hospital)', pay: '$55,762–$79,281/yr', type: 'Full-time, W-2', location: 'Grosse Pointe, MI', url: 'https://to.indeed.com/aat9hf4xdmgw',
    description: 'Hospital plant and facilities work: HVAC, boilers, building systems.', requirements: 'Hospitals often prefer a Michigan high-pressure boiler license and refrigeration license. Check the posting.', benefits: 'Hospital benefits package.' },
  { key: 'onehour-southfield', title: 'HVAC Technician', company: 'One Hour Heating & Air Conditioning (franchise)', pay: '$40K–$75K', type: 'Full-time or part-time, W-2', location: 'Southfield, MI', url: 'https://to.indeed.com/aabws68yslqv',
    description: 'Residential service technician. Flexible full-time or part-time.', requirements: 'Posting asks for 2 years of experience. Strong trade-school candidates can still apply.', benefits: 'Flexible schedule.' },
  { key: 'rsc-commercial', title: 'Commercial HVAC/R Service Technician', company: 'RSC Mechanical, Inc.', pay: '$30–$45/hr, paid weekly', type: 'Full-time, W-2', location: 'Detroit metro (dispatched from home)', url: 'https://to.indeed.com/aan9pfmrl8m4',
    description: 'Family-owned commercial HVAC/R contractor since 1988.', requirements: 'EPA 608 Universal required before you start. On-call rotation.', benefits: 'Weekly pay.' },
  { key: 'hutchinson-commercial', title: 'Commercial HVAC Service Technician ($5K sign-on)', company: 'Horizon Services / Hutchinson Services', pay: '$28–$40/hr', type: 'Full-time, W-2', location: 'Largo, FL (Tampa Bay)', url: 'https://to.indeed.com/aaj2tftp62kr',
    description: 'Commercial service in the Tampa Bay market. Listed on Indeed as Hutchinson Services.', requirements: 'Commercial service experience preferred.', benefits: '$5,000 sign-on bonus.' },
  { key: 'horizon-install', title: 'HVAC Install Technician ($3K sign-on)', company: 'Horizon Services, Inc.', pay: '$18–$20/hr', type: 'Full-time, W-2', location: 'Largo, FL (Tampa Bay)', url: 'https://to.indeed.com/aaf9x7qrf2nx',
    description: 'Install technician, same employer as the $5K commercial role.', requirements: 'Entry level install work.', benefits: '$3,000 sign-on bonus.' },
  { key: '3h-lead', title: 'Lead HVAC/R Technician (sign-on bonus)', company: '3H Contracting', pay: '$30–$40/hr', type: 'Full-time, W-2', location: 'Tampa, FL', url: 'https://to.indeed.com/aamb2jxqdbj2',
    description: 'Lead technician role.', requirements: 'Screens for 2+ years of experience and EPA 608 certification.', benefits: 'Sign-on bonus.' },
  { key: 'cooltoday-tampa', title: 'HVAC Service Technician – Tampa', company: 'Cool Today', pay: '$50K–$150K/yr', type: 'Full-time, W-2', location: 'Tampa, FL', url: 'https://to.indeed.com/aadqwqgfjlpn',
    description: 'Large Florida shop known for its training culture.', requirements: 'Check the posting for experience level.', benefits: 'Training program.' },
  { key: 'baker-instructor', title: 'HVAC/R Instructor – Vocational', company: 'Baker College', pay: '$48K–$72K', type: 'Full-time, W-2', location: 'Metro Detroit, MI', url: 'https://www.baker.edu/about/employment/',
    description: 'Employer to watch: teaching HVAC/R. Check their careers page for current openings.', requirements: 'Usually field experience plus credentials.', benefits: 'College benefits.' },
  { key: 'lennox-refrig', title: 'Refrigeration Diagnostics Specialist', company: 'Lennox International', pay: '$60K–$85K', type: 'Full-time, W-2', location: 'Remote / field', url: 'https://www.indeed.com/q-lennox-refrigeration-technician-jobs.html',
    description: 'Employer to watch: refrigeration technician roles. The link opens current Lennox listings.', requirements: 'EPA 608 and refrigeration diagnostics.', benefits: '' },
  { key: 'southfield-inspector', title: 'Mechanical Inspector / Plan Reviewer', company: 'City of Southfield', pay: '$55K–$75K', type: 'Full-time, W-2', location: 'Southfield, MI', url: 'https://www.cityofsouthfield.com/jobs',
    description: 'Employer to watch: city mechanical inspection. Check the city jobs page for openings.', requirements: 'Usually a Michigan mechanical contractor license and field experience.', benefits: 'Government benefits.' },
  { key: 'henryford-hvacops', title: 'HVAC Operations Manager', company: 'Henry Ford Health', pay: '$75K–$110K', type: 'Full-time, W-2', location: 'Detroit metro', url: 'https://careers.henryford.com',
    description: 'Employer to watch: hospital HVAC operations. Search "HVAC" on their careers site.', requirements: 'Facilities or HVAC operations experience.', benefits: 'Hospital benefits.' },
  { key: 'dps-boiler', title: 'Building Systems Technician – Boiler', company: 'Detroit Public Schools Community District', pay: '$52K–$68K', type: 'Full-time, W-2', location: 'Detroit, MI', url: 'https://detroitk12.org/careers',
    description: 'Employer to watch: school boiler and building systems. Check the district careers page.', requirements: 'Boiler coursework; a Michigan boiler license may be required.', benefits: 'Government benefits.' }
];

var ITIN_NOTE = 'W-2 job: you will fill out Form I-9 and show work authorization (for example a Social Security card or work permit). An ITIN by itself is a tax number, not work permission, so it is not accepted for I-9.';

function importJobs_(me) {
  if (me.role !== 'admin') fail_('Admins only.');
  syncHeads_(['Jobs', 'Members']);
  var added = withLock_(function () {
    var have = {}, byKey = {};
    CURATED_JOBS.forEach(function (c) { byKey[c.key] = c; });
    rows_('Jobs').forEach(function (j) {
      if (!j.key) return;
      have[j.key] = 1;
      var c = byKey[j.key]; if (!c) return;   // refresh the wording of curated posts; status is left alone
      var changed = ['title', 'company', 'pay', 'type', 'location', 'url', 'description', 'requirements', 'benefits'].some(function (k) { return String(j[k]) !== String(c[k]); }) || j.itin !== ITIN_NOTE;
      if (changed) { ['title', 'company', 'pay', 'type', 'location', 'url', 'description', 'requirements', 'benefits'].forEach(function (k) { j[k] = c[k]; }); j.itin = ITIN_NOTE; j.checked = new Date(); write_('Jobs', j); }
    });
    var n = 0, now = new Date();
    CURATED_JOBS.forEach(function (c, i) {
      if (have[c.key]) return;
      append_('Jobs', {
        id: 'J' + now.getTime().toString(36).toUpperCase() + i, key: c.key, title: c.title, company: c.company, category: 'HVAC/R',
        pay: c.pay, type: c.type, location: c.location, url: c.url, contact: '', description: c.description,
        requirements: c.requirements, benefits: c.benefits, itin: ITIN_NOTE, source: JOB_SOURCE, checked: now,
        postedBy: me.email, status: 'approved', created: new Date(now.getTime() - i * 1000), reviewedBy: me.email
      });
      n++;
    });
    return n;
  });
  logEvent_(me.email, 'importJobs', added + ' added');
  return { added: added, jobs: listJobs_(me) };
}
