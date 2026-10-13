# Tower of Trials — Kenpath Labs build-task explainer

## What I built

Tower of Trials is a low-bandwidth daily micro-game experience with a tiny narrative progression system. The player spins a wheel twice per UTC day and completes the two assigned games. The tower has six different puzzle types: a codebreaker, a memory path, a spot-the-change board, a circuit-rotation puzzle, a number tapping game, and an arithmetic pairing challenge. Playing takes only a few minutes, requires minimal English, and runs entirely on large touch targets and CSS graphics and locally bundled optimized WebP artwork, without external font or image requests.

I added a Practice Hall where all six games can be explored immediately, so a reviewer can inspect more than just the two randomly assigned games. `?demo=1` unlocks story preview navigation, without changing rewards or progress.

## Product decisions

The wheel is real: the server picks the games, saves both choices, and the visual animation reveals the server-assigned result. Two different games are assigned per day, excluding the same unordered pair as yesterday. A failed attempt regenerates a different seeded challenge. A trial is limited to three attempts so failures matter, but practice is always available.

A successful daily trial earns 40 XP; clearing both earns another 20 XP. Points and decorative stars are **not currency**. A cleared floor never disappears; a missed day can break a streak but cannot undo a player's long-term progress. No fictional Tower Key is awarded without a use for it.

## Engineering decisions and trust boundary

I used Next.js App Router, React, TypeScript, and PostgreSQL for deployable persistence. For local testing there is a separate single-process JSON store that works without external API keys or database setup. The server issues challenges, validates submitted answer structures and puzzle solutions, enforces three daily attempts and conservative minimum durations, and issues XP under a row-level locked database transaction. An HTTP-only signed anonymous session cookie ties progress to one browser session. Practice cannot award points.

The **limits are intentional and explicit**: the browser must receive the memory path and before/after observation boards to render them, so a motivated user can inspect those values. Minimum-duration checks stop only obviously premature submits. A client can also automate taps or use OCR. Lightning Order timing cannot prove human speed; stars are purely cosmetic, and there is no cash-out or leaderboard. I would not ship cash-like rewards or claim strong fraud protection from these checks alone.

## What I intentionally left out

I omitted multiplayer leaderboards, pay-outs, streak freezes, accounts and social logins, push notifications, and heavy asset packs. The goal was to make the daily assignment, six playable trials, fair persistence, retry rules, a simple story, and a responsive phone-first design clear and reliable.

## V1.4 experience: visual world, narrative and optional audio

I moved away from static dark panels toward an original illustrated tower environment reused consistently across a short gate-opening entrance, the daily ascent, the Practice Hall and the Chronicle. The gate sequence is skippable and only plays once per session; a replay action helps reviewers inspect it. The wheel remains the clear primary action on narrow phones. V1.5 replaces the earlier SVG-based look with locally bundled, optimized AI-generated fantasy environment illustrations; the entrance, home, practice and Chronicle remain genuine interactive app components.

For audio I removed the bundled music loops and used the Web Audio API to generate quiet D-minor-pentatonic pads, gently filtered noise and sparse bell tones. There is **no recognizable melody, drum beat or vocal sample**, and no audio file at all. Importantly, an AudioContext is created only on a user's tap, music is off on load and suspended when the tab is hidden. Sound effects are independent and cosmetic. The music preference can be remembered without forcing autoplay on a later visit.

This remains a lightweight app for modest phones and mobile data: the ten local WebP illustration crops total about **388 KB**, motion can be reduced, no external fonts are loaded and the audio assets weigh **0 KB**. Neither visuals nor sounds affect reward accounting, server-side puzzle validation or practice isolation.

## AI tool disclosure

I used AI coding assistance for brainstorming, game architecture, initial implementation, UI, tests, and draft documentation. Before submitting, I will personally verify the final deployed build on mobile, understand the state transitions and server validation, and include any fixes found during hands-on testing. The provided source includes tests, a migration, environment examples, and a clone-to-run README.

## V1.5 visual implementation and AI disclosure

The four screen concepts were translated into responsive, interactive DOM layouts with local art crops: the cinematic gate entrance, castle ascent home and wheel, illustrated Practice Hall, and Chronicle. The artwork originates from AI-generated concept mockups and was cropped and compressed for this app; it is not a screenshot-based interface. AI coding assistance also supported CSS, copy and implementation. XP remains cosmetic/virtual and the verification boundary described above is unchanged.

## Final submission QA note

The assessment reviewer can access all six playable games in Practice Hall without consuming daily rewards. The production readiness work adds tests around the complete two-spin flow, reward idempotency, practice isolation, and UTC day changes. A public URL, PostgreSQL smoke test and actual Android device check are still required before claiming deployment is verified.
