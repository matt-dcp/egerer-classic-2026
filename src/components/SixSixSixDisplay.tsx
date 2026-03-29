import type { SixSixSixResult, Player } from '../lib/types'

interface Props {
  result: SixSixSixResult
  players: Player[]
}

export default function SixSixSixDisplay({ result, players }: Props) {
  const getName = (id: string) => { const n = players.find(p => p.id === id)?.name; return n?.split(' ').pop() ?? '?' }

  return (
    <div className="space-y-2">
      {result.segments.map(seg => {
        const t1Names = seg.team1Ids.map(getName).join(' + ')
        const t2Names = seg.team2Ids.map(getName).join(' + ')
        const holeRange = `H${seg.holes[0]}-${seg.holes[seg.holes.length - 1]}`

        return (
          <div key={seg.segment} className="bg-white rounded-lg p-2.5 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-400">{holeRange}</span>
              <span className="text-[10px] text-gray-400">{seg.holesCompleted}/6 holes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 text-center py-1 rounded ${
                seg.winner === 'team1' ? 'bg-forest/10 text-forest font-bold' : 'text-gray-600'
              }`}>
                <div className="text-[10px]">{t1Names}</div>
                <div className="text-sm font-bold">{seg.team1Total || '-'}</div>
              </div>
              <div className="text-xs text-gray-300 font-bold">vs</div>
              <div className={`flex-1 text-center py-1 rounded ${
                seg.winner === 'team2' ? 'bg-forest/10 text-forest font-bold' : 'text-gray-600'
              }`}>
                <div className="text-[10px]">{t2Names}</div>
                <div className="text-sm font-bold">{seg.team2Total || '-'}</div>
              </div>
            </div>
            {seg.winner === 'tie' && (
              <div className="text-center text-[10px] text-gray-400 mt-1">Halved</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
