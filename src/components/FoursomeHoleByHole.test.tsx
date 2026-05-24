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

describe('FoursomeHoleByHole — Save & Next', () => {
  it('commits the displayed value (par default) for every player in the group', async () => {
    // Owner explicitly chose this: one-tap Save & Next on a par-by-everyone
    // hole should record par for the whole group without per-player taps.
    const { onSubmitScore } = renderGroup([])
    await userEvent.click(screen.getByRole('button', { name: /Save & Next/i }))
    expect(onSubmitScore).toHaveBeenCalledTimes(2) // par written for p1 and p2
    expect(onSubmitScore).toHaveBeenCalledWith('p1', 1, 4) // par 4
    expect(onSubmitScore).toHaveBeenCalledWith('p2', 1, 4)
    expect(screen.getByText('Hole 2')).toBeInTheDocument()
  })

  it('uses an existing entered score over the par default when present', async () => {
    const entered: Score[] = [
      { id: 's-r1-p1-1', round_id: 'r1', player_id: 'p1', hole_number: 1, gross_score: 5, updated_at: '2026-05-29T00:00:00Z' },
    ]
    const { onSubmitScore } = renderGroup(entered)
    await userEvent.click(screen.getByRole('button', { name: /Save & Next/i }))
    expect(onSubmitScore).toHaveBeenCalledTimes(2)
    expect(onSubmitScore).toHaveBeenCalledWith('p1', 1, 5) // explicit entry kept
    expect(onSubmitScore).toHaveBeenCalledWith('p2', 1, 4) // p2 still defaults to par
  })
})
