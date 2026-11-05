# TODO-CONFIRM — values still to be confirmed

Placeholders are used in the site until these are filled in. Nothing here has been invented.

## Competitions (`src/data/events.json`) — all 12 events
- [ ] Start **time** (shown as "Time to be announced" until set)
- [ ] **Venue** (kn + en)
- [ ] **Team size** (seeded from the budget proposal; confirm min/max)
- [ ] **Seats** — placeholders: 100 individual, 30 team. Real numbers go in the Google Sheet `Events` tab (Sheet wins at runtime)
- [ ] **Rules** (kn + en)
- [ ] **Coordinator** name + phone (`tel:` link hidden until set)

## Site (`src/data/site.json`)
- [ ] `competitionsStart` 09:00 / `competitionsEnd` 18:00 on 20 Nov
- [ ] `instagramUrl` — empty, footer icon hidden
- [ ] `contactEmail` — empty, hidden
- [ ] `madeBy` — empty, hidden
- [ ] `usnRegex` — default `^1BY\d{2}[A-Z]{2}\d{3}$`; check against real USNs (lateral entry, newer formats)
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
- [ ] Brand logos in `public/brand/` (BMSIT, Honnudi)
- [ ] `public/audio/theme.mp3` — royalty-free / self-recorded nadaswaram or dollu loop (music toggle hidden while absent)
- [ ] `public/og.png` — 1200×630 social card (referenced in `index.html`; not yet created)

## Deployment
- [ ] `VITE_REGISTRATION_ENDPOINT` — Apps Script web-app URL (Netlify env var; the Netlify build fails without it)
- [ ] Deploy the Apps Script (apps-script/README.md) and run `npm run race -- <url>` against it — the real last-seat test
- [ ] Set `is_open` = TRUE in the Sheet on 8 Nov (seeded FALSE)
- [ ] Gmail daily email quota for confirmation mails (consumer accounts are limited)
