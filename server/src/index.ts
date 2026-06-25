import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { initFirebaseAdmin, getDatabase } from './firebase.js'
import { registerSocketHandlers } from './socket/index.js'
import authRoutes from './routes/auth.js'
import projectsRoutes from './routes/projects.js'
import trackRoutes from './routes/track.js'
import dashboardRoutes from './routes/dashboard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: [config.corsOrigin, '*'],
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/public', express.static(path.join(__dirname, '../public')))

app.get('/tracker.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.sendFile(path.join(__dirname, '../public/tracker.js'))
})

app.get('/web', (_req, res) => {
  res.sendFile(path.join(__dirname, '../web.html'))
})

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api', trackRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MatuAnalytics API' })
})

registerSocketHandlers(io)

async function start() {
  await initFirebaseAdmin()
  await getDatabase()
  httpServer.listen(config.port, () => {
    console.log(`MatuAnalytics API running on http://localhost:${config.port}`)
    console.log(`Tracker script: ${config.apiUrl}/tracker.js`)
  })
}

start().catch(console.error)

export { io }
