// Datos simulados. Se reemplazarán por la API / WebSocket de Spring Boot.
// Los mensajes propios (own: true) toman el nombre del usuario conectado.

export const mockMessages = [
  { id: 1, user: 'Juan Pérez', time: '10:30', text: 'Hola a todos', own: false },
  { id: 2, user: 'María López', time: '10:31', text: 'Buenos días', own: false },
  { id: 3, user: null, time: '10:32', text: '¿Cómo están?', own: true },
  { id: 4, user: 'Juan Pérez', time: '10:33', text: 'Todo bien, revisando el tablero de tareas del sprint.', own: false },
  { id: 5, user: 'María López', time: '10:34', text: 'Perfecto. Más tarde subo el diseño nuevo del dashboard.', own: false },
  { id: 6, user: null, time: '10:35', text: 'Genial, quedo atento. ¡Gracias!', own: true },
]
