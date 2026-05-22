import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScoreStepperCompact from './ScoreStepperCompact'

function setup(gross: number, extra: Partial<Parameters<typeof ScoreStepperCompact>[0]> = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <ScoreStepperCompact
      playerName="Tester" par={4} gross={gross} net={gross} receivesStroke={false}
      onChange={onChange} onClear={onClear} hasScore {...extra}
    />,
  )
  return { onChange, onClear }
}

describe('ScoreStepperCompact', () => {
  it('decrements and increments by one from the current gross', async () => {
    const { onChange } = setup(4)
    const [minus, plus] = screen.getAllByRole('button').filter(b => !b.getAttribute('title')?.includes('Clear'))
    await userEvent.click(plus)
    expect(onChange).toHaveBeenCalledWith(5)
    await userEvent.click(minus)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('clamps the minimum at 1', async () => {
    const { onChange } = setup(1)
    const minus = screen.getAllByRole('button').find(b => !b.getAttribute('title'))!
    await userEvent.click(minus)
    expect(onChange).toHaveBeenCalledWith(1) // not 0
  })

  it('clamps the maximum at 15', async () => {
    const { onChange } = setup(15)
    const buttons = screen.getAllByRole('button').filter(b => !b.getAttribute('title'))
    const plus = buttons[buttons.length - 1]
    await userEvent.click(plus)
    expect(onChange).toHaveBeenCalledWith(15) // not 16
  })

  it('fires onClear from the clear button when hasScore', async () => {
    const { onClear } = setup(5)
    await userEvent.click(screen.getByTitle('Clear score'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
