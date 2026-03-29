import { useState } from 'react'
import { Users, Pencil, X } from 'lucide-react'
import type { Player, Foursome } from '../lib/types'

interface Props {
  players: Player[]
  foursome: Foursome | null
  onSave: (playerIds: [string, string, string, string]) => void
  onDelete: () => void
}

export default function FoursomeSelector({ players, foursome, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(!foursome)
  const [selected, setSelected] = useState<string[]>(foursome?.player_ids ?? [])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 4 ? [...prev, id] : prev,
    )
  }

  const save = () => {
    if (selected.length === 4) {
      onSave(selected as [string, string, string, string])
      setEditing(false)
    }
  }

  if (foursome && !editing) {
    const names = foursome.player_ids.map(id => players.find(p => p.id === id)?.name ?? '?')
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-forest/20">
        <Users size={16} className="text-forest flex-shrink-0" />
        <div className="flex-1 flex flex-wrap gap-1">
          {names.map((name, i) => (
            <span key={i} className="text-xs font-medium bg-forest/10 text-forest px-2 py-0.5 rounded-full">{name}</span>
          ))}
        </div>
        <button onClick={() => setEditing(true)} className="p-1 text-gray-400">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1 text-gray-400">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Select Your Foursome</h3>
        <span className="text-xs text-gray-400">{selected.length}/4</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selected.includes(p.id)
                ? 'bg-forest text-white'
                : 'bg-gray-100 text-gray-600'
            } ${!selected.includes(p.id) && selected.length >= 4 ? 'opacity-40' : ''}`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={selected.length !== 4}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            selected.length === 4 ? 'bg-forest text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          Lock In Foursome
        </button>
        {foursome && (
          <button onClick={() => { setEditing(false); setSelected(foursome.player_ids) }} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 bg-gray-100">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
