import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Message } from '../../types/message'
import MessageList from './MessageList'

const messages: Message[] = [
  { id: 1, sender: 'Juan Pérez', sentAt: '2026-10-30T10:30:00', text: 'Hola a todos' },
  { id: 2, sender: 'Anakin', sentAt: '2026-10-30T10:32:00', text: '¿Cómo están?' },
]

describe('MessageList', () => {
  it('deriva los mensajes propios comparando el autor con el usuario actual', () => {
    render(<MessageList messages={messages} currentUser="Anakin" />)

    expect(screen.getByText('¿Cómo están?').closest('li')).toHaveClass('items-end')
    expect(screen.getByText('Hola a todos').closest('li')).toHaveClass('items-start')
  })

  it('cambia la autoría si cambia el usuario actual', () => {
    render(<MessageList messages={messages} currentUser="Juan Pérez" />)

    expect(screen.getByText('Hola a todos').closest('li')).toHaveClass('items-end')
    expect(screen.getByText('¿Cómo están?').closest('li')).toHaveClass('items-start')
  })

  it('muestra la hora con el atributo dateTime en ISO', () => {
    render(<MessageList messages={messages} currentUser="Anakin" />)

    const time = screen.getByText('10:30')
    expect(time).toHaveAttribute('datetime', '2026-10-30T10:30:00')
  })

  it('se anuncia como un registro para lectores de pantalla', () => {
    render(<MessageList messages={messages} currentUser="Anakin" />)

    expect(screen.getByRole('log', { name: 'Mensajes' })).toBeInTheDocument()
  })
})
