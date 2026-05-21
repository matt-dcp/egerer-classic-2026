import type { Tournament, Course, Hole, Player, Round, Score, Champion, Team, StrokePlayMatchup, BestBallPairing } from './types'

export const DEMO_TOURNAMENT: Tournament = {
  id: 'ec-2026',
  name: 'Egerer Classic 2026',
  location: 'Scottsdale, AZ',
  start_date: '2026-05-28',
  end_date: '2026-05-31',
  admin_pin: '4244',
}

export const DEMO_COURSES: Course[] = [
  {
    id: 'troon-monument',
    name: 'Troon North – Monument',
    tee_name: 'Gold',
    slope: 136,
    rating: 71.7,
    total_par: 72,
  },
  {
    id: 'wekopa-saguaro',
    name: 'We-Ko-Pa – Saguaro',
    tee_name: 'Purple',
    slope: 132,
    rating: 70.2,
    total_par: 71,
  },
]

// Course hero images (public URLs from course websites)
export const COURSE_IMAGES: Record<string, string> = {
  'troon-monument': 'https://www.troonnorthgolf.com/wp-content/uploads/2023/06/monument-hero.jpg',
  'wekopa-saguaro': 'https://wekopa.com/wp-content/uploads/2023/03/saguaro-course-hero.jpg',
}

// Troon North Monument — Gold tees · We-Ko-Pa Saguaro — Purple tees
// (verified from Greenskeeper.org — confirm vs physical scorecard on arrival)
export const DEMO_HOLES: Hole[] = [
  // Troon North Monument - Front 9 (Gold tees)
  { id: 'tm-1', course_id: 'troon-monument', hole_number: 1, par: 4, stroke_index: 5, yardage: 411 },
  { id: 'tm-2', course_id: 'troon-monument', hole_number: 2, par: 3, stroke_index: 17, yardage: 165 },
  { id: 'tm-3', course_id: 'troon-monument', hole_number: 3, par: 5, stroke_index: 3, yardage: 544 },
  { id: 'tm-4', course_id: 'troon-monument', hole_number: 4, par: 4, stroke_index: 11, yardage: 370 },
  { id: 'tm-5', course_id: 'troon-monument', hole_number: 5, par: 4, stroke_index: 1, yardage: 425 },
  { id: 'tm-6', course_id: 'troon-monument', hole_number: 6, par: 4, stroke_index: 13, yardage: 295 },
  { id: 'tm-7', course_id: 'troon-monument', hole_number: 7, par: 3, stroke_index: 15, yardage: 190 },
  { id: 'tm-8', course_id: 'troon-monument', hole_number: 8, par: 4, stroke_index: 9, yardage: 403 },
  { id: 'tm-9', course_id: 'troon-monument', hole_number: 9, par: 5, stroke_index: 7, yardage: 515 },
  // Troon North Monument - Back 9 (Gold tees)
  { id: 'tm-10', course_id: 'troon-monument', hole_number: 10, par: 4, stroke_index: 10, yardage: 384 },
  { id: 'tm-11', course_id: 'troon-monument', hole_number: 11, par: 5, stroke_index: 6, yardage: 504 },
  { id: 'tm-12', course_id: 'troon-monument', hole_number: 12, par: 4, stroke_index: 8, yardage: 411 },
  { id: 'tm-13', course_id: 'troon-monument', hole_number: 13, par: 3, stroke_index: 18, yardage: 206 },
  { id: 'tm-14', course_id: 'troon-monument', hole_number: 14, par: 5, stroke_index: 4, yardage: 556 },
  { id: 'tm-15', course_id: 'troon-monument', hole_number: 15, par: 4, stroke_index: 14, yardage: 283 },
  { id: 'tm-16', course_id: 'troon-monument', hole_number: 16, par: 3, stroke_index: 16, yardage: 234 },
  { id: 'tm-17', course_id: 'troon-monument', hole_number: 17, par: 4, stroke_index: 2, yardage: 455 },
  { id: 'tm-18', course_id: 'troon-monument', hole_number: 18, par: 4, stroke_index: 12, yardage: 365 },
  // We-Ko-Pa Saguaro - Front 9 (Purple tees)
  { id: 'ws-1', course_id: 'wekopa-saguaro', hole_number: 1, par: 4, stroke_index: 5, yardage: 443 },
  { id: 'ws-2', course_id: 'wekopa-saguaro', hole_number: 2, par: 4, stroke_index: 11, yardage: 299 },
  { id: 'ws-3', course_id: 'wekopa-saguaro', hole_number: 3, par: 4, stroke_index: 9, yardage: 383 },
  { id: 'ws-4', course_id: 'wekopa-saguaro', hole_number: 4, par: 5, stroke_index: 1, yardage: 609 },
  { id: 'ws-5', course_id: 'wekopa-saguaro', hole_number: 5, par: 3, stroke_index: 15, yardage: 159 },
  { id: 'ws-6', course_id: 'wekopa-saguaro', hole_number: 6, par: 4, stroke_index: 7, yardage: 406 },
  { id: 'ws-7', course_id: 'wekopa-saguaro', hole_number: 7, par: 4, stroke_index: 13, yardage: 305 },
  { id: 'ws-8', course_id: 'wekopa-saguaro', hole_number: 8, par: 5, stroke_index: 3, yardage: 498 },
  { id: 'ws-9', course_id: 'wekopa-saguaro', hole_number: 9, par: 3, stroke_index: 17, yardage: 130 },
  // We-Ko-Pa Saguaro - Back 9 (Purple tees)
  { id: 'ws-10', course_id: 'wekopa-saguaro', hole_number: 10, par: 4, stroke_index: 14, yardage: 322 },
  { id: 'ws-11', course_id: 'wekopa-saguaro', hole_number: 11, par: 3, stroke_index: 18, yardage: 194 },
  { id: 'ws-12', course_id: 'wekopa-saguaro', hole_number: 12, par: 4, stroke_index: 6, yardage: 461 },
  { id: 'ws-13', course_id: 'wekopa-saguaro', hole_number: 13, par: 4, stroke_index: 8, yardage: 457 },
  { id: 'ws-14', course_id: 'wekopa-saguaro', hole_number: 14, par: 5, stroke_index: 2, yardage: 527 },
  { id: 'ws-15', course_id: 'wekopa-saguaro', hole_number: 15, par: 3, stroke_index: 16, yardage: 233 },
  { id: 'ws-16', course_id: 'wekopa-saguaro', hole_number: 16, par: 4, stroke_index: 12, yardage: 315 },
  { id: 'ws-17', course_id: 'wekopa-saguaro', hole_number: 17, par: 4, stroke_index: 10, yardage: 372 },
  { id: 'ws-18', course_id: 'wekopa-saguaro', hole_number: 18, par: 4, stroke_index: 4, yardage: 490 },
]

// Official 2026 roster (19 players). handicap_index = individual course handicap
// (individual net leaderboard); team_handicap = handicap for team play.
// They differ only for the three highest players (18 individual / 21 team).
export const DEMO_PLAYERS: Player[] = [
  { id: 'p1', tournament_id: 'ec-2026', name: 'Justin Egerer', handicap_index: 6, team_handicap: 6 },
  { id: 'p2', tournament_id: 'ec-2026', name: 'Matt Shamus', handicap_index: 11, team_handicap: 11 },
  { id: 'p3', tournament_id: 'ec-2026', name: 'Dan Kennedy', handicap_index: 10, team_handicap: 10 },
  { id: 'p4', tournament_id: 'ec-2026', name: 'Bryan Brand', handicap_index: 9, team_handicap: 9 },
  { id: 'p5', tournament_id: 'ec-2026', name: 'Brad White', handicap_index: 15, team_handicap: 15 },
  { id: 'p6', tournament_id: 'ec-2026', name: 'Christos Celmayster', handicap_index: 18, team_handicap: 21 },
  { id: 'p7', tournament_id: 'ec-2026', name: 'Justin Anderson', handicap_index: 5, team_handicap: 5 },
  { id: 'p8', tournament_id: 'ec-2026', name: 'Robert Forouzandeh', handicap_index: 7, team_handicap: 7 },
  { id: 'p9', tournament_id: 'ec-2026', name: 'Pierre LaBarge', handicap_index: 5, team_handicap: 5 },
  { id: 'p10', tournament_id: 'ec-2026', name: 'Peter Norman', handicap_index: 18, team_handicap: 21 },
  { id: 'p11', tournament_id: 'ec-2026', name: 'Dave Flaherty', handicap_index: 10, team_handicap: 10 },
  { id: 'p12', tournament_id: 'ec-2026', name: 'Dusty Stutsman', handicap_index: 13, team_handicap: 13 },
  { id: 'p13', tournament_id: 'ec-2026', name: 'Erik Haney', handicap_index: 11, team_handicap: 11 },
  { id: 'p14', tournament_id: 'ec-2026', name: 'Jess Parker', handicap_index: 6, team_handicap: 6 },
  { id: 'p15', tournament_id: 'ec-2026', name: 'Andrew Fitzgerald', handicap_index: 8, team_handicap: 8 },
  { id: 'p17', tournament_id: 'ec-2026', name: 'Joel Baer', handicap_index: 3, team_handicap: 3 },
  { id: 'p18', tournament_id: 'ec-2026', name: 'Scott Schukart', handicap_index: 18, team_handicap: 21 },
  { id: 'p19', tournament_id: 'ec-2026', name: 'Tim Morton-Smith', handicap_index: 4, team_handicap: 4 },
  { id: 'p20', tournament_id: 'ec-2026', name: 'Sean Downing', handicap_index: 0, team_handicap: 0 },
]

export const DEMO_ROUNDS: Round[] = [
  { id: 'r1', tournament_id: 'ec-2026', course_id: 'troon-monument', round_number: 1, date: '2026-05-29' },
  { id: 'r2', tournament_id: 'ec-2026', course_id: 'wekopa-saguaro', round_number: 2, date: '2026-05-30' },
]

export const DEMO_SCORES: Score[] = []

export const DEMO_CHAMPIONS: Champion[] = [
  { id: 'c1',  tournament_id: 'ec-2026', year: 2010, player_name: 'Matt Cook',          venue: 'JW Marriott' },
  { id: 'c2',  tournament_id: 'ec-2026', year: 2011, player_name: 'Cameron Baker',      venue: 'Del Mar Grand' },
  { id: 'c3',  tournament_id: 'ec-2026', year: 2012, player_name: 'Justin Egerer',      venue: 'JW Marriott' },
  { id: 'c4',  tournament_id: 'ec-2026', year: 2013, player_name: 'Adrian Phillips',    venue: 'Carmel Valley Ranch' },
  { id: 'c5',  tournament_id: 'ec-2026', year: 2014, player_name: 'Matt Cook',          venue: 'PGA West Stadium' },
  { id: 'c6',  tournament_id: 'ec-2026', year: 2015, player_name: 'Sean Downing',       venue: 'TPC Scottsdale' },
  { id: 'c7',  tournament_id: 'ec-2026', year: 2016, player_name: 'Sean Downing',       venue: 'Poppy Hills' },
  { id: 'c8',  tournament_id: 'ec-2026', year: 2017, player_name: 'Tim Morton-Smith',   venue: 'PGA West Nicklaus' },
  { id: 'c9',  tournament_id: 'ec-2026', year: 2018, player_name: 'Dusty Stutsman',     venue: 'TPC Dallas' },
  { id: 'c10', tournament_id: 'ec-2026', year: 2019, player_name: 'Justin Egerer',      venue: 'Silver Rock' },
  { id: 'c11', tournament_id: 'ec-2026', year: 2020, player_name: 'Matt Delesalle',     venue: 'Ojai Valley Inn' },
  { id: 'c12', tournament_id: 'ec-2026', year: 2021, player_name: 'Matt Delesalle',     venue: 'PGA West Stadium' },
  { id: 'c13', tournament_id: 'ec-2026', year: 2022, player_name: 'Justin Anderson',    venue: 'Cascata' },
  { id: 'c14', tournament_id: 'ec-2026', year: 2023, player_name: 'Justin Egerer',      venue: 'Poppy Hills' },
  { id: 'c15', tournament_id: 'ec-2026', year: 2024, player_name: 'Dan Kennedy',        venue: "Fred's Ranch" },
  { id: 'c16', tournament_id: 'ec-2026', year: 2025, player_name: 'Dave Flaherty',      venue: 'Grayhawk' },
]

// --- Team Competition ---

// Teams are drafted live via the Admin panel the day before the tournament.
// Start empty — captains + 10-player rosters get set on-site.
export const DEMO_TEAMS: Team[] = [
  { id: 'team-a', name: 'Team A', captain_id: '', player_ids: [] },
  { id: 'team-b', name: 'Team B', captain_id: '', player_ids: [] },
]

// Day 1: 10 stroke play matchups (1v1) — 19 players, set live via Admin panel.
// Admin assigns players + designates one pressure bet per team.
export const DEMO_STROKE_PLAY_MATCHUPS: StrokePlayMatchup[] = Array.from({ length: 10 }, (_, i) => ({
  id: `sp${i + 1}`,
  round_id: 'r1',
  team_a_player_id: '',
  team_b_player_id: '',
  order: i + 1,
  is_pressure_bet: false,
}))

// Day 2: 5 best-ball pairings (2v2) — 19 players, set live via Admin panel after Day 1.
export const DEMO_BEST_BALL_PAIRINGS: BestBallPairing[] = Array.from({ length: 5 }, (_, i) => ({
  id: `bb${i + 1}`,
  round_id: 'r2',
  team_a_player_ids: ['', ''],
  team_b_player_ids: ['', ''],
  order: i + 1,
  is_pressure_bet: false,
}))

