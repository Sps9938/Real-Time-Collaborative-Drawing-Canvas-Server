import { randomUUID } from 'node:crypto'
import { createDrawingState } from './drawing-state.js'

const palette = ['#06b6d4', '#f472b6', '#a78bfa', '#22d3ee', '#f97316', '#10b981', '#ef4444', '#eab308']

// Generate a lightweight guest label for anonymous users
const nextName = () => {
  const animals = ['fox', 'lynx', 'otter', 'kite', 'orca', 'sparrow', 'panda', 'lemur', 'yak', 'ibis']
  const noun = animals[Math.floor(Math.random() * animals.length)]
  return `guest-${noun}-${Math.floor(Math.random() * 900 + 100)}`
}

function createRoom(id = 'main') {
  const state = createDrawingState()
  const users = new Map()
  let colorIndex = 0

  // Add a user with a unique id, friendly name, and rotating color
  const addUser = user => {
    const color = palette[colorIndex++ % palette.length]
    const presence = {
      id: user.id || randomUUID(),
      name: user.name?.trim() || nextName(),
      color,
      joinedAt: Date.now()
    }
    users.set(presence.id, presence)
    return presence
  }

  // Remove a user and drop any in-progress strokes they owned
  const removeUser = userId => {
    users.delete(userId)
    state.dropActiveByUser(userId)
  }

  // List current users in join order
  const listUsers = () => Array.from(users.values())

  return { id, state, addUser, removeUser, listUsers }
}

export function createRooms() {
  const rooms = new Map()
  // Ensure a room exists (lazy-create) and return it
  const ensureRoom = roomId => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createRoom(roomId))
    }
    return rooms.get(roomId)
  }

  return { ensureRoom }
}
