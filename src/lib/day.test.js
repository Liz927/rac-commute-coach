import { describe, expect, it } from 'vitest'
import { createEmptyDay, getDayStats, getOverallStats, mergeParsedQuestions } from './day'

describe('day helpers', () => {
  it('creates a complete editable Day shape', () => {
    const day = createEmptyDay(3, '2026-06-16T00:00:00.000Z')

    expect(day).toMatchObject({
      dayNumber: 3,
      title: '',
      contentMarkdown: '',
      completed: false,
      notes: '',
      sections: [],
      questions: [],
      marks: [],
      createdAt: '2026-06-16T00:00:00.000Z',
      updatedAt: '2026-06-16T00:00:00.000Z',
    })
  })

  it('calculates question and mark counts', () => {
    const day = {
      questions: [
        { userAnswer: 'A', correctAnswer: 'A' },
        { userAnswer: 'B', correctAnswer: 'C' },
        { correctAnswer: 'D' },
      ],
      marks: [
        { markType: 'question' },
        { markType: 'question' },
        { markType: 'important' },
      ],
    }

    expect(getDayStats(day)).toEqual({
      answered: 2,
      totalQuestions: 3,
      correct: 1,
      marks: { question: 2, unsure: 0, important: 1, understood: 0 },
    })
  })

  it('calculates overall completion and accuracy', () => {
    const stats = getOverallStats([
      { completed: true, questions: [{ userAnswer: 'A', correctAnswer: 'A' }], marks: [] },
      { completed: false, questions: [{ userAnswer: 'B', correctAnswer: 'C' }], marks: [] },
    ])

    expect(stats).toEqual({
      completedDays: 1,
      totalDays: 2,
      answered: 2,
      correct: 1,
      accuracy: 50,
    })
  })

  it('keeps answer state when reparsing the same question', () => {
    const merged = mergeParsedQuestions(
      [{ id: 'day-q1', userAnswer: 'A', isUnsure: true, showAnswer: true }],
      [{ id: 'day-q1', label: 'Q1', question: 'Updated' }],
    )

    expect(merged[0]).toMatchObject({
      question: 'Updated',
      userAnswer: 'A',
      isUnsure: true,
      showAnswer: true,
    })
  })
})
