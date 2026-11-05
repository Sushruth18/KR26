# Claude Code session plan — KR 2026 website (~4.5 hours)

Put `CLAUDE.md` in the root of an empty project folder, open Claude Code there, and paste these prompts one at a time.
Wait for each phase to finish, look at the result in the browser (`npm run dev`), then move on.
Git-commit after every phase so you can roll back.

---

## Before you start (do this first, ~15 min, not in Claude Code)
- [ ] Node 20+ and Git installed; a GitHub repo created; Netlify account linked to GitHub
- [ ] A Google account for the Apps Script + Sheet (ideally the club's account, not personal)
- [ ] Put these in the project folder if you have them:
  - `public/brand/` → BMSIT logo, Honnudi logo (PNG/SVG, transparent)
  - `public/art/` → any licensed palace/elephant/troupe vectors (optional — Claude will draw stylised SVGs otherwise)
  - `public/team/` → team photos (square-ish, ≥ 600px)
  - `public/gallery/2025/` → last year's photos
  - `public/audio/theme.mp3` → royalty-free or self-recorded loop (optional)
- [ ] Competition list, prizes and stage schedule are already in CLAUDE.md (from the budget proposal). Still needed: rules, team sizes, times of the non-stage events, venues, coordinators, or accept placeholders and fill them in later

---

## Phase 1 — Setup & design system (≈30 min)
```
Read CLAUDE.md fully. Then set up the project exactly per §2: Vite + React + TypeScript strict, Tailwind, motion, react-router-dom, react-i18next, lucide-react, react-hook-form, zod, html-to-image. Add ESLint + Prettier.

Implement §3 design system: tokens.css, Tailwind theme, Google Fonts with language-based font switching, the numerals/format utils, the night-sky background with stars, and reduced-motion + low-end-device detection hooks.

Implement §4: Layout with Navbar (desktop + mobile full-screen menu), language toggle (KN default, persisted), music toggle, Footer with CSS torches — footer rendered ONLY in Layout. Create all routes with lazy loading and a themed 404. Create all data files from §6 with the seed data and zod validation script.

Run the build, fix every error, show me the result at 360px and 1280px, then commit.
```

## Phase 2 — Signature art + Intro + Home (≈50 min)
```
Per CLAUDE.md §3 motifs and §5.0–5.1: build PalaceSilhouette (bulbs light up row by row, then twinkle), AmbariElephant (slow walk loop), FolkDivider, BrassPlaque, Torch. If public/art has files, use them; otherwise draw clean stylised geometric SVGs with gold line-work, each < 30 KB.

Then build the Intro splash (≤3s, skip button, once per session, off under reduced motion) and the full Home page: parallax hero, title block, live countdown with correct numerals per language, CTAs, stat plaques computed from data, procession-preview strip, deadline banner logic.

Quality bar from CLAUDE.md §1 applies. Check both languages, 360/768/1280px, and reduced motion. Commit.
```

## Phase 3 — Competitions (≈35 min)
```
Build §5.2 Competitions: Students/Faculty segmented toggle synced to the URL, TableauCard (float shape with wheels), status pills, accessible Rules disclosure, coordinator tel link, Register button routing to /register?event=<id>, skeleton loading.

Status should come from a getStatus() in src/lib/api.ts. The backend isn't built yet, so implement the fallback path from §5.2 now (events.json + client clock) and make the live path ready.

Verify in both languages and all widths. Commit.
```

## Phase 4 — Registration backend + form + pass (≈70 min) — the critical phase
Tip: press Shift+Tab to enter plan mode for this prompt, review the plan, then let it build.
```
This is the most important feature. Follow CLAUDE.md §5.6, §5.7 and §7 exactly.

1. Write apps-script/Code.gs with doGet status + doPost register, LockService around the whole register flow, server-side validation identical to the client, duplicate check across all team member USNs, per-event running reg IDs (KR26-<CODE>-0001), email in try/catch, JSON error codes. Write apps-script/README.md with exact deploy steps for a non-expert.
2. Write src/lib/validation.ts (zod) shared rules and src/lib/api.ts (timeout, single retry on network failure only).
3. Build the multi-step Register page with react-hook-form + zod, conditional team step, sessionStorage draft, honeypot, double-submit protection, every error state with friendly bilingual messages.
4. Build the Pass page: procession pass design, PNG download via html-to-image at 2x, .ics download, refresh-safe.
5. Add a mock mode (VITE_MOCK_API=true) that simulates every server response including FULL, DUPLICATE, CLOSED and network failure, so I can test all states without the real backend.

Test every state in mock mode and tell me how you tested each. Commit.
```

**Then do by hand (≈10 min):** follow `apps-script/README.md` — create the Sheet, paste Code.gs, fill the `Events` tab, deploy, copy the URL into `.env` as `VITE_REGISTRATION_ENDPOINT`.

```
I've deployed the Apps Script and set VITE_REGISTRATION_ENDPOINT. Switch off mock mode and test the real backend end-to-end: one success, a duplicate, a full event (temporarily set seats to 1), a closed event, and two near-simultaneous submissions for the last seat. Tell me exactly what happened in each case and fix anything wrong. Then I'll clear the test rows from the sheet.
```

## Phase 5 — Event Details, Gallery, Team (≈45 min)
```
Build §5.3 Event Details (Darbar-frame guests with "announcing soon" fallback, plaques, winding procession-route timeline from schedule.json — vertical on mobile, lazy Google Map), §5.4 Gallery (photos/reels tabs, year filter defaulting to 2025 if 2026 empty, masonry, WebP srcset, blur-up, accessible lightbox with swipe/keys/focus trap, click-to-load reels) and §5.5 Team (groups as troupes, arch frames, hide missing social links).

If images in public/gallery or public/team aren't WebP, add a script (sharp) that generates 480/960/1600 WebP versions and use those. Verify, commit.
```

## Phase 6 — Polish, accessibility, performance, SEO (≈30 min)
```
Go through CLAUDE.md §8, §9, §10 and §12 as a strict audit. Add per-route titles/meta in both languages, OG image (generate public/og.png 1200x630 from the palace art + title), favicons, manifest. Check bundle size and code-split anything heavy. Run through every route at 320/360/768/1280px in both languages and reduced motion and fix every issue you find — clipped Kannada, overflow, contrast, focus states, missing hover/disabled states.

Give me a checklist of every §12 item with pass/fail. Then create TODO-CONFIRM.md listing every placeholder still in the data. Commit.
```

## Phase 7 — Deploy (≈20 min)
```
Add netlify.toml per §11. Make sure the build works from a clean clone. Tell me the exact steps to connect the repo on Netlify and set VITE_REGISTRATION_ENDPOINT as an environment variable there. After I deploy, I'll give you the URL — then run Lighthouse against it and fix anything below the §9 targets.
```

---

## After the session
| Date | What |
|---|---|
| 6–7 Nov | Replace TODO-CONFIRM data (rules, team sizes, competition times & venues, team, guests); send link to 3–4 friends to test on their phones |
| **8 Nov** | **Registration live** — post on Instagram + WhatsApp groups |
| Daily | Check the `Registrations` sheet; close/expand events from the `Events` tab |
| 15 Nov | "3 days left" reminder post (the site shows the deadline banner automatically) |
| **18 Nov 23:59** | Registration closes |
| 19 Nov | Export per-event lists for coordinators and judges |
| **20 Nov** | **Day 1 — Competitions.** Mark each event `completed: true` as it finishes |
| **21 Nov** | **Day 2 — Rajyotsava & Dasara procession** 🎉 |
| After | Upload 2026 photos/reels to the gallery |

## If something breaks mid-session
- Paste the exact error and say: "Fix this without changing anything unrelated, then re-run the build."
- If a phase drifts from the spec: "Re-read CLAUDE.md §X and compare it with what you built. List the differences and fix them."
- If you're running out of time, cut in this order: reels → parallax layers → Add-to-calendar. Never cut registration testing.
