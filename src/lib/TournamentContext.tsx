import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type {
  Tournament, Course, Hole, Player, Round, Score, Champion, LeaderboardEntry,
  Foursome, SideGameConfig, Team, StrokePlayMatchup, BestBallPairing, TeamStandings,
} from './types'
import { calculateCourseHandicap, getStrokesForHole } from './scoring'
import { computeTeamStandings } from './teamCompetition'
import {
  DEMO_TOURNAMENT, DEMO_COURSES, DEMO_HOLES, DEMO_PLAYERS,
  DEMO_ROUNDS, DEMO_SCORES, DEMO_CHAMPIONS,
  DEMO_TEAMS, DEMO_STROKE_PLAY_MATCHUPS, DEMO_BEST_BALL_PAIRINGS,
} from './demoData'

export interface AdminSettings {
  showTeams: boolean
  showDay1Matchups: boolean
  showDay2Matchups: boolean
  showLeaderboard: boolean
  showScoreEntry: boolean
  r1Locked: boolean
  r2Locked: boolean
  announcement: string        // custom ticker message, empty = none
}

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  showTeams: true,
  showDay1Matchups: true,
  showDay2Matchups: false,
  showLeaderboard: true,
  showScoreEntry: true,
  r1Locked: false,
  r2Locked: false,
  announcement: '',
}

interface TournamentContextType {
  tournament: Tournament
  courses: Course[]
  holes: Hole[]
  players: Player[]
  rounds: Round[]
  scores: Score[]
  champions: Champion[]
  leaderboard: LeaderboardEntry[]
  getHolesForCourse: (courseId: string) => Hole[]
  getScoresForPlayerRound: (playerId: string, roundId: string) => Score[]
  submitScore: (roundId: string, playerId: string, holeNumber: number, grossScore: number) => void
  deleteScore: (roundId: string, playerId: string, holeNumber: number) => void
  submitBatchScores: (roundId: string, playerId: string, scores: { hole: number; gross: number }[]) => void
  isAdmin: boolean
  login: (pin: string) => boolean
  // Foursome + side games
  foursomes: Foursome[]
  createFoursome: (roundId: string, playerIds: [string, string, string, string]) => Foursome
  deleteFoursome: (foursomeId: string) => void
  sideGameConfigs: SideGameConfig[]
  addSideGame: (config: SideGameConfig) => void
  removeSideGame: (foursomeId: string, gameType: string) => void
  // Team competition
  teams: Team[]
  strokePlayMatchups: StrokePlayMatchup[]
  bestBallPairings: BestBallPairing[]
  teamStandings: TeamStandings | null
  setTeams: (teams: Team[]) => void
  setStrokePlayMatchups: (matchups: StrokePlayMatchup[]) => void
  setBestBallPairings: (pairings: BestBallPairing[]) => void
  // Admin settings
  adminSettings: AdminSettings
  updateAdminSettings: (updates: Partial<AdminSettings>) => void
  // Current player (global identity)
  currentPlayerId: string
  setCurrentPlayer: (playerId: string) => void
  isOnboarded: boolean
}

const TournamentContext = createContext<TournamentContextType | null>(null)

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState<Score[]>(DEMO_SCORES)
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('ec-admin') === 'true')

  const tournament = DEMO_TOURNAMENT
  const courses = DEMO_COURSES
  const holes = DEMO_HOLES
  const players = DEMO_PLAYERS
  const rounds = DEMO_ROUNDS
  const champions = DEMO_CHAMPIONS

  // --- Global player identity ---
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(() =>
    localStorage.getItem('ec-my-player-id') || '',
  )
  const isOnboarded = !!currentPlayerId && isAdmin

  const setCurrentPlayer = useCallback((playerId: string) => {
    setCurrentPlayerId(playerId)
    localStorage.setItem('ec-my-player-id', playerId)
    setIsAdmin(true)
    localStorage.setItem('ec-admin', 'true')
  }, [])

  const getHolesForCourse = useCallback(
    (courseId: string) => holes.filter(h => h.course_id === courseId).sort((a, b) => a.hole_number - b.hole_number),
    [holes],
  )

  const getScoresForPlayerRound = useCallback(
    (playerId: string, roundId: string) =>
      scores.filter(s => s.player_id === playerId && s.round_id === roundId),
    [scores],
  )

  const submitScore = useCallback(
    (roundId: string, playerId: string, holeNumber: number, grossScore: number) => {
      setScores(prev => {
        const existing = prev.findIndex(
          s => s.round_id === roundId && s.player_id === playerId && s.hole_number === holeNumber,
        )
        const newScore: Score = {
          id: `s-${roundId}-${playerId}-${holeNumber}`,
          round_id: roundId,
          player_id: playerId,
          hole_number: holeNumber,
          gross_score: grossScore,
          updated_at: new Date().toISOString(),
        }
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = newScore
          return updated
        }
        return [...prev, newScore]
      })
    },
    [],
  )

  const deleteScore = useCallback(
    (roundId: string, playerId: string, holeNumber: number) => {
      setScores(prev => prev.filter(
        s => !(s.round_id === roundId && s.player_id === playerId && s.hole_number === holeNumber),
      ))
    },
    [],
  )

  const submitBatchScores = useCallback(
    (roundId: string, playerId: string, batchScores: { hole: number; gross: number }[]) => {
      setScores(prev => {
        const updated = [...prev]
        for (const { hole, gross } of batchScores) {
          const idx = updated.findIndex(
            s => s.round_id === roundId && s.player_id === playerId && s.hole_number === hole,
          )
          const newScore: Score = {
            id: `s-${roundId}-${playerId}-${hole}`,
            round_id: roundId,
            player_id: playerId,
            hole_number: hole,
            gross_score: gross,
            updated_at: new Date().toISOString(),
          }
          if (idx >= 0) {
            updated[idx] = newScore
          } else {
            updated.push(newScore)
          }
        }
        return updated
      })
    },
    [],
  )

  // --- Foursome state ---
  const [foursomes, setFoursomes] = useState<Foursome[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-foursomes') || '[]') } catch { return [] }
  })
  const [sideGameConfigs, setSideGameConfigs] = useState<SideGameConfig[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-sidegames') || '[]') } catch { return [] }
  })

  const createFoursome = useCallback((roundId: string, playerIds: [string, string, string, string]) => {
    const fs: Foursome = { id: `fs-${roundId}-${Date.now()}`, round_id: roundId, player_ids: playerIds }
    setFoursomes(prev => {
      const filtered = prev.filter(f => f.round_id !== roundId)
      const next = [...filtered, fs]
      localStorage.setItem('ec-foursomes', JSON.stringify(next))
      return next
    })
    return fs
  }, [])

  const deleteFoursome = useCallback((foursomeId: string) => {
    setFoursomes(prev => {
      const next = prev.filter(f => f.id !== foursomeId)
      localStorage.setItem('ec-foursomes', JSON.stringify(next))
      return next
    })
    setSideGameConfigs(prev => {
      const next = prev.filter(g => g.foursome_id !== foursomeId)
      localStorage.setItem('ec-sidegames', JSON.stringify(next))
      return next
    })
  }, [])

  const addSideGame = useCallback((config: SideGameConfig) => {
    setSideGameConfigs(prev => {
      const filtered = prev.filter(g => !(g.foursome_id === config.foursome_id && g.type === config.type))
      const next = [...filtered, config]
      localStorage.setItem('ec-sidegames', JSON.stringify(next))
      return next
    })
  }, [])

  const removeSideGame = useCallback((foursomeId: string, gameType: string) => {
    setSideGameConfigs(prev => {
      const next = prev.filter(g => !(g.foursome_id === foursomeId && g.type === gameType))
      localStorage.setItem('ec-sidegames', JSON.stringify(next))
      return next
    })
  }, [])

  // --- Team competition state ---
  const [teams, setTeamsState] = useState<Team[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-teams') || 'null') ?? DEMO_TEAMS } catch { return DEMO_TEAMS }
  })

  const setTeams = useCallback((t: Team[]) => {
    setTeamsState(t)
    localStorage.setItem('ec-teams', JSON.stringify(t))
  }, [])
  const [strokePlayMatchups, setStrokePlayMatchups] = useState<StrokePlayMatchup[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-stroke-matchups') || 'null') ?? DEMO_STROKE_PLAY_MATCHUPS } catch { return DEMO_STROKE_PLAY_MATCHUPS }
  })
  const [bestBallPairings, setBestBallPairings] = useState<BestBallPairing[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-bestball-pairings') || 'null') ?? DEMO_BEST_BALL_PAIRINGS } catch { return DEMO_BEST_BALL_PAIRINGS }
  })

  const updateStrokePlayMatchups = useCallback((matchups: StrokePlayMatchup[]) => {
    setStrokePlayMatchups(matchups)
    localStorage.setItem('ec-stroke-matchups', JSON.stringify(matchups))
  }, [])

  const updateBestBallPairings = useCallback((pairings: BestBallPairing[]) => {
    setBestBallPairings(pairings)
    localStorage.setItem('ec-bestball-pairings', JSON.stringify(pairings))
  }, [])

  // --- Admin settings ---
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    try { return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(localStorage.getItem('ec-admin-settings') || '{}') } } catch { return DEFAULT_ADMIN_SETTINGS }
  })

  const updateAdminSettings = useCallback((updates: Partial<AdminSettings>) => {
    setAdminSettings(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('ec-admin-settings', JSON.stringify(next))
      return next
    })
  }, [])

  const teamStandings = useMemo(() =>
    computeTeamStandings(teams, strokePlayMatchups, bestBallPairings, scores, holes, players, courses, rounds),
    [teams, strokePlayMatchups, bestBallPairings, scores, holes, players, courses, rounds],
  )

  const login = useCallback((pin: string) => {
    if (pin.length === 4) {
      setIsAdmin(true)
      localStorage.setItem('ec-admin', 'true')
      localStorage.setItem('ec-user-id', pin)
      return true
    }
    return false
  }, [])

  // Calculate leaderboard
  const leaderboard: LeaderboardEntry[] = players.map(player => {
    let totalGross = 0, totalNet = 0, totalPar = 0, holesPlayed = 0
    let r1Gross = 0, r1Net = 0, r1Par = 0, r1Holes = 0
    let r2Gross = 0, r2Net = 0, r2Par = 0, r2Holes = 0

    for (const round of rounds) {
      const course = courses.find(c => c.id === round.course_id)!
      const courseHoles = getHolesForCourse(round.course_id)
      const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
      const playerScores = getScoresForPlayerRound(player.id, round.id)

      for (const score of playerScores) {
        const hole = courseHoles.find(h => h.hole_number === score.hole_number)
        if (!hole) continue
        const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
        const net = score.gross_score - strokes

        totalGross += score.gross_score
        totalNet += net
        totalPar += hole.par
        holesPlayed++

        if (round.round_number === 1) {
          r1Gross += score.gross_score
          r1Net += net
          r1Par += hole.par
          r1Holes++
        } else {
          r2Gross += score.gross_score
          r2Net += net
          r2Par += hole.par
          r2Holes++
        }
      }
    }

    return {
      player,
      totalGross,
      totalNet,
      totalNetVsPar: totalNet - totalPar,
      holesPlayed,
      r1Gross,
      r1Net,
      r1NetVsPar: r1Net - r1Par,
      r1Holes,
      r2Gross,
      r2Net,
      r2NetVsPar: r2Net - r2Par,
      r2Holes,
    }
  }).sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.player.name.localeCompare(b.player.name)
    if (a.holesPlayed === 0) return 1
    if (b.holesPlayed === 0) return -1
    return a.totalNetVsPar - b.totalNetVsPar
  })

  return (
    <TournamentContext.Provider value={{
      tournament, courses, holes, players, rounds, scores, champions,
      leaderboard, getHolesForCourse, getScoresForPlayerRound,
      submitScore, deleteScore, submitBatchScores, isAdmin, login,
      foursomes, createFoursome, deleteFoursome,
      sideGameConfigs, addSideGame, removeSideGame,
      teams, setTeams, strokePlayMatchups, bestBallPairings, teamStandings,
      setStrokePlayMatchups: updateStrokePlayMatchups,
      setBestBallPairings: updateBestBallPairings,
      adminSettings, updateAdminSettings,
      currentPlayerId, setCurrentPlayer, isOnboarded,
    }}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournament() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider')
  return ctx
}
