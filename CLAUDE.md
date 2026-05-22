# Egerer Classic 2026 — Tournament PWA

Mobile-first iPhone PWA for a private 2-day, 19-player golf tournament (May 29–30, 2026, Scottsdale AZ).
Live: **https://egerer-classic-2026.vercel.app** · GitHub: `matt-dcp/egerer-classic-2026`

> Owner is Matt Shamus. The app is feature-complete; current focus is **stress-testing before tournament day**. See "NEXT TASK" below.

---

## Build / deploy workflow (do this exactly)
Node is via nvm — every shell needs the PATH export first:
```bash
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
cd "/Users/mattshamus/Downloads/Claude Code/egerer-classic-2026"
npx tsc --noEmit            # type-check
npm run build               # vite build
git add src/ && git commit -m "..." && git push origin main
npx vercel --prod --yes     # deploy; alias is egerer-classic-2026.vercel.app
npx vercel inspect egerer-classic-2026.vercel.app   # confirm "status ● Ready"
```
`gh` CLI is NOT installed; pushing workflow files fails (no `workflow` OAuth scope). Use `npx vercel`, not `vercel`.

## Verifying UI (preview tool)
Use `mcp__Claude_Preview__preview_start` with url `https://egerer-classic-2026.vercel.app`, `preview_resize` to 390×844 (iPhone), and drive via `preview_eval` (one React-rerendering action per eval — clicks fired synchronously in one eval don't see re-renders). Onboard by setting `localStorage['ec-my-player-id']='p2'` (Matt Shamus = admin). Admin PIN is **4244**.

## Tech stack
React 18 + TypeScript + Vite + Tailwind v4 (`@theme` in `src/index.css`) + Supabase (Postgres + realtime) + Vercel PWA. State in `src/lib/TournamentContext.tsx`. Theme: navy `#343f4b` (`forest` token), cream, gold; logo cyan `#01ADEE`.

## Supabase
Project ref `wfgevxlvenyzhyshrghv` (was paused/restored). Keys in `.env` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (also set in Vercel prod env), `SUPABASE_SERVICE_ROLE_KEY` (for scripts). Free tier pauses after 7 days idle → a scheduled task "egerer-supabase-keepwarm" pings it every 2 days. Synced tables: `app_scores, admin_settings, teams, stroke_play_matchups, best_ball_pairings (has is_pressure_bet col), foursomes`. Courses/holes/players come from `src/lib/demoData.ts` (NOT synced). A Supabase management access token was used once and should be revoked by the owner.

## Roster & handicaps (`src/lib/demoData.ts` DEMO_PLAYERS — 19 players)
**Handicaps are used AS-IS — no slope conversion.** `calculateCourseHandicap()` in `scoring.ts` now just rounds the input. Each player has TWO handicaps:
- `handicap_index` = **individual** course handicap → individual net leaderboard + individual stats/player-detail/highlights.
- `team_handicap` = **team-play** handicap → Day 1 matchups, Day 2 best ball (`teamCompetition.ts`), matchup-card scorecards, **score-entry views (scorecard/stepper/round-complete)**, and **side games**.
- Identical for 16 players. Differ for **Christos Celmayster, Peter Norman, Scott Schukart = 18 individual / 21 team**. `formatHandicap()` shows "18/21" in displays for these three.
- Admin is **Matt Shamus = player id `p2`** (`ADMIN_PLAYER_ID` in BottomNav.tsx + Admin.tsx). IDs are p1–p15, p17–p20 (gap at p16 — Trey Evans removed; don't renumber, it'd break admin).

## Courses / tees (`demoData.ts`)
R1 Troon North Monument — **Gold** tees (slope 136, par 72). R2 We-Ko-Pa Saguaro — **Purple** tees (slope 132, **par 71**). Pars/stroke-index verified from Greenskeeper; confirm vs physical card on arrival.

## Format & points (12 + 12)
- **Day 1 (12 pts), 1v1 net stroke play:** winner = 1 pt. One **solo player** (on the 9-player team) plays **2 matches** (vs two opponents on the 10-player team), each a **pressure match worth 2 pts**. So 8 regular + 2 solo = 12. The matchup editor allows a player in 2 matchups (dedup removed). Their 2 matchups pair into one **3-player threesome** foursome.
- **Day 2 (12 pts), 2v2 net best ball:** win = 2 pts. One **one-vs-two** match = the **pressure match worth 4 pts**. Represented as a BestBallPairing with the solo player entered in BOTH slots of his side (`[solo,solo]` vs `[p1,p2]`); best-ball math resolves to his score; names dedup for display; foursome renders as a 3-player threesome. So 4 regular + 1 pressure = 12.
- Pressure toggle (flame) per matchup/pairing in Admin. Leaderboard point totals are computed dynamically.

## Purse (Info tab + Leaderboard banner)
19 × $200 = **$3,800**. Day 1 match winners $100 each (halved match splits $50/$50) = $1,000. Overall team winner $100/player = $1,000 (if the 9-player team wins, captain gets +$100). Balance **$1,800** → individual podium **1st $1,100 / 2nd $450 / 3rd $250**.

## Key gotchas / decisions already made
- `flushQueue` (TournamentContext) processes a snapshot and removes only succeeded ops + self-triggers — fixes silent loss of ops enqueued mid-flush during rapid entry. Don't reintroduce "overwrite the queue."
- Sync flushes on `online` + `visibilitychange` (backgrounded PWA pauses sync). Header has a manual Refresh button.
- Teams use `mergeTeams()` so neither team vanishes if Supabase lacks one. Team A=`team-a`, B=`team-b` always exist.
- Scorecard sticky name column: opaque bg + `z-10` (score cells are `position:relative` and were painting over it).
- "Switch player" button shows for ALL players (not just admin) — logout clears admin so it must be reachable.
- Match cards say "won by" once both players finish 18 (`result.result !== 'in_progress'`), else "leads by".
- Foursome `player_ids` are deduped (`[...new Set()]`) at score-entry expansion so a 1v2 shows 3 players.
- App icon = navy bg + circular logo (`public/icon-*.png`); regenerate with PIL if logo changes.

## NEXT TASK — full-tournament stress test (in progress, not started)
Owner asked to simulate the whole tournament to find bugs/edge cases. Agreed plan: realistic handicap-based baseline + deliberate edge-case injection, **verifying the rendered app** (not just data). Drive unusual setup (teams, solo 2-matchups, 1v2) + verify in preview; bulk-fill scores via a Supabase script. Resilience/sync layer already covered separately — focus on tournament LOGIC/DISPLAY. Specifically hunt: two-handicap split (18 indiv vs 21 team simultaneously), solo-player Day-1, 1v2 Day-2, threesome score-entry views, halved matches (0.5/0.5 + $50/$50 + "Halved"), individual-leaderboard ties (T1/T2), R1-lock→R2 transition, "leads by"→"won by" flip.
Scenarios: (1) clean full run, (2) edge-case heavy, (3) in-progress/transition states. Reset all data between scenarios via Admin → Reset All Data (or clear Supabase tables via service-role script).

## Open items (waiting on owner / Justin)
- Optional: dry-run the Day-1 solo + Day-2 1v2 Admin setup with a sample 10/9 team split.
- Confirm courses/tees vs physical scorecards on arrival.
- Teams/captains/matchups/foursomes are drafted live the night before via Admin panel.

## Sibling project — do NOT touch from here
`../golf-app-product/` is the separate productized-SaaS version (its own CLAUDE.md). This folder is the private one-off tournament app only.
