import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: '/src/' }],
  },
  css: {
    preprocessorOptions: { scss: { api: 'modern-compiler' } },
  },
  server: { port: 5174 },
  preview: { port: 4174 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
