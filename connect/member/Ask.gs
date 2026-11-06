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
