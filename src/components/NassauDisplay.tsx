import type { NassauResult, NassauConfig, Player } from '../lib/types'

interface Props {
  result: NassauResult
  config: NassauConfig
  players: Player[]
}

export default function NassauDisplay({ result, config, players }: Props) {
  const getName = (id: string) => { const n = players.find(p => p.id === id)?.name; return n?.split(' ').pop() ?? '?' }
  const t1Label = config.team1.map(getName).join(' + ')
  const t2Label = config.team2.map(getName).join(' + ')

  const bets = [result.front, result.back, result.overall]
  const labels = ['Front 9', 'Back 9', 'Overall']

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      {/* Team header */}
      <div className="flex text-[10px] font-bold text-gray-400 px-2.5 py-1.5 bg-gray-50">
        <div className="w-16" />
        <div className="flex-1 text-center">{t1Label}</div>
        <div className="flex-1 text-center">{t2Label}</div>
      </div>

      {bets.map((bet, i) => {
        return (
          <div key={bet.bet} className="flex items-center px-2.5 py-2 border-t border-gray-50">
            <div className="w-16 text-[10px] font-semibold text-gray-500">{labels[i]}</div>
            <div className={`flex-1 text-center text-sm font-bold ${
              bet.leader === 'team1' ? 'text-forest' : 'text-gray-400'
            }`}>
              {bet.team1HolesWon}
            </div>
            <div className={`flex-1 text-center text-sm font-bold ${
              bet.leader === 'team2' ? 'text-forest' : 'text-gray-400'
            }`}>
              {bet.team2HolesWon}
            </div>
          </div>
        )
      })}

      {/* Summary */}
      <div className="px-2.5 py-2 bg-gray-50 border-t border-gray-100 text-center">
        {['front', 'back', 'overall'].map((key, i) => {
          const bet = bets[i]
          const label = bet.leader === 'team1' ? `${t1Label} ${bet.margin}UP`
            : bet.leader === 'team2' ? `${t2Label} ${bet.margin}UP`
            : 'All Square'
          return (
            <span key={key} className="text-[9px] text-gray-500">
              {i > 0 && ' · '}{labels[i]}: <span className="font-semibold">{label}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
