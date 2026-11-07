# Accident Billing (Massage Auto Insurance Billing OS) — source add-ons

Code only. No patient information is ever stored in this repository; records stay in the owner's Google account.

- `Access.gs.txt` — email-code sign-in, saved devices (90 days), staff list; every app call is checked.
- `ClaimBoard.gs.txt` — claim board (by stage, aging, follow-ups) and patient cost estimate (PIP level, Michigan fee limit, coordinated plan).
- `ui-block.html.txt` — screens for sign-in, account switcher, Claim Board, Patient Estimate, Staff.
- `snap-bridge.html.txt` — lets the installed app keep encrypted copies of opened screens for offline reading.
