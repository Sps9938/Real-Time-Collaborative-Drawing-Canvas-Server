export function createDrawingState() {
  const strokes = []
  const undone = { pen: [], eraser: [] }
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
    if (shapeTools.includes(stroke.tool)) {
      const start = stroke.points[0] || points[0]
      const last = points[points.length - 1]
      stroke.points = [start, last]
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
    if (undone[stroke.tool]) {
      undone[stroke.tool].length = 0
    }
    strokes.push(stroke)
    return stroke
  }

  // Undo the most recent committed stroke, moving it to the redo stack
  const undo = tool => {
    if (!strokes.length) return null
    if (!tool) {
      const stroke = strokes.pop()
      if (undone[stroke.tool]) undone[stroke.tool].push(stroke)
      return stroke
    }
    const idxFromEnd = [...strokes].reverse().findIndex(s => s.tool === tool)
    if (idxFromEnd === -1) return null
    const realIdx = strokes.length - 1 - idxFromEnd
    const [stroke] = strokes.splice(realIdx, 1)
    if (undone[stroke.tool]) {
      undone[stroke.tool].push(stroke)
    }
    return stroke
  }

  // Redo the most recently undone stroke, moving it back to committed strokes
  const redo = tool => {
    const stack = tool ? undone[tool] : null
    if (stack && stack.length) {
      const stroke = stack.pop()
      strokes.push(stroke)
      return stroke
    }
    return null
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
    Object.values(undone).forEach(stack => (stack.length = 0))
    active.clear()
  }

  return { all, start, addPoints, commit, undo, redo, dropActiveByUser, clear }
}
