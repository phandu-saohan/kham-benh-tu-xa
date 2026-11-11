import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-livekit': ['@livekit/components-react', 'livekit-client'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-jsqr': ['jsqr']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
