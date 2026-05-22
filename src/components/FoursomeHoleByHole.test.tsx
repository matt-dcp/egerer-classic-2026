import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FoursomeHoleByHole from './FoursomeHoleByHole'
import type { Hole, Player, Score } from '../lib/types'

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`, course_id: 'c', hole_number: i + 1, par: 4, stroke_index: i + 1, yardage: 400,
}))
const players: Player[] = [
  { id: 'p1', tournament_id: 't', name: 'Alpha One', handicap_index: 0, team_handicap: 0 },
  { id: 'p2', tournament_id: 't', name: 'Bravo Two', handicap_index: 0, team_handicap: 0 },
]

function renderGroup(scores: Score[] = []) {
  const onSubmitScore = vi.fn()
  render(
    <FoursomeHoleByHole
      holes={HOLES} players={players} scores={scores} courseSlope={113} roundId="r1"
      onSubmitScore={onSubmitScore} onDeleteScore={vi.fn()}
    />,
  )
  return { onSubmitScore }
}

describe('FoursomeHoleByHole — Save & Next (P2-6)', () => {
  it('does NOT fabricate par for untouched players', async () => {
    const { onSubmitScore } = renderGroup([]) // nobody entered yet
    await userEvent.click(screen.getByRole('button', { name: /Save & Next/i }))
    expect(onSubmitScore).not.toHaveBeenCalled() // previously wrote par for both
    expect(screen.getByText('Hole 2')).toBeInTheDocument() // still advances
  })

  it('persists only players who actually entered a score this hole', async () => {
    const entered: Score[] = [
      { id: 's-r1-p1-1', round_id: 'r1', player_id: 'p1', hole_number: 1, gross_score: 5, updated_at: '2026-05-29T00:00:00Z' },
    ]
    const { onSubmitScore } = renderGroup(entered)
    await userEvent.click(screen.getByRole('button', { name: /Save & Next/i }))
    expect(onSubmitScore).toHaveBeenCalledTimes(1)
    expect(onSubmitScore).toHaveBeenCalledWith('p1', 1, 5)
  })
})
