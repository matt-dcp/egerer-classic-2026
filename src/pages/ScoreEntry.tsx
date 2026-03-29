import { useState, useMemo, useEffect } from 'react'
import { Minus, Plus, X, Users, User, Flame, Trash2 } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'
import { getHoleScoreColor, calculateCourseHandicap, getStrokesForHole } from '../lib/scoring'
import { computeStrokePlayResult, computeBestBallResult } from '../lib/teamCompetition'
import type { Hole } from '../lib/types'
import Header from '../components/Header'
import FoursomeHoleByHole from '../components/FoursomeHoleByHole'
import SideGameScoreboard from '../components/SideGameScoreboard'

export default function ScoreEntry() {
  const {
    isAdmin, players, rounds, courses, scores, getHolesForCourse,
    getScoresForPlayerRound, submitScore, deleteScore, adminSettings,
    foursomes, sideGameConfigs, addSideGame, removeSideGame,
    strokePlayMatchups, bestBallPairings, holes: allHoles,
    currentPlayerId,
  } = useTournament()

  const myPlayerId = currentPlayerId

  // R1 auto-locks when Day 2 matchups are published (visible)
  // R2 is hidden until Day 2 matchups are published
  const r2Published = adminSettings.showDay2Matchups
  const isRoundLocked = (roundId: string) => {
    if (roundId === 'r1') return adminSettings.r1Locked || r2Published
    if (roundId === 'r2') return adminSettings.r2Locked
    return false
  }
  const visibleRounds = rounds.filter(r => {
    if (r.id === 'r2' && !r2Published && !isAdmin) return false
    return true
  })

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || '')
  const [editingHole, setEditingHole] = useState<number | null>(null)
  const [editValue, setEditValue] = useState(4)
  const [viewMode, setViewMode] = useState<'mine' | 'foursome'>('mine')

  useEffect(() => {
    if (!selectedRound && rounds.length > 0) {
      setSelectedRound(rounds[0].id)
    }
  }, [rounds, selectedRound])

  // Auto-switch to R2 when it's published and R1 is locked (non-admin only)
  useEffect(() => {
    if (r2Published && selectedRound === 'r1' && !isAdmin) {
      setSelectedRound('r2')
    }
  }, [r2Published, selectedRound, isAdmin])

  const round = rounds.find(r => r.id === selectedRound)
  const course = round ? courses.find(c => c.id === round.course_id) : null
  const courseHoles = round ? getHolesForCourse(round.course_id) : []
  const playerScores = myPlayerId && round
    ? getScoresForPlayerRound(myPlayerId, round.id)
    : []
  const myPlayer = players.find(p => p.id === myPlayerId)

  const courseHcp = useMemo(() => {
    if (!myPlayer || !course) return 0
    return calculateCourseHandicap(myPlayer.handicap_index, course.slope)
  }, [myPlayer, course])

  // Onboarding handles PIN + name selection globally — no gates needed here

  // --- Main score entry UI ---
  const front9 = courseHoles.filter(h => h.hole_number <= 9)
  const back9 = courseHoles.filter(h => h.hole_number > 9)

  const getExistingScore = (holeNum: number) =>
    playerScores.find(s => s.hole_number === holeNum)?.gross_score ?? null

  const getNetForHole = (holeNum: number, gross: number | null) => {
    if (gross === null) return null
    const hole = courseHoles.find(h => h.hole_number === holeNum)
    if (!hole) return gross
    return gross - getStrokesForHole(courseHcp, hole.stroke_index)
  }

  const calcNineTotals = (holes: Hole[]) => {
    let grossTotal = 0, netTotal = 0, parTotal = 0, count = 0
    for (const hole of holes) {
      const gross = getExistingScore(hole.hole_number)
      parTotal += hole.par
      if (gross !== null) {
        grossTotal += gross
        netTotal += getNetForHole(hole.hole_number, gross)!
        count++
      }
    }
    return { grossTotal, netTotal, parTotal, count, complete: count === 9, netVsPar: netTotal - parTotal }
  }

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

  const getScoreReaction = (netVsPar: number) => {
    if (netVsPar <= -10) return { emoji: '🏆', text: pick(['A TRADITION UNLIKE ANY OTHER!', 'LEGENDARY! Your wife won\'t believe it!', 'Tiger who?!', 'The commish demands a recount!']) }
    if (netVsPar <= -6) return { emoji: '🔥', text: pick(['Absolutely cooking!', 'IN. YOUR. LIFE!', 'A spectacular round here in the desert!', 'Just be an athlete! And you were!']) }
    if (netVsPar <= -3) return { emoji: '😎', text: pick(['Playing lights out!', 'That\'s how it\'s done, friend', 'A round to remember!', 'Your wife won\'t believe it!']) }
    if (netVsPar <= -1) return { emoji: '💪', text: pick(['Great round!', 'Better than most out here', 'Way to grind it out!', 'That\'ll play!']) }
    if (netVsPar === 0) return { emoji: '🤝', text: pick(['Right on the number', 'Par golf wins tournaments', 'Steady as she goes']) }
    if (netVsPar <= 3) return { emoji: '😤', text: pick(['You\'re better than this', 'Remember...just be an athlete', 'Tomorrow is a new day', 'The course won today']) }
    if (netVsPar <= 7) return { emoji: '🍺', text: pick(['Let\'s hit the bar', 'The 19th hole awaits', 'Golf is hard. Beer is easy.', 'At least you looked good out there']) }
    if (netVsPar <= 12) return { emoji: '🏊', text: pick(['Pool sounds great right about now', 'The desert giveth and the desert taketh away', 'You came for the vibes, not the score', 'Your caddie has filed for divorce']) }
    return { emoji: '🪦', text: pick(['RIP', 'Have you considered pickleball?', 'That round will NOT be posted to GHIN', 'Even the cactus felt that one']) }
  }

  const frontTotals = calcNineTotals(front9)
  const backTotals = calcNineTotals(back9)
  const roundGross = frontTotals.grossTotal + backTotals.grossTotal
  const roundNet = frontTotals.netTotal + backTotals.netTotal
  const roundPar = frontTotals.parTotal + backTotals.parTotal
  const roundComplete = frontTotals.count + backTotals.count

  const handleHoleTap = (holeNum: number, par: number) => {
    if (isRoundLocked(selectedRound)) return
    setEditingHole(holeNum)
    setEditValue(getExistingScore(holeNum) ?? par)
  }

  const handleSaveHole = () => {
    if (editingHole === null) return
    submitScore(selectedRound, myPlayerId, editingHole, editValue)
    const nextHole = editingHole < 18 ? editingHole + 1 : null
    if (nextHole) {
      const nextPar = courseHoles.find(h => h.hole_number === nextHole)?.par ?? 4
      setEditingHole(nextHole)
      setEditValue(getExistingScore(nextHole) ?? nextPar)
    } else {
      setEditingHole(null)
    }
  }

  const renderHoleGrid = (holes: Hole[], label: string, totals: ReturnType<typeof calcNineTotals>) => (
    <div className="mb-3">
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
        {totals.count > 0 && (
          <span className="text-[10px] font-bold text-gray-500">
            {totals.grossTotal}<span className="text-gray-300">/</span><span className="text-forest">{totals.netTotal}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-9 gap-1">
        {holes.map(hole => {
          const gross = getExistingScore(hole.hole_number)
          const net = getNetForHole(hole.hole_number, gross)
          const isEditing = editingHole === hole.hole_number
          const strokesOnHole = getStrokesForHole(courseHcp, hole.stroke_index)
          return (
            <button
              key={hole.hole_number}
              onClick={() => handleHoleTap(hole.hole_number, hole.par)}
              className={`relative flex flex-col items-center py-1 rounded-lg transition-all ${
                isEditing ? 'bg-forest text-white ring-2 ring-forest'
                : gross !== null ? 'bg-white border border-gray-200'
                : 'bg-gray-50 border border-dashed border-gray-200'
              }`}
            >
              {strokesOnHole > 0 && (
                <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                  isEditing ? 'bg-white/70' : strokesOnHole > 1 ? 'bg-forest' : 'bg-forest/50'
                }`} />
              )}
              <span className={`text-[9px] leading-tight ${isEditing ? 'text-white/60' : 'text-gray-400'}`}>
                {hole.hole_number}
              </span>
              {gross !== null ? (
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-[13px] font-bold ${isEditing ? 'text-white' : getHoleScoreColor(gross, hole.par)}`}>
                    {gross}
                  </span>
                  <span className={`text-[9px] ${isEditing ? 'text-white/50' : 'text-forest/60'}`}>/{net}</span>
                </div>
              ) : (
                <span className="text-[13px] font-bold text-gray-300">-</span>
              )}
              <span className={`text-[8px] leading-tight ${isEditing ? 'text-white/50' : 'text-gray-300'}`}>
                P{hole.par}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div>
      <Header title="Score Entry" subtitle={course?.name || 'Select a round'} />

      {/* Player identity bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-forest text-white flex items-center justify-center text-xs font-bold">
            {myPlayer?.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{myPlayer?.name}</div>
            <div className="text-[10px] text-gray-400">HCP {myPlayer?.handicap_index} · Course HCP {courseHcp}</div>
          </div>
        </div>
      </div>

      {/* Round selector */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        {visibleRounds.map(r => {
          const c = courses.find(c => c.id === r.course_id)
          return (
            <button
              key={r.id}
              onClick={() => { setSelectedRound(r.id); setEditingHole(null) }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedRound === r.id ? 'bg-forest text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              R{r.round_number}: {c?.name.split('–')[1]?.trim() || c?.name}
            </button>
          )
        })}
      </div>

      {/* Round locked banner */}
      {isRoundLocked(selectedRound) && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium text-center">
          🔒 This round is locked. Scores cannot be changed.
        </div>
      )}

      {/* Match cards + foursome score entry */}
      {(() => {
        const getName = (id: string) => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?'
        const roundCourse = round ? courses.find(c => c.id === round.course_id) : null
        const roundHoles = round ? allHoles.filter(h => h.course_id === round.course_id) : []
        const slope = roundCourse?.slope ?? 113
        const par = roundCourse?.total_par ?? 72

        const parThru = (n: number) => [...roundHoles].sort((a, b) => a.hole_number - b.hole_number).slice(0, n).reduce((s, h) => s + h.par, 0)
        const fmtVsPar = (net: number | null, thru: number) => {
          if (net === null || thru === 0) return '-'
          const diff = net - parThru(thru)
          return diff === 0 ? 'E' : (diff > 0 ? `+${diff}` : `${diff}`)
        }

        // Find the foursome for this round
        const myFoursome = foursomes.find(f => f.round_id === selectedRound && f.player_ids.includes(myPlayerId))
        const foursomePlayers = myFoursome
          ? myFoursome.player_ids.map(id => players.find(p => p.id === id)!).filter(Boolean)
          : []
        const foursomeGameConfigs = myFoursome
          ? sideGameConfigs.filter(g => g.foursome_id === myFoursome.id)
          : []

        // Find all matches involving foursome players for this round
        const foursomeIds = myFoursome ? myFoursome.player_ids : [myPlayerId]
        const relevantMatchups = strokePlayMatchups.filter(m =>
          m.round_id === selectedRound && (foursomeIds.includes(m.team_a_player_id) || foursomeIds.includes(m.team_b_player_id)),
        )
        const relevantPairings = bestBallPairings.filter(p =>
          p.round_id === selectedRound && (
            p.team_a_player_ids.some(id => foursomeIds.includes(id)) || p.team_b_player_ids.some(id => foursomeIds.includes(id))
          ),
        )

        // Render a stroke play match card
        const renderStrokePlayCard = (matchup: typeof strokePlayMatchups[0]) => {
          const result = computeStrokePlayResult(matchup, scores, roundHoles, players, slope, par)
          const aNet = result.playerANetTotal
          const aThru = result.playerAThru
          const bNet = result.playerBNetTotal
          const bThru = result.playerBThru

          const bothHave = aNet !== null && bNet !== null && aThru > 0 && bThru > 0
          const aVsPar = aNet !== null ? aNet - parThru(aThru) : 0
          const bVsPar = bNet !== null ? bNet - parThru(bThru) : 0
          const aWinning = bothHave && aVsPar < bVsPar
          const bWinning = bothHave && bVsPar < aVsPar

          const isMyMatch = matchup.team_a_player_id === myPlayerId || matchup.team_b_player_id === myPlayerId
          const label = isMyMatch ? 'Your Match' : 'Foursome Match'

          return (
            <div key={matchup.id} className={`rounded-xl p-3 ${matchup.is_pressure_bet ? 'bg-gold/10 border border-gold/30' : 'bg-forest/5'}`}>
              {matchup.is_pressure_bet && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Flame size={12} className="text-gold" />
                  <span className="text-[9px] font-bold text-gold uppercase tracking-wider">Pressure Bet (2x)</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
                {bothHave && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    aWinning ? 'bg-green-100 text-green-700' : bWinning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {aWinning ? `${getName(matchup.team_a_player_id)} leads` : bWinning ? `${getName(matchup.team_b_player_id)} leads` : 'Tied'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className={`text-xs font-bold ${isMyMatch && matchup.team_a_player_id === myPlayerId ? 'text-forest' : 'text-gray-700'}`}>{getName(matchup.team_a_player_id)}</div>
                  <div className={`text-lg font-bold ${aWinning ? 'text-green-700' : bWinning ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(aNet, aThru)}</div>
                  <div className="text-[9px] text-gray-400">thru {aThru}</div>
                </div>
                <div className="text-xs text-gray-400 px-2">vs</div>
                <div className="text-center flex-1">
                  <div className={`text-xs font-bold ${isMyMatch && matchup.team_b_player_id === myPlayerId ? 'text-forest' : 'text-gray-700'}`}>{getName(matchup.team_b_player_id)}</div>
                  <div className={`text-lg font-bold ${bWinning ? 'text-green-700' : aWinning ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(bNet, bThru)}</div>
                  <div className="text-[9px] text-gray-400">thru {bThru}</div>
                </div>
              </div>
            </div>
          )
        }

        // Render a best ball match card
        const renderBestBallCard = (pairing: typeof bestBallPairings[0]) => {
          const result = computeBestBallResult(pairing, scores, roundHoles, players, slope, par)
          const isA = pairing.team_a_player_ids.includes(myPlayerId)
          const myTeamIds = isA ? pairing.team_a_player_ids : pairing.team_b_player_ids
          const oppTeamIds = isA ? pairing.team_b_player_ids : pairing.team_a_player_ids
          const myTotal = isA ? result.teamABestBallTotal : result.teamBBestBallTotal
          const myThru = isA ? result.teamAThru : result.teamBThru
          const oppTotal = isA ? result.teamBBestBallTotal : result.teamABestBallTotal
          const oppThru = isA ? result.teamBThru : result.teamAThru

          const bothHave = myTotal !== null && oppTotal !== null && myThru > 0 && oppThru > 0
          const myVP = myTotal !== null ? myTotal - parThru(myThru) : 0
          const oppVP = oppTotal !== null ? oppTotal - parThru(oppThru) : 0
          const weWin = bothHave && myVP < oppVP
          const theyWin = bothHave && oppVP < myVP

          return (
            <div key={pairing.id} className="bg-forest/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Your Match · Best Ball</div>
                {bothHave && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    weWin ? 'bg-green-100 text-green-700' : theyWin ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {weWin ? 'Leading' : theyWin ? 'Trailing' : 'Tied'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-forest">{myTeamIds.map(getName).join(' & ')}</div>
                  <div className={`text-lg font-bold ${weWin ? 'text-green-700' : theyWin ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(myTotal, myThru)}</div>
                  <div className="text-[9px] text-gray-400">thru {myThru}</div>
                </div>
                <div className="text-xs text-gray-400 px-2">vs</div>
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-gray-600">{oppTeamIds.map(getName).join(' & ')}</div>
                  <div className={`text-lg font-bold ${theyWin ? 'text-green-700' : weWin ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(oppTotal, oppThru)}</div>
                  <div className="text-[9px] text-gray-400">thru {oppThru}</div>
                </div>
              </div>
            </div>
          )
        }

        // Use foursome players if available, otherwise derive from match pairings
        const matchPlayerIds = new Set<string>()
        for (const m of relevantMatchups) {
          matchPlayerIds.add(m.team_a_player_id)
          matchPlayerIds.add(m.team_b_player_id)
        }
        for (const p of relevantPairings) {
          p.team_a_player_ids.forEach(id => matchPlayerIds.add(id))
          p.team_b_player_ids.forEach(id => matchPlayerIds.add(id))
        }
        const matchPlayers = [...matchPlayerIds].map(id => players.find(p => p.id === id)).filter(Boolean) as typeof players

        const entryPlayers = foursomePlayers.length >= 2 ? foursomePlayers
          : matchPlayers.length >= 2 ? matchPlayers
          : [myPlayer].filter(Boolean) as typeof players

        return (
          <>
            {/* Match cards */}
            <div className="mx-4 mt-2 space-y-2">
              {relevantMatchups.map(renderStrokePlayCard)}
              {relevantPairings.map(renderBestBallCard)}
            </div>

            {/* Score entry for all foursome players */}
            {entryPlayers.length > 1 && course ? (
              <div className="px-4 py-3">
                <FoursomeHoleByHole
                  holes={courseHoles}
                  players={entryPlayers}
                  scores={scores.filter(s => s.round_id === selectedRound)}
                  courseSlope={course.slope}
                  roundId={selectedRound}
                  onSubmitScore={(playerId, holeNum, gross) => {
                    if (!isRoundLocked(selectedRound)) submitScore(selectedRound, playerId, holeNum, gross)
                  }}
                />
                {myFoursome && (
                  <SideGameScoreboard
                    foursome={myFoursome}
                    players={entryPlayers}
                    scores={scores.filter(s => s.round_id === selectedRound)}
                    holes={courseHoles}
                    courseSlope={course.slope}
                    roundId={selectedRound}
                    gameConfigs={foursomeGameConfigs}
                    onAddGame={addSideGame}
                    onRemoveGame={(gameType) => removeSideGame(myFoursome.id, gameType)}
                  />
                )}
              </div>
            ) : (
              /* Fallback: single player scorecard */
              <>
                <div className="px-4 pt-3 pb-1">
                  <div className="text-[11px] text-gray-500 italic">Enter gross scores — net calculated automatically</div>
                </div>
                <div className="px-4 pb-1">
                  {renderHoleGrid(front9, 'Front 9', frontTotals)}
                  {renderHoleGrid(back9, 'Back 9', backTotals)}
                </div>
                {roundComplete > 0 && (() => {
                  const roundVsPar = roundNet - roundPar
                  const fullRound = roundComplete === 18
                  const reaction = fullRound ? getScoreReaction(roundVsPar) : null
                  return (
                    <div className="mx-4 mb-3 bg-forest/5 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-forest">Round Total</div>
                        <div className="flex items-center gap-3 text-sm">
                          <div><span className="text-[10px] text-gray-400 mr-1">Gross</span><span className="font-bold text-gray-700">{roundGross}</span></div>
                          <div><span className="text-[10px] text-gray-400 mr-1">Net</span><span className="font-bold text-forest">{roundNet}</span><span className="text-[10px] text-gray-400 ml-1">({roundVsPar >= 0 ? '+' : ''}{roundVsPar})</span></div>
                          <div className="text-[10px] text-gray-400">{roundComplete}/18</div>
                        </div>
                      </div>
                      {reaction && (
                        <div className="mt-2 pt-2 border-t border-forest/10 text-center">
                          <span className="text-2xl">{reaction.emoji}</span>
                          <span className="text-xs font-semibold text-gray-600 ml-2">{reaction.text}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            )}
          </>
        )
      })()}

      {/* Score input bottom sheet */}
      {editingHole !== null && (
        <div className="fixed inset-x-0 bottom-0 bg-white border-t-2 border-forest shadow-2xl rounded-t-2xl pb-[env(safe-area-inset-bottom)] z-50">
          <div className="max-w-lg mx-auto px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm text-gray-500">Hole {editingHole}</span>
                <span className="text-xs text-gray-400 ml-2">
                  Par {courseHoles.find(h => h.hole_number === editingHole)?.par}
                </span>
                {(() => {
                  const hole = courseHoles.find(h => h.hole_number === editingHole)
                  const strokes = hole ? getStrokesForHole(courseHcp, hole.stroke_index) : 0
                  return strokes > 0 ? (
                    <span className="text-xs text-forest ml-2">+{strokes} stroke{strokes > 1 ? 's' : ''}</span>
                  ) : null
                })()}
              </div>
              <div className="flex items-center gap-2">
                {getExistingScore(editingHole) !== null && (
                  <button
                    onClick={() => {
                      deleteScore(selectedRound, myPlayerId, editingHole!)
                      setEditingHole(null)
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-[10px] font-semibold"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                )}
                <button onClick={() => setEditingHole(null)} className="text-gray-400 p-1">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setEditValue(v => Math.max(1, v - 1))}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
              >
                <Minus size={24} className="text-gray-700" />
              </button>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-bold tabular-nums ${
                  getHoleScoreColor(editValue, courseHoles.find(h => h.hole_number === editingHole)?.par ?? 4)
                }`}>{editValue}</span>
                <span className="text-xl text-forest/50 font-bold tabular-nums">/{getNetForHole(editingHole, editValue)}</span>
              </div>
              <button
                onClick={() => setEditValue(v => Math.min(15, v + 1))}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
              >
                <Plus size={24} className="text-gray-700" />
              </button>
            </div>
            <div className="text-center text-[10px] text-gray-400 mt-1">gross / net</div>
            <button
              onClick={handleSaveHole}
              className="w-full mt-4 py-3.5 bg-forest text-white rounded-xl font-semibold text-sm active:bg-forest-light"
            >
              Save & Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
