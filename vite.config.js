import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { runAnalysis } from './api/_lib/analyzeCore.js'

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function analyzeApiPlugin() {
  return {
    name: 'analyze-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        res.setHeader('Content-Type', 'application/json')
        try {
          const body = await readJsonBody(req)
          const result = await runAnalysis(body)
          res.statusCode = 200
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = error.statusCode || 500
          res.end(JSON.stringify({ error: error.message || 'Đã xảy ra lỗi không xác định.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env.local (and other .env files) into process.env so the dev
  // middleware above can read ANTHROPIC_API_KEY the same way the Vercel
  // serverless function does.
  const env = loadEnv(mode, process.cwd(), '')
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY

  return {
    plugins: [react(), analyzeApiPlugin()],
  }
})
