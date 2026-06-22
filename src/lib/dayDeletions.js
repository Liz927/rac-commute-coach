import { notifyLocalDataChanged } from './localChanges'

const DELETED_DAYS_KEY = 'rac-commute-coach-deleted-days'

function normalizeDeletedDays(value) {
  if (!Array.isArray(value)) return []
  const byId = new Map()
  value.forEach((item) => {
    if (!item?.id) return
    const current = byId.get(item.id)
    if (!current || Date.parse(item.deletedAt || '') >= Date.parse(current.deletedAt || '')) {
      byId.set(item.id, { id: item.id, deletedAt: item.deletedAt || new Date().toISOString() })
    }
  })
  return Array.from(byId.values())
}

export function loadDeletedDays() {
  try {
    return normalizeDeletedDays(JSON.parse(localStorage.getItem(DELETED_DAYS_KEY) || '[]'))
  } catch {
    return []
  }
}

export function saveDeletedDays(deletedDays) {
  localStorage.setItem(DELETED_DAYS_KEY, JSON.stringify(normalizeDeletedDays(deletedDays)))
  notifyLocalDataChanged()
}

export function markDayDeleted(id, deletedAt = new Date().toISOString()) {
  const next = [...loadDeletedDays().filter((item) => item.id !== id), { id, deletedAt }]
  saveDeletedDays(next)
  return next
}

export function markDaysDeleted(ids, deletedAt = new Date().toISOString()) {
  const nextById = new Map(loadDeletedDays().map((item) => [item.id, item]))
  ids.forEach((id) => {
    if (id) nextById.set(id, { id, deletedAt })
  })
  const next = Array.from(nextById.values())
  saveDeletedDays(next)
  return next
}

export function clearDeletedDayTombstones(ids) {
  const restoredIds = new Set(ids)
  saveDeletedDays(loadDeletedDays().filter((item) => !restoredIds.has(item.id)))
}
