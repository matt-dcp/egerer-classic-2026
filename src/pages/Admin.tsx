import { useState } from 'react'
import { Shield, Eye, EyeOff, Lock, Unlock, Megaphone, Users, ArrowLeftRight, Flame, Save, UserPlus, Trash2 } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'
import Header from '../components/Header'

const ADMIN_PLAYER_ID = 'p2'

export default function Admin() {
  const {
    isAdmin, login, adminSettings, updateAdminSettings,
    players, teams, setTeams, strokePlayMatchups, bestBallPairings,
    setStrokePlayMatchups, setBestBallPairings, currentPlayerId,
    foursomes, createFoursome, deleteFoursome, rounds,
  } = useTournament()

  const [pin, setPin] = useState('')
  const [announcement, setAnnouncement] = useState(adminSettings.announcement)

  // Only Matt Shamus can access admin
  if (!isAdmin || currentPlayerId !== ADMIN_PLAYER_ID) {
    return (
      <div>
        <Header title="Admin" subtitle="Tournament Control Panel" />
        <div className="px-6 py-12 text-center">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-4">Enter your PIN to access admin controls</p>
          <input
            type="tel"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-32 text-center text-2xl tracking-[0.5em] border-2 border-gray-200 rounded-xl py-2 focus:border-forest focus:outline-none mx-auto block"
            placeholder="····"
          />
          <button
            onClick={() => login(pin)}
            disabled={pin.length < 4}
            className="mt-4 px-6 py-2 bg-forest text-white rounded-full text-sm font-semibold disabled:opacity-40"
          >
            Unlock
          </button>
        </div>
      </div>
    )
  }

  const getName = (id: string) => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?'

  return (
    <div className="pb-24">
      <Header title="Admin" subtitle="Tournament Control Panel" />

      <div className="px-4 py-4 space-y-4">

        {/* Section: Visibility Controls */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye size={14} /> Visibility Controls
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">Toggle what players can see in the app</p>
          <div className="space-y-2">
            {([
              { key: 'showLeaderboard' as const, label: 'Leaderboard', desc: 'Individual standings' },
              { key: 'showTeams' as const, label: 'Teams Tab', desc: 'Team competition view' },
              { key: 'showDay1Matchups' as const, label: 'Day 1 Matchups', desc: 'Stroke play 1v1 pairings' },
              { key: 'showDay2Matchups' as const, label: 'Day 2 Matchups', desc: 'Best ball 2v2 pairings' },
              { key: 'showScoreEntry' as const, label: 'Score Entry', desc: 'Allow players to enter scores' },
            ]).map(item => (
              <div key={item.key} className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-[10px] text-gray-400">{item.desc}</div>
                </div>
                <button
                  onClick={() => updateAdminSettings({ [item.key]: !adminSettings[item.key] })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    adminSettings[item.key]
                      ? 'bg-forest text-white'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {adminSettings[item.key] ? <Eye size={12} /> : <EyeOff size={12} />}
                  {adminSettings[item.key] ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Round Locks */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lock size={14} /> Round Lock/Unlock
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">Lock a round to prevent further score changes</p>
          <div className="space-y-2">
            {[
              { key: 'r1Locked' as const, label: 'Round 1', desc: 'Troon North – Monument' },
              { key: 'r2Locked' as const, label: 'Round 2', desc: 'We-Ko-Pa – Saguaro' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-[10px] text-gray-400">{item.desc}</div>
                </div>
                <button
                  onClick={() => updateAdminSettings({ [item.key]: !adminSettings[item.key] })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    adminSettings[item.key]
                      ? 'bg-red-50 text-red-600'
                      : 'bg-forest text-white'
                  }`}
                >
                  {adminSettings[item.key] ? <Lock size={12} /> : <Unlock size={12} />}
                  {adminSettings[item.key] ? 'Locked' : 'Open'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Team Management */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Team Management
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">Select captains and assign players to each team</p>
          <div className="space-y-4">
            {teams.map((team, ti) => {
              const otherTeam = teams[ti === 0 ? 1 : 0]
              const captain = players.find(p => p.id === team.captain_id)
              const roster = team.player_ids.map(id => players.find(p => p.id === id)).filter(Boolean)
              // Available to add: not on either team
              const allAssigned = new Set([...teams[0].player_ids, ...teams[1].player_ids])
              const available = players.filter(p => !allAssigned.has(p.id))

              return (
                <div key={team.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-gray-900">{team.name}</div>
                    <span className="text-[10px] text-gray-400">{team.player_ids.length} players</span>
                  </div>
                  {/* Captain selector */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-gray-500 font-semibold">Captain:</span>
                    <select
                      value={team.captain_id}
                      onChange={e => {
                        const updated = [...teams]
                        updated[ti] = { ...team, captain_id: e.target.value }
                        setTeams(updated)
                      }}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      {team.player_ids.map(id => (
                        <option key={id} value={id}>{getName(id)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Roster */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {roster.map(p => (
                      <div key={p!.id} className="flex items-center gap-1 px-2 py-0.5 bg-forest/10 rounded-full">
                        <span className="text-[11px] font-medium text-forest">
                          {p!.id === team.captain_id ? '👑 ' : ''}{getName(p!.id)}
                        </span>
                        <button
                          onClick={() => {
                            const updated = [...teams]
                            updated[ti] = {
                              ...team,
                              player_ids: team.player_ids.filter(id => id !== p!.id),
                              captain_id: team.captain_id === p!.id ? team.player_ids.find(id => id !== p!.id) || '' : team.captain_id,
                            }
                            setTeams(updated)
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add player */}
                  {available.length > 0 && (
                    <select
                      value=""
                      onChange={e => {
                        if (!e.target.value) return
                        const updated = [...teams]
                        updated[ti] = { ...team, player_ids: [...team.player_ids, e.target.value] }
                        setTeams(updated)
                      }}
                      className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-400 w-full"
                    >
                      <option value="">+ Add player...</option>
                      {available.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Section: Announcement Banner */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Megaphone size={14} /> Announcement
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">Custom message pinned to the news ticker</p>
          <textarea
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            placeholder="e.g. Dinner at 7pm at the hotel restaurant"
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 focus:border-forest focus:outline-none resize-none"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                updateAdminSettings({ announcement })
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-forest text-white rounded-full text-xs font-semibold"
            >
              <Save size={12} /> Set Announcement
            </button>
            {adminSettings.announcement && (
              <button
                onClick={() => {
                  setAnnouncement('')
                  updateAdminSettings({ announcement: '' })
                }}
                className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>
          {adminSettings.announcement && (
            <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 rounded-lg p-2">
              Active: "{adminSettings.announcement}"
            </div>
          )}
        </div>

        {/* Section: Foursome Assignment */}
        {rounds.map(r => {
          const roundFoursomes = foursomes.filter(f => f.round_id === r.id)
          const assignedPlayerIds = new Set(roundFoursomes.flatMap(f => f.player_ids))
          const unassigned = players.filter(p => !assignedPlayerIds.has(p.id))

          return (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} /> R{r.round_number} Foursomes
              </h3>
              <p className="text-[10px] text-gray-400 mb-3">
                Group players into foursomes for round {r.round_number}. {unassigned.length} unassigned.
              </p>

              {/* Existing foursomes */}
              {roundFoursomes.map((fs, fi) => (
                <div key={fs.id} className="mb-3 p-2.5 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400">Group {fi + 1}</span>
                    <button
                      onClick={() => deleteFoursome(fs.id)}
                      className="text-red-400 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fs.player_ids.map(id => (
                      <span key={id} className="px-2 py-0.5 bg-forest/10 text-forest text-[11px] font-medium rounded-full">
                        {getName(id)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quick-add foursome from unassigned */}
              {unassigned.length >= 4 && (
                <FoursomeQuickAdd
                  unassigned={unassigned}
                  onAdd={(ids) => createFoursome(r.id, ids as [string, string, string, string])}
                  getName={getName}
                />
              )}
              {unassigned.length > 0 && unassigned.length < 4 && (
                <div className="text-[10px] text-orange-500 mt-1">
                  {unassigned.length} player{unassigned.length > 1 ? 's' : ''} remaining: {unassigned.map(p => getName(p.id)).join(', ')}
                </div>
              )}
            </div>
          )
        })}

        {/* Section: Day 1 Matchups Editor */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ArrowLeftRight size={14} /> Day 1 Matchups (1v1)
          </h3>
          <div className="space-y-2">
            {strokePlayMatchups.map((m, idx) => (
              <div key={m.id} className={`p-2.5 rounded-lg border ${m.is_pressure_bet ? 'border-gold bg-gold/5' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-4">#{m.order}</span>
                    <select
                      value={m.team_a_player_id}
                      onChange={e => {
                        const updated = [...strokePlayMatchups]
                        updated[idx] = { ...m, team_a_player_id: e.target.value }
                        setStrokePlayMatchups(updated)
                      }}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1"
                    >
                      {teams.find(t => t.id === 'team-a')?.player_ids.map(id => (
                        <option key={id} value={id}>{getName(id)}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-400">vs</span>
                    <select
                      value={m.team_b_player_id}
                      onChange={e => {
                        const updated = [...strokePlayMatchups]
                        updated[idx] = { ...m, team_b_player_id: e.target.value }
                        setStrokePlayMatchups(updated)
                      }}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1"
                    >
                      {teams.find(t => t.id === 'team-b')?.player_ids.map(id => (
                        <option key={id} value={id}>{getName(id)}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const updated = [...strokePlayMatchups]
                      updated[idx] = { ...m, is_pressure_bet: !m.is_pressure_bet }
                      setStrokePlayMatchups(updated)
                    }}
                    className={`p-1.5 rounded-full ${m.is_pressure_bet ? 'bg-gold text-white' : 'bg-gray-100 text-gray-400'}`}
                    title="Toggle pressure bet"
                  >
                    <Flame size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Day 2 Matchups Editor */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Day 2 Matchups (2v2)
          </h3>
          <div className="space-y-2">
            {bestBallPairings.map((p, idx) => (
              <div key={p.id} className="p-2.5 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 mb-1">Match #{p.order}</div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="space-y-1">
                    {[0, 1].map(slot => (
                      <select
                        key={slot}
                        value={p.team_a_player_ids[slot]}
                        onChange={e => {
                          const updated = [...bestBallPairings]
                          const newIds = [...p.team_a_player_ids] as [string, string]
                          newIds[slot] = e.target.value
                          updated[idx] = { ...p, team_a_player_ids: newIds }
                          setBestBallPairings(updated)
                        }}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 w-full"
                      >
                        {teams.find(t => t.id === 'team-a')?.player_ids.map(id => (
                          <option key={id} value={id}>{getName(id)}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">vs</span>
                  <div className="space-y-1">
                    {[0, 1].map(slot => (
                      <select
                        key={slot}
                        value={p.team_b_player_ids[slot]}
                        onChange={e => {
                          const updated = [...bestBallPairings]
                          const newIds = [...p.team_b_player_ids] as [string, string]
                          newIds[slot] = e.target.value
                          updated[idx] = { ...p, team_b_player_ids: newIds }
                          setBestBallPairings(updated)
                        }}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 w-full"
                      >
                        {teams.find(t => t.id === 'team-b')?.player_ids.map(id => (
                          <option key={id} value={id}>{getName(id)}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// --- Quick-add foursome helper ---
import type { Player } from '../lib/types'

function FoursomeQuickAdd({ unassigned, onAdd, getName }: {
  unassigned: Player[]
  onAdd: (ids: string[]) => void
  getName: (id: string) => string
}) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev,
    )
  }

  return (
    <div className="mt-2">
      <div className="text-[10px] font-semibold text-gray-500 mb-1.5">Add Foursome ({selected.length}/4)</div>
      <div className="flex flex-wrap gap-1.5">
        {unassigned.map(p => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              selected.includes(p.id) ? 'bg-forest text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getName(p.id)}
          </button>
        ))}
      </div>
      {selected.length === 4 && (
        <button
          onClick={() => { onAdd(selected); setSelected([]) }}
          className="mt-2 flex items-center gap-1.5 px-4 py-1.5 bg-forest text-white rounded-full text-xs font-semibold"
        >
          <UserPlus size={12} /> Create Foursome
        </button>
      )}
    </div>
  )
}
