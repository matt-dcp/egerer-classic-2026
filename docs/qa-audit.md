# Egerer Classic 2026 — Pre-Production QA Audit

Audit date: 2026-05-21. Scope: full app (React 18 + TS + Vite, Tailwind v4, react-router v7, vite-plugin-pwa; single React context + localStorage + Supabase sync). Target: installable iPhone PWA used live by ~20 known users on flaky cell. Threat model: hobby app, no PII/payments — **not** security-sensitive.

Severity: **P0** ship-blocker · **P1** fix before tournament · **P2** should fix · **P3** nice-to-have.

> Phase 1 = findings only (this section). Fix status is appended in Phase 5.

---

## Summary table

| ID | Sev | Area | One-line |
|----|-----|------|----------|
| P1-1 | P1 | Mobile UX | Primary score +/- buttons are 36px (need 44px) — most-tapped element |
| P1-2 | P1 | Mobile UX | Hole-jump progress dots are 10px tap targets |
| P1-3 | P2 | Mobile UX | Clear-score button 24px |
| P1-4 | P2 | Mobile UX | Hole-nav chevrons 36px |
| P1-5 | P2 | Mobile UX | Header refresh (28px) + logout (~24px) below 44px |
| P1-6 | P2 | Mobile UX | Admin icon buttons (~24px) — trash/flame toggles |
| P1-7 | P2 | Mobile UX | iOS input zoom: focusable inputs/selects <16px font |
| P1-8 | P2 | Mobile UX | black-translucent status bar over cream inset → low-contrast glyphs + seam |
| P1-9 | P2 | Mobile UX | Onboarding uses 100vh (`min-h-screen`) not svh/dvh |
| P1-10 | P3 | Mobile UX | Swipe-to-change-hole has no vertical guard / edge-back conflict |
| P1-11 | P3 | Mobile UX | PWA polish: no iOS splash screens, single touch-icon size |
| P2-1 | P2 | Abuse | `showScoreEntry` admin toggle is a no-op (dead control) |
| P2-2 | P2 | Abuse | `showLeaderboard` admin toggle is a no-op (dead control) |
| P2-3 | P3 | Abuse | Matchup/pairing/foursome/team deletes have no confirm |
| P2-6 | P2 | Abuse/Data | "Save & Next" silently records **par** for untouched players |
| P3-1 | P2 | Data/race | Offline conflict resolution keyed on **client clock** (skew = wrong winner) |
| P3-2 | P2 | Data/logic | A missing hole makes a team match **never finalize / never score** |
| P3-3 | P3 | Data | No gross clamp in `submitScore` (stepper clamps 1–15; DB CHECK 1–20) |
| P3-6 | P3 | Data | Bad write (outside DB CHECK) loops in queue forever; UI shows phantom score |
| P3-7 | P3 | Abuse | `window.__ec_submitScore` exposed in prod (unclamped write path) |
| P4-1 | P3 | Perf | Single 156 kB-gzip chunk, no route code-splitting |
| P4-2 | P3 | Perf | Context value not memoized → broad re-renders on every score |
| — | PASS | Abuse | Idempotent writes, admin gating, no service key in bundle |

---

## Priority 1 — Mobile web UX

### P1-1 [P1] Score +/- buttons below 44px — `src/components/ScoreStepperCompact.tsx:37-42, 47-52`
`w-9 h-9` = 36×36px on the increment/decrement buttons. These are the **single most-tapped controls** in the app (every player, every hole, all weekend, on a phone). Apple HIG minimum is 44×44px.
**Fix:** `w-11 h-11` (44px). Keep icon size; only the hit area grows.

### P1-2 [P1] Hole progress dots are 10px tap targets — `src/components/FoursomeHoleByHole.tsx:108-119`
`w-2.5 h-2.5` (10px) buttons, 18 in a row, each `onClick` jumps to that hole. Effectively un-tappable accurately on a phone; users will hit the wrong hole.
**Fix:** keep the dot visual but expand the hit area to ≥44px (e.g. wrap each dot in a `min-w-0 flex-1 py-3` invisible button, or render larger touch padding). Given 18 dots across ~360px the per-dot width is ~20px — make them at least full-height tappable and accept horizontal crowding, or replace with a hole-number scrubber.

### P1-3 [P2] Clear-score button 24px — `src/components/ScoreStepperCompact.tsx:29-35`
`w-6 h-6`. **Fix:** `w-11 h-11` (icon stays 14px).

### P1-4 [P2] Hole-nav chevrons 36px — `src/components/FoursomeHoleByHole.tsx:126-145`
`p-2` + 20px icon ≈ 36px. **Fix:** `p-3` (→ ~44px) or explicit `w-11 h-11`.

### P1-5 [P2] Header buttons below 44px — `src/components/Header.tsx:48-54, 56-64`
Refresh `w-7 h-7` (28px); logout/"switch player" `px-2 py-1` (~24px tall). **Fix:** bump to ≥44px hit area (visual can stay compact via inner padding).

### P1-6 [P2] Admin icon buttons ~24px — `src/pages/Admin.tsx` (243-256 remove player, 385-402 flame/trash, 462-479 flame/trash, 755, 866), `src/components/FoursomeSelector.tsx:39-42`, `src/components/SideGameSetup.tsx:42`
`p-1`/`p-1.5` ≈ 24px. Admin is one person (Matt) so lower priority, but he's also on a phone the night before drafting teams. **Fix:** `p-2.5`/min 44px on the destructive ones.

### P1-7 [P2] iOS input zoom on focus — `src/pages/Admin.tsx`
iOS Safari auto-zooms when a focused input/select has font-size <16px. Offenders: matchup/pairing/captain `<select>` at 228, 275, 361, 376, 495, 517 (`text-xs` = 12px); team-name `<input>` 211 (`text-sm` = 14px); announcement `<textarea>` 299 (`text-sm`). Admin-only. **Fix:** global rule `input, select, textarea { font-size: 16px }` in `index.css`, or `text-base` on these. (PIN input is `text-2xl`, fine.)

### P1-8 [P2] Status-bar contrast + notch seam — `index.html:9`, `src/index.css:23,30`
`apple-mobile-web-app-status-bar-style="black-translucent"` renders **white** status glyphs, but `body` has `background-color: cream` and `padding-top: env(safe-area-inset-top)`, so the notch inset shows cream → white time/battery on near-white = unreadable, plus a cream seam above the navy header. (Content is **not** hidden — body padding clears the notch.)
**Fix:** either set status-bar style to `default` (dark glyphs) or paint the top inset navy — e.g. `html { background: var(--color-forest) }` and keep body cream, or a fixed navy spacer of height `env(safe-area-inset-top)`.

### P1-9 [P2] 100vh on iOS — `src/components/Onboarding.tsx:17`
`min-h-screen` (100vh) is taller than the visible area when Safari's toolbar is showing, causing clipped content / odd scroll on the welcome + name-select steps. **Fix:** `min-h-[100svh]`. (Rest of app uses `min-h-full` on a height:100% `#root`, which is fine.)

### P1-10 [P3] Swipe-to-change-hole — `src/components/FoursomeHoleByHole.tsx:80-99`
Horizontal swipe changes holes with only a 50px X threshold and **no Y guard**, so a slightly-diagonal vertical scroll can skip a hole. In non-installed Safari a left-edge swipe also competes with back-navigation. **Fix:** ignore the gesture when `|deltaY| > |deltaX|`; optionally require the gesture to start away from the screen edge.

### P1-11 [P3] PWA polish — `index.html`, `vite.config.ts`
No `apple-touch-startup-image` splash screens → white flash when launching from the home screen on iOS. Only one `apple-touch-icon` (180). Manifest `orientation: portrait` is ignored by iOS Safari, so rotation reflows the app — verify landscape doesn't break (tables get wide). **Fix:** add a couple of splash images (or accept the flash); confirm landscape is at least usable.

### Loading states — acceptable
First paint renders the shell immediately; data fills in after the Supabase fetch (empty rows / "Welcome" ticker for <1s on cold load, instant once PWA-cached). No >300ms blank screen in normal use. No global skeleton, but not a blocker.

---

## Priority 2 — Abuse resistance (client-side guards only)

### P2-1 [P2] `showScoreEntry` is a dead control — `src/lib/TournamentContext.tsx:25,36`, `src/pages/Admin.tsx:128`
The toggle is stored and rendered ("Score Entry: Hidden") but **never read** anywhere — `ScoreEntry.tsx` does not consult it. Players can always score even when admin "hid" it. **Fix:** gate `ScoreEntry` on `adminSettings.showScoreEntry` (render a "Scoring is closed" notice), or remove the toggle so it doesn't lie.

### P2-2 [P2] `showLeaderboard` is a dead control — `src/lib/TournamentContext.tsx` (default), consumers: none
Set in Admin, never consumed (grep: only `showTeams`/`showDay1Matchups`/`showDay2Matchups` are read in `Leaderboard.tsx`). The individual leaderboard is always visible. **Fix:** gate the individual view or remove the toggle.

### P2-3 [P3] Destructive admin actions without confirm — `src/pages/Admin.tsx:244, 397, 474, 755, 866`
Removing a team member, deleting a matchup/pairing, or deleting a foursome is one tap, no confirm. Reversible but a mis-tap during setup loses work. (Reset-all **does** have a confirm at line 78 — good.) **Fix:** `confirm()` on foursome + matchup/pairing deletes.

### P2-6 [P2] "Save & Next" records par for untouched players — `src/components/FoursomeHoleByHole.tsx:56, 170-186`
The stepper defaults to `hole.par` when a player has no score yet (line 56). "Save & Next" writes **every** player's currently-displayed value (line 172-175), so any player the scorer didn't explicitly adjust gets **par** silently committed. In live play a scorer who taps through holes will fabricate par scores. **Fix:** only persist players whose value was changed/entered this hole, or visually mark un-entered players and exclude them from the bulk save.

### P2-7 [P2] "Lone Wolf" is silently broken — `src/lib/sideGames.ts:217`, `src/components/WolfDisplay.tsx:66`
The Wolf side game's "Lone Wolf" button calls `onSelectPartner(hole, null)`. But `calculateWolf` reads `const partnerId = wolfPartnerSelections[h] ?? undefined`, and `null ?? undefined === undefined`, so a lone-wolf selection is indistinguishable from "no selection": the hole is skipped (line 219), the wolf never scores, and the hole stays in "WOLF PARTNER NEEDED" forever. (Found by a pinned unit test — `sideGames.test.ts`.)
**Fix:** distinguish "absent" from "null" — e.g. `const partnerId = h in wolfPartnerSelections ? wolfPartnerSelections[h] : undefined`. Optional side game, but currently half-broken.

### PASS — idempotency, admin gating, secrets
- **Idempotent writes:** scores use deterministic id `s-{round}-{player}-{hole}` and `upsert` (`TournamentContext.tsx:294, 317, 349`), so double-tap submit cannot create duplicate rows.
- **Admin gating:** `/admin` requires `isAdmin && currentPlayerId==='p2'` (`Admin.tsx:22`); the Admin tab only renders for p2 (`BottomNav.tsx:12,18`). A curious user hitting `/admin` sees only the PIN gate.
- **No secrets in bundle:** client uses `VITE_SUPABASE_ANON_KEY` only (`supabase.ts`); the service-role key is unprefixed in `.env` and is **not** bundled. Verified.

---

## Priority 3 — Data integrity / forms / persistence / races

### P3-1 [P2] Conflict resolution keyed on client clock — `src/lib/TournamentContext.tsx:295, 345, 718, 805-808`
`updated_at = new Date().toISOString()` is the **device** clock. Realtime merge keeps the row with the lexically-greater `updated_at` (line 718: `incoming.updated_at > prev[idx].updated_at`). Two devices editing the same score offline → the one whose **clock is ahead** wins on sync, regardless of who actually edited last. On flaky cell with unsynced phones this can silently revert a correction.
**Repro:** Device A (clock +10 min) writes gross 5 at 10:00; Device B (correct clock) writes the true gross 6 at 10:05; both sync → A's stale "5" wins because its timestamp string is larger.
**Fix (no schema change):** trust the DB. The `app_scores.updated_at` column already defaults to `now()` server-side; select it back / let realtime payload carry the server value, and stop comparing client timestamps. Documented as P2 (acceptable for hobby use, but worth the small change).

### P3-2 [P2] A missing hole makes a team match never finalize — `src/lib/teamCompetition.ts:83-85, 162-164`
`bothComplete` requires `holesPlayed === 18` for **both** sides. If a scorer skips one hole, the match stays `in_progress` forever and **awards zero team points**, even though every other hole is in. The individual leaderboard handles partial cards fine, but team standings silently undercount.
**Repro:** Enter 17 of 18 holes for one player in a matchup → match shows "X UP / thru 17" permanently; team total never includes it.
**Mitigation present:** Admin → Score Completion grid (`Admin.tsx:563`) shows `holes/18` per player, so the admin can spot a missing hole. **Fix options:** keep the strict rule but make incompleteness loud (already partly done), or treat "all entered holes" as final once a round is locked.

### P3-3 [P3] No gross validation in `submitScore` — `src/lib/TournamentContext.tsx:292-327`
The stepper clamps 1–15 (`ScoreStepperCompact.tsx:38,48`) and the DB has `CHECK (gross_score between 1 and 20)`. But `submitScore` itself does no validation, so any non-stepper path can attempt an out-of-range write. **Fix:** clamp/validate in `submitScore` (1–20) before the optimistic local write.

### P3-6 [P3] Bad write loops forever + phantom local score — `src/lib/TournamentContext.tsx:305→317, 196-234`
Local state updates first (line 305), then the upsert is queued. If the upsert is permanently rejected (e.g. DB CHECK on an out-of-range gross from the exposed debug hook), the op never "succeeds", so it's never removed from the queue (line 227) and retries every flush forever, while the UI keeps showing a score the server will never accept. **Fix:** validate before optimistic write (ties to P3-3); optionally drop ops that fail with a non-retryable (4xx/constraint) error instead of retrying endlessly.

### P3-7 [P3] Debug write hook exposed in prod — `src/lib/TournamentContext.tsx:828-830`
`window.__ec_submitScore = submitScore` is assigned unconditionally. Anyone can open the console and write arbitrary scores, bypassing the stepper clamp. No real-world consequence for this app, but it's an unguarded, unclamped write path. **Fix:** guard with `if (import.meta.env.DEV)` or remove.

### P3-4 [P3] localStorage quota — `src/lib/TournamentContext.tsx:117-120` — acceptable
`safeSetItem` swallows quota/availability errors so the app never crashes; persistence just silently no-ops. Fine for this data volume; noted only.

### P3-5 [PASS] Flush mid-batch failure — `src/lib/TournamentContext.tsx:204-234`
`flushQueue` snapshots the batch and removes only ops that succeeded, preserving failed ops and any ops enqueued during the flush, then self-triggers. A mid-batch failure leaves the failed op queued for retry. Solid.

### P3-8 [P3] demoData ↔ app_scores mismatch — graceful
Leaderboard/teams iterate `demoData` players, so an `app_scores` row for an unknown `player_id` is ignored (never shown); a roster player with no scores shows "-". Team math skips unknown ids. No crash. Noted.

### Date/time — no real exposure
No tournament-day boundary or timezone logic exists; dates are static display strings in `demoData.ts`. The only clock dependency is `updated_at` (see P3-1).

---

## Priority 4 — Performance

### P4-1 [P3] Single chunk, no code-splitting — build output
Main JS: **568 kB raw / 156 kB gzipped** (under the 200 kB target). CSS 34 kB / 6.85 kB gz. One chunk — `Admin` (large editor, admin-only), `Champions`, `PlayerDetail` all load for every user. PWA precache (589 KiB) makes repeat loads instant, so this only affects cold first load on cell. **Fix (optional):** `React.lazy` the Admin/Champions/PlayerDetail routes to trim the initial chunk.

### P4-2 [P3] Context value not memoized — `src/lib/TournamentContext.tsx:833-845`
The provider's `value` is a fresh object every render, so every consumer re-renders on any state change. The expensive derivations (leaderboard/stats/ticker) are `useMemo`'d with correct deps so they don't recompute, but the re-render churn is avoidable during rapid realtime score bursts. **Fix:** wrap `value` in `useMemo`.

### P4-3 [P3] Ticker/stats scan all scores — `src/pages/Leaderboard.tsx:38-147` — acceptable
O(scores) recompute, memoized; fine at ~700 rows.

### P4-4 [flag — owner] Supabase query shape
Initial mount does `select('*')` on each synced table; realtime SUBSCRIBE re-fetches **all** `app_scores` on every (re)connect (`TournamentContext.tsx:793`) and a full `teams` re-fetch on any teams change (755). With 20 clients reconnecting on flaky cell this is chatty but payloads are small (hundreds of rows). No indexes addable here (schema-owner task) — flagged only.

---

## Cosmetic (carried from earlier scenario testing — not bugs)
- Matchup cards say "wins by"; the score-entry match strip says "WON by" / in-progress "N UP". Tense/terminology inconsistent across components.
- In-progress matchup margin compares cumulative net even when opponents are at very different "thru" counts ("Parker 37 UP / thru 18"). Cannot occur in real play (opponents share a foursome), so not fixed; noted for defensiveness.
- The "birdies" header stat counts **net** birdies; label omits "net" (consistent with the "nets X" ticker).
- Redundant condition `(showDay2Matchups || r1Locked) && r1Locked` simplifies to `r1Locked` — `Leaderboard.tsx:416`.

---

## Pre-launch blockers (P0/P1)
1. ~~**P1-1** Score +/- buttons → 44px.~~ **FIXED**
2. ~~**P1-2** Hole-jump dots → tappable hit area.~~ **FIXED**

Everything else is P2/P3 — fix what's cheap, document the rest.

---

# Phase 5 — Final report

## Test infrastructure (new)
- **Vitest + fast-check + RTL** unit/component, **Playwright** e2e (WebKit, iPhone 14 Pro + iPhone SE).
- Scripts: `npm run test` / `test:unit` / `test:watch` / `test:coverage` / `test:e2e`.
- **53 unit/component tests** + **10 e2e** (5 × 2 viewports), all green.
- Coverage on the pure-logic modules (the priority): **scoring.ts 100%, sideGames.ts 99%, teamCompetition.ts 98% — 98.5% statements / 100% functions overall.**
- E2E builds with empty Supabase env (offline mode) so it never touches the live DB.
- Chaos harness `scripts/chaos-test.ts` (Phase 4): namespaced `chaos-*`, cleaned up after.

## Bundle size (before → after)
| Asset | Before | After |
|---|---|---|
| main JS | 568.23 kB / **156.04 kB gz** | 569.38 kB / **156.33 kB gz** |
| CSS | 34.21 kB / 6.85 kB gz | 34.66 kB / 6.94 kB gz |

Fixes added ~0.3 kB gz. Single chunk, under the 200 kB target.

## Fixed (commit)
| ID | Fix | Commit |
|----|-----|--------|
| P1-1/2/3/4 | During-play tap targets → ≥44px (score +/-, clear, chevrons, hole dots) | `c21efd6` |
| P1-5 | Header refresh/switch-player buttons enlarged | `3ce537d` |
| P1-7 | 16px form-control font (no iOS focus-zoom); team-name + announcement → text-base | `084dbe9` |
| P1-8 | Status bar `black-translucent` → `default` (readable glyphs) | `084dbe9` |
| P1-9 | Onboarding `min-h-screen` → `100svh` | `084dbe9` |
| P1-10 | Hole-swipe ignores mostly-vertical gestures | `084dbe9` |
| P2-1/P2-2 | `showScoreEntry` / `showLeaderboard` admin toggles now actually gate their views (with `\|\| isAdmin` escape) | `da30902` |
| P2-3 | Confirm dialogs on matchup/pairing/foursome deletes | `a5a0780` |
| P2-6 | "Save & Next" no longer fabricates par for untouched players | `0456058` |
| P2-7 | "Lone Wolf" (null selection) no longer dropped — scores correctly | `fd47bdc` |
| P3-3/P3-6 | `submitScore` clamps gross to 1–20 (kills phantom-score retry loop) | `df19622` |
| P3-7 | `window.__ec_submitScore` exposed only in dev/offline, not prod | `df19622` |

Each fix landed with a regression test (or the `// BUG` test was flipped to assert correct behavior).

## Open / accepted (with rationale)
| ID | Status | Why / proposed fix |
|----|--------|--------------------|
| **P3-1** clock-skew conflict resolution | **OPEN — needs owner** | Correct fix is server-authoritative timestamps: a Postgres trigger `BEFORE UPDATE … SET updated_at = now()` on `app_scores`, then stop comparing client `updated_at`. That's a **schema change** (your call to run). Confirmed real by the chaos harness; impact is low (skewed phone must edit the *same* score offline as another phone). |
| **P3-2** missing hole never finalizes a match | **By design, mitigated** | A net total can't be computed from an incomplete card. The Admin → Score Completion grid already flags any player under 18/18. No code change. |
| P1-6 | Accepted | Admin-only icon buttons (~24px) in the dense team/matchup editor. One person (Matt), space-constrained. Can bump if desired. |
| P1-11 | Accepted/optional | No iOS `apple-touch-startup-image` splash → brief white flash launching from home screen; single touch-icon size. Cosmetic. |
| P4-1 | Not done | Single 156 kB-gz chunk is under the 200 kB target and the PWA precache makes repeat loads instant; route code-splitting adds Suspense complexity for a marginal first-load-only gain. |
| P4-2 | Not done | Context value isn't memoized, but the expensive derivations already are (`useMemo`), so re-render churn is benign at 20 users. Wrapping the value risks a stale-dep regression for little gain. |
| P3-4 | Accepted | `safeSetItem` swallows quota errors (no crash); clearing site data while offline drops queued writes (inherent to offline-first, mitigated by frequent flush). |
| Cosmetic | Noted | "wins by" vs "WON by" wording; "birdies" stat counts net birdies; redundant `(showDay2Matchups \|\| r1Locked) && r1Locked` at `Leaderboard.tsx`. |

## Verified PASS (no action needed)
- Idempotent writes (deterministic id + upsert): 20 concurrent writers → 1 row; 360 concurrent writes all land (chaos 1–2).
- Offline queue resilience: offline mid-batch → reconnect loses nothing (chaos 3).
- Admin gating (`isAdmin && p2`), Admin tab hidden from non-admins, no service-role key in the bundle.

## Pre-launch verdict
**No remaining P0/P1 blockers** — both blockers (P1-1, P1-2) are fixed. The one item worth a decision before launch is **P3-1** (the `updated_at` trigger), since it's the only correctness gap under real multi-device offline editing — but it requires a manual schema change and its blast radius is small. Ship-ready otherwise.
