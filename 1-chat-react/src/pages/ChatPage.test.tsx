import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ChatPage from './ChatPage'

async function connectAs(name: string) {
  const user = userEvent.setup()
  render(<ChatPage />)
  await user.type(screen.getByRole('textbox', { name: 'Nombre de usuario' }), name)
  await user.click(screen.getByRole('button', { name: 'Conectar' }))
  return user
}

describe('ChatPage', () => {
  it('desconectado: muestra la tarjeta de acceso y oculta mensajes e input', () => {
    render(<ChatPage />)

    expect(screen.getByRole('heading', { name: 'Bienvenido a ChatRoom' })).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()
  })

  it('no conecta con el nombre vacío y muestra un error en línea', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)

    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un nombre de usuario')
    expect(screen.getByRole('textbox', { name: 'Nombre de usuario' })).toHaveFocus()
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('conecta con Enter y muestra el usuario, los mensajes y el input', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre de usuario' }), 'Anakin{Enter}')

    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('Anakin', { selector: 'header p span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeInTheDocument()
    expect(screen.getByRole('log', { name: 'Mensajes' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument()
  })

  it('los mensajes propios muestran el nombre con el que se conectó el usuario', async () => {
    await connectAs('Anakin')

    const own = screen.getByText('¿Cómo están?').closest('li')
    expect(own).toHaveAttribute('data-own', 'true')
    expect(own).toHaveTextContent('Anakin')
  })

  it('envía con Enter y vacía el input', async () => {
    const user = await connectAs('Anakin')
    const input = screen.getByRole('textbox', { name: 'Mensaje' })

    await user.type(input, 'hola{Enter}')

    expect(input).toHaveValue('')
  })

  it('no envía mensajes en blanco', async () => {
    const user = await connectAs('Anakin')
    const input = screen.getByRole('textbox', { name: 'Mensaje' })

    await user.type(input, '   ')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(input).toHaveValue('   ')
  })

  it('al desconectar vuelve a la pantalla de acceso', async () => {
    const user = await connectAs('Anakin')

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))

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
})
