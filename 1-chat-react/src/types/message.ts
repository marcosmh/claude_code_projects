export interface Message {
  id: number
  sender: string
  /** ISO-8601, p. ej. 2026-10-30T10:30:00 */
  sentAt: string
  text: string
}
