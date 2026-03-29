import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTournament } from '../lib/TournamentContext'

type Step = 'welcome' | 'select-name' | 'confirm'

export default function Onboarding() {
  const { players, setCurrentPlayer } = useTournament()
  const [step, setStep] = useState<Step>('welcome')
  const [selectedId, setSelectedId] = useState('')

  const selectedPlayer = players.find(p => p.id === selectedId)

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="bg-forest text-white px-6 pt-12 pb-8 text-center">
        <h1 className="font-display text-3xl font-bold">Egerer Classic</h1>
        <p className="text-cream/60 text-sm mt-1">May 29–30, 2026 · Scottsdale, AZ</p>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-4">
            <div className="w-full max-w-sm">
              {/* Tournament crest */}
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">⛳</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold mb-1">The 14th Annual</div>
                <h2 className="font-display text-3xl font-bold text-gray-900">Egerer Classic</h2>
                <div className="w-16 h-0.5 bg-gold mx-auto mt-2 mb-3" />
                <p className="text-xs text-gray-400">Scottsdale, Arizona · May 29–30, 2026</p>
              </div>

              {/* Details card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏌️</span>
                    <span>16 players · 2 rounds · Net stroke play</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏨</span>
                    <span>Global Ambassador Hotel</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    <span>Individual & team competition</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('select-name')}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-forest text-white rounded-xl font-semibold text-sm shadow-lg"
              >
                Enter Tournament <ChevronRight size={16} />
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-3 italic">"If it ain't broke, don't fix it!"</p>
            </div>
          </div>
        )}

        {/* Step: Select Name */}
        {step === 'select-name' && (
          <div className="flex-1 px-4 py-6 pb-24">
            <div className="text-center mb-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Step 1 of 2</div>
              <h2 className="text-lg font-bold text-gray-900">Select Your Name</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    selectedId === p.id
                      ? 'border-forest bg-forest/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                  <div className="text-[10px] text-gray-400">HCP {p.handicap_index}</div>
                </button>
              ))}
            </div>
            {/* Fixed bottom bar */}
            {selectedId && (
              <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 px-4 py-3 pb-[env(safe-area-inset-bottom)] z-50">
                <button
                  onClick={() => setStep('confirm')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-forest text-white rounded-xl font-semibold text-sm shadow-lg"
                >
                  Continue as {players.find(p => p.id === selectedId)?.name.split(' ')[0]} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && selectedPlayer && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Step 2 of 2</div>
              <h2 className="text-lg font-bold text-gray-900">Is this you?</h2>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center w-full max-w-xs">
              <div className="w-16 h-16 rounded-full bg-forest text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                {selectedPlayer.name.charAt(0)}
              </div>
              <div className="text-lg font-bold text-gray-900">{selectedPlayer.name}</div>
              <div className="text-sm text-gray-400 mt-0.5">HCP {selectedPlayer.handicap_index}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('select-name'); setSelectedId('') }}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm"
              >
                Go Back
              </button>
              <button
                onClick={() => setCurrentPlayer(selectedId)}
                className="px-8 py-3 bg-forest text-white rounded-xl font-semibold text-sm"
              >
                That's Me!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
