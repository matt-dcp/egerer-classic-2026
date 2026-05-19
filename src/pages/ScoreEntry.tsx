import { useState, useMemo, useEffect } from 'react'
import { Minus, Plus, X, Flame, Trash2 } from 'lucide-react'
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

  const isRoundLocked = (roundId: string) => {
    if (roundId === 'r1') return adminSettings.r1Locked
    if (roundId === 'r2') return adminSettings.r2Locked
    return false
  }
  // Determine active round: R1 until locked, then R2
  const activeRoundId = adminSettings.r1Locked ? 'r2' : 'r1'
  const [selectedRound, setSelectedRound] = useState(activeRoundId)
  const [editingHole, setEditingHole] = useState<number | null>(null)
  const [editValue, setEditValue] = useState(4)

  // Admin foursome override — lets admin enter scores for any foursome
  const [adminFoursomeId, setAdminFoursomeId] = useState<string | null>(null)
  const roundFoursomes = foursomes.filter(f => f.round_id === selectedRound)

  // Auto-switch when R1 gets locked
  useEffect(() => {
    setSelectedRound(activeRoundId)
    setAdminFoursomeId(null)
  }, [activeRoundId])

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

  const handleHoleTap = (holeNum: number, par: number) => {
    if (isRoundLocked(selectedRound)) return
    setEditingHole(holeNum)
    setEditValue(getExistingScore(holeNum) ?? par)
  }

  const handleSaveHole = () => {
    if (editingHole === null || !myPlayerId) return
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
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
        {totals.count > 0 && (
          <span className="text-[11px] font-bold text-gray-500">
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
              <span className={`text-[11px] leading-tight ${isEditing ? 'text-white/60' : 'text-gray-400'}`}>
                {hole.hole_number}
              </span>
              {gross !== null ? (
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-[13px] font-bold ${isEditing ? 'text-white' : getHoleScoreColor(gross, hole.par)}`}>
                    {gross}
                  </span>
                  <span className={`text-[11px] ${isEditing ? 'text-white/50' : 'text-forest/60'}`}>/{net}</span>
                </div>
              ) : (
                <span className="text-[13px] font-bold text-gray-300">-</span>
              )}
              <span className={`text-[11px] leading-tight ${isEditing ? 'text-white/50' : 'text-gray-300'}`}>
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
            <div className="text-[11px] text-gray-400">HCP {myPlayer?.handicap_index} · Course HCP {courseHcp}</div>
          </div>
        </div>
      </div>

      {/* Admin foursome picker */}
      {isAdmin && roundFoursomes.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] text-gray-400 font-semibold shrink-0">Foursome:</span>
            <button
              onClick={() => setAdminFoursomeId(null)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                !adminFoursomeId ? 'bg-forest text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              My Group
            </button>
            {roundFoursomes.map((fs, i) => {
              const names = fs.player_ids.map(id => players.find(p => p.id === id)?.name.split(' ').pop() ?? '?')
              return (
                <button
                  key={fs.id}
                  onClick={() => setAdminFoursomeId(fs.id)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                    adminFoursomeId === fs.id ? 'bg-forest text-white' : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  G{i + 1}: {names.slice(0, 2).join('/')}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Admin round tab — only shows the active round (R1 until locked, then R2 only) */}

      {/* Round locked banner */}
      {isRoundLocked(selectedRound) && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium text-center">
          This round is locked. Scores cannot be changed.
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

        // Find the foursome for this round — admin can override to any foursome
        const myFoursome = (isAdmin && adminFoursomeId)
          ? foursomes.find(f => f.id === adminFoursomeId)
          : foursomes.find(f => f.round_id === selectedRound && f.player_ids.includes(myPlayerId))
        const foursomePlayers = myFoursome
          ? (myFoursome.player_ids.map(id => players.find(p => p.id === id)).filter(Boolean) as typeof players)
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
          // result is only non-'in_progress' once both players finish all 18 holes
          const isFinal = result.result !== 'in_progress'

          const isMyMatch = matchup.team_a_player_id === myPlayerId || matchup.team_b_player_id === myPlayerId
          const label = isMyMatch ? 'Your Match' : 'Foursome Match'

          return (
            <div key={matchup.id} className={`rounded-xl p-3 ${matchup.is_pressure_bet ? 'bg-gold/10 border border-gold/30' : 'bg-forest/5'}`}>
              {matchup.is_pressure_bet && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Flame size={12} className="text-gold" />
                  <span className="text-[11px] font-bold text-gold uppercase tracking-wider">Pressure Bet (2x)</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
                {bothHave && (
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    aWinning ? 'bg-green-100 text-green-700' : bWinning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {aWinning ? `${getName(matchup.team_a_player_id)} ${isFinal ? 'won' : 'leads'} by ${bVsPar - aVsPar}` : bWinning ? `${getName(matchup.team_b_player_id)} ${isFinal ? 'won' : 'leads'} by ${aVsPar - bVsPar}` : (isFinal ? 'Halved' : 'Tied')}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className={`text-xs font-bold ${isMyMatch && matchup.team_a_player_id === myPlayerId ? 'text-forest' : 'text-gray-700'}`}>{getName(matchup.team_a_player_id)}</div>
                  <div className={`text-lg font-bold ${aWinning ? 'text-green-700' : bWinning ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(aNet, aThru)}</div>
                  <div className="text-[11px] text-gray-400">thru {aThru}</div>
                </div>
                <div className="text-xs text-gray-400 px-2">vs</div>
                <div className="text-center flex-1">
                  <div className={`text-xs font-bold ${isMyMatch && matchup.team_b_player_id === myPlayerId ? 'text-forest' : 'text-gray-700'}`}>{getName(matchup.team_b_player_id)}</div>
                  <div className={`text-lg font-bold ${bWinning ? 'text-green-700' : aWinning ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(bNet, bThru)}</div>
                  <div className="text-[11px] text-gray-400">thru {bThru}</div>
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
          const isFinal = result.result !== 'in_progress'

          return (
            <div key={pairing.id} className={`rounded-xl p-3 ${pairing.is_pressure_bet ? 'bg-gold/10 border border-gold/30' : 'bg-forest/5'}`}>
              {pairing.is_pressure_bet && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Flame size={12} className="text-gold" />
                  <span className="text-[11px] font-bold text-gold uppercase tracking-wider">Pressure Match (4 pts)</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Your Match · Best Ball</div>
                {bothHave && (
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    weWin ? 'bg-green-100 text-green-700' : theyWin ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {weWin ? (isFinal ? 'Won' : 'Leading') : theyWin ? (isFinal ? 'Lost' : 'Trailing') : (isFinal ? 'Halved' : 'Tied')}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-forest">{[...new Set(myTeamIds)].map(getName).join(' & ')}</div>
                  <div className={`text-lg font-bold ${weWin ? 'text-green-700' : theyWin ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(myTotal, myThru)}</div>
                  <div className="text-[11px] text-gray-400">thru {myThru}</div>
                </div>
                <div className="text-xs text-gray-400 px-2">vs</div>
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-gray-600">{[...new Set(oppTeamIds)].map(getName).join(' & ')}</div>
                  <div className={`text-lg font-bold ${theyWin ? 'text-green-700' : weWin ? 'text-red-600' : 'text-gray-900'}`}>{fmtVsPar(oppTotal, oppThru)}</div>
                  <div className="text-[11px] text-gray-400">thru {oppThru}</div>
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
            {/* Score entry for all foursome players (above match cards for quick access) */}
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
                  onDeleteScore={(playerId, holeNum) => {
                    if (!isRoundLocked(selectedRound)) deleteScore(selectedRound, playerId, holeNum)
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
              </>
            )}

            {/* Match cards */}
            <div className="mx-4 mt-2 space-y-2">
              {relevantMatchups.map(renderStrokePlayCard)}
              {relevantPairings.map(renderBestBallCard)}
            </div>
          </>
        )
      })()}

      {/* Combined scorecard — all foursome players on one card, like a paper scorecard */}
      {(() => {
        const activeFoursome = foursomes.find(f =>
          (isAdmin && adminFoursomeId) ? f.id === adminFoursomeId : f.round_id === selectedRound && f.player_ids.includes(myPlayerId),
        )
        const cardPlayers = (activeFoursome
          ? activeFoursome.player_ids.map(id => players.find(p => p.id === id)).filter(Boolean)
          : myPlayer ? [myPlayer] : []) as typeof players

        if (!cardPlayers.length || !course) return null

        const roundScores = scores.filter(s => s.round_id === selectedRound)
        const slope = course.slope

        // Pre-compute per-player data
        const playerData = cardPlayers.map(p => {
          const cHcp = calculateCourseHandicap(p.handicap_index, slope)
          const pScores = roundScores.filter(s => s.player_id === p.id)
          return {
            player: p,
            courseHcp: cHcp,
            lastName: p.name.split(' ').pop() ?? '?',
            isMe: p.id === myPlayerId,
            getGross: (hn: number) => pScores.find(s => s.hole_number === hn)?.gross_score ?? null,
            getsStroke: (si: number) => getStrokesForHole(cHcp, si) > 0,
            getNet: (hn: number, g: number | null) => {
              if (g === null) return null
              const h = courseHoles.find(h => h.hole_number === hn)
              return h ? g - getStrokesForHole(cHcp, h.stroke_index) : g
            },
          }
        })

        const renderNine = (nineHoles: Hole[], label: string) => {
          const ninePar = nineHoles.reduce((s, h) => s + h.par, 0)
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-center border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-1 py-0.5 text-gray-400 font-medium text-left w-14 text-[11px] sticky left-0 z-10 bg-gray-50">{label}</th>
                    {nineHoles.map(h => <th key={h.hole_number} className="px-0 py-0.5 text-gray-400 font-medium min-w-[36px] text-[11px]">{h.hole_number}</th>)}
                    <th className="px-1 py-0.5 text-gray-600 font-bold text-[11px] min-w-[36px]">{label === 'Front 9' ? 'OUT' : 'IN'}</th>
                    {label === 'Back 9' && <th className="px-1 py-0.5 text-gray-600 font-bold text-[11px] min-w-[36px]">TOT</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 bg-gray-50/50">
                    <td className="px-1 py-0.5 text-gray-400 text-left text-[11px] font-medium sticky left-0 z-10 bg-[#fcfdfd]">Par</td>
                    {nineHoles.map(h => <td key={h.hole_number} className="px-0 py-0.5 text-gray-400 text-[11px]">{h.par}</td>)}
                    <td className="px-1 py-0.5 text-gray-500 font-bold text-[11px]">{ninePar}</td>
                    {label === 'Back 9' && <td className="px-1 py-0.5 text-gray-500 font-bold text-[11px]">{ninePar + front9.reduce((s, h) => s + h.par, 0)}</td>}
                  </tr>
                  {playerData.map(pd => {
                    let nineGross = 0, nineNet = 0, nineCount = 0
                    for (const h of nineHoles) {
                      const g = pd.getGross(h.hole_number)
                      if (g !== null) { nineGross += g; nineNet += pd.getNet(h.hole_number, g)!; nineCount++ }
                    }
                    // For total column on back 9
                    let frontGross = 0, frontNet = 0
                    if (label === 'Back 9') {
                      for (const h of front9) {
                        const g = pd.getGross(h.hole_number)
                        if (g !== null) { frontGross += g; frontNet += pd.getNet(h.hole_number, g)! }
                      }
                    }
                    const totalGross = frontGross + nineGross
                    const totalNet = frontNet + nineNet
                    const allCount = label === 'Back 9' ? (front9.reduce((c, h) => c + (pd.getGross(h.hole_number) !== null ? 1 : 0), 0) + nineCount) : nineCount

                    return (
                      <tr key={pd.player.id} className={`border-t ${pd.isMe ? 'bg-forest/5' : ''}`}>
                        <td className={`px-1 py-1 text-left text-[11px] font-bold sticky left-0 z-10 ${pd.isMe ? 'text-forest bg-[#f5f5f6]' : 'text-gray-600 bg-white'}`}>
                          {pd.lastName}
                        </td>
                        {nineHoles.map(h => {
                          const g = pd.getGross(h.hole_number)
                          const n = pd.getNet(h.hole_number, g)
                          const stroke = pd.getsStroke(h.stroke_index)
                          return (
                            <td key={h.hole_number} className="px-0 py-1 relative">
                              {stroke && (
                                <span className="absolute top-0 right-0.5 text-[5px] text-forest leading-none">●</span>
                              )}
                              {g !== null ? (
                                <span className={`text-[11px] font-bold ${getHoleScoreColor(n!, h.par)}`}>
                                  {g}{stroke && <span className="text-gray-400 font-normal">/{n}</span>}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-300">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-1 py-1 text-[11px] font-bold">
                          {nineCount > 0 ? (
                            <span className="text-gray-700">{nineGross}<span className="text-forest font-normal">/{nineNet}</span></span>
                          ) : '-'}
                        </td>
                        {label === 'Back 9' && (
                          <td className="px-1 py-1 text-[11px] font-bold">
                            {allCount > 0 ? (
                              <span className="text-gray-700">{totalGross}<span className="text-forest font-normal">/{totalNet}</span></span>
                            ) : '-'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }

        // Compute reactions for full-round players
        const reactions = playerData.map(pd => {
          let totalNet = 0, totalPar = 0, count = 0
          for (const h of courseHoles) {
            totalPar += h.par
            const g = pd.getGross(h.hole_number)
            if (g !== null) { totalNet += pd.getNet(h.hole_number, g)!; count++ }
          }
          return count === 18 ? { name: pd.lastName, ...getScoreReaction(totalNet - totalPar) } : null
        }).filter(Boolean)

        return (
          <div className="mx-4 mb-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-forest/10 px-3 py-2 flex items-center justify-between">
              <div className="text-[11px] font-bold text-forest uppercase tracking-wider">Scorecard</div>
              <div className="text-[11px] text-gray-400">{course.name} · {course.tee_name} Tees</div>
            </div>
            {renderNine(front9, 'Front 9')}
            <div className="border-t-2 border-gray-200" />
            {renderNine(back9, 'Back 9')}
            {/* Player legend with handicaps */}
            <div className="border-t border-gray-200 px-3 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {playerData.map(pd => (
                <span key={pd.player.id} className={`text-[11px] ${pd.isMe ? 'text-forest font-bold' : 'text-gray-500'}`}>
                  {pd.lastName} <span className="text-gray-400 font-normal">C{pd.courseHcp}</span>
                </span>
              ))}
              <span className="text-[11px] text-gray-400 ml-auto">● = stroke</span>
            </div>
            {reactions.length > 0 && (
              <div className="border-t border-forest/10 px-3 py-1.5 bg-forest/5 flex flex-wrap gap-3 justify-center">
                {reactions.map((r, i) => (
                  <span key={i} className="text-[11px]">
                    <span className="text-sm">{r!.emoji}</span>
                    <span className="font-semibold text-gray-600 ml-1">{r!.name}: {r!.text}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
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
                      if (editingHole !== null) deleteScore(selectedRound, myPlayerId, editingHole)
                      setEditingHole(null)
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-[11px] font-semibold"
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
            <div className="text-center text-[11px] text-gray-400 mt-1">gross / net</div>
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
