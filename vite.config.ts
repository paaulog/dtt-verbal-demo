/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serve o projeto em /<nome-do-repo>/.
const base = process.env.GITHUB_PAGES === 'true' ? '/dtt-verbal-demo/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DTT Verbal Demo',
        short_name: 'DTT Demo',
        description: 'Demonstração de ensino por tentativas discretas para operantes verbais. Somente dados fictícios.',
        lang: 'pt-BR',
        theme_color: '#2f4858',
        background_color: '#f6f4ef',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
