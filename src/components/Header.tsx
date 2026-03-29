import { LogOut } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { isAdmin, logout, players, currentPlayerId } = useTournament()
  const currentPlayer = players.find(p => p.id === currentPlayerId)

  return (
    <header className="bg-forest text-white px-4 pt-4 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {title || 'Egerer Classic'}
          </h1>
          {isAdmin && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-[9px] font-bold uppercase rounded tracking-wider">
              Demo
            </span>
          )}
        </div>
        {isAdmin && currentPlayer && (
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-[10px] text-white/70 active:bg-white/20"
            title="Switch player"
          >
            <LogOut size={12} />
            {currentPlayer.name.split(' ')[0]}
          </button>
        )}
      </div>
      {subtitle && <p className="text-cream/70 text-sm mt-0.5">{subtitle}</p>}
    </header>
  )
}
