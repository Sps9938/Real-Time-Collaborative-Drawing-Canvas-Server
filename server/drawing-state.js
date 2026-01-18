export function createDrawingState() {
  const strokes = []
  const undone = []
  const active = new Map()
  let seq = 0

  // Return a snapshot of all committed strokes without exposing internal arrays
  const all = () => strokes.slice()

  // Begin tracking a new in-progress stroke for a user
  const start = ({ strokeId, userId, tool, color, size }) => {
    const stroke = {
      id: strokeId,
      userId,
      tool,
      color,
      size,
      points: [],
      seq: seq++,
      createdAt: Date.now()
    }
    active.set(strokeId, stroke)
    return stroke
  }

  // Append points to an active stroke; ignore if the stroke is no longer active
  const addPoints = (strokeId, points) => {
    const stroke = active.get(strokeId)
    if (!stroke) return null
    stroke.points.push(...points)
    return stroke
  }

  // Finalize an active stroke, clear redo history, and store it as committed
  const commit = strokeId => {
    const stroke = active.get(strokeId)
    if (!stroke) return null
    active.delete(strokeId)
    undone.length = 0
    strokes.push(stroke)
    return stroke
  }

  // Undo the most recent committed stroke, moving it to the redo stack
  const undo = () => {
    if (!strokes.length) return null
    const stroke = strokes.pop()
    undone.push(stroke)
    return stroke
  }

  // Redo the most recently undone stroke, moving it back to committed strokes
  const redo = () => {
    if (!undone.length) return null
    const stroke = undone.pop()
    strokes.push(stroke)
    return stroke
  }

  // Remove any in-progress strokes that belong to a given user (e.g., on disconnect)
  const dropActiveByUser = userId => {
    for (const [id, stroke] of active.entries()) {
      if (stroke.userId === userId) {
        active.delete(id)
      }
    }
  }

  return { all, start, addPoints, commit, undo, redo, dropActiveByUser }
}
