import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TypingIndicator, { typingText } from './TypingIndicator'

describe('typingText', () => {
  it('redacta según cuántos escriben', () => {
    expect(typingText([])).toBe('')
    expect(typingText(['Anakin'])).toBe('Anakin está escribiendo')
    expect(typingText(['Anakin', 'Luke'])).toBe('Anakin y Luke están escribiendo')
    expect(typingText(['Anakin', 'Luke', 'Ana'])).toBe('Anakin, Luke y Ana están escribiendo')
    expect(typingText(['a', 'b', 'c', 'd'])).toBe('Varias personas están escribiendo')
  })
})

describe('TypingIndicator', () => {
  it('es una región de estado vacía cuando nadie escribe', () => {
    render(<TypingIndicator users={[]} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('anuncia quién escribe', () => {
    render(<TypingIndicator users={['Anakin', 'Luke']} />)
    expect(screen.getByRole('status')).toHaveTextContent('Anakin y Luke están escribiendo')
  })
})
