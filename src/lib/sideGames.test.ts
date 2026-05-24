import { describe, it, expect } from 'vitest'
import { calculateNassau, calculateWolf, getWolfForHole } from './sideGames'
import type { Hole, Player, Score, NassauConfig, WolfConfig } from './types'

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`, course_id: 'c', hole_number: i + 1, par: 4, stroke_index: i + 1, yardage: 400,
}))
const SLOPE = 113
const p = (id: string, h = 0): Player => ({ id, tournament_id: 't', name: id, handicap_index: h, team_handicap: h })
const players = [p('A'), p('B'), p('C'), p('D')]

function card(playerId: string, gross: number, nHoles = 18): Score[] {
  return Array.from({ length: nHoles }, (_, i) => ({
    id: `s-r1-${playerId}-${i + 1}`, round_id: 'r1', player_id: playerId,
    hole_number: i + 1, gross_score: gross, updated_at: '2026-05-29T00:00:00Z',
  }))
}

describe('getWolfForHole', () => {
  const cfg: WolfConfig = { type: 'wolf', foursome_id: 'f', player_order: ['A', 'B', 'C', 'D'] }
  it('rotates the wolf every hole, wrapping every 4', () => {
    expect(getWolfForHole(cfg, 1)).toBe('A')
    expect(getWolfForHole(cfg, 2)).toBe('B')
    expect(getWolfForHole(cfg, 4)).toBe('D')
    expect(getWolfForHole(cfg, 5)).toBe('A')
  })
})

describe('calculateNassau', () => {
  const cfg: NassauConfig = { type: 'nassau', foursome_id: 'f', team1: ['A', 'B'], team2: ['C', 'D'] }
  it('counts holes won per nassau segment', () => {
    const scores = [...card('A', 4), ...card('B', 4), ...card('C', 5), ...card('D', 5)]
    const r = calculateNassau(cfg, scores, HOLES, players, SLOPE, 'r1')
    expect(r.front.team1HolesWon).toBe(9)
    expect(r.front.leader).toBe('team1')
    expect(r.back.team1HolesWon).toBe(9)
    expect(r.overall.holesPlayed).toBe(18)
    expect(r.overall.margin).toBe(18)
  })
  it('ties when best balls match every hole', () => {
    const scores = [...card('A', 4), ...card('B', 4), ...card('C', 4), ...card('D', 4)]
    const r = calculateNassau(cfg, scores, HOLES, players, SLOPE, 'r1')
    expect(r.overall.leader).toBe('tied')
    expect(r.overall.tied).toBe(18)
  })
})

describe('calculateWolf', () => {
  const cfg: WolfConfig = { type: 'wolf', foursome_id: 'f', player_order: ['A', 'B', 'C', 'D'] }

  // FIXED (P2-7): "Lone Wolf" (explicit null) now resolves and scores 4 points.
  it('lone wolf win awards 4 points', () => {
    // hole 1 wolf = A. A=4, others=5 -> A wins alone
    const scores = [...card('A', 4), ...card('B', 5), ...card('C', 5), ...card('D', 5)]
    const r = calculateWolf(cfg, { 1: null }, scores, HOLES, players, SLOPE, 'r1')
    expect(r.totalPoints['A']).toBe(4)
    expect(r.holes[0].wolfWon).toBe(true)
  })

  it('lone wolf loss awards 3 points to each opponent', () => {
    // hole 1 wolf A goes alone but is worst: A=6, others=4
    const scores = [...card('A', 6), ...card('B', 4), ...card('C', 4), ...card('D', 4)]
    const r = calculateWolf(cfg, { 1: null }, scores, HOLES, players, SLOPE, 'r1')
    expect(r.totalPoints['A']).toBe(0)
    expect(r.totalPoints['B']).toBe(3)
    expect(r.totalPoints['C']).toBe(3)
    expect(r.totalPoints['D']).toBe(3)
  })

  it('wolf + partner win awards 2 points each', () => {
    const scores = [...card('A', 4), ...card('B', 4), ...card('C', 5), ...card('D', 5)]
    const r = calculateWolf(cfg, { 1: 'B' }, scores, HOLES, players, SLOPE, 'r1')
    expect(r.totalPoints['A']).toBe(2)
    expect(r.totalPoints['B']).toBe(2)
  })

  it('holes with no partner selection are skipped (no points)', () => {
    const scores = [...card('A', 4), ...card('B', 5), ...card('C', 5), ...card('D', 5)]
    const r = calculateWolf(cfg, {}, scores, HOLES, players, SLOPE, 'r1')
    expect(Object.values(r.totalPoints).every(v => v === 0)).toBe(true)
    expect(r.holes[0].wolfWon).toBeNull()
  })

  it('a tied hole (wolf + partner) awards no points', () => {
    // hole 1 wolf A picks B; best(A,B)=4 ties best(C,D)=4
    const scores = [...card('A', 4), ...card('B', 5), ...card('C', 4), ...card('D', 5)]
    const r = calculateWolf(cfg, { 1: 'B' }, scores, HOLES, players, SLOPE, 'r1')
    expect(r.totalPoints['A']).toBe(0)
    expect(r.totalPoints['C']).toBe(0)
  })
})
