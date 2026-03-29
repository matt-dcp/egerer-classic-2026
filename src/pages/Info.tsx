import { MapPin, Calendar, Trophy, ChevronRight, ExternalLink, Navigation, BookOpen, DollarSign, Flame } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTournament } from '../lib/TournamentContext'
import Header from '../components/Header'

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
  const { courses, champions } = useTournament()
  const navigate = useNavigate()

  const sortedChampions = [...champions].filter(c => c.player_name !== 'TBD').sort((a, b) => b.year - a.year)

  return (
    <div>
      <Header title="Egerer Classic" subtitle={`"If it ain't broke, don't fix it!"`} />

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
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>16 players, 2 rounds of 18 holes</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Individual champion = lowest 36-hole net score</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Team competition: captains draft 8-player teams on opening night</div>
            </div>
          </div>

          {/* Day 1 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5">Day 1 — Stroke Play (1v1)</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Captains set 8 head-to-head matchups</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Lower 18-hole net score wins = 1 point</div>
              <div className="flex items-start gap-2">
                <Flame size={14} className="text-gold mt-0.5 shrink-0" />
                <span>One <span className="font-semibold text-gold">pressure bet</span> per team = 2 points</span>
              </div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>10 total points available</div>
            </div>
          </div>

          {/* Day 2 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs font-bold text-forest mb-1.5">Day 2 — Best Ball (2v2)</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Captains set 4 twosome matchups</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>Lower 18-hole net best ball wins = 2 points</div>
              <div className="flex items-start gap-2"><span className="text-gold mt-1">•</span>8 total points available</div>
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
                <div className="text-[10px] text-gray-500 font-semibold">1st Place</div>
                <div className="text-sm font-bold text-forest">$1,080</div>
                <div className="text-[9px] text-gray-400">60%</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500 font-semibold">2nd Place</div>
                <div className="text-sm font-bold text-gray-700">$630</div>
                <div className="text-[9px] text-gray-400">35%</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500 font-semibold">3rd Place</div>
                <div className="text-sm font-bold text-gray-700">$270</div>
                <div className="text-[9px] text-gray-400">15%</div>
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
                {sortedChampions.length} champions · Since {sortedChampions[sortedChampions.length - 1]?.year}
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
