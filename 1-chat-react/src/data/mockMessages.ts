import type { Message } from '../types/message'

// Datos simulados. Se reemplazarán por la API / WebSocket de Spring Boot.
// Simulan lo que devolvería el backend: cada mensaje trae su autor (sender).
// Los del usuario conectado se generan a partir de su nombre.
export function getMockMessages(currentUser: string): Message[] {
  return [
    { id: 1, sender: 'Juan Pérez', sentAt: '2026-10-30T10:30:00', text: 'Hola a todos' },
    { id: 2, sender: 'María López', sentAt: '2026-10-30T10:31:00', text: 'Buenos días' },
    { id: 3, sender: currentUser, sentAt: '2026-10-30T10:32:00', text: '¿Cómo están?' },
    { id: 4, sender: 'Juan Pérez', sentAt: '2026-10-30T10:33:00', text: 'Todo bien, revisando el tablero de tareas del sprint.' },
    { id: 5, sender: 'María López', sentAt: '2026-10-30T10:34:00', text: 'Perfecto. Más tarde subo el diseño nuevo del dashboard.' },
    { id: 6, sender: currentUser, sentAt: '2026-10-30T10:35:00', text: 'Genial, quedo atento. ¡Gracias!' },
  ]
}
