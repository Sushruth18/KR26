# TODO-CONFIRM — values still to be confirmed

Placeholders are used in the site until these are filled in. Nothing here has been invented.

## Competitions (`src/data/events.json`) — all 12 events
- [ ] Start **time** (shown as "Time to be announced" until set)
- [ ] **Venue** (kn + en)
- [ ] **Team size** (seeded from the budget proposal; confirm min/max)
- [ ] **Rules** (kn + en)
- [ ] **Coordinator** name + phone (`tel:` link hidden until set)

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
- [ ] Kannada titles in `schedule.json` are a first draft — confirm wording
- [ ] "Movie Promotion" — film name
- [ ] "DAP" — what it stands for / the artist's display name before showing it publicly
- [ ] Day 2 "Dance Competition" / "Music Competition (Students & Faculty)" slots (12:05, 12:30): proposal lists them on Day 2 although competitions are on Day 1 — kept as written, no registration link
- [ ] Prize-distribution stop for Day 2 — add once its time is confirmed

## Content
- [ ] 2026 team (`team.json` is empty); 2025 team is reference only
- [ ] Gallery photos / reels (`gallery.json` is empty)
- [ ] College logo on the dark theme — its dark-navy gear and ribbon almost vanish on the night background (shown exactly as supplied for now). Decide: a dark-background version from the college, or a light backing behind it. After swapping a file in `public/brand/`, run `npm run brand:images`

## Home page copy (first drafts, written for Phase 4 — confirm wording)
- [ ] Kannada strings not given in CLAUDE.md: "ಮುಖ್ಯ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ" (Main event in), "ಸ್ಕಿಪ್ ಮಾಡಿ" (splash Skip), "ಸ್ಪರ್ಧೆಗಳ ಮೆರವಣಿಗೆ" / "ಪ್ರತಿ ಸ್ಪರ್ಧೆಯೂ ಒಂದು ಸ್ತಬ್ಧಚಿತ್ರ. ನಿಮ್ಮದನ್ನು ಆರಿಸಿ." (preview strip), plaque captions, deadline-banner and "festival has begun / thank you" lines (`src/i18n/kn.json → home.*`, `intro.*`)
- [ ] Logo alt text: "ಬಿ.ಎಂ.ಎಸ್. ತಾಂತ್ರಿಕ ಮತ್ತು ವ್ಯವಸ್ಥಾಪನಾ ಮಹಾವಿದ್ಯಾಲಯದ ಲಾಂಛನ", "ಹೊನ್ನುಡಿ ಕನ್ನಡ ಸಂಘದ ಲಾಂಛನ" (`kn.json → brand.*LogoAlt`)
- [ ] Alt text for the two new logos — Kannada drafts: 25-years logo "ಬಿ.ಎಂ.ಎಸ್.ಐ.ಟಿ.ಎಂ ೨೫ ವರ್ಷಗಳ ಶ್ರೇಷ್ಠತೆ" (wording supplied by the team; confirm), cultural emblem "ಸಾಂಸ್ಕೃತಿಕ ಲಾಂಛನ" (**draft** — confirm, and what the emblem is officially called) (`kn.json → brand.jubileeLogoAlt`, `brand.culturalLogoAlt`)
- [ ] English counterparts of the same (`src/i18n/en.json`); the cultural emblem's English alt "Cultural emblem" is a draft too
- [ ] 25-years logo reads "BMSITM" in its lettering while the English alt text says "BMSIT&M" — confirm the logo's spelling is intended
- [ ] `public/audio/theme.mp3` — royalty-free / self-recorded nadaswaram or dollu loop (music toggle hidden while absent)
- [ ] `public/og.png` — 1200×630 social card (referenced in `index.html`; not yet created)

## Deployment
- [ ] `VITE_REGISTRATION_ENDPOINT` — Apps Script web-app URL (Netlify env var; the Netlify build fails without it)
- [ ] Deploy the Apps Script (apps-script/README.md) and run `npm run race -- <url>` against it — the real concurrency test (all simultaneous registrations must succeed with unique, sequential IDs)
- [ ] Registration is open from the moment `setupSheet` runs (every event is created with `is_open` = TRUE). Run `setupSheet` only when you are ready to take registrations, or untick `is_open` per event to hold some back
- [ ] If an older Sheet already exists: run the new `setupSheet` (adds the `sheet_name` column and the 12 event tabs), tick `is_open` where it is still FALSE, delete the old `Registrations` tab by hand once nothing is needed from it, and delete the leftover `seats` column if you like
- [ ] Gmail daily email quota for confirmation mails (consumer accounts are limited)
