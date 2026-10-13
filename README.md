# 🏰 Tower of Trials

**Two spins. Two trials. One floor.**

Tower of Trials is a mobile-first daily puzzle adventure built for the **Kenpath Labs Full Stack Engineer build task**. Every day, a mysterious wheel assigns two quick challenges. Complete both to earn XP, continue your streak, climb a floor, and reveal another piece of the tower's story.

**[Play the live app](https://tower-of-trials.vercel.app)** · **[Try all six games](https://tower-of-trials.vercel.app/?demo=1)** · **[Read the build-task explainer](docs/explainer.md)**

<p align="center">
  <img src="public/art/castle-home.webp" alt="Moonlit castle environment artwork used in Tower of Trials" width="720" />
</p>

*The illustrated environment is bundled locally. The wheel, game boards, navigation, and rewards are real interactive components—not a screenshot-based interface.*

## How it works

1. **Spin the Wheel of Fate.** The server assigns a trial from six available mini-games.
2. **Play your trial.** You have up to three full attempts, with a fresh puzzle on every retry.
3. **Spin again.** Finish or exhaust the first trial to unlock the second, different game.
4. **Climb the tower.** Win both daily trials to clear a floor and unlock a story fragment. Return tomorrow for a new pair.

Each daily win earns **40 XP**. Clearing both earns an additional **20 XP**, for **100 XP maximum per cleared day**. Floors cleared are permanent; streaks reflect consecutive successful days and may reset. The daily reset is at **00:00 UTC**.

### Six trials

| Trial | Skill | Challenge |
| --- | --- | --- |
| **Cipher Lock** | Logic | Crack a hidden four-symbol code in up to six guesses. |
| **Ghost Trail** | Memory | Watch a glowing path and retrace it in order. |
| **Shifting Chamber** | Observation | Find the tile that changed after the board shifts. |
| **Rune Circuit** | Spatial reasoning | Rotate runes to connect an energy route. |
| **Lightning Order** | Speed | Tap numbered sigils in ascending order. |
| **Sum Forge** | Arithmetic | Select two stones that add to a target number. |

### Designed for short daily visits

- **Practice Hall:** All six games are playable at any time, with no effect on XP, spins, streaks, or floors.
- **The Chronicle:** Twenty-five floor-specific story fragments, with further progression supported.
- **Reviewer preview:** Add `?demo=1` to the URL to preview wheel spins, endings, and story content without changing rewards.
- **Mobile-first:** Large touch targets, short instructions, locally bundled compressed artwork, and reduced-motion support.
- **Optional ambience:** Calm Web Audio music is synthesized in the browser after opt-in; sound effects have a separate toggle. Music is off by default and pauses when the tab is hidden.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, CSS |
| API | Next.js Route Handler (`/api/game`) |
| Production persistence | Supabase PostgreSQL via the server-only `pg` driver |
| Local persistence | Single-process JSON store in ignored `.data/` |
| Authentication | Anonymous, signed, HTTP-only session cookie |
| Hosting | Vercel |
| Testing | Node's built-in test runner and a deployed API smoke-test script |

## Run locally

**Requirements:** Node.js 22+ and npm.

```bash
git clone https://github.com/Kalpesh1Sharma/tower-of-trials.git
cd tower-of-trials
npm ci
npm run dev
```

Visit **http://localhost:3000**.

No database account or environment variables are required for the default local development mode. Progress is saved to `.data/` on your machine, and development session secrets are generated locally. This JSON mode supports **one local server process only**; it must not be used for serverless production hosting.

### Optional: run against PostgreSQL locally

1. Create a Supabase PostgreSQL project and execute [`docs/schema.sql`](docs/schema.sql) in the SQL Editor.
2. Copy `.env.example` to `.env.local` (PowerShell: `Copy-Item .env.example .env.local`).
3. Set `DATABASE_URL`, `SESSION_SECRET`, and `PUZZLE_SECRET` using private values, then restart the server.

```dotenv
DATABASE_URL="postgresql://YOUR_POOLER_CONNECTION_URI"
SESSION_SECRET="YOUR_RANDOM_SECRET_1"
PUZZLE_SECRET="YOUR_RANDOM_SECRET_2"
```

Generate **two different** secrets with 32 or more random bytes each. For example, run this command twice:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env.local`, database passwords, or real secret values. The repository's `.gitignore` excludes local environment files.

## Checks and deployment

```bash
npm test
npm run typecheck
npm run build
npm run smoke -- https://tower-of-trials.vercel.app
```

The current test suite contains **24 automated tests** covering puzzle correctness, seeded retries, wheel selection, reward idempotency, floor/streak rules, practice isolation, and the two-spin workflow. The smoke test creates its own anonymous test session and verifies practice-mode persistence and duplicate-claim protection **without spending daily spins or awarding XP**.

For a new deployment:

1. Run [`docs/schema.sql`](docs/schema.sql) on a PostgreSQL database (it enables RLS and restricts browser roles).
2. Set `DATABASE_URL`, `SESSION_SECRET`, and `PUZZLE_SECRET` as **server-side** environment variables in Vercel. Supabase's **Transaction pooler** is suitable for the serverless runtime.
3. Deploy the repository and run the smoke test against the resulting public URL.
4. Test gameplay, refresh/persistence, and touch targets on a real phone before submitting.

For a more detailed checklist, see [`docs/production-checklist.md`](docs/production-checklist.md).

## Engineering decisions and limitations

- **Server-selected wheel:** The server determines and saves the daily games. The UI begins its animation immediately but reveals the assigned result only after the wheel stops. The two games are distinct, and the exact pair cannot repeat on the following day.
- **Authoritative rewards:** The server validates puzzle submissions, retry limits, and conservative minimum durations. XP and floor progress are updated transactionally under a PostgreSQL row lock; clients cannot submit their own XP totals.
- **Fair retries:** Each daily trial has at most three attempts, and a failed attempt generates a different seeded challenge.
- **Honest verification boundary:** Client-rendered memory/observation information can be inspected or automated. Timing checks do **not** prove human play, and decorative stars are not an anti-cheat measure.
- **No monetary rewards:** XP and stars are virtual achievements with no cash-out value. This is **not** an anti-fraud system for real-money incentives.
- **Deliberate scope:** No login/signup flow, cross-device account sync, payouts, leaderboard, push notifications, or multiplayer. Anonymous progress belongs to the browser session represented by its cookie.

## Project structure

```text
src/app/page.tsx             Tower dashboard, wheel, Practice Hall, Chronicle
src/app/api/game/route.ts    Signed guest session and game API
src/components/GameStage.tsx Six interactive game screens
src/components/TowerEnding.tsx
src/hooks/useTowerAudio.ts   Optional synthesized ambience and SFX
src/lib/tower.ts             Puzzle generation, checking, progression
src/lib/game-actions.ts      Daily/practice action rules
src/lib/store.ts             JSON development store / PostgreSQL transactions
public/art/                  Locally bundled fantasy artwork
tests/                       Game, workflow, story, wheel-motion tests
scripts/smoke.mjs            Non-destructive production API smoke test
docs/schema.sql              PostgreSQL schema and access restrictions
docs/explainer.md            Build-task decisions and AI disclosure
```

## AI assistance and credits

I used AI tools for brainstorming, architectural exploration, code scaffolding, UI development, testing support, documentation, and the generation of the original fantasy artwork. I chose the product scope and trade-offs, tested the local build and production connection, and iterated on gameplay responsiveness and deployment issues. Generated art was optimized and bundled locally; the current background ambience is synthesized with Web Audio rather than using a licensed music recording.

Read the accompanying [build-task explainer](docs/explainer.md) for the reasoning behind the design, verification limits, and omitted features.

---

**Tower of Trials** — a small daily adventure designed for repeat visits, clear rewards, and practical mobile performance.
