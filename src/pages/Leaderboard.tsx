import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, ChevronDown, ChevronUp, Zap, Bird, Users, User, DollarSign } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'
import { formatVsPar, getScoreColor, calculateCourseHandicap, getStrokesForHole } from '../lib/scoring'
import { StrokePlayCard, BestBallCard } from '../components/MatchupCard'
import Header from '../components/Header'
import type { TeamStandings, Player } from '../lib/types'

export default function Leaderboard() {
  const {
    leaderboard, champions, scores, players, rounds, courses, getHolesForCourse,
    teamStandings, adminSettings, isAdmin, currentPlayerId,
  } = useTournament()
  const [showGross, setShowGross] = useState(false)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [view, setView] = useState<'individual' | 'teams'>('individual')
  const navigate = useNavigate()

  const latestChampion = champions.filter(c => c.player_name !== 'TBD').sort((a, b) => b.year - a.year)[0]

  // Compute tied positions: group by totalNetVsPar, assign "T{n}" when >1 player shares same score
  const positionMap = useMemo(() => {
    const map = new Map<string, string>()
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i]
      if (entry.holesPlayed === 0) { map.set(entry.player.id, '-'); continue }
      // Find all players with same net vs par
      const sameScore = leaderboard.filter(e => e.holesPlayed > 0 && e.totalNetVsPar === entry.totalNetVsPar)
      // Position = first index among played entries with this score + 1
      const rank = leaderboard.findIndex(e => e.holesPlayed > 0 && e.totalNetVsPar === entry.totalNetVsPar) + 1
      map.set(entry.player.id, sameScore.length > 1 ? `T${rank}` : `${rank}`)
    }
    return map
  }, [leaderboard])

  // Count birdies and eagles across all rounds
  const stats = useMemo(() => {
    let r1Birdies = 0, r1Eagles = 0, r2Birdies = 0, r2Eagles = 0

    for (const round of rounds) {
      const course = courses.find(c => c.id === round.course_id)
      if (!course) continue
      const courseHoles = getHolesForCourse(round.course_id)
      const roundScores = scores.filter(s => s.round_id === round.id)

      for (const score of roundScores) {
        const hole = courseHoles.find(h => h.hole_number === score.hole_number)
        if (!hole) continue
        const player = players.find(p => p.id === score.player_id)
        if (!player) continue
        const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
        const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
        const net = score.gross_score - strokes
        const diff = net - hole.par

        if (round.round_number === 1) {
          if (diff === -1) r1Birdies++
          if (diff <= -2) r1Eagles++
        } else {
          if (diff === -1) r2Birdies++
          if (diff <= -2) r2Eagles++
        }
      }
    }

    return { r1Birdies, r1Eagles, r2Birdies, r2Eagles, totalBirdies: r1Birdies + r2Birdies, totalEagles: r1Eagles + r2Eagles }
  }, [scores, rounds, courses, players, getHolesForCourse])

  // Generate news ticker items — active round only
  const tickerItems = useMemo(() => {
    const items: string[] = []
    const activeRoundId = adminSettings.r1Locked ? 'r2' : 'r1'
    const activeRound = rounds.find(r => r.id === activeRoundId)
    if (!activeRound) return ["⛳ Welcome to the Egerer Classic '26 — an event like no other..."]

    const course = courses.find(c => c.id === activeRound.course_id)
    if (!course) return ["Welcome to the Egerer Classic '26"]
    const courseHoles = getHolesForCourse(activeRound.course_id)
    const roundScores = scores.filter(s => s.round_id === activeRoundId)
    const rNum = activeRound.round_number

    // Birdie/eagle/blowup alerts (active round only)
    for (const score of roundScores) {
      const hole = courseHoles.find(h => h.hole_number === score.hole_number)
      if (!hole) continue
      const player = players.find(p => p.id === score.player_id)
      if (!player) continue
      const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
      const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
      const net = score.gross_score - strokes
      const diff = net - hole.par
      const lastName = player.name.split(' ').pop() || player.name

      if (diff <= -2) {
        items.push(`🦅 EAGLE! ${lastName} nets ${net} on R${rNum} #${score.hole_number} (par ${hole.par})`)
      } else if (diff === -1) {
        items.push(`🐦 Birdie! ${lastName} nets ${net} on R${rNum} #${score.hole_number}`)
      }
    }

    // Matchup lead updates (active round's competition)
    if (activeRoundId === 'r1' && teamStandings) {
      for (const r of teamStandings.strokePlayResults) {
        if (r.playerAThru === 0 && r.playerBThru === 0) continue
        const aName = players.find(p => p.id === r.matchup.team_a_player_id)?.name.split(' ').pop() ?? '?'
        const bName = players.find(p => p.id === r.matchup.team_b_player_id)?.name.split(' ').pop() ?? '?'
        if (r.result === 'team_a_wins') items.push(`✅ ${aName} defeats ${bName} by ${Math.abs((r.playerANetTotal ?? 0) - (r.playerBNetTotal ?? 0))}`)
        else if (r.result === 'team_b_wins') items.push(`✅ ${bName} defeats ${aName} by ${Math.abs((r.playerANetTotal ?? 0) - (r.playerBNetTotal ?? 0))}`)
      }
    } else if (activeRoundId === 'r2' && teamStandings) {
      for (const r of teamStandings.bestBallResults) {
        if (r.teamAThru === 0 && r.teamBThru === 0) continue
        const aNames = r.pairing.team_a_player_ids.map(id => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?').join(' & ')
        const bNames = r.pairing.team_b_player_ids.map(id => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?').join(' & ')
        if (r.result === 'team_a_wins') items.push(`✅ ${aNames} win best ball by ${Math.abs((r.teamABestBallTotal ?? 0) - (r.teamBBestBallTotal ?? 0))}`)
        else if (r.result === 'team_b_wins') items.push(`✅ ${bNames} win best ball by ${Math.abs((r.teamABestBallTotal ?? 0) - (r.teamBBestBallTotal ?? 0))}`)
      }
    }

    // Overall tournament leader
    if (leaderboard.length > 0 && leaderboard[0].holesPlayed > 0) {
      const leader = leaderboard[0]
      const lastName = leader.player.name.split(' ').pop()
      items.unshift(`🏆 ${lastName} leads at ${formatVsPar(leader.totalNetVsPar)} through ${leader.holesPlayed} holes`)
    }

    // Team competition standing
    if (teamStandings) {
      const { teamA, teamB } = teamStandings
      if (teamA.totalPoints > 0 || teamB.totalPoints > 0) {
        if (teamA.totalPoints > teamB.totalPoints) {
          items.push(`⚔️ ${teamA.team.name} leads ${teamA.totalPoints}-${teamB.totalPoints}`)
        } else if (teamB.totalPoints > teamA.totalPoints) {
          items.push(`⚔️ ${teamB.team.name} leads ${teamB.totalPoints}-${teamA.totalPoints}`)
        } else {
          items.push(`⚔️ Teams tied ${teamA.totalPoints}-${teamB.totalPoints}`)
        }
      }
    }

    if (items.length === 0) {
      items.push("⛳ Welcome to the Egerer Classic '26 — an event like no other...")
    }

    return items
  }, [scores, rounds, courses, players, leaderboard, teamStandings, adminSettings.r1Locked, getHolesForCourse])

  // Prepend admin announcement if set
  const allTickerItems = adminSettings.announcement
    ? [`📢 ${adminSettings.announcement}`, ...tickerItems]
    : tickerItems
  const tickerText = allTickerItems.join('     ●     ')
  // ~6px per character at 11px font; scroll at ~50px/s for readable pace
  const tickerDuration = Math.max(15, (tickerText.length * 6) / 50)

  return (
    <div>
      <Header title="Egerer Classic" subtitle="May 29–30, 2026 · Scottsdale, AZ" />

      {/* News Ticker */}
      <div className="bg-forest text-cream overflow-hidden whitespace-nowrap border-b border-forest-light">
        <div
          className="inline-block animate-ticker py-1.5 text-[11px]"
          style={{ animationDuration: `${tickerDuration}s` }}
        >
          <span>{tickerText}     ●     {tickerText}</span>
        </div>
      </div>

      {/* View toggle: Individual / Teams */}
      <div className="flex gap-2 px-4 pt-3 pb-2">
        <button
          onClick={() => setView('individual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            view === 'individual' ? 'bg-forest text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <User size={12} /> Individual
        </button>
        {(adminSettings.showTeams || isAdmin) && (
          <button
            onClick={() => setView('teams')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              view === 'teams' ? 'bg-forest text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Users size={12} /> Teams
          </button>
        )}
      </div>

      {view === 'individual' ? (
        <>
          {/* Birdie / Eagle counters */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Bird size={14} className="text-birdie" />
              <span className="text-[11px] font-semibold text-gray-700">{stats.totalBirdies}</span>
              <span className="text-[11px] text-gray-400">birdies</span>
              {stats.r1Birdies > 0 && <span className="text-[11px] text-gray-300">(R1:{stats.r1Birdies} R2:{stats.r2Birdies})</span>}
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-eagle" />
              <span className="text-[11px] font-semibold text-gray-700">{stats.totalEagles}</span>
              <span className="text-[11px] text-gray-400">eagles</span>
              {stats.r1Eagles > 0 && <span className="text-[11px] text-gray-300">(R1:{stats.r1Eagles} R2:{stats.r2Eagles})</span>}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {latestChampion && (
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Trophy size={12} className="text-gold" />
                  <span>{latestChampion.player_name.split(' ')[1] ?? latestChampion.player_name} '{String(latestChampion.year).slice(2)}</span>
                </div>
              )}
              <button
                onClick={() => setShowGross(!showGross)}
                className="text-[11px] font-medium px-2 py-1.5 rounded-full bg-gray-100 text-gray-600"
              >
                {showGross ? 'Gross' : 'Net'}
              </button>
            </div>
          </div>

          {/* Payout info */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <DollarSign size={12} className="text-gold" />
              <span className="font-semibold">Individual Pool $1,800</span>
              <span className="text-gray-400">· 1st $1,100 · 2nd $450 · 3rd $250</span>
            </div>
          </div>

          {/* My Position sticky bar */}
          {(() => {
            const myEntry = leaderboard.find(e => e.player.id === currentPlayerId)
            if (!myEntry || myEntry.holesPlayed === 0) return null
            const myPos = positionMap.get(myEntry.player.id) ?? '-'
            const myTotal = showGross ? myEntry.totalGross : formatVsPar(myEntry.totalNetVsPar)
            const myThru = myEntry.holesPlayed >= 36 ? 'F' : myEntry.holesPlayed
            return (
              <div className="sticky top-0 z-10 bg-forest text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-sm">
                <span>You: {myPos} · {myTotal} · Thru {myThru}</span>
              </div>
            )
          })()}

          {/* Leaderboard table */}
          <div className="bg-white">
            <div className="grid grid-cols-[1.8rem_1fr_2.5rem_3rem_2.5rem_2.5rem] px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <span></span>
              <span>Player</span>
              <span className="text-center">Thru</span>
              <span className="text-center">Total</span>
              <span className="text-center">R1</span>
              <span className="text-center">R2</span>
            </div>

            {leaderboard.map((entry, idx) => {
              const isExpanded = expandedPlayer === entry.player.id
              const pos = positionMap.get(entry.player.id) ?? (idx + 1)
              const total = showGross
                ? (entry.holesPlayed > 0 ? entry.totalGross : '-')
                : (entry.holesPlayed > 0 ? formatVsPar(entry.totalNetVsPar) : '-')
              const r1 = showGross
                ? (entry.r1Holes > 0 ? entry.r1Gross : '-')
                : (entry.r1Holes > 0 ? formatVsPar(entry.r1NetVsPar) : '-')
              const r2 = showGross
                ? (entry.r2Holes > 0 ? entry.r2Gross : '-')
                : (entry.r2Holes > 0 ? formatVsPar(entry.r2NetVsPar) : '-')

              const totalColor = entry.holesPlayed > 0
                ? (showGross ? 'text-par' : getScoreColor(entry.totalNetVsPar))
                : 'text-gray-300'

              return (
                <div key={entry.player.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <button
                    className="w-full grid grid-cols-[1.8rem_1fr_2.5rem_3rem_2.5rem_2.5rem] px-3 py-3 items-center text-left"
                    onClick={() => setExpandedPlayer(isExpanded ? null : entry.player.id)}
                  >
                    <span className="text-xs font-bold text-gray-400">{pos}</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">
                        {entry.player.name.split(' ').pop() ?? entry.player.name}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">({entry.player.handicap_index})</span>
                      {isExpanded ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                    </div>
                    <span className="text-xs text-center text-gray-500">
                      {entry.holesPlayed > 0 ? (entry.holesPlayed >= 36 ? 'F' : entry.holesPlayed) : '-'}
                    </span>
                    <span className={`text-sm font-bold text-center ${totalColor}`}>{total}</span>
                    <span className={`text-xs text-center ${entry.r1Holes > 0 ? (showGross ? 'text-par' : getScoreColor(entry.r1NetVsPar)) : 'text-gray-300'}`}>{r1}</span>
                    <span className={`text-xs text-center ${entry.r2Holes > 0 ? (showGross ? 'text-par' : getScoreColor(entry.r2NetVsPar)) : 'text-gray-300'}`}>{r2}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>HCP Index: {entry.player.handicap_index}</span>
                        <button
                          className="text-forest font-medium underline"
                          onClick={() => navigate(`/player/${entry.player.id}`)}
                        >
                          Full Scorecard →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Teams View */
        <TeamLeaderboardView teamStandings={teamStandings} players={players} adminSettings={adminSettings} scores={scores} rounds={rounds} courses={courses} getHolesForCourse={getHolesForCourse} />
      )}
    </div>
  )
}

// --- Teams sub-view ---

import type { AdminSettings } from '../lib/TournamentContext'

import type { Score, Round, Course, Hole } from '../lib/types'

function TeamLeaderboardView({ teamStandings, players, adminSettings, scores, rounds, courses, getHolesForCourse }: {
  teamStandings: TeamStandings | null; players: Player[]; adminSettings: AdminSettings
  scores: Score[]; rounds: Round[]; courses: Course[]; getHolesForCourse: (courseId: string) => Hole[]
}) {
  if (!teamStandings) {
    return (
      <div className="px-4 py-8 text-center text-gray-400 text-sm">
        Teams have not been set up yet. Check back after the draft!
      </div>
    )
  }

  const { teamA, teamB, strokePlayResults, bestBallResults } = teamStandings
  const aLeading = teamA.totalPoints > teamB.totalPoints
  const bLeading = teamB.totalPoints > teamA.totalPoints

  const formatPts = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(1)

  // Points available — computed from actual matchups/pairings (counts only filled ones)
  const day1MaxPts = strokePlayResults.reduce((s, r) =>
    (r.matchup.team_a_player_id && r.matchup.team_b_player_id)
      ? s + (r.matchup.is_pressure_bet ? 2 : 1) : s, 0)
  const day2MaxPts = bestBallResults.reduce((s, r) =>
    (r.pairing.team_a_player_ids.filter(Boolean).length === 2 &&
     r.pairing.team_b_player_ids.filter(Boolean).length === 2)
      ? s + (r.pairing.is_pressure_bet ? 4 : 2) : s, 0)
  const totalMaxPts = day1MaxPts + day2MaxPts

  // Compute round-specific data for scorecards
  const r1 = rounds.find(r => r.round_number === 1)
  const r2 = rounds.find(r => r.round_number === 2)
  const r1Course = r1 ? courses.find(c => c.id === r1.course_id) : null
  const r2Course = r2 ? courses.find(c => c.id === r2.course_id) : null
  const r1Holes = r1 ? getHolesForCourse(r1.course_id) : []
  const r2Holes = r2 ? getHolesForCourse(r2.course_id) : []
  const r1Scores = scores.filter(s => s.round_id === 'r1')
  const r2Scores = scores.filter(s => s.round_id === 'r2')

  return (
    <div className="pb-4">
      {/* Score Banner */}
      <div className="mx-4 mt-2 bg-forest rounded-2xl p-5 text-center text-white">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-[11px] font-semibold text-cream/70 uppercase tracking-wider">{teamA.team.name}</div>
            <div className={`text-4xl font-bold mt-1 ${aLeading ? 'text-gold' : 'text-white'}`}>
              {formatPts(teamA.totalPoints)}
            </div>
          </div>
          <div className="text-cream/40 text-lg font-light">vs</div>
          <div className="text-center">
            <div className="text-[11px] font-semibold text-cream/70 uppercase tracking-wider">{teamB.team.name}</div>
            <div className={`text-4xl font-bold mt-1 ${bLeading ? 'text-gold' : 'text-white'}`}>
              {formatPts(teamB.totalPoints)}
            </div>
          </div>
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="mx-4 mt-3 bg-white rounded-xl p-3 shadow-sm">
        <div className="grid grid-cols-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          <span>{teamA.team.name.split(' ').pop()}</span>
          <span></span>
          <span>{teamB.team.name.split(' ').pop()}</span>
        </div>
        <div className="grid grid-cols-3 text-center text-sm items-center border-t border-gray-100 py-1.5">
          <span className="font-bold text-gray-900">{formatPts(teamA.strokePlayPoints)}</span>
          <span className="text-[11px] text-gray-400">Day 1 · Stroke Play</span>
          <span className="font-bold text-gray-900">{formatPts(teamB.strokePlayPoints)}</span>
        </div>
        <div className="grid grid-cols-3 text-center text-sm items-center border-t border-gray-100 py-1.5">
          <span className="font-bold text-gray-900">{formatPts(teamA.bestBallPoints)}</span>
          <span className="text-[11px] text-gray-400">Day 2 · Best Ball</span>
          <span className="font-bold text-gray-900">{formatPts(teamB.bestBallPoints)}</span>
        </div>
        <div className="grid grid-cols-3 text-center text-sm items-center border-t-2 border-forest/20 py-1.5">
          <span className={`font-bold text-lg ${aLeading ? 'text-forest' : 'text-gray-900'}`}>{formatPts(teamA.totalPoints)}</span>
          <span className="text-[11px] font-bold text-gray-500">TOTAL ({totalMaxPts} pts max)</span>
          <span className={`font-bold text-lg ${bLeading ? 'text-forest' : 'text-gray-900'}`}>{formatPts(teamB.totalPoints)}</span>
        </div>
      </div>

      {/* When R1 is locked, show Day 2 first (active round on top) */}
      {(adminSettings.showDay2Matchups || adminSettings.r1Locked) && adminSettings.r1Locked && (
        <div className="px-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Day 2 — Best Ball (2v2) · {day2MaxPts} pts
          </h3>
          <div className="space-y-1.5">
            {bestBallResults.map(r => (
              <BestBallCard
                key={r.pairing.id}
                result={r}
                players={players}
                teamAName={teamA.team.name}
                teamBName={teamB.team.name}
                scores={r2Scores}
                holes={r2Holes}
                slope={r2Course?.slope}
              />
            ))}
          </div>
        </div>
      )}

      {/* Day 1: Stroke Play 1v1 */}
      {adminSettings.showDay1Matchups && (
        <div className="px-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Day 1 — Stroke Play (1v1) · {day1MaxPts} pts
          </h3>
          <div className="space-y-1.5">
            {strokePlayResults.map(r => (
              <StrokePlayCard
                key={r.matchup.id}
                result={r}
                players={players}
                teamAName={teamA.team.name}
                teamBName={teamB.team.name}
                scores={r1Scores}
                holes={r1Holes}
                slope={r1Course?.slope}
              />
            ))}
          </div>
        </div>
      )}

      {/* Day 2: show below Day 1 when R1 is NOT yet locked */}
      {(adminSettings.showDay2Matchups) && !adminSettings.r1Locked && (
        <div className="px-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Day 2 — Best Ball (2v2) · {day2MaxPts} pts
          </h3>
          <div className="space-y-1.5">
            {bestBallResults.map(r => (
              <BestBallCard
                key={r.pairing.id}
                result={r}
                players={players}
                teamAName={teamA.team.name}
                teamBName={teamB.team.name}
                scores={r2Scores}
                holes={r2Holes}
                slope={r2Course?.slope}
              />
            ))}
          </div>
        </div>
      )}

      {/* Team Rosters */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {[teamA, teamB].map(t => {
          const captain = players.find(p => p.id === t.team.captain_id)
          const roster = t.team.player_ids
            .map(id => players.find(p => p.id === id))
            .filter((p): p is Player => !!p)
          return (
            <div key={t.team.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.team.name}</div>
              <div className="space-y-1">
                {roster.map(p => (
                  <div key={p.id} className="text-xs text-gray-700 flex items-center gap-1">
                    {p.id === captain?.id && <span className="text-gold text-[11px] font-bold">C</span>}
                    <span className={p.id === captain?.id ? 'font-semibold' : ''}>
                      {p.name.split(' ').pop()}
                    </span>
                    <span className="text-[11px] text-gray-400">({p.handicap_index})</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
