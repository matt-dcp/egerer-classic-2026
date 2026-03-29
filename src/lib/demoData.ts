import type { Tournament, Course, Hole, Player, Round, Score, Champion, Team, StrokePlayMatchup, BestBallPairing } from './types'

export const DEMO_TOURNAMENT: Tournament = {
  id: 'ec-2026',
  name: 'Egerer Classic 2026',
  location: 'Scottsdale, AZ',
  start_date: '2026-05-28',
  end_date: '2026-05-31',
  admin_pin: '1234',
}

export const DEMO_COURSES: Course[] = [
  {
    id: 'troon-monument',
    name: 'Troon North – Monument',
    tee_name: 'Silver',
    slope: 131,
    rating: 69.3,
    total_par: 72,
  },
  {
    id: 'wekopa-saguaro',
    name: 'We-Ko-Pa – Saguaro',
    tee_name: 'White',
    slope: 132,
    rating: 69.6,
    total_par: 72,
  },
]

// Course hero images (public URLs from course websites)
export const COURSE_IMAGES: Record<string, string> = {
  'troon-monument': 'https://www.troonnorthgolf.com/wp-content/uploads/2023/06/monument-hero.jpg',
  'wekopa-saguaro': 'https://wekopa.com/wp-content/uploads/2023/03/saguaro-course-hero.jpg',
}

// Troon North Monument — Silver tees (verified from Greenskeeper.org)
export const DEMO_HOLES: Hole[] = [
  // Troon North Monument - Front 9 (Silver tees)
  { id: 'tm-1', course_id: 'troon-monument', hole_number: 1, par: 4, stroke_index: 5, yardage: 400 },
  { id: 'tm-2', course_id: 'troon-monument', hole_number: 2, par: 3, stroke_index: 17, yardage: 154 },
  { id: 'tm-3', course_id: 'troon-monument', hole_number: 3, par: 5, stroke_index: 3, yardage: 502 },
  { id: 'tm-4', course_id: 'troon-monument', hole_number: 4, par: 4, stroke_index: 11, yardage: 340 },
  { id: 'tm-5', course_id: 'troon-monument', hole_number: 5, par: 4, stroke_index: 1, yardage: 419 },
  { id: 'tm-6', course_id: 'troon-monument', hole_number: 6, par: 4, stroke_index: 13, yardage: 285 },
  { id: 'tm-7', course_id: 'troon-monument', hole_number: 7, par: 3, stroke_index: 15, yardage: 172 },
  { id: 'tm-8', course_id: 'troon-monument', hole_number: 8, par: 4, stroke_index: 9, yardage: 352 },
  { id: 'tm-9', course_id: 'troon-monument', hole_number: 9, par: 5, stroke_index: 7, yardage: 465 },
  // Troon North Monument - Back 9 (Silver tees)
  { id: 'tm-10', course_id: 'troon-monument', hole_number: 10, par: 4, stroke_index: 10, yardage: 375 },
  { id: 'tm-11', course_id: 'troon-monument', hole_number: 11, par: 5, stroke_index: 6, yardage: 460 },
  { id: 'tm-12', course_id: 'troon-monument', hole_number: 12, par: 4, stroke_index: 8, yardage: 338 },
  { id: 'tm-13', course_id: 'troon-monument', hole_number: 13, par: 3, stroke_index: 18, yardage: 196 },
  { id: 'tm-14', course_id: 'troon-monument', hole_number: 14, par: 5, stroke_index: 4, yardage: 495 },
  { id: 'tm-15', course_id: 'troon-monument', hole_number: 15, par: 4, stroke_index: 14, yardage: 275 },
  { id: 'tm-16', course_id: 'troon-monument', hole_number: 16, par: 3, stroke_index: 16, yardage: 222 },
  { id: 'tm-17', course_id: 'troon-monument', hole_number: 17, par: 4, stroke_index: 2, yardage: 422 },
  { id: 'tm-18', course_id: 'troon-monument', hole_number: 18, par: 4, stroke_index: 12, yardage: 348 },
  // We-Ko-Pa Saguaro - Front 9 (White tees, verified from Greenskeeper.org)
  { id: 'ws-1', course_id: 'wekopa-saguaro', hole_number: 1, par: 4, stroke_index: 5, yardage: 426 },
  { id: 'ws-2', course_id: 'wekopa-saguaro', hole_number: 2, par: 4, stroke_index: 11, yardage: 288 },
  { id: 'ws-3', course_id: 'wekopa-saguaro', hole_number: 3, par: 4, stroke_index: 9, yardage: 362 },
  { id: 'ws-4', course_id: 'wekopa-saguaro', hole_number: 4, par: 5, stroke_index: 1, yardage: 595 },
  { id: 'ws-5', course_id: 'wekopa-saguaro', hole_number: 5, par: 3, stroke_index: 15, yardage: 146 },
  { id: 'ws-6', course_id: 'wekopa-saguaro', hole_number: 6, par: 4, stroke_index: 7, yardage: 380 },
  { id: 'ws-7', course_id: 'wekopa-saguaro', hole_number: 7, par: 4, stroke_index: 13, yardage: 290 },
  { id: 'ws-8', course_id: 'wekopa-saguaro', hole_number: 8, par: 5, stroke_index: 3, yardage: 482 },
  { id: 'ws-9', course_id: 'wekopa-saguaro', hole_number: 9, par: 3, stroke_index: 17, yardage: 121 },
  // We-Ko-Pa Saguaro - Back 9 (White tees, verified from Greenskeeper.org)
  { id: 'ws-10', course_id: 'wekopa-saguaro', hole_number: 10, par: 4, stroke_index: 14, yardage: 305 },
  { id: 'ws-11', course_id: 'wekopa-saguaro', hole_number: 11, par: 3, stroke_index: 18, yardage: 176 },
  { id: 'ws-12', course_id: 'wekopa-saguaro', hole_number: 12, par: 4, stroke_index: 6, yardage: 423 },
  { id: 'ws-13', course_id: 'wekopa-saguaro', hole_number: 13, par: 4, stroke_index: 8, yardage: 417 },
  { id: 'ws-14', course_id: 'wekopa-saguaro', hole_number: 14, par: 5, stroke_index: 2, yardage: 513 },
  { id: 'ws-15', course_id: 'wekopa-saguaro', hole_number: 15, par: 3, stroke_index: 16, yardage: 209 },
  { id: 'ws-16', course_id: 'wekopa-saguaro', hole_number: 16, par: 4, stroke_index: 12, yardage: 290 },
  { id: 'ws-17', course_id: 'wekopa-saguaro', hole_number: 17, par: 4, stroke_index: 10, yardage: 358 },
  { id: 'ws-18', course_id: 'wekopa-saguaro', hole_number: 18, par: 4, stroke_index: 4, yardage: 470 },
]

export const DEMO_PLAYERS: Player[] = [
  { id: 'p1', tournament_id: 'ec-2026', name: 'Justin Egerer', handicap_index: 7.2 },
  { id: 'p2', tournament_id: 'ec-2026', name: 'Matt Shamus', handicap_index: 10.7 },
  { id: 'p3', tournament_id: 'ec-2026', name: 'Dan Kennedy', handicap_index: 12.5 },
  { id: 'p4', tournament_id: 'ec-2026', name: 'Bryan Brand', handicap_index: 10.1 },
  { id: 'p5', tournament_id: 'ec-2026', name: 'Brad White', handicap_index: 0 },
  { id: 'p6', tournament_id: 'ec-2026', name: 'Christos Celmayster', handicap_index: 20.6 },
  { id: 'p7', tournament_id: 'ec-2026', name: 'Justin Anderson', handicap_index: 6.0 },
  { id: 'p8', tournament_id: 'ec-2026', name: 'Darius Forouzandeh', handicap_index: 8.4 },
  { id: 'p9', tournament_id: 'ec-2026', name: 'Pierre LaBarge', handicap_index: 5.7 },
  { id: 'p10', tournament_id: 'ec-2026', name: 'Greg Norman', handicap_index: 20.5 },
  { id: 'p11', tournament_id: 'ec-2026', name: 'Dave Flaherty', handicap_index: 9.5 },
  { id: 'p12', tournament_id: 'ec-2026', name: 'Dusty Stutsman', handicap_index: 12.7 },
  { id: 'p13', tournament_id: 'ec-2026', name: 'Erik Haney', handicap_index: 11.0 },
  { id: 'p14', tournament_id: 'ec-2026', name: 'Jess Parker', handicap_index: 6.7 },
  { id: 'p15', tournament_id: 'ec-2026', name: 'Andrew Fitzgerald', handicap_index: 8.1 },
  { id: 'p16', tournament_id: 'ec-2026', name: 'Trey Evans', handicap_index: 0 },
]

export const DEMO_ROUNDS: Round[] = [
  { id: 'r1', tournament_id: 'ec-2026', course_id: 'troon-monument', round_number: 1, date: '2026-05-29' },
  { id: 'r2', tournament_id: 'ec-2026', course_id: 'wekopa-saguaro', round_number: 2, date: '2026-05-30' },
]

export const DEMO_SCORES: Score[] = []

export const DEMO_CHAMPIONS: Champion[] = [
  { id: 'c1', tournament_id: 'ec-2026', year: 2012, player_name: 'Justin Egerer' },
  { id: 'c2', tournament_id: 'ec-2026', year: 2013, player_name: 'TBD' },
  { id: 'c3', tournament_id: 'ec-2026', year: 2014, player_name: 'TBD' },
  { id: 'c4', tournament_id: 'ec-2026', year: 2015, player_name: 'TBD' },
  { id: 'c5', tournament_id: 'ec-2026', year: 2016, player_name: 'TBD' },
  { id: 'c6', tournament_id: 'ec-2026', year: 2017, player_name: 'TBD' },
  { id: 'c7', tournament_id: 'ec-2026', year: 2018, player_name: 'TBD' },
  { id: 'c8', tournament_id: 'ec-2026', year: 2019, player_name: 'Justin Egerer' },
  { id: 'c9', tournament_id: 'ec-2026', year: 2020, player_name: 'TBD' },
  { id: 'c10', tournament_id: 'ec-2026', year: 2021, player_name: 'TBD' },
  { id: 'c11', tournament_id: 'ec-2026', year: 2022, player_name: 'TBD' },
  { id: 'c12', tournament_id: 'ec-2026', year: 2023, player_name: 'Justin Egerer' },
  { id: 'c13', tournament_id: 'ec-2026', year: 2024, player_name: 'Brad White & Christos Celmayster' },
  { id: 'c14', tournament_id: 'ec-2026', year: 2025, player_name: 'TBD' },
]

// --- Team Competition ---

export const DEMO_TEAMS: Team[] = [
  {
    id: 'team-a',
    name: 'Team Egerer',
    captain_id: 'p1',
    player_ids: ['p1', 'p2', 'p7', 'p9', 'p11', 'p13', 'p15', 'p16'],
    // Egerer, Shamus, Anderson, LaBarge, Flaherty, Haney, Fitzgerald, Evans
  },
  {
    id: 'team-b',
    name: 'Team Parker',
    captain_id: 'p14',
    player_ids: ['p14', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p12'],
    // Parker, Kennedy, Brand, White, Celmayster, Forouzandeh, Norman, Stutsman
  },
]

// Day 1: 8 stroke play matchups (1v1, ordered 1-8)
// One pressure bet per team (matchups 1 and 5 here as placeholders)
export const DEMO_STROKE_PLAY_MATCHUPS: StrokePlayMatchup[] = [
  { id: 'sp1', round_id: 'r1', team_a_player_id: 'p1', team_b_player_id: 'p14', order: 1, is_pressure_bet: true },
  { id: 'sp2', round_id: 'r1', team_a_player_id: 'p7', team_b_player_id: 'p5', order: 2, is_pressure_bet: false },
  { id: 'sp3', round_id: 'r1', team_a_player_id: 'p9', team_b_player_id: 'p8', order: 3, is_pressure_bet: false },
  { id: 'sp4', round_id: 'r1', team_a_player_id: 'p15', team_b_player_id: 'p4', order: 4, is_pressure_bet: false },
  { id: 'sp5', round_id: 'r1', team_a_player_id: 'p2', team_b_player_id: 'p3', order: 5, is_pressure_bet: true },
  { id: 'sp6', round_id: 'r1', team_a_player_id: 'p11', team_b_player_id: 'p12', order: 6, is_pressure_bet: false },
  { id: 'sp7', round_id: 'r1', team_a_player_id: 'p13', team_b_player_id: 'p6', order: 7, is_pressure_bet: false },
  { id: 'sp8', round_id: 'r1', team_a_player_id: 'p16', team_b_player_id: 'p10', order: 8, is_pressure_bet: false },
]

// Day 2: 4 best-ball pairings (2v2, ordered 1-4)
export const DEMO_BEST_BALL_PAIRINGS: BestBallPairing[] = [
  { id: 'bb1', round_id: 'r2', team_a_player_ids: ['p1', 'p2'], team_b_player_ids: ['p14', 'p3'], order: 1 },
  { id: 'bb2', round_id: 'r2', team_a_player_ids: ['p7', 'p9'], team_b_player_ids: ['p5', 'p8'], order: 2 },
  { id: 'bb3', round_id: 'r2', team_a_player_ids: ['p11', 'p15'], team_b_player_ids: ['p4', 'p12'], order: 3 },
  { id: 'bb4', round_id: 'r2', team_a_player_ids: ['p13', 'p16'], team_b_player_ids: ['p6', 'p10'], order: 4 },
]

