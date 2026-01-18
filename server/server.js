import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { createRooms } from './rooms.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
// Configure Socket.IO with permissive CORS for the drawing client
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())

const distPath = path.resolve(__dirname, '../dist')
if (process.env.NODE_ENV === 'production') {
  // Serve the built client in production
  app.use(express.static(distPath))
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')))
}

const { ensureRoom } = createRooms()

io.on('connection', socket => {
  // Single-room model for now; extendable later
  const room = ensureRoom('main')
  let user

  socket.on('join', payload => {
    user = room.addUser({ id: socket.id, name: payload?.name })
    socket.join(room.id)
    socket.emit('init', { user, users: room.listUsers(), strokes: room.state.all() })
    socket.to(room.id).emit('user:joined', user)
  })

  socket.on('stroke:start', data => {
    if (!user) return
    const stroke = room.state.start({
      strokeId: data.strokeId,
      userId: user.id,
      tool: data.tool,
      color: data.color,
      size: data.size
    })
    socket.to(room.id).emit('stroke:start', { ...stroke, points: [] })
  })

  socket.on('stroke:points', data => {
    if (!user) return
    const points = data.points || []
    room.state.addPoints(data.strokeId, points)
    socket.to(room.id).emit('stroke:points', { strokeId: data.strokeId, points, userId: user.id })
  })

  socket.on('stroke:end', data => {
    if (!user) return
    const stroke = room.state.commit(data.strokeId)
    if (!stroke) return
    io.to(room.id).emit('stroke:commit', stroke)
  })

  socket.on('undo', () => {
    if (!user) return
    const stroke = room.state.undo()
    if (!stroke) return
    io.to(room.id).emit('stroke:undo', { strokeId: stroke.id })
  })

  socket.on('redo', () => {
    if (!user) return
    const stroke = room.state.redo()
    if (!stroke) return
    io.to(room.id).emit('stroke:redo', stroke)
  })

  socket.on('cursor:move', data => {
    if (!user) return
    socket.to(room.id).emit('cursor', {
      userId: user.id,
      x: data.x,
      y: data.y,
      color: user.color,
      name: user.name
    })
  })

  socket.on('disconnect', () => {
    if (!user) return
    room.removeUser(user.id)
    socket.to(room.id).emit('user:left', { userId: user.id })
  })
})

const port = process.env.PORT || 3001
server.listen(port, () => {
  console.log(`server listening on ${port}`)
})
