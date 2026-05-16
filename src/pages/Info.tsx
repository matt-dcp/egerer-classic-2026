import { useMemo } from 'react'
import { MapPin, Calendar, Trophy, ChevronRight, ExternalLink, Navigation, BookOpen, DollarSign, Flame, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTournament } from '../lib/TournamentContext'
import { calculateCourseHandicap, getStrokesForHole } from '../lib/scoring'
import Header from '../components/Header'
import RoundHighlights from '../components/RoundHighlights'
import type { Score, Hole, Player, Course, Round } from '../lib/types'

const schedule = [
  { day: 'Thursday, May 28', events: ['Arrive at Global Ambassador Hotel', 'Dinner & Player Draft'] },
  { day: 'Friday, May 29', events: ['Round 1: Troon North – Monument Course', 'Evening: TBD'] },
  { day: 'Saturday, May 30', events: ['Round 2: We-Ko-Pa – Saguaro Course', 'Awards Dinner & Trophy Ceremony'] },
  { day: 'Sunday, May 31', events: ['Checkout & Depart'] },
]

const courseDetails: Record<string, { website: string; mapsUrl: string; address: string; subtitle: string }> = {
  'troon-monument': {
    website: 'https://www.troonnorthgolf.com/',
    mapsUrl: 'https://maps.google.com/?q=Troon+North+Golf+Club,+10320+E+Dynamite+Blvd,+Scottsdale,+AZ+85262',
    address: '10320 E Dynamite Blvd, Scottsdale, AZ 85262',
    subtitle: 'Scottsdale, AZ',
  },
  'wekopa-saguaro': {
    website: 'https://www.wekopa.com/golf',
    mapsUrl: 'https://maps.google.com/?q=We-Ko-Pa+Golf+Club,+18200+E+Toh+Vee+Circle,+Fort+McDowell,+AZ+85264',
    address: '18200 E Toh Vee Circle, Fort McDowell, AZ 85264',
    subtitle: 'Fort McDowell, AZ',
  },
}

const hotelMapsUrl = 'https://maps.google.com/?q=Global+Ambassador+Hotel,+Scottsdale,+AZ'

export default function Info() {
  const { courses, champions, scores, players, rounds, getHolesForCourse } = useTournament()
  const navigate = useNavigate()

  const sortedChampions = [...champions].filter(c => c.player_name !== 'TBD').sort((a, b) => b.year - a.year)

  return (
    <div>
      <Header title="Egerer Classic" subtitle={`"If it ain't broke, don't fix it!"`} />

      {/* Round Highlights */}
      <RoundHighlights />

      {/* Round Stats */}
      <RoundStats
        rounds={rounds}
        courses={courses}
        players={players}
        scores={scores}
        getHolesForCourse={getHolesForCourse}
      />

      {/* Tournament Format & Rules */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen size={16} className="text-forest" /> Tournament Format & Rules
        </h2>
        <div className="space-y-2">
          {/* Overview */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5">Overview</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>20 players, 2 rounds of 18 holes</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Individual champion = lowest 36-hole net score</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Team competition: captains draft 10-player teams on opening night</div>
            </div>
          </div>

          {/* Day 1 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5">Day 1 — Stroke Play (1v1)</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Captains set 10 head-to-head matchups</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Lower 18-hole net score wins = 1 point</div>
              <div className="flex items-start gap-2">
                <Flame size={14} className="text-gold mt-0.5 shrink-0" />
                <span>One <span className="font-semibold text-gold">pressure bet</span> per team = 2 points</span>
              </div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>12 total points available</div>
            </div>
          </div>

          {/* Day 2 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5">Day 2 — Best Ball (2v2)</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Captains set 5 twosome matchups</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Lower 18-hole net best ball wins = 2 points</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>10 total points available</div>
            </div>
          </div>

          {/* Payouts */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5 flex items-center gap-1.5">
              <DollarSign size={14} className="text-gold" /> Payouts
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Buy-in: $200/player ($3,200 total)</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Winning team: each player gets $200 back + $100 profit</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Individual prizes ($1,800):</div>
            </div>
            <div className="mt-1.5 ml-5 grid grid-cols-3 gap-2">
              <div className="bg-gold/10 rounded-lg p-2 text-center">
                <div className="text-[11px] text-gray-500 font-semibold">1st Place</div>
                <div className="text-sm font-bold text-forest">$1,080</div>
                <div className="text-[11px] text-gray-400">60%</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-2 text-center">
                <div className="text-[11px] text-gray-500 font-semibold">2nd Place</div>
                <div className="text-sm font-bold text-gray-700">$450</div>
                <div className="text-[11px] text-gray-400">25%</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-2 text-center">
                <div className="text-[11px] text-gray-500 font-semibold">3rd Place</div>
                <div className="text-sm font-bold text-gray-700">$270</div>
                <div className="text-[11px] text-gray-400">15%</div>
              </div>
            </div>
          </div>

          {/* Local Rules */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5">Local Rules</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>OB: Take lateral relief (no re-teeing)</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Handicap strokes off the course rating</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>One player per foursome must keep score in the official Egerer Classic app</div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-forest" /> Schedule
        </h2>
        <div className="space-y-3">
          {schedule.map(day => (
            <div key={day.day} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs font-bold text-forest mb-1.5">{day.day}</div>
              {day.events.map((event, i) => (
                <div key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gold mt-1">•</span>
                  {event}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Champions */}
      <div className="px-4 py-2">
        <button
          onClick={() => navigate('/champions')}
          className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-gold" />
            <div className="text-left">
              <div className="text-sm font-bold text-gray-900">Champions Wall</div>
              <div className="text-xs text-gray-500">
                {sortedChampions.length} champions{sortedChampions.length > 0 ? ` · Since ${sortedChampions[sortedChampions.length - 1].year}` : ''}
              </div>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Destinations */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-forest" /> Destinations
        </h2>
        <div className="space-y-2">
          {/* Golf courses */}
          {courses.map(course => {
            const details = courseDetails[course.id]
            return (
              <a
                key={course.id}
                href={details?.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-forest/5 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-forest mb-0.5">{course.name}</div>
                    <div className="text-xs text-gray-600">{details?.subtitle}</div>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] text-gray-500">
                      <span>Par {course.total_par}</span>
                      <span>Slope {course.slope}</span>
                      <span>Rating {course.rating}</span>
                      <span className="font-semibold text-forest">{course.tee_name} Tees</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-forest shrink-0 ml-3">
                    <Navigation size={16} />
                    <ExternalLink size={12} className="text-gray-400" />
                  </div>
                </div>
              </a>
            )
          })}

          {/* Hotel */}
          <a
            href={hotelMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-forest/5 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-forest mb-0.5">Global Ambassador Hotel</div>
                <div className="text-xs text-gray-600">Scottsdale, AZ</div>
                <div className="text-xs text-gray-500 mt-1">May 28–31, 2026</div>
              </div>
              <div className="flex items-center gap-1 text-forest shrink-0 ml-3">
                <Navigation size={16} />
                <ExternalLink size={12} className="text-gray-400" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

// --- Round Stats Component ---
function RoundStats({ rounds, courses, players, scores, getHolesForCourse }: {
  rounds: Round[]
  courses: Course[]
  players: Player[]
  scores: Score[]
  getHolesForCourse: (courseId: string) => Hole[]
}) {
  const roundStats = useMemo(() => {
    return rounds.map(round => {
      const course = courses.find(c => c.id === round.course_id)
      if (!course) return null
      const holes = getHolesForCourse(round.course_id)
      const roundScores = scores.filter(s => s.round_id === round.id)

      // Check if round has meaningful data (at least one player with 9+ holes)
      const maxHolesAnyPlayer = Math.max(
        ...players.map(p => roundScores.filter(s => s.player_id === p.id).length),
        0,
      )
      if (maxHolesAnyPlayer < 9) return null

      // Per-player breakdown
      const playerBreakdowns = players.map(player => {
        const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
        let birdies = 0, pars = 0, bogeys = 0, doubles = 0, eagles = 0
        let holesPlayed = 0

        for (const hole of holes) {
          const sc = roundScores.find(s => s.player_id === player.id && s.hole_number === hole.hole_number)
          if (!sc) continue
          holesPlayed++
          const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
          const netVsPar = sc.gross_score - strokes - hole.par
          if (netVsPar <= -2) eagles++
          else if (netVsPar === -1) birdies++
          else if (netVsPar === 0) pars++
          else if (netVsPar === 1) bogeys++
          else doubles++
        }

        return {
          player,
          holesPlayed,
          eagles,
          birdies,
          pars,
          bogeys,
          doubles,
        }
      }).filter(pb => pb.holesPlayed > 0)
        .sort((a, b) => b.birdies + b.eagles * 2 - (a.birdies + a.eagles * 2))

      // Hole difficulty: average net score relative to par
      const holeDifficulty = holes.map(hole => {
        let totalNetVsPar = 0
        let count = 0
        for (const player of players) {
          const sc = roundScores.find(s => s.player_id === player.id && s.hole_number === hole.hole_number)
          if (!sc) continue
          const courseHcp = calculateCourseHandicap(player.handicap_index, course.slope)
          const strokes = getStrokesForHole(courseHcp, hole.stroke_index)
          totalNetVsPar += sc.gross_score - strokes - hole.par
          count++
        }
        return {
          holeNumber: hole.hole_number,
          par: hole.par,
          avgNetVsPar: count > 0 ? totalNetVsPar / count : 0,
          count,
        }
      }).filter(h => h.count >= 4)

      const hardest = [...holeDifficulty].sort((a, b) => b.avgNetVsPar - a.avgNetVsPar).slice(0, 3)
      const easiest = [...holeDifficulty].sort((a, b) => a.avgNetVsPar - b.avgNetVsPar).slice(0, 3)

      return { round, course, playerBreakdowns, hardest, easiest }
    }).filter(Boolean) as {
      round: Round; course: Course
      playerBreakdowns: { player: Player; holesPlayed: number; eagles: number; birdies: number; pars: number; bogeys: number; doubles: number }[]
      hardest: { holeNumber: number; par: number; avgNetVsPar: number; count: number }[]
      easiest: { holeNumber: number; par: number; avgNetVsPar: number; count: number }[]
    }[]
  }, [rounds, courses, players, scores, getHolesForCourse])

  if (roundStats.length === 0) return null

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-forest" /> Round Stats
      </h2>
      <div className="space-y-4">
        {roundStats.map(rs => (
          <div key={rs.round.id} className="space-y-2">
            <div className="text-xs font-bold text-forest">
              R{rs.round.round_number}: {rs.course.name}
            </div>

            {/* Player breakdown table */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-x-auto">
              <div className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Player Breakdown (Net)</div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1 pr-2 text-gray-400 font-semibold">Player</th>
                    <th className="text-center py-1 px-1 text-eagle font-semibold">Eag</th>
                    <th className="text-center py-1 px-1 text-birdie font-semibold">Bir</th>
                    <th className="text-center py-1 px-1 text-par font-semibold">Par</th>
                    <th className="text-center py-1 px-1 text-bogey font-semibold">Bog</th>
                    <th className="text-center py-1 px-1 text-red-700 font-semibold">2+</th>
                  </tr>
                </thead>
                <tbody>
                  {rs.playerBreakdowns.map(pb => (
                    <tr key={pb.player.id} className="border-b border-gray-50">
                      <td className="py-1 pr-2 font-medium text-gray-700 whitespace-nowrap">
                        {pb.player.name.split(' ').pop()}
                        {pb.holesPlayed < 18 && (
                          <span className="text-gray-300 ml-1">({pb.holesPlayed})</span>
                        )}
                      </td>
                      <td className="text-center py-1 px-1">
                        {pb.eagles > 0 ? <span className="text-eagle font-bold">{pb.eagles}</span> : <span className="text-gray-200">-</span>}
                      </td>
                      <td className="text-center py-1 px-1">
                        {pb.birdies > 0 ? <span className="text-birdie font-bold">{pb.birdies}</span> : <span className="text-gray-200">-</span>}
                      </td>
                      <td className="text-center py-1 px-1">
                        <span className="text-gray-600">{pb.pars}</span>
                      </td>
                      <td className="text-center py-1 px-1">
                        {pb.bogeys > 0 ? <span className="text-bogey font-bold">{pb.bogeys}</span> : <span className="text-gray-200">-</span>}
                      </td>
                      <td className="text-center py-1 px-1">
                        {pb.doubles > 0 ? <span className="text-red-700 font-bold">{pb.doubles}</span> : <span className="text-gray-200">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Hardest / Easiest holes */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-red-600 uppercase mb-1.5">Hardest Holes</div>
                {rs.hardest.map((h) => (
                  <div key={h.holeNumber} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-gray-600">#{h.holeNumber} <span className="text-gray-300">(P{h.par})</span></span>
                    <span className={`font-bold ${h.avgNetVsPar > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {h.avgNetVsPar > 0 ? '+' : ''}{h.avgNetVsPar.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-green-600 uppercase mb-1.5">Easiest Holes</div>
                {rs.easiest.map((h) => (
                  <div key={h.holeNumber} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-gray-600">#{h.holeNumber} <span className="text-gray-300">(P{h.par})</span></span>
                    <span className={`font-bold ${h.avgNetVsPar < 0 ? 'text-green-600' : h.avgNetVsPar > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {h.avgNetVsPar > 0 ? '+' : ''}{h.avgNetVsPar.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
