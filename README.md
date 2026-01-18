# Collaborative Canvas Backend

Minimal Socket.IO + Express backend for a shared drawing board. Manages rooms, presence, cursor broadcasts, and stroke history with undo/redo.

## Features
- WebSocket transport with Socket.IO for low-latency drawing updates
- Single shared room by default (`main`) with auto-generated guest names and color palette
- Stroke lifecycle: start, stream points, commit, undo, redo
- Presence: join/leave notifications and live cursor sharing
- Static file serving of the built client when `NODE_ENV=production`

## Stack
- Node.js (ES modules)
- Express for HTTP/static serving
- Socket.IO for realtime events
- Vite + React client (run separately from `client/`, not included in this repo snapshot)

## Project layout
- [package.json](package.json): scripts and dependencies
- [server/server.js](server/server.js): HTTP + WebSocket entrypoint
- [server/rooms.js](server/rooms.js): room lifecycle and user presence
- [server/drawing-state.js](server/drawing-state.js): stroke state with undo/redo

## Getting started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start backend only (listens on 3001 by default):
   ```bash
   npm run server
   ```
   - Set `PORT` to override the port.
   - Set `CLIENT_ORIGIN` to restrict allowed websocket origins (defaults to `*`).
3. (Optional) If you have the client code in `client/`, run both backend and Vite dev server:
   ```bash
   npm run dev
   ```

## Socket events
- Client -> server
  - `join` `{ name? }`: join the main room; assigns color and user id
  - `stroke:start` `{ strokeId, tool, color, size }`: begin a stroke
  - `stroke:points` `{ strokeId, points: [{x,y}], tool?, color?, size? }`: stream points for an in-progress stroke
  - `stroke:end` `{ strokeId }`: commit the active stroke
  - `undo` / `redo`: request undo/redo of recent committed strokes
  - `cursor:move` `{ x, y }`: share current cursor position
- Server -> client
  - `init` `{ user, users, strokes }`: initial presence and full stroke history
  - `user:joined` `user`: another user joined
  - `user:left` `{ userId }`: user left
  - `stroke:start` `{ strokeId, userId, tool, color, size, points: [] }`
  - `stroke:points` `{ strokeId, userId, points }`
  - `stroke:commit` `stroke`
  - `stroke:undo` `{ strokeId }`
  - `stroke:redo` `stroke`
  - `cursor` `{ userId, x, y, color, name }`

## Production build
If `NODE_ENV=production`, the server will serve the built client from `dist/`. Build the client with:
```bash
npm run build
```
Then deploy by running:
```bash
PORT=3001 NODE_ENV=production node server/server.js
```

## Notes
- Room id is hard-coded to `main`; extend `createRooms()` if you need multiple rooms.
- Active strokes from disconnected users are dropped to keep history consistent.
