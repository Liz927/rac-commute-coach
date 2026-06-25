import { describe, expect, it } from 'vitest'
import {
  appendQuickNoteToDay,
  createEmptyDay,
  getDayStats,
  getOverallStats,
  mergeParsedQuestions,
  selectQuestionAnswerPatch,
} from './day'

describe('day helpers', () => {
  it('creates a complete editable Day shape', () => {
    const day = createEmptyDay(3, '2026-06-16T00:00:00.000Z')

    expect(day).toMatchObject({
      dayNumber: 3,
      title: '',
      contentMarkdown: '',
      completed: false,
      notes: '',
      freeNotes: '',
      quickDraft: '',
      reviewDraft: '',
      sections: [],
      questions: [],
      marks: [],
      sectionNotes: [],
      questionNotes: [],
      quickNotes: [],
      createdAt: '2026-06-16T00:00:00.000Z',
      updatedAt: '2026-06-16T00:00:00.000Z',
    })
    expect(day).not.toHaveProperty('audioScripts')
    expect(day).not.toHaveProperty('audioFiles')
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

  it('selects an answer and immediately marks the answer reveal as visible', () => {
    expect(selectQuestionAnswerPatch('C')).toEqual({
      userAnswer: 'C',
      showAnswer: true,
    })
  })

  it('appends a quick note from the submitted text and keeps Day context', () => {
    const day = {
      id: 'day-5',
      packId: 'rac-device-day-005',
      quickDraft: 'old draft',
      quickNotes: [],
    }

    const nextDay = appendQuickNoteToDay(
      day,
      '  special controls  ',
      'general',
      '2026-06-25T00:00:00.000Z',
    )

    expect(nextDay.quickDraft).toBe('')
    expect(nextDay.quickNotes).toEqual([
      expect.objectContaining({
        text: 'special controls',
        content: 'special controls',
        dayId: 'day-5',
        packId: 'rac-device-day-005',
        tag: 'general',
        createdAt: '2026-06-25T00:00:00.000Z',
      }),
    ])
  })
})
