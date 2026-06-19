import { describe, expect, it } from 'vitest'
import {
  loadImportedQuestions,
  loadQuizProgress,
  mergeImportedQuestions,
  saveImportedQuestions,
  saveQuizProgress,
} from './storage'
import type { QuizProgress } from '../types'

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('quiz progress storage', () => {
  it('returns empty progress when storage has no quiz state', () => {
    expect(loadQuizProgress(createMemoryStorage())).toEqual({
      attempts: [],
      starredQuestionIds: [],
    })
  })

  it('round-trips attempts and starred question ids through localStorage shape', () => {
    const storage = createMemoryStorage()
    const progress: QuizProgress = {
      attempts: [
        {
          questionId: 'q1',
          selectedOptionIds: ['A'],
          isCorrect: true,
          answeredAt: '2026-06-19T00:00:00.000Z',
        },
      ],
      starredQuestionIds: ['q1'],
    }

    saveQuizProgress(progress, storage)

    expect(loadQuizProgress(storage)).toEqual(progress)
  })

  it('recovers from invalid JSON without throwing', () => {
    const storage = createMemoryStorage({
      'rac.quiz.progress.v1': '{not valid json',
    })

    expect(loadQuizProgress(storage)).toEqual({
      attempts: [],
      starredQuestionIds: [],
    })
  })
})

describe('imported question bank storage', () => {
  it('round-trips imported questions independently of progress', () => {
    const storage = createMemoryStorage()
    const questions = [
      {
        id: 'rac-d3-q001',
        packId: 'rac-device-day-003',
        type: 'single' as const,
        domain: 'Premarket',
        tags: ['510k'],
        difficulty: 'easy' as const,
        prompt: 'Predicate means?',
        options: [
          { id: 'A', text: 'Any device' },
          { id: 'B', text: 'Legally marketed comparison device' },
        ],
        correctOptionIds: ['B'],
        explanation: 'Predicate is a legally marketed comparison device.',
      },
    ]

    saveImportedQuestions(questions, storage)

    expect(loadImportedQuestions(storage)).toEqual(questions)
    expect(loadQuizProgress(storage)).toEqual({
      attempts: [],
      starredQuestionIds: [],
    })
  })

  it('merges imported questions by id and reports added vs updated counts', () => {
    const existing = [
      {
        id: 'q1',
        packId: 'pack-a',
        type: 'single' as const,
        domain: 'Old',
        tags: ['old'],
        difficulty: 'easy' as const,
        prompt: 'Old prompt',
        options: [
          { id: 'A', text: 'A' },
          { id: 'B', text: 'B' },
        ],
        correctOptionIds: ['A'],
        explanation: 'Old',
      },
    ]
    const incoming = [
      { ...existing[0], domain: 'New', prompt: 'Updated prompt' },
      { ...existing[0], id: 'q2', prompt: 'New prompt' },
    ]

    expect(mergeImportedQuestions(existing, incoming)).toEqual({
      added: 1,
      updated: 1,
      questions: [
        { ...existing[0], domain: 'New', prompt: 'Updated prompt' },
        { ...existing[0], id: 'q2', prompt: 'New prompt' },
      ],
    })
  })
})
