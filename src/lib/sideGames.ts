/**
 * Pure functions for side game calculations.
 * All results are derived from scores + configs — nothing stored.
 */

import type {
  Score, Hole, Player, Foursome,
  SixSixSixConfig, SixSixSixResult, SixSixSixSegment,
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

  const courseHcp = calculateCourseHandicap(player.handicap_index, courseSlope)
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

// --- 6/6/6 ---

const SEGMENT_HOLES: [number[], number[], number[]] = [
  [1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18],
]

/** Get the team pairings for a 6/6/6 segment */
function getSixSixSixTeams(
  playerIds: [string, string, string, string],
  segment: 1 | 2 | 3,
): { team1: [string, string]; team2: [string, string] } {
  const [a, b, c, d] = playerIds
  switch (segment) {
    case 1: return { team1: [a, b], team2: [c, d] }
    case 2: return { team1: [a, c], team2: [b, d] }
    case 3: return { team1: [a, d], team2: [b, c] }
  }
}

export function calculateSixSixSix(
  _config: SixSixSixConfig,
  foursome: Foursome,
  scores: Score[],
  holes: Hole[],
  players: Player[],
  courseSlope: number,
  roundId: string,
): SixSixSixResult {
  const segments = ([1, 2, 3] as const).map((seg): SixSixSixSegment => {
    const segHoles = SEGMENT_HOLES[seg - 1]
    const { team1, team2 } = getSixSixSixTeams(foursome.player_ids, seg)

    const team1BestBalls = segHoles.map(h =>
      bestBallNet(team1, h, roundId, scores, holes, players, courseSlope),
    )
    const team2BestBalls = segHoles.map(h =>
      bestBallNet(team2, h, roundId, scores, holes, players, courseSlope),
    )

    let team1Total = 0, team2Total = 0, holesCompleted = 0
    for (let i = 0; i < 6; i++) {
      if (team1BestBalls[i] !== null && team2BestBalls[i] !== null) {
        team1Total += team1BestBalls[i]!
        team2Total += team2BestBalls[i]!
        holesCompleted++
      }
    }

    let winner: SixSixSixSegment['winner'] = null
    if (holesCompleted === 6) {
      winner = team1Total < team2Total ? 'team1' : team2Total < team1Total ? 'team2' : 'tie'
    }

    return {
      segment: seg,
      holes: segHoles,
      team1Ids: team1,
      team2Ids: team2,
      team1BestBalls,
      team2BestBalls,
      team1Total,
      team2Total,
      holesCompleted,
      winner,
    }
  })

  return { segments: segments as [SixSixSixSegment, SixSixSixSegment, SixSixSixSegment] }
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
    const partnerId = wolfPartnerSelections[h] ?? undefined

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
