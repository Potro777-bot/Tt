import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa para que el build funcione en GitHub Pages o en cualquier subcarpeta
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
