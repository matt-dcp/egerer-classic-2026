import { Flame } from 'lucide-react'
import type { StrokePlayResult, BestBallResult, Player } from '../lib/types'

interface StrokePlayProps {
  result: StrokePlayResult
  players: Player[]
  teamAName: string
  teamBName: string
}

export function StrokePlayCard({ result, players, teamAName, teamBName }: StrokePlayProps) {
  const playerA = players.find(p => p.id === result.matchup.team_a_player_id)
  const playerB = players.find(p => p.id === result.matchup.team_b_player_id)
  const lastName = (p?: Player) => p?.name.split(' ').pop() ?? '?'

  const decided = result.result !== 'in_progress'
  const aWinning = result.playerANetTotal !== null && result.playerBNetTotal !== null && result.playerANetTotal < result.playerBNetTotal
  const bWinning = result.playerANetTotal !== null && result.playerBNetTotal !== null && result.playerBNetTotal < result.playerANetTotal

  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm ${result.matchup.is_pressure_bet ? 'ring-2 ring-gold/60' : ''}`}>
      {result.matchup.is_pressure_bet && (
        <div className="flex items-center gap-1 mb-1.5">
          <Flame size={12} className="text-gold" />
          <span className="text-[9px] font-bold text-gold uppercase tracking-wider">Pressure Bet (2x)</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        {/* Player A */}
        <div className="flex-1 text-left">
          <div className={`text-sm font-semibold ${decided && result.result === 'team_a_wins' ? 'text-forest' : decided && result.result === 'team_b_wins' ? 'text-gray-400' : aWinning ? 'text-forest' : ''}`}>
            {lastName(playerA)}
          </div>
          <div className="text-[10px] text-gray-400">{teamAName}</div>
        </div>

        {/* Status */}
        <div className="text-center px-3">
          <div className={`text-xs font-bold ${
            result.result === 'team_a_wins' ? 'text-forest' :
            result.result === 'team_b_wins' ? 'text-red-600' :
            result.result === 'halved' ? 'text-gray-500' :
            'text-gray-700'
          }`}>
            {result.description}
          </div>
        </div>

        {/* Player B */}
        <div className="flex-1 text-right">
          <div className={`text-sm font-semibold ${decided && result.result === 'team_b_wins' ? 'text-forest' : decided && result.result === 'team_a_wins' ? 'text-gray-400' : bWinning ? 'text-forest' : ''}`}>
            {lastName(playerB)}
          </div>
          <div className="text-[10px] text-gray-400">{teamBName}</div>
        </div>
      </div>
    </div>
  )
}

interface BestBallProps {
  result: BestBallResult
  players: Player[]
  teamAName: string
  teamBName: string
}

export function BestBallCard({ result, players, teamAName, teamBName }: BestBallProps) {
  const lastName = (id: string) => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?'
  const aNames = result.pairing.team_a_player_ids.map(lastName).join(' & ')
  const bNames = result.pairing.team_b_player_ids.map(lastName).join(' & ')

  const decided = result.result !== 'in_progress'
  const aWinning = result.teamABestBallTotal !== null && result.teamBBestBallTotal !== null && result.teamABestBallTotal < result.teamBBestBallTotal
  const bWinning = result.teamABestBallTotal !== null && result.teamBBestBallTotal !== null && result.teamBBestBallTotal < result.teamABestBallTotal

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Team A pair */}
        <div className="flex-1 text-left">
          <div className={`text-sm font-semibold ${decided && result.result === 'team_a_wins' ? 'text-forest' : decided && result.result === 'team_b_wins' ? 'text-gray-400' : aWinning ? 'text-forest' : ''}`}>
            {aNames}
          </div>
          <div className="text-[10px] text-gray-400">{teamAName}</div>
        </div>

        {/* Status */}
        <div className="text-center px-3">
          <div className={`text-xs font-bold ${
            result.result === 'team_a_wins' ? 'text-forest' :
            result.result === 'team_b_wins' ? 'text-red-600' :
            result.result === 'halved' ? 'text-gray-500' :
            'text-gray-700'
          }`}>
            {result.description}
          </div>
        </div>

        {/* Team B pair */}
        <div className="flex-1 text-right">
          <div className={`text-sm font-semibold ${decided && result.result === 'team_b_wins' ? 'text-forest' : decided && result.result === 'team_a_wins' ? 'text-gray-400' : bWinning ? 'text-forest' : ''}`}>
            {bNames}
          </div>
          <div className="text-[10px] text-gray-400">{teamBName}</div>
        </div>
      </div>
    </div>
  )
}
