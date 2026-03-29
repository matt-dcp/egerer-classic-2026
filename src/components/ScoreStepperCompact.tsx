import { Minus, Plus } from 'lucide-react'
import { getHoleScoreColor } from '../lib/scoring'

interface Props {
  playerName: string
  par: number
  gross: number
  net: number
  receivesStroke: boolean
  onChange: (newGross: number) => void
  compact?: boolean
}

export default function ScoreStepperCompact({
  playerName, par, gross, net, receivesStroke, onChange, compact,
}: Props) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1.5' : 'py-2.5'} px-3 bg-white rounded-xl border border-gray-100`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-semibold text-gray-800 truncate">{playerName}</span>
        {receivesStroke && (
          <span className="w-2 h-2 rounded-full bg-forest flex-shrink-0" title="Receives stroke" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, gross - 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
        >
          <Minus size={16} />
        </button>
        <div className="w-14 text-center">
          <span className={`text-xl font-bold ${getHoleScoreColor(gross, par)}`}>{gross}</span>
          <span className="text-xs text-gray-400">/{net}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(15, gross + 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
