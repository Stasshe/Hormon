import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: path.resolve(__dirname, 'pwa'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html')
    }
  },
  server: {
    port: 3000,
    strictPort: false
  }
})
