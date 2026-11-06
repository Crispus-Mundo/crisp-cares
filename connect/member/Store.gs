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
    LEGAL_PRODUCT,
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


/* Law Analyzer (added Nov 6, 2026). seedCatalog_ only fills an empty tab, so this adds the row once to a live sheet. */
var LEGAL_PRODUCT = { id: 'S8', name: 'Law Analyzer — legal help', business: 'Crispus Mundo', description: 'Legal help? Looking for an attorney? Start here. Upload your court papers, letters and photos. The Law Analyzer reads them, builds your timeline and court dates, shows what is missing, lays out your next steps under your state\'s court rules, and drafts documents for you to review. Includes "Find an attorney" help with where to file and what to bring to a consult. It is a software tool, not a law firm: it does not give legal advice or represent you.', price: '$39.99 per month', link: '', active: true, order: 0.5, payLink: '' };
function ensureLegalProduct_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('LEGAL_PRODUCT_V1')) return;
  var has = rows_('Products').some(function (r) { return r.id === LEGAL_PRODUCT.id; });
  if (!has) append_('Products', LEGAL_PRODUCT);
  props.setProperty('LEGAL_PRODUCT_V1', '1');
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
