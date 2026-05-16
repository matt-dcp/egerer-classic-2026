import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react'
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
import { supabase, isSupabaseConfigured } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Admin Settings
// ---------------------------------------------------------------------------

export interface AdminSettings {
  showTeams: boolean
  showDay1Matchups: boolean
  showDay2Matchups: boolean
  showLeaderboard: boolean
  showScoreEntry: boolean
  r1Locked: boolean
  r2Locked: boolean
  announcement: string
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

// ---------------------------------------------------------------------------
// Sync status type
// ---------------------------------------------------------------------------

export type SyncStatus = 'synced' | 'pending' | 'offline'

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

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
  logout: () => void
  isOnboarded: boolean
  // Sync
  syncStatus: SyncStatus
}

const TournamentContext = createContext<TournamentContextType | null>(null)

// ---------------------------------------------------------------------------
// Sync queue — stores pending writes when offline
// ---------------------------------------------------------------------------

interface QueuedOp {
  id: string
  table: string
  type: 'upsert' | 'delete'
  payload: Record<string, unknown>
  // For delete: payload contains the match conditions
}

function loadSyncQueue(): QueuedOp[] {
  try { return JSON.parse(localStorage.getItem('ec-sync-queue') || '[]') } catch { return [] }
}

function saveSyncQueue(q: QueuedOp[]) {
  safeSetItem('ec-sync-queue', JSON.stringify(q))
}

/** Safely write to localStorage — silently ignores quota errors */
function safeSetItem(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* quota exceeded or unavailable */ }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TournamentProvider({ children }: { children: ReactNode }) {
  // ---- Scores ----
  const [scores, setScoresRaw] = useState<Score[]>(() => {
    try {
      const stored = localStorage.getItem('ec-scores')
      return stored ? JSON.parse(stored) : DEMO_SCORES
    } catch { return DEMO_SCORES }
  })

  const setScores = useCallback((updater: Score[] | ((prev: Score[]) => Score[])) => {
    setScoresRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      safeSetItem('ec-scores', JSON.stringify(next))
      return next
    })
  }, [])

  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('ec-admin') === 'true')

  const tournament = DEMO_TOURNAMENT
  const courses = DEMO_COURSES
  const holes = DEMO_HOLES
  const players = DEMO_PLAYERS
  const rounds = DEMO_ROUNDS
  const champions = DEMO_CHAMPIONS

  // ---- Player identity ----
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(() =>
    localStorage.getItem('ec-my-player-id') || '',
  )
  const isOnboarded = !!currentPlayerId

  const setCurrentPlayer = useCallback((playerId: string) => {
    setCurrentPlayerId(playerId)
    safeSetItem('ec-my-player-id', playerId)
  }, [])

  const logout = useCallback(() => {
    setCurrentPlayerId('')
    setIsAdmin(false)
    localStorage.removeItem('ec-my-player-id')
    localStorage.removeItem('ec-admin')
  }, [])

  // ---- Sync status & queue ----
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSupabaseConfigured ? 'pending' : 'synced')
  const syncQueueRef = useRef<QueuedOp[]>(loadSyncQueue())
  const flushingRef = useRef(false)

  // ---- Supabase write helpers ----

  const enqueueOp = useCallback((op: QueuedOp) => {
    // Deduplicate: remove any existing op with same id+table+type
    syncQueueRef.current = [
      ...syncQueueRef.current.filter(o => !(o.id === op.id && o.table === op.table && o.type === op.type)),
      op,
    ]
    saveSyncQueue(syncQueueRef.current)
    setSyncStatus('pending')
  }, [])

  const flushQueue = useCallback(async () => {
    if (!isSupabaseConfigured || flushingRef.current || syncQueueRef.current.length === 0) return
    flushingRef.current = true

    const remaining: QueuedOp[] = []
    for (const op of syncQueueRef.current) {
      try {
        if (op.type === 'upsert') {
          const { error } = await supabase.from(op.table).upsert(op.payload, { onConflict: 'id' })
          if (error) { remaining.push(op); continue }
        } else {
          // delete
          let query = supabase.from(op.table).delete()
          for (const [k, v] of Object.entries(op.payload)) {
            query = query.eq(k, v as string)
          }
          const { error } = await query
          if (error) { remaining.push(op); continue }
        }
      } catch {
        remaining.push(op)
      }
    }

    syncQueueRef.current = remaining
    saveSyncQueue(remaining)
    setSyncStatus(remaining.length > 0 ? 'pending' : 'synced')
    flushingRef.current = false
  }, [])

  // Periodic flush
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const interval = setInterval(flushQueue, 5_000)
    // Flush immediately on mount
    flushQueue()
    return () => clearInterval(interval)
  }, [flushQueue])

  // Also flush on online event
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const handler = () => { flushQueue() }
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [flushQueue])

  // ---- Supabase async write (fire-and-forget with queue fallback) ----

  const sbUpsert = useCallback((table: string, payload: Record<string, unknown>) => {
    if (!isSupabaseConfigured) return
    const opId = (payload.id as string) || crypto.randomUUID()
    const op: QueuedOp = { id: opId, table, type: 'upsert', payload }
    enqueueOp(op)
    // Try immediate flush
    flushQueue()
  }, [enqueueOp, flushQueue])

  const sbDelete = useCallback((table: string, conditions: Record<string, unknown>) => {
    if (!isSupabaseConfigured) return
    const opId = Object.values(conditions).join('-')
    const op: QueuedOp = { id: opId, table, type: 'delete', payload: conditions }
    enqueueOp(op)
    flushQueue()
  }, [enqueueOp, flushQueue])

  // ---- Score operations ----

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
      const scoreId = `s-${roundId}-${playerId}-${holeNumber}`
      const now = new Date().toISOString()
      const newScore: Score = {
        id: scoreId,
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
        gross_score: grossScore,
        updated_at: now,
      }
      // localStorage first (immediate)
      setScores(prev => {
        const existing = prev.findIndex(
          s => s.round_id === roundId && s.player_id === playerId && s.hole_number === holeNumber,
        )
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = newScore
          return updated
        }
        return [...prev, newScore]
      })
      // Supabase async
      sbUpsert('app_scores', {
        id: scoreId,
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
        gross_score: grossScore,
        updated_at: now,
      })
    },
    [setScores, sbUpsert],
  )

  const deleteScore = useCallback(
    (roundId: string, playerId: string, holeNumber: number) => {
      setScores(prev => prev.filter(
        s => !(s.round_id === roundId && s.player_id === playerId && s.hole_number === holeNumber),
      ))
      sbDelete('app_scores', {
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
      })
    },
    [setScores, sbDelete],
  )

  const submitBatchScores = useCallback(
    (roundId: string, playerId: string, batchScores: { hole: number; gross: number }[]) => {
      const now = new Date().toISOString()
      setScores(prev => {
        const updated = [...prev]
        for (const { hole, gross } of batchScores) {
          const scoreId = `s-${roundId}-${playerId}-${hole}`
          const idx = updated.findIndex(
            s => s.round_id === roundId && s.player_id === playerId && s.hole_number === hole,
          )
          const newScore: Score = {
            id: scoreId,
            round_id: roundId,
            player_id: playerId,
            hole_number: hole,
            gross_score: gross,
            updated_at: now,
          }
          if (idx >= 0) {
            updated[idx] = newScore
          } else {
            updated.push(newScore)
          }
        }
        return updated
      })
      // Supabase async — upsert each score
      for (const { hole, gross } of batchScores) {
        sbUpsert('app_scores', {
          id: `s-${roundId}-${playerId}-${hole}`,
          round_id: roundId,
          player_id: playerId,
          hole_number: hole,
          gross_score: gross,
          updated_at: now,
        })
      }
    },
    [setScores, sbUpsert],
  )

  // ---- Foursome state ----
  const [foursomes, setFoursomes] = useState<Foursome[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-foursomes') || '[]') } catch { return [] }
  })
  const [sideGameConfigs, setSideGameConfigs] = useState<SideGameConfig[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-sidegames') || '[]') } catch { return [] }
  })

  const createFoursome = useCallback((roundId: string, playerIds: [string, string, string, string]) => {
    const fs: Foursome = { id: `fs-${roundId}-${Date.now()}`, round_id: roundId, player_ids: playerIds }
    setFoursomes(prev => {
      const next = [...prev, fs]
      safeSetItem('ec-foursomes', JSON.stringify(next))
      return next
    })
    sbUpsert('foursomes', { id: fs.id, round_id: roundId, player_ids: playerIds, updated_at: new Date().toISOString() })
    return fs
  }, [sbUpsert])

  const deleteFoursome = useCallback((foursomeId: string) => {
    setFoursomes(prev => {
      const next = prev.filter(f => f.id !== foursomeId)
      safeSetItem('ec-foursomes', JSON.stringify(next))
      return next
    })
    setSideGameConfigs(prev => {
      const next = prev.filter(g => g.foursome_id !== foursomeId)
      safeSetItem('ec-sidegames', JSON.stringify(next))
      return next
    })
    sbDelete('foursomes', { id: foursomeId })
  }, [sbDelete])

  const addSideGame = useCallback((config: SideGameConfig) => {
    setSideGameConfigs(prev => {
      const filtered = prev.filter(g => !(g.foursome_id === config.foursome_id && g.type === config.type))
      const next = [...filtered, config]
      safeSetItem('ec-sidegames', JSON.stringify(next))
      return next
    })
  }, [])

  const removeSideGame = useCallback((foursomeId: string, gameType: string) => {
    setSideGameConfigs(prev => {
      const next = prev.filter(g => !(g.foursome_id === foursomeId && g.type === gameType))
      safeSetItem('ec-sidegames', JSON.stringify(next))
      return next
    })
  }, [])

  // ---- Team competition state ----
  const [teams, setTeamsState] = useState<Team[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-teams') || 'null') ?? DEMO_TEAMS } catch { return DEMO_TEAMS }
  })

  const setTeams = useCallback((t: Team[]) => {
    setTeamsState(t)
    safeSetItem('ec-teams', JSON.stringify(t))
    for (const team of t) {
      sbUpsert('teams', {
        id: team.id,
        tournament_id: tournament.id,
        name: team.name,
        captain_id: team.captain_id,
        player_ids: team.player_ids,
        updated_at: new Date().toISOString(),
      })
    }
  }, [sbUpsert, tournament.id])

  const [strokePlayMatchups, setStrokePlayMatchupsRaw] = useState<StrokePlayMatchup[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-stroke-matchups') || 'null') ?? DEMO_STROKE_PLAY_MATCHUPS } catch { return DEMO_STROKE_PLAY_MATCHUPS }
  })
  const [bestBallPairings, setBestBallPairingsRaw] = useState<BestBallPairing[]>(() => {
    try { return JSON.parse(localStorage.getItem('ec-bestball-pairings') || 'null') ?? DEMO_BEST_BALL_PAIRINGS } catch { return DEMO_BEST_BALL_PAIRINGS }
  })

  const updateStrokePlayMatchups = useCallback((matchups: StrokePlayMatchup[]) => {
    setStrokePlayMatchupsRaw(matchups)
    safeSetItem('ec-stroke-matchups', JSON.stringify(matchups))
    for (const m of matchups) {
      sbUpsert('stroke_play_matchups', {
        id: m.id,
        round_id: m.round_id,
        team_a_player_id: m.team_a_player_id,
        team_b_player_id: m.team_b_player_id,
        match_order: m.order,
        is_pressure_bet: m.is_pressure_bet,
        updated_at: new Date().toISOString(),
      })
    }
  }, [sbUpsert])

  const updateBestBallPairings = useCallback((pairings: BestBallPairing[]) => {
    setBestBallPairingsRaw(pairings)
    safeSetItem('ec-bestball-pairings', JSON.stringify(pairings))
    for (const p of pairings) {
      sbUpsert('best_ball_pairings', {
        id: p.id,
        round_id: p.round_id,
        team_a_player_ids: p.team_a_player_ids,
        team_b_player_ids: p.team_b_player_ids,
        pairing_order: p.order,
        updated_at: new Date().toISOString(),
      })
    }
  }, [sbUpsert])

  // ---- Admin settings ----
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    try { return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(localStorage.getItem('ec-admin-settings') || '{}') } } catch { return DEFAULT_ADMIN_SETTINGS }
  })

  const updateAdminSettings = useCallback((updates: Partial<AdminSettings>) => {
    setAdminSettings(prev => {
      const next = { ...prev, ...updates }
      safeSetItem('ec-admin-settings', JSON.stringify(next))
      sbUpsert('admin_settings', {
        id: 'singleton',
        settings_json: next,
        updated_at: new Date().toISOString(),
      })
      return next
    })
  }, [sbUpsert])

  // ---- Team standings (computed) ----
  const teamStandings = useMemo(() =>
    computeTeamStandings(teams, strokePlayMatchups, bestBallPairings, scores, holes, players, courses, rounds),
    [teams, strokePlayMatchups, bestBallPairings, scores, holes, players, courses, rounds],
  )

  // ---- Auth ----
  const login = useCallback((pin: string) => {
    if (pin === tournament.admin_pin) {
      setIsAdmin(true)
      safeSetItem('ec-admin', 'true')
      return true
    }
    return false
  }, [tournament.admin_pin])

  // ---- Leaderboard (computed) ----
  const leaderboard: LeaderboardEntry[] = players.map(player => {
    let totalGross = 0, totalNet = 0, totalPar = 0, holesPlayed = 0
    let r1Gross = 0, r1Net = 0, r1Par = 0, r1Holes = 0
    let r2Gross = 0, r2Net = 0, r2Par = 0, r2Holes = 0

    for (const round of rounds) {
      const course = courses.find(c => c.id === round.course_id)
      if (!course) continue
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
          r1Gross += score.gross_score; r1Net += net; r1Par += hole.par; r1Holes++
        } else {
          r2Gross += score.gross_score; r2Net += net; r2Par += hole.par; r2Holes++
        }
      }
    }

    return {
      player, totalGross, totalNet, totalNetVsPar: totalNet - totalPar, holesPlayed,
      r1Gross, r1Net, r1NetVsPar: r1Net - r1Par, r1Holes,
      r2Gross, r2Net, r2NetVsPar: r2Net - r2Par, r2Holes,
    }
  }).sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.player.name.localeCompare(b.player.name)
    if (a.holesPlayed === 0) return 1
    if (b.holesPlayed === 0) return -1
    return a.totalNetVsPar - b.totalNetVsPar
  })

  // =====================================================================
  // Supabase: initial fetch + realtime subscription
  // =====================================================================

  // Track whether initial fetch has run to avoid overwriting local state on re-render
  const initialFetchDone = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured || initialFetchDone.current) return
    initialFetchDone.current = true

    let channel: RealtimeChannel | null = null

    async function fetchInitial() {
      try {
        // Fetch scores
        const { data: remoteScores, error: scoresErr } = await supabase
          .from('app_scores')
          .select('*')
        if (!scoresErr && remoteScores && remoteScores.length > 0) {
          const mapped: Score[] = remoteScores.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            round_id: r.round_id as string,
            player_id: r.player_id as string,
            hole_number: r.hole_number as number,
            gross_score: r.gross_score as number,
            updated_at: r.updated_at as string,
          }))
          // Merge: remote wins on conflict (by id), keeping any local-only scores
          setScores(local => {
            const remoteById = new Map(mapped.map(s => [s.id, s]))
            const merged = local.map(s => remoteById.get(s.id) ?? s)
            // Add remote scores not in local
            for (const s of mapped) {
              if (!merged.find(m => m.id === s.id)) merged.push(s)
            }
            return merged
          })
        }

        // Fetch admin settings
        const { data: adminRows } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('id', 'singleton')
          .limit(1)
        if (adminRows && adminRows.length > 0) {
          const remote = adminRows[0].settings_json as Partial<AdminSettings>
          setAdminSettings(prev => {
            const merged = { ...prev, ...remote }
            safeSetItem('ec-admin-settings', JSON.stringify(merged))
            return merged
          })
        }

        // Fetch teams
        const { data: remoteTeams } = await supabase.from('teams').select('*')
        if (remoteTeams && remoteTeams.length > 0) {
          const mapped: Team[] = remoteTeams.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            captain_id: r.captain_id as string,
            player_ids: r.player_ids as string[],
          }))
          setTeamsState(mapped)
          safeSetItem('ec-teams', JSON.stringify(mapped))
        }

        // Fetch stroke play matchups
        const { data: remoteMatchups } = await supabase.from('stroke_play_matchups').select('*')
        if (remoteMatchups && remoteMatchups.length > 0) {
          const mapped: StrokePlayMatchup[] = remoteMatchups.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            round_id: r.round_id as string,
            team_a_player_id: r.team_a_player_id as string,
            team_b_player_id: r.team_b_player_id as string,
            order: r.match_order as number,
            is_pressure_bet: r.is_pressure_bet as boolean,
          }))
          setStrokePlayMatchupsRaw(mapped)
          safeSetItem('ec-stroke-matchups', JSON.stringify(mapped))
        }

        // Fetch best ball pairings
        const { data: remotePairings } = await supabase.from('best_ball_pairings').select('*')
        if (remotePairings && remotePairings.length > 0) {
          const mapped: BestBallPairing[] = remotePairings.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            round_id: r.round_id as string,
            team_a_player_ids: r.team_a_player_ids as [string, string],
            team_b_player_ids: r.team_b_player_ids as [string, string],
            order: r.pairing_order as number,
          }))
          setBestBallPairingsRaw(mapped)
          safeSetItem('ec-bestball-pairings', JSON.stringify(mapped))
        }

        // Fetch foursomes
        const { data: remoteFoursomes } = await supabase.from('foursomes').select('*')
        if (remoteFoursomes && remoteFoursomes.length > 0) {
          const mapped: Foursome[] = remoteFoursomes.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            round_id: r.round_id as string,
            player_ids: r.player_ids as [string, string, string, string],
          }))
          setFoursomes(mapped)
          safeSetItem('ec-foursomes', JSON.stringify(mapped))
        }

        setSyncStatus(syncQueueRef.current.length > 0 ? 'pending' : 'synced')
      } catch {
        // Supabase unreachable — fall back to localStorage (already loaded)
        setSyncStatus('offline')
      }
    }

    fetchInitial()

    // ---- Realtime subscription on app_scores ----
    channel = supabase
      .channel('app_scores_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_scores',
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const r = payload.new as Record<string, unknown>
          const incoming: Score = {
            id: r.id as string,
            round_id: r.round_id as string,
            player_id: r.player_id as string,
            hole_number: r.hole_number as number,
            gross_score: r.gross_score as number,
            updated_at: r.updated_at as string,
          }
          setScores(prev => {
            const idx = prev.findIndex(s => s.id === incoming.id)
            if (idx >= 0) {
              // Only update if remote is newer
              if (incoming.updated_at > prev[idx].updated_at) {
                const updated = [...prev]
                updated[idx] = incoming
                return updated
              }
              return prev
            }
            return [...prev, incoming]
          })
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as Record<string, unknown>
          if (old.id) {
            setScores(prev => prev.filter(s => s.id !== old.id))
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_settings',
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const r = payload.new as Record<string, unknown>
          const remote = r.settings_json as Partial<AdminSettings>
          setAdminSettings(prev => {
            const merged = { ...prev, ...remote }
            safeSetItem('ec-admin-settings', JSON.stringify(merged))
            return merged
          })
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teams',
      }, () => {
        // Refetch all teams on any change
        supabase.from('teams').select('*').then(({ data }) => {
          if (data && data.length > 0) {
            const mapped: Team[] = data.map((r: Record<string, unknown>) => ({
              id: r.id as string,
              name: r.name as string,
              captain_id: r.captain_id as string,
              player_ids: r.player_ids as string[],
            }))
            setTeamsState(mapped)
            safeSetItem('ec-teams', JSON.stringify(mapped))
          }
        })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'foursomes',
      }, () => {
        supabase.from('foursomes').select('*').then(({ data }) => {
          if (data) {
            const mapped: Foursome[] = data.map((r: Record<string, unknown>) => ({
              id: r.id as string,
              round_id: r.round_id as string,
              player_ids: r.player_ids as [string, string, string, string],
            }))
            setFoursomes(mapped)
            safeSetItem('ec-foursomes', JSON.stringify(mapped))
          }
        })
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setSyncStatus('offline')
        } else if (status === 'SUBSCRIBED') {
          // On reconnection, refetch scores to catch any missed events
          supabase.from('app_scores').select('*').then(({ data }) => {
            if (data && data.length > 0) {
              const mapped: Score[] = data.map((r: Record<string, unknown>) => ({
                id: r.id as string,
                round_id: r.round_id as string,
                player_id: r.player_id as string,
                hole_number: r.hole_number as number,
                gross_score: r.gross_score as number,
                updated_at: r.updated_at as string,
              }))
              setScores(local => {
                const remoteById = new Map(mapped.map(s => [s.id, s]))
                const merged = local.map(s => {
                  const remote = remoteById.get(s.id)
                  return remote && remote.updated_at > s.updated_at ? remote : s
                })
                for (const s of mapped) {
                  if (!merged.find(m => m.id === s.id)) merged.push(s)
                }
                return merged
              })
            }
          })
          setSyncStatus(syncQueueRef.current.length > 0 ? 'pending' : 'synced')
          flushQueue()
        }
      })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Expose submitScore for simulation scripts in dev/demo mode
  if (typeof window !== 'undefined') {
    (window as any).__ec_submitScore = submitScore
  }

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
      currentPlayerId, setCurrentPlayer, logout, isOnboarded,
      syncStatus,
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
