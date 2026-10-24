import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest, request) => {
            const host = String(request.headers.host || '')
            proxyRequest.setHeader('x-forwarded-proto', /localhost|127\.0\.0\.1|::1/.test(host) ? 'http' : 'https')
          })
        },
      },
    },
  },
})
