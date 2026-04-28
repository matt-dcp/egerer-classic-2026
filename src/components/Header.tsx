import { LogOut } from 'lucide-react'
import { useTournament, type SyncStatus } from '../lib/TournamentContext'

function SyncDot({ status }: { status: SyncStatus }) {
  const color =
    status === 'synced' ? 'bg-green-400' :
    status === 'pending' ? 'bg-amber-400' :
    'bg-red-400'
  const label =
    status === 'synced' ? 'Synced' :
    status === 'pending' ? 'Syncing...' :
    'Offline'

  return (
    <span className="flex items-center gap-1 text-[10px] text-white/60" title={label}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      {status !== 'synced' && <span>{label}</span>}
    </span>
  )
}

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { isAdmin, logout, players, currentPlayerId, syncStatus } = useTournament()
  const currentPlayer = players.find(p => p.id === currentPlayerId)

  return (
    <header className="bg-forest text-white px-4 pt-4 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {title || 'Egerer Classic'}
          </h1>
          <span
            className="px-1.5 py-0.5 bg-gold/15 text-gold text-[10px] font-bold uppercase rounded tracking-[0.2em] border border-gold/40"
            title="20th Annual Edition"
          >
            XX
          </span>
          {isAdmin && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-[11px] font-bold uppercase rounded tracking-wider">
              Demo
            </span>
          )}
          <SyncDot status={syncStatus} />
        </div>
        {isAdmin && currentPlayer && (
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-[11px] text-white/70 active:bg-white/20"
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
