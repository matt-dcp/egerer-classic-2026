/**
 * Team competition logic: stroke play 1v1 (Day 1) and best ball 2v2 (Day 2).
 * Pure functions — no React, no side effects.
 */

import type {
  StrokePlayMatchup, BestBallPairing, StrokePlayResult, BestBallResult,
  MatchResult, Score, Hole, Player, Team, TeamStandings,
} from './types'
import { calculateCourseHandicap, getStrokesForHole } from './scoring'

// --- Helpers ---

/** Get a player's net score for a single hole, or null if no score entered. */
function getNetScore(
  playerId: string,
  holeNumber: number,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  roundId: string,
): number | null {
  const score = scores.find(
    s => s.player_id === playerId && s.hole_number === holeNumber && s.round_id === roundId,
  )
  if (!score) return null

  const hole = holes.find(h => h.hole_number === holeNumber)
  if (!hole) return null

  const player = players.find(p => p.id === playerId)
  if (!player) return null

  const courseHcp = calculateCourseHandicap(player.handicap_index, courseSlope)
  const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
  return score.gross_score - strokes
}

/** Sum net scores for a player through all holes they've completed. */
function getPlayerNetTotal(
  playerId: string,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  roundId: string,
): { netTotal: number; holesPlayed: number } {
  let netTotal = 0
  let holesPlayed = 0

  for (let h = 1; h <= 18; h++) {
    const net = getNetScore(playerId, h, scores, holes, players, courseSlope, roundId)
    if (net !== null) {
      netTotal += net
      holesPlayed++
    }
  }

  return { netTotal, holesPlayed }
}

function formatNetVsPar(netTotal: number, par: number): string {
  const diff = netTotal - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

// --- Stroke Play 1v1 (Day 1) ---

export function computeStrokePlayResult(
  matchup: StrokePlayMatchup,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  coursePar: number,
): StrokePlayResult {
  const a = getPlayerNetTotal(matchup.team_a_player_id, scores, holes, players, courseSlope, matchup.round_id)
  const b = getPlayerNetTotal(matchup.team_b_player_id, scores, holes, players, courseSlope, matchup.round_id)

  const aComplete = a.holesPlayed === 18
  const bComplete = b.holesPlayed === 18
  const bothComplete = aComplete && bComplete

  let result: MatchResult = 'in_progress'
  let description = ''
  const pointMultiplier = matchup.is_pressure_bet ? 2 : 1

  if (bothComplete) {
    if (a.netTotal < b.netTotal) {
      result = 'team_a_wins'
      description = `${formatNetVsPar(a.netTotal, coursePar)} vs ${formatNetVsPar(b.netTotal, coursePar)} (F)`
    } else if (b.netTotal < a.netTotal) {
      result = 'team_b_wins'
      description = `${formatNetVsPar(a.netTotal, coursePar)} vs ${formatNetVsPar(b.netTotal, coursePar)} (F)`
    } else {
      result = 'halved'
      description = `${formatNetVsPar(a.netTotal, coursePar)} vs ${formatNetVsPar(b.netTotal, coursePar)} (Tied)`
    }
  } else if (a.holesPlayed === 0 && b.holesPlayed === 0) {
    description = 'Not started'
  } else {
    const aStr = a.holesPlayed > 0 ? formatNetVsPar(a.netTotal, coursePar) : '-'
    const bStr = b.holesPlayed > 0 ? formatNetVsPar(b.netTotal, coursePar) : '-'
    const thru = Math.max(a.holesPlayed, b.holesPlayed)
    description = `${aStr} vs ${bStr} (thru ${thru})`
  }

  let points = { teamA: 0, teamB: 0 }
  if (result === 'team_a_wins') points = { teamA: 1 * pointMultiplier, teamB: 0 }
  else if (result === 'team_b_wins') points = { teamA: 0, teamB: 1 * pointMultiplier }
  else if (result === 'halved') points = { teamA: 0.5 * pointMultiplier, teamB: 0.5 * pointMultiplier }

  return {
    matchup,
    playerANetTotal: a.holesPlayed > 0 ? a.netTotal : null,
    playerBNetTotal: b.holesPlayed > 0 ? b.netTotal : null,
    playerAThru: a.holesPlayed,
    playerBThru: b.holesPlayed,
    result,
    description,
    points,
  }
}

// --- Best Ball 2v2 (Day 2) ---

export function computeBestBallResult(
  pairing: BestBallPairing,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  coursePar: number,
): BestBallResult {
  let teamATotal = 0
  let teamBTotal = 0
  let teamAThru = 0
  let teamBThru = 0

  for (let h = 1; h <= 18; h++) {
    const a1 = getNetScore(pairing.team_a_player_ids[0], h, scores, holes, players, courseSlope, pairing.round_id)
    const a2 = getNetScore(pairing.team_a_player_ids[1], h, scores, holes, players, courseSlope, pairing.round_id)
    const b1 = getNetScore(pairing.team_b_player_ids[0], h, scores, holes, players, courseSlope, pairing.round_id)
    const b2 = getNetScore(pairing.team_b_player_ids[1], h, scores, holes, players, courseSlope, pairing.round_id)

    const aScores = [a1, a2].filter((n): n is number => n !== null)
    const bScores = [b1, b2].filter((n): n is number => n !== null)

    if (aScores.length > 0) {
      teamATotal += Math.min(...aScores)
      teamAThru++
    }
    if (bScores.length > 0) {
      teamBTotal += Math.min(...bScores)
      teamBThru++
    }
  }

  const aComplete = teamAThru === 18
  const bComplete = teamBThru === 18
  const bothComplete = aComplete && bComplete

  let result: MatchResult = 'in_progress'
  let description = ''

  if (bothComplete) {
    if (teamATotal < teamBTotal) {
      result = 'team_a_wins'
      description = `${formatNetVsPar(teamATotal, coursePar)} vs ${formatNetVsPar(teamBTotal, coursePar)} (F)`
    } else if (teamBTotal < teamATotal) {
      result = 'team_b_wins'
      description = `${formatNetVsPar(teamATotal, coursePar)} vs ${formatNetVsPar(teamBTotal, coursePar)} (F)`
    } else {
      result = 'halved'
      description = `${formatNetVsPar(teamATotal, coursePar)} vs ${formatNetVsPar(teamBTotal, coursePar)} (Tied)`
    }
  } else if (teamAThru === 0 && teamBThru === 0) {
    description = 'Not started'
  } else {
    const aStr = teamAThru > 0 ? formatNetVsPar(teamATotal, coursePar) : '-'
    const bStr = teamBThru > 0 ? formatNetVsPar(teamBTotal, coursePar) : '-'
    const thru = Math.max(teamAThru, teamBThru)
    description = `${aStr} vs ${bStr} (thru ${thru})`
  }

  // Each best ball win = 2 points
  let points = { teamA: 0, teamB: 0 }
  if (result === 'team_a_wins') points = { teamA: 2, teamB: 0 }
  else if (result === 'team_b_wins') points = { teamA: 0, teamB: 2 }
  else if (result === 'halved') points = { teamA: 1, teamB: 1 }

  return {
    pairing,
    teamABestBallTotal: teamAThru > 0 ? teamATotal : null,
    teamBBestBallTotal: teamBThru > 0 ? teamBTotal : null,
    teamAThru,
    teamBThru,
    result,
    description,
    points,
  }
}

// --- Team Standings ---

export function computeTeamStandings(
  teams: Team[],
  strokePlayMatchups: StrokePlayMatchup[],
  bestBallPairings: BestBallPairing[],
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courses: { id: string; slope: number; total_par: number }[],
  rounds: { id: string; course_id: string }[],
): TeamStandings | null {
  if (teams.length < 2) return null

  const teamA = teams.find(t => t.id === 'team-a')!
  const teamB = teams.find(t => t.id === 'team-b')!
  if (!teamA || !teamB) return null

  // Stroke play results (Day 1)
  const strokePlayResults = strokePlayMatchups.map(m => {
    const round = rounds.find(r => r.id === m.round_id)
    const course = round ? courses.find(c => c.id === round.course_id) : null
    const courseHoles = holes.filter(h => h.course_id === (course?.id ?? ''))
    return computeStrokePlayResult(m, scores, courseHoles, players, course?.slope ?? 113, course?.total_par ?? 72)
  })

  // Best ball results (Day 2)
  const bestBallResults = bestBallPairings.map(p => {
    const round = rounds.find(r => r.id === p.round_id)
    const course = round ? courses.find(c => c.id === round.course_id) : null
    const courseHoles = holes.filter(h => h.course_id === (course?.id ?? ''))
    return computeBestBallResult(p, scores, courseHoles, players, course?.slope ?? 113, course?.total_par ?? 72)
  })

  const spA = strokePlayResults.reduce((sum, r) => sum + r.points.teamA, 0)
  const spB = strokePlayResults.reduce((sum, r) => sum + r.points.teamB, 0)
  const bbA = bestBallResults.reduce((sum, r) => sum + r.points.teamA, 0)
  const bbB = bestBallResults.reduce((sum, r) => sum + r.points.teamB, 0)

  return {
    teamA: { team: teamA, strokePlayPoints: spA, bestBallPoints: bbA, totalPoints: spA + bbA },
    teamB: { team: teamB, strokePlayPoints: spB, bestBallPoints: bbB, totalPoints: spB + bbB },
    strokePlayResults,
    bestBallResults,
  }
}
