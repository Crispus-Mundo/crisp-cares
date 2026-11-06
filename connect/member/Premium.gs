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
