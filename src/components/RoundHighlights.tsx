import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'
import { calculateCourseHandicap, getStrokesForHole } from '../lib/scoring'
import type { Score, Hole, Player, Course, Round } from '../lib/types'

interface RoundHighlightData {
  round: Round
  course: Course
  lowGross: { name: string; score: number } | null
  lowNet: { name: string; score: number; vsPar: number } | null
  mostBirdies: { name: string; count: number } | null
  eaglesAndAces: { name: string; hole: number; netVsPar: number }[]
  bestHole: { holeNum: number; par: number; birdieCount: number } | null
  closestMatch: { label: string; margin: number } | null
  biggestBlowout: { label: string; margin: number } | null
  teamMomentum: { teamName: string; pointsWon: number } | null
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/** Join names for tied highlights — "Downing & Egerer" / "A, B & C". */
function joinNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

function computeRoundHighlights(
  round: Round,
  course: Course,
  holes: Hole[],
  players: Player[],
  scores: Score[],
  teamStandings: ReturnType<typeof useTournament>['teamStandings'],
  teams: ReturnType<typeof useTournament>['teams'],
): RoundHighlightData | null {
  const courseHoles = holes.filter(h => h.course_id === course.id).sort((a, b) => a.hole_number - b.hole_number)
  const roundScores = scores.filter(s => s.round_id === round.id)

  // Only show if at least one player has scores for this round
  if (roundScores.length === 0) return null

  // Per-player aggregates
  const playerStats: {
    player: Player
    grossTotal: number
    netTotal: number
    netVsPar: number
    holesPlayed: number
    birdieCount: number
    holeDetails: { holeNum: number; netVsPar: number }[]
  }[] = []

  for (const player of players) {
    const pScores = roundScores.filter(s => s.player_id === player.id)
    if (pScores.length === 0) continue

    const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
    let grossTotal = 0
    let netTotal = 0
    let parTotal = 0
    let birdieCount = 0
    const holeDetails: { holeNum: number; netVsPar: number }[] = []

    for (const s of pScores) {
      const hole = courseHoles.find(h => h.hole_number === s.hole_number)
      if (!hole) continue
      const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
      const net = s.gross_score - strokes
      const netVsP = net - hole.par

      grossTotal += s.gross_score
      netTotal += net
      parTotal += hole.par

      if (netVsP <= -1) birdieCount++
      holeDetails.push({ holeNum: s.hole_number, netVsPar: netVsP })
    }

    playerStats.push({
      player,
      grossTotal,
      netTotal,
      netVsPar: netTotal - parTotal,
      holesPlayed: pScores.length,
      birdieCount,
      holeDetails,
    })
  }

  // Only consider players with a full round (18 holes) for low round
  const fullRoundPlayers = playerStats.filter(p => p.holesPlayed === 18)

  // Low Gross — include every player tied at the lowest gross total.
  let lowGross: RoundHighlightData['lowGross'] = null
  if (fullRoundPlayers.length > 0) {
    const minGross = Math.min(...fullRoundPlayers.map(p => p.grossTotal))
    const tied = fullRoundPlayers.filter(p => p.grossTotal === minGross)
    lowGross = { name: joinNames(tied.map(t => getLastName(t.player.name))), score: minGross }
  }

  // Low Net — same: every tied player shown.
  let lowNet: RoundHighlightData['lowNet'] = null
  if (fullRoundPlayers.length > 0) {
    const minNet = Math.min(...fullRoundPlayers.map(p => p.netTotal))
    const tied = fullRoundPlayers.filter(p => p.netTotal === minNet)
    // vsPar is identical for tied nets on the same round, so taking the first is fine.
    lowNet = { name: joinNames(tied.map(t => getLastName(t.player.name))), score: minNet, vsPar: tied[0].netVsPar }
  }

  // Most Birdies (any player with scores, not just full round) — also tied-safe.
  let mostBirdies: RoundHighlightData['mostBirdies'] = null
  const withBirdies = playerStats.filter(p => p.birdieCount > 0)
  if (withBirdies.length > 0) {
    const maxBirdies = Math.max(...withBirdies.map(p => p.birdieCount))
    const tied = withBirdies.filter(p => p.birdieCount === maxBirdies)
    mostBirdies = { name: joinNames(tied.map(t => getLastName(t.player.name))), count: maxBirdies }
  }

  // Eagle/Ace Watch (net eagles = -2 or better vs par)
  const eaglesAndAces: RoundHighlightData['eaglesAndAces'] = []
  for (const ps of playerStats) {
    for (const hd of ps.holeDetails) {
      if (hd.netVsPar <= -2) {
        eaglesAndAces.push({
          name: getLastName(ps.player.name),
          hole: hd.holeNum,
          netVsPar: hd.netVsPar,
        })
      }
    }
  }

  // Best Hole — hole with most net birdies/eagles across all players
  let bestHole: RoundHighlightData['bestHole'] = null
  const holeBirdieCounts: Record<number, number> = {}
  for (const ps of playerStats) {
    for (const hd of ps.holeDetails) {
      if (hd.netVsPar <= -1) {
        holeBirdieCounts[hd.holeNum] = (holeBirdieCounts[hd.holeNum] || 0) + 1
      }
    }
  }
  const holeEntries = Object.entries(holeBirdieCounts)
  if (holeEntries.length > 0) {
    const [bestHoleNum, bestCount] = holeEntries.reduce((a, b) =>
      Number(b[1]) > Number(a[1]) ? b : a,
    )
    const holeData = courseHoles.find(h => h.hole_number === Number(bestHoleNum))
    if (holeData) {
      bestHole = { holeNum: Number(bestHoleNum), par: holeData.par, birdieCount: Number(bestCount) }
    }
  }

  // Matchup analysis
  let closestMatch: RoundHighlightData['closestMatch'] = null
  let biggestBlowout: RoundHighlightData['biggestBlowout'] = null
  let teamMomentum: RoundHighlightData['teamMomentum'] = null

  if (teamStandings) {
    if (round.round_number === 1) {
      // R1: stroke play 1v1 matchups
      const completedMatchups = teamStandings.strokePlayResults.filter(
        r => r.result !== 'in_progress' && r.playerANetTotal !== null && r.playerBNetTotal !== null,
      )

      if (completedMatchups.length > 0) {
        const margins = completedMatchups.map(r => {
          const pA = players.find(p => p.id === r.matchup.team_a_player_id)
          const pB = players.find(p => p.id === r.matchup.team_b_player_id)
          const nameA = pA ? getLastName(pA.name) : '?'
          const nameB = pB ? getLastName(pB.name) : '?'
          const margin = Math.abs((r.playerANetTotal ?? 0) - (r.playerBNetTotal ?? 0))
          return { label: `${nameA} vs ${nameB}`, margin }
        })

        const sorted = [...margins].sort((a, b) => a.margin - b.margin)
        closestMatch = sorted[0]
        if (sorted.length > 1) {
          biggestBlowout = sorted[sorted.length - 1]
        } else if (sorted.length === 1 && sorted[0].margin > 0) {
          biggestBlowout = sorted[0]
        }
      }

      // Team momentum: who got more stroke play points
      const r1PointsA = teamStandings.strokePlayResults.reduce((s, r) => s + r.points.teamA, 0)
      const r1PointsB = teamStandings.strokePlayResults.reduce((s, r) => s + r.points.teamB, 0)
      if (r1PointsA !== r1PointsB && teams.length >= 2) {
        const winningTeam = r1PointsA > r1PointsB ? teams.find(t => t.id === 'team-a') : teams.find(t => t.id === 'team-b')
        const pts = Math.max(r1PointsA, r1PointsB)
        if (winningTeam) {
          teamMomentum = { teamName: winningTeam.name, pointsWon: pts }
        }
      }
    } else if (round.round_number === 2) {
      // R2: best ball 2v2 matchups
      const completedPairings = teamStandings.bestBallResults.filter(
        r => r.result !== 'in_progress' && r.teamABestBallTotal !== null && r.teamBBestBallTotal !== null,
      )

      if (completedPairings.length > 0) {
        const margins = completedPairings.map(r => {
          const aNames = r.pairing.team_a_player_ids.map(id => {
            const p = players.find(pp => pp.id === id)
            return p ? getLastName(p.name) : '?'
          }).join('/')
          const bNames = r.pairing.team_b_player_ids.map(id => {
            const p = players.find(pp => pp.id === id)
            return p ? getLastName(p.name) : '?'
          }).join('/')
          const margin = Math.abs((r.teamABestBallTotal ?? 0) - (r.teamBBestBallTotal ?? 0))
          return { label: `${aNames} vs ${bNames}`, margin }
        })

        const sorted = [...margins].sort((a, b) => a.margin - b.margin)
        closestMatch = sorted[0]
        if (sorted.length > 1) {
          biggestBlowout = sorted[sorted.length - 1]
        } else if (sorted.length === 1 && sorted[0].margin > 0) {
          biggestBlowout = sorted[0]
        }
      }

      // Team momentum: who got more best ball points
      const r2PointsA = teamStandings.bestBallResults.reduce((s, r) => s + r.points.teamA, 0)
      const r2PointsB = teamStandings.bestBallResults.reduce((s, r) => s + r.points.teamB, 0)
      if (r2PointsA !== r2PointsB && teams.length >= 2) {
        const winningTeam = r2PointsA > r2PointsB ? teams.find(t => t.id === 'team-a') : teams.find(t => t.id === 'team-b')
        const pts = Math.max(r2PointsA, r2PointsB)
        if (winningTeam) {
          teamMomentum = { teamName: winningTeam.name, pointsWon: pts }
        }
      }
    }
  }

  return {
    round,
    course,
    lowGross,
    lowNet,
    mostBirdies,
    eaglesAndAces,
    bestHole,
    closestMatch,
    biggestBlowout,
    teamMomentum,
  }
}

function formatNetVsPar(vsPar: number): string {
  if (vsPar === 0) return 'E'
  if (vsPar > 0) return `+${vsPar}`
  return `${vsPar}`
}

function HighlightRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm shrink-0 w-5 text-center">{emoji}</span>
      <span className="text-xs font-semibold text-gray-500 shrink-0 w-28">{label}</span>
      <span className="text-xs text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function RoundCard({ data }: { data: RoundHighlightData }) {
  const [expanded, setExpanded] = useState(true)

  const roundLabel = data.round.round_number === 1 ? 'R1' : 'R2'
  const courseName = data.course.name

  const hasAnyHighlights =
    data.lowGross || data.lowNet || data.mostBirdies || data.eaglesAndAces.length > 0 ||
    data.bestHole || data.closestMatch || data.biggestBlowout || data.teamMomentum

  if (!hasAnyHighlights) return null

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-forest/5"
      >
        <div className="text-xs font-bold text-forest">
          {roundLabel} Highlights — {courseName}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-forest" />
        ) : (
          <ChevronDown size={16} className="text-forest" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-1">
          {data.lowGross && (
            <HighlightRow emoji="🔥" label="Low Gross" value={`${data.lowGross.name} (${data.lowGross.score})`} />
          )}
          {data.lowNet && (
            <HighlightRow
              emoji="🏆"
              label="Low Net"
              value={`${data.lowNet.name} (${data.lowNet.score}, ${formatNetVsPar(data.lowNet.vsPar)})`}
            />
          )}
          {data.mostBirdies && (
            <HighlightRow
              emoji="🐦"
              label="Most Birdies"
              value={`${data.mostBirdies.name} (${data.mostBirdies.count})`}
            />
          )}
          {data.eaglesAndAces.map((ea, i) => (
            <HighlightRow
              key={i}
              emoji={ea.netVsPar <= -3 ? "🦅" : "🦅"}
              label={ea.netVsPar <= -3 ? "Ace Watch" : "Eagle Watch"}
              value={`${ea.name} on Hole ${ea.hole} (net ${ea.netVsPar <= -3 ? 'ace' : 'eagle'})`}
            />
          ))}
          {data.bestHole && (
            <HighlightRow
              emoji="📍"
              label="Best Hole"
              value={`#${data.bestHole.holeNum} (Par ${data.bestHole.par}) — ${data.bestHole.birdieCount} birdie${data.bestHole.birdieCount !== 1 ? 's' : ''}`}
            />
          )}
          {data.closestMatch && (
            <HighlightRow
              emoji="🤝"
              label="Closest Match"
              value={`${data.closestMatch.label} (${data.closestMatch.margin === 0 ? 'tied' : data.closestMatch.margin + ' stroke' + (data.closestMatch.margin !== 1 ? 's' : '')})`}
            />
          )}
          {data.biggestBlowout && (
            <HighlightRow
              emoji="💥"
              label="Biggest Blowout"
              value={`${data.biggestBlowout.label} (${data.biggestBlowout.margin} stroke${data.biggestBlowout.margin !== 1 ? 's' : ''})`}
            />
          )}
          {data.teamMomentum && (
            <HighlightRow
              emoji="📈"
              label="Momentum"
              value={`Team ${data.teamMomentum.teamName} (${data.teamMomentum.pointsWon} pts)`}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function RoundHighlights() {
  const { scores, players, rounds, courses, holes, teamStandings, teams } = useTournament()

  const highlights = useMemo(() => {
    const results: RoundHighlightData[] = []
    for (const round of [...rounds].sort((a, b) => a.round_number - b.round_number)) {
      const course = courses.find(c => c.id === round.course_id)
      if (!course) continue
      const data = computeRoundHighlights(round, course, holes, players, scores, teamStandings, teams)
      if (data) results.push(data)
    }
    return results
  }, [scores, players, rounds, courses, holes, teamStandings, teams])

  if (highlights.length === 0) return null

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="text-forest">⛳</span> Round Highlights
      </h2>
      <div className="space-y-2">
        {highlights.map(h => (
          <RoundCard key={h.round.id} data={h} />
        ))}
      </div>
    </div>
  )
}
