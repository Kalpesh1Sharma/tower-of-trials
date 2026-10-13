# Tower of Trials — Kenpath Labs build-task explainer

## What I built

Tower of Trials is a mobile-first daily puzzle adventure. Each day, a player spins the Wheel of Fate twice and plays the two server-assigned challenges. There are six mini-games covering logic, memory, observation, spatial reasoning, speed, and arithmetic. Each session is short, instructions are deliberately simple, and the puzzles rely mainly on taps and symbols rather than English fluency.

Players earn XP for completing trials and unlock a new floor and a short Chronicle story fragment after clearing both. The Practice Hall exposes all six games immediately, so reviewers do not need to wait for a daily reset. `?demo=1` adds reward-free previews of the wheel and story endings.

## Product and reward decisions

I built the wheel around a *server-assigned result*, not a client-side random animation. Each day's two games are different, and the previous day's pair cannot recur unchanged. A failed trial allows up to three full attempts; retries generate fresh seeded puzzles instead of repeating an answer that was just revealed.

Each successful daily trial awards **40 XP**, and completing both grants an additional **20 XP**. Floors cleared are permanent, while streaks separately reward consecutive successful days. XP and stars are virtual achievements with **no monetary value**. I left out artificial reward currencies such as keys with nothing to unlock.

## Engineering and trust boundaries

The application uses Next.js App Router, React, TypeScript, and a server-side PostgreSQL connection through `pg`. Signed HTTP-only anonymous session cookies identify a browser without requiring signup. A small JSON store supports single-process local development; the deployed app uses Supabase PostgreSQL. Server-side transactions and row locks protect reward updates from duplicate claims, while practice gameplay is isolated from XP and daily limits.

The server issues puzzles, checks submitted answers, enforces retry limits, and rejects implausibly fast successful submissions. However, games that display memory paths or observation boards expose necessary information to the browser. Automated clients may inspect it, and a timer cannot prove human participation. Lightning Order timing and cosmetic stars are **not secure human verification**. I would not apply this design to cash rewards without a substantially stronger abuse-prevention system.

## Experience and constraints

The tower theme gives the short daily loop a reason to continue: each cleared floor reveals another fragment of the story. I used a skippable entrance, locally bundled and optimized AI-generated environment artwork, real interactive game components, large mobile touch targets, and reduced-motion support. Optional background ambience is synthesized with Web Audio after the user opts in; it is off by default and pauses when the tab is hidden. The current music requires no downloaded soundtrack.

I deliberately omitted multiplayer, leaderboards, paid rewards, account recovery, streak freezes, push notifications, and large asset packs. The focus was a finished two-trial loop, six working puzzles, trustworthy accounting for *virtual* rewards, and a readable phone-first presentation.

## Testing, deployment, and AI disclosure

I ran the automated game tests and verified a production Next.js build. The app was deployed to Vercel with Supabase PostgreSQL; its production smoke test confirmed a persisted anonymous session, a validated practice puzzle, duplicate-claim protection, and no daily rewards consumed. This does not substitute for full concurrency, fraud, accessibility, or real-device testing.

I used AI assistance for brainstorming, code architecture and implementation, visual direction and AI-generated artwork, tests, and drafting documentation. I reviewed the result through local builds, manual browser testing, and iterations on database setup, request latency, refresh behavior, and mobile usability. The repository includes the code, setup instructions, schema, tests, and smoke-test script.
