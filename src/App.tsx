import { HashRouter, Routes, Route } from 'react-router-dom'
import { TournamentProvider, useTournament } from './lib/TournamentContext'
import Layout from './components/Layout'
import Onboarding from './components/Onboarding'
import Leaderboard from './pages/Leaderboard'
import ScoreEntry from './pages/ScoreEntry'
import Info from './pages/Info'
import Champions from './pages/Champions'
import PlayerDetail from './pages/PlayerDetail'
import Admin from './pages/Admin'

function AppShell() {
  const { isOnboarded } = useTournament()

  if (!isOnboarded) {
    return <Onboarding />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/scores" element={<ScoreEntry />} />
        <Route path="/info" element={<Info />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="/champions" element={
        <TournamentProvider><Champions /></TournamentProvider>
      } />
      <Route path="/player/:playerId" element={
        <TournamentProvider><PlayerDetail /></TournamentProvider>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <TournamentProvider>
        <AppShell />
      </TournamentProvider>
    </HashRouter>
  )
}
