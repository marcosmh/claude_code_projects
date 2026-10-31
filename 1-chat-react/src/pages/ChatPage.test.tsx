import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchConnectedUsers, fetchHistory } from '../test/fakeChatApi'
import { ChatSocket } from '../test/fakeChatSocket'
import type { Message } from '../types/message'
import ChatPage from './ChatPage'

vi.mock('../services/chatSocket', async () => await import('../test/fakeChatSocket'))
vi.mock('../services/chatApi', async () => await import('../test/fakeChatApi'))

const history: Message[] = [
  { id: 1, sender: 'Beto', sentAt: '2026-10-30T10:30:00Z', text: 'Hola a todos' },
  { id: 2, sender: 'Anakin', sentAt: '2026-10-30T10:31:00Z', text: '¿Cómo están?' },
]

const socket = () => {
  const current = ChatSocket.last
  if (!current) throw new Error('El socket aún no se creó')
  return current
}

async function submitName(name: string) {
  const user = userEvent.setup()
  render(<ChatPage />)
  await user.type(screen.getByRole('textbox', { name: 'Nombre de usuario' }), `${name}{Enter}`)
  return user
}

// Simula que el servidor confirma la unión y responde las consultas REST iniciales.
async function confirmJoin(name: string) {
  await act(async () => {
    socket().handlers.onPresence({ username: name, status: 'CONNECTED', at: '2026-10-30T10:32:00Z' })
    socket().handlers.onJoined()
  })
}

async function connectAs(name: string) {
  const user = await submitName(name)
  await confirmJoin(name)
  return user
}

beforeEach(() => {
  ChatSocket.last = null
  fetchHistory.mockReset().mockResolvedValue(history)
  fetchConnectedUsers.mockReset().mockResolvedValue(['Beto', 'Anakin'])
})

describe('ChatPage', () => {
  it('desconectado: muestra la tarjeta de acceso y oculta mensajes e input', () => {
    render(<ChatPage />)

    expect(screen.getByRole('heading', { name: 'Bienvenido a ChatRoom' })).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument()
  })

  it('no conecta con el nombre vacío y muestra un error en línea', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)

    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un nombre de usuario')
    expect(screen.getByRole('textbox', { name: 'Nombre de usuario' })).toHaveFocus()
    expect(ChatSocket.last).toBeNull()
  })

  it('al enviar el nombre abre la conexión y espera la confirmación del servidor', async () => {
    await submitName('Anakin')

    expect(socket().connectedAs).toBe('Anakin')
    expect(screen.getByRole('button', { name: 'Conectando…' })).toBeDisabled()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  it('confirmada la unión muestra el chat con el historial del backend', async () => {
    await connectAs('Anakin')

    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByRole('log', { name: 'Mensajes' })).toBeInTheDocument()
    expect(await screen.findByText('Hola a todos')).toBeInTheDocument()
    expect(fetchHistory).toHaveBeenCalledTimes(1)
    expect(screen.getByText('2 en línea')).toBeInTheDocument()
  })

  it('los mensajes propios se derivan del nombre con el que se conectó el usuario', async () => {
    await connectAs('Anakin')

    const own = (await screen.findByText('¿Cómo están?')).closest('li')
    expect(own).toHaveAttribute('data-own', 'true')
    expect(screen.getByText('Hola a todos').closest('li')).toHaveAttribute('data-own', 'false')
  })

  it('muestra en tiempo real los mensajes de otros usuarios', async () => {
    await connectAs('Anakin')

    await act(async () => {
      socket().handlers.onMessage({ id: 3, sender: 'Beto', sentAt: '2026-10-30T10:35:00Z', text: 'Nuevo en vivo' })
    })

    expect(screen.getByText('Nuevo en vivo')).toBeInTheDocument()
  })

  it('no duplica un mensaje que llega por tiempo real y también está en el historial', async () => {
    await connectAs('Anakin')
    await screen.findByText('Hola a todos')

    await act(async () => {
      socket().handlers.onMessage({ id: 1, sender: 'Beto', sentAt: '2026-10-30T10:30:00Z', text: 'Hola a todos' })
    })

    expect(screen.getAllByText('Hola a todos')).toHaveLength(1)
  })

  it('refleja cuando otros usuarios entran y salen y muestra avisos del sistema', async () => {
    await connectAs('Anakin')

    await act(async () => {
      socket().handlers.onPresence({ username: 'Carla', status: 'CONNECTED', at: '2026-10-30T10:40:00Z' })
      socket().handlers.onSystemEvent({
        id: 'c1',
        type: 'USER_CONNECTED',
        username: 'Carla',
        text: 'Carla se ha conectado al chat.',
        at: '2026-10-30T10:40:00Z',
      })
    })
    expect(screen.getByText('Carla se ha conectado al chat.')).toBeInTheDocument()
    expect(screen.getByText('3 en línea')).toBeInTheDocument()

    await act(async () => {
      socket().handlers.onPresence({ username: 'Carla', status: 'DISCONNECTED', at: '2026-10-30T10:41:00Z' })
      socket().handlers.onSystemEvent({
        id: 'd1',
        type: 'USER_DISCONNECTED',
        username: 'Carla',
        text: 'Carla ha salido del chat.',
        at: '2026-10-30T10:41:00Z',
      })
    })
    expect(screen.getByText('Carla ha salido del chat.')).toBeInTheDocument()
    expect(screen.getByText('2 en línea')).toBeInTheDocument()
  })

  it('envía con Enter por el socket y vacía el input', async () => {
    const user = await connectAs('Anakin')
    const input = screen.getByRole('textbox', { name: 'Mensaje' })

    await user.type(input, 'hola{Enter}')

    expect(socket().sent).toEqual(['hola'])
    expect(input).toHaveValue('')
  })

  it('no envía mensajes en blanco', async () => {
    const user = await connectAs('Anakin')

    await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), '   ')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(socket().sent).toEqual([])
  })

  it('conserva el texto si el socket no pudo enviarlo', async () => {
    const user = await connectAs('Anakin')
    socket().sendResult = false
    const input = screen.getByRole('textbox', { name: 'Mensaje' })

    await user.type(input, 'hola{Enter}')

    expect(input).toHaveValue('hola')
  })

  it('un nombre rechazado por el servidor vuelve al acceso con el error', async () => {
    await submitName('Anakin')

    await act(async () => {
      socket().handlers.onJoinFailed("El nombre de usuario 'Anakin' ya está en uso.")
    })

    expect(screen.getByRole('alert')).toHaveTextContent('ya está en uso')
    expect(socket().disconnected).toBe(true)
    expect(screen.getByRole('button', { name: 'Conectar' })).toBeEnabled()
  })

  it('al perder la conexión muestra "Reconectando…" y bloquea el envío', async () => {
    await connectAs('Anakin')

    await act(async () => {
      socket().handlers.onReconnecting()
    })

    expect(screen.getByText('Reconectando…', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('al desconectar cierra el socket y vuelve a la pantalla de acceso', async () => {
    const user = await connectAs('Anakin')
    const current = socket()

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))

    expect(current.disconnected).toBe(true)
    expect(screen.getByRole('heading', { name: 'Bienvenido a ChatRoom' })).toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  it('el interruptor cambia el tema', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)

    await user.click(screen.getByRole('switch', { name: 'Cambiar tema' }))

    expect(screen.getByRole('switch', { name: 'Cambiar tema' })).toHaveAttribute('aria-checked', 'false')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('muestra quién escribe, lo oculta al llegar su mensaje y soporta varios a la vez', async () => {
    await connectAs('Anakin')

    await act(async () => {
      socket().handlers.onTyping({ username: 'Beto', typing: true })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Beto está escribiendo')

    await act(async () => {
      socket().handlers.onTyping({ username: 'Carla', typing: true })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Beto y Carla están escribiendo')

    await act(async () => {
      socket().handlers.onMessage({ id: 9, sender: 'Beto', sentAt: '2026-10-30T10:50:00Z', text: 'listo' })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Carla está escribiendo')

    await act(async () => {
      socket().handlers.onTyping({ username: 'Carla', typing: false })
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('avisa una sola vez al teclear, y al enviar avisa que dejó de escribir', async () => {
    const user = await connectAs('Anakin')

    await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'hola')
    expect(socket().typing).toEqual([true])

    await user.keyboard('{Enter}')
    expect(socket().typing).toEqual([true, false])
    expect(socket().sent).toEqual(['hola'])
  })

  it('el indicador caduca solo si no llega el aviso de que dejó de escribir', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await connectAs('Anakin')
      await act(async () => {
        socket().handlers.onTyping({ username: 'Beto', typing: true })
      })
      expect(screen.getByRole('status')).toHaveTextContent('Beto está escribiendo')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6500)
      })
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    } finally {
      vi.useRealTimers()
    }
  })
})
