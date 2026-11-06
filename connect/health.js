/* Connect: free or reduced-cost health & dental, shown on public pages.
   Live list comes from the Resources tab in Connect Members DB; the copy below is used offline or if the server is slow. */
(function () {
  var FALLBACK = [{ id: 'R1', name: 'Covenant Community Care — Michigan Ave', type: 'Health & dental', address: '5716 Michigan Ave, Detroit, MI 48210', phone: 'Medical (313) 554-1095 · Dental (313) 554-3880', website: 'https://www.covenantcommunitycare.org', note: 'Medical, dental, women\'s health and counseling for everyone, regardless of ability to pay (federally qualified health center). Takes Medicaid, Medicare and many plans.', verified: '2026-11-06', active: true, order: 1 },
{ id: 'R2', name: 'Covenant Community Care — Moross Rd', type: 'Health & dental', address: '20901 Moross Rd, Detroit, MI 48236', phone: 'Medical (313) 626-2600 · Dental (313) 626-2620', website: 'https://www.covenantcommunitycare.org', note: 'Medical, dental and counseling.', verified: '2026-11-06', active: true, order: 2 },
{ id: 'R3', name: 'Covenant Community Care — Joy Rd', type: 'Health & dental', address: '18917 Joy Rd, Detroit, MI 48228', phone: '(313) 446-8800', website: 'https://www.covenantcommunitycare.org', note: 'Primary care location.', verified: '2026-11-06', active: true, order: 3 },
{ id: 'R4', name: 'Covenant Community Care — other numbers', type: 'Health & dental', address: '', phone: 'Main office (313) 554-0485 · Mobile dental (313) 575-7502 · Substance use treatment (313) 625-1336', website: 'https://www.covenantcommunitycare.org', note: 'Call the main office to find the location closest to you, including Oakland County.', verified: '2026-11-06', active: true, order: 4 },
{ id: 'R5', name: 'FernCare Free Clinic', type: 'Health (free)', address: '751 E 9 Mile Rd, Suite 2, Ferndale, MI 48220', phone: '', website: '', note: 'Free medical care for adults 19–64 with no health insurance and no regular doctor.', verified: '2026-11-06', active: true, order: 5 },
{ id: 'R6', name: 'Michigan 2-1-1', type: 'Help finding services', address: '', phone: 'Dial 211', website: 'https://www.mi211.org', note: 'Free help finding food, rent, utility, health and other local assistance, 24/7, in many languages.', verified: '2026-11-06', active: true, order: 6 },
{ id: 'R7', name: '988 Suicide & Crisis Lifeline', type: 'Crisis', address: '', phone: 'Call or text 988', website: 'https://988lifeline.org', note: 'Free, confidential support 24/7.', verified: '2026-11-06', active: true, order: 7 },
{ id: 'R8', name: 'Health Insurance Marketplace', type: 'Insurance', address: '', phone: '(800) 318-2596', website: 'https://www.healthcare.gov', note: 'Shop for health coverage and see if you qualify for lower costs.', verified: '2026-11-06', active: true, order: 8 }];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tel(p) { var m = String(p || '').match(/\(?(\d{3})\)?[\s.-]?(\d{3})-(\d{4})/); return m ? 'tel:+1' + m[1] + m[2] + m[3] : (/988/.test(p) ? 'tel:988' : /211/.test(p) ? 'tel:211' : ''); }
  function card(r) {
    var t = tel(r.phone);
    return '<div class="hr-card"><div class="hr-type">' + esc(r.type) + '</div><b class="hr-name">' + esc(r.name) + '</b>' +
      (r.address ? '<div class="hr-line">' + esc(r.address) + '</div>' : '') +
      (r.phone ? '<div class="hr-line"><b>' + esc(r.phone) + '</b></div>' : '') +
      (r.note ? '<div class="hr-note">' + esc(r.note) + '</div>' : '') +
      '<div class="hr-acts">' + (t ? '<a href="' + t + '">Call</a>' : '') + (r.address ? '<a target="_blank" rel="noopener" href="https://maps.google.com/?q=' + encodeURIComponent(r.address) + '">Directions</a>' : '') + (r.website ? '<a target="_blank" rel="noopener" href="' + esc(r.website) + '">Website</a>' : '') + '</div></div>';
  }
  window.ConnectHealth = function (el) {
    if (!el) return;
    function draw(list) { el.innerHTML = '<h2 class="hr-title">Free or reduced-cost health &amp; dental</h2><p class="hr-sub">Care for you and your family, whatever you can pay. Call ahead to confirm hours and what to bring.</p><div class="hr-list">' + list.map(card).join('') + '</div>'; }
    draw(FALLBACK);
    if (!window.CONNECT_API || !navigator.onLine) return;
    fetch(window.CONNECT_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'publicResources' }) })
      .then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok && j.resources && j.resources.length) draw(j.resources); }).catch(function () {});
  };
})();
