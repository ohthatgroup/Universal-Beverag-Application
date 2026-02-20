export type MoveMode = 'top' | 'bottom' | 'position'

interface HasId {
  id: string
}

export function reorderByDrag<T extends HasId>(
  rows: T[],
  draggingId: string,
  targetId: string
): T[] {
  if (draggingId === targetId) return rows
  const fromIndex = rows.findIndex((row) => row.id === draggingId)
  const toIndex = rows.findIndex((row) => row.id === targetId)
  if (fromIndex < 0 || toIndex < 0) return rows

  const nextRows = [...rows]
  const [moved] = nextRows.splice(fromIndex, 1)
  nextRows.splice(toIndex, 0, moved)
  return nextRows
}

export function moveSelectedRows<T extends HasId>(
  rows: T[],
  selectedIds: Set<string>,
  mode: MoveMode,
  position: number | null = null
): T[] {
  if (selectedIds.size === 0) return rows

  const selected = rows.filter((row) => selectedIds.has(row.id))
  if (selected.length === 0 || selected.length === rows.length) return rows
  const unselected = rows.filter((row) => !selectedIds.has(row.id))

  if (mode === 'top') {
    return [...selected, ...unselected]
  }

  if (mode === 'bottom') {
    return [...unselected, ...selected]
  }

  const desired = position ?? 1
  const clamped = Math.max(1, Math.min(unselected.length + 1, Math.floor(desired)))
  const insertionIndex = clamped - 1
  return [
    ...unselected.slice(0, insertionIndex),
    ...selected,
    ...unselected.slice(insertionIndex),
  ]
}

