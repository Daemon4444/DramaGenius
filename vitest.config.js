import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __API_BASE__: JSON.stringify('/api'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    css: false,
    env: {
      VITE_USE_REAL_API: 'false',
      VITE_ENABLE_DEMO_DATA: 'true',
    },
  },
})
