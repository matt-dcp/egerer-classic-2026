import { NavLink } from 'react-router-dom'
import { Trophy, PencilLine, Calendar, Lock, Shield } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'

// Only Matt Shamus (p2) sees the Admin tab
const ADMIN_PLAYER_ID = 'p2'

export default function BottomNav() {
  const { isAdmin, currentPlayerId } = useTournament()
  const isSuperAdmin = isAdmin && currentPlayerId === ADMIN_PLAYER_ID

  const navItems = [
    { to: '/', icon: Trophy, label: 'Leaderboard' },
    { to: '/scores', icon: PencilLine, label: 'Scores' },
    { to: '/info', icon: Calendar, label: 'Info' },
    ...(isSuperAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'text-forest' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {to === '/scores' && !isAdmin && (
                    <Lock size={10} className="absolute -top-1 -right-2 text-gold" />
                  )}
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
