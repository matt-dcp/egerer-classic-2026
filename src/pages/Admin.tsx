import { useState, useRef, useEffect, useMemo } from 'react'
import { Shield, Eye, EyeOff, Lock, Unlock, Megaphone, Users, ArrowLeftRight, Flame, Save, Trash2, ClipboardList } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Header from '../components/Header'

const ADMIN_PLAYER_ID = 'p2'

export default function Admin() {
  const {
    isAdmin, login, adminSettings, updateAdminSettings,
    players, teams, setTeams, strokePlayMatchups, bestBallPairings,
    setStrokePlayMatchups, setBestBallPairings, currentPlayerId,
    foursomes, createFoursome, deleteFoursome,
    scores, rounds,
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

        {/* Section: App Mode */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield size={14} /> App Mode
          </h3>
          <div className="flex items-center justify-between">
            <div>
              {isSupabaseConfigured ? (
                <>
                  <div className="text-sm font-bold text-green-600">LIVE MODE</div>
                  <div className="text-[11px] text-gray-400">Synced to Supabase — real-time across all devices</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-amber-600">DEMO MODE</div>
                  <div className="text-[11px] text-gray-400">Local data only — safe to test freely</div>
                </>
              )}
            </div>
            <button
              onClick={async () => {
                if (confirm('Reset all scores, matchups, foursomes, teams, and side games for everyone? This cannot be undone.')) {
                  // Clear all app localStorage keys (including identity/admin state)
                  localStorage.removeItem('ec-scores')
                  localStorage.removeItem('ec-foursomes')
                  localStorage.removeItem('ec-sidegames')
                  localStorage.removeItem('ec-stroke-matchups')
                  localStorage.removeItem('ec-bestball-pairings')
                  localStorage.removeItem('ec-teams')
                  localStorage.removeItem('ec-admin-settings')
                  localStorage.removeItem('ec-sync-queue')
                  localStorage.removeItem('ec-my-player-id')
                  localStorage.removeItem('ec-admin')
                  // Clear Supabase tables
                  try {
                    if (isSupabaseConfigured) {
                      await supabase.from('app_scores').delete().gte('id', '')
                      await supabase.from('foursomes').delete().gte('id', '')
                      await supabase.from('stroke_play_matchups').delete().gte('id', '')
                      await supabase.from('best_ball_pairings').delete().gte('id', '')
                      await supabase.from('teams').delete().gte('id', '')
                      await supabase.from('admin_settings').delete().gte('id', '')
                    }
                  } catch { /* ignore if Supabase unreachable */ }
                  window.location.reload()
                }
              }}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold"
            >
              Reset {isSupabaseConfigured ? 'All Data' : 'Demo Data'}
            </button>
          </div>
          {!isSupabaseConfigured && (
            <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
              Live mode (Supabase) will be enabled before tournament day. All demo data will be replaced with real-time data.
            </div>
          )}
        </div>

        {/* Section: Visibility Controls */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye size={14} /> Visibility Controls
          </h3>
          <p className="text-[11px] text-gray-400 mb-3">Toggle what players can see in the app</p>
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
                  <div className="text-[11px] text-gray-400">{item.desc}</div>
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
          <p className="text-[11px] text-gray-400 mb-3">Lock a round to prevent further score changes</p>
          <div className="space-y-2">
            {[
              { key: 'r1Locked' as const, label: 'Round 1', desc: 'Troon North – Monument' },
              { key: 'r2Locked' as const, label: 'Round 2', desc: 'We-Ko-Pa – Saguaro' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-[11px] text-gray-400">{item.desc}</div>
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

        {/* Section: Score Completion */}
        <ScoreCompletionGrid players={players} scores={scores} rounds={rounds} />

        {/* Section: Team Management */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Team Management
          </h3>
          <p className="text-[11px] text-gray-400 mb-3">Select captains and assign players to each team</p>
          <div className="space-y-4">
            {teams.map((team, ti) => {
              const roster = team.player_ids.map(id => players.find(p => p.id === id)).filter(Boolean)
              // Available to add: not on either team
              const allAssigned = new Set(teams.flatMap(t => t.player_ids))
              const available = players.filter(p => !allAssigned.has(p.id))

              return (
                <div key={team.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <input
                      type="text"
                      value={team.name}
                      onChange={e => {
                        const updated = [...teams]
                        updated[ti] = { ...team, name: e.target.value }
                        setTeams(updated)
                      }}
                      placeholder="Team name"
                      className="text-sm font-bold text-gray-900 bg-transparent border-b border-gray-200 focus:border-forest focus:outline-none flex-1 min-w-0"
                    />
                    <span className="text-[11px] text-gray-400 shrink-0">{team.player_ids.length} players</span>
                  </div>
                  {/* Captain selector */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] text-gray-500 font-semibold">Captain:</span>
                    {team.player_ids.length === 0 ? (
                      <span className="text-[11px] text-gray-400 italic">Add players — first becomes captain</span>
                    ) : (
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
                    )}
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
                        updated[ti] = {
                          ...team,
                          player_ids: [...team.player_ids, e.target.value],
                          // First player added becomes the captain by default
                          captain_id: team.captain_id || e.target.value,
                        }
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
          <p className="text-[11px] text-gray-400 mb-3">Custom message pinned to the news ticker</p>
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
            <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2">
              Active: "{adminSettings.announcement}"
            </div>
          )}
        </div>

        {/* ===== DAY 1 ===== */}
        <div className="bg-forest/10 rounded-lg px-3 py-2 text-xs font-bold text-forest uppercase tracking-wider">
          Day 1 — Round 1 · Troon North Monument
        </div>

        {/* Section: Day 1 Matchups Editor */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ArrowLeftRight size={14} /> Day 1 Matchups (1v1)
          </h3>
          <div className="space-y-2">
            {strokePlayMatchups.map((m, idx) => {
              // Full rosters in every dropdown — a player may appear in more
              // than one matchup (e.g. a solo player covering two matches).
              const teamAPlayers = teams.find(t => t.id === 'team-a')?.player_ids ?? []
              const teamBPlayers = teams.find(t => t.id === 'team-b')?.player_ids ?? []

              const isEmpty = !m.team_a_player_id && !m.team_b_player_id

              return (
                <div key={m.id} className={`p-2.5 rounded-lg border ${m.is_pressure_bet ? 'border-gold bg-gold/5' : isEmpty ? 'border-dashed border-gray-200' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-4">#{idx + 1}</span>
                      <select
                        value={m.team_a_player_id}
                        onChange={e => {
                          const updated = [...strokePlayMatchups]
                          updated[idx] = { ...m, team_a_player_id: e.target.value }
                          setStrokePlayMatchups(updated)
                        }}
                        className={`text-xs border border-gray-200 rounded px-1.5 py-1 ${!m.team_a_player_id ? 'text-gray-400' : ''}`}
                      >
                        <option value="">— Select —</option>
                        {teamAPlayers.filter(id => id).map(id => (
                          <option key={id} value={id}>{getName(id)}</option>
                        ))}
                      </select>
                      <span className="text-[11px] text-gray-400">vs</span>
                      <select
                        value={m.team_b_player_id}
                        onChange={e => {
                          const updated = [...strokePlayMatchups]
                          updated[idx] = { ...m, team_b_player_id: e.target.value }
                          setStrokePlayMatchups(updated)
                        }}
                        className={`text-xs border border-gray-200 rounded px-1.5 py-1 ${!m.team_b_player_id ? 'text-gray-400' : ''}`}
                      >
                        <option value="">— Select —</option>
                        {teamBPlayers.filter(id => id).map(id => (
                          <option key={id} value={id}>{getName(id)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
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
                      <button
                        onClick={() => { if (confirm('Remove this matchup?')) setStrokePlayMatchups(strokePlayMatchups.filter((_, i) => i !== idx)) }}
                        className="p-1.5 rounded-full text-red-400 active:bg-red-50"
                        title="Remove matchup"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => setStrokePlayMatchups([...strokePlayMatchups, {
              id: `sp-${Date.now()}`,
              round_id: 'r1',
              team_a_player_id: '',
              team_b_player_id: '',
              order: strokePlayMatchups.length + 1,
              is_pressure_bet: false,
            }])}
            className="mt-2 w-full py-2 rounded-lg border border-dashed border-forest/40 text-forest text-xs font-semibold active:bg-forest/5"
          >
            + Add Matchup
          </button>
        </div>

        {/* Section: R1 Foursomes (pair matchups) */}
        <R1FoursomePairer
          matchups={strokePlayMatchups}
          foursomes={foursomes.filter(f => f.round_id === 'r1')}
          getName={getName}
          onCreateFoursome={(ids) => createFoursome('r1', ids)}
          onDeleteFoursome={deleteFoursome}
        />

        {/* ===== DAY 2 ===== */}
        <div className="bg-forest/10 rounded-lg px-3 py-2 text-xs font-bold text-forest uppercase tracking-wider">
          Day 2 — Round 2 · We-Ko-Pa Saguaro
        </div>

        {/* Section: Day 2 Matchups Editor — same pattern as Day 1 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ArrowLeftRight size={14} /> Day 2 Matchups (2v2 Best Ball)
          </h3>
          <div className="space-y-2">
            {bestBallPairings.map((p, idx) => {
              // Players used in OTHER pairings (not this one)
              const usedTeamA = new Set(bestBallPairings.filter((_, i) => i !== idx).flatMap(x => x.team_a_player_ids))
              const usedTeamB = new Set(bestBallPairings.filter((_, i) => i !== idx).flatMap(x => x.team_b_player_ids))
              const teamAPool = (teams.find(t => t.id === 'team-a')?.player_ids ?? [])
                .filter(id => !usedTeamA.has(id) || p.team_a_player_ids.includes(id))
              const teamBPool = (teams.find(t => t.id === 'team-b')?.player_ids ?? [])
                .filter(id => !usedTeamB.has(id) || p.team_b_player_ids.includes(id))

              const isEmpty = !p.team_a_player_ids[0] && !p.team_b_player_ids[0]

              return (
                <div key={p.id} className={`p-2.5 rounded-lg border ${p.is_pressure_bet ? 'border-gold bg-gold/5' : isEmpty ? 'border-dashed border-gray-200' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-400">
                      Match #{idx + 1}{p.is_pressure_bet && <span className="text-gold font-bold ml-1.5">· Pressure (4 pts)</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const updated = [...bestBallPairings]
                          updated[idx] = { ...p, is_pressure_bet: !p.is_pressure_bet }
                          setBestBallPairings(updated)
                        }}
                        className={`p-1.5 rounded-full ${p.is_pressure_bet ? 'bg-gold text-white' : 'bg-gray-100 text-gray-400'}`}
                        title="Toggle pressure match"
                      >
                        <Flame size={12} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Remove this pairing?')) setBestBallPairings(bestBallPairings.filter((_, i) => i !== idx)) }}
                        className="p-1.5 rounded-full text-red-400 active:bg-red-50"
                        title="Remove matchup"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
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
                          className={`text-xs border border-gray-200 rounded px-1.5 py-1 w-full ${!p.team_a_player_ids[slot] ? 'text-gray-400' : ''}`}
                        >
                          <option value="">— Select —</option>
                          {teamAPool.filter(id => id).map(id => (
                            <option key={id} value={id}>{getName(id)}</option>
                          ))}
                        </select>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400">vs</span>
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
                          className={`text-xs border border-gray-200 rounded px-1.5 py-1 w-full ${!p.team_b_player_ids[slot] ? 'text-gray-400' : ''}`}
                        >
                          <option value="">— Select —</option>
                          {teamBPool.filter(id => id).map(id => (
                            <option key={id} value={id}>{getName(id)}</option>
                          ))}
                        </select>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => setBestBallPairings([...bestBallPairings, {
              id: `bb-${Date.now()}`,
              round_id: 'r2',
              team_a_player_ids: ['', ''],
              team_b_player_ids: ['', ''],
              order: bestBallPairings.length + 1,
              is_pressure_bet: false,
            }])}
            className="mt-2 w-full py-2 rounded-lg border border-dashed border-forest/40 text-forest text-xs font-semibold active:bg-forest/5"
          >
            + Add Pairing
          </button>
        </div>

        {/* Section: R2 Foursomes (pair best-ball matchups) */}
        <R2FoursomePairer
          pairings={bestBallPairings}
          foursomes={foursomes.filter(f => f.round_id === 'r2')}
          getName={getName}
          onCreateFoursome={(ids) => createFoursome('r2', ids)}
          onDeleteFoursome={deleteFoursome}
        />

      </div>
    </div>
  )
}

// --- Score Completion Grid ---
import type { Player as PlayerType, Score as ScoreType, Round as RoundType, StrokePlayMatchup, BestBallPairing, Foursome as FoursomeType } from '../lib/types'

function ScoreCompletionGrid({ players, scores, rounds }: {
  players: PlayerType[]
  scores: ScoreType[]
  rounds: RoundType[]
}) {
  const roundData = useMemo(() => {
    return rounds.map(round => {
      const playerHoles = players.map(player => {
        const count = scores.filter(
          s => s.round_id === round.id && s.player_id === player.id,
        ).length
        return { player, holesCompleted: count }
      })
      const maxHoles = Math.max(...playerHoles.map(ph => ph.holesCompleted), 0)
      const playersThrough9Plus = playerHoles.filter(ph => ph.holesCompleted >= 9).length
      return { round, playerHoles, maxHoles, playersThrough9Plus }
    })
  }, [players, scores, rounds])

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <ClipboardList size={14} /> Score Completion
      </h3>

      {/* Summary row */}
      <div className="flex gap-2 mb-3">
        {roundData.map(rd => (
          <div key={rd.round.id} className="flex-1 bg-gray-50 rounded-lg px-2.5 py-1.5 text-center">
            <div className="text-[11px] font-bold text-forest">R{rd.round.round_number}</div>
            <div className="text-[11px] text-gray-500">
              {rd.playersThrough9Plus}/{players.length} through 9+
            </div>
          </div>
        ))}
      </div>

      {/* Player grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-1.5 pr-2 text-gray-400 font-semibold">Player</th>
              {roundData.map(rd => (
                <th key={rd.round.id} className="text-center py-1.5 px-2 text-gray-400 font-semibold">
                  R{rd.round.round_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.id} className="border-b border-gray-50">
                <td className="py-1.5 pr-2 font-medium text-gray-700 whitespace-nowrap">
                  {player.name.split(' ').pop()}
                </td>
                {roundData.map(rd => {
                  const ph = rd.playerHoles.find(p => p.player.id === player.id)
                  const holes = ph?.holesCompleted ?? 0
                  const isBehind = holes < rd.maxHoles && rd.maxHoles > 0
                  const isComplete = holes === 18
                  return (
                    <td key={rd.round.id} className="text-center py-1.5 px-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded ${
                        isComplete
                          ? 'bg-green-50 text-green-700 font-bold'
                          : isBehind
                            ? 'bg-amber-50 text-amber-700 font-bold'
                            : holes === 0
                              ? 'text-gray-300'
                              : 'text-gray-600'
                      }`}>
                        {holes}/18
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- R1 Foursome Pairer: pair two 1v1 matchups ---

function R1FoursomePairer({ matchups, foursomes, getName, onCreateFoursome, onDeleteFoursome }: {
  matchups: StrokePlayMatchup[]
  foursomes: FoursomeType[]
  getName: (id: string) => string
  onCreateFoursome: (ids: [string, string, string, string]) => void
  onDeleteFoursome: (id: string) => void
}) {
  const [firstPick, setFirstPick] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const prevGroupCount = useRef(foursomes.length)

  // Auto-scroll to the active picker when a new group is created
  useEffect(() => {
    if (foursomes.length > prevGroupCount.current && pickerRef.current) {
      setTimeout(() => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
    prevGroupCount.current = foursomes.length
  }, [foursomes.length])

  // Which matchups are already in a foursome?
  const assignedMatchupIds = new Set<string>()
  for (const fs of foursomes) {
    for (const m of matchups) {
      if (fs.player_ids.includes(m.team_a_player_id) && fs.player_ids.includes(m.team_b_player_id)) {
        assignedMatchupIds.add(m.id)
      }
    }
  }

  // Only show matchups that have both players assigned and aren't in a foursome
  const available = matchups.filter(m => !assignedMatchupIds.has(m.id) && m.team_a_player_id && m.team_b_player_id)
  const nextGroupNum = foursomes.length + 1
  const allDone = available.length === 0 && foursomes.length > 0
  const totalGroups = Math.floor(matchups.length / 2)

  const [secondPick, setSecondPick] = useState<string | null>(null)

  const handleTap = (mId: string) => {
    if (!firstPick) {
      setFirstPick(mId)
      setSecondPick(null)
    } else if (firstPick === mId) {
      setFirstPick(null) // deselect
      setSecondPick(null)
    } else {
      setSecondPick(mId)
    }
  }

  const confirmGroup = () => {
    if (!firstPick || !secondPick) return
    const m1 = matchups.find(m => m.id === firstPick)
    const m2 = matchups.find(m => m.id === secondPick)
    if (m1 && m2) {
      onCreateFoursome([m1.team_a_player_id, m1.team_b_player_id, m2.team_a_player_id, m2.team_b_player_id])
    }
    setFirstPick(null)
    setSecondPick(null)
  }

  const renderMatchupLabel = (m: StrokePlayMatchup, highlight?: boolean) => (
    <span className={`flex items-center gap-1.5 ${highlight ? '' : ''}`}>
      {m.is_pressure_bet && <Flame size={10} className="text-gold" />}
      <span>{getName(m.team_a_player_id)}</span>
      <span className="text-gray-300">vs</span>
      <span>{getName(m.team_b_player_id)}</span>
    </span>
  )

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Users size={14} /> R1 Foursomes
      </h3>

      {/* Progress bar */}
      {matchups.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: totalGroups }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${i < foursomes.length ? 'bg-forest' : 'bg-gray-200'}`}
            />
          ))}
          <span className="text-[11px] text-gray-400">{foursomes.length}/{totalGroups}</span>
        </div>
      )}

      {/* Completed groups — render names straight from the foursome's stored
          player_ids ([m1.a, m1.b, m2.a, m2.b]); don't reconstruct from the
          matchups list, which can be incomplete or change after pairing. */}
      {foursomes.map((fs, fi) => {
        const groupPairs: [string, string][] = [
          [fs.player_ids[0], fs.player_ids[1]],
          [fs.player_ids[2], fs.player_ids[3]],
        ]
        const isPressure = (a: string, b: string) =>
          matchups.some(m => m.is_pressure_bet &&
            ((m.team_a_player_id === a && m.team_b_player_id === b) ||
             (m.team_a_player_id === b && m.team_b_player_id === a)))
        return (
          <div key={fs.id} className="mb-2 p-2.5 rounded-lg border border-green-100 bg-green-50/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-green-700">Group {fi + 1} ✓</span>
              <button onClick={() => { if (confirm('Delete this foursome?')) onDeleteFoursome(fs.id) }} className="text-red-400 p-1">
                <Trash2 size={12} />
              </button>
            </div>
            {groupPairs.map(([a, b], pi) => {
              const pb = isPressure(a, b)
              return (
                <div key={pi} className={`flex items-center gap-1.5 text-[11px] py-0.5 ${pb ? 'text-gold font-semibold' : 'text-gray-600'}`}>
                  {pb && <Flame size={10} className="text-gold" />}
                  <span>{getName(a)}</span>
                  <span className="text-gray-300">vs</span>
                  <span>{getName(b)}</span>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Active picker for next group */}
      {available.length >= 2 && (
        <div ref={pickerRef} className="mt-2 p-3 rounded-lg border-2 border-dashed border-forest/30 bg-forest/5">
          <div className="text-[11px] font-bold text-forest mb-2">
            Building Group {nextGroupNum} — tap 2 matchups
          </div>
          <div className="space-y-1.5">
            {available.map(m => {
              const isSelected = firstPick === m.id || secondPick === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => handleTap(m.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-medium transition-all text-left ${
                    isSelected
                      ? 'bg-forest text-white ring-2 ring-forest ring-offset-1'
                      : 'bg-white text-gray-600 border border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {renderMatchupLabel(m)}
                </button>
              )
            })}
          </div>
          {firstPick && !secondPick && (
            <div className="mt-2 text-[11px] text-forest/70">
              First matchup selected — tap another to complete Group {nextGroupNum}
            </div>
          )}
          {firstPick && secondPick && (
            <button
              onClick={confirmGroup}
              className="mt-3 w-full py-3 bg-forest text-white rounded-xl font-semibold text-sm"
            >
              Save Group {nextGroupNum} →
            </button>
          )}
        </div>
      )}

      {/* All done */}
      {allDone && (
        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-center">
          <div className="text-sm font-bold text-green-700">All {totalGroups} foursomes set ✓</div>
          <div className="text-[11px] text-green-600 mt-0.5">Tap the trash icon on any group to edit</div>
        </div>
      )}

      {matchups.length === 0 && (
        <div className="text-[11px] text-gray-400 mt-1">Set up Day 1 matchups first.</div>
      )}
    </div>
  )
}

// --- R2 Foursome Pairer: pair two 2v2 best-ball matchups ---
function R2FoursomePairer({ pairings, foursomes, getName, onCreateFoursome, onDeleteFoursome }: {
  pairings: BestBallPairing[]
  foursomes: FoursomeType[]
  getName: (id: string) => string
  onCreateFoursome: (ids: [string, string, string, string]) => void
  onDeleteFoursome: (id: string) => void
}) {

  // For R2 best ball, each pairing already has 4 players — it IS a foursome
  // So we just need to convert each pairing into a foursome directly
  const assignedPairingIds = new Set<string>()
  for (const fs of foursomes) {
    for (const p of pairings) {
      const pairingPlayers = [...p.team_a_player_ids, ...p.team_b_player_ids]
      if (pairingPlayers.every(id => fs.player_ids.includes(id))) {
        assignedPairingIds.add(p.id)
      }
    }
  }

  const available = pairings.filter(p => !assignedPairingIds.has(p.id))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Users size={14} /> R2 Foursomes
      </h3>
      <p className="text-[11px] text-gray-400 mb-3">
        Each 2v2 matchup is a foursome. Tap to create.
      </p>

      {/* Existing foursomes */}
      {foursomes.map((fs, fi) => (
        <div key={fs.id} className="mb-3 p-2.5 rounded-lg border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-400">Group {fi + 1}</span>
            <button onClick={() => onDeleteFoursome(fs.id)} className="text-red-400 p-1">
              <Trash2 size={12} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(fs.player_ids)].map(id => (
              <span key={id} className="px-2 py-0.5 bg-forest/10 text-forest text-[11px] font-medium rounded-full">
                {getName(id)}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Auto-create from available pairings */}
      {available.map(p => (
        <button
          key={p.id}
          onClick={() => {
            onCreateFoursome([...p.team_a_player_ids, ...p.team_b_player_ids] as [string, string, string, string])
          }}
          className="w-full mb-2 p-2.5 rounded-lg border border-dashed border-gray-200 text-left hover:border-forest transition-colors"
        >
          <div className="text-[11px] text-gray-400 mb-1">Tap to create foursome:</div>
          <div className="text-[11px] text-gray-600">
            {p.team_a_player_ids.map(id => getName(id)).join(' & ')}
            <span className="text-gray-300"> vs </span>
            {p.team_b_player_ids.map(id => getName(id)).join(' & ')}
          </div>
        </button>
      ))}
      {available.length === 0 && foursomes.length > 0 && (
        <div className="text-[11px] text-green-600 mt-1">All pairings set as foursomes.</div>
      )}
      {pairings.length === 0 && (
        <div className="text-[11px] text-gray-400 mt-1">Set up Day 2 matchups first.</div>
      )}
    </div>
  )
}
