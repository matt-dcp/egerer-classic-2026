import { useState } from 'react'
import { X } from 'lucide-react'
import type { Player, Foursome, SideGameConfig, NassauConfig } from '../lib/types'

interface Props {
  foursome: Foursome
  players: Player[]
  activeGames: SideGameConfig[]
  onAddGame: (config: SideGameConfig) => void
  onRemoveGame: (gameType: string) => void
  onClose: () => void
}

export default function SideGameSetup({ foursome, players, activeGames, onAddGame, onRemoveGame, onClose }: Props) {
  const pIds = foursome.player_ids
  const getName = (id: string) => players.find(p => p.id === id)?.name ?? '?'

  const has666 = activeGames.some(g => g.type === 'six_six_six')
  const nassauConfig = activeGames.find(g => g.type === 'nassau') as NassauConfig | undefined
  // Nassau team state
  const [nassauTeam1, setNassauTeam1] = useState<[string, string]>(
    nassauConfig?.team1 ?? [pIds[0], pIds[1]],
  )
  const nassauTeam2: [string, string] = pIds.filter(id => !nassauTeam1.includes(id)) as [string, string]

  const toggleNassauPlayer = (id: string) => {
    if (nassauTeam1.includes(id)) {
      if (nassauTeam1.length > 1) {
        setNassauTeam1(nassauTeam1.filter(p => p !== id) as [string, string])
      }
    } else if (nassauTeam1.length < 2) {
      setNassauTeam1([...nassauTeam1, id] as [string, string])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full bg-white rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Side Games</h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
        </div>

        {/* 6/6/6 */}
        <div className="mb-4 p-3 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Sixes</div>
              <div className="text-[10px] text-gray-400">Each player partners with every other for 6 holes</div>
            </div>
            <button
              onClick={() => has666
                ? onRemoveGame('six_six_six')
                : onAddGame({ type: 'six_six_six', foursome_id: foursome.id })
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                has666 ? 'bg-red-50 text-red-600' : 'bg-forest text-white'
              }`}
            >
              {has666 ? 'Remove' : 'Enable'}
            </button>
          </div>
          {has666 && (
            <div className="mt-2 text-[10px] text-gray-500 space-y-0.5">
              <div>H1-6: {getName(pIds[0])}+{getName(pIds[1])} vs {getName(pIds[2])}+{getName(pIds[3])}</div>
              <div>H7-12: {getName(pIds[0])}+{getName(pIds[2])} vs {getName(pIds[1])}+{getName(pIds[3])}</div>
              <div>H13-18: {getName(pIds[0])}+{getName(pIds[3])} vs {getName(pIds[1])}+{getName(pIds[2])}</div>
            </div>
          )}
        </div>

        {/* Nassau */}
        <div className="mb-4 p-3 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Nassau (2v2)</div>
              <div className="text-[10px] text-gray-400">Front 9, Back 9, and Overall bets</div>
            </div>
            <button
              onClick={() => {
                if (nassauConfig) {
                  onRemoveGame('nassau')
                } else {
                  onAddGame({ type: 'nassau', foursome_id: foursome.id, team1: nassauTeam1, team2: nassauTeam2 })
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                nassauConfig ? 'bg-red-50 text-red-600' : 'bg-forest text-white'
              }`}
            >
              {nassauConfig ? 'Remove' : 'Enable'}
            </button>
          </div>
          {!nassauConfig && (
            <div className="mt-3">
              <div className="text-[10px] text-gray-400 mb-1">Tap to assign Team 1 (2 players):</div>
              <div className="flex gap-1.5">
                {pIds.map(id => (
                  <button
                    key={id}
                    onClick={() => toggleNassauPlayer(id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      nassauTeam1.includes(id) ? 'bg-forest text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {getName(id)}
                  </button>
                ))}
              </div>
              {nassauTeam1.length === 2 && (
                <div className="mt-1.5 text-[10px] text-gray-400">
                  Team 1: {nassauTeam1.map(getName).join(' + ')} vs Team 2: {nassauTeam2.map(getName).join(' + ')}
                </div>
              )}
            </div>
          )}
          {nassauConfig && (
            <div className="mt-2 text-[10px] text-gray-500">
              Team 1: {nassauConfig.team1.map(getName).join(' + ')} vs Team 2: {nassauConfig.team2.map(getName).join(' + ')}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
