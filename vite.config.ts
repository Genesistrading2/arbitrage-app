import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/arbitrage-app/', // 👈 importante para GitHub Pages
  build: {
    outDir: 'dist',
  },
})
