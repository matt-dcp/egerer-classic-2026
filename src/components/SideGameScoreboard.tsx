import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Settings } from 'lucide-react'
import type { Foursome, Player, Score, Hole, SideGameConfig, NassauConfig } from '../lib/types'
import { calculateSixSixSix, calculateNassau } from '../lib/sideGames'
import SideGameSetup from './SideGameSetup'
import SixSixSixDisplay from './SixSixSixDisplay'
import NassauDisplay from './NassauDisplay'

interface Props {
  foursome: Foursome
  players: Player[]
  scores: Score[]
  holes: Hole[]
  courseSlope: number
  roundId: string
  gameConfigs: SideGameConfig[]
  onAddGame: (config: SideGameConfig) => void
  onRemoveGame: (gameType: string) => void
}

export default function SideGameScoreboard({
  foursome, players, scores, holes, courseSlope, roundId,
  gameConfigs, onAddGame, onRemoveGame,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showSetup, setShowSetup] = useState(false)

  const sixConfig = gameConfigs.find(g => g.type === 'six_six_six')
  const nassauConfig = gameConfigs.find(g => g.type === 'nassau') as NassauConfig | undefined

  const sixResult = useMemo(() =>
    sixConfig ? calculateSixSixSix(sixConfig, foursome, scores, holes, players, courseSlope, roundId) : null,
    [sixConfig, foursome, scores, holes, players, courseSlope, roundId],
  )

  const nassauResult = useMemo(() =>
    nassauConfig ? calculateNassau(nassauConfig, scores, holes, players, courseSlope, roundId) : null,
    [nassauConfig, scores, holes, players, courseSlope, roundId],
  )

  const hasGames = gameConfigs.length > 0

  // Quick summary for collapsed view
  const summaryParts: string[] = []
  if (nassauResult) {
    const { front } = nassauResult
    const label = front.leader === 'team1' ? `T1 ${front.margin}UP`
      : front.leader === 'team2' ? `T2 ${front.margin}UP` : 'AS'
    summaryParts.push(`Nassau: ${label}`)
  }

  return (
    <div className="mt-3">
      {/* Header */}
      <div
        className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600">Side Games</span>
          {!expanded && hasGames && summaryParts.length > 0 && (
            <span className="text-[10px] text-gray-400">{summaryParts.join(' · ')}</span>
          )}
          {!hasGames && (
            <span className="text-[10px] text-gray-400">None active</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setShowSetup(true) }}
            className="p-1 text-gray-400"
          >
            <Settings size={14} />
          </button>
          {hasGames && (expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />)}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && hasGames && (
        <div className="mt-2 space-y-3">
          {sixResult && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 mb-1 px-1">SIXES</div>
              <SixSixSixDisplay result={sixResult} players={players} />
            </div>
          )}
          {nassauResult && nassauConfig && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 mb-1 px-1">NASSAU</div>
              <NassauDisplay result={nassauResult} config={nassauConfig} players={players} />
            </div>
          )}
        </div>
      )}

      {/* Setup modal */}
      {showSetup && (
        <SideGameSetup
          foursome={foursome}
          players={players}
          activeGames={gameConfigs}
          onAddGame={onAddGame}
          onRemoveGame={onRemoveGame}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  )
}
