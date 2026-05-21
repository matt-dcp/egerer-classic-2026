import { useState } from 'react'
import { Flame, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import type { StrokePlayResult, BestBallResult, Player, Score, Hole } from '../lib/types'
import { calculateCourseHandicap, getStrokesForHole, getHoleScoreColor } from '../lib/scoring'

// Mini scorecard for a single player
function PlayerScorecard({ player, scores, holes, slope }: {
  player: Player
  scores: Score[]
  holes: Hole[]
  slope: number
}) {
  // Matchup cards are team play — use the team handicap
  const courseHcp = calculateCourseHandicap(player.team_handicap, slope)
  const sorted = [...holes].sort((a, b) => a.hole_number - b.hole_number)
  const front9 = sorted.filter(h => h.hole_number <= 9)
  const back9 = sorted.filter(h => h.hole_number > 9)

  const getGross = (holeNum: number) => scores.find(s => s.hole_number === holeNum && s.player_id === player.id)?.gross_score ?? null
  const getNet = (holeNum: number, gross: number | null) => {
    if (gross === null) return null
    const hole = sorted.find(h => h.hole_number === holeNum)
    if (!hole) return gross
    return gross - getStrokesForHole(courseHcp, hole.stroke_index)
  }

  const renderNine = (nineHoles: Hole[], label: string) => {
    let grossTotal = 0, netTotal = 0, parTotal = 0, count = 0
    for (const h of nineHoles) {
      parTotal += h.par
      const g = getGross(h.hole_number)
      if (g !== null) { grossTotal += g; netTotal += getNet(h.hole_number, g)!; count++ }
    }
    return (
      <div className="mb-1">
        <table className="w-full text-[11px] text-center">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-0.5 py-0.5 text-gray-400 font-medium text-left w-10 text-[11px]">{label}</th>
              {nineHoles.map(h => <th key={h.hole_number} className="px-0 py-0.5 text-gray-400 font-medium w-6 text-[11px]">{h.hole_number}</th>)}
              <th className="px-0.5 py-0.5 text-gray-500 font-bold text-[11px]">TOT</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="px-0.5 py-0.5 text-gray-400 text-left text-[11px]">Par</td>
              {nineHoles.map(h => <td key={h.hole_number} className="px-0 py-0.5 text-gray-400 text-[11px]">{h.par}</td>)}
              <td className="px-0.5 py-0.5 text-gray-500 font-bold text-[11px]">{parTotal}</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-0.5 py-0.5 text-gray-500 text-left text-[11px] font-medium">Gr</td>
              {nineHoles.map(h => {
                const g = getGross(h.hole_number)
                return <td key={h.hole_number} className={`px-0 py-0.5 font-bold text-[11px] ${g !== null ? getHoleScoreColor(g, h.par) : 'text-gray-300'}`}>{g ?? '-'}</td>
              })}
              <td className="px-0.5 py-0.5 font-bold text-gray-700 text-[11px]">{count > 0 ? grossTotal : '-'}</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-0.5 py-0.5 text-forest text-left text-[11px] font-medium">Net</td>
              {nineHoles.map(h => {
                const g = getGross(h.hole_number)
                const n = getNet(h.hole_number, g)
                return <td key={h.hole_number} className={`px-0 py-0.5 font-bold text-[11px] ${n !== null ? getHoleScoreColor(n, h.par) : 'text-gray-300'}`}>{n ?? '-'}</td>
              })}
              <td className="px-0.5 py-0.5 font-bold text-forest text-[11px]">{count > 0 ? netTotal : '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  const lastName = player.name.split(' ').pop() ?? '?'

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold text-gray-600">{lastName}</span>
        <span className="text-[11px] text-gray-400">HCP {player.handicap_index} · Course {courseHcp}</span>
      </div>
      <div className="overflow-x-auto">
        {renderNine(front9, 'F9')}
        {renderNine(back9, 'B9')}
      </div>
    </div>
  )
}

interface StrokePlayProps {
  result: StrokePlayResult
  players: Player[]
  teamAName: string
  teamBName: string
  scores?: Score[]
  holes?: Hole[]
  slope?: number
}

export function StrokePlayCard({ result, players, teamAName, teamBName, scores, holes, slope }: StrokePlayProps) {
  const [expanded, setExpanded] = useState(false)
  const playerA = players.find(p => p.id === result.matchup.team_a_player_id)
  const playerB = players.find(p => p.id === result.matchup.team_b_player_id)
  const lastName = (p?: Player) => p?.name.split(' ').pop() ?? '?'

  const decided = result.result !== 'in_progress'
  const netA = result.playerANetTotal
  const netB = result.playerBNetTotal
  const hasScores = netA !== null && netB !== null
  const margin = hasScores ? Math.abs(netA! - netB!) : 0
  const aWinning = hasScores && netA! < netB!
  const bWinning = hasScores && netB! < netA!
  const tied = hasScores && netA === netB
  const thru = Math.max(result.playerAThru, result.playerBThru)
  const notStarted = thru === 0

  const aWon = decided && result.result === 'team_a_wins'
  const bWon = decided && result.result === 'team_b_wins'
  const halved = decided && result.result === 'halved'

  const canExpand = !!scores && !!holes && thru > 0

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm ${
      result.matchup.is_pressure_bet ? 'ring-2 ring-gold/60' : ''
    } ${decided ? 'bg-gray-50' : 'bg-white'}`}>
      {result.matchup.is_pressure_bet && (
        <div className="flex items-center gap-1 px-3 pt-2">
          <Flame size={12} className="text-gold" />
          <span className="text-[11px] font-bold text-gold uppercase tracking-wider">Pressure Bet (2x)</span>
        </div>
      )}

      <div
        className="p-3 cursor-pointer"
        onClick={() => canExpand && setExpanded(!expanded)}
      >
        {/* Main matchup row */}
        <div className="flex items-center">
          {/* Player A */}
          <div className="flex-1">
            <div className={`flex items-center gap-1.5 ${
              aWon ? 'text-forest' : bWon ? 'text-gray-400' : aWinning ? 'text-forest' : 'text-gray-800'
            }`}>
              {aWon && <Trophy size={14} className="text-forest flex-shrink-0" />}
              <span className="text-sm font-bold">{lastName(playerA)}</span>
            </div>
            <div className="text-[11px] text-gray-400">{teamAName}</div>
            {hasScores && (
              <div className={`text-[11px] font-semibold mt-0.5 ${
                aWon ? 'text-forest' : bWon ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Net {netA}
              </div>
            )}
          </div>

          {/* Center status */}
          <div className="text-center px-2 min-w-[90px]">
            {notStarted ? (
              <div className="text-[11px] text-gray-400">Not started</div>
            ) : decided ? (
              <div>
                {halved ? (
                  <div className="bg-gray-200 text-gray-600 rounded-full px-3 py-1 text-xs font-bold">
                    HALVED
                  </div>
                ) : (
                  <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                    aWon ? 'bg-forest' : 'bg-gold'
                  }`}>
                    {aWon ? lastName(playerA) : lastName(playerB)} wins by {margin}
                  </div>
                )}
                <div className="text-[11px] text-gray-400 mt-0.5">FINAL</div>
              </div>
            ) : (
              <div>
                {tied ? (
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-xs font-bold text-gray-600">
                    ALL SQUARE
                  </div>
                ) : (
                  <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                    aWinning ? 'bg-forest' : 'bg-gold'
                  }`}>
                    {aWinning ? lastName(playerA) : lastName(playerB)} {margin} UP
                  </div>
                )}
                <div className="text-[11px] text-gray-400 mt-0.5">thru {thru}</div>
              </div>
            )}
          </div>

          {/* Player B */}
          <div className="flex-1 text-right">
            <div className={`flex items-center justify-end gap-1.5 ${
              bWon ? 'text-forest' : aWon ? 'text-gray-400' : bWinning ? 'text-forest' : 'text-gray-800'
            }`}>
              <span className="text-sm font-bold">{lastName(playerB)}</span>
              {bWon && <Trophy size={14} className="text-forest flex-shrink-0" />}
            </div>
            <div className="text-[11px] text-gray-400">{teamBName}</div>
            {hasScores && (
              <div className={`text-[11px] font-semibold mt-0.5 ${
                bWon ? 'text-forest' : aWon ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Net {netB}
              </div>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        {canExpand && (
          <div className="flex justify-center mt-1">
            {expanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
          </div>
        )}
      </div>

      {/* Expanded scorecards */}
      {expanded && scores && holes && slope !== undefined && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {playerA && <PlayerScorecard player={playerA} scores={scores} holes={holes} slope={slope} />}
          {playerB && <PlayerScorecard player={playerB} scores={scores} holes={holes} slope={slope} />}
        </div>
      )}
    </div>
  )
}

interface BestBallProps {
  result: BestBallResult
  players: Player[]
  teamAName: string
  teamBName: string
  scores?: Score[]
  holes?: Hole[]
  slope?: number
}

export function BestBallCard({ result, players, teamAName, teamBName, scores, holes, slope }: BestBallProps) {
  const [expanded, setExpanded] = useState(false)
  const lastName = (id: string) => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?'
  // Dedup so a 1-vs-2 match (a player entered in both slots of one side)
  // shows that player's name once instead of twice
  const aNames = [...new Set(result.pairing.team_a_player_ids)].map(lastName).join(' & ')
  const bNames = [...new Set(result.pairing.team_b_player_ids)].map(lastName).join(' & ')

  const decided = result.result !== 'in_progress'
  const netA = result.teamABestBallTotal
  const netB = result.teamBBestBallTotal
  const hasScores = netA !== null && netB !== null
  const margin = hasScores ? Math.abs(netA! - netB!) : 0
  const aWinning = hasScores && netA! < netB!
  const bWinning = hasScores && netB! < netA!
  const tied = hasScores && netA === netB
  const thru = Math.max(result.teamAThru, result.teamBThru)
  const notStarted = thru === 0

  const aWon = decided && result.result === 'team_a_wins'
  const bWon = decided && result.result === 'team_b_wins'
  const halved = decided && result.result === 'halved'

  const allPlayerIds = [...result.pairing.team_a_player_ids, ...result.pairing.team_b_player_ids]
  const canExpand = !!scores && !!holes && thru > 0

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm ${
      result.pairing.is_pressure_bet ? 'ring-2 ring-gold/60' : ''
    } ${decided ? 'bg-gray-50' : 'bg-white'}`}>
      {result.pairing.is_pressure_bet && (
        <div className="flex items-center gap-1 px-3 pt-2">
          <Flame size={12} className="text-gold" />
          <span className="text-[11px] font-bold text-gold uppercase tracking-wider">Pressure Match (4 pts)</span>
        </div>
      )}
      <div
        className="p-3 cursor-pointer"
        onClick={() => canExpand && setExpanded(!expanded)}
      >
        <div className="flex items-center">
          {/* Team A pair */}
          <div className="flex-1">
            <div className={`flex items-center gap-1.5 ${
              aWon ? 'text-forest' : bWon ? 'text-gray-400' : aWinning ? 'text-forest' : 'text-gray-800'
            }`}>
              {aWon && <Trophy size={14} className="text-forest flex-shrink-0" />}
              <span className="text-sm font-bold">{aNames}</span>
            </div>
            <div className="text-[11px] text-gray-400">{teamAName}</div>
            {hasScores && (
              <div className={`text-[11px] font-semibold mt-0.5 ${
                aWon ? 'text-forest' : bWon ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Net {netA}
              </div>
            )}
          </div>

          {/* Center status */}
          <div className="text-center px-2 min-w-[90px]">
            {notStarted ? (
              <div className="text-[11px] text-gray-400">Not started</div>
            ) : decided ? (
              <div>
                {halved ? (
                  <div className="bg-gray-200 text-gray-600 rounded-full px-3 py-1 text-xs font-bold">
                    HALVED
                  </div>
                ) : (
                  <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                    aWon ? 'bg-forest' : 'bg-gold'
                  }`}>
                    {aWon ? aNames : bNames} win by {margin}
                  </div>
                )}
                <div className="text-[11px] text-gray-400 mt-0.5">FINAL</div>
              </div>
            ) : (
              <div>
                {tied ? (
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-xs font-bold text-gray-600">
                    ALL SQUARE
                  </div>
                ) : (
                  <div className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                    aWinning ? 'bg-forest' : 'bg-gold'
                  }`}>
                    {aWinning ? aNames : bNames} {margin} UP
                  </div>
                )}
                <div className="text-[11px] text-gray-400 mt-0.5">thru {thru}</div>
              </div>
            )}
          </div>

          {/* Team B pair */}
          <div className="flex-1 text-right">
            <div className={`flex items-center justify-end gap-1.5 ${
              bWon ? 'text-forest' : aWon ? 'text-gray-400' : bWinning ? 'text-forest' : 'text-gray-800'
            }`}>
              <span className="text-sm font-bold">{bNames}</span>
              {bWon && <Trophy size={14} className="text-forest flex-shrink-0" />}
            </div>
            <div className="text-[11px] text-gray-400">{teamBName}</div>
            {hasScores && (
              <div className={`text-[11px] font-semibold mt-0.5 ${
                bWon ? 'text-forest' : aWon ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Net {netB}
              </div>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        {canExpand && (
          <div className="flex justify-center mt-1">
            {expanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
          </div>
        )}
      </div>

      {/* Expanded scorecards */}
      {expanded && scores && holes && slope !== undefined && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {allPlayerIds.map(id => {
            const p = players.find(pl => pl.id === id)
            return p ? <PlayerScorecard key={id} player={p} scores={scores} holes={holes} slope={slope} /> : null
          })}
        </div>
      )}
    </div>
  )
}
