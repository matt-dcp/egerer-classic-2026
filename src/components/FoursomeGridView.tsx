import { useState, useMemo } from 'react'
import type { Hole, Player, Score } from '../lib/types'
import { calculateCourseHandicap, getStrokesForHole, getHoleScoreColor } from '../lib/scoring'
import ScoreStepperCompact from './ScoreStepperCompact'

interface Props {
  holes: Hole[]
  players: Player[]  // exactly 4
  scores: Score[]
  courseSlope: number
  roundId: string
  onSubmitScore: (playerId: string, holeNumber: number, gross: number) => void
}

export default function FoursomeGridView({
  holes, players, scores, courseSlope, roundId, onSubmitScore,
}: Props) {
  const [editing, setEditing] = useState<{ playerId: string; holeNumber: number } | null>(null)

  const front9 = holes.filter(h => h.hole_number <= 9)
  const back9 = holes.filter(h => h.hole_number > 9)

  const playerHcps = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of players) {
      map[p.id] = calculateCourseHandicap(p.handicap_index, courseSlope)
    }
    return map
  }, [players, courseSlope])

  const getScore = (playerId: string, holeNum: number) =>
    scores.find(s => s.player_id === playerId && s.hole_number === holeNum && s.round_id === roundId)

  const editingHole = editing ? holes.find(h => h.hole_number === editing.holeNumber) : null
  const editingPlayer = editing ? players.find(p => p.id === editing.playerId) : null
  const editingScore = editing ? getScore(editing.playerId, editing.holeNumber) : null

  const renderNine = (nineHoles: Hole[], label: string) => {
    // Calculate totals per player
    const totals = players.map(p => {
      let gross = 0, net = 0, count = 0
      for (const h of nineHoles) {
        const s = getScore(p.id, h.hole_number)
        if (s) {
          gross += s.gross_score
          const strokes = getStrokesForHole(playerHcps[p.id], h.stroke_index)
          net += s.gross_score - strokes
          count++
        }
      }
      return { gross, net, count }
    })

    return (
      <div className="mb-3">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">{label}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left py-1 px-1 font-medium w-8">#</th>
                {players.map(p => (
                  <th key={p.id} className="text-center py-1 px-0.5 font-medium truncate max-w-[60px]">
                    {p.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nineHoles.map(hole => (
                <tr key={hole.hole_number} className="border-t border-gray-50">
                  <td className="py-1 px-1 text-gray-400 font-medium">
                    {hole.hole_number}
                    <span className="text-[9px] text-gray-300 ml-0.5">P{hole.par}</span>
                  </td>
                  {players.map(p => {
                    const s = getScore(p.id, hole.hole_number)
                    const strokes = getStrokesForHole(playerHcps[p.id], hole.stroke_index)
                    return (
                      <td
                        key={p.id}
                        onClick={() => setEditing({ playerId: p.id, holeNumber: hole.hole_number })}
                        className="text-center py-1 px-0.5 cursor-pointer relative"
                      >
                        {strokes > 0 && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-forest" />
                        )}
                        {s ? (
                          <span className={`font-bold ${getHoleScoreColor(s.gross_score, hole.par)}`}>
                            {s.gross_score}
                          </span>
                        ) : (
                          <span className="text-gray-200">·</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-gray-200 font-bold">
                <td className="py-1 px-1 text-gray-400 text-[10px]">TOT</td>
                {totals.map((t, i) => (
                  <td key={i} className="text-center py-1 px-0.5 text-[11px]">
                    {t.count > 0 ? (
                      <>
                        <span className="text-gray-600">{t.gross}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-forest">{t.net}</span>
                      </>
                    ) : (
                      <span className="text-gray-200">-</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderNine(front9, 'Front 9')}
      {renderNine(back9, 'Back 9')}

      {/* Edit bottom sheet */}
      {editing && editingHole && editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full bg-white rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-1 text-sm text-gray-400">
              Hole {editingHole.hole_number} · Par {editingHole.par}
            </div>
            <ScoreStepperCompact
              playerName={editingPlayer.name}
              par={editingHole.par}
              gross={editingScore?.gross_score ?? editingHole.par}
              net={(editingScore?.gross_score ?? editingHole.par) - getStrokesForHole(playerHcps[editingPlayer.id], editingHole.stroke_index)}
              receivesStroke={getStrokesForHole(playerHcps[editingPlayer.id], editingHole.stroke_index) > 0}
              onChange={(newGross) => {
                onSubmitScore(editingPlayer.id, editingHole.hole_number, newGross)
              }}
            />
            <button
              onClick={() => setEditing(null)}
              className="w-full mt-3 py-2.5 bg-forest text-white rounded-xl font-semibold text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
