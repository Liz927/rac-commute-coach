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
