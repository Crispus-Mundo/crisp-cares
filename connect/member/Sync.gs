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
