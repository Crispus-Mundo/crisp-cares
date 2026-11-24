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

/* Union facts rechecked 2026-11-24 from each training center's own website. Merged over the Unions tab by id. */
var UNION_FACTS = {
  UN636: {
    name: 'Pipefitters, Steamfitters, Refrigeration & AC Service — UA Local 636', website: 'https://pipefitters636tc.org/apprenticeship', phone: '(248) 585-0636',
    address: 'Pipefitting Industry Training Center, 636 Executive Dr, Troy, MI 48083 (John R & Dequindre, north of 14 Mile)',
    signUp: 'A 5-year paid, tuition-free apprenticeship registered with the U.S. Department of Labor: pipefitting, welding and HVAC/R service. 1,200 classroom hours and at least 8,000 on-the-job hours, ending in journeyman status. Up to 32 college credits from local community colleges.',
    requirements: 'Proof of age, a valid driver\'s license and high school completion (diploma or GED) are verified. You must pass 3 tests: WorkKeys Applied Math (score 6 or higher), WorkKeys Graphic Literacy (6 or higher) and the Wiesen Test of Mechanical Aptitude (raw score 51 or higher). Scores from a proctored test taken within 12 months can be used instead of retesting.',
    howToApply: '1) Open the application on the training center website on Dec 1. 2) Pay the testing fee when you apply: $45 at Schoolcraft College or $100 at Macomb Community College. 3) Take the tests (bring your driver\'s license and a pencil; no phones; calculators are provided). 4) Interview. 5) You are told within 4–6 weeks after the last application date. No resumes.',
    drugTest: 'Drug-free program. If you are tentatively selected after the tests and interview, you must pass a drug test. A positive result for marijuana in any form is a failure, even though marijuana is legal in Michigan. The website does not say whether it is a urine or hair test; ask the center.',
    schedule: 'Full workdays with a union contractor plus classes at the Troy center. Ask the center for the class days and hours.',
    startDate: 'New classes are brought in about twice a year, "as need arises." You hear back 4–6 weeks after the Dec 20 close, so about late January to early February 2027.',
    pay: 'Paid from day one at a percentage of the journeyman rate, with raises as you advance. 2026 contract: apprentices got a $2.50/hr raise, plus $1.00/hr more for each current UA welding certification. U.S. DOL wage determination (May 2026): journeyman base $45.96/hr. Ask for the current apprentice wage sheet.',
    deadline: '2026-12-20', deadlineNote: 'OPEN DEC 1 – DEC 20, 2026. Book your WorkKeys and Wiesen tests now.', verified: '2026-11-24', source: 'https://pipefitters636tc.org/apprenticeship',
    links: [['Apply (opens Dec 1)', 'https://pipefitters636tc.org/apprenticeship'], ['Book tests at Schoolcraft', 'https://www.cognitoforms.com/SchoolcraftCollege2/ApprenticeshipApplicantTestingAppointments'], ['Book tests at Macomb (email)', 'mailto:WAC@macomb.edu'], ['Contact form', 'https://pipefitters636tc.org/contact'], ['2026 contract (pay)', 'https://pipefitters636.org/wp-content/uploads/2026/04/Pipefitters-Local-636-Tentative-Agreement-April-2026.pdf']]
  },
  UN80: {
    name: 'SMART Sheet Metal Workers Local 80', website: 'https://www.smw80jac.org/apprenticeship', phone: '(586) 979-5190',
    address: 'Local 80 Training Center, 32700 Dequindre Rd, Warren, MI 48092. Email info@smw80jac.org.',
    signUp: 'A Building Trades Apprenticeship registered with the U.S. Department of Labor (4 years per the training center): sheet metal fabrication and installation, welding, HVAC system design, HVAC service and testing and balancing. There is also an architectural sheet metal apprenticeship. No up-front cost for school or training materials.',
    requirements: 'High school diploma or GED, a valid driver\'s license, three personal references, and the $40 exam fee (cash only, non-refundable). You must be able to stand, bend, kneel, lift up to 75 lb and work at heights in all weather, and have your own transportation to job sites across Wayne, Oakland, Macomb, Washtenaw, St. Clair and Sanilac counties.',
    howToApply: '1) Call (586) 979-5190 for an appointment (Mon–Fri, 8 AM–2 PM). 2) Apply in person in Warren with your diploma/GED, license and $40 cash. 3) You get a time for the entrance exam: the Bennett Mechanical Comprehension Test plus WorkKeys Applied Math, Workplace Documents and Graphic Literacy. Passing scores stay good for 2 years; retesting changes your place on the list.',
    drugTest: 'If you are accepted, you must take a drug and alcohol screen. The apprenticeship committee pays for it. The website does not say what kind of test it is; ask the center.',
    schedule: 'Day, afternoon or night shifts in the shop or field. Work can be seasonal, with possible layoffs. Apprentices earn the same hourly wage on school days as on the job.',
    startDate: 'Exams are the 4th Wednesday of January and July. The next one should be Jan 27, 2027 (apply by Fri, Jan 22). Ask when the next class starts.',
    pay: 'Paid while you learn, including school days, working beside journeypersons for 80+ union contractors. Ask the training center for the current wage sheet.',
    deadline: '2027-01-22', deadlineNote: 'Next exam about Jan 27, 2027; apply in person by Fri, Jan 22. (Dates follow the center\'s 4th-Wednesday rule; call to confirm.)', verified: '2026-11-24', source: 'https://www.smw80jac.org/apprenticeship',
    links: [['Apprenticeship page', 'https://www.smw80jac.org/apprenticeship'], ['2026 application (PDF)', 'https://www.smw80jac.org/Apprenticeship%20Application%2026.pdf'], ['Email the center', 'mailto:info@smw80jac.org']]
  },
  UN58: {
    name: 'IBEW Local 58 — Detroit Electrical Industry Training Center', website: 'https://detroiteitc.org/apply/', phone: '(586) 751-6600',
    address: 'Detroit Electrical Industry Training Center, Warren, MI. IBEW Local 58 hall: 1358 Abbott St, Detroit. Email support@detroiteitc.org.',
    signUp: 'Three programs with IBEW Local 58 and Southeastern Michigan NECA: Inside Electrician (5 years), Tele-Data / Sound & Communication (3 years) and Residential Electrician (3 years). You are placed on a job and earn wages from week one.',
    requirements: 'At least 17 with a high school diploma or GED when you apply. Photo ID and your Social Security number at the aptitude test. Upload transcripts and work, school or military papers (the personal experience form) and a letter of recommendation. Reliable transportation, internet access and a Windows computer for homework (the center can provide access).',
    howToApply: '1) Create your user account on detroiteitc.org NOW; you cannot start an application until the portal opens, and they warn help is slow during the window. 2) When it opens, fill out the application online. 3) Upload documents and take the aptitude test. 4) You stay on the selection list for 1 year, then interview. You can apply to all 3 programs at once, but once you accept one, you cannot be considered for another for 2 years.',
    drugTest: 'Failing the drug screen means you will not be signed into the apprenticeship. The website does not say what kind of test it is; ask the center.',
    schedule: 'School one full day every other week; the rest of the time you work 8-hour days at contractor job sites. Shifts vary, overtime on weekdays and weekends is common, and job locations change often.',
    startDate: 'Not open now. Application dates will be posted in spring 2027 (the 2026 window was June 15–19). The Summer Worker Program is taking applications now.',
    pay: 'About $22/hr to start, rising to over $50/hr by graduation (WDIV, May 2025), with healthcare and retirement. Each program has its own wage scale.',
    deadline: '', deadlineNote: 'Closed. 2027 dates will be posted in spring 2027 (last year: June 15–19). Create your account now.', verified: '2026-11-24', source: 'https://detroiteitc.org/apply/',
    links: [['Create account / apply', 'https://detroiteitc.org/apply/'], ['Programs and pay', 'https://detroiteitc.org/programs/'], ['Questions (FAQ)', 'https://detroiteitc.org/faq/'], ['Summer Worker Program', 'https://detroiteitc.org/apprenticeships/']]
  },
  UN98: {
    name: 'Plumbers Local 98 & MCA Detroit Training Center', website: 'https://www.plumbers98tc.org/apprenticeship', phone: '(248) 585-1435',
    address: 'Plumbing Industry Training Center, 1911 Ring Dr, Troy, MI 48083. Email plumberstc@ualocal98jatc.org. Office Mon–Fri, 7 AM–3:30 PM.',
    signUp: 'A tuition-free 5-year plumbing apprenticeship: 10,000 hours of on-the-job training plus classroom instruction, preparing you for the Michigan journey plumbing license. 30–38 college credits toward an associate degree.',
    requirements: 'At least 18 when class starts, a valid driver\'s license, a high school diploma, official transcript or GED, and drug-free. WorkKeys scores from the last 2 years: Applied Math level 6, Graphic Literacy level 5 and Workplace Documents level 5, plus a Wiesen Mechanical Aptitude raw score of 48.',
    howToApply: '1) Take the WorkKeys and Wiesen tests in person at a certified site such as Macomb or Schoolcraft (not online). 2) On the training center page, tap Apply Online, create your account and fill out the application. 3) Upload your diploma/GED, driver\'s license and test results. 4) Interviews follow.',
    drugTest: 'You must be drug free. The website does not say when or how the test is given; ask the center.',
    schedule: 'Full workdays with a union plumbing contractor, plus school one day every other week.',
    startDate: 'This round closes Dec 18, 2026 (or sooner if 200 people apply), followed by interviews. Ask the center for the class start date.',
    pay: 'About $250,000 in wages and fringe benefits over the 5 years, plus medical for you, your spouse and children, and a pension.',
    deadline: '2026-12-18', deadlineNote: 'OPEN NOW until Dec 18, 2026, or until 200 people apply, whichever comes first.', verified: '2026-11-24', source: 'https://www.plumbers98tc.org/apprenticeship',
    links: [['Apply online', 'https://www.plumbers98tc.org/apprenticeship'], ['Book tests at Schoolcraft', 'https://www.cognitoforms.com/SchoolcraftCollege2/ApprenticeshipApplicantTestingAppointments'], ['Book tests at Macomb (email)', 'mailto:WAC@macomb.edu'], ['Email the center', 'mailto:plumberstc@ualocal98jatc.org']]
  },
  UNUS: { verified: '2026-11-24' }
};
var UNION_FAQ = [
  ['Can I be in two unions at the same time?', 'Federal law does not stop you from belonging to more than one union. But in practice you can only do one apprenticeship at a time: each one is a full-time job plus school. You can apply to several at once (for example Local 636 and Plumbers 98, which use the same tests), then accept one. The electrical training center says that once you accept one of its programs, you cannot be considered for another for 2 years. If you own a business or do side jobs, ask each union before you sign whether its rules let you keep doing that work.'],
  ['How are the drug tests done?', 'All four programs test after you are selected, before you start. None of them post the test type (urine or hair) online, so ask when you are selected. Local 636 counts marijuana in any form as a failure, even though it is legal in Michigan.'],
  ['One test, two applications', 'Local 636 and Plumbers 98 both use the WorkKeys tests and the Wiesen Mechanical Aptitude test at Schoolcraft or Macomb. One test date can cover both. Local 636 needs a 6 in Graphic Literacy; Plumbers 98 needs a 5.']
];
function mergeUnions_(list) {
  var seen = {}, out = (list || []).map(function (u) { seen[u.id] = 1; var f = UNION_FACTS[u.id]; if (!f) return u; var o = {}; for (var k in u) o[k] = u[k]; for (var j in f) o[j] = f[j]; return o; });
  Object.keys(UNION_FACTS).forEach(function (id) { if (!seen[id] && UNION_FACTS[id].name) { var o = { id: id, trade: id === 'UN58' ? 'Electrical' : id === 'UN98' ? 'Plumbing' : 'HVAC/R', state: 'MI', area: 'Metro Detroit', active: true }; for (var j in UNION_FACTS[id]) o[j] = UNION_FACTS[id][j]; out.push(o); } });
  return out;
}

function listUnions_() {
  return mergeUnions_(activeRows_('Unions')).map(function (u) {
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
