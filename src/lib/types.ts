export interface Tournament {
  id: string
  name: string
  location: string
  start_date: string
  end_date: string
  admin_pin: string
}

export interface Course {
  id: string
  name: string
  tee_name: string
  slope: number
  rating: number
  total_par: number
}

export interface Hole {
  id: string
  course_id: string
  hole_number: number
  par: number
  stroke_index: number
  yardage: number
}

export interface Player {
  id: string
  tournament_id: string
  name: string
  handicap_index: number
  photo_url?: string
}

export interface Round {
  id: string
  tournament_id: string
  course_id: string
  round_number: number
  date: string
}

export interface Score {
  id: string
  round_id: string
  player_id: string
  hole_number: number
  gross_score: number
  updated_at: string
}

export interface Champion {
  id: string
  tournament_id: string
  year: number
  player_name: string
}

export interface LeaderboardEntry {
  player: Player
  totalGross: number
  totalNet: number
  totalNetVsPar: number
  holesPlayed: number
  r1Gross: number
  r1Net: number
  r1NetVsPar: number
  r1Holes: number
  r2Gross: number
  r2Net: number
  r2NetVsPar: number
  r2Holes: number
}

export interface HoleScore {
  hole_number: number
  par: number
  stroke_index: number
  gross_score: number | null
  strokes_received: number
  net_score: number | null
}

// --- Foursome ---

export interface Foursome {
  id: string
  round_id: string
  player_ids: [string, string, string, string]
}

// --- Side Games ---

export type SideGameType = 'six_six_six' | 'nassau' | 'wolf'

// 6/6/6: round-robin best ball, teams rotate every 6 holes
// Holes 1-6: A+B vs C+D, 7-12: A+C vs B+D, 13-18: A+D vs B+C
export interface SixSixSixConfig {
  type: 'six_six_six'
  foursome_id: string
}

// Nassau: fixed 2v2, three independent bets
export interface NassauConfig {
  type: 'nassau'
  foursome_id: string
  team1: [string, string]
  team2: [string, string]
}

// Wolf: rotating wolf picks partner or goes lone each hole
export interface WolfConfig {
  type: 'wolf'
  foursome_id: string
  player_order: [string, string, string, string]
}

export type SideGameConfig = SixSixSixConfig | NassauConfig | WolfConfig

// --- Computed Game Results ---

export interface SixSixSixSegment {
  segment: 1 | 2 | 3
  holes: number[]             // e.g. [1,2,3,4,5,6]
  team1Ids: [string, string]
  team2Ids: [string, string]
  team1BestBalls: (number | null)[]  // net per hole
  team2BestBalls: (number | null)[]
  team1Total: number
  team2Total: number
  holesCompleted: number
  winner: 'team1' | 'team2' | 'tie' | null  // null if incomplete
}

export interface SixSixSixResult {
  segments: [SixSixSixSegment, SixSixSixSegment, SixSixSixSegment]
}

export interface NassauBet {
  bet: 'front' | 'back' | 'overall'
  team1HolesWon: number
  team2HolesWon: number
  tied: number
  holesPlayed: number
  leader: 'team1' | 'team2' | 'tied'
  margin: number
}

export interface NassauResult {
  front: NassauBet
  back: NassauBet
  overall: NassauBet
}

export interface WolfHoleResult {
  hole_number: number
  wolfId: string
  partnerId: string | null   // null = lone wolf
  wolfTeamNet: number | null
  oppTeamNet: number | null
  wolfWon: boolean | null    // null if incomplete
  points: Record<string, number>
}

export interface WolfResult {
  holes: WolfHoleResult[]
  totalPoints: Record<string, number>
}

// --- Team Competition ---

export interface Team {
  id: string             // 'team-a' | 'team-b'
  name: string           // Captain's last name or team name
  captain_id: string
  player_ids: string[]   // 8 player IDs including captain
}

export interface StrokePlayMatchup {
  id: string
  round_id: string
  team_a_player_id: string
  team_b_player_id: string
  order: number          // 1-8
  is_pressure_bet: boolean  // worth 2 points instead of 1
}

export interface BestBallPairing {
  id: string
  round_id: string
  team_a_player_ids: [string, string]
  team_b_player_ids: [string, string]
  order: number          // 1-4
}

export type MatchResult = 'in_progress' | 'team_a_wins' | 'team_b_wins' | 'halved'

export interface StrokePlayResult {
  matchup: StrokePlayMatchup
  playerANetTotal: number | null  // total net score (null if no holes)
  playerBNetTotal: number | null
  playerAThru: number             // holes completed
  playerBThru: number
  result: MatchResult
  description: string             // e.g. "68 vs 71 (F)" or "-3 vs +1 (thru 14)"
  points: { teamA: number; teamB: number }
}

export interface BestBallResult {
  pairing: BestBallPairing
  teamABestBallTotal: number | null
  teamBBestBallTotal: number | null
  teamAThru: number
  teamBThru: number
  result: MatchResult
  description: string
  points: { teamA: number; teamB: number }
}

export interface TeamStandings {
  teamA: { team: Team; strokePlayPoints: number; bestBallPoints: number; totalPoints: number }
  teamB: { team: Team; strokePlayPoints: number; bestBallPoints: number; totalPoints: number }
  strokePlayResults: StrokePlayResult[]
  bestBallResults: BestBallResult[]
}
