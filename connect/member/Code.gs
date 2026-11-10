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

var APP_VERSION = 'connect-members v1.4 — 2026-11-10';
var ADMINS = ['crispcleaninc@gmail.com']; // ccyars26 is a regular member account by choice
var APP_URL = 'https://crispus-mundo.github.io/crisp-cares/connect/member/';
var HUB_URL = 'https://crispus-mundo.github.io/crisp-cares/connect/';
var SUPPORT_EMAIL = 'LmiraC@crispcleans.com';
var BRAND = 'Connect';
var ORG = 'CMCC Training Institute · Crisp Cares · Crisp Clean';
var NAVY = '#1B2951', GOLD = '#C9A961', CREAM = '#FAF7F0';
var LOGO_URL = 'https://crispus-mundo.github.io/crisp-cares/connect/cm-logo.png';
var HUB_URL = 'https://crispus-mundo.github.io/crisp-cares/connect/';
var SESSION_DAYS = 30;
var CODE_MINUTES = 10;
var MAX_FILE_BYTES = 8 * 1024 * 1024;        // after base64 decode
var KINDS = ['track', 'cert', 'log'];
var SPECIALTIES = ['HVAC/R', 'Tax preparation', 'Home care', 'Phlebotomy & medical', 'Barbering & cosmetology', 'Cleaning & environmental', 'Business owner', 'Other'];

var TABS = {
  Members: ['email', 'name', 'phone', 'specialty', 'schoolStart', 'alerts', 'share', 'role', 'partnerStatus', 'company', 'created', 'lastLogin', 'resume', 'premiumUntil', 'plan', 'digest', 'lastDigest', 'source', 'verified', 'fields', 'refCode', 'referredBy', 'refMonths', 'promo', 'sms'],
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
    case 'classSignup': return classSignup_(r);
    case 'publicResources': return { resources: listResources_() };
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
    case 'tailorResume': return tailorResume_(me, r.job || {});
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


/* Class sign-up (HVAC class QR, Nov 6 2026): name, phone and email only, no code.
   Saved to Members with the class as the source so the person can sign in later with the same email. */
function classSignup_(r) {
  var email = clean_(r.email, 120).toLowerCase();
  var name = clean_(r.name, 80), phone = clean_(r.phone, 30).replace(/[^0-9+()\-. ]/g, '');
  var src = clean_(r.src, 40).replace(/[^a-z0-9_-]/gi, '') || 'hvac-class';
  var ref = cleanRef_(r.ref), smsOk = bool_(r.sms);
  if (!name) fail_('Please enter your name.');
  if (phone.replace(/\D/g, '').length < 10) fail_('Please enter a 10-digit phone number.');
  if (!isEmail_(email)) fail_('Please enter a valid email address.');
  var cache = CacheService.getScriptCache(), key = 'cs:' + hash_(email).slice(0, 40);
  if (Number(cache.get(key) || 0) >= 5) fail_('You already signed up. Thank you!');
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 3600);
  ensureHeads_();
  var refRes = null, member = null;
  var isNew = withLock_(function () {
    var m = rows_('Members').filter(function (x) { return x.email === email; })[0];
    if (!m) {
      append_('Members', { email: email, name: name, phone: phone, specialty: '', schoolStart: '', alerts: true, digest: 'weekly', lastDigest: '', share: false, role: ADMINS.indexOf(email) > -1 ? 'admin' : 'member', partnerStatus: '', company: '', created: new Date(), lastLogin: '', resume: '', source: src, verified: false, referredBy: ref, sms: smsOk });
      member = rows_('Members').filter(function (x) { return x.email === email; })[0];
      ensureRefCode_(member);
      if (ref) refRes = creditReferral_(ref, email);
      return true;
    }
    if (!m.name) m.name = name;
    if (!m.phone) m.phone = phone;
    if (smsOk) m.sms = true;
    write_('Members', m);
    member = m;
    return false;
  });
  notifyAdmins_((isNew ? 'New HVAC class sign-up: ' : 'HVAC class sign-up (already a member): ') + name,
    '<p><b>' + esc_(name) + '</b> · ' + esc_(phone) + ' · ' + esc_(email) + '</p><p>Source: ' + esc_(src) + (ref ? ' · referred by code <b>' + esc_(ref) + '</b>' : '') + ' · texts: ' + (smsOk ? 'yes' : 'no') + '</p><p><a href="' + db_().getUrl() + '">Open the Members sheet</a> · <a href="' + APP_URL + '#admin">Connect admin</a></p>');
  try { sendClassWelcome_(email, name); } catch (e) { logEvent_(email, 'classWelcomeFail', e.message); }
  if (isNew) sendSms_(member, 'Welcome to Connect from Crisp Cares & CMCC. Jobs, study cards and more: ' + HUB_URL + ' Reply STOP to opt out.');
  afterReferral_(refRes, name);
  logEvent_(email, 'classSignup', src + (ref ? ' ref:' + ref : ''));
  return { saved: true, isNew: isNew };
}


/* Branded welcome for HVAC class sign-ups: business cards, free or reduced-cost health & dental, link to Connect. */
var CLASS_CARDS = [
  ['Crisp Cares', 'Heating & Cooling', 'HVAC service, repair and installs. Overflow work for partner techs.', '(248) 403-8982', '2484038982'],
  ['Crisp Cares', 'Home Care & Patient Advocacy', 'In-home care, agency staffing and help navigating care.', '(248) 403-8982', '2484038982'],
  ['Crisp Clean', 'Taxes & Business Setup', 'Personal and business returns, 1099 tax planning, starting an LLC.', '(248) 387-9226', '2483879226'],
  ['CMCC Training Institute', 'Jobs & Training', 'Job leads, certifications, resume help and the tax preparer path.', '(248) 387-9226', '2483879226'],
  ['Crispus Mundo', 'Legal Help · Law Analyzer', 'Looking for an attorney? Organize your case papers and see your next steps. $39.99/month.', '', '']
];
function sendClassWelcome_(email, name) {
  var first = esc_(firstName_(name));
  var cards = CLASS_CARDS.map(function (c) {
    return '<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" style="background:' + NAVY + ';border-left:6px solid ' + GOLD + ';border-radius:10px"><tr><td style="padding:14px 16px;color:' + CREAM + '">' +
      '<div style="font-size:11px;letter-spacing:1.5px;font-weight:bold;color:' + GOLD + '">' + esc_(c[0].toUpperCase()) + '</div>' +
      '<div style="font-family:Georgia,serif;font-size:19px;margin:4px 0 2px;color:#fff">' + esc_(c[1]) + '</div>' +
      '<div style="font-size:13px;color:#E6DDC8;margin-bottom:6px">' + esc_(c[2]) + '</div>' +
      (c[3] ? '<a href="tel:+1' + c[4] + '" style="color:#fff;font-weight:bold;text-decoration:none">' + c[3] + '</a> &nbsp;&middot;&nbsp; ' : '<a href="' + APP_URL + '#legal" style="color:#fff;font-weight:bold">Learn more</a> &nbsp;&middot;&nbsp; ') +
      '<a href="mailto:' + SUPPORT_EMAIL + '" style="color:#fff">' + SUPPORT_EMAIL + '</a></td></tr></table></td></tr>';
  }).join('');
  var res = listResources_().filter(function (r) { return /health|dental|insurance|help/i.test(r.type); });
  var health = res.map(function (r) {
    return '<tr><td style="padding:8px 0;border-top:1px solid #E4DCC8"><b>' + esc_(r.name) + '</b> <span style="color:#7A5F22;font-size:12px">' + esc_(r.type) + '</span>' +
      (r.address ? '<br><span style="font-size:13px">' + esc_(r.address) + '</span>' : '') +
      (r.phone ? '<br><span style="font-size:13px"><b>' + esc_(r.phone) + '</b></span>' : '') +
      (r.note ? '<br><span style="font-size:13px;color:#586079">' + esc_(r.note) + '</span>' : '') +
      (r.website ? '<br><a href="' + esc_(r.website) + '" style="font-size:13px;color:' + NAVY + '">' + esc_(String(r.website).replace(/^https?:\/\//, '')) + '</a>' : '') + '</td></tr>';
  }).join('');
  var inner =
    '<p style="margin:0 0 14px">Hello' + (first ? ' ' + first : '') + ',</p>' +
    '<p style="margin:0 0 14px">Thank you for signing up at class. You\'re on our list for HVAC jobs, training, class updates and services. Here are our cards so you have them in one place.</p>' +
    '<table role="presentation" width="100%">' + cards + '</table>' +
    '<p style="margin:18px 0 6px;font-family:Georgia,serif;font-size:19px;color:' + NAVY + '">Free or reduced-cost health &amp; dental</p>' +
    '<p style="margin:0 0 6px;font-size:13px;color:#586079">Care for you and your family, whatever you can pay. Call ahead to confirm hours and what to bring.</p>' +
    '<table role="presentation" width="100%">' + health + '</table>' +
    button_(HUB_URL + '?src=hvac-class-email', 'Open Connect') +
    '<p style="margin:10px 0 0;font-size:13px;color:#586079">To use the member app (job tracker, resume help, study cards), sign in at <a href="' + APP_URL + '" style="color:' + NAVY + '">Connect</a> with this email address. We\'ll email you a one-time code.</p>' +
    '<p style="margin:18px 0 0">Thank you,<br>The Connect team<br><span style="color:#586079">Crisp Cares &middot; Crispus Mundo</span></p>';
  MailApp.sendEmail({ to: email, subject: 'Welcome from Crisp Cares & Crispus Mundo — your cards and resources',
    htmlBody: emailShell_('Your cards, free and reduced-cost health and dental, and your link to Connect', classWelcomeOn_() ? 'Welcome, HVAC class' : 'Welcome to Connect', inner,
      'You are receiving this because you signed up with this email at your HVAC class. To stop these emails, reply and ask to be removed.'),
    name: 'Crisp Cares & Crispus Mundo', replyTo: SUPPORT_EMAIL });
}

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
  var ref = cleanRef_(r.ref), refRes = null;
  ensureHeads_();
  if (phone && phone.replace(/\D/g, '').length < 10) fail_('Please enter a 10-digit phone number.');
  var member = withLock_(function () {
    var m = rows_('Members').filter(function (x) { return x.email === email; })[0];
    if (!m && name) {
      append_('Members', { email: email, name: name, phone: phone, specialty: '', schoolStart: '', alerts: true, digest: 'weekly', lastDigest: '', share: false, role: ADMINS.indexOf(email) > -1 ? 'admin' : 'member', partnerStatus: '', company: '', created: new Date(), lastLogin: '', resume: '', source: src || 'join', verified: false, referredBy: ref, sms: bool_(r.sms) });
      m = rows_('Members').filter(function (x) { return x.email === email; })[0];
      ensureRefCode_(m);
      if (ref) refRes = creditReferral_(ref, email);
      if (src.indexOf('qr') === 0) notifyAdmins_('New sign-up from your QR code: ' + name, '<p><b>' + esc_(name) + '</b> · ' + esc_(phone) + ' · ' + esc_(email) + '</p><p><a href="' + db_().getUrl() + '">Open the Members sheet</a> · <a href="' + APP_URL + '#admin">Connect admin</a></p>');
    } else if (m && (name || phone)) {
      if (name && !m.name) m.name = name;
      if (phone && !m.phone) m.phone = phone;
      write_('Members', m);
    }
    return m;
  });
  sendOtpEmail_(email, member && member.name, code);
  afterReferral_(refRes, name);
  logEvent_(email, 'requestCode', '');
  return { sent: true };
}

function verifyCode_(r) {
  var email = clean_(r.email, 120).toLowerCase();
  ensureHeads_();
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
    try {
      var fresh = rows_('Members').filter(function (x) { return x.email === email; })[0];
      if (fresh && !isAdmin) { ensureRefCode_(fresh); if (applyPromo_(fresh)) logEvent_(email, 'promo', PROMO.id); }
    } catch (e) { logEvent_(email, 'promoFail', e.message); }
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
    premiumUntil: m.premiumUntil ? new Date(m.premiumUntil).toISOString() : '', premium: isPremium_(m), plan: m.plan, digest: m.digest || 'weekly', fields: memberFields_(m),
    referral: referralInfo_(m), promo: promoInfo_(m), sms: bool_(m.sms)
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
  try { ensureLegalProduct_(); } catch (e) {}
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
    if ('sms' in p) m.sms = !!p.sms;
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
    MailApp.sendEmail({ to: 'crispcleaninc@gmail.com,crispcareses@gmail.com', subject: '[Connect] ' + subject, htmlBody: emailShell_(subject, subject, html, 'Internal alert from your Connect app.'), name: BRAND + ' alerts' });
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
    '<td width="60" style="padding-right:12px"><img src="' + LOGO_URL + '" width="52" height="52" alt="Crispus Mundo" style="display:block;border:0;border-radius:50%"></td>' +
    '<td style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:' + NAVY + ';letter-spacing:1px">CONNECT<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:normal;color:#586079;letter-spacing:.5px">for contractors &amp; trades</div><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#7A5F22;letter-spacing:1.5px">CRISP CARES &middot; CRISPUS MUNDO</div><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:normal;color:#586079;letter-spacing:.5px">' + esc_(ORG) + '</div></td>' +
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
