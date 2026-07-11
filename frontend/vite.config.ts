import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/naruto/',
  plugins: [react()],
  server: {
    proxy: {
      '/naruto/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naruto\/api/, '/api'),
      },
      '/naruto/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naruto\/uploads/, '/uploads'),
      },
    },
  },
})
