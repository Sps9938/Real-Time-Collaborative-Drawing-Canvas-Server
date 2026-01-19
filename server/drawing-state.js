export function createDrawingState() {
  const strokes = []
  const undone = []
  const active = new Map()
  let seq = 0

  // Return a snapshot of all committed strokes without exposing internal arrays
  const all = () => strokes.slice()

  // Begin tracking a new in-progress stroke for a user
  const start = ({ strokeId, userId, tool, color, size, ...rest }) => {
    const stroke = {
      id: strokeId,
      userId,
      tool,
      color,
      size,
      ...rest,
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
    const shapeTools = ['line', 'rect', 'ellipse']
    const singleAnchorTools = ['image', 'text']
    if (shapeTools.includes(stroke.tool)) {
      const start = stroke.points[0] || points[0]
      const last = points[points.length - 1]
      stroke.points = [start, last]
    } else if (singleAnchorTools.includes(stroke.tool)) {
      const anchor = points[points.length - 1]
      stroke.points = [anchor]
    } else {
      stroke.points.push(...points)
    }
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
  const undo = tool => {
    if (!strokes.length) return null
    const stroke = strokes.pop()
    undone.push(stroke)
    return stroke
  }

  // Redo the most recently undone stroke, moving it back to committed strokes
  const redo = tool => {
    if (!undone.length) return null
    const stroke = undone.pop()
    stroke.seq = seq++
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

  // Wipe all strokes and redo stacks; used for full-canvas resets
  const clear = () => {
    strokes.length = 0
    undone.length = 0
    active.clear()
  }

  return { all, start, addPoints, commit, undo, redo, dropActiveByUser, clear }
}
