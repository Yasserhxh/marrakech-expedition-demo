import { defineConfig } from 'vite'
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
})
