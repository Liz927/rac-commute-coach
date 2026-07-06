import { describe, expect, it } from 'vitest'
import {
  buildReadingToc,
  createReadingBookmark,
  getActiveTocItem,
  getReadingPositionKey,
  loadReadingBookmark,
  loadReadingPosition,
  saveReadingBookmark,
  saveReadingPosition,
} from './readingProgress'

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const day = {
  id: 'day-9',
  packId: 'rac-device-day-009',
}

const sections = [
  { id: 'day-9-s0', label: 'S0', title: '今天的目标' },
  { id: 'day-9-s1', label: 'S1', title: '核心概念' },
  { id: 'day-9-s2', label: 'S2', title: '判断树' },
  { id: 'day-9-t', label: 'T', title: '术语卡' },
  { id: 'day-9-r', label: 'R', title: '晚上回收问题' },
]

describe('reading progress helpers', () => {
  it('builds stable TOC items from parsed Day sections', () => {
    expect(buildReadingToc(day, sections)).toEqual([
      { id: 'day-9-s0', label: 'S0', title: '今天的目标', text: 'S0｜今天的目标', index: 0 },
      { id: 'day-9-s1', label: 'S1', title: '核心概念', text: 'S1｜核心概念', index: 1 },
      { id: 'day-9-s2', label: 'S2', title: '判断树', text: 'S2｜判断树', index: 2 },
      { id: 'day-9-t', label: 'T', title: '术语卡', text: 'T｜术语卡', index: 3 },
      { id: 'day-9-r', label: 'R', title: '晚上回收问题', text: 'R｜晚上回收问题', index: 4 },
    ])
  })

  it('keys saved positions by both day id and pack id', () => {
    expect(getReadingPositionKey(day)).toBe(
      'rac.readingPosition.v1:day-9:rac-device-day-009',
    )
    expect(getReadingPositionKey({ id: 'day-10', packId: 'rac-device-day-010' })).toBe(
      'rac.readingPosition.v1:day-10:rac-device-day-010',
    )
  })

  it('saves and restores the latest reading position', () => {
    const storage = createMemoryStorage()
    saveReadingPosition(
      day,
      {
        scrollTop: 1200,
        currentHeadingId: 'day-9-s6',
        currentHeadingText: 'S6｜Workflow',
        progressPercent: 58,
      },
      storage,
      '2026-07-06T00:00:00.000Z',
    )

    expect(loadReadingPosition(day, storage)).toEqual({
      dayId: 'day-9',
      packId: 'rac-device-day-009',
      scrollTop: 1200,
      currentHeadingId: 'day-9-s6',
      currentHeadingText: 'S6｜Workflow',
      progressPercent: 58,
      updatedAt: '2026-07-06T00:00:00.000Z',
    })
  })

  it('creates and restores one active bookmark per Day', () => {
    const storage = createMemoryStorage()
    const bookmark = createReadingBookmark(
      day,
      { id: 'day-9-s7', text: 'S7｜关键证据' },
      1600,
      '2026-07-06T01:00:00.000Z',
    )
    saveReadingBookmark(day, bookmark, storage)

    expect(loadReadingBookmark(day, storage)).toMatchObject({
      dayId: 'day-9',
      packId: 'rac-device-day-009',
      headingId: 'day-9-s7',
      headingText: 'S7｜关键证据',
      scrollTop: 1600,
    })
  })

  it('finds the active section by scroll position', () => {
    const toc = buildReadingToc(day, sections)
    expect(getActiveTocItem(toc, 515, { 'day-9-s0': 0, 'day-9-s1': 400, 'day-9-s2': 800 })?.id)
      .toBe('day-9-s1')
  })
})
