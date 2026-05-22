import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeStrokePlayResult, computeBestBallResult, computeTeamStandings } from './teamCompetition'
import type { Hole, Player, Score, StrokePlayMatchup, BestBallPairing, Team } from './types'

// ── fixtures ────────────────────────────────────────────────────────────────
// 18 par-4 holes, stroke index = hole number (so hcp H<=18 gets a stroke on holes 1..H).
const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`, course_id: 'c', hole_number: i + 1, par: 4, stroke_index: i + 1, yardage: 400,
}))
const PAR = 72
const SLOPE = 113

function player(id: string, handicap_index: number, team_handicap = handicap_index): Player {
  return { id, tournament_id: 't', name: id, handicap_index, team_handicap }
}

/** Build scores for a player: gross is a constant or per-hole array; nHoles holes entered. */
function card(playerId: string, gross: number | number[], nHoles = 18, roundId = 'r1'): Score[] {
  return Array.from({ length: nHoles }, (_, i) => ({
    id: `s-${roundId}-${playerId}-${i + 1}`,
    round_id: roundId, player_id: playerId, hole_number: i + 1,
    gross_score: Array.isArray(gross) ? gross[i] : gross,
    updated_at: '2026-05-29T00:00:00Z',
  }))
}

const matchup = (a: string, b: string, pressure = false): StrokePlayMatchup =>
  ({ id: 'm1', round_id: 'r1', team_a_player_id: a, team_b_player_id: b, order: 1, is_pressure_bet: pressure })

// ── stroke play ───────────────────────────────────────────────────────────
describe('computeStrokePlayResult', () => {
  const players = [player('A', 0), player('B', 0)]

  it('team A wins on lower net once both finish 18', () => {
    const scores = [...card('A', 4), ...card('B', [...Array(17).fill(4), 5])] // A 72, B 73
    const r = computeStrokePlayResult(matchup('A', 'B'), scores, HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('team_a_wins')
    expect(r.points).toEqual({ teamA: 1, teamB: 0 })
    expect(r.playerANetTotal).toBe(72)
    expect(r.playerBNetTotal).toBe(73)
  })

  it('halved match splits the point', () => {
    const scores = [...card('A', 4), ...card('B', 4)]
    const r = computeStrokePlayResult(matchup('A', 'B'), scores, HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('halved')
    expect(r.points).toEqual({ teamA: 0.5, teamB: 0.5 })
  })

  it('pressure bet doubles the points', () => {
    const scores = [...card('A', 4), ...card('B', [...Array(17).fill(4), 5])]
    const r = computeStrokePlayResult(matchup('A', 'B', true), scores, HOLES, players, SLOPE, PAR)
    expect(r.points).toEqual({ teamA: 2, teamB: 0 })
  })

  it('pressure + halved => 1 / 1', () => {
    const scores = [...card('A', 4), ...card('B', 4)]
    const r = computeStrokePlayResult(matchup('A', 'B', true), scores, HOLES, players, SLOPE, PAR)
    expect(r.points).toEqual({ teamA: 1, teamB: 1 })
  })

  it('not started => in_progress, "Not started", no points', () => {
    const r = computeStrokePlayResult(matchup('A', 'B'), [], HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('in_progress')
    expect(r.description).toBe('Not started')
    expect(r.points).toEqual({ teamA: 0, teamB: 0 })
  })

  it('in progress (both partway) => in_progress with thru count, no points', () => {
    const scores = [...card('A', 4, 9), ...card('B', 4, 9)]
    const r = computeStrokePlayResult(matchup('A', 'B'), scores, HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('in_progress')
    expect(r.playerAThru).toBe(9)
    expect(r.description).toContain('thru 9')
    expect(r.points).toEqual({ teamA: 0, teamB: 0 })
  })

  it('uses TEAM handicap, not the individual handicap', () => {
    // A: individual 0 but team 2 -> gets a stroke on holes 1 & 2 (SI 1,2)
    const ps = [player('A', 0, 2), player('B', 0, 0)]
    const scores = [...card('A', 4), ...card('B', 4)] // raw gross identical (both 72)
    const r = computeStrokePlayResult(matchup('A', 'B'), scores, HOLES, ps, SLOPE, PAR)
    // A nets 72 - 2 = 70, B nets 72 -> A wins by 2
    expect(r.playerANetTotal).toBe(70)
    expect(r.result).toBe('team_a_wins')
  })

  // BUG (P3-2): documents current behavior — a single missing hole keeps a
  // match in_progress forever and awards ZERO points even though A is ahead.
  // fix in Phase 2.
  it('BUG: one missing hole => never finalizes, no points awarded', () => {
    const scores = [...card('A', 4, 17), ...card('B', 5, 18)] // A clearly lower net but only 17 holes
    const r = computeStrokePlayResult(matchup('A', 'B'), scores, HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('in_progress')
    expect(r.points).toEqual({ teamA: 0, teamB: 0 })
  })

  it('property: points are zero unless BOTH players have all 18 holes', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 18 }), fc.integer({ min: 0, max: 18 }),
      (aHoles, bHoles) => {
        const scores = [...card('A', 4, aHoles), ...card('B', 5, bHoles)]
        const r = computeStrokePlayResult(matchup('A', 'B'), scores, HOLES, players, SLOPE, PAR)
        const decided = aHoles === 18 && bHoles === 18
        const totalPts = r.points.teamA + r.points.teamB
        expect(totalPts > 0).toBe(decided)
      },
    ))
  })
})

// ── best ball ───────────────────────────────────────────────────────────────
const pairing = (a: [string, string], b: [string, string], pressure = false): BestBallPairing =>
  ({ id: 'bb1', round_id: 'r1', team_a_player_ids: a, team_b_player_ids: b, order: 1, is_pressure_bet: pressure })

describe('computeBestBallResult', () => {
  it('takes the better net of each side per hole; win = 2 pts', () => {
    const players = [player('A1', 0), player('A2', 0), player('B1', 0), player('B2', 0)]
    // A side: A1 all 4, A2 all 5 -> best ball 72. B side: both 5 -> 90.
    const scores = [...card('A1', 4), ...card('A2', 5), ...card('B1', 5), ...card('B2', 5)]
    const r = computeBestBallResult(pairing(['A1', 'A2'], ['B1', 'B2']), scores, HOLES, players, SLOPE, PAR)
    expect(r.teamABestBallTotal).toBe(72)
    expect(r.teamBBestBallTotal).toBe(90)
    expect(r.result).toBe('team_a_wins')
    expect(r.points).toEqual({ teamA: 2, teamB: 0 })
  })

  it('halved best ball => 1 / 1', () => {
    const players = [player('A1', 0), player('A2', 0), player('B1', 0), player('B2', 0)]
    const scores = [...card('A1', 4), ...card('A2', 4), ...card('B1', 4), ...card('B2', 4)]
    const r = computeBestBallResult(pairing(['A1', 'A2'], ['B1', 'B2']), scores, HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('halved')
    expect(r.points).toEqual({ teamA: 1, teamB: 1 })
  })

  it('1-vs-2 pressure match: solo entered in both slots resolves to his net; win = 4 pts', () => {
    const players = [player('S', 0), player('B1', 0), player('B2', 0)]
    // Solo S all 4 (72). B1/B2 all 5 (best ball 90). Pressure.
    const scores = [...card('S', 4), ...card('B1', 5), ...card('B2', 5)]
    const r = computeBestBallResult(pairing(['S', 'S'], ['B1', 'B2'], true), scores, HOLES, players, SLOPE, PAR)
    expect(r.teamABestBallTotal).toBe(72)
    expect(r.result).toBe('team_a_wins')
    expect(r.points).toEqual({ teamA: 4, teamB: 0 })
  })

  it('not started => in_progress / "Not started"', () => {
    const players = [player('A1', 0), player('A2', 0), player('B1', 0), player('B2', 0)]
    const r = computeBestBallResult(pairing(['A1', 'A2'], ['B1', 'B2']), [], HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('in_progress')
    expect(r.description).toBe('Not started')
  })

  // BUG (P3-2): same missing-hole problem on the best-ball side.
  it('BUG: a side missing one hole keeps the match in_progress, no points', () => {
    const players = [player('A1', 0), player('A2', 0), player('B1', 0), player('B2', 0)]
    const scores = [...card('A1', 4, 17), ...card('A2', 4, 17), ...card('B1', 5), ...card('B2', 5)]
    const r = computeBestBallResult(pairing(['A1', 'A2'], ['B1', 'B2']), scores, HOLES, players, SLOPE, PAR)
    expect(r.result).toBe('in_progress')
    expect(r.points).toEqual({ teamA: 0, teamB: 0 })
  })
})

// ── team standings ───────────────────────────────────────────────────────────
describe('computeTeamStandings', () => {
  const teamA: Team = { id: 'team-a', name: 'A', captain_id: 'A', player_ids: ['A', 'A2'] }
  const teamB: Team = { id: 'team-b', name: 'B', captain_id: 'B', player_ids: ['B', 'B2'] }
  const courses = [{ id: 'c', slope: SLOPE, total_par: PAR }]
  const rounds = [{ id: 'r1', course_id: 'c' }]

  it('returns null with fewer than two teams', () => {
    expect(computeTeamStandings([teamA], [], [], [], HOLES, [], courses, rounds)).toBeNull()
  })

  it('sums stroke-play points into team totals', () => {
    const players = [player('A', 0), player('B', 0)]
    const scores = [...card('A', 4), ...card('B', 5)] // A 72 beats B 90
    const standings = computeTeamStandings(
      [teamA, teamB], [matchup('A', 'B')], [], scores, HOLES, players, courses, rounds,
    )!
    expect(standings.teamA.strokePlayPoints).toBe(1)
    expect(standings.teamA.totalPoints).toBe(1)
    expect(standings.teamB.totalPoints).toBe(0)
  })
})
