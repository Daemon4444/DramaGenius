import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'node:http'

/**
 * Vite 插件：直接转发 /api 请求到后端（绕过 http-proxy，用原生 Node.js http）
 * 解决 Vite http-proxy 对二进制响应（audio/mpeg）处理异常的问题
 */
function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        // 过滤 HTTP/2 伪头（:method, :path 等），构造 HTTP/1.1 请求头
        const fwdHeaders = {}
        for (const [k, v] of Object.entries(req.headers)) {
          if (!k.startsWith(':')) fwdHeaders[k] = v
        }
        fwdHeaders.host = '127.0.0.1:8000'

        const options = {
          hostname: '127.0.0.1',
          port: 8000,
          path: `/api${req.url}`,
          method: req.method,
          headers: fwdHeaders,
          timeout: 60000,
        }

        const proxyReq = http.request(options, (proxyRes) => {
          // 复制响应头
          const headers = { ...proxyRes.headers }
          // 确保不压缩二进制音频
          delete headers['transfer-encoding']
          res.writeHead(proxyRes.statusCode, headers)
          proxyRes.pipe(res)
        })

        proxyReq.on('error', (err) => {
          console.error('[api-proxy] error:', err.message)
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ detail: `Proxy error: ${err.message}` }))
          }
        })

        proxyReq.on('timeout', () => {
          console.error('[api-proxy] timeout')
          proxyReq.destroy()
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ detail: 'Proxy timeout' }))
          }
        })

        // 转发请求体
        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    apiProxyPlugin(),   // 在 react 之前注册，优先处理 /api
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,

    watch: {
      ignored: ['**/backend/**', '**/node_modules/**', '**/.git/**'],
    },
    // 不再使用 Vite 内置 proxy（由 apiProxyPlugin 接管）
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心（几乎不变，长缓存）
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 动画库独立
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || '/api'),
  },
})
