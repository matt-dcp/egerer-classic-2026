import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'
import { calculateCourseHandicap, getStrokesForHole, getHoleScoreColor } from '../lib/scoring'

export default function PlayerDetail() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const { players, rounds, courses, getHolesForCourse, getScoresForPlayerRound } = useTournament()

  const player = players.find(p => p.id === playerId)
  if (!player) return <div className="p-4">Player not found</div>

  return (
    <div>
      {/* Header */}
      <div className="bg-forest text-white px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-cream/70 text-sm mb-2">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="font-display text-xl font-bold">{player.name}</h1>
        <p className="text-cream/60 text-sm">HCP Index: {player.handicap_index}</p>
      </div>

      {/* Scorecards */}
      {rounds.map(round => {
        const course = courses.find(c => c.id === round.course_id)!
        const courseHoles = getHolesForCourse(round.course_id)
        const playerScores = getScoresForPlayerRound(player.id, round.id)
        const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
        const front9 = courseHoles.filter(h => h.hole_number <= 9)
        const back9 = courseHoles.filter(h => h.hole_number > 9)

        const getScore = (holeNum: number) => playerScores.find(s => s.hole_number === holeNum)

        const renderNine = (nineHoles: typeof courseHoles, label: string) => {
          let grossTotal = 0, netTotal = 0, parTotal = 0, count = 0
          const rows = nineHoles.map(hole => {
            const score = getScore(hole.hole_number)
            const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
            const gross = score?.gross_score ?? null
            const net = gross !== null ? gross - strokes : null
            if (gross !== null) {
              grossTotal += gross
              netTotal += net!
              count++
            }
            parTotal += hole.par
            return { hole, gross, net, strokes }
          })

          return (
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 px-3 py-1.5 bg-gray-50">{label}</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-2 py-1.5 text-gray-400 font-medium">Hole</th>
                    {rows.map(r => (
                      <th key={r.hole.hole_number} className="px-1 py-1.5 text-center text-gray-400 font-medium w-8">
                        {r.hole.hole_number}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-center text-gray-400 font-medium">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-2 py-1.5 text-gray-500 font-medium">Par</td>
                    {rows.map(r => (
                      <td key={r.hole.hole_number} className="px-1 py-1.5 text-center text-gray-500">{r.hole.par}</td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-semibold text-gray-500">{parTotal}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-2 py-1.5 text-gray-500 font-medium">Gross</td>
                    {rows.map(r => (
                      <td key={r.hole.hole_number} className={`px-1 py-1.5 text-center font-semibold ${getHoleScoreColor(r.gross, r.hole.par)}`}>
                        {r.gross ?? '-'}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-bold text-gray-700">{count > 0 ? grossTotal : '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-forest/5">
                    <td className="px-2 py-1.5 text-gray-500 font-medium">Net</td>
                    {rows.map(r => (
                      <td key={r.hole.hole_number} className="px-1 py-1.5 text-center font-semibold text-forest">
                        {r.net ?? '-'}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-bold text-forest">{count > 0 ? netTotal : '-'}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 text-[10px] text-gray-400">Strk</td>
                    {rows.map(r => (
                      <td key={r.hole.hole_number} className="px-1 py-1 text-center text-[10px] text-gray-400">
                        {r.strokes > 0 ? `+${r.strokes}` : ''}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        }

        return (
          <div key={round.id} className="bg-white mt-3 mx-3 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 bg-forest/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-forest">R{round.round_number}: {course.name}</div>
                <div className="text-[10px] text-gray-500">Course HCP: {courseHcp} · Slope: {course.slope} · Rating: {course.rating}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {renderNine(front9, 'OUT')}
              {renderNine(back9, 'IN')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
