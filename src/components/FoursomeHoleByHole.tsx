import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react'
import type { Hole, Player, Score } from '../lib/types'
import { calculateCourseHandicap, getStrokesForHole } from '../lib/scoring'
import ScoreStepperCompact from './ScoreStepperCompact'

interface Props {
  holes: Hole[]
  players: Player[]  // the players in this group (3 for a 1-vs-2 match, otherwise 4)
  scores: Score[]    // all scores for this round
  courseSlope: number
  roundId: string
  onSubmitScore: (playerId: string, holeNumber: number, gross: number) => void
  onDeleteScore?: (playerId: string, holeNumber: number) => void
}

export default function FoursomeHoleByHole({
  holes, players, scores, courseSlope, roundId, onSubmitScore, onDeleteScore,
}: Props) {
  const [currentHole, setCurrentHole] = useState(1)
  const [showComplete, setShowComplete] = useState(false)

  // Undo toast state
  const [undoData, setUndoData] = useState<{ hole: number; scores: { playerId: string; gross: number }[] } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUndo = useCallback(() => {
    if (!undoData || !onDeleteScore) return
    // Delete the scores that were just saved and go back to that hole
    for (const s of undoData.scores) {
      onDeleteScore(s.playerId, undoData.hole)
    }
    setCurrentHole(undoData.hole)
    setUndoData(null)
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null }
  }, [undoData, onDeleteScore])

  // Auto-dismiss undo toast after 5 seconds
  useEffect(() => {
    if (undoData) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => { setUndoData(null); undoTimerRef.current = null }, 5000)
      return () => { if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null } }
    }
  }, [undoData?.hole])
  const hole = holes.find(h => h.hole_number === currentHole)

  // Track working values for current hole (before save)
  const playerData = useMemo(() => {
    return players.map(player => {
      const courseHcp = calculateCourseHandicap(player.team_handicap, courseSlope)
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

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = touchStartY.current === null ? 0 : e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(deltaX) < 50) return
    // Ignore mostly-vertical gestures so scrolling doesn't skip holes (P1-10).
    if (Math.abs(deltaY) > Math.abs(deltaX)) return
    if (deltaX < 0 && currentHole < 18) {
      // Swipe left = next hole
      setCurrentHole(currentHole + 1)
    } else if (deltaX > 0 && currentHole > 1) {
      // Swipe right = previous hole
      setCurrentHole(currentHole - 1)
    }
  }, [currentHole])

  if (!hole) return null

  return (
    <div>
      {/* Progress dots — small visual marker inside a tall, full-width tap area
          (precise hole nav is also available via the chevrons and swipe). */}
      <div className="flex justify-center mb-3">
        {holes.map(h => (
          <button
            key={h.hole_number}
            onClick={() => setCurrentHole(h.hole_number)}
            aria-label={`Go to hole ${h.hole_number}`}
            className="flex-1 min-w-0 h-11 flex items-center justify-center"
          >
            <span className={`w-2.5 h-2.5 rounded-full transition-colors ${
              h.hole_number === currentHole
                ? 'bg-forest scale-125'
                : completedHoles.has(h.hole_number)
                  ? 'bg-forest/40'
                  : 'bg-gray-200'
            }`} />
          </button>
        ))}
      </div>

      {/* Swipeable content area */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Hole header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
            disabled={currentHole === 1}
            aria-label="Previous hole"
            className="p-3 rounded-full bg-gray-100 disabled:opacity-30"
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
            aria-label="Next hole"
            className="p-3 rounded-full bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Player steppers */}
        <div className="flex flex-col gap-2 mb-4">
          {playerData.map(({ player, gross, strokes, receivesStroke }) => {
            const hasScore = scores.some(s => s.player_id === player.id && s.hole_number === currentHole)
            return (
              <ScoreStepperCompact
                key={player.id}
                playerName={player.name}
                par={hole.par}
                gross={gross}
                net={gross - strokes}
                receivesStroke={receivesStroke}
                onChange={(newGross) => onSubmitScore(player.id, currentHole, newGross)}
                hasScore={hasScore}
                onClear={onDeleteScore ? () => onDeleteScore(player.id, currentHole) : undefined}
              />
            )
          })}
        </div>
      </div>

      {/* Save & Next — commits the displayed value for every player in the
          group (par by default for any player not yet adjusted), so the
          one-tap "everyone made par" flow works. Visual cues elsewhere flag
          which players still hold the par default vs. a real entry. */}
      <button
        onClick={() => {
          const savedScores = playerData.map(pd => ({ playerId: pd.player.id, gross: pd.gross }))
          for (const pd of playerData) {
            onSubmitScore(pd.player.id, currentHole, pd.gross)
          }
          setUndoData({ hole: currentHole, scores: savedScores })
          if (currentHole < 18) {
            setCurrentHole(currentHole + 1)
          } else {
            setShowComplete(true)
          }
        }}
        className="w-full py-3 bg-forest text-white rounded-xl font-semibold text-sm"
      >
        {currentHole < 18 ? 'Save & Next →' : 'Finish Round →'}
      </button>

      {/* Undo toast */}
      {undoData && (
        <div className="fixed bottom-20 left-4 right-4 z-40 flex justify-center">
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-full shadow-lg text-sm font-medium"
          >
            <Undo2 size={14} />
            Hole {undoData.hole} saved — tap to undo
          </button>
        </div>
      )}

      {/* Round complete overlay */}
      {showComplete && (
        <RoundCompleteOverlay
          players={players}
          scores={scores}
          holes={holes}
          courseSlope={courseSlope}
          roundId={roundId}
          onDismiss={() => setShowComplete(false)}
        />
      )}
    </div>
  )
}

function RoundCompleteOverlay({ players, scores, holes, courseSlope, roundId, onDismiss }: {
  players: Props['players']
  scores: Props['scores']
  holes: Props['holes']
  courseSlope: number
  roundId: string
  onDismiss: () => void
}) {
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)

  const playerResults = players.map(player => {
    const courseHcp = calculateCourseHandicap(player.handicap_index, courseSlope)
    let grossTotal = 0
    let netTotal = 0
    let holesPlayed = 0
    for (const h of holes) {
      const sc = scores.find(s => s.player_id === player.id && s.hole_number === h.hole_number && s.round_id === roundId)
      if (sc) {
        const strokes = getStrokesForHole(courseHcp, h.stroke_index)
        grossTotal += sc.gross_score
        netTotal += sc.gross_score - strokes
        holesPlayed++
      }
    }
    return { player, grossTotal, netTotal, holesPlayed, vsPar: netTotal - totalPar }
  }).sort((a, b) => a.netTotal - b.netTotal)

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  const leader = playerResults[0]
  const reaction = leader.vsPar <= -5 ? pick(['A TRADITION UNLIKE ANY OTHER!', 'LEGENDARY!'])
    : leader.vsPar <= -2 ? pick(['What a round!', 'Playing lights out!'])
    : leader.vsPar <= 0 ? pick(['Solid round!', 'That\'ll play!'])
    : leader.vsPar <= 3 ? pick(['Not bad, not bad', 'Room for improvement'])
    : pick(['The 19th hole awaits', 'Golf is hard'])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">🏁</div>
          <h3 className="text-lg font-bold text-gray-900">Round Complete!</h3>
          <p className="text-xs text-gray-400 mt-0.5">{reaction}</p>
        </div>
        <div className="space-y-2">
          {playerResults.map((pr, i) => (
            <div key={pr.player.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${i === 0 ? 'bg-forest/10' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <span className="text-sm font-semibold text-gray-800">{pr.player.name.split(' ').pop()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{pr.grossTotal} gross</span>
                <span className={`text-sm font-bold ${pr.vsPar < 0 ? 'text-green-700' : pr.vsPar > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {pr.vsPar > 0 ? '+' : ''}{pr.vsPar} net
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="w-full mt-4 py-3 bg-forest text-white rounded-xl font-semibold text-sm"
        >
          Done
        </button>
      </div>
    </div>
  )
}
