/**
 * Pure functions for side game calculations.
 * All results are derived from scores + configs — nothing stored.
 */

import type {
  Score, Hole, Player,
  NassauConfig, NassauResult, NassauBet,
  WolfConfig, WolfResult, WolfHoleResult,
} from './types'
import { calculateCourseHandicap, getStrokesForHole } from './scoring'

// --- Helpers ---

/** Get a player's net score on a specific hole */
function getPlayerNetForHole(
  playerId: string,
  holeNumber: number,
  roundId: string,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
): number | null {
  const score = scores.find(
    s => s.player_id === playerId && s.hole_number === holeNumber && s.round_id === roundId,
  )
  if (!score) return null

  const hole = holes.find(h => h.hole_number === holeNumber)
  if (!hole) return null

  const player = players.find(p => p.id === playerId)
  if (!player) return null

  // Side games (Nassau / Sixes) compute on team handicap, matching the rest of the Scores tab
  const courseHcp = calculateCourseHandicap(player.team_handicap, courseSlope)
  const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
  return score.gross_score - strokes
}

/** Get best ball (lowest net) for a team on a hole */
function bestBallNet(
  teamIds: string[],
  holeNumber: number,
  roundId: string,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
): number | null {
  const nets = teamIds.map(id =>
    getPlayerNetForHole(id, holeNumber, roundId, scores, holes, players, courseSlope),
  )
  const valid = nets.filter((n): n is number => n !== null)
  if (valid.length === 0) return null
  return Math.min(...valid)
}

// --- Nassau ---

function calculateNassauBet(
  team1: [string, string],
  team2: [string, string],
  holeNumbers: number[],
  roundId: string,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  betName: 'front' | 'back' | 'overall',
): NassauBet {
  let team1Won = 0, team2Won = 0, tied = 0, played = 0

  for (const h of holeNumbers) {
    const t1 = bestBallNet(team1, h, roundId, scores, holes, players, courseSlope)
    const t2 = bestBallNet(team2, h, roundId, scores, holes, players, courseSlope)
    if (t1 === null || t2 === null) continue
    played++
    if (t1 < t2) team1Won++
    else if (t2 < t1) team2Won++
    else tied++
  }

  const leader: NassauBet['leader'] =
    team1Won > team2Won ? 'team1' : team2Won > team1Won ? 'team2' : 'tied'

  return {
    bet: betName,
    team1HolesWon: team1Won,
    team2HolesWon: team2Won,
    tied,
    holesPlayed: played,
    leader,
    margin: Math.abs(team1Won - team2Won),
  }
}

export function calculateNassau(
  config: NassauConfig,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  roundId: string,
): NassauResult {
  const frontHoles = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const backHoles = [10, 11, 12, 13, 14, 15, 16, 17, 18]
  const allHoles = [...frontHoles, ...backHoles]

  return {
    front: calculateNassauBet(config.team1, config.team2, frontHoles, roundId, scores, holes, players, courseSlope, 'front'),
    back: calculateNassauBet(config.team1, config.team2, backHoles, roundId, scores, holes, players, courseSlope, 'back'),
    overall: calculateNassauBet(config.team1, config.team2, allHoles, roundId, scores, holes, players, courseSlope, 'overall'),
  }
}

// --- Wolf ---

/** Get wolf player for a hole based on rotation order */
export function getWolfForHole(config: WolfConfig, holeNumber: number): string {
  return config.player_order[(holeNumber - 1) % 4]
}

export function calculateWolf(
  config: WolfConfig,
  wolfPartnerSelections: Record<number, string | null>,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  roundId: string,
): WolfResult {
  const totalPoints: Record<string, number> = {}
  for (const pid of config.player_order) {
    totalPoints[pid] = 0
  }

  const holeResults: WolfHoleResult[] = []

  for (let h = 1; h <= 18; h++) {
    const wolfId = getWolfForHole(config, h)
    // Distinguish "no selection yet" (absent) from "lone wolf" (explicit null).
    // `wolfPartnerSelections[h] ?? undefined` would wrongly collapse null to
    // undefined, dropping every lone-wolf hole.
    const partnerId = h in wolfPartnerSelections ? wolfPartnerSelections[h] : undefined

    // If no partner selection made yet, skip this hole
    if (partnerId === undefined) {
      holeResults.push({
        hole_number: h,
        wolfId,
        partnerId: null,
        wolfTeamNet: null,
        oppTeamNet: null,
        wolfWon: null,
        points: {},
      })
      continue
    }

    const isLoneWolf = partnerId === null
    const others = config.player_order.filter(id => id !== wolfId)

    let wolfTeamNet: number | null
    let oppTeamNet: number | null

    if (isLoneWolf) {
      // Lone wolf: individual net vs best ball of 3
      wolfTeamNet = getPlayerNetForHole(wolfId, h, roundId, scores, holes, players, courseSlope)
      oppTeamNet = bestBallNet(others, h, roundId, scores, holes, players, courseSlope)
    } else {
      // Wolf + partner vs other 2
      const oppIds = others.filter(id => id !== partnerId)
      wolfTeamNet = bestBallNet([wolfId, partnerId], h, roundId, scores, holes, players, courseSlope)
      oppTeamNet = bestBallNet(oppIds, h, roundId, scores, holes, players, courseSlope)
    }

    const holePoints: Record<string, number> = {}
    let wolfWon: boolean | null = null

    if (wolfTeamNet !== null && oppTeamNet !== null) {
      wolfWon = wolfTeamNet < oppTeamNet

      if (isLoneWolf) {
        if (wolfWon) {
          // Lone wolf wins: 4 points
          holePoints[wolfId] = 4
        } else if (wolfTeamNet === oppTeamNet) {
          // Tie: no points
        } else {
          // Lone wolf loses: 3 points to each opponent
          for (const opp of others) holePoints[opp] = 3
        }
      } else {
        if (wolfWon) {
          // Wolf team wins: 2 each
          holePoints[wolfId] = 2
          holePoints[partnerId!] = 2
        } else if (wolfTeamNet === oppTeamNet) {
          // Tie: no points
        } else {
          // Opponents win: 2 each
          const oppIds = others.filter(id => id !== partnerId)
          for (const opp of oppIds) holePoints[opp] = 2
        }
      }

      for (const [pid, pts] of Object.entries(holePoints)) {
        totalPoints[pid] = (totalPoints[pid] || 0) + pts
      }
    }

    holeResults.push({
      hole_number: h,
      wolfId,
      partnerId: partnerId,
      wolfTeamNet,
      oppTeamNet,
      wolfWon,
      points: holePoints,
    })
  }

  return { holes: holeResults, totalPoints }
}
