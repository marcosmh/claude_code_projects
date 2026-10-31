import { vi } from 'vitest'
import type { Message } from '../types/message'

export const fetchHistory = vi.fn<() => Promise<Message[]>>()
export const fetchConnectedUsers = vi.fn<() => Promise<string[]>>()
