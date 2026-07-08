import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'
import http from 'node:http'

const appVersion = JSON.parse(readFileSync('./package.json', 'utf-8')).version as string
const useHttps = process.env.VITE_HTTPS === 'true'
const backendPort = process.env.VITE_API_PORT || '3000'

function shouldProxyToBackend(pathname: string): boolean {
  if (!pathname || pathname === '/') return false
  if (pathname.startsWith('/@')) return false
  if (pathname.startsWith('/node_modules')) return false
  if (pathname.startsWith('/src')) return false
  if (pathname.startsWith('/socket.io')) return false
  if (/\.(html?|tsx?|jsx?|css|map|svg|ico|png|jpg|jpeg|gif|webp|woff2?|ttf|json)(\?|$)/i.test(pathname)) {
    return false
  }
  return true
}

function backendDevProxy(): Plugin {
  return {
    name: 'izing-backend-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      if (!useHttps) return

      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (!shouldProxyToBackend(pathname)) return next()

        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port: Number(backendPort),
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: `127.0.0.1:${backendPort}` }
          },
          proxyRes => {
            res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
            proxyRes.pipe(res, { end: true })
          }
        )

        proxyReq.on('error', error => {
          console.error('[dev-proxy]', error.message)
          if (!res.writableEnded) {
            res.statusCode = 502
            res.end(`Backend indisponível em :${backendPort}`)
          }
        })

        req.pipe(proxyReq)
      })
    }
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    react(),
    ...(useHttps ? [basicSsl(), backendDevProxy()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'IZING',
        short_name: 'IZING',
        description: 'Plataforma de atendimento multicanal',
        theme_color: '#667eea',
        background_color: '#f5f7fb',
        display: 'standalone',
        lang: 'pt-BR',
        start_url: './#/home',
        scope: './',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: useHttps
      ? {
          '/socket.io': {
            target: `http://127.0.0.1:${backendPort}`,
            ws: true,
            changeOrigin: true
          }
        }
      : undefined
  },
  optimizeDeps: {
    include: ['@mui/icons-material']
  }
})
