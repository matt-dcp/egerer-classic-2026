import { useTournament } from '../lib/TournamentContext'

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { isAdmin } = useTournament()

  return (
    <header className="bg-forest text-white px-4 pt-4 pb-5">
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
      {subtitle && <p className="text-cream/70 text-sm mt-0.5">{subtitle}</p>}
    </header>
  )
}
