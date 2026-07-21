const POSITION_PREFIX = 'rac.readingPosition.v1'
const BOOKMARK_PREFIX = 'rac.readingBookmark.v1'

function safePart(value, fallback) {
  return String(value || fallback).trim().replace(/\s+/g, '-')
}

function makeKey(prefix, day) {
  return `${prefix}:${safePart(day.id, 'day')}:${safePart(day.packId, 'no-pack')}`
}

function parseJson(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function getStorage(defaultStorage) {
  if (defaultStorage) return defaultStorage
  return globalThis.localStorage
}

function fallbackAnchorId(day, section, index) {
  const scope = safePart(day.id || day.packId, 'day')
  const label = safePart(section.label || section.heading || section.title, `section-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]+/gi, '-')
  return `${scope}-${label}-${index}`
}

export function buildReadingToc(day, sections = []) {
  return sections
    .filter((section) => section?.title || section?.heading || section?.label)
    .map((section, index) => {
      const label = section.label || `S${index + 1}`
      const title = section.title || section.heading || label
      return {
        id: section.id || fallbackAnchorId(day, section, index),
        label,
        title,
        text: `${label}｜${title}`,
        index,
      }
    })
}

export function getReadingPositionKey(day) {
  return makeKey(POSITION_PREFIX, day)
}

export function getReadingBookmarkKey(day) {
  return makeKey(BOOKMARK_PREFIX, day)
}

export function saveReadingPosition(
  day,
  position,
  storage = getStorage(),
  now = new Date().toISOString(),
) {
  if (!storage || !day?.id) return null
  const payload = {
    dayId: day.id || '',
    packId: day.packId || '',
    scrollTop: Math.max(0, Math.round(Number(position.scrollTop) || 0)),
    currentHeadingId: position.currentHeadingId || '',
    currentHeadingText: position.currentHeadingText || '',
    progressPercent: Math.max(0, Math.min(100, Math.round(Number(position.progressPercent) || 0))),
    updatedAt: now,
  }
  storage.setItem(getReadingPositionKey(day), JSON.stringify(payload))
  return payload
}

export function loadReadingPosition(day, storage = getStorage()) {
  if (!storage || !day?.id) return null
  const value = parseJson(storage.getItem(getReadingPositionKey(day)))
  if (!value || value.dayId !== day.id) return null
  if (day.packId && value.packId && value.packId !== day.packId) return null
  return value
}

export function createReadingBookmark(
  day,
  heading,
  scrollTop,
  now = new Date().toISOString(),
) {
  const id = `${day.id || day.packId || 'day'}-bookmark`
  return {
    id,
    dayId: day.id || '',
    packId: day.packId || '',
    headingId: heading?.id || '',
    headingText: heading?.text || heading?.title || '',
    scrollTop: Math.max(0, Math.round(Number(scrollTop) || 0)),
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function saveReadingBookmark(day, bookmark, storage = getStorage()) {
  if (!storage || !day?.id || !bookmark) return null
  storage.setItem(getReadingBookmarkKey(day), JSON.stringify(bookmark))
  return bookmark
}

export function clearReadingBookmark(day, storage = getStorage()) {
  if (!storage || !day?.id) return
  storage.removeItem(getReadingBookmarkKey(day))
}

export function loadReadingBookmark(day, storage = getStorage()) {
  if (!storage || !day?.id) return null
  const value = parseJson(storage.getItem(getReadingBookmarkKey(day)))
  if (!value || value.dayId !== day.id) return null
  if (day.packId && value.packId && value.packId !== day.packId) return null
  return value
}

export function calculateProgressPercent(scrollTop, scrollHeight, clientHeight) {
  const maxScroll = Math.max(1, (Number(scrollHeight) || 0) - (Number(clientHeight) || 0))
  return Math.max(0, Math.min(100, Math.round((Math.max(0, scrollTop) / maxScroll) * 100)))
}

export function getActiveTocItem(tocItems = [], scrollTop = 0, headingOffsets = {}) {
  let active = tocItems[0] || null
  tocItems.forEach((item) => {
    const offset = Number(headingOffsets[item.id])
    if (Number.isFinite(offset) && offset <= scrollTop + 120) active = item
  })
  return active
}
