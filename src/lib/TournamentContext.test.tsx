import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TournamentProvider, useTournament } from './TournamentContext'

// Run in offline mode: no network, exercise the local-first write path + queue.
vi.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}))

function Harness() {
  const { scores, submitScore, deleteScore } = useTournament()
  const h5 = scores.find(s => s.player_id === 'p1' && s.hole_number === 5)
  return (
    <div>
      <span data-testid="count">{scores.length}</span>
      <span data-testid="h5">{h5 ? h5.gross_score : 'none'}</span>
      <span data-testid="h5id">{h5 ? h5.id : ''}</span>
      <button onClick={() => submitScore('r1', 'p1', 5, 4)}>add</button>
      <button onClick={() => submitScore('r1', 'p1', 5, 6)}>update</button>
      <button onClick={() => deleteScore('r1', 'p1', 5)}>del</button>
    </div>
  )
}

describe('TournamentContext score writes (offline)', () => {
  beforeEach(() => localStorage.clear())

  it('writes a score to state and localStorage with a deterministic id', async () => {
    render(<TournamentProvider><Harness /></TournamentProvider>)
    expect(screen.getByTestId('count').textContent).toBe('0')
    await userEvent.click(screen.getByText('add'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByTestId('h5').textContent).toBe('4')
    expect(screen.getByTestId('h5id').textContent).toBe('s-r1-p1-5')
    expect(localStorage.getItem('ec-scores')).toContain('s-r1-p1-5')
  })

  it('is idempotent: re-submitting the same hole replaces, never duplicates', async () => {
    render(<TournamentProvider><Harness /></TournamentProvider>)
    await userEvent.click(screen.getByText('add'))
    await userEvent.click(screen.getByText('add'))    // same value again
    await userEvent.click(screen.getByText('update')) // new value, same hole
    expect(screen.getByTestId('count').textContent).toBe('1') // single row, not three
    expect(screen.getByTestId('h5').textContent).toBe('6')
  })

  it('deleteScore removes the row', async () => {
    render(<TournamentProvider><Harness /></TournamentProvider>)
    await userEvent.click(screen.getByText('add'))
    await userEvent.click(screen.getByText('del'))
    expect(screen.getByTestId('count').textContent).toBe('0')
    expect(screen.getByTestId('h5').textContent).toBe('none')
  })
})
