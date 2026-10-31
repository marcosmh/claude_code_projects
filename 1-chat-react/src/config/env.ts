// Única lectura de las variables de entorno (Vite expone solo las que empiezan por VITE_).
const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const wsUrl = import.meta.env.VITE_WS_URL ?? `${apiUrl.replace(/^http/, 'ws')}/ws`

export const env = { apiUrl, wsUrl } as const
