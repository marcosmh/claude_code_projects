import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => vi.restoreAllMocks())

it('envía la pregunta y muestra respuesta y fuentes', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ answer: 'Respuesta X', sources: [{ documentId: 'd', fileName: 'a.pdf', page: 2, score: 0.8, snippet: 's' }] }), { status: 200 }),
  )
  render(<App />)
  await userEvent.type(screen.getByLabelText('Pregunta'), 'hola')
  await userEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
  expect(await screen.findByText('Respuesta X')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ver fuentes (1)' })).toBeInTheDocument()
})

it('muestra el error ProblemDetail del backend', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ title: 'Servicio no disponible' }), { status: 503 }),
  )
  render(<App />)
  await userEvent.type(screen.getByLabelText('Pregunta'), 'hola')
  await userEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible')
})

it('copia la respuesta al portapapeles', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ answer: 'Respuesta X', sources: [] }), { status: 200 }),
  )
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  render(<App />)
  await user.type(screen.getByLabelText('Pregunta'), 'hola')
  await user.click(screen.getByRole('button', { name: 'Preguntar' }))
  await user.click(await screen.findByRole('button', { name: /Copiar/ }))
  expect(writeText).toHaveBeenCalledWith('Respuesta X')
  expect(await screen.findByText('✓ Copiado')).toBeInTheDocument()
})

it('alterna entre tema oscuro y claro y lo recuerda', async () => {
  document.documentElement.dataset.theme = 'dark'
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('rag:theme:v1')).toBe('light')
  expect(screen.getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeInTheDocument()
})
