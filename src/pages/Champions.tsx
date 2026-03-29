import { ArrowLeft, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTournament } from '../lib/TournamentContext'

export default function Champions() {
  const { champions } = useTournament()
  const navigate = useNavigate()

  const sorted = [...champions].sort((a, b) => b.year - a.year)

  return (
    <div>
      <div className="bg-forest text-white px-4 pt-4 pb-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-cream/70 text-sm mb-2">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <Trophy size={28} className="text-gold" />
          <div>
            <h1 className="font-display text-xl font-bold">Champions Wall</h1>
            <p className="text-cream/60 text-xs">Egerer Classic Hall of Fame</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="space-y-2">
          {sorted.map(champ => (
            <div
              key={champ.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                champ.player_name === 'TBD'
                  ? 'bg-gray-50 border border-dashed border-gray-200'
                  : 'bg-white shadow-sm border border-gold/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {champ.player_name !== 'TBD' && (
                  <Trophy size={16} className="text-gold shrink-0" />
                )}
                <span className={`text-sm font-semibold ${
                  champ.player_name === 'TBD' ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  {champ.player_name}
                </span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${
                champ.player_name === 'TBD' ? 'text-gray-300' : 'text-forest'
              }`}>
                {champ.year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
