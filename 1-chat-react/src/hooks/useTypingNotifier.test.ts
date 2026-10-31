import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTypingNotifier } from './useTypingNotifier'

describe('useTypingNotifier', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('no envía un evento por pulsación y avisa al parar por inactividad', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useTypingNotifier(onChange))

    act(() => result.current.notifyInput('h'))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.notifyInput('ho'))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.notifyInput('hol'))
    expect(onChange.mock.calls).toEqual([[true]])

    act(() => vi.advanceTimersByTime(2500))
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('refresca el aviso mientras sigue tecleando', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useTypingNotifier(onChange))

    for (let i = 0; i < 8; i += 1) {
      act(() => result.current.notifyInput('x'.repeat(i + 1)))
      act(() => vi.advanceTimersByTime(1000))
    }

    const typingCalls = onChange.mock.calls.filter(([typing]) => typing === true)
    expect(typingCalls.length).toBeGreaterThanOrEqual(2)
    expect(typingCalls.length).toBeLessThan(5)
  })

  it('texto vacío o stop() avisan que dejó de escribir una sola vez', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useTypingNotifier(onChange))

    act(() => result.current.notifyInput('hola'))
    act(() => result.current.notifyInput('   '))
    act(() => result.current.stop())

    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('al desmontar con aviso activo envía que dejó de escribir', () => {
    const onChange = vi.fn()
    const { result, unmount } = renderHook(() => useTypingNotifier(onChange))

    act(() => result.current.notifyInput('hola'))
    unmount()

    expect(onChange.mock.calls).toEqual([[true], [false]])
  })
})
