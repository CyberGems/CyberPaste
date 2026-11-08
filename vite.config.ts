import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const REACT_PACKAGES = new Set(['react', 'react-dom', 'scheduler'])
const MOTION_PACKAGES = new Set(['framer-motion', 'motion-dom', 'motion-utils', 'motion'])
const I18N_PACKAGES = new Set(['i18next', 'react-i18next', 'i18next-browser-languagedetector'])

function packageName(id: string): string {
  const marker = 'node_modules/'
  const start = id.lastIndexOf(marker) + marker.length
  const rest = id.slice(start)
  if (rest.startsWith('@')) {
    return rest.split('/').slice(0, 2).join('/')
  }
  return rest.split('/')[0]
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },
  root: 'frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          const pkg = packageName(id)
          if (REACT_PACKAGES.has(pkg)) return 'react-vendor'
          if (MOTION_PACKAGES.has(pkg)) return 'motion'
          if (I18N_PACKAGES.has(pkg)) return 'i18n'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
})
