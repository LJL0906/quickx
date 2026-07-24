import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'search-bar': resolve(__dirname, 'src/renderer/search-bar/index.html'),
        'main-window': resolve(__dirname, 'src/renderer/main-window/index.html'),
        'translate-result': resolve(__dirname, 'src/renderer/translate-result/index.html'),
        'translate-input': resolve(__dirname, 'src/renderer/translate-input/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
})
