# Tower of Trials — production submission checklist

## 1. Freeze scope
- V1.5 is the **frozen UI**. Subsequent changes are reliability and deployment only.
- Keep six games, two spins per UTC day, capped retries, practice without XP, server-awarded rewards, and 25 story endings.
- No leaderboard, payouts, signup, or extra games for this assessment.

## 2. Local checks (Windows PowerShell)
```powershell
npm install
npm test
npm run typecheck
npm run build
npm run dev
```
- Only claim these passed after seeing their actual output on your machine.
- Use Chrome Device Toolbar at **320×608**, **360×800**, **390×844**, plus one real Android phone if available.
- Verify no sideways scroll; buttons remain tappable; Practice Hall displays all six games.
- Verify the wheel reveals the result after stopping; refreshing after a spin must not reroll.
- Use `/?demo=1` to preview wheel and story ending safely.

## 3. Supabase
1. Create a PostgreSQL project.
2. Run `docs/schema.sql` in SQL Editor. It creates `public.tower_players`, enables RLS and revokes anon/authenticated table access. The browser must never query the table directly.
3. Copy a **private server-side** connection string from Supabase, ideally the transaction pooler URI compatible with serverless deployments; add `sslmode=require` if Supabase provides/requires it.
4. Generate two separate secrets, each 32+ random bytes (PowerShell: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
5. Never commit keys or put `DATABASE_URL` into a `NEXT_PUBLIC_` variable.

## 4. Vercel
1. Create a GitHub repository for the extracted project. Commit source, docs, tests, art and the generated lockfile (if present), **not** `.env` or `.data`.
2. Import it in Vercel as a Next.js app.
3. Add `DATABASE_URL`, `SESSION_SECRET`, `PUZZLE_SECRET` in **Production** environment variables. Keep the secrets stable across redeploys so player sessions and daily challenge state survive.
4. Deploy. If a database error occurs, check Supabase connection string, schema, project IP/connection restrictions and SSL settings.
5. Confirm the site loads with no Vercel authentication gate; use an incognito window and an actual phone on mobile data.
6. Run `npm run smoke -- https://your-project.vercel.app`. This creates a test guest and checks practice, persistence, idempotency and unchanged daily rewards, without using spins.

## 5. Manual reward integrity checks
- Fresh guest sees 2 spins and 0 XP. One spin yields exactly one server-assigned trial.
- Another spin is unavailable until trial one finishes or permanently fails.
- Failed daily attempts create fresh puzzles, at most 3 attempts.
- Win a daily game once: +40 XP exactly. Repeat its submit: no extra XP.
- Win both: 100 XP total for day, exactly one floor increment and a story ending.
- Refresh during the spin or a game: progress remains; no free rerolls or duplicate rewards.
- Practice all six repeatedly: 0 spins, XP, floors and streak changes.
- Switch tabs/reopen after UTC midnight (00:00 UTC): new day's spins load automatically when idle.
- Missing a day resets streak eligibility without reducing floors or XP.
- Stars and XP have no monetary value; never describe them as withdrawable money.

## 6. Kenpath submission
- **Live link:** public production URL; check it from a phone without signing in.
- **Repository:** README with installation, env names, schema instructions, tests and limitations.
- **Explainer:** `docs/explainer.md` is the draft. Before submission, verify each factual claim and explicitly disclose AI assistance, what the server can validate, client-side limitations and omitted features.
- Capture a short unedited phone demo (optional): entrance → wheel → one trial → Practice Hall → demo Chronicle. A reviewer should discover all six games without waiting for days.

## What is NOT verified in this development environment
The npm package registry was unreachable (`EAI_AGAIN`). Consequently a complete Next.js typecheck/build and real Vercel+Supabase smoke test have not been run here. Local Node tests cover pure gameplay and state transitions, **not** actual browser requests or PostgreSQL concurrency.
