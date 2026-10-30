import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('empieza en oscuro por defecto y lo aplica a <html>', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('alterna el tema, actualiza <html> y lo persiste', () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('chatroom:theme:v1')).toBe('light')
  })

  it('recupera el tema guardado al iniciar', () => {
    localStorage.setItem('chatroom:theme:v1', 'light')

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
