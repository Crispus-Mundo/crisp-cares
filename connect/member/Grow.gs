/* ------------------------------------------------------------------ v1.4 (Nov 10 2026): early Black Friday offer, referrals, text alerts

   Early Black Friday: any member who signs in from Nov 10 through Nov 17, 2026 (Detroit time)
   gets 30 days of Connect Pro once. Stacks on top of Pro they already have.

   Referrals: every member gets a personal link (…/connect/hvac/?ref=CODE or …/member/?join=1&ref=CODE).
   When the 2nd friend joins with it, the member gets 2 free months; the 3rd friend adds 1 more.
   Capped at 3 months per member.

   Text alerts (Twilio): off until TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM are set in
   Project Settings > Script properties. Texts only go to people who checked the text box
   (Members column "sms" = TRUE). Google Voice has no texting API, so it can't send these.
*/

var PROMO = { id: 'bf2026', end: '2026-11-17T23:59:59-05:00', days: 30, label: 'Early Black Friday: 30 days of Connect Pro' };
var REF_MIN = 2, REF_MAX_MONTHS = 3;
var CLASS_WELCOME_UNTIL = '2026-12-10T00:00:00-05:00'; // HVAC class wording on the class page and email until then

function classWelcomeOn_() { return Date.now() < new Date(CLASS_WELCOME_UNTIL).getTime(); }

/* First name for greetings: skips short prefixes like "MD", "Mr", "Dr". */
function firstName_(name) {
  var parts = String(name || '').trim().split(/\s+/).filter(String);
  var pick = parts.filter(function (p) { return p.replace(/[^a-z]/gi, '').length > 2; })[0] || parts[0] || '';
  return pick.charAt(0).toUpperCase() + pick.slice(1).toLowerCase();
}

/* Writes any new Members columns into the sheet's header row (once every 6 hours at most). */
function ensureHeads_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('heads14')) return;
  Object.keys(TABS).forEach(function (name) {
    var sh = sh_(name), head = TABS[name];
    var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
    if (cur.join('|') !== head.join('|')) sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground(NAVY).setFontColor(CREAM);
  });
  cache.put('heads14', '1', 21600);
}

/* ---------------- referral codes */

function makeRefCode_(m, all) {
  var base = firstName_(m.name).toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) || String(m.email).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'member';
  var taken = {}; all.forEach(function (x) { if (x.refCode) taken[String(x.refCode).toLowerCase()] = 1; });
  var code = base, n = 2;
  while (taken[code]) code = base + (n++);
  return code;
}

/* Gives a member a referral code if they don't have one. Call inside withLock_. */
function ensureRefCode_(m) {
  if (m.refCode) return m.refCode;
  m.refCode = makeRefCode_(m, rows_('Members'));
  write_('Members', m);
  return m.refCode;
}

function refLink_(code) { return HUB_URL + 'hvac/?ref=' + encodeURIComponent(code); }

function cleanRef_(v) { return clean_(v, 30).toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* Called right after a NEW member row is created with referredBy set. Call inside withLock_. */
function creditReferral_(code, newEmail) {
  code = cleanRef_(code);
  if (!code) return null;
  var all = rows_('Members');
  var ref = all.filter(function (x) { return String(x.refCode).toLowerCase() === code; })[0];
  if (!ref || ref.email === newEmail) return null;
  var count = all.filter(function (x) { return String(x.referredBy).toLowerCase() === code && x.email !== ref.email; }).length;
  var owed = count >= REF_MIN ? Math.min(count, REF_MAX_MONTHS) : 0;
  var given = Number(ref.refMonths) || 0;
  var add = Math.max(0, owed - given);
  if (add) {
    var start = ref.premiumUntil && new Date(ref.premiumUntil).getTime() > Date.now() ? new Date(ref.premiumUntil) : new Date();
    var until = new Date(start); until.setMonth(until.getMonth() + add);
    ref.premiumUntil = until; ref.plan = ref.plan || 'Referral reward';
    ref.refMonths = given + add;
    write_('Members', ref);
  }
  return { referrer: ref, count: count, added: add, total: Number(ref.refMonths) || 0 };
}

function afterReferral_(res, newName) {
  if (!res) return;
  var r = res.referrer;
  notifyAdmins_('Referral: ' + (newName || 'a new member') + ' joined with ' + (r.name || r.email) + '\'s link',
    '<p><b>' + esc_(r.name || r.email) + '</b> now has <b>' + res.count + '</b> friend(s) signed up with their link.</p>' +
    (res.added ? '<p>Connect added <b>' + res.added + ' free month(s)</b> of Pro (' + res.total + ' of ' + REF_MAX_MONTHS + ' earned). Pro now runs through ' + Utilities.formatDate(new Date(r.premiumUntil), 'America/Detroit', 'MMM d, yyyy') + '.</p>' :
      (res.count < REF_MIN ? '<p>No months yet: rewards start at ' + REF_MIN + ' friends.</p>' : '<p>They have reached the ' + REF_MAX_MONTHS + '-month limit.</p>')) +
    '<p><a href="' + db_().getUrl() + '">Open the Members sheet</a></p>');
  if (res.added) {
    var first = esc_(firstName_(r.name));
    var inner = '<p style="margin:0 0 14px">Hello' + (first ? ' ' + first : '') + ',</p>' +
      '<p style="margin:0 0 14px">Another friend joined Connect with your link. You earned <b>' + res.added + ' free month' + (res.added > 1 ? 's' : '') + '</b> of Connect Pro.</p>' +
      '<p style="margin:0 0 14px">Your Pro now runs through <b>' + Utilities.formatDate(new Date(r.premiumUntil), 'America/Detroit', 'MMMM d, yyyy') + '</b>. You have earned ' + res.total + ' of ' + REF_MAX_MONTHS + ' referral months.</p>' +
      button_(APP_URL, 'Open Connect') +
      '<p style="margin:18px 0 0">Thank you,<br>The Connect team<br><span style="color:#586079">CMCC Training Institute</span></p>';
    try {
      MailApp.sendEmail({ to: r.email, subject: 'You earned free Connect Pro', htmlBody: emailShell_('A friend joined with your link', 'You earned free Pro', inner, 'You are receiving this because a friend joined Connect with your referral link.'), name: BRAND + ' — CMCC Training Institute', replyTo: SUPPORT_EMAIL });
    } catch (e) { logEvent_(r.email, 'refMailFail', e.message); }
    sendSms_(r, 'Connect: a friend joined with your link. You earned ' + res.added + ' free month' + (res.added > 1 ? 's' : '') + ' of Pro. Open ' + APP_URL + ' Reply STOP to opt out.');
  }
  logEvent_(r.email, 'referral', res.count + ' friends, +' + res.added + ' months');
}

/* ---------------- Early Black Friday offer */

function promoOpen_() { return Date.now() <= new Date(PROMO.end).getTime(); }

/* Gives the offer once per member. Call inside withLock_ with a fresh row. Returns true if applied. */
function applyPromo_(m) {
  if (!m || !promoOpen_() || m.role === 'admin') return false;
  var used = String(m.promo || '').split(',').filter(String);
  if (used.indexOf(PROMO.id) > -1) return false;
  var start = m.premiumUntil && new Date(m.premiumUntil).getTime() > Date.now() ? new Date(m.premiumUntil) : new Date();
  m.premiumUntil = new Date(start.getTime() + PROMO.days * 86400000);
  m.plan = m.plan || PROMO.label;
  used.push(PROMO.id); m.promo = used.join(',');
  write_('Members', m);
  return true;
}

function referralInfo_(m) {
  if (!m.refCode) return null;
  var code = String(m.refCode).toLowerCase();
  var count = rows_('Members').filter(function (x) { return String(x.referredBy).toLowerCase() === code && x.email !== m.email; }).length;
  return { code: m.refCode, link: refLink_(m.refCode), friends: count, monthsEarned: Number(m.refMonths) || 0, min: REF_MIN, max: REF_MAX_MONTHS };
}

function promoInfo_(m) {
  var used = String(m.promo || '').split(',').indexOf(PROMO.id) > -1;
  return { id: PROMO.id, label: PROMO.label, open: promoOpen_(), end: PROMO.end, used: used };
}

/* ---------------- Twilio text alerts */

function smsConfigured_() {
  var p = PropertiesService.getScriptProperties();
  return !!(p.getProperty('TWILIO_SID') && p.getProperty('TWILIO_TOKEN') && p.getProperty('TWILIO_FROM'));
}

function e164_(phone) {
  var d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}

/* Sends one text to a member who opted in. Never throws; returns true when Twilio accepted it. */
function sendSms_(m, body) {
  try {
    if (!m || !bool_(m.sms) || !smsConfigured_()) return false;
    var to = e164_(m.phone);
    if (!to) return false;
    var p = PropertiesService.getScriptProperties();
    var sid = p.getProperty('TWILIO_SID');
    var res = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
      method: 'post', muteHttpExceptions: true,
      headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + p.getProperty('TWILIO_TOKEN')) },
      payload: { To: to, From: p.getProperty('TWILIO_FROM'), Body: String(body).slice(0, 640) }
    });
    var ok = res.getResponseCode() < 300;
    logEvent_(m.email, ok ? 'sms' : 'smsFail', ok ? String(body).slice(0, 80) : res.getContentText().slice(0, 250));
    return ok;
  } catch (e) { logEvent_(m && m.email, 'smsFail', e.message); return false; }
}

/* Admin test from the editor: set the three script properties, put your number below, then run. */
function testSms() {
  var me = { email: 'test', phone: '2483879226', sms: true };
  Logger.log(smsConfigured_() ? (sendSms_(me, 'Connect test text. Reply STOP to opt out.') ? 'Sent' : 'Twilio refused it; see the Log tab') : 'Set TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM in Script properties first.');
}

/* One-time helper (run from the editor): gives every existing member a referral code. */
function backfillRefCodes() {
  ensureHeads_();
  var n = withLock_(function () {
    var c = 0;
    rows_('Members').forEach(function (m) { if (!m.refCode && m.role !== 'admin') { ensureRefCode_(m); c++; } });
    return c;
  });
  Logger.log('Gave ' + n + ' member(s) a referral code.');
  return n;
}
