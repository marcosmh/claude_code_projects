import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmojiPickerButton from './EmojiPickerButton'

describe('EmojiPickerButton', () => {
  it('abre el selector, entrega el emoji elegido y se cierra con Escape', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<EmojiPickerButton onSelect={onSelect} />)
    const toggle = screen.getByRole('button', { name: 'Emojis' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('dialog', { name: 'Selector de emojis' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '😀' }))
    expect(onSelect).toHaveBeenCalledWith('😀')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })

  it('cambia de categoría y se cierra al pulsar fuera', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <>
        <button type="button">fuera</button>
        <EmojiPickerButton onSelect={onSelect} />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Emojis' }))

    await user.click(screen.getByRole('button', { name: 'Celebración y objetos' }))
    await user.click(screen.getByRole('button', { name: '🚀' }))
    expect(onSelect).toHaveBeenCalledWith('🚀')

    await user.click(screen.getByRole('button', { name: 'fuera' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('no se abre si está deshabilitado', async () => {
    const user = userEvent.setup()
    render(<EmojiPickerButton onSelect={vi.fn()} disabled />)

    await user.click(screen.getByRole('button', { name: 'Emojis' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
