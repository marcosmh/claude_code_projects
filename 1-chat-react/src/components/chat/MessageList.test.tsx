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

    expect(screen.getByText('¿Cómo están?').closest('li')).toHaveAttribute('data-own', 'true')
    expect(screen.getByText('Hola a todos').closest('li')).toHaveAttribute('data-own', 'false')
  })

  it('cambia la autoría si cambia el usuario actual', () => {
    render(<MessageList messages={messages} currentUser="Juan Pérez" />)

    expect(screen.getByText('Hola a todos').closest('li')).toHaveAttribute('data-own', 'true')
    expect(screen.getByText('¿Cómo están?').closest('li')).toHaveAttribute('data-own', 'false')
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

  it('agrupa mensajes seguidos del mismo autor bajo un solo encabezado', () => {
    const grouped: Message[] = [
      { id: 1, sender: 'Juan Pérez', sentAt: '2026-10-30T10:30:00', text: 'Uno' },
      { id: 2, sender: 'Juan Pérez', sentAt: '2026-10-30T10:31:00', text: 'Dos' },
      { id: 3, sender: 'María López', sentAt: '2026-10-30T10:32:00', text: 'Tres' },
    ]
    render(<MessageList messages={grouped} currentUser="Anakin" />)

    expect(screen.getAllByText('Juan Pérez')).toHaveLength(1)
    expect(screen.getAllByText('María López')).toHaveLength(1)
    expect(screen.getByText('Dos')).toBeInTheDocument()
  })

  it('vuelve a mostrar el encabezado si pasaron más de 5 minutos', () => {
    const spaced: Message[] = [
      { id: 1, sender: 'Juan Pérez', sentAt: '2026-10-30T10:30:00', text: 'Uno' },
      { id: 2, sender: 'Juan Pérez', sentAt: '2026-10-30T10:40:00', text: 'Dos' },
    ]
    render(<MessageList messages={spaced} currentUser="Anakin" />)

    expect(screen.getAllByText('Juan Pérez')).toHaveLength(2)
  })

  it('muestra un mensaje cuando no hay historial', () => {
    render(<MessageList messages={[]} currentUser="Anakin" />)

    expect(screen.getByText('Aún no hay mensajes. ¡Escribe el primero!')).toBeInTheDocument()
  })

  it('intercala los avisos de conexión por hora entre los mensajes', () => {
    render(
      <MessageList
        messages={messages}
        currentUser="Anakin"
        notices={[{ id: 'n1', username: 'Carla', status: 'CONNECTED', at: '2026-10-30T10:31:00' }]}
      />,
    )

    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items[1]).toBe('Carla se unió')
    expect(items).toHaveLength(3)
  })
})
