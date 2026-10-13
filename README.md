> **Responsiveness hotfix (V1.6.1):** The daily wheel now begins spinning immediately when clicked, even while the server assigns a game. Once the server replies, the wheel smoothly decelerates and reveals ONLY the server-selected trial after landing. Game submissions immediately show “Checking your answer…” while the server verifies the result; XP/success remain server-authoritative. This patch does not change puzzle content, XP, stories, daily limits, or the frozen V1.5 UI. No new environment variables or database migration.

> **Production readiness update (V1.6):** UI remains frozen at V1.5. Added daily API workflow tests, structured rule-error handling, automatic UTC-day refresh while idle, a safe deployment smoke test, and Supabase RLS protections. See [production checklist](docs/production-checklist.md). Run `npm run smoke -- https://YOUR_DEPLOYMENT_URL` after deploying. The full Next.js build and real Postgres integration must still be verified on your machine.

## V1.5 — Cinematic Castle World (current release)

The V1.5 presentation uses actual high-depth environment illustrations rather than the old flat SVG castle. All **navigation, wheel sections, trial buttons, and story interactions remain real accessible DOM**, not text/buttons painted into screenshots.

- **Opening / arrival:** Skippable ~3.1-second gate-and-camera entrance using the castle artwork. It plays once per browser session (not on reduced-motion clients), with a manual replay from Story.
- **Tower home:** Fully illustrated castle hero, gold-on-stone interface and glowing Wheel of Fate altar. The server still assigns each puzzle and the wheel still finishes before revealing the trial.
- **Practice Hall:** Atmospheric interior and **six individual illustrated trial cards**, all directly playable with no XP.
- **Chronicle:** Distinct castle banner, illustrated chapter tabs, story fragments and sealed-state previews that do not grant XP.
- **Trial/result screens:** Consistent stone/lantern visual styling and the existing ending ceremony.
- **Optimized local images:** Ten WebP artwork crops in `public/art` total about **388 KB**; no image CDN or third-party font requests. Derived from AI-generated Tower of Trials concept mockups, so they do not contain non-functional text or baked-in buttons. Acknowledged in `docs/explainer.md`.
- **Audio unchanged:** Optional zero-download Web Audio ambience, music off on page load, remembered opt-in preference for manual restart, hidden-tab pause, and separate sound effects.

### Updating from V1.4

Extract `tower-of-trials-v1.5-patch.zip` **into your existing `tower-of-trials` project folder**, replacing matching source files. The patch has paths such as `src/app/page.tsx`; **do not** extract it into the parent directory. It does not include `.data/` or cookies and does not reset progress. Stop and restart `npm run dev` after updating. Hard refresh your browser for the new CSS.

### Visual QA and limitations

- The static HTML/CSS composition was rendered at **320px, 390px, and 1440px**, and checked for horizontal overflow (none). These are layout checks, not proof the complete Next.js app runs.
- The 16 native Node gameplay/story tests passed. Updated TSX was checked for parsing errors. The full Next.js build could **not** be executed in this environment because npm registry access is unavailable; run `npm install && npm run typecheck && npm run build` locally before deployment.

## V1.4 — An actual tower world, better entrance, and zero-download music

- **A new original illustrated castle environment** is bundled as a tiny SVG (`public/art/tower-world.svg`, about 8 KB). The same illustration appears behind the game, inside the hero, and during the entrance so the experience feels like one world. No external assets, image CDNs, fonts or licenses are required.
- **Short cinematic arrival (3.1 seconds):** Gates open onto the castle, the camera eases forward, and a title appears. Plays once per browser tab/session and has an **Enter the tower** skip button. Use Story → **Replay the gate opening** to see it again; reduced-motion users do not receive an automatic intro.
- **Interactive visual polish:** Illuminated wheel altar, better wheel slices, rune/glow feedback, a clickable Chronicle hotspot in the castle, readable mobile hierarchy, refreshed Practice Hall and result/ending panels.
- **Web Audio ambience, 0 KB of audio files:** Original, subtle D-minor-pentatonic pads, synthesized filtered wind and rare glass-bell accents. No beat, vocals, samples or discernible melody. The engine is created **only after** the user taps Music; music is off on page load, pauses when the tab is hidden, and the preference is remembered for a manual resume after reload.
- **Separate opt-in toggle and sound-effects toggle.** SFX is enabled by default but sounds are played only following user actions; music can be muted immediately. There is no audio-file download, no streaming, and no licensing dependency.
- `?demo=1` still provides reward-free spin and ending previews. **All six games, server assignments and reward rules are unchanged.**

# Tower of Trials

**Two spins. Two trials. One floor.** A responsive daily micro-game adventure created for the Kenpath Labs Full Stack Engineer build task. This builds on the earlier DailyRush prototype.

## What is built

- Six playable, tap-friendly games: **Cipher Lock** (logic), **Ghost Trail** (memory), **Shifting Chamber** (observation), **Rune Circuit** (spatial), **Lightning Order** (speed), and **Sum Forge** (arithmetic).
- The **Wheel of Fate** assigns two **distinct** trials per UTC day. It cannot select the same unordered pair as the preceding day's saved assignment. The wheel animates to the result **chosen by the server**, never the other way around.
- **Three full-game attempts per daily trial.** Each retry issues a fresh puzzle seeded with the attempt number. Cipher Lock allows up to six guesses **within** a full-game attempt.
- **+40 XP** per won daily trial, **+20 XP** for clearing both. Awards and cleared floors are recorded server-side and are idempotent under an atomic user transaction.
- **Floors never reset.** A missing day breaks a streak, not the floor count. Next unfinished floor is `floorsCleared + 1`.
- **Practice Hall** makes all six games playable with no spins used, no XP, and no floor/streak changes.
- **Chronicle** with 25 floor-specific narrative fragments. `?demo=1` allows story, wheel, and ending previews. Previews cannot grant XP, spend spins or advance the tower.
- A lightweight CSS wheel and optimized locally bundled fantasy illustrations; no third-party fonts, external image requests, or audio downloads. Reduced-motion CSS supported.
- **Story and ceremony:** 25 collectible floor-specific story fragments, an open-ended epilogue, and a replayable ending dialog with cosmetic effects.

### What this project does *not* claim

This is **not a cash-reward product**. XP and cosmetic stars have **no monetary value**. The server verifies puzzle submissions, awards, retries, and allowed durations, but it cannot prove a human observed or solved a challenge. For games like Ghost Trail, the browser necessarily receives a visual path, so a determined user can inspect network payloads, automate a client, and wait out the minimum-duration check. Do not use these rewards for money without a stronger anti-abuse design.

## Run locally (no external accounts)

Requires **Node.js 22+** and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Local development automatically creates an ignored `.data/` folder with a **persistent single-process JSON store** and stable randomly generated server secrets. The server creates an anonymous, HTTP-only, signed browser cookie. Progress persists across browser reloads, but clearing cookies starts a new account.

**Important:** JSON persistence works for **one local process only** and is **not** safe for deployed serverless or multi-instance applications. The app intentionally refuses to use it on Vercel.

## Deploy with Supabase PostgreSQL + Vercel

1. Create a Supabase project, open its SQL Editor, and execute [`docs/schema.sql`](docs/schema.sql).
2. Obtain a **server-side Postgres connection string** (ideally the Supabase transaction pooler URL). Keep it secret. **Never prefix this variable with `NEXT_PUBLIC_`.**
3. Generate two independent random 32+ byte secrets, e.g. `openssl rand -hex 32` twice.
4. Set `DATABASE_URL`, `SESSION_SECRET`, `PUZZLE_SECRET` in your Vercel project's Environment Variables. On Vercel, all three are mandatory. Use the same values across deployments or existing sessions/puzzles may become invalid.
5. Push the repository to GitHub, import into Vercel, and deploy. No background cron is needed: assignment state is created on the player's first request for the day.
6. Test on an Android-sized viewport and a **real Android device** before submission. Check the two-spin workflow, forced reload, three failed attempts, practice, mobile tap targets, and story previews.

This project includes `pg` (Postgres driver), Next.js 16 App Router, React 19, and plain CSS. No Supabase Auth UI or proprietary secret is required in the browser.

## Commands

```bash
npm run dev        # local Next.js dev server
npm run test       # pure gameplay tests, Node native runner
npm run typecheck  # TypeScript checks (requires npm install)
npm run build      # verify production build (requires npm install)
```

## Core routes

- `GET /api/game`: creates/resumes an anonymous session and returns a **sanitized** snapshot. Does not reveal Cipher Lock secrets or unrevealed wheel assignments.
- `POST /api/game`: accepts `spin`, `submit`, `retry`, `practice-start`, `practice-close` actions. All important changes use the same atomic user transaction.

Never post an XP amount, arbitrary floor count, or winning status from the client; the API does not accept them. It checks the issued server puzzle, submitted answer, minimum elapsed time, and attempt limit. Bad or premature submissions return a meaningful error. Values returned for memory/observation visualizations are **not** secrets and remain inspectable.

### Full rules

1. Spin 1 chooses a server-assigned game. Playing/finishing it unlocks spin 2. If the first trial is failed after three attempts, spin 2 remains available.
2. Spinning is final. Both trials must be *won* to clear the floor.
3. If a player wins one and loses the other, they keep their +40 XP, but get no floor bonus or new floor.
4. Finishing both grants +100 total XP, one cleared floor, and an eligible consecutive-day streak increment.
5. Daily resets are **00:00 UTC**. Yesterday's cleared floor still counts if today is missed, but the active streak expires after the missed day passes.
6. Practice is isolated from daily rewards. It can be used any time. Cosmetic stars reflect 3/2/1 based on attempt count; they confer no extra XP.

## Repository structure

```text
src/app/page.tsx             Responsive tower dashboard, story, practice, wheel
src/app/globals.css          Base mobile-first layout and game board rules
src/app/theme-v1_4.css       Previous world styles and interaction foundations
src/app/theme-v1_5.css       Current cinematic scenes and responsive art layouts
public/art/*.webp            Original AI-generated concept-art crops (~388 KB total)
public/art/tower-world.svg  Original illustrated castle (about 8 KB)
src/hooks/useTowerAudio.ts   Opt-in, file-free Web Audio ambient synthesis
src/app/api/game/route.ts    Signed session, daily game API, validation entrypoint
src/components/GameStage.tsx Six interactive game UIs and results
src/lib/tower.ts             Deterministic game engines and reward rules (pure TS)
src/lib/store.ts             Atomic persistence: local JSON or PostgreSQL row lock
tests/tower.test.ts          Pure-engine correctness and abuse boundary checks
docs/schema.sql             PostgreSQL migration
docs/explainer.md            Submission explainer and AI disclosure
```

## Testing & known constraints

`npm run test` validates deterministic daily assignments, yesterday-pair exclusion, seeded retries, game answer logic, circuit reachability, early-submit rejection, idempotent rewards, floor/streak behavior, and prevention of unrevealed wheel pair exposure. It does **not** replace mobile/E2E validation or concurrency/load testing. A genuinely robust paid-reward system would need stronger human verification, identity/abuse limits, security review, logging, and infrastructure testing.

**Packaging note:** In the file-generation environment the public npm registry was unreachable and dependencies were not installed; thus the Next.js production build and full browser UI were **not** run here. Tests for the pure gameplay module were executed. Run `npm install && npm run typecheck && npm run build` locally before deploying.

## AI usage disclosure

AI was used for the initial game architecture, code scaffolding, UI design, server-side game logic, tests, and documentation. A human developer should test on-device, review the experience and security decisions, fix any issues found, and be ready to explain trade-offs in the assessment. Do not claim a manual security audit or production deployment that hasn't occurred.


## V1.1 mobile UX and wheel changes

- On narrow devices the Wheel of Fate is now the first card. The tower story sits below the daily action rather than pushing the wheel below the fold. The latest 320px layout uses a compact castle scene followed immediately by the wheel; the wheel CTA may require a short scroll on small phones.
- A daily wheel spin **commits the server-selected game immediately**, but keeps the previous public UI state until the 2.5-second wheel animation has ended. Only then does the result appear and the player get an Enter Trial button. This prevents the mission list or button from spoiling the result. Refreshing during a spin shows the committed game as a resumable trial; it does not grant a reroll.
- `/?demo=1` now includes **Preview wheel spin · no XP**, even for an already-cleared daily floor. It spins to a practice-only game, never posts a daily spin and cannot award XP.
- A cleared day's mission retains the number of the floor that was cleared. The next floor is named separately, preventing a confusing `Floor 02 · 2/2` state after clearing Floor 01.
- Motion-reduction preference skips the long wheel animation.
- The wheel now uses the CSS `transitionend` event to trigger its reveal (with a timeout fallback for reduced-motion or unusual browsers), rather than guessing when a frame has finished animating.
- Rotated wheel labels are clipped to the wheel circle; this prevents transformed labels from causing horizontal overflow on 320px screens.


## Story, accessibility and audio

- The floor ending ceremony appears when you return from the second successful daily trial. It can be replayed without duplicating a reward. `?demo=1` can preview the wheel, endings and Chronicle without issuing XP.
- The latest world uses locally bundled WebP illustrations and optional synthesized sound. It requires no external art, font, image, or audio network calls.
- **Music uses Web Audio synthesis, not a bundled recording.** D-minor-pentatonic sine pads, low-passed synthesized wind, and isolated occasional bell tones give an understated magical mood. It has no drum beat or sampled vocal. No copyright attribution is needed because the sounds and SVG were authored for the app.
- **Data and control:** no audio request or AudioContext creation until Music is tapped; default is off. Choice is saved locally but, to respect autoplay restrictions, music is paused after reload and must be manually resumed. `visibilitychange` suspends audio while hidden. Music and SFX can be toggled separately; effects are always cosmetic.
- Reduced-motion users skip the automatic entrance, and ornamental animations are disabled. The entrance also offers a skip button and Escape support; controls remain keyboard-accessible.

**Verification:** Run `npm run test && npm run typecheck && npm run build` after `npm install`. The 21 native Node game/story/workflow tests pass, the changed TypeScript/JSX files pass syntax-transpilation checks, and a static visual composition was inspected at 320px, 390px and desktop widths with no horizontal overflow. Dependencies are not installed in the generation environment, so the complete Next.js build and live end-to-end server flow **could not be verified there**. Please verify on an Android-sized browser and a real device before publishing a live link.
