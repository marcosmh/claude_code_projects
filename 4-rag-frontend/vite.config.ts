import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// El backend no configura CORS: en desarrollo /api se proxifica a Spring Boot.
const backend = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': backend } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
})
