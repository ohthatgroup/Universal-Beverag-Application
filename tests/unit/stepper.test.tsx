// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Stepper } from '@/components/ui/stepper'

describe('Stepper', () => {
  it('handles rapid-fire + clicks without stale-closure loss', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stepper quantity={0} onChange={onChange} />)
    const plus = screen.getByRole('button', { name: /increase/i })
    // Five fast clicks.
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    // The component reads from a ref that updates synchronously inside the
    // handler, so all five clicks accumulate even when the parent hasn't
    // re-rendered yet.
    expect(onChange).toHaveBeenCalledTimes(5)
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('clamps typed input above max on commit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stepper quantity={5} onChange={onChange} max={999} />)
    const input = screen.getByRole('textbox', { name: /quantity/i })
    await user.click(input)
    await user.tripleClick(input)
    await user.keyboard('99999')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith(999)
  })

  it('clamps typed input below min on commit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stepper quantity={5} onChange={onChange} min={0} />)
    const input = screen.getByRole('textbox', { name: /quantity/i })
    await user.click(input)
    await user.tripleClick(input)
    await user.keyboard('abc')
    await user.tab()
    // Letters are stripped on input; commit treats empty as `min`.
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('disables minus at min and plus at max', () => {
    render(<Stepper quantity={0} onChange={() => {}} min={0} max={5} />)
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /increase/i })).not.toBeDisabled()
  })
})
