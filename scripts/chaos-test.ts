/**
 * Egerer Classic 2026 — Chaos / stress harness (Phase 4 QA).
 *
 * Exercises the sync layer under adversarial conditions and reports what
 * breaks. Writes are namespaced under `chaos-*` ids and cleaned up at the end,
 * so the live tournament data is untouched.
 *
 *   1. 20 concurrent clients writing the SAME score (idempotency under race)
 *   2. 20 concurrent clients × 18 holes (throughput / no lost writes)
 *   3. Client offline mid-batch, then reconnect (queue resilience)
 *   4. Clock skew between clients (conflict-resolution correctness)
 *   5. localStorage cleared mid-session (data-loss window)
 *
 * Run: npx tsx scripts/chaos-test.ts   (needs SUPABASE_URL + SERVICE_ROLE_KEY)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  try {
    const c = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
    for (const line of c.split('\n')) { const [k, ...r] = line.split('='); if (k && r.length) process.env[k.trim()] = r.join('=').trim() }
  } catch { /* rely on real env */ }
}
loadEnv()
const URL = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(URL, KEY)
const NS = 'chaos'
const now = () => new Date().toISOString()

const results: { name: string; verdict: 'PASS' | 'FINDING'; detail: string }[] = []
const record = (name: string, verdict: 'PASS' | 'FINDING', detail: string) => {
  results.push({ name, verdict, detail })
  console.log(`  ${verdict === 'PASS' ? '✓' : '⚠'} ${name}: ${detail}`)
}

// ── client-layer logic replicated from TournamentContext (kept in sync) ──────
interface QueuedOp { id: string; table: string; payload: Record<string, unknown> }
/** Mirrors flushQueue: process a snapshot, remove only succeeded ops. */
async function flushQueue(client: SupabaseClient, queue: QueuedOp[]): Promise<QueuedOp[]> {
  const batch = [...queue]
  const succeeded = new Set<QueuedOp>()
  for (const op of batch) {
    try {
      const { error } = await client.from(op.table).upsert(op.payload, { onConflict: 'id' })
      if (!error) succeeded.add(op)
    } catch { /* leave queued */ }
  }
  return queue.filter(op => !succeeded.has(op))
}
/** Mirrors the realtime merge: keep the row whose updated_at string is greater. */
function mergeByUpdatedAt(local: { gross_score: number; updated_at: string }, incoming: { gross_score: number; updated_at: string }) {
  return incoming.updated_at > local.updated_at ? incoming : local
}

const scoreRow = (player: string, hole: number, gross: number, updated_at = now(), round = `${NS}-r`) =>
  ({ id: `s-${round}-${player}-${hole}`, round_id: round, player_id: player, hole_number: hole, gross_score: gross, updated_at })

async function cleanup() {
  await db.from('app_scores').delete().like('round_id', `${NS}-%`)
  await db.from('app_scores').delete().like('player_id', `${NS}-%`)
}

// ── 1. concurrent writers, same score id ─────────────────────────────────────
async function testConcurrentSameScore() {
  const player = `${NS}-cp1`
  const writers = Array.from({ length: 20 }, (_, i) =>
    db.from('app_scores').upsert(scoreRow(player, 1, (i % 15) + 1), { onConflict: 'id' }),
  )
  const settled = await Promise.allSettled(writers)
  const errs = settled.filter(s => s.status === 'rejected' || (s.status === 'fulfilled' && (s.value as { error: unknown }).error)).length
  const { data } = await db.from('app_scores').select('*').eq('id', `s-${NS}-r-${player}-1`)
  const rows = data?.length ?? 0
  if (rows === 1 && errs === 0) record('20 concurrent writers, same hole', 'PASS', `exactly 1 row, ${errs} errors (deterministic id + upsert = idempotent under race)`)
  else record('20 concurrent writers, same hole', 'FINDING', `${rows} rows, ${errs} errors (expected 1 row / 0 errors)`)
}

// ── 2. concurrent writers, 20 players × 18 holes ─────────────────────────────
async function testConcurrentMatchupThroughput() {
  const ops: Promise<unknown>[] = []
  for (let p = 1; p <= 20; p++) for (let h = 1; h <= 18; h++) ops.push(db.from('app_scores').upsert(scoreRow(`${NS}-tp${p}`, h, (h % 9) + 2), { onConflict: 'id' }))
  const settled = await Promise.allSettled(ops)
  const errs = settled.filter(s => s.status === 'rejected' || (s.status === 'fulfilled' && (s.value as { error: unknown }).error)).length
  const { count } = await db.from('app_scores').select('*', { count: 'exact', head: true }).like('player_id', `${NS}-tp%`)
  if (count === 360 && errs === 0) record('20 clients × 18 holes concurrent', 'PASS', `360 rows landed, ${errs} errors`)
  else record('20 clients × 18 holes concurrent', 'FINDING', `${count} rows, ${errs} errors (expected 360)`)
}

// ── 3. offline mid-batch, then reconnect ─────────────────────────────────────
async function testOfflineMidBatchReconnect() {
  const faulted = createClient('https://offline.invalid', 'nope', { auth: { persistSession: false } })
  let queue: QueuedOp[] = Array.from({ length: 18 }, (_, i) => ({
    id: `s-${NS}-off-${i + 1}`, table: 'app_scores', payload: scoreRow(`${NS}-off`, i + 1, 4),
  }))
  // First flush goes out while "offline" → everything should stay queued
  queue = await flushQueue(faulted, queue)
  const stillQueued = queue.length
  // Reconnect → flush against the real DB
  queue = await flushQueue(db, queue)
  const { count } = await db.from('app_scores').select('*', { count: 'exact', head: true }).eq('player_id', `${NS}-off`)
  if (stillQueued === 18 && queue.length === 0 && count === 18)
    record('offline mid-batch → reconnect', 'PASS', `all 18 ops retained while offline, all 18 synced after reconnect (no loss)`)
  else
    record('offline mid-batch → reconnect', 'FINDING', `retained=${stillQueued}/18, remaining=${queue.length}, synced=${count}/18`)
}

// ── 4. clock skew between clients ────────────────────────────────────────────
async function testClockSkew() {
  // Device B writes the CORRECT later value at real time T.
  const real = scoreRow(`${NS}-skew`, 1, 6, new Date(Date.now()).toISOString())
  // Device A (clock +10 min) writes a STALE value but with a future timestamp.
  const skewed = scoreRow(`${NS}-skew`, 1, 5, new Date(Date.now() + 10 * 60_000).toISOString())
  // App merge keeps the greater updated_at → the skewed/stale write wins.
  const winner = mergeByUpdatedAt(real, skewed)
  if (winner.gross_score === 5)
    record('clock skew conflict resolution', 'FINDING', `stale value (5) from the clock-skewed device beat the correct later value (6) because merge trusts client updated_at, not server time (audit P3-1)`)
  else
    record('clock skew conflict resolution', 'PASS', `correct value won`)
}

// ── 5. localStorage cleared mid-session ──────────────────────────────────────
async function testLocalStorageCleared() {
  // 5 scores entered offline (queued, not yet flushed)
  let queue: QueuedOp[] = Array.from({ length: 5 }, (_, i) => ({
    id: `s-${NS}-ls-${i + 1}`, table: 'app_scores', payload: scoreRow(`${NS}-ls`, i + 1, 4),
  }))
  // User clears site data before reconnect → the queue (in localStorage) is wiped.
  queue = [] // simulates localStorage.removeItem('ec-sync-queue')
  // Reconnect + flush: nothing to send.
  await flushQueue(db, queue)
  const { count } = await db.from('app_scores').select('*', { count: 'exact', head: true }).eq('player_id', `${NS}-ls`)
  record('localStorage cleared mid-session', 'FINDING',
    `${count}/5 unsynced scores reached the server — clearing site data while offline silently drops queued writes (inherent to offline-first; mitigated by frequent flush when online)`)
}

async function main() {
  if (!URL || !KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  console.log('Chaos harness — namespaced under chaos-* (live data untouched)\n')
  await cleanup()
  await testConcurrentSameScore()
  await testConcurrentMatchupThroughput()
  await testOfflineMidBatchReconnect()
  await testClockSkew()
  await testLocalStorageCleared()
  await cleanup()

  console.log('\n── summary ──')
  for (const r of results) console.log(`  ${r.verdict === 'PASS' ? '✓ PASS    ' : '⚠ FINDING '} ${r.name}`)
  const findings = results.filter(r => r.verdict === 'FINDING')
  console.log(`\n${results.length - findings.length} pass, ${findings.length} findings. Cleaned up chaos-* rows.`)
}
main().catch(e => { console.error(e); process.exit(1) })
