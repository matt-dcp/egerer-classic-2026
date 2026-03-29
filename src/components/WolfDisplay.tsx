import type { WolfResult, WolfConfig, Player } from '../lib/types'

interface Props {
  result: WolfResult
  config: WolfConfig
  players: Player[]
  onSelectPartner: (hole: number, partnerId: string | null) => void
}

export default function WolfDisplay({ result, config, players, onSelectPartner }: Props) {
  const getName = (id: string) => { const n = players.find(p => p.id === id)?.name; return n?.split(' ').pop() ?? '?' }

  // Sort by points descending
  const sorted = [...config.player_order].sort(
    (a, b) => (result.totalPoints[b] ?? 0) - (result.totalPoints[a] ?? 0),
  )

  // Find holes needing partner selection
  const pendingHoles = result.holes.filter(
    h => h.wolfWon === null && h.partnerId === null,
  )

  return (
    <div className="space-y-2">
      {/* Points leaderboard */}
      <div className="bg-white rounded-lg border border-gray-100 p-2.5">
        <div className="text-[10px] font-bold text-gray-400 mb-1">POINTS</div>
        <div className="flex gap-2">
          {sorted.map((id, i) => (
            <div key={id} className={`flex-1 text-center py-1.5 rounded ${
              i === 0 ? 'bg-forest/10' : 'bg-gray-50'
            }`}>
              <div className="text-[10px] text-gray-500">{getName(id)}</div>
              <div className={`text-lg font-bold ${i === 0 ? 'text-forest' : 'text-gray-600'}`}>
                {result.totalPoints[id] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending partner selections */}
      {pendingHoles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <div className="text-[10px] font-bold text-amber-700 mb-1.5">
            WOLF PARTNER NEEDED
          </div>
          {pendingHoles.slice(0, 1).map(h => {
            const others = config.player_order.filter(id => id !== h.wolfId)
            return (
              <div key={h.hole_number}>
                <div className="text-xs text-amber-800 mb-1.5">
                  Hole {h.hole_number}: <span className="font-semibold">{getName(h.wolfId)}</span> is wolf
                </div>
                <div className="flex gap-1.5">
                  {others.map(id => (
                    <button
                      key={id}
                      onClick={() => onSelectPartner(h.hole_number, id)}
                      className="flex-1 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 border border-amber-200"
                    >
                      {getName(id)}
                    </button>
                  ))}
                  <button
                    onClick={() => onSelectPartner(h.hole_number, null)}
                    className="flex-1 py-1.5 bg-amber-100 rounded-lg text-xs font-bold text-amber-800 border border-amber-300"
                  >
                    Lone Wolf
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent hole results */}
      {result.holes.filter(h => h.wolfWon !== null).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-2.5">
          <div className="text-[10px] font-bold text-gray-400 mb-1">RECENT HOLES</div>
          <div className="space-y-1">
            {result.holes
              .filter(h => h.wolfWon !== null)
              .slice(-5)
              .reverse()
              .map(h => (
                <div key={h.hole_number} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">H{h.hole_number}</span>
                  <span className="text-gray-600">
                    {getName(h.wolfId)} {h.partnerId === null ? '(lone)' : `+ ${getName(h.partnerId!)}`}
                  </span>
                  <span className={h.wolfWon ? 'text-forest font-semibold' : 'text-red-500'}>
                    {h.wolfWon ? 'Wolf wins' : 'Opp wins'}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
