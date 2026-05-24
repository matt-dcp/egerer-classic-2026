import { Minus, Plus, X } from 'lucide-react'
import { getHoleScoreColor } from '../lib/scoring'

interface Props {
  playerName: string
  par: number
  gross: number
  net: number
  receivesStroke: boolean
  onChange: (newGross: number) => void
  onClear?: () => void
  hasScore?: boolean
  compact?: boolean
}

export default function ScoreStepperCompact({
  playerName, par, gross, net, receivesStroke, onChange, onClear, hasScore, compact,
}: Props) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1.5' : 'py-2.5'} px-3 bg-white rounded-xl border border-gray-100`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-semibold text-gray-800 truncate">{playerName}</span>
        {receivesStroke && (
          <span className="w-2 h-2 rounded-full bg-forest flex-shrink-0" title="Receives stroke" />
        )}
        {hasScore && (
          <span className="w-2 h-2 rounded-full bg-birdie flex-shrink-0" title="Saved" />
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasScore && onClear && (
          <button
            onClick={onClear}
            className="w-11 h-11 flex items-center justify-center rounded-full text-red-400 active:bg-red-50"
            title="Clear score"
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={() => onChange(Math.max(1, gross - 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="Decrease score"
        >
          <Minus size={18} />
        </button>
        <button
          // Tap the muted-italic default to commit that value as the score
          // (typically par). When already saved, the button is a no-op.
          onClick={hasScore ? undefined : () => onChange(gross)}
          disabled={hasScore}
          aria-label={hasScore ? undefined : `Tap to save ${gross} for ${playerName}`}
          className="w-14 min-h-11 flex items-baseline justify-center disabled:cursor-default active:scale-95 transition-transform"
        >
          <span className={`text-xl font-bold ${
            hasScore
              ? getHoleScoreColor(gross, par)
              : 'text-gray-300 italic border-b border-dashed border-gray-300'
          }`}>{gross}</span>
          {/* When the player receives a stroke, show "/{net}" inline to the
              right of the gross — no stacking. Hidden when net == gross. */}
          {gross !== net && (
            <span className="text-xs text-gray-400">/{net}</span>
          )}
        </button>
        <button
          onClick={() => onChange(Math.min(15, gross + 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="Increase score"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}
