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
    teamStandings, adminSettings, isAdmin,
  } = useTournament()
  const [showGross, setShowGross] = useState(false)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [view, setView] = useState<'individual' | 'teams'>('individual')
  const navigate = useNavigate()

  const latestChampion = champions.filter(c => c.player_name !== 'TBD').sort((a, b) => b.year - a.year)[0]

  // Count birdies and eagles across all rounds
  const stats = useMemo(() => {
    let r1Birdies = 0, r1Eagles = 0, r2Birdies = 0, r2Eagles = 0

    for (const round of rounds) {
      const course = courses.find(c => c.id === round.course_id)!
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

  // Generate news ticker items from recent scores
  const tickerItems = useMemo(() => {
    const items: string[] = []

    for (const round of rounds) {
      const course = courses.find(c => c.id === round.course_id)!
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
        const lastName = player.name.split(' ')[1] || player.name
        const rNum = round.round_number

        if (diff <= -2) {
          items.push(`🦅 EAGLE! ${lastName} nets ${net} on R${rNum} Hole ${score.hole_number} (par ${hole.par})`)
        } else if (diff === -1) {
          items.push(`🐦 Birdie! ${lastName} nets ${net} on R${rNum} #${score.hole_number}`)
        } else if (diff >= 3) {
          items.push(`💥 ${lastName} takes a net ${net} on R${rNum} #${score.hole_number} (par ${hole.par})`)
        }
      }
    }

    if (leaderboard.length > 0 && leaderboard[0].holesPlayed > 0) {
      const leader = leaderboard[0]
      items.unshift(`🏆 ${leader.player.name.split(' ')[1]} leads at ${formatVsPar(leader.totalNetVsPar)} through ${leader.holesPlayed} holes`)
    }

    if (items.length === 0) {
      items.push("⛳ Welcome to the Egerer Classic '26 — an event like no other...")
    }

    return items
  }, [scores, rounds, courses, players, leaderboard, getHolesForCourse])

  // Prepend admin announcement if set
  const allTickerItems = adminSettings.announcement
    ? [`📢 ${adminSettings.announcement}`, ...tickerItems]
    : tickerItems
  const tickerText = allTickerItems.join('     ●     ')

  return (
    <div>
      <Header title="Egerer Classic" subtitle="May 29–30, 2026 · Scottsdale, AZ" />

      {/* News Ticker */}
      <div className="bg-forest text-cream overflow-hidden whitespace-nowrap border-b border-forest-light">
        <div className="inline-block animate-ticker py-1.5 text-[11px]">
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
              <span className="text-[9px] text-gray-400">birdies</span>
              {stats.r1Birdies > 0 && <span className="text-[9px] text-gray-300">(R1:{stats.r1Birdies} R2:{stats.r2Birdies})</span>}
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-eagle" />
              <span className="text-[11px] font-semibold text-gray-700">{stats.totalEagles}</span>
              <span className="text-[9px] text-gray-400">eagles</span>
              {stats.r1Eagles > 0 && <span className="text-[9px] text-gray-300">(R1:{stats.r1Eagles} R2:{stats.r2Eagles})</span>}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Trophy size={12} className="text-gold" />
                <span>{latestChampion?.player_name?.split(' ')[1]} '{String(latestChampion?.year).slice(2)}</span>
              </div>
              <button
                onClick={() => setShowGross(!showGross)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
              >
                {showGross ? 'Gross' : 'Net'}
              </button>
            </div>
          </div>

          {/* Payout info */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <DollarSign size={12} className="text-gold" />
              <span className="font-semibold">Individual Pool $1,800</span>
              <span className="text-gray-400">· 1st $1,080 · 2nd $450 · 3rd $270</span>
            </div>
          </div>

          {/* Leaderboard table */}
          <div className="bg-white">
            <div className="grid grid-cols-[1.8rem_1fr_2.5rem_3rem_2.5rem_2.5rem] px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <span></span>
              <span>Player</span>
              <span className="text-center">Thru</span>
              <span className="text-center">Total</span>
              <span className="text-center">R1</span>
              <span className="text-center">R2</span>
            </div>

            {leaderboard.map((entry, idx) => {
              const isExpanded = expandedPlayer === entry.player.id
              const pos = entry.holesPlayed === 0 ? '-' : idx + 1
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
                        {entry.player.name.split(' ')[1] || entry.player.name}
                      </span>
                      <span className="text-[9px] text-gray-400 shrink-0">({entry.player.handicap_index})</span>
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
        <TeamLeaderboardView teamStandings={teamStandings} players={players} adminSettings={adminSettings} />
      )}
    </div>
  )
}

// --- Teams sub-view ---

import type { AdminSettings } from '../lib/TournamentContext'

function TeamLeaderboardView({ teamStandings, players, adminSettings }: { teamStandings: TeamStandings | null; players: Player[]; adminSettings: AdminSettings }) {
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
        <div className="grid grid-cols-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          <span>{teamA.team.name.split(' ').pop()}</span>
          <span></span>
          <span>{teamB.team.name.split(' ').pop()}</span>
        </div>
        <div className="grid grid-cols-3 text-center text-sm items-center border-t border-gray-100 py-1.5">
          <span className="font-bold text-gray-900">{formatPts(teamA.strokePlayPoints)}</span>
          <span className="text-[10px] text-gray-400">Day 1 · Stroke Play</span>
          <span className="font-bold text-gray-900">{formatPts(teamB.strokePlayPoints)}</span>
        </div>
        <div className="grid grid-cols-3 text-center text-sm items-center border-t border-gray-100 py-1.5">
          <span className="font-bold text-gray-900">{formatPts(teamA.bestBallPoints)}</span>
          <span className="text-[10px] text-gray-400">Day 2 · Best Ball</span>
          <span className="font-bold text-gray-900">{formatPts(teamB.bestBallPoints)}</span>
        </div>
        <div className="grid grid-cols-3 text-center text-sm items-center border-t-2 border-forest/20 py-1.5">
          <span className={`font-bold text-lg ${aLeading ? 'text-forest' : 'text-gray-900'}`}>{formatPts(teamA.totalPoints)}</span>
          <span className="text-[10px] font-bold text-gray-500">TOTAL (18 pts max)</span>
          <span className={`font-bold text-lg ${bLeading ? 'text-forest' : 'text-gray-900'}`}>{formatPts(teamB.totalPoints)}</span>
        </div>
      </div>

      {/* Day 1: Stroke Play 1v1 */}
      {adminSettings.showDay1Matchups && (
        <div className="px-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Day 1 — Stroke Play (1v1) · 10 pts
          </h3>
          <div className="space-y-1.5">
            {strokePlayResults.map(r => (
              <StrokePlayCard
                key={r.matchup.id}
                result={r}
                players={players}
                teamAName={teamA.team.name}
                teamBName={teamB.team.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Day 2: Best Ball 2v2 */}
      {adminSettings.showDay2Matchups && (
        <div className="px-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Day 2 — Best Ball (2v2) · 8 pts
          </h3>
          <div className="space-y-1.5">
            {bestBallResults.map(r => (
              <BestBallCard
                key={r.pairing.id}
                result={r}
                players={players}
                teamAName={teamA.team.name}
                teamBName={teamB.team.name}
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
            .filter(Boolean)
          return (
            <div key={t.team.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t.team.name}</div>
              <div className="space-y-1">
                {roster.map(p => (
                  <div key={p!.id} className="text-xs text-gray-700 flex items-center gap-1">
                    {p!.id === captain?.id && <span className="text-gold text-[9px] font-bold">C</span>}
                    <span className={p!.id === captain?.id ? 'font-semibold' : ''}>
                      {p!.name.split(' ').pop()}
                    </span>
                    <span className="text-[9px] text-gray-400">({p!.handicap_index})</span>
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
