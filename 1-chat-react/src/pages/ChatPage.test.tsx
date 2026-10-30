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
  it('desconectado: muestra el estado vacío y oculta mensajes e input', () => {
    render(<ChatPage />)

    expect(screen.getByText('Bienvenido a ChatRoom')).toBeInTheDocument()
    expect(screen.getByText('Desconectado')).toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()
  })

  it('no conecta con el nombre vacío y muestra un error en línea', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)

    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un nombre de usuario.')
    expect(screen.getByRole('textbox', { name: 'Nombre de usuario' })).toHaveFocus()
    expect(screen.getByText('Desconectado')).toBeInTheDocument()
  })

  it('conecta con Enter y muestra el usuario, los mensajes y el input', async () => {
    const user = userEvent.setup()
    render(<ChatPage />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre de usuario' }), 'Anakin{Enter}')

    expect(screen.getByText('En línea')).toBeInTheDocument()
    expect(screen.getByText('Anakin', { selector: 'p span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeInTheDocument()
    expect(screen.getByRole('log', { name: 'Mensajes' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument()
  })

  it('los mensajes propios muestran el nombre con el que se conectó el usuario', async () => {
    await connectAs('Anakin')

    const own = screen.getByText('¿Cómo están?').closest('li')
    expect(own).toHaveClass('items-end')
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

  it('al desconectar vuelve al estado vacío', async () => {
    const user = await connectAs('Anakin')

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))

    expect(screen.getByText('Bienvenido a ChatRoom')).toBeInTheDocument()
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
