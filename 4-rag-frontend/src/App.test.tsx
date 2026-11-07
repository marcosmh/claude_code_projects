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
