import { describe, expect, it } from 'vitest'
import { mergeSyncPayloads, toFirestoreSafe } from './cloudSyncData'

describe('mergeSyncPayloads', () => {
  it('keeps the newer Day while preserving unique Days from both devices', () => {
    const merged = mergeSyncPayloads(
      {
        days: [
          { id: 'day-1', title: 'Local old', updatedAt: '2026-06-20T08:00:00.000Z' },
          { id: 'day-2', title: 'Only local', updatedAt: '2026-06-20T09:00:00.000Z' },
        ],
        quizQuestions: [],
        quizProgress: { attempts: [], starredQuestionIds: [] },
      },
      {
        days: [
          { id: 'day-1', title: 'Remote new', updatedAt: '2026-06-20T10:00:00.000Z' },
          { id: 'day-3', title: 'Only remote', updatedAt: '2026-06-20T11:00:00.000Z' },
        ],
        quizQuestions: [],
        quizProgress: { attempts: [], starredQuestionIds: [] },
      },
    )

    expect(Object.fromEntries(merged.days.map((day) => [day.id, day.title]))).toEqual({
      'day-1': 'Remote new',
      'day-2': 'Only local',
      'day-3': 'Only remote',
    })
  })

  it('merges quiz content without duplicating attempts or favorites', () => {
    const attempt = {
      questionId: 'q-1',
      selectedOptionIds: ['A'],
      isCorrect: false,
      answeredAt: '2026-06-20T08:00:00.000Z',
    }
    const merged = mergeSyncPayloads(
      {
        days: [],
        quizQuestions: [{ id: 'q-1', prompt: 'Local version' }],
        quizProgress: { attempts: [attempt], starredQuestionIds: ['q-1'] },
      },
      {
        days: [],
        quizQuestions: [
          { id: 'q-1', prompt: 'Remote version' },
          { id: 'q-2', prompt: 'Remote only' },
        ],
        quizProgress: {
          attempts: [attempt, { ...attempt, questionId: 'q-2', answeredAt: '2026-06-20T09:00:00.000Z' }],
          starredQuestionIds: ['q-2'],
        },
      },
    )

    expect(merged.quizQuestions).toEqual([
      { id: 'q-1', prompt: 'Local version' },
      { id: 'q-2', prompt: 'Remote only' },
    ])
    expect(merged.quizProgress.attempts).toHaveLength(2)
    expect(merged.quizProgress.starredQuestionIds.sort()).toEqual(['q-1', 'q-2'])
  })

  it('keeps deleted Day tombstones so an older cloud copy cannot reappear', () => {
    const merged = mergeSyncPayloads(
      {
        days: [{ id: 'day-keep', title: 'Keep me' }],
        deletedDays: [{ id: 'day-duplicate', deletedAt: '2026-06-22T12:00:00.000Z' }],
      },
      {
        days: [
          { id: 'day-keep', title: 'Keep me remotely' },
          { id: 'day-duplicate', title: 'Duplicate Day 4' },
        ],
      },
    )

    expect(merged.days.map((day) => day.id)).toEqual(['day-keep'])
    expect(merged.deletedDays).toEqual([
      { id: 'day-duplicate', deletedAt: '2026-06-22T12:00:00.000Z' },
    ])
  })

  it('does not let a stale remote Day snapshot remove a local pending quick note', () => {
    const merged = mergeSyncPayloads(
      {
        days: [
          {
            id: 'day-7',
            title: 'Local Day 7',
            packId: 'rac-device-day-007',
            updatedAt: '2026-06-25T10:00:00.000Z',
            quickNotes: [
              {
                id: 'note-local-pending',
                dayId: 'day-7',
                packId: 'rac-device-day-007',
                content: 'local pending note',
                text: 'local pending note',
                syncStatus: 'pending',
                createdAt: '2026-06-25T10:00:00.000Z',
                updatedAt: '2026-06-25T10:00:00.000Z',
              },
            ],
          },
        ],
      },
      {
        days: [
          {
            id: 'day-7',
            title: 'Remote Day 7',
            packId: 'rac-device-day-007',
            updatedAt: '2026-06-25T11:00:00.000Z',
            quickNotes: [],
          },
        ],
      },
    )

    expect(merged.days[0].quickNotes).toEqual([
      expect.objectContaining({
        id: 'note-local-pending',
        content: 'local pending note',
        syncStatus: 'pending',
      }),
    ])
  })

  it('keeps the newest version of a quick note when local and remote both have it', () => {
    const merged = mergeSyncPayloads(
      {
        days: [
          {
            id: 'day-7',
            updatedAt: '2026-06-25T10:00:00.000Z',
            quickNotes: [
              {
                id: 'same-note',
                content: 'new local text',
                text: 'new local text',
                updatedAt: '2026-06-25T10:00:00.000Z',
              },
            ],
          },
        ],
      },
      {
        days: [
          {
            id: 'day-7',
            updatedAt: '2026-06-25T11:00:00.000Z',
            quickNotes: [
              {
                id: 'same-note',
                content: 'old remote text',
                text: 'old remote text',
                updatedAt: '2026-06-25T09:00:00.000Z',
              },
            ],
          },
        ],
      },
    )

    expect(merged.days[0].quickNotes[0]).toMatchObject({
      id: 'same-note',
      content: 'new local text',
    })
  })

  it('merges Day bookmarks instead of dropping them with an older remote snapshot', () => {
    const merged = mergeSyncPayloads(
      {
        days: [
          {
            id: 'day-9',
            updatedAt: '2026-07-21T10:00:00.000Z',
            bookmarks: [
              {
                id: 'bookmark-s6',
                sectionId: 'day-9-s6',
                headingId: 'day-9-s6',
                headingText: 'S6 | Evidence',
                updatedAt: '2026-07-21T10:00:00.000Z',
              },
            ],
          },
        ],
      },
      {
        days: [
          {
            id: 'day-9',
            updatedAt: '2026-07-21T11:00:00.000Z',
            bookmarks: [],
          },
        ],
      },
    )

    expect(merged.days[0].bookmarks).toEqual([
      expect.objectContaining({ id: 'bookmark-s6', sectionId: 'day-9-s6' }),
    ])
  })

  it('removes undefined values before a payload is sent to Firestore', () => {
    expect(toFirestoreSafe({
      title: 'Day 1',
      userAnswer: undefined,
      questions: [{ id: 'q-1', note: undefined, options: ['A', undefined] }],
    })).toEqual({
      title: 'Day 1',
      questions: [{ id: 'q-1', options: ['A'] }],
    })
  })
})
