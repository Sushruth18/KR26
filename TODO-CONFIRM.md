# TODO-CONFIRM — values still to be confirmed

Placeholders are used in the site until these are filled in. Nothing here has been invented.

## Competitions (`src/data/events.json`) — all 12 events
- [ ] Start **time** (shown as "Time to be announced" until set)
- [ ] **Venue** (kn + en)
- Coordinators (1–3 per event, each with its own `tel:` link) and rules are now filled in for every event except the rules item below.

### Faculty Group Dance (`f-group-dance`)
- [ ] **Rules** — the rules PDF has no faculty dance section; the card still says "Rules will be announced soon"
- [ ] **Team size 4–12** — the student Group Dance change (PDF: Kannada says min 6, English min 4 → 4–12 used in both languages) was applied to the faculty dance as well (it was 4–10). Confirm it applies to faculty

### Team sizes changed from the earlier draft (counts include the registrant)
- [ ] **Student Group Singing 6–12** (was 3–8): it uses the same rules as the faculty singing, which say 6 to 12. Faculty Group Singing also went 3–8 → 6–12 from those rules
- Student Group Dance 6–12 → 4–12 (see above) · Quiz 2 → individual (rules: "each participant must compete individually") · Treasure Hunt 3–4 → exactly 4 · Rangoli 2–4 → exactly 5 (both from the rules)

### Rules — adaptations of the PDF (`RULES_AND_REGULATIONS_final.pdf`, pages 2–10) for review
1. **Group Dance** rule 5: Kannada said min 6, English min 4 → 4 to 12 in both. Rule 6 ("team leaders should only fill the Google Sheet and others need not") → "The team leader registers the team on this website." / "ತಂಡದ ನಾಯಕರು ಈ ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ತಂಡವನ್ನು ನೋಂದಾಯಿಸುತ್ತಾರೆ."
2. **Quiz** rule 7: "Teams must report on time" → "Participants must report on time for their rounds." / "ಭಾಗವಹಿಸುವವರು ತಮ್ಮ ಸುತ್ತುಗಳಿಗೆ ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ವರದಿ ಮಾಡಬೇಕು." (quiz is individual)
3. **Painting** rule 11 (theme a day prior) exists only in English → added to the Kannada as a draft: "ಚಿತ್ರಕಲೆ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ಭಾಗವಹಿಸುವವರಿಗೆ ವಿಷಯವನ್ನು ಒಂದು ದಿನ ಮುಂಚಿತವಾಗಿ ತಿಳಿಸಲಾಗುವುದು."
4. **General instructions** rule 1 (10:15) → "Be at the venue 15 minutes before your event's start time." / "ನಿಮ್ಮ ಸ್ಪರ್ಧೆ ಆರಂಭವಾಗುವ ಸಮಯಕ್ಕಿಂತ 15 ನಿಮಿಷಗಳ ಮೊದಲು ಸ್ಥಳದಲ್ಲಿರಿ."
5. **Faculty Group Dance**: no section → placeholder kept (above)
6. **Group Singing** (both events) rule 4 "The song should be folk or cultural based" exists only in English → added to the Kannada as a draft (same treatment as 3) so both languages list the same 9 rules: "ಹಾಡು ಜಾನಪದ ಅಥವಾ ಸಾಂಸ್ಕೃತಿಕ ಆಧಾರಿತವಾಗಿರಬೇಕು." Remove it if the Kannada list was meant to be shorter
7. **Debate** rule 5: the English adds "Also there will be swapping of sides so be well prepared"; the Kannada lacked it → draft added: "ಪಕ್ಷಗಳ ಅದಲು-ಬದಲು ಕೂಡ ಇರುತ್ತದೆ, ಆದ್ದರಿಂದ ಚೆನ್ನಾಗಿ ಸಿದ್ಧರಾಗಿ ಬನ್ನಿ." The stray leading "And" / "ಮತ್ತು" was dropped in both
8. **Faculty Debate** rule 4: "Students" → "Participants" / "ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ" → "ಭಾಗವಹಿಸುವವರಿಗೆ" (same rules as the student debate otherwise)
9. Clean-ups only (meaning unchanged): missing "1." restored (Poem, Essay, Treasure Hunt, Rangoli), split first letters ("E ach", "T he", "V ulgar", "J udging", "J udges"), duplicate "2." (Singing rule 3), stray "8" glitch (Singing rule 8), "ಕನ್ನಡ" inside the English Dance/Singing rules → "Kannada", small grammar fixes ("a proper and decent costumes" → "proper and decent costumes", "slangs" → "slang", "Poems Recitation composed" → "poems composed", "Violation any" → "Violation of any", "Whatsapp" → "WhatsApp", missing full stops/commas)

### Differences between the Kannada and English PDF text — kept as written, please confirm
- [ ] Debate rule 8, Poem rule 1, Essay rule 1: Kannada says "in **both** Kannada and English" (ಎರಡರಲ್ಲಿಯೂ), English says "in English **or** Kannada"
- [ ] Painting rule 4 (Kannada): "ಪತ್ರಿಕೆಗಳನ್ನು" usually means newspapers — "ಹಾಳೆಗಳನ್ನು" (sheets) may be intended. Rule 8 ends "ಅಚ್ಚುಕಟ್ಟಾಗಿ" where Rangoli rule 4 says "ಅಚ್ಚುಕಟ್ಟು"
- [ ] General instructions rule 2 says the venue will be announced in the WhatsApp groups, while the cards will also show the venue once it is set
- [ ] Rules keep the PDF's Latin digits inside Kannada text (3+1, 500–800, 15); say if they should become Kannada numerals

## Site (`src/data/site.json`)
- [ ] `competitionsStart` 09:00 / `competitionsEnd` 18:00 on 20 Nov
- [ ] `instagramUrl` — empty, footer icon hidden
- [ ] `contactEmail` — empty, hidden
- [ ] `madeBy` — empty, hidden
- [ ] `departments` — draft list (CSE, ISE, AIML, ECE, EEE, ETE, Mech, Civil, MBA, MCA + Other)
- [ ] `semesters` — odd semesters 1, 3, 5, 7 for engineering; **MBA/MCA 1, 3** (confirm). Lateral-entry students?
- [ ] Competition duration for the calendar file — `.ics` uses 2 hours once a start time is set (`src/lib/ics.ts`)
- [ ] Map pin — verify the embed for "BMS Institute of Technology and Management, Avalahalli, Yelahanka, Bengaluru"

## Event details
- [ ] Chief guest names, titles, photos (`guests.json` is empty → "Announcing soon" frame)
- [ ] Day 2 Dance / Music Competition (Students & Faculty) slots (12:05, 12:30): listed on Day 2 although competitions are on Day 1 — kept as listed, no registration link
- [ ] Prize-distribution stop for Day 2 — add once its time is confirmed

## Headline artist (`src/data/artist.json`, `public/artist/remo.jpg`)
- [ ] Spelling of the name: "Remo & Team" (kn "ರೆಮೊ ಮತ್ತು ತಂಡ" — draft, for a Kannada speaker to check)
- [ ] Permission to use the photo and the name publicly
- [ ] A higher-resolution photo — the current one is 447 px wide, so it is shown without upscaling and looks soft on 2×/3× phones. Replace `public/artist/remo.jpg`, then run `npm run brand:images`

## Kannada wording for the Day 2 programme (drafts — a Kannada speaker should check)
- [ ] Stop titles (`src/data/schedule.json`): ರ‍್ಯಾಲಿ (Rally) · ಬಿಲ್‌ಬೋರ್ಡ್ (venue, Bill Board) · ಉದ್ಘಾಟನೆ ಮತ್ತು ಮೆರವಣಿಗೆ · ನೃತ್ಯ ಸ್ಪರ್ಧೆ / ಸಂಗೀತ ಸ್ಪರ್ಧೆ (ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಅಧ್ಯಾಪಕರು) · ರಂಗಸ್ಥಳ ಪ್ರದರ್ಶನ · ರುಶಾಂಗ್ ಪ್ರದರ್ಶನ · ತಾಂಡವ ಪ್ರದರ್ಶನ · ಫ್ಯಾಷನ್ ಶೋ · ಸಂಗೀತ ಕಚೇರಿ ಮತ್ತು ಡಿಜೆ
- [ ] Club names keep their own spelling in both languages; the Kannada-script forms ರಂಗಸ್ಥಳ / ರುಶಾಂಗ್ / ತಾಂಡವ are transliterations — confirm "ರುಶಾಂಗ್" in particular
- [ ] Club descriptions "ನಾಟಕ ಕ್ಲಬ್ / ಸಂಗೀತ ಕ್ಲಬ್ / ನೃತ್ಯ ಕ್ಲಬ್" (Drama / Music / Dance club) and the attraction banner texts (`src/data/attractions.json`)
- [ ] Event Details page strings (`kn.json → eventPage.*`): "ಪ್ರಮುಖ ಕಲಾವಿದರು" (Headline artist), "ಮುಖ್ಯ ಆಕರ್ಷಣೆ" (Headline act), "ಈಗ ನಡೆಯುತ್ತಿದೆ" (Now), "ಮುಂದೆ" (Up next), tab and intro lines, plaque captions, the venue caption "ಅವಲಹಳ್ಳಿ, ಯಲಹಂಕ, ಬೆಂಗಳೂರು"; calendar-file description "ದಿನ ೨"
- [ ] Day 2 time plaque shows "9:00 AM – 5:45 PM" (from `eventStart`/`eventEnd`); the timeline itself shows start times only — say if the plaque should also drop the end time

## Our Team page (`src/data/team.json`)

The block between the `team-import` markers further down is rewritten by `npm run team:import`; everything outside it is hand-written and is kept. (The importer used to write a separate `TODO-CONFIRM-team.md`; it now writes here, so this stays one file.)

- [ ] **Confirm the 2026 team list** (35 people imported from the form) and review everything in the generated block below
- Files: `src/data/team-config.json` (troupe labels, icons and **page order** — reorder the array to reorder the page), `src/data/team-role-map.json` (role text → troupe; add aliases here), `src/data/team-photos.generated.json` (sizes and blur-up, written by the importer), `scripts/team-photo-map.json` (per-person photo decisions), `public/team/` (processed WebP copies)
- Commands: `npm run team:import -- --csv <responses.csv> --photos <folder> [--regen-photos] [--dry-run]` (never commit the CSV or the photo folder), `npm run e2e:team` (needs `npm run build` first for the dist scan, plus the dev server; set `E2E_BASE`, and `TEAM_CSV` to also scan dist for the real CSV values)
- Re-running the import never changes existing people or their order; new people go to the end of their troupe. To remove someone for good: delete them from `team.json` and add their id to `excludeIds` in `team-config.json`

<!-- team-import:start (generated by npm run team:import — edit outside these markers) -->

## Heads-up before this page goes live

- **The form export has no consent column**, so nobody could be skipped for consent. Photos and names go on a public page: confirm the form asked for permission (or ask everyone) before launch.
- The form export has no LinkedIn or Instagram column, so no cards have social icons yet (icons without a URL are hidden). Add the links to `src/data/team.json` as `linkedin` / `instagram` — handles like `@name` are fine in a re-import with those columns; by hand use full URLs.

## Needs review — role not recognised (these people are NOT shown)

- none

## Skipped

- none

## Duplicate submissions (latest kept)

- Mallikarjun Katagi: submitted twice — the later answer (form line 33) is used

## Different people sharing one e-mail address (kept as separate people — please check)

- Keerthana S, Asha S, Nishan Babu
- Arjun Livik JP, Krishna Charan P

## Photos

### Cannot be matched with certainty — shown with an initials frame until you decide

- Keerthana S / Asha S / Nishan Babu — candidate photos (original file names): `IMG-20260821-WA0064`, `IMG-20261111-WA0026`, `IMG-20261111-WA0031`. Put `"<member-id>": { "file": "<part of the file name>" }` under `people` in `scripts/team-photo-map.json`, then re-run the import.
- Arjun Livik JP / Krishna Charan P — candidate photos (original file names): `Arjun Shoot`, `IMG-20261111-WA0045`. Put `"<member-id>": { "file": "<part of the file name>" }` under `people` in `scripts/team-photo-map.json`, then re-run the import.

### No photo found

- none

### Photo quality flags

- S Nishitha: 1242×2208px is far from a 4:5 portrait, so a lot is cropped away — check the framing
- G Rushika: black borders were cut off the screenshot — check the framing
- G Rushika: 1080×640px is far from a 4:5 portrait, so a lot is cropped away — check the framing
- Rohan Jojee C: 906×1600px is far from a 4:5 portrait, so a lot is cropped away — check the framing
- Punith P Gowda: low resolution (547×726px) — please ask for a larger photo
- Spandana B S: 1842×3690px is far from a 4:5 portrait, so a lot is cropped away — check the framing
- Rohit Sundar: 2268×4032px is far from a 4:5 portrait, so a lot is cropped away — check the framing
- Dhanush Rajakumar: 3264×2448px is far from a 4:5 portrait, so a lot is cropped away — check the framing

## Kannada names missing (the form had one English name field — the English name is shown in both languages)

- Ashutosh
- Gagan H S
- S Nishitha
- Aditya Biju Nair
- Sushruth Kumar
- G Rushika
- Aditya Jamane
- Manjunath Biradar
- Pranjal Raj
- Thejas Nirmal
- Raghavendra R
- Arjun Livik JP
- Rohan Jojee C
- Krishna Charan P
- Priyanka Navale
- Punith P Gowda
- Manish KV
- Abhishek S Hebbar
- Sowmya N
- Keerthana S
- Dhivii Suresh
- Asha S
- Kethan Gowda B R
- Spandana B S
- Mallikarjun Katagi
- Vinyas KT
- Deepashree C
- Tejas Gowda L
- Nishan Babu
- Rohit Sundar
- Swaroop B H
- Dhanush Rajakumar
- Sacheth Kumar P N
- Tejas S
- Arya K Hirematha

Fix by editing `name.kn` in `src/data/team.json`; a re-import never overwrites it.

## Draft Kannada labels for a Kannada speaker to check

- Head & Co-Head → ಮುಖ್ಯಸ್ಥರು ಮತ್ತು ಸಹ-ಮುಖ್ಯಸ್ಥರು (Head → ಮುಖ್ಯಸ್ಥ, Co-Head → ಸಹ-ಮುಖ್ಯಸ್ಥ)
- Events & Logistics → ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ವ್ಯವಸ್ಥಾಪನೆ
- Marketing → ಪ್ರಚಾರ ಮತ್ತು ಮಾರುಕಟ್ಟೆ
- Media → ಮಾಧ್ಯಮ
- Design & Décor → ವಿನ್ಯಾಸ ಮತ್ತು ಅಲಂಕಾರ
- Finance & Documentation → ಹಣಕಾಸು ಮತ್ತು ದಾಖಲಾತಿ
- Hospitality & Reception → ಆತಿಥ್ಯ ಮತ್ತು ಸ್ವಾಗತ
- Stalls & Shops → ಮಳಿಗೆಗಳು ಮತ್ತು ಅಂಗಡಿಗಳು
- Stage & Security → ವೇದಿಕೆ ಮತ್ತು ಭದ್ರತೆ
- Anchoring → ನಿರೂಪಣೆ
- Drama → ನಾಟಕ
- Technical → ತಾಂತ್ರಿಕ

## Last import

- Form rows: 36; shown: 35; new this run: 0; already in team.json (left untouched): 35

### Who is where

- **Head & Co-Head**: Ashutosh (Co-Head), Gagan H S (Head)
- **Events & Logistics**: S Nishitha, Aditya Biju Nair, Sushruth Kumar, G Rushika, Aditya Jamane
- **Marketing**: Manjunath Biradar
- **Media**: Pranjal Raj, Thejas Nirmal, Raghavendra R, Arjun Livik JP, Rohan Jojee C, Krishna Charan P, Priyanka Navale
- **Design & Décor**: Punith P Gowda, Manish KV, Abhishek S Hebbar
- **Finance & Documentation**: Sowmya N, Keerthana S, Dhivii Suresh, Asha S, Kethan Gowda B R
- **Hospitality & Reception**: Spandana B S, Mallikarjun Katagi
- **Stalls & Shops**: Vinyas KT, Deepashree C, Tejas Gowda L, Nishan Babu
- **Stage & Security**: Rohit Sundar, Swaroop B H, Dhanush Rajakumar, Sacheth Kumar P N
- **Anchoring**: Tejas S
- **Drama**: Arya K Hirematha

<!-- team-import:end -->

## Content
- [ ] Gallery photos / reels (`gallery.json` is empty)
- [ ] College logo on the dark theme — its dark-navy gear and ribbon almost vanish on the night background (shown exactly as supplied for now). Decide: a dark-background version from the college, or a light backing behind it. After swapping a file in `public/brand/`, run `npm run brand:images`

## Home page copy (first drafts, written for Phase 4 — confirm wording)
- [ ] Kannada strings not given in CLAUDE.md: "ಮುಖ್ಯ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ" (Main event in), "ಸ್ಕಿಪ್ ಮಾಡಿ" (splash Skip), "ಸ್ಪರ್ಧೆಗಳ ಮೆರವಣಿಗೆ" / "ಪ್ರತಿ ಸ್ಪರ್ಧೆಯೂ ಒಂದು ಸ್ತಬ್ಧಚಿತ್ರ. ನಿಮ್ಮದನ್ನು ಆರಿಸಿ." (preview strip), plaque captions, deadline-banner and "festival has begun / thank you" lines (`src/i18n/kn.json → home.*`, `intro.*`)
- [ ] Logo alt text: "ಬಿ.ಎಂ.ಎಸ್. ತಾಂತ್ರಿಕ ಮತ್ತು ವ್ಯವಸ್ಥಾಪನಾ ಮಹಾವಿದ್ಯಾಲಯದ ಲಾಂಛನ", "ಹೊನ್ನುಡಿ ಕನ್ನಡ ಸಂಘದ ಲಾಂಛನ" (`kn.json → brand.*LogoAlt`)
- [ ] Alt text for the two new logos — Kannada drafts: 25-years logo "ಬಿ.ಎಂ.ಎಸ್.ಐ.ಟಿ.ಎಂ ೨೫ ವರ್ಷಗಳ ಶ್ರೇಷ್ಠತೆ" (wording supplied by the team; confirm), cultural emblem "ಸಾಂಸ್ಕೃತಿಕ ಲಾಂಛನ" (**draft** — confirm, and what the emblem is officially called) (`kn.json → brand.jubileeLogoAlt`, `brand.culturalLogoAlt`)
- [ ] English counterparts of the same (`src/i18n/en.json`); the cultural emblem's English alt "Cultural emblem" is a draft too
- [ ] 25-years logo reads "BMSITM" in its lettering while the English alt text says "BMSIT&M" — confirm the logo's spelling is intended
- [ ] `public/audio/theme.mp3` — royalty-free / self-recorded nadaswaram or dollu loop (music toggle hidden while absent)
- [ ] `public/og.png` — generated by `npm run social:images` (palace + title + dates); confirm you are happy with the design, or supply the college's own artwork. Link previews cache aggressively: after changing it, re-scrape with the Facebook Sharing Debugger / WhatsApp (add `?v=2` to a shared link)

## Deployment
- [x] Site live at https://kr2k26-bmsit.netlify.app (`siteUrl` in `site.json`); `VITE_REGISTRATION_ENDPOINT` set; Apps Script deployed and working (registration, per-event tabs, email, pass)
- [ ] **Paste the new `Config.gs` (schema 4, `CONFIG_VERSION da9c17ad` — new team sizes) together with `Code.gs`** into the Apps Script project and deploy a New version — needed for the new team sizes (the server rejects teams with the old limits until then), the "View your pass" email button and lookup by registration ID (see apps-script/README.md → "Updating the script"). Then check `?action=status` shows `"configVersion":"da9c17ad"`
- [ ] Run `npm run race -- <Apps Script URL> <eventId> 10` against the live script, then delete the test rows (names "Race Test …", USNs `1BY99ZZ…`, emails `race*@example.com`) from that event's tab. Not run yet — it needs the URL in a local `.env` (`VITE_REGISTRATION_ENDPOINT=…`) or passed on the command line
- [ ] **`whatsapp_url`** — paste each event's WhatsApp group/channel invite in the Sheet's Events tab (optional; nothing is shown for events without one)
- [ ] Gmail daily email quota for confirmation mails (consumer accounts: ~100/day); run `checkEmailQuota` on busy days
- [ ] Re-run `setupSheet` only if events are added; otherwise leave the Sheet alone (`is_open` and `deadline_iso` are the coordinators' switches)

## Testing still to do on real devices (nothing here can be checked from the repo)
- [ ] Pass PNG download on **iPhone Safari** (fonts/logos inside `html-to-image` are known WebKit trouble spots; test with Kannada text) and on a mid-range Android
- [ ] The `.ics` file opens in Google Calendar / Apple Calendar / Outlook
- [ ] The confirmation email renders correctly in Gmail (web + app) and Apple Mail, including the "View your pass" and WhatsApp buttons, and does not land in spam
- [ ] Lighthouse mobile on the deployed URL (Performance ≥ 90, Accessibility, Best Practices, SEO ≥ 95): Kannada LCP is 2.9–3.1 s in the lab against a 2.5 s budget — only a real Lighthouse run says whether it matters
- [ ] Share the link in WhatsApp / Instagram / X and check the preview (title, image) once `og.png` is deployed

## Rules to confirm
- [ ] **Employee ID format** — draft rule is letters and digits only, at most 20 characters (`src/lib/rules.ts`). If BMSIT employee IDs contain `-` or `/`, faculty will be rejected: send me a few real examples
- [ ] **"BMSITM" vs "BMSIT&M"** — see Home page copy above (logo lettering vs everywhere else)
- [ ] Kannada wording for the team step (`kn.json → register.teamIntroExact`, `register.teamCountExact`, `register.teamCount`, `errors.teamSizeExact`): "ಈ ಸ್ಪರ್ಧೆಗೆ ನಿಮ್ಮನ್ನೂ ಸೇರಿ ನಿಖರವಾಗಿ ೫ ಸದಸ್ಯರು ಬೇಕು…", "ತಂಡದ ಸದಸ್ಯರು: ೫ರಲ್ಲಿ ೫", "(ಕನಿಷ್ಠ ೪, ಗರಿಷ್ಠ ೧೨)"
- [ ] Kannada wording written by me, to be checked by a Kannada speaker: the confirmation email's "View your pass" lines ("ನಿಮ್ಮ ಪಾಸ್ ವೀಕ್ಷಿಸಿ", "ನೋಂದಣಿಯಲ್ಲಿ ನೀಡಿದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ — ಐಡಿ ಮೊದಲೇ ತುಂಬಿರುತ್ತದೆ.") and the pass lookup text (`kn.json → pass.lookup.*`)

## Pages not built yet (Phase 6)
- [ ] `/gallery` is still a "coming soon" placeholder. It is linked from the navbar, so either build it or hide the link before sharing widely
