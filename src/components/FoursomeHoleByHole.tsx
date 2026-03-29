import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Hole, Player, Score } from '../lib/types'
import { calculateCourseHandicap, getStrokesForHole } from '../lib/scoring'
import ScoreStepperCompact from './ScoreStepperCompact'

interface Props {
  holes: Hole[]
  players: Player[]  // exactly 4
  scores: Score[]    // all scores for this round
  courseSlope: number
  roundId: string
  onSubmitScore: (playerId: string, holeNumber: number, gross: number) => void
}

export default function FoursomeHoleByHole({
  holes, players, scores, courseSlope, roundId, onSubmitScore,
}: Props) {
  const [currentHole, setCurrentHole] = useState(1)
  const hole = holes.find(h => h.hole_number === currentHole)

  // Track working values for current hole (before save)
  const playerData = useMemo(() => {
    return players.map(player => {
      const courseHcp = calculateCourseHandicap(player.handicap_index, courseSlope)
      const strokes = hole ? getStrokesForHole(courseHcp, hole.stroke_index) : 0
      const existingScore = scores.find(
        s => s.player_id === player.id && s.hole_number === currentHole && s.round_id === roundId,
      )
      const gross = existingScore?.gross_score ?? (hole?.par ?? 4)
      return {
        player,
        courseHcp,
        strokes,
        gross,
        net: gross - strokes,
        receivesStroke: strokes > 0,
      }
    })
  }, [players, scores, currentHole, courseSlope, hole, roundId])

  // Count completed holes
  const completedHoles = useMemo(() => {
    const completed = new Set<number>()
    for (const h of holes) {
      const allHaveScores = players.every(p =>
        scores.some(s => s.player_id === p.id && s.hole_number === h.hole_number && s.round_id === roundId),
      )
      if (allHaveScores) completed.add(h.hole_number)
    }
    return completed
  }, [holes, players, scores, roundId])

  if (!hole) return null

  return (
    <div>
      {/* Progress dots */}
      <div className="flex justify-center gap-1 mb-3">
        {holes.map(h => (
          <button
            key={h.hole_number}
            onClick={() => setCurrentHole(h.hole_number)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              h.hole_number === currentHole
                ? 'bg-forest scale-125'
                : completedHoles.has(h.hole_number)
                  ? 'bg-forest/40'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Hole header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
          disabled={currentHole === 1}
          className="p-2 rounded-full bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">Hole {currentHole}</div>
          <div className="text-sm text-gray-400">
            Par {hole.par} · {hole.yardage} yds · SI {hole.stroke_index}
          </div>
        </div>
        <button
          onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
          disabled={currentHole === 18}
          className="p-2 rounded-full bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Player steppers */}
      <div className="flex flex-col gap-2 mb-4">
        {playerData.map(({ player, gross, strokes, receivesStroke }) => (
          <ScoreStepperCompact
            key={player.id}
            playerName={player.name}
            par={hole.par}
            gross={gross}
            net={gross - strokes}
            receivesStroke={receivesStroke}
            onChange={(newGross) => onSubmitScore(player.id, currentHole, newGross)}
          />
        ))}
      </div>

      {/* Save & Next */}
      <button
        onClick={() => {
          // Save all current values
          for (const pd of playerData) {
            onSubmitScore(pd.player.id, currentHole, pd.gross)
          }
          if (currentHole < 18) setCurrentHole(currentHole + 1)
        }}
        className="w-full py-3 bg-forest text-white rounded-xl font-semibold text-sm"
      >
        {currentHole < 18 ? 'Save & Next →' : 'Save (Final Hole)'}
      </button>
    </div>
  )
}
