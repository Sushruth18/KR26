# CLAUDE.md — Karnataka Rajyotsava 2026 · BMSIT&M · Honnudi Kannada Sangha

Read this whole file before writing any code. It is the single source of truth for this project.
When something here conflicts with your defaults, this file wins. When something is marked
`TODO-CONFIRM`, use the placeholder and list it in the final report — never invent real data.

---

## 1. Project

- **What:** Official website for Karnataka Rajyotsava 2026 at BMS Institute of Technology & Management, organised by Honnudi Kannada Sangha.
- **Theme:** **Mysuru Dasara procession (Jamboo Savari)** — the site is designed as the procession itself: palace lights switching on at night, the golden Ambari on the elephant, tableaux floats, folk troupes, torchlight.
- **Two-day festival, BMSIT&M campus:**
  - **Day 1 — Competitions:** **20 November 2026** (Friday). All 12 competitions (students + faculty) happen this day.
  - **Day 2 — Karnataka Rajyotsava main event:** **21 November 2026** (Saturday), 9:00 AM – 5:45 PM — bike rally, inauguration & Dasara procession, performances, jamming.
  - All dates (both days, countdown targets, registration window, per-event `deadline`) come from `src/data/site.json` / `events.json` — never hard-code a date in a component.
- **Registration:** **open from now** (no opening date, no seat limits); closes **18 Nov 2026, 23:59 IST** (one day of buffer before competition day so coordinators can prepare lists; per-event deadlines can be earlier). Registration is for **competitions only** — Day 2 needs no registration.
- **Source of event data:** `Kannada_Rajyotsava_26_Budget_Proposal.docx` (schedule + prize breakdown) — §5.3 and §6 below are taken from it.
- **Predecessor:** https://kr2k25-bmsit.netlify.app/ — keep every tab it had, redesign everything else.
- **Audience:** students and faculty, ~90% on mobile phones, many on mid/low-end Android. Kannada is the default language.

### Quality bar
This is a public-facing college fest site that will be shared widely. No placeholder styling, no
"lorem ipsum", no broken states, no console errors, no layout shift, no horizontal scroll on any
screen width from 320px up. Every interactive element has hover, focus-visible, active, disabled
and loading states. Every async action has loading, success and error states.

---

## 2. Tech stack (use exactly this)

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + **TypeScript** (strict) |
| Styling | Tailwind CSS (design tokens in §3 as CSS variables + Tailwind theme) |
| Animation | `motion` (Framer Motion, import from `motion/react`) + plain CSS/SVG animation for loops |
| Routing | `react-router-dom` (BrowserRouter) with one `<Layout>` + `<Outlet/>` |
| i18n | `react-i18next`, resources in `src/i18n/kn.json` and `src/i18n/en.json`, default `kn` |
| Icons | `lucide-react` |
| Forms | `react-hook-form` + `zod` |
| Pass download | `html-to-image` |
| Backend | Google Apps Script web app + Google Sheet (see §7) |
| Hosting | Netlify, GitHub-connected |

No UI kits (no MUI/Chakra/shadcn defaults). Everything is custom-styled to the theme.

---

## 3. Design system

### Colours (define as CSS variables in `src/styles/tokens.css`, expose in Tailwind)
```
--night-950: #07061A   /* page background */
--night-900: #0B0A1F   /* section background */
--night-800: #15132E   /* cards */
--gold-400:  #F5B841   /* palace bulbs, primary */
--gold-300:  #FFD27A   /* highlights, glows */
--gold-600:  #C98A1B   /* borders, pressed */
--maroon-700:#8B1E2D   /* royal accent, buttons */
--maroon-900:#4A0E18   /* deep accent */
--saffron-500:#E8772E  /* silk accent */
--ivory-50:  #FFF4DC   /* primary text */
--ivory-300: #D9C9A8   /* secondary text */
--flag-yellow:#FFD500  /* Karnataka flag — accents only */
--flag-red:  #E31B23   /* Karnataka flag — accents only */
--success:   #3DBE7A
--danger:    #FF5A5F
```
- Background is a night sky: `--night-950` with a very subtle radial indigo glow and sparse twinkling stars (CSS, ≤40 stars, paused under reduced motion).
- Glow = layered `box-shadow`/`text-shadow` in gold, never neon orange (that was last year).
- Contrast: all body text ≥ 4.5:1 on its background. Check gold-on-maroon combinations.

### Typography (self-hosted via `@fontsource`, `font-display: swap`)
> **Override (approved):** fonts are self-hosted with `@fontsource` (Kannada subset for Kannada families, Latin subset for Latin ones) with size-adjusted fallback `@font-face`s in `src/styles/fonts.css` — not Google Fonts. No preconnect needed. The PNG pass download must be tested with Kannada text.
- Kannada display: **Baloo Tamma 2** (600/700)
- Kannada body: **Noto Sans Kannada** (400/500/600)
- English display: **Cinzel** (600/700)
- English body: **Poppins** (400/500/600)
- Font family switches with language via a `lang` attribute on `<html>` (`lang="kn"` / `lang="en"`).
- Kannada needs more line-height (≥1.6 body, ≥1.25 headings) — conjuncts (ಒತ್ತಕ್ಷರ) must never clip. Never use `overflow:hidden` on a single-line Kannada heading without testing.

### Numerals rule
- Kannada mode: dates **and** times use Kannada numerals consistently (೨೧ ನವೆಂಬರ್ ೨೦೨೬, ಬೆಳಿಗ್ಗೆ ೯:೦೦). Prize amounts use `₹` with Indian grouping (₹೩,೦೦೦).
- English mode: Latin numerals everywhere (21 November 2026, 9:00 AM, ₹3,000).
- Implement one `formatNumber/formatDate/formatTime/formatPrize(lang)` util and use it everywhere. Never hard-code a number in a component.

### Motifs & components
- **PalaceSilhouette** — SVG of a Mysore-palace-style facade (domes, arches, central tower) drawn with outline "bulb" dots along the edges. Bulbs light up row by row (staggered), then gently twinkle.
- **AmbariElephant** — SVG caparisoned elephant carrying a golden howdah. Slow walk loop (legs/trunk subtle motion), used in hero and as the loader.
- **TableauCard** — competition card shaped like a procession float: arched top, decorative border, small wheels at the bottom.
- **FolkDivider** — section divider pattern (temple-border / kasuti-style geometric band) as an SVG repeat.
- **Torch** — CSS flame (gradient + flicker keyframes) used in the footer and final CTA.
- **BrassPlaque** — stat card with brushed-gold gradient border.
- Corner ornaments on major cards; arch (`border-radius: 999px 999px 12px 12px` style) frames for portraits.

**Art assets:** if `public/art/` contains licensed vector files (palace, elephant, troupes), use and animate them.
Otherwise, hand-build clean, stylised SVGs — geometric and flat with gold line-work, NOT attempts at realism.
Keep each SVG < 30 KB. Never use copyrighted film imagery, songs or logos from outside the college.

### Motion rules
- Respect `prefers-reduced-motion`: disable walk loops, parallax, twinkle, splash animation (show final state).
- Animate only `transform` and `opacity`. No animating `box-shadow` on many elements at once.
- Scroll reveals: fade + 16px rise, once, 0.4s, stagger 0.06s.
- Detect low-end devices (`navigator.hardwareConcurrency <= 4` or `deviceMemory <= 2`) → reduce stars and disable parallax.

---

## 4. Site structure

Routes (all inside one `<Layout>` that renders `<Navbar/>`, `<Outlet/>`, `<Footer/>` **exactly once**):

| Route | Kannada nav label | English nav label |
|---|---|---|
| `/` | ಮುಖಪುಟ | Home |
| `/competitions` | ಸ್ಪರ್ಧೆಗಳು | Competitions |
| `/event` | ಕಾರ್ಯಕ್ರಮ ವಿವರಗಳು | Event Details |
| `/gallery` | ಗ್ಯಾಲರಿ | Gallery |
| `/team` | ನಮ್ಮ ತಂಡ | Our Team |
| `/register` | ನೋಂದಣಿ | Register |
| `/register/success` | (pass screen) | (pass screen) |
| `*` | 404 page ("ಮೆರವಣಿಗೆ ದಾರಿ ತಪ್ಪಿದೆ" / "The procession took a wrong turn") | |

Scroll to top on route change. Active nav item has a gold underline. Lazy-load routes (`React.lazy`).

### Global UI
- **Navbar:** sticky, blurred night background; left: "ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ" wordmark; right: links, music toggle, language toggle (KN ⇄ EN). Mobile: hamburger → full-screen menu with staggered links. Language choice persists in localStorage (try/catch).
- **Music toggle:** muted by default, never autoplays. Audio file `public/audio/theme.mp3` (TODO-CONFIRM: royalty-free/self-recorded nadaswaram or dollu loop). If file missing, hide the toggle.
- **Footer:** torches on both sides, "© 2026 ಹೊನ್ನುಡಿ ಕನ್ನಡ ಸಂಘ | ಎಲ್ಲ ಹಕ್ಕುಗಳೂ ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ", Instagram link (TODO-CONFIRM handle), college name, small "Made by" credit.

---

## 5. Pages

### 5.0 Intro splash (first visit per session only)
1. Black → palace silhouette bulbs light up row by row (~1.6s).
2. "ಬಿ.ಎಂ.ಎಸ್. ತಾಂತ್ರಿಕ ಮತ್ತು ವ್ಯವಸ್ಥಾಪನಾ ಮಹಾವಿದ್ಯಾಲಯ ಪ್ರಸ್ತುತಪಡಿಸುತ್ತಿದೆ" / "BMS Institute of Technology & Management presents" fades in (~0.8s).
3. Splash lifts away revealing Home. Total ≤ 3s.
- "Skip" button visible from frame 1. Store `seenIntro` in sessionStorage (try/catch). Skipped entirely under reduced motion.

### 5.1 Home `/`
- College logo + "ಬಿ.ಎಂ.ಎಸ್. ತಾಂತ್ರಿಕ ಮತ್ತು ವ್ಯವಸ್ಥಾಪನಾ ಮಹಾವಿದ್ಯಾಲಯ" row; Honnudi logo (assets in `public/brand/`).
- Hero: lit palace at night, parallax layers (sky → palace → crowd silhouettes → Ambari elephant walking across the foreground).
- Eyebrow "ಪ್ರಸ್ತುತಪಡಿಸುತ್ತಿರುವ", title "ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ" with gold glow, subtitle "೨೦೨೬", tagline "ದಸರಾ ಮೆರವಣಿಗೆ" / "The Dasara Procession".
- **Countdown** (days/hours/mins/secs in plaque tiles; numerals per language) that moves through phases automatically:
  1. Before 20 Nov 09:00 → "ಸ್ಪರ್ಧೆಗಳಿಗೆ" / "Competitions begin in" → `site.json → competitionsStart`.
  2. During 20 Nov → "ಸ್ಪರ್ಧೆಗಳು ನಡೆಯುತ್ತಿವೆ!" / "Competitions are on!" + "Main event in" countdown to `eventStart`.
  3. Before 21 Nov 09:00 → "ಮೆರವಣಿಗೆಗೆ" / "The procession begins in" → `eventStart`.
  4. During 21 Nov → "ಉತ್ಸವ ಆರಂಭವಾಗಿದೆ!"; after `eventEnd` → "ಧನ್ಯವಾದಗಳು" + link to gallery.
- A small **two-day strip** under the title: "೨೦ ನವೆಂಬರ್ · ಸ್ಪರ್ಧೆಗಳು" ‖ "೨೧ ನವೆಂಬರ್ · ರಾಜ್ಯೋತ್ಸವ ಮೆರವಣಿಗೆ" (Day 1 Competitions / Day 2 Rajyotsava Procession).
- CTAs: primary **"ಮೆರವಣಿಗೆಗೆ ಸೇರಿ — ನೋಂದಾಯಿಸಿ"** → `/competitions`; secondary "ನಮ್ಮ ತಂಡ" → `/team`.
- 3 BrassPlaques: dates (20 Nov competitions · 21 Nov main event) · number of competitions (computed from data — 12) · cash prize pool (computed from data — **₹39,000**; shown as "₹39,000 + mementos" because faculty events award mementos).
- "Procession preview" strip: horizontally scrolling row of mini tableau cards for the competitions (auto-scroll, pauses on hover/touch, reduced-motion = static).
- Registration-deadline banner when ≤ 3 days remain.

### 5.2 Competitions `/competitions`
- Title "ಸ್ಪರ್ಧೆಗಳು", subtitle "ನಿಮ್ಮ ಪ್ರತಿಭೆಯನ್ನು ತೋರಿಸಿ".
- Segmented toggle **ವಿದ್ಯಾರ್ಥಿಗಳು / ಅಧ್ಯಾಪಕರು** (Students / Faculty), synced to `?for=students|faculty`.
- Grid of **TableauCards** (1 col mobile, 2 tablet, 3 desktop). Each card:
  - icon, name, date, time, venue, team size, 1st/2nd prize — or a "ಸ್ಮರಣಿಕೆ / Memento" badge when `prizes.type === "memento"` (all faculty events)
  - status pill: **Open** (green) · **Closed** (a coordinator switched it off) · **Deadline passed** · **Completed** — there are no seat counts, "few seats" or "full" states
  - the Sheet's `is_open` is the coordinators' manual close switch; an event is open unless it is `FALSE` or its deadline has passed
  - "ನಿಯಮಗಳು / Rules" expandable (accessible disclosure, animated height)
  - coordinator name + `tel:` link
  - **Register** button → `/register?event=<id>`; disabled with reason when closed
- Status comes from the backend status endpoint (§7); fall back to `events.json` + client clock if the endpoint fails (events stay open until their deadline), and show a small "live open/closed status unavailable" note.
- Skeleton shimmer while status loads.

### 5.3 Event Details `/event`
- Title "ಕಾರ್ಯಕ್ರಮ ವಿವರಗಳು", subtitle "ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ೨೦೨೬".
- **Chief guest(s)** in Darbar-hall arch frames with gold pillars. Single clean image — no reflected/duplicated image. (TODO-CONFIRM guest names, titles, photos; if unconfirmed, show a tasteful "ಶೀಘ್ರದಲ್ಲೇ ಘೋಷಣೆ / Announcing soon" frame.)
- 4 BrassPlaques: dates (20 Nov competitions · 21 Nov main event) · time (Day 2: 9:00 AM – 5:45 PM) · venue (BMSIT&M campus) · cash prize pool (₹39,000 + mementos).
- **Day tabs** above the timeline: **ದಿನ ೧ · ೨೦ ನವೆಂಬರ್ · ಸ್ಪರ್ಧೆಗಳು** / **ದಿನ ೨ · ೨೧ ನವೆಂಬರ್ · ರಾಜ್ಯೋತ್ಸವ** (Day 1 · Competitions / Day 2 · Rajyotsava). Default to Day 2 except on 20 Nov, when Day 1 is default. Synced to `?day=1|2`.
- **Procession-route timeline**: a winding SVG road; each stop is a schedule item (time, title, venue, duration). Vertical on mobile, winding horizontal/zigzag on desktop. Generated from `src/data/schedule.json` (entries carry a `day` field). Highlight the "Inauguration & Procession" stop as the Day 2 centrepiece (Ambari icon) — it IS the Dasara theme.
  - **Day 1** is generated from `events.json` (all competitions, sorted by time, each stop links to its competition card and Register button). Events with unknown time sit in an "ಸಮಯ ಶೀಘ್ರದಲ್ಲೇ / Time to be announced" group at the end.
- **"Now / Next" indicator** on each day: the current stop glows and a small Ambari marker sits on it (computed from the client clock in IST).
- Seed Day 2 of `schedule.json` from the budget proposal (`day: 2`, date 2026-11-21; times are IST, 24h in data, formatted per language):

| Start | End | Kannada | English | Venue | Duration |
|---|---|---|---|---|---|
| 09:00 | 10:00 | ಬೈಕ್ ರ‍್ಯಾಲಿ (ಮೋಟಾರ್ ಹೆಡ್ಸ್) | Bike Rally (Motor Heads) | ಪ್ರವೇಶ ದ್ವಾರ / Entrance | 1 h |
| 10:00 | 12:05 | ಉದ್ಘಾಟನೆ ಮತ್ತು ಮೆರವಣಿಗೆ | Inauguration & Procession | ಮುಖ್ಯ ವೇದಿಕೆ / Main Stage | 2 h 05 m |
| 12:05 | 12:30 | ನೃತ್ಯ ಸ್ಪರ್ಧೆ (ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಅಧ್ಯಾಪಕರು) | Dance Competition (Students & Faculty) | Main Stage | 25 m |
| 12:30 | 12:45 | ಸಂಗೀತ ಸ್ಪರ್ಧೆ (ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಅಧ್ಯಾಪಕರು) | Music Competition (Students & Faculty) | Main Stage | 15 m |
| 12:45 | 13:15 | ಸಂಗೀತ ಕ್ಲಬ್ ಪ್ರದರ್ಶನ | Music Club Performance | Main Stage | 30 m |
| 13:15 | 13:35 | ನೃತ್ಯ ಕ್ಲಬ್ ಪ್ರದರ್ಶನ | Dance Club Performance | Main Stage | 20 m |
| 13:35 | 14:00 | ಫ್ಯಾಷನ್ ಶೋ | Fashion Show | Main Stage | 25 m |
| 14:00 | 14:15 | ಚಲನಚಿತ್ರ ಪ್ರಚಾರ | Movie Promotion | Main Stage | 15 m |
| 14:30 | 17:45 | ಜಾಮಿಂಗ್ (DAP) | Jamming (DAP) | Main Stage | 3 h 15 m |

  Notes: 14:15–14:30 is a gap in the source — render it as a "ವಿರಾಮ / Break" stop. The proposal budgets
  **Veeragase & Tamate** troupes and a chief guest — show them inside the Procession stop description
  ("ವೀರಗಾಸೆ ಮತ್ತು ತಮಟೆ ಜೊತೆಗೆ" / "with Veeragase & Tamate troupes"). Kannada titles are a first draft — TODO-CONFIRM wording.
  "Movie Promotion" — TODO-CONFIRM film name.
  ⚠️ TODO-CONFIRM: the proposal lists "Dance Competition" and "Music Competition (Students and Faculty)" on the
  Day 2 main stage at 12:05 and 12:30, but competitions are held on Day 1. Until confirmed, keep these two slots
  in Day 2 labelled exactly as in the proposal (they may be winners' / finalists' performances), and do NOT
  link them to registration. Add a **prize distribution** stop to Day 2 only once its time is confirmed.
- **Special attractions** as hanging banners, taken from the 2026 proposal: **Dasara Procession** with Veeragase & Tamate folk troupes · **Bike Rally** by Motor Heads · **Fashion Show** (traditional Karnataka attire) · **Jamming with DAP** (headline act, 3+ hours) · Music & Dance club performances. TODO-CONFIRM what "DAP" stands for / the artist's display name before showing it publicly.
- Embedded Google Map of BMSIT&M (lazy iframe, loads on scroll) + "Get directions" link.

### 5.4 Gallery `/gallery`
- Title "ಗ್ಯಾಲರಿ", subtitle "ನಮ್ಮ ಕಾರ್ಯಕ್ರಮದ ನೆನಪುಗಳು".
- Tabs **ಫೋಟೋಗಳು / ರೀಲ್ಸ್**; year filter **2026 / 2025**. If 2026 is empty, default to 2025 with a "2026 photos coming after the festival" note.
- Photos: masonry grid, palace-arch frames, captions on hover/tap, `loading="lazy"`, `srcset` (480/960/1600 WebP), blur-up placeholder, full lightbox (keyboard ←/→/Esc, swipe on mobile, focus trap).
- Reels: grid of vertical 9:16 cards with poster images; clicking loads the video (self-hosted MP4 ≤ 8 MB, or Instagram link out). Never autoload videos.
- Data in `src/data/gallery.json`.

### 5.5 Our Team `/team`
- Title "ನಮ್ಮ ತಂಡ" with small ornaments either side.
- Heads first, leading the procession, then other members in groups (e.g. Design, Events, Tech, Media) — each group as a "troupe" section with its own folk icon.
- Card: arched portrait frame, name, role, LinkedIn + Instagram icon buttons (`aria-label`, `target="_blank" rel="noopener noreferrer"`). Hide icons with no URL — never render dead links.
- Hover/tap: frame bulbs light up.
- Data in `src/data/team.json`. 2025 team for reference only — TODO-CONFIRM 2026 team.

### 5.6 Register `/register`
See §7 for the backend contract. The page is a styled multi-step form ("Join the procession"):
1. **Choose event** — preselected from `?event=`; shows the event summary and its open/closed status (no seat count).
2. **Your details** — category (student/faculty), name, USN or employee ID, department, semester (students), phone, email.
3. **Team** (only if `teamSize.max > 1`) — dynamic member rows (name, USN, phone), min/max enforced per event; team name.
4. **Review & submit** — summary, consent checkboxes (rules agreement; photo/video consent), submit.
- Inline validation with zod, messages in the current language. Preserve entered data in sessionStorage on reload (try/catch).
- Hidden honeypot field `website`; reject if filled.
- Submit button shows a spinner and is disabled during submit; disable double submit.
- Error states with a friendly message and retry: network failure, event closed by a coordinator, deadline passed, duplicate registration (show the existing registration ID), validation error from server.

### 5.7 Pass `/register/success`
- A "procession pass" card: Ambari motif, event name, participant name(s), registration ID (e.g. `KR26-DEB-0042`), "ದಿನ ೧ · ೨೦ ನವೆಂಬರ್" / "Day 1 · 20 Nov" with event time/venue, "Show this at the venue", plus a line inviting them to the Day 2 procession on 21 Nov.
- Buttons: **Download pass** (PNG via html-to-image, 2x pixel ratio), **Add to calendar** (.ics download), **Back to competitions**.
- Pass data comes from router state; if missing (e.g. page refresh), read last pass from sessionStorage, else show a lookup message.

---

## 6. Data files (`src/data/`)

All content lives in JSON; components never hard-code event data.

### `events.json`
```json
[
  {
    "id": "debate",
    "code": "DEB",
    "category": "students",
    "name": { "kn": "ವಾದ-ವಿವಾದ", "en": "Debate" },
    "icon": "mic",
    "date": "2026-11-20",
    "time": "14:00",
    "venue": { "kn": "TODO-CONFIRM", "en": "TODO-CONFIRM" },
    "teamSize": { "min": 1, "max": 1 },
    "deadline": "2026-11-18T23:59:00+05:30",
    "prizes": { "type": "cash", "first": 2000, "second": 1000 },
    "rules": { "kn": ["TODO-CONFIRM"], "en": ["TODO-CONFIRM"] },
    "coordinator": { "name": "TODO-CONFIRM", "phone": "TODO-CONFIRM" },
    "completed": false
  }
]
```
Events have **no `seats` field** — registration is unlimited. `prizes` is either `{ "type": "cash", "first": n, "second": n }` or `{ "type": "memento" }`.
The prize-pool plaque sums only cash prizes. Add a build-time check in `validate-data.ts` that the cash
total equals `site.json → prizePoolTotal` (39000) and fails the build if not.

Seed with the **12 competitions from the 2026 budget proposal** (prizes are final per the proposal;
times/venues/team sizes/rules are TODO-CONFIRM). **Every competition is on 20 Nov 2026 (Day 1)**, with `deadline` 2026-11-18T23:59:00+05:30:

| id | code | category | Kannada | English | 1st (₹) | 2nd (₹) | Team (TODO-CONFIRM) | Time |
|---|---|---|---|---|---|---|---|---|
| s-essay | ESY | students | ಪ್ರಬಂಧ ಬರಹ | Essay Writing | 2000 | 1000 | 1 | TODO |
| s-poem | POM | students | ಕವನ ಸ್ಪರ್ಧೆ | Poem | 2000 | 1000 | 1 | TODO |
| s-painting | PNT | students | ಚಿತ್ರಕಲೆ | Painting | 2000 | 1000 | 1 | TODO |
| s-debate | DEB | students | ವಾದ-ವಿವಾದ | Debate | 2000 | 1000 | 1 | TODO |
| s-quiz | QIZ | students | ಪ್ರಶ್ನೋತ್ತರ ಸ್ಪರ್ಧೆ | Quiz | 2000 | 1000 | 2 | TODO |
| s-group-dance | GDN | students | ಸಾಮೂಹಿಕ ನೃತ್ಯ | Group Dance | 4000 | 2000 | 6–12 | TODO |
| s-treasure-hunt | TRH | students | ಖಜಾನೆ ಹುಡುಕಾಟ | Treasure Hunt | 4000 | 2000 | 3–4 | TODO |
| s-group-singing | GSG | students | ಸಮೂಹ ಗಾಯನ | Group Singing | 4000 | 2000 | 3–8 | TODO |
| s-rangoli | RGL | students | ರಂಗೋಲಿ | Rangoli | 4000 | 2000 | 2–4 | TODO |
| f-debate | FDB | faculty | ವಾದ-ವಿವಾದ (ಅಧ್ಯಾಪಕರು) | Faculty Debate | memento | — | 1 | TODO |
| f-group-dance | FGD | faculty | ಸಾಮೂಹಿಕ ನೃತ್ಯ (ಅಧ್ಯಾಪಕರು) | Faculty Group Dance | memento | — | 4–10 | TODO |
| f-group-singing | FGS | faculty | ಸಮೂಹ ಗಾಯನ (ಅಧ್ಯಾಪಕರು) | Faculty Group Singing | memento | — | 3–8 | TODO |

Cash total check: (5 × 3,000) + (4 × 6,000) = **₹39,000** ✔ matches the proposal.
Icons (lucide): essay `file-text`, poem `feather`, painting `palette`, debate `mic`, quiz `brain`,
group dance `users`, treasure hunt `search`, group singing `music`, rangoli `flower`.
Rangoli is new this year and fits the theme perfectly — give its card a kolam-pattern corner ornament.

### Also
- `schedule.json` — `[{ day, start, end, title:{kn,en}, venue:{kn,en}, description?:{kn,en}, highlight?:boolean }]` (seed in §5.3)
- `guests.json` — `[{ name:{kn,en}, title:{kn,en}, photo }]`
- `team.json` — `[{ group:{kn,en}, members:[{ name:{kn,en}, role:{kn,en}, photo, linkedin?, instagram? }] }]`
- `gallery.json` — `{ photos:[{ year, src, alt:{kn,en}, caption? }], reels:[{ year, poster, video?|url?, title }] }`
- `site.json` — `competitionsStart` ("2026-11-20T09:00:00+05:30" — TODO-CONFIRM start time), `competitionsEnd` ("2026-11-20T18:00:00+05:30" — TODO-CONFIRM), `eventStart` ("2026-11-21T09:00:00+05:30"), `eventEnd` ("2026-11-21T17:45:00+05:30"), the registration close time (`registrationClose` "2026-11-18T23:59:00+05:30"; there is **no** `registrationOpen` — registration is open from the start), `prizePoolTotal` (39000), Instagram URL, contact email.

Validate every data file with a zod schema at build time (a small `scripts/validate-data.ts` run in `prebuild`).

---

## 7. Registration backend — Google Apps Script + Sheet

### Sheet layout (one spreadsheet, one tab per event)
- **`Events`** tab (coordinators control this): `id | code | name_en | sheet_name | deadline_iso | is_open (TRUE/FALSE)`. The server reads the deadline, the open switch and the event's tab name from here — coordinators can close an event (`is_open` FALSE), move its deadline or rename its tab without redeploying the site. There is **no seats column**.
- **One tab per event** (12), named by `sheet_name`, default `<CODE> – <English name>` (e.g. `ESY – Essay Writing`), created by `setupSheet` with a frozen, bold header row and plain-text data columns: `timestamp | reg_id | category | name | usn_or_empid | department | semester | phone | email | team_name | members_json | member_ids | consent_photo` (no `event_id` — the tab is the event). **There is no shared `Registrations` tab**; an old one is never read, written or deleted by the script (the README tells coordinators to delete it by hand).
- `Code.gs` finds an event's tab **only through the `sheet_name` cell**. If the cell is empty, the tab is missing, two events share a tab, or the tab's header row is not the layout above → `SERVER` (logged with the event id and tab name) and **nothing is written anywhere**. It never falls back to another tab. The status endpoint reports such an event as closed.
- `setupSheet` is idempotent: it only adds a missing Events tab/row/column, event tab or header (new event rows start with `is_open` = **TRUE**); it never deletes, clears or overwrites data, and keeps coordinator edits. An older Events tab (with `seats`, no `sheet_name`) is upgraded in place.

### `apps-script/Code.gs` (write this file in the repo; it is deployed by hand)
- `doGet(e)` with `action=status` → `{ ok:true, events:{ [id]: { isOpen, deadline, registeredCount } }, serverTime }`. `registeredCount` is for coordinators and the race test; the UI never shows it. `isOpen` = `is_open` TRUE **and** now < deadline **and** the event's tab exists.
- `doPost(e)` with JSON body (sent as `Content-Type: text/plain` to avoid CORS preflight) → register.
- Register flow, all inside `LockService.getScriptLock().waitLock(20000)`:
  1. Parse + re-validate every field server-side (same rules as the client). Reject honeypot.
  2. Check event exists, `is_open` is TRUE and now < deadline. There is no seat limit.
  3. Resolve the event's own tab (via `sheet_name`), then duplicate check inside that tab only: the same USN/emp ID (main registrant or any team member) already registered for that event → return `{ ok:false, code:"DUPLICATE", regId }`.
  4. Generate `reg_id` = `KR26-<CODE>-<4-digit number>` = highest existing number **in that tab** + 1.
  5. Append the row to that tab, release lock.
  6. Send confirmation email with `MailApp` (wrapped in try/catch — failure must not fail the registration). Mention in README that consumer Gmail accounts have a daily email quota.
  7. Return `{ ok:true, regId, event, name }`.
- `lookup` searches **every event tab** and returns every pass found.
- Error codes: `VALIDATION`, `CLOSED`, `DUPLICATE`, `SERVER` (there is no `FULL`). Always return JSON via `ContentService` with `MimeType.JSON`.
- Normalise: trim, collapse spaces, remove all spaces in and uppercase USN/employee ID, strip `+91`/spaces from phone, lowercase email.

### Validation rules (shared: `src/lib/validation.ts` and mirrored in `Code.gs`)
- Name: 2–60 chars, letters (Kannada or Latin), spaces, `.`
- USN: **no format check** — any value is accepted (a real USN like `1TD24CS001` was rejected by the old BMSIT-only regex, so it was removed). Only: required, trimmed, inner spaces removed, uppercased, ≤ 20 characters (`RULES.usn.max` in `src/lib/rules.ts`). Normalisation (`normId` / `normId_`) is identical in the browser and Code.gs so the duplicate check still works.
- Employee ID: non-empty, ≤ 20 chars, alphanumeric.
- Phone: `^[6-9]\d{9}$` after normalising.
- Email: standard format.
- Team: count within `teamSize`; no duplicate USNs within the team.

### Frontend integration
- Endpoint in `VITE_REGISTRATION_ENDPOINT` (`.env`, Netlify env var). Never commit the real URL to a public repo if avoidable.
- `src/lib/api.ts`: `getStatus()` (cache 30s in memory) and `register(payload)` with a 20s timeout and one automatic retry on network failure only (never retry after a server response).
- `apps-script/README.md`: exact step-by-step for creating the Sheet, pasting Code.gs, deploying as web app (Execute as: me; Who has access: Anyone), copying the URL, and redeploying after edits (new version).

---

## 8. Accessibility & SEO
- Semantic landmarks, one `<h1>` per page, logical heading order.
- All images have `alt` in the current language; decorative SVGs `aria-hidden`.
- Full keyboard navigation; visible gold focus ring; skip-to-content link.
- Form labels, `aria-describedby` for errors, `aria-live="polite"` for submit status.
- Touch targets ≥ 44×44 px.
- `<title>` and meta description per route (both languages), Open Graph + Twitter card image (`public/og.png`, 1200×630, palace + title), favicon set, `theme-color` `#0B0A1F`, `manifest.webmanifest`.

## 9. Performance budgets
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Initial JS ≤ 180 KB gzipped; route-split everything else.
- LCP ≤ 2.5s on 4G; CLS ≤ 0.05.
- All raster images WebP with explicit width/height. Hero is SVG/CSS, not video.
- Fonts: only the weights listed; self-hosted (see §3 override).

## 10. Known bugs from the 2025 site — must NOT happen here
1. Footer rendered 2–3 times per page, and page content repeated below the footer → single Layout, Footer only in Layout. Add a dev-only check that warns if more than one `<footer>` exists.
2. Chief-guest image showed a mirrored duplicate below it → plain single image in a frame.
3. Kannada dates with Latin times → numeral rule in §3.
4. Competition cards with no rules/registration → §5.2.

## 11. Deployment
- `netlify.toml`: build `npm run build`, publish `dist`, SPA redirect `/* /index.html 200`, security headers (X-Content-Type-Options, Referrer-Policy, Permissions-Policy), long cache for `/assets/*`.
- Site name suggestion: `kr2k26-bmsit`.

## 12. Definition of done (check every item before saying a phase is finished)
- [ ] `npm run build` passes with zero TypeScript errors and zero lint errors
- [ ] No console errors or warnings on any route, in both languages
- [ ] Every route checked at 360px, 768px, 1280px — no horizontal scroll, no clipped Kannada
- [ ] Reduced-motion mode checked
- [ ] Footer appears exactly once on every page
- [ ] Registration tested end-to-end: success, duplicate, closed, deadline passed, validation error, network failure
- [ ] Many simultaneous registrations for one event (`npm run race -- <url>`) → all succeed with unique, sequential reg IDs and no duplicate rows
- [ ] Pass downloads as PNG and .ics opens in a calendar app
- [ ] Lighthouse targets met on the deployed URL
- [ ] All `TODO-CONFIRM` items listed in `TODO-CONFIRM.md`

## 13. Working agreement for Claude Code
- Commit after each phase with a clear message.
- Before marking a phase done, run the build and visually check the pages you touched.
- Do not delete or rewrite data files the user has edited without asking.
- Keep components small (< 200 lines); shared pieces in `src/components/ui/`.
- If a requirement here is impossible or conflicts, stop and say so rather than silently cutting it.
- Commit locally after each phase; **never push**.

### Phases (registration is prioritised — it is open from now, see §1)
| # | Phase | Contents | Status |
|---|---|---|---|
| 1 | Foundation | Hand-scaffolded Vite + React + TS strict, Tailwind v3, ESLint/Prettier, tokens, self-hosted fonts, i18n, format utils, data files + build-time validation, Layout/Navbar/Footer, lazy routes, 404 | ✅ done |
| 2 | Registration (priority) | `validation.ts`, `api.ts`, `apps-script/Code.gs` (+ `action=lookup`) + README, local mock endpoint, Register form, Pass page (PNG + .ics) | ✅ done — real-Sheet race test pending deploy (rev. 2: open from now, no seat limits, one tab per event) |
| 3 | Competitions | TableauCard grid, status pills, live open/closed status, rules disclosure | ✅ done |
| 4 | Art + Intro + Home | PalaceSilhouette, AmbariElephant, BrassPlaque, intro splash, hero, countdown, preview strip, deadline banner | ✅ done — kn LCP 0.2–0.3 s over budget in lab (see Home notes) |
| 5 | Event Details | Day tabs, procession-route timeline, Now/Next, guests, attractions, map | ⏳ |
| 6 | Gallery + Team | Masonry, lightbox, reels, team troupes (empty states until content arrives) | ⏳ |
| 7 | Polish & QA | Reduced-motion / low-end pass, a11y, Lighthouse, OG card, §12 checklist | ⏳ |

### Approved decisions (override or refine the sections above)
- **TODO values** (`TODO-CONFIRM` in data) render as "To be announced": hide `tel:` links, all-day `.ics`, "TBA" on the pass; Day 1 events with unknown time go in the "Time TBA" group.
- **Backend** adds `action=lookup` — requires USN/employee ID **and** the full phone to match; returns only `regId`, `event`, `name`. Used on the pass page when local data is lost.
- **BMSIT-only.** One person may register for several events; duplicates are checked per event only. Category is derived from the event and locked. Team member rows take a USN (student events) or employee ID (faculty events); the duplicate check covers both.
- **Sheet wins** over `events.json` / `site.json` at runtime (deadline, is_open, tab name). **Registration is open from the start** — there is no `registrationOpen` and no "Opens soon" state; `setupSheet` creates every event with `is_open` TRUE and `is_open` is the coordinators' manual close switch. **No seat limits**: no `seats` anywhere (data, schema, Sheet, status, UI), no `FULL` code. Force plain-text writes (formula-injection guard).
- **Spam guards:** honeypot `website` + minimum time on form (> 3 s, `site.json → minFormSeconds`). `user_agent` is dropped from the Sheet (or stored as client-supplied only).
- **Departments** (draft, TODO-CONFIRM): CSE, ISE, AIML, ECE, EEE, ETE, Mech, Civil, MBA, MCA, Other (free text).
- **Kannada time words:** ಬೆಳಿಗ್ಗೆ (<12), ಮಧ್ಯಾಹ್ನ (12–16), ಸಂಜೆ (16–19), ರಾತ್ರಿ (19+). Own digit mapper; Latin digits stay in reg IDs, phone and USN.
- **Contact email, Instagram URL, "Made by"** are empty in `site.json` and hidden when empty — never invent them.
- **Day 2 Dance/Music slots** stay as written in the proposal, with no registration link.
- **Map:** embed by searching the `site.json → mapQuery`; verify the pin before launch.
- **No scraping** of the 2025 site; empty states until images are supplied.
- **SEO:** one static OG card, no pre-rendering. **Perf:** render the hero under the splash; on conflict degrade animation on low-end devices before cutting content.
- **Tooling:** Tailwind pinned to v3; ESLint + Prettier. A local mock endpoint is used for testing registration.

### Registration architecture (Phase 2 — refines §7)
- **One server implementation.** `apps-script/Code.gs` is the only server code. `apps-script/Config.gs` is **generated** (`npm run gas:config`, also on every build) from `site.json`, `events.json` and `src/lib/rules.ts` — never edit it by hand. Validation rules live in `src/lib/rules.ts`; semesters/departments in `site.json` (`semesters.default` = odd semesters 1,3,5,7; `byDepartment` MBA/MCA = 1,3). Client (`src/lib/validation.ts`) and server read the same lists.
- **Mock = real Code.gs.** `mock/gas-runtime.ts` runs Code.gs in a Node VM with fake Sheet/Lock/Cache/Mail services; `mock/vite-plugin-mock-gas.ts` serves it at `/mock-api` in `npm run dev` only. Force outcomes with `?mock=duplicate|closed|deadline|validation|server|network|slow|statusdown` on any page or the dev-only panel (bottom-left). Mock data is in memory and resets when the dev server restarts.
- **Tests:** `npm run test:server` (Code.gs logic against a multi-tab fake spreadsheet, 93 cases), `npm run e2e` (registration, 18 scenarios) and `npm run e2e:competitions` (Competitions page: kn/en × 320/360/768/1280, 22 checks) — browser, need `npm run dev`; `E2E_BASE` for another port, `npm run race -- <url> [eventId] [count]` (fires `count` simultaneous registrations at one event and checks all succeed with unique, sequential reg IDs and no duplicate rows; the real LockService test must be run against the deployed script — the mock is single-threaded).
- **Sheet column `member_ids`** (not `member_usns`): holds USNs or employee IDs. `user_agent` dropped. `Config.gs` carries each event's default `sheetName` (`npm run gas:config`; `validate-data` rejects invalid or duplicate tab names).
- **Team size counts the registrant** (Group Dance 6–12 = registrant + 5–11 member rows). Photo/video consent optional; rules consent required.
- **Extra codes:** `CLOSED` carries `reason: NOT_OPEN` (switched off by a coordinator) `| DEADLINE`; `SERVER` may carry `reason: BUSY` (lock timeout); lookup returns `NOT_FOUND` / `RATE_LIMITED` (5 failures per ID per 10 min). Client adds `NETWORK` and `CONFIG` (endpoint not set).
- The min-time check uses a **client-reported** `elapsedMs`; it stops naive bots, not a determined attacker.

### Home + art (Phase 4 — refines §3, §5.0, §5.1)
- **Art** lives in `src/components/art/`. The palace is generated in code (`palaceGeometry.ts`: wings, towers, onion domes, arcades → ~1175 bulbs as zero-length round-capped subpaths). Lights switch on bottom → top in 9 rows; the twinkle animates whole-layer opacity of 3 stacked SVGs (composited, no repaint). Every art SVG renders < 30 KB (checked by `e2e:home`). Torch = SVG *panju*; FolkDivider = kasuti cross-stitch band.
- **Splash** plays once per session **only when the visit starts on `/`** (deep links go straight to their page); any first page view sets `seenIntro`. `#root` is `inert` while it shows; Skip button + Esc. Home renders underneath, so LCP is the hero `<h1>`, never the splash.
- **Hero order**: lockup + two-day strip → scene (palace, crowd, road, elephant) → CTA. Phones get the lit palace in the first screen; the scene width is capped at `115vh` on desktop so the whole procession fits.
- **Dev clock**: `?now=<ISO>` on any dev URL shifts the site clock (`src/lib/clock.ts`) to check countdown phases and the deadline banner; `?now=` resets. Production ignores it.
- **Performance rules** (measured on the production build, Slow 4G + 4× CPU): keep `motion` off the first load (hero parallax is `hooks/useParallax.ts`; `MobileMenu` is code-split and prefetched on idle). `scripts/vite-plugin-preload-critical.ts` preloads the display font for the visitor's language and modulepreloads the Home chunk on `/` only; `pages/homePreload.ts` renders Home in the first commit (no Suspense fallback / reveal throttle). Below-the-fold sections and the footer use `.cv-auto` (`content-visibility`) — full-page screenshots must override it (the test scripts do).
- **Measured** (`npm run perf:home`): CLS ≤ 0.004; LCP en 2.3–2.4 s ✔, kn 2.7–2.8 s ✘ (applied throttling, headless software raster — pessimistic vs Lighthouse). The remaining kn cost is app-wide: six Kannada font files each force a relayout, plus the ~109 KB-gzip entry bundle (runtime zod parsing of data, i18n). Phase 7: confirm with Lighthouse on the deployed URL, then trim/subset Kannada font weights and drop runtime zod from the entry. Also Phase 7: `/competitions` measured CLS 0.05–0.085 (pre-existing).
- **Tests**: `npm run e2e:home` (24 checks: kn/en × 320/360/768/1280, splash, reduced motion, low-end, parallax, all countdown phases, deadline banner, SVG budgets, marquee a11y, mobile menu), `npm run perf:home` (needs `npm run build && npm run preview`; `PERF_PATH=competitions` for another route), `npm run shot -- / [--full --reduced --lowend --intro --now=ISO --el=css]` for review screenshots.

### Brand logos (refines §5.1, §9)
- **Masters** live in `public/brand/` exactly as supplied (never recolour or edit them) and are named in `site.json → logos`. `npm run brand:images` (sharp; dev-only, not part of the build, so deploys never depend on it) writes content-hashed WebP copies to `public/brand/web/` (cached for a year in `netlify.toml`) and `src/data/logos.generated.json`. `validate-data` fails the build if a master changes without regenerating.
- Render with `ui/BrandLogo` (srcset + explicit width/height; `lazy` below the fold; `single` on the pass, because html-to-image embeds `src` and ignores `srcset`). Placement: Home logo row (college logo beside the name, Honnudi wordmark below), footer, pass. `e2e` scenario 12 checks that both logos reach the exported PNG.
- **College logo plate:** on dark backgrounds (Home row, footer, pass — the pass card is dark) the college logo sits on an ivory arch plate (`<BrandLogo plate/>`, `.logo-plate`): half-circle top over the gear, gently rounded base for the motto ribbon, even padding, 1 px gold border, static soft gold glow. With `plate`, `height` is the plate's outer height (Home 46/50, footer 72, pass 48). The Honnudi logo never gets a plate. The navbar has no logo.
- The hero's first-screen budget is tight: the logo row costs +32 px on phones; at 360×760 the elephant ends at 717 px (kn), at 1280×820 at 813 px. `e2e:home` fails if the elephant leaves the first screen at ≤ 360 px. Re-measure before making the logos bigger.
