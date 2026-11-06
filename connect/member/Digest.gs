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
