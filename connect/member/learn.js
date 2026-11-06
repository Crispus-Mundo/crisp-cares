/* Connect — refreshers, practice quizzes and common licenses by field.
   Review content with your instructor or the official study guide; targets vary by equipment and by year. */
window.LEARN = {
  "HVAC/R": {
    licenses: ["EPA Section 608 certification", "Michigan Mechanical Contractor license (if contracting)", "Driver's license", "OSHA 10 card", "NATE certification (optional)"],
    refreshers: [
      ["Quick system benchmarks", "Typical starting targets used in class: evaporator TD about 35°F, air ΔT across the coil about 20°F in cooling, superheat about 10°F, subcooling about 10°F. Always check the manufacturer's charging chart for the unit in front of you."],
      ["Thermostat terminals", "R / RC / RH = 24V power. W, W1, W2 = heat stages. E = emergency heat. Y, Y1, Y2 = compressor stages. G = indoor fan. C = common (24V return)."],
      ["Ignition sequences", "Standing pilot: pilot stays lit, thermocouple proves flame. Intermittent spark: spark lights the pilot each call, then main valve opens. Hot surface ignition (HSI): igniter glows, gas valve opens, flame sensor proves flame."],
      ["Hydronic rules of thumb", "About 1 GPM per 10,000 BTU. Design ΔT 20°F. Cold fill about 12 PSI, hot about 20 PSI, residential relief valve 30 PSI. The point of no pressure change is where the expansion tank connects. Manual air vents go at the high points. Never put an auto air vent on an air-cushioned (plain steel) tank."],
      ["Steam basics", "Residential low-pressure steam boilers: relief valve 15 PSI, normal operation under about 2 PSI. The Hartford loop keeps the boiler from losing water back through the return."],
      ["Zone valves", "Many 2-wire valves are motor-open, spring-close. 3-wire SPDT valves are motor-open and motor-close."],
      ["Refrigeration pump-down", "Thermostat opens the liquid line solenoid circuit, the compressor pumps refrigerant into the condenser/receiver, and the low-pressure control stops the compressor."]
    ],
    quiz: [
      { q: "Which thermostat terminal brings on the indoor fan?", o: ["Y", "G", "W", "C"], a: 1, why: "G controls the indoor blower." },
      { q: "Which terminal is the 24V common?", o: ["R", "C", "E", "Y2"], a: 1, why: "C is the common side of the 24V transformer." },
      { q: "Typical superheat target used as a starting benchmark in class?", o: ["About 2°F", "About 10°F", "About 35°F", "About 50°F"], a: 1, why: "About 10°F superheat; always confirm with the manufacturer's chart." },
      { q: "About how many GPM per 10,000 BTU in a hydronic system?", o: ["0.5", "1", "2", "5"], a: 1, why: "Rule of thumb: 1 GPM per 10,000 BTU at a 20°F ΔT." },
      { q: "Typical relief valve setting on a residential hot water boiler?", o: ["12 PSI", "15 PSI", "30 PSI", "60 PSI"], a: 2, why: "30 PSI on a residential hot water boiler." },
      { q: "Where is the point of no pressure change?", o: ["At the circulator outlet", "Where the expansion tank connects", "At the relief valve", "At the highest radiator"], a: 1, why: "The expansion tank connection sets the point of no pressure change." },
      { q: "Where should manual air vents be placed?", o: ["Lowest points", "Highest points", "Next to the burner", "Inside the expansion tank"], a: 1, why: "Air collects at the high points of the system." },
      { q: "Relief valve setting on a residential low-pressure steam boiler?", o: ["2 PSI", "15 PSI", "30 PSI", "50 PSI"], a: 1, why: "15 PSI; the boiler normally runs under about 2 PSI." },
      { q: "What does the Hartford loop protect against?", o: ["Water hammer in the supply", "Losing boiler water back through the return", "Overfiring", "Low gas pressure"], a: 1, why: "It keeps water from backing out of the boiler into the return." },
      { q: "In hot surface ignition, what proves the flame?", o: ["Thermocouple", "Flame sensor", "Limit switch", "Pressure switch"], a: 1, why: "The flame sensor proves flame by flame rectification." },
      { q: "In a pump-down cycle, what finally stops the compressor?", o: ["High-pressure control", "Low-pressure control", "Defrost timer", "Fan relay"], a: 1, why: "When suction pressure drops, the low-pressure control opens." }
    ]
  },
  "EPA 608": {
    licenses: [],
    refreshers: [
      ["Certification types", "Core plus Type I (small appliances, 5 lb or less, factory sealed), Type II (high-pressure, e.g., R-22, R-410A), Type III (low-pressure, e.g., R-123 chillers). Pass all four for Universal."],
      ["Refrigerant families", "CFC (R-12) has chlorine and the highest ozone depletion. HCFC (R-22) has less. HFC (R-410A, R-134a) has no chlorine, so no ozone depletion, but still has global warming potential."],
      ["Safety groups", "A = lower toxicity, B = higher toxicity. 1 = no flame propagation, 2L = mildly flammable, 2 = flammable, 3 = highly flammable. R-410A is A1, R-32 and R-454B are A2L, R-123 is B1."],
      ["Cylinders and testing", "Recovery cylinders are gray with a yellow top. Fill to no more than 80% liquid. Pressure test with dry nitrogen through a regulator; never oxygen or compressed air."],
      ["Low-pressure systems", "Leaks pull air in, so a purge unit removes non-condensables. To leak check, raise pressure with controlled heat (warm water or heating blankets), not with nitrogen beyond the system's limits."],
      ["The rule", "Knowingly venting refrigerant during service, maintenance, repair or disposal is prohibited under Clean Air Act Section 608."]
    ],
    quiz: [
      { q: "Type I certification covers…", o: ["Low-pressure chillers", "Small appliances with 5 lb or less", "Rooftop units", "Car AC"], a: 1, why: "Type I = small, factory-sealed appliances with 5 lb or less." },
      { q: "R-22 is a…", o: ["CFC", "HCFC", "HFC", "HFO"], a: 1, why: "R-22 is an HCFC." },
      { q: "Which family has no chlorine?", o: ["CFC", "HCFC", "HFC", "All have chlorine"], a: 2, why: "HFCs contain no chlorine, so they don't deplete ozone." },
      { q: "What does A2L mean?", o: ["Higher toxicity, flammable", "Lower toxicity, mildly flammable", "Lower toxicity, no flame propagation", "Higher toxicity, no flame propagation"], a: 1, why: "A = lower toxicity; 2L = mildly flammable." },
      { q: "Recovery cylinder colors?", o: ["Green body, white top", "Gray body, yellow top", "Red body, gray top", "Blue body, yellow top"], a: 1, why: "Gray body with a yellow top." },
      { q: "Maximum fill for a recovery cylinder?", o: ["50%", "65%", "80%", "100%"], a: 2, why: "No more than 80% liquid to leave room for expansion." },
      { q: "What gas do you pressure test with?", o: ["Oxygen", "Compressed air", "Dry nitrogen", "Refrigerant"], a: 2, why: "Dry nitrogen with a regulator. Oxygen with oil can explode." },
      { q: "What removes non-condensables from a low-pressure chiller?", o: ["Filter drier", "Purge unit", "Accumulator", "Receiver"], a: 1, why: "The purge unit removes air and moisture that leak in." },
      { q: "R-123 is used in…", o: ["Window units", "Low-pressure chillers", "Car AC", "Walk-in freezers"], a: 1, why: "R-123 is a low-pressure (Type III) refrigerant." }
    ]
  },
  "Tax preparation": {
    licenses: ["PTIN (Preparer Tax Identification Number)", "EFIN (if your office e-files)", "AFSP Record of Completion (optional)"],
    refreshers: [
      ["Who needs a PTIN", "Anyone paid to prepare, or help prepare, a federal return needs a current PTIN, renewed every year."],
      ["W-2 vs 1099-NEC", "W-2 = employee, taxes withheld. 1099-NEC = nonemployee pay: goes on Schedule C, and self-employment tax is figured on Schedule SE."],
      ["Due diligence", "Form 8867 is required when claiming EITC, the child tax credit, the American Opportunity credit or head of household status. Ask the questions and keep the notes."],
      ["Education credits", "American Opportunity: first four years of college, partly refundable. Lifetime Learning: any year, not refundable. You can't claim both for the same student in the same year."],
      ["Client consent", "Under IRC §7216 you need the client's signed consent before using or disclosing their tax information for anything beyond preparing their return."],
      ["Vehicle expenses", "Self-employed clients choose the standard mileage rate or actual expenses, and need a mileage log either way."]
    ],
    quiz: [
      { q: "Who must have a PTIN?", o: ["Only CPAs", "Anyone paid to prepare federal returns", "Only people who e-file", "Only enrolled agents"], a: 1, why: "Every paid preparer needs a current PTIN." },
      { q: "1099-NEC income for a self-employed person usually goes on…", o: ["Schedule A", "Schedule B", "Schedule C", "Schedule E"], a: 2, why: "Schedule C, with SE tax on Schedule SE." },
      { q: "Form 8867 is the…", o: ["Mileage log", "Paid preparer's due diligence checklist", "Extension request", "Education credit form"], a: 1, why: "It documents due diligence for EITC, CTC/ODC, AOTC and HOH." },
      { q: "Which education credit is partly refundable?", o: ["Lifetime Learning", "American Opportunity", "Both", "Neither"], a: 1, why: "The American Opportunity credit is partly refundable." },
      { q: "IRC §7216 is about…", o: ["Late filing penalties", "Using or disclosing taxpayer information", "Business mileage", "Estimated payments"], a: 1, why: "It limits use and disclosure of return information without consent." },
      { q: "Which is NOT a filing status?", o: ["Head of household", "Married filing separately", "Dependent filing jointly", "Qualifying surviving spouse"], a: 2, why: "There is no 'dependent filing jointly' status." }
    ]
  },
  "Home care": {
    licenses: ["CPR / First Aid", "TB test", "Background check clearance", "Driver's license and auto insurance"],
    refreshers: [
      ["Hand hygiene", "Wash with soap and water for at least 20 seconds. Gloves don't replace hand hygiene; clean hands before and after."],
      ["Privacy", "A client's health information is private. Share only with the care team members who need it."],
      ["Report changes", "Tell your supervisor right away about falls, new confusion, skin changes, or changes in eating or breathing. Call 911 in an emergency."],
      ["Safe transfers", "Lock wheels, use a gait belt, keep your back straight and bend at the knees. Ask for help when a transfer isn't safe alone."],
      ["Documentation", "Write what you did and saw, when, in plain facts. If it isn't written down, it didn't happen."]
    ],
    quiz: [
      { q: "Minimum handwashing time?", o: ["5 seconds", "10 seconds", "20 seconds", "2 minutes"], a: 2, why: "At least 20 seconds with soap and water." },
      { q: "A client seems newly confused today. You should…", o: ["Wait to see if it passes", "Report it to your supervisor right away", "Tell a neighbor", "Note it next week"], a: 1, why: "Sudden changes in condition get reported promptly." },
      { q: "Before a wheelchair transfer, first…", o: ["Lock the wheels", "Remove the footrests last", "Lift by the arms", "Hurry"], a: 0, why: "Lock the wheels so the chair can't roll." },
      { q: "Good documentation is…", o: ["Your opinion of the client", "Objective facts with times", "Only written when something goes wrong", "Kept on your personal phone"], a: 1, why: "Plain facts, with times, in the approved record." }
    ]
  },
  "Phlebotomy & medical": {
    licenses: ["Phlebotomy certification (e.g., NHA CPT)", "CPR / BLS", "Immunization records", "TB test"],
    refreshers: [
      ["Order of draw", "Blood cultures / sterile → light blue (citrate) → red or gold (serum) → green (heparin) → lavender (EDTA) → gray (fluoride/oxalate)."],
      ["Identify the patient", "Use two identifiers (such as full name and date of birth) before every collection, and label at the bedside."],
      ["Tourniquet", "No longer than one minute. Release before withdrawing the needle."],
      ["Technique", "Needle at about 15–30°. Gently invert additive tubes; don't shake. Engage the safety device at once and never recap by hand."],
      ["Avoid hemolysis", "Too small a needle, shaking tubes, and pulling hard on a syringe plunger can all damage cells."]
    ],
    quiz: [
      { q: "Which tube is drawn before lavender (EDTA)?", o: ["Gray", "Green (heparin)", "None", "Lavender is first"], a: 1, why: "Green (heparin) comes before lavender in the order of draw." },
      { q: "Light blue tubes contain…", o: ["EDTA", "Sodium citrate", "Heparin", "Sodium fluoride"], a: 1, why: "Light blue = sodium citrate, for coagulation tests." },
      { q: "Maximum tourniquet time?", o: ["30 seconds", "1 minute", "3 minutes", "5 minutes"], a: 1, why: "No more than one minute." },
      { q: "How many patient identifiers before drawing?", o: ["One", "Two", "Three", "None if you know them"], a: 1, why: "Two identifiers every time." },
      { q: "After the draw, the needle…", o: ["Is recapped by hand", "Has its safety device engaged and goes in sharps", "Goes in the trash", "Is reused"], a: 1, why: "Engage the safety device and dispose in a sharps container." }
    ]
  },
  "Barbering & cosmetology": {
    licenses: ["Michigan barber or cosmetology license (LARA)", "Shop / salon license (if you own the shop)"],
    refreshers: [
      ["Clean, then disinfect", "Remove hair and debris first, then use an EPA-registered disinfectant for the full contact time on the label."],
      ["Single-use items", "Throw away single-use items (neck strips, emery boards) after each client."],
      ["When not to service", "Don't work over broken skin, open sores or signs of infection; refer the client to a doctor."]
    ],
    quiz: [
      { q: "Before disinfecting a tool you must…", o: ["Rinse in cold water only", "Clean off hair and debris", "Dry it with a towel", "Nothing"], a: 1, why: "Disinfectants don't work well on dirty surfaces." },
      { q: "Disinfectant contact time comes from…", o: ["Your instructor's guess", "The product label", "Always 10 seconds", "The client"], a: 1, why: "Follow the label's contact time." },
      { q: "A client has an open sore on the scalp. You…", o: ["Work around it", "Don't service that area and suggest a doctor", "Cover it with product", "Use hotter water"], a: 1, why: "Don't service over broken skin or signs of infection." }
    ]
  },
  "Cleaning & environmental": {
    licenses: ["Driver's license", "Background check clearance", "Bloodborne pathogens training"],
    refreshers: [
      ["Read the SDS", "Check the Safety Data Sheet for PPE, mixing warnings and first aid before using a chemical."],
      ["Never mix", "Bleach + ammonia makes toxic chloramine gas. Bleach + acids makes chlorine gas."],
      ["Dwell time", "Disinfectants need to stay wet on the surface for the label's contact time to work."],
      ["Work order", "Top to bottom, clean to dirty, dry to wet. Color-coded cloths keep restroom and kitchen separate."]
    ],
    quiz: [
      { q: "Bleach mixed with ammonia makes…", o: ["A stronger cleaner", "Toxic chloramine gas", "Nothing", "Soap"], a: 1, why: "Never mix bleach and ammonia." },
      { q: "Where do you find a chemical's PPE requirements?", o: ["The SDS", "The receipt", "Coworkers", "Online reviews"], a: 0, why: "The Safety Data Sheet lists PPE and hazards." },
      { q: "Best order for cleaning a room?", o: ["Bottom to top", "Top to bottom", "Floors first", "Any order"], a: 1, why: "Top to bottom so dirt falls onto areas not yet cleaned." }
    ]
  },
  "Business owner": {
    licenses: ["EIN confirmation letter (IRS)", "Michigan LLC Articles of Organization (LARA)", "Assumed name (DBA) certificate", "Certificate of insurance", "Local business license or permits"],
    refreshers: [
      ["Getting set up", "An EIN is free from the IRS. A Michigan LLC is formed by filing Articles of Organization with LARA. Keep business and personal bank accounts separate."],
      ["Paying yourself and taxes", "If you expect to owe, make quarterly estimated payments (Form 1040-ES) so you aren't hit with a big bill and a penalty."],
      ["Paying contractors", "Collect a W-9 before you pay a contractor, and send 1099-NEC forms to those you pay over the IRS threshold. Confirm the current threshold each year."],
      ["Records", "Keep receipts, mileage logs and invoices. Good records make tax time faster and back up your deductions."]
    ],
    quiz: [
      { q: "An EIN from the IRS costs…", o: ["$50", "$125", "Nothing", "Depends on the state"], a: 2, why: "Getting an EIN directly from the IRS is free." },
      { q: "In Michigan, an LLC is formed by filing with…", o: ["The IRS", "LARA", "The county clerk only", "The Secretary of State branch office"], a: 1, why: "Articles of Organization go to LARA." },
      { q: "Before paying a contractor, collect a…", o: ["W-4", "W-9", "1040", "I-9"], a: 1, why: "A W-9 gives you their name and TIN for the 1099." },
      { q: "Quarterly estimated taxes are paid with…", o: ["Form 1040-ES", "Form W-2", "Form 8867", "Schedule A"], a: 0, why: "Form 1040-ES vouchers or online payments." }
    ]
  },
  "Other": { licenses: ["Driver's license"], refreshers: [], quiz: [] }
};
window.LEARN_EXTRA = { "HVAC/R": ["EPA 608"] };

/* Free diagrams. Elements: ['box',x,y,w,h,label] ['text',x,y,text,size,anchor,color] ['line',[pts],color,width,arrow] ['term',x,y,label] ['tube',x,y,color,label] */
(function () {
  var R = '#C0392B', C = '#2E5AAC', W = '#8A8A8A', Y = '#C9A227', G = '#2E8B57', O = '#E67E22', B = '#5DADE2';
  window.DIAGRAMS = [
    { field: 'HVAC/R', title: 'Basic thermostat wiring: gas furnace + AC', w: 660, h: 320, el: [
      ['box', 20, 30, 110, 240, 'Thermostat'],
      ['term', 130, 70, 'R'], ['term', 130, 110, 'C'], ['term', 130, 150, 'W'], ['term', 130, 190, 'Y'], ['term', 130, 230, 'G'],
      ['box', 260, 30, 150, 240, 'Furnace control board'],
      ['term', 260, 70, 'R'], ['term', 260, 110, 'C'], ['term', 260, 150, 'W'], ['term', 260, 190, 'Y'], ['term', 260, 230, 'G'],
      ['line', [130, 70, 260, 70], R], ['line', [130, 110, 260, 110], C], ['line', [130, 150, 260, 150], W], ['line', [130, 190, 260, 190], Y], ['line', [130, 230, 260, 230], G],
      ['term', 410, 190, 'Y'], ['term', 410, 110, 'C'],
      ['box', 510, 130, 130, 110, 'Condenser (contactor coil)'], ['term', 510, 165, 'Y'], ['term', 510, 210, 'C'],
      ['line', [410, 190, 455, 190, 455, 165, 510, 165], Y], ['line', [410, 110, 475, 110, 475, 210, 510, 210], C],
      ['text', 330, 296, 'R = 24V hot, C = common. Cooling call: R→Y (compressor) and R→G (fan). Heat call: R→W. Wire colors vary; go by the terminal letter.', 10, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Refrigeration cycle', w: 660, h: 330, el: [
      ['text', 330, 22, 'HIGH SIDE', 12, 'middle', R], ['text', 330, 318, 'LOW SIDE', 12, 'middle', C],
      ['box', 230, 35, 200, 50, 'Condenser (heat out)'], ['box', 500, 140, 140, 50, 'Metering device'],
      ['box', 230, 245, 200, 50, 'Evaporator (heat in)'], ['box', 20, 140, 140, 50, 'Compressor'],
      ['line', [90, 140, 90, 60, 230, 60], R, 3, true], ['text', 100, 50, 'Discharge: hot gas', 11, 'start'],
      ['line', [430, 60, 570, 60, 570, 140], O, 3, true], ['text', 560, 50, 'Liquid line', 11, 'end'],
      ['line', [570, 190, 570, 270, 430, 270], B, 3, true], ['text', 580, 235, 'Low-pressure mix', 11, 'start'],
      ['line', [230, 270, 90, 270, 90, 190], C, 3, true], ['text', 100, 290, 'Suction: cool vapor', 11, 'start'],
      ['text', 330, 160, 'Superheat is measured on the suction line;', 11, 'middle'], ['text', 330, 178, 'subcooling on the liquid line.', 11, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Near-boiler piping (pumping away)', w: 660, h: 340, el: [
      ['box', 30, 130, 120, 160, 'Boiler'], ['box', 50, 95, 80, 26, 'Relief 30 PSI'], ['line', [90, 121, 90, 130], W],
      ['line', [150, 160, 260, 160], R, 3], ['box', 260, 140, 60, 40, 'Air sep.'], ['text', 290, 118, 'Auto air vent', 11, 'middle'], ['line', [290, 122, 290, 140], W],
      ['line', [290, 180, 290, 235], W, 2], ['box', 265, 235, 50, 70, 'Exp. tank'],
      ['line', [420, 205, 290, 205], G, 2], ['text', 428, 200, 'Cold water fill: backflow preventer +', 11, 'start'], ['text', 428, 215, 'pressure reducing valve (~12 PSI)', 11, 'start'],
      ['line', [320, 160, 380, 160], R, 3], ['box', 380, 142, 54, 36, 'Pump'], ['line', [434, 160, 630, 160], R, 3, true], ['text', 630, 150, 'Supply to system', 11, 'end'],
      ['line', [630, 280, 150, 280], C, 3, true], ['text', 630, 300, 'Return from system', 11, 'end'],
      ['box', 380, 268, 60, 24, 'Iso valve'], ['box', 200, 268, 70, 24, 'Purge cock'],
      ['text', 330, 30, 'The circulator pumps AWAY from the expansion tank, where pressure never changes', 11, 'middle'],
      ['text', 330, 46, '(the point of no pressure change). 1 GPM per 10,000 BTU at a 20°F ΔT.', 11, 'middle']
    ] },
    { field: 'Phlebotomy & medical', title: 'Order of draw', w: 660, h: 220, el: [
      ['tube', 40, 40, '#F2D7D5', '1 · Blood cultures'], ['tube', 140, 40, '#85C1E9', '2 · Light blue (citrate)'], ['tube', 240, 40, '#C0392B', '3 · Red / gold (serum)'],
      ['tube', 340, 40, '#27AE60', '4 · Green (heparin)'], ['tube', 440, 40, '#9B59B6', '5 · Lavender (EDTA)'], ['tube', 540, 40, '#95A5A6', '6 · Gray (fluoride)'],
      ['text', 330, 205, 'Invert additive tubes gently. Fill light blue completely (9:1).', 12, 'middle']
    ] }
  ];
})();
