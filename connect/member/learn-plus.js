/* Connect — study topics: more flashcards and quiz questions grouped by topic, plus extra diagrams.
   Study aids only. Confirm with your instructor, the manufacturer's data and the official study guide. */
(function () {
  var T = window.LEARN_TOPICS = {};
  function q(q, o, a, why) { return { q: q, o: o, a: a, why: why }; }

  T['HVAC/R'] = [
    { topic: 'Electrical & controls', cards: [
      ['Ohm\'s law', 'Volts = Amps × Ohms (E = I × R). Watts = Volts × Amps. If you know two, you can find the third.'],
      ['Control transformer', 'Steps line voltage (120 or 240V) down to 24V for the thermostat circuit. Common size is 40 VA. The R side is hot, C is common.'],
      ['Contactor', 'A relay with a 24V coil that closes high-voltage contacts to start the compressor and condenser fan. Pitted or burned contacts mean replace it.'],
      ['Run capacitor', 'Helps a PSC motor or compressor run efficiently. Replace with the same microfarad (µF) rating and the same or higher voltage rating.'],
      ['Compressor windings', 'Measure resistance: Common-to-Run is lowest, Common-to-Start is in the middle, Run-to-Start is highest and equals the other two added together.'],
      ['Checking for voltage safely', 'Test your meter on a known live source, test the circuit, then test the meter again. Lock out and tag out before touching wiring.'],
      ['Open vs short', 'An open circuit reads infinite resistance (OL) and no current flows. A short reads near zero ohms and can trip breakers or burn components.'],
      ['Sequence of a cooling call', 'Thermostat closes R to Y and R to G. Y energizes the contactor coil outside. G brings on the indoor blower.']
    ], quiz: [
      q('A circuit has 24 volts and 8 ohms of resistance. How many amps?', ['0.33 A', '3 A', '32 A', '192 A'], 1, 'Amps = Volts ÷ Ohms. 24 ÷ 8 = 3 A.'),
      q('What does a control transformer usually supply to the thermostat circuit?', ['12V DC', '24V AC', '120V AC', '240V AC'], 1, 'Most residential control circuits run on 24V AC.'),
      q('Which part uses a 24V coil to switch high voltage to the compressor?', ['Capacitor', 'Contactor', 'Thermostat', 'Fuse'], 1, 'The contactor coil is 24V; its contacts carry line voltage.'),
      q('Replacing a run capacitor, the voltage rating should be…', ['Lower', 'The same or higher', 'Any value', 'Half'], 1, 'Match the µF and use the same or higher voltage rating.'),
      q('Which compressor winding reading is the highest?', ['Common to Run', 'Common to Start', 'Run to Start', 'All equal'], 2, 'Run-to-Start is the highest and equals C-R plus C-S.'),
      q('Your meter reads OL across a winding. That means…', ['A short', 'An open', 'Normal', 'Low voltage'], 1, 'OL (infinite resistance) means the circuit is open.'),
      q('On a cooling call, the thermostat connects R to…', ['W and E', 'Y and G', 'C only', 'O and B'], 1, 'Y calls the compressor; G calls the indoor fan.'),
      q('Before touching wires you have switched off, you should…', ['Just start working', 'Verify with a tested meter and lock out', 'Wear gloves only', 'Call the customer'], 1, 'Test-before-touch and lockout/tagout every time.')
    ] },
    { topic: 'Refrigeration & charging', cards: [
      ['Superheat', 'Suction line temperature minus the saturation temperature at suction pressure. Used to charge fixed-orifice (piston) systems.'],
      ['Subcooling', 'Saturation temperature at liquid pressure minus the liquid line temperature. Used to charge TXV systems.'],
      ['Reading superheat', 'High superheat points to low charge or a restriction. Low superheat points to overcharge or a flooding evaporator.'],
      ['Non-condensables', 'Air or nitrogen left in the system collects in the condenser and raises head pressure. Evacuate properly to prevent it.'],
      ['Evacuation', 'Pull a deep vacuum, commonly to 500 microns, then isolate the pump and watch for the reading to hold. A rising reading means a leak or moisture.'],
      ['Filter drier', 'Catches moisture and debris. Replace it any time the system is opened to the atmosphere.'],
      ['Blends', 'Blends like R-410A are charged as a liquid so the mix stays correct. Meter it in slowly on the low side.'],
      ['Tons and BTUs', 'One ton of cooling = 12,000 BTU per hour.']
    ], quiz: [
      q('Superheat is measured on the…', ['Liquid line', 'Suction line', 'Discharge line', 'Condensate line'], 1, 'Superheat is a suction line reading.'),
      q('Which systems are charged by subcooling?', ['Piston / fixed orifice', 'TXV systems', 'Capillary tube only', 'None'], 1, 'TXV systems hold superheat steady, so charge by subcooling.'),
      q('High superheat usually means…', ['Overcharge', 'Low charge or a restriction', 'Dirty condenser', 'Too much airflow outside'], 1, 'The evaporator is starved of refrigerant.'),
      q('Air in the system causes…', ['Low head pressure', 'High head pressure', 'No change', 'Lower amps'], 1, 'Non-condensables raise condensing (head) pressure.'),
      q('A common evacuation target is about…', ['5,000 microns', '500 microns', '50 PSI', '0 PSI'], 1, 'Many manufacturers call for 500 microns and a hold test.'),
      q('When should the filter drier be replaced?', ['Every 10 years', 'Whenever the system is opened', 'Never', 'Only on heat pumps'], 1, 'Opening the system lets in moisture; new drier every time.'),
      q('R-410A should be charged as a…', ['Vapor into the high side', 'Liquid, metered in', 'Gas from the top of the tank', 'Any way'], 1, 'Blends are charged as liquid so the mix stays in spec.'),
      q('How many BTU per hour is one ton?', ['1,000', '6,000', '12,000', '24,000'], 2, '1 ton = 12,000 BTU/h.')
    ] },
    { topic: 'Gas heat & combustion', cards: [
      ['Induced-draft sequence', 'Call for heat → inducer starts → pressure switch closes → igniter heats → gas valve opens → flame sensor proves flame → blower starts after a delay.'],
      ['Flame sensor', 'Proves flame by flame rectification and reads a few microamps. A dirty rod makes burners light then shut off; clean it gently.'],
      ['Manifold pressure', 'Natural gas is commonly about 3.5 inches water column; propane (LP) about 10 to 11 inches. Always set to the furnace data plate.'],
      ['Natural gas vs propane', 'Natural gas is lighter than air and rises. Propane is heavier than air and settles in low spots.'],
      ['High limit', 'Opens when the heat exchanger gets too hot, often from a dirty filter or a blocked return. Find the airflow cause, don\'t just reset it.'],
      ['Carbon monoxide', 'CO has no color or smell. A cracked heat exchanger or poor venting can put it in the home. Use a combustion analyzer and a CO detector.'],
      ['Condensing furnaces', '90%+ efficiency. They make water, so they need a condensate drain and usually PVC venting.']
    ], quiz: [
      q('In an induced-draft furnace, what must close before the igniter heats?', ['High limit', 'Pressure switch', 'Rollout switch', 'Door switch'], 1, 'The pressure switch proves the inducer is venting.'),
      q('Burners light then shut off after a few seconds. A common cause is…', ['Dirty flame sensor', 'Bad thermostat wire color', 'Too much gas', 'Clean filter'], 0, 'No flame signal, so the board closes the gas valve.'),
      q('Typical natural gas manifold pressure?', ['0.5" w.c.', '3.5" w.c.', '11" w.c.', '30 PSI'], 1, 'About 3.5 inches water column; follow the data plate.'),
      q('Which gas settles in low areas?', ['Natural gas', 'Propane', 'Both', 'Neither'], 1, 'Propane is heavier than air.'),
      q('The high limit keeps tripping. Check first for…', ['A dirty filter or blocked return', 'Low gas smell', 'Thermostat batteries', 'Outdoor temperature'], 0, 'Low airflow overheats the heat exchanger.'),
      q('Why does a condensing furnace need a drain?', ['For gas', 'It produces water from flue gases', 'For oil', 'It doesn\'t'], 1, 'Cooling the flue gas below dew point makes condensate.'),
      q('Carbon monoxide is…', ['Easy to smell', 'Colorless and odorless', 'Blue', 'Harmless'], 1, 'Test with instruments; you can\'t sense it.')
    ] },
    { topic: 'Hydronics & steam', cards: [
      ['Primary-secondary piping', 'Closely spaced tees, no more than about 4 pipe diameters apart, let each loop have its own circulator without fighting the other.'],
      ['Expansion tank', 'Absorbs water expansion as it heats. Pump away from it, because its connection is the point of no pressure change.'],
      ['Steam traps', 'Let condensate and air pass back to the return but stop steam.'],
      ['Low water cutoff', 'Shuts the burner off if a steam boiler\'s water drops too low. Blow it down as the manufacturer says.'],
      ['Sight glass', 'On a steam boiler, normal water level is about halfway up the glass.'],
      ['Purging air', 'Air in hydronic loops causes noise and no-heat zones. Purge loops one at a time with the fill valve open.']
    ], quiz: [
      q('Closely spaced tees in primary-secondary piping should be within about…', ['4 pipe diameters', '4 feet', '10 feet', 'Any distance'], 0, 'Keep them close so the loops don\'t interfere.'),
      q('What lets condensate return but blocks steam?', ['Zone valve', 'Steam trap', 'Check valve', 'Relief valve'], 1, 'That\'s the job of a steam trap.'),
      q('A low water cutoff protects the boiler by…', ['Adding water', 'Shutting off the burner', 'Opening the relief valve', 'Starting the pump'], 1, 'No water + fire = damaged boiler.'),
      q('Normal water level in a steam boiler sight glass is about…', ['Empty', 'Half full', 'Completely full', 'Doesn\'t matter'], 1, 'About halfway.'),
      q('The circulator should pump…', ['Toward the expansion tank', 'Away from the expansion tank', 'Into the relief valve', 'Either way'], 1, 'Pumping away keeps system pressure up where it counts.'),
      q('Gurgling and a cold zone usually mean…', ['Air in the loop', 'Too much gas', 'Bad thermostat', 'Low voltage'], 0, 'Purge the air from that loop.')
    ] },
    { topic: 'Airflow & heat pumps', cards: [
      ['Airflow rule of thumb', 'About 400 CFM per ton of cooling. Too little airflow can freeze the coil.'],
      ['Static pressure', 'Measured in inches of water column. High static means restriction: dirty filters, closed registers or small ducts.'],
      ['Reversing valve', 'Switches a heat pump between heating and cooling. Many brands energize O in cooling; some energize B in heating.'],
      ['Defrost', 'In heating the outdoor coil can frost. Defrost switches to cooling briefly, stops the outdoor fan and brings on auxiliary heat.'],
      ['Balance point', 'The outdoor temperature where the heat pump\'s output equals the home\'s heat loss. Below it, auxiliary heat helps.'],
      ['Emergency heat', 'E or EM locks out the compressor and runs only backup heat. Use it when the heat pump itself has failed.']
    ], quiz: [
      q('About how much airflow per ton?', ['100 CFM', '400 CFM', '1,000 CFM', '40 CFM'], 1, 'Nominal 400 CFM per ton.'),
      q('High static pressure means…', ['Too much refrigerant', 'Airflow restriction', 'Low voltage', 'Gas leak'], 1, 'Check filters, coils, ducts and registers.'),
      q('During defrost, the outdoor fan…', ['Speeds up', 'Stops', 'Reverses', 'Runs on high'], 1, 'The fan stops so the coil warms faster.'),
      q('Below the balance point, the home needs…', ['Less heat', 'Auxiliary heat', 'Cooling', 'Nothing'], 1, 'The heat pump alone can\'t keep up.'),
      q('Emergency heat does what?', ['Runs compressor faster', 'Locks out the compressor and uses backup heat', 'Cools the house', 'Defrosts the coil'], 1, 'For when the heat pump fails.'),
      q('What switches a heat pump between modes?', ['Contactor', 'Reversing valve', 'TXV', 'Filter drier'], 1, 'The reversing valve redirects refrigerant flow.')
    ] },
    { topic: 'Safety & tools', cards: [
      ['Lockout / tagout', 'Turn off, lock and tag the disconnect, then verify it\'s dead before work.'],
      ['Nitrogen', 'Use dry nitrogen with a regulator for pressure tests and brazing purge. Never use oxygen or compressed air.'],
      ['Refrigerant in tight spaces', 'Refrigerant is heavier than air and can push out oxygen in basements and crawl spaces. Ventilate.'],
      ['Ladders', 'Extension ladders should extend about 3 feet above the landing, with a 4-to-1 setup angle.'],
      ['Brazing', 'Flow nitrogen through the pipe while brazing to keep scale from forming inside.']
    ], quiz: [
      q('Which gas is safe for pressure testing a system?', ['Oxygen', 'Dry nitrogen', 'Compressed air', 'Propane'], 1, 'Oxygen with oil can explode; use nitrogen.'),
      q('An extension ladder should extend above the roof edge about…', ['6 inches', '3 feet', '10 feet', 'Doesn\'t matter'], 1, 'About 3 feet for a safe step-off.'),
      q('Why flow nitrogen while brazing?', ['To cool the joint', 'To stop scale inside the pipe', 'To speed it up', 'It\'s not needed'], 1, 'Scale clogs metering devices and filters.'),
      q('Refrigerant leaks in a basement are dangerous because…', ['It\'s lighter than air', 'It can push out oxygen', 'It smells bad', 'It\'s magnetic'], 1, 'Heavier-than-air refrigerant displaces oxygen.'),
      q('Lockout/tagout means…', ['Turning off the thermostat', 'Locking and tagging the power source and verifying it\'s off', 'Telling the customer', 'Wearing gloves'], 1, 'Lock, tag, verify.')
    ] }
  ];

  T['EPA 608'] = [
    { topic: 'Core', cards: [
      ['Ozone layer', 'Chlorine from CFCs and HCFCs breaks down ozone in the stratosphere, which protects us from UV light.'],
      ['Recover, recycle, reclaim', 'Recover = remove and store. Recycle = clean it on site for reuse. Reclaim = reprocess to new-product purity (AHRI 700), checked by a lab.'],
      ['Venting', 'Knowingly venting refrigerant during service, maintenance, repair or disposal is illegal under Clean Air Act Section 608.'],
      ['Cylinder safety', 'Fill recovery cylinders to no more than 80% liquid. Don\'t heat cylinders above 125°F.'],
      ['Dehydration', 'Evacuation removes air and moisture. Moisture makes acids that damage the system.'],
      ['Who can buy', 'Only certified technicians may buy regulated refrigerants for servicing.'],
      ['Recovery cylinders', 'Gray body with a yellow top. Use DOT-approved recovery cylinders only.'],
      ['Leak checking', 'Use soap bubbles, electronic detectors or ultrasonic tools. Pressurize with nitrogen, never oxygen or air.']
    ], quiz: [
      q('Which part of a CFC destroys ozone?', ['Fluorine', 'Chlorine', 'Carbon', 'Hydrogen'], 1, 'Chlorine breaks down ozone molecules.'),
      q('Reclaiming refrigerant means…', ['Storing it', 'Cleaning it in the field', 'Reprocessing it to new-product purity', 'Venting it'], 2, 'Reclaim = AHRI 700 purity, verified by analysis.'),
      q('Maximum liquid fill for a recovery cylinder?', ['50%', '80%', '95%', '100%'], 1, '80% leaves room for expansion.'),
      q('Recovery cylinders are colored…', ['Green', 'Gray with a yellow top', 'Red', 'Blue'], 1, 'Gray body, yellow shoulder.'),
      q('Moisture left in a system can form…', ['Acid', 'Ice only', 'Nothing', 'Oil'], 0, 'Moisture + refrigerant + heat makes acids.'),
      q('Knowingly venting refrigerant during service is…', ['Allowed', 'Illegal', 'Allowed on weekends', 'Allowed for small amounts'], 1, 'Prohibited under the Clean Air Act.'),
      q('Never heat a refrigerant cylinder above about…', ['75°F', '125°F', '200°F', '300°F'], 1, 'Pressure rises fast; keep it under 125°F.'),
      q('Which may be used to pressurize for a leak test?', ['Oxygen', 'Compressed air', 'Dry nitrogen', 'Propane'], 2, 'Dry nitrogen, through a regulator.')
    ] },
    { topic: 'Type I · small appliances', cards: [
      ['What counts', 'Factory-sealed appliances with 5 pounds or less of refrigerant: fridges, window ACs, dehumidifiers, vending machines.'],
      ['Recovery targets', 'With recovery equipment made after Nov 15, 1993: recover 90% if the compressor runs, 80% if it doesn\'t, or pull to 4 inches of mercury vacuum.'],
      ['Passive recovery', 'System-dependent recovery uses the appliance\'s own compressor or pressure to push refrigerant into a container.'],
      ['Piercing valves', 'Remove or replace access (piercing) valves after service; they can leak over time.']
    ], quiz: [
      q('Type I covers appliances with…', ['5 lb or less', '50 lb or more', 'Low-pressure chillers', 'Car AC'], 0, 'Small, factory-sealed, 5 lb or less.'),
      q('Compressor works, newer recovery equipment: recover…', ['50%', '80%', '90%', '100%'], 2, '90% when the compressor is operational.'),
      q('Compressor doesn\'t work: recover…', ['80%', '90%', '99%', '0%'], 0, '80% when the compressor is not operational.'),
      q('Why remove piercing valves after service?', ['They look bad', 'They can leak', 'They\'re expensive', 'Law requires gold ones'], 1, 'They are a common leak point.')
    ] },
    { topic: 'Type II · high pressure', cards: [
      ['What counts', 'High- and very-high-pressure systems such as R-22 and R-410A: residential AC, heat pumps, commercial refrigeration.'],
      ['Liquid recovery', 'Recovering liquid first is faster. Finish with vapor recovery.'],
      ['Leak signs', 'Oily spots on fittings and coils, low suction pressure and high superheat can point to a leak.'],
      ['Charging blends', 'Charge blends as liquid, metered slowly into the low side so you don\'t slug the compressor.'],
      ['Trace gas', 'A small amount of R-22 may be added to nitrogen as a trace gas for electronic leak detection.']
    ], quiz: [
      q('R-410A systems fall under…', ['Type I', 'Type II', 'Type III', 'None'], 1, 'High-pressure appliances are Type II.'),
      q('Which recovers faster?', ['Vapor', 'Liquid', 'Both the same', 'Neither'], 1, 'Liquid moves much more refrigerant per minute.'),
      q('Oily residue on a fitting usually means…', ['Normal', 'A possible leak', 'Too much charge', 'Good brazing'], 1, 'Oil travels with escaping refrigerant.'),
      q('Blends should be charged as…', ['Vapor', 'Liquid', 'Solid', 'Either'], 1, 'Liquid keeps the blend ratio right.'),
      q('Which may be used as a trace gas with nitrogen?', ['Oxygen', 'R-22 in small amounts', 'Propane', 'Helium only'], 1, 'A trace of R-22 with nitrogen is allowed for leak detection.')
    ] },
    { topic: 'Type III · low pressure', cards: [
      ['What counts', 'Low-pressure chillers using refrigerants like R-11 and R-123. They run below atmospheric pressure.'],
      ['Leaks pull air in', 'Because the system is in a vacuum, leaks let air and moisture in. A purge unit removes non-condensables.'],
      ['Rupture disc', 'The evaporator rupture disc is commonly set at 15 psig.'],
      ['Recovery', 'Recover liquid first, then vapor. Keep water circulating in the tubes so they don\'t freeze.']
    ], quiz: [
      q('Low-pressure chillers operate…', ['Far above atmospheric', 'Below atmospheric pressure', 'At exactly 0 psig', 'At 300 psig'], 1, 'That\'s why leaks let air in.'),
      q('A purge unit removes…', ['Oil', 'Non-condensables', 'Refrigerant', 'Water from tubes'], 1, 'It vents air that leaked in.'),
      q('Typical rupture disc setting on a low-pressure evaporator?', ['5 psig', '15 psig', '50 psig', '150 psig'], 1, '15 psig.'),
      q('During recovery from a chiller, keep water circulating to…', ['Speed it up', 'Prevent tube freezing', 'Clean the tubes', 'Cool the room'], 1, 'Low pressure means low temperature; tubes can freeze.')
    ] }
  ];

  T['Tax preparation'] = [
    { topic: 'Filing basics', cards: [
      ['Due date', 'Individual returns are usually due April 15. If it falls on a weekend or holiday, the next business day.'],
      ['Extensions', 'Form 4868 extends the time to file, not the time to pay. Estimate and pay what you owe by the due date.'],
      ['W-2 vs 1099-NEC', 'W-2 workers have tax withheld by the employer. 1099-NEC contractors usually owe their own income and self-employment tax.'],
      ['Self-employment tax', '15.3% (Social Security and Medicare) on net self-employment earnings, figured on Schedule SE.'],
      ['Estimated payments', 'Use Form 1040-ES. Usual due dates: April 15, June 15, September 15 and January 15.'],
      ['Records', 'Keep returns and records at least 3 years; longer in some cases.']
    ], quiz: [
      q('Form 4868 extends…', ['Time to pay', 'Time to file', 'Both', 'Neither'], 1, 'It extends filing only; interest runs on unpaid tax.'),
      q('Self-employment tax rate on net earnings?', ['7.65%', '15.3%', '22%', '2.9%'], 1, '12.4% Social Security + 2.9% Medicare.'),
      q('Which form reports contractor pay?', ['W-2', '1099-NEC', 'W-4', '1098'], 1, 'Nonemployee compensation goes on 1099-NEC.'),
      q('Which of these is a usual estimated tax due date?', ['March 1', 'June 15', 'August 1', 'December 31'], 1, 'April 15, June 15, Sept 15, Jan 15.'),
      q('Keep tax records at least…', ['1 year', '3 years', '6 months', 'Forever by law'], 1, 'Three years is the general rule.')
    ] },
    { topic: 'Preparer rules', cards: [
      ['PTIN', 'Every paid preparer needs a Preparer Tax Identification Number and must renew it each year.'],
      ['Consent to use or disclose', 'Under IRC §7216, preparers need written client consent before using or sharing return information for other purposes.'],
      ['Due diligence', 'Form 8867 covers due diligence for EITC, the Child Tax Credit, the American Opportunity Credit and Head of Household status.'],
      ['Identity check', 'Verify the client\'s identity and keep copies of the documents you relied on.']
    ], quiz: [
      q('Paid preparers must have a…', ['EIN', 'PTIN', 'DBA', 'CPA license'], 1, 'PTIN, renewed yearly.'),
      q('Form 8867 is about…', ['Extensions', 'Due diligence for certain credits and HOH', 'Payroll', 'Gifts'], 1, 'EITC, CTC/ACTC/ODC, AOTC and HOH.'),
      q('Sharing return info for marketing needs…', ['Nothing', 'Written client consent', 'A phone call', 'IRS approval'], 1, 'IRC §7216 consent rules.')
    ] }
  ];

  T['Home care'] = [
    { topic: 'Safety & care', cards: [
      ['Hand hygiene', 'Wash with soap and water for at least 20 seconds, before and after care and after removing gloves.'],
      ['Body mechanics', 'Bend your knees, keep the load close, don\'t twist. Ask for help or use the right equipment.'],
      ['Fall prevention', 'Clear clutter, use non-slip footwear, keep lights on at night and keep the walker within reach.'],
      ['Stroke signs (BE FAST)', 'Balance, Eyes, Face drooping, Arm weakness, Speech trouble, Time to call 911.'],
      ['Pressure injuries', 'Reposition bed-bound clients often, commonly every 2 hours, and check bony areas for redness.'],
      ['Privacy', 'Client health information stays private. Share only with people who need it for care.']
    ], quiz: [
      q('Wash hands for at least…', ['5 seconds', '20 seconds', '2 minutes', '1 second'], 1, 'At least 20 seconds with soap.'),
      q('In BE FAST, the T stands for…', ['Temperature', 'Time to call 911', 'Tongue', 'Tired'], 1, 'Stroke is an emergency.'),
      q('Bed-bound clients are commonly repositioned about every…', ['8 hours', '2 hours', 'Once a day', 'Never'], 1, 'About every 2 hours.'),
      q('When lifting, you should…', ['Twist at the waist', 'Bend your knees and keep the load close', 'Lift with your back', 'Hold your breath'], 1, 'Protect your back.')
    ] }
  ];

  T['Phlebotomy & medical'] = [
    { topic: 'Draw technique', cards: [
      ['Patient ID', 'Use two identifiers, like full name and date of birth, before every draw.'],
      ['Tourniquet', 'Leave it on no more than 1 minute to avoid changing results.'],
      ['Needle angle', 'Insert about 15 to 30 degrees, bevel up.'],
      ['Hemolysis', 'Small needles, shaking tubes or pulling hard on a syringe can burst red cells and ruin the sample.'],
      ['Needle safety', 'Never recap. Activate the safety device and drop it straight into the sharps container.'],
      ['Fainting', 'Remove the needle and tourniquet, lower the patient\'s head and call for help.']
    ], quiz: [
      q('How many patient identifiers?', ['One', 'Two', 'None', 'Three photos'], 1, 'Two identifiers every time.'),
      q('Maximum tourniquet time?', ['30 seconds', '1 minute', '5 minutes', '10 minutes'], 1, 'One minute.'),
      q('Insertion angle is about…', ['5°', '15–30°', '45–60°', '90°'], 1, '15 to 30 degrees, bevel up.'),
      q('After a draw, used needles…', ['Get recapped', 'Go straight in the sharps container', 'Go in the trash', 'Get washed'], 1, 'Never recap.')
    ] }
  ];

  T['Barbering & cosmetology'] = [
    { topic: 'Sanitation & safety', cards: [
      ['Clean, then disinfect', 'Remove hair and debris first. Then use an EPA-registered disinfectant for the full contact time on the label.'],
      ['Clippers and shears', 'Brush out hair, spray or dip with disinfectant, and let them stay wet for the contact time.'],
      ['Single-use items', 'Neck strips, razor blades and files that can\'t be disinfected get thrown away after one client.'],
      ['Licensing', 'In Michigan, barber and cosmetology licenses come from LARA. Shops need their own license too.'],
      ['Scalp conditions', 'Don\'t service open sores or signs of infection. Kindly suggest they see a doctor.']
    ], quiz: [
      q('Before disinfecting a tool you must…', ['Dry it', 'Clean off hair and debris', 'Heat it', 'Nothing'], 1, 'Disinfectant can\'t work through debris.'),
      q('Disinfectant must stay wet for…', ['A few seconds', 'The label\'s contact time', '1 hour always', 'It doesn\'t matter'], 1, 'Follow the label.'),
      q('Razor blades are…', ['Reused after wiping', 'Single use', 'Washed with soap', 'Kept in a drawer'], 1, 'New blade every client.')
    ] }
  ];

  T['Cleaning & environmental'] = [
    { topic: 'Chemical safety', cards: [
      ['SDS', 'Safety Data Sheets tell you a product\'s hazards, PPE and first aid. Know where they are.'],
      ['Never mix', 'Bleach plus ammonia makes toxic gas. Bleach plus acids makes chlorine gas.'],
      ['Dwell time', 'Disinfectants only work if left wet for the label\'s time.'],
      ['Work order', 'Clean top to bottom and dry to wet, so dirt falls onto areas you haven\'t cleaned yet.'],
      ['Color coding', 'Use separate colored cloths for restrooms and kitchens so germs don\'t travel.']
    ], quiz: [
      q('Mixing bleach and ammonia creates…', ['A better cleaner', 'Toxic gas', 'Soap', 'Nothing'], 1, 'Never mix them.'),
      q('Where do you find a product\'s hazards and PPE?', ['The SDS', 'The receipt', 'The website ad', 'The bucket'], 0, 'Safety Data Sheet.'),
      q('Clean in which order?', ['Bottom to top', 'Top to bottom', 'Any', 'Floors first'], 1, 'Top to bottom.')
    ] }
  ];

  T['Business owner'] = [
    { topic: 'Getting set up', cards: [
      ['LLC', 'A limited liability company helps separate business debts from your personal assets. In Michigan you file with LARA.'],
      ['EIN', 'Get a free Employer Identification Number from the IRS at irs.gov. Never pay a website for it.'],
      ['Separate bank account', 'Keep business money in its own account. It makes taxes and bookkeeping much easier.'],
      ['DBA', 'An assumed name (DBA) lets you do business under a name other than your legal one.'],
      ['Insurance', 'General liability and, if you have workers, workers\' comp. Many jobs ask for a certificate of insurance.'],
      ['Bookkeeping', 'Record every sale and expense, keep receipts, and reconcile your bank account monthly.']
    ], quiz: [
      q('An EIN from the IRS costs…', ['$50', 'Nothing', '$250', '$1,000'], 1, 'It\'s free at irs.gov.'),
      q('Why keep a separate business account?', ['Required for fun', 'Cleaner books and taxes', 'Higher interest', 'No reason'], 1, 'Keeps records clean.'),
      q('Michigan LLCs are filed with…', ['The IRS', 'LARA', 'The city', 'Your bank'], 1, 'Michigan LARA.')
    ] }
  ];

  /* more diagrams */
  var R = '#C0392B', C = '#2E5AAC', W = '#8A8A8A', Y = '#C9A227', G = '#2E8B57', O = '#E67E22', B = '#5DADE2';
  var D = window.DIAGRAMS = window.DIAGRAMS || [];
  D.push(
    { field: 'HVAC/R', title: 'Gas furnace sequence of operation', w: 660, h: 300, el: [
      ['box', 20, 40, 110, 50, 'Call for heat'], ['box', 160, 40, 110, 50, 'Inducer on'], ['box', 300, 40, 140, 50, 'Pressure switch closes'], ['box', 470, 40, 170, 50, 'Igniter heats (HSI)'],
      ['line', [130, 65, 160, 65], C, 2.5, true], ['line', [270, 65, 300, 65], C, 2.5, true], ['line', [440, 65, 470, 65], C, 2.5, true], ['line', [555, 90, 555, 150], C, 2.5, true],
      ['box', 470, 150, 170, 50, 'Gas valve opens'], ['box', 260, 150, 180, 50, 'Flame sensor proves'], ['box', 20, 150, 210, 50, 'Blower on after delay'],
      ['line', [470, 175, 440, 175], C, 2.5, true], ['line', [260, 175, 230, 175], C, 2.5, true],
      ['text', 330, 250, 'If the flame isn\'t proven, the gas valve closes and the board retries, then locks out.', 11, 'middle'],
      ['text', 330, 270, 'A dirty flame sensor is a common cause of short heating cycles.', 11, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Compressor terminals and run capacitor', w: 660, h: 300, el: [
      ['box', 60, 60, 200, 180, 'Compressor'], ['term', 110, 140, 'C'], ['term', 160, 110, 'R'], ['term', 210, 140, 'S'],
      ['box', 400, 70, 180, 60, 'Dual run capacitor'], ['term', 430, 130, 'HERM'], ['term', 490, 130, 'C'], ['term', 550, 130, 'FAN'],
      ['line', [210, 140, 300, 140, 300, 160, 430, 160, 430, 130], O, 2.5], ['line', [160, 110, 160, 40, 490, 40, 490, 70], R, 2.5],
      ['text', 330, 270, 'Resistance: C-R lowest, C-S middle, R-S highest (= C-R + C-S). Discharge capacitors before testing.', 11, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Heat pump in heating mode', w: 660, h: 320, el: [
      ['box', 20, 130, 140, 50, 'Compressor'], ['box', 230, 130, 150, 50, 'Reversing valve'],
      ['box', 470, 40, 170, 50, 'Indoor coil (condenser)'], ['box', 470, 230, 170, 50, 'Outdoor coil (evaporator)'],
      ['line', [160, 155, 230, 155], R, 3, true], ['line', [380, 145, 430, 145, 430, 65, 470, 65], R, 3, true], ['text', 440, 30, 'Hot gas heats the house', 11, 'start'],
      ['line', [555, 90, 555, 230], O, 3, true], ['text', 565, 165, 'Liquid through metering', 11, 'start'],
      ['line', [470, 255, 430, 255, 430, 170, 380, 170], C, 3, true], ['line', [230, 170, 90, 170, 90, 180], C, 3], ['text', 200, 300, 'In cooling, the reversing valve swaps which coil gets the hot gas.', 11, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Steam boiler with Hartford loop', w: 660, h: 320, el: [
      ['box', 40, 120, 150, 170, 'Steam boiler'], ['box', 55, 90, 120, 24, 'Relief 15 PSI'], ['box', 205, 160, 70, 40, 'Sight glass'], ['box', 205, 220, 90, 40, 'Low water cutoff'],
      ['line', [190, 135, 600, 135], R, 3, true], ['text', 600, 125, 'Steam supply', 11, 'end'],
      ['line', [600, 280, 360, 280, 360, 245, 330, 245], C, 3, true], ['text', 600, 300, 'Condensate return', 11, 'end'],
      ['line', [330, 245, 330, 200, 190, 200], C, 3, true], ['text', 335, 190, 'Hartford loop (close nipple ~2" below water line)', 11, 'start'],
      ['text', 330, 40, 'Normal water level about half the sight glass. Runs under about 2 PSI.', 11, 'middle']
    ] },
    { field: 'HVAC/R', title: 'Duct system and static pressure', w: 660, h: 280, el: [
      ['box', 40, 100, 140, 90, 'Air handler + blower'], ['box', 200, 120, 70, 50, 'Coil'], ['box', 0, 210, 120, 40, 'Filter'],
      ['line', [270, 145, 620, 145], R, 4, true], ['text', 620, 135, 'Supply ducts → registers', 11, 'end'],
      ['line', [620, 240, 120, 240, 120, 230], C, 4, true], ['text', 620, 262, 'Return ducts ← grilles', 11, 'end'],
      ['text', 330, 40, 'About 400 CFM per ton. High static (inches w.c.) = restriction:', 11, 'middle'], ['text', 330, 58, 'dirty filter, dirty coil, closed registers or undersized ducts.', 11, 'middle']
    ] },
    { field: 'EPA 608', title: 'Basic recovery setup', w: 660, h: 260, el: [
      ['box', 20, 90, 160, 70, 'System (liquid + vapor ports)'], ['box', 250, 90, 160, 70, 'Recovery machine'], ['box', 480, 80, 160, 90, 'Recovery cylinder (gray / yellow)'],
      ['line', [180, 110, 250, 110], O, 3, true], ['text', 215, 100, 'Liquid first', 11, 'middle'], ['line', [180, 140, 250, 140], B, 3, true], ['text', 215, 165, 'then vapor', 11, 'middle'],
      ['line', [410, 125, 480, 125], R, 3, true],
      ['text', 330, 220, 'Don\'t fill past 80% liquid. Use short hoses with low-loss fittings.', 11, 'middle']
    ] },
    { field: 'Tax preparation', title: 'Estimated tax calendar (1040-ES)', w: 660, h: 220, el: [
      ['box', 20, 70, 140, 60, 'April 15 · Q1'], ['box', 180, 70, 140, 60, 'June 15 · Q2'], ['box', 340, 70, 140, 60, 'Sept 15 · Q3'], ['box', 500, 70, 140, 60, 'Jan 15 · Q4'],
      ['line', [160, 100, 180, 100], C, 2.5, true], ['line', [320, 100, 340, 100], C, 2.5, true], ['line', [480, 100, 500, 100], C, 2.5, true],
      ['text', 330, 180, 'If a date lands on a weekend or holiday, it moves to the next business day.', 11, 'middle']
    ] },
    { field: 'Home care', title: 'Stroke signs: BE FAST', w: 660, h: 200, el: [
      ['box', 10, 60, 100, 70, 'B · Balance'], ['box', 120, 60, 100, 70, 'E · Eyes'], ['box', 230, 60, 100, 70, 'F · Face'], ['box', 340, 60, 100, 70, 'A · Arms'], ['box', 450, 60, 100, 70, 'S · Speech'], ['box', 560, 60, 90, 70, 'T · Call 911'],
      ['text', 330, 170, 'Note the time symptoms started. Don\'t give food, drink or medicine.', 11, 'middle', R]
    ] }
  );
})();
