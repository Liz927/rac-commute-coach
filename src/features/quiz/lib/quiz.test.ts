import { describe, expect, it } from 'vitest'
import {
  buildStats,
  evaluateAnswer,
  formatCorrectAnswer,
  getAvailableFilters,
  getWrongQuestionIds,
  validateQuestionPack,
} from './quiz'
import type { Question, QuestionPack, QuizAttempt } from '../types'

const questions: Question[] = [
  {
    id: 'q-single',
    type: 'single',
    domain: 'Regulatory Strategy',
    tags: ['510k', 'predicate'],
    difficulty: 'easy',
    prompt: 'Which pathway uses a predicate device comparison?',
    options: [
      { id: 'A', text: '510(k)' },
      { id: 'B', text: 'PMA' },
      { id: 'C', text: 'HDE' },
    ],
    correctOptionIds: ['A'],
    explanation: 'A traditional 510(k) relies on substantial equivalence.',
    placeholder: true,
  },
  {
    id: 'q-multiple',
    type: 'multiple',
    domain: 'Quality Systems',
    tags: ['CAPA', 'QMS'],
    difficulty: 'medium',
    prompt: 'Which items are typical CAPA inputs?',
    options: [
      { id: 'A', text: 'Complaint trends' },
      { id: 'B', text: 'Nonconforming product data' },
      { id: 'C', text: 'Annual holiday calendar' },
    ],
    correctOptionIds: ['A', 'B'],
    explanation: 'CAPA inputs often include complaints and nonconformances.',
    placeholder: true,
  },
]

const validPack: QuestionPack = {
  packId: 'placeholder-pack',
  version: 1,
  title: 'Placeholder Pack',
  source: 'gpt-generated-placeholder',
  isPlaceholder: true,
  questions,
}

describe('evaluateAnswer', () => {
  it('treats single-choice answers as correct only when the selected option matches', () => {
    expect(evaluateAnswer(questions[0], ['A']).isCorrect).toBe(true)
    expect(evaluateAnswer(questions[0], ['B']).isCorrect).toBe(false)
  })

  it('treats multiple-choice answers as set equality regardless of selection order', () => {
    expect(evaluateAnswer(questions[1], ['B', 'A']).isCorrect).toBe(true)
    expect(evaluateAnswer(questions[1], ['A']).isCorrect).toBe(false)
    expect(evaluateAnswer(questions[1], ['A', 'B', 'C']).isCorrect).toBe(false)
  })

  it('formats correct option labels for answer reveal text', () => {
    expect(formatCorrectAnswer(questions[1])).toBe('A. Complaint trends; B. Nonconforming product data')
  })
})

describe('buildStats', () => {
  it('summarizes latest attempts and accuracy by domain', () => {
    const attempts: QuizAttempt[] = [
      {
        questionId: 'q-single',
        selectedOptionIds: ['B'],
        isCorrect: false,
        answeredAt: '2026-06-19T00:00:00.000Z',
      },
      {
        questionId: 'q-single',
        selectedOptionIds: ['A'],
        isCorrect: true,
        answeredAt: '2026-06-19T01:00:00.000Z',
      },
      {
        questionId: 'q-multiple',
        selectedOptionIds: ['A'],
        isCorrect: false,
        answeredAt: '2026-06-19T02:00:00.000Z',
      },
    ]

    const stats = buildStats(questions, attempts)

    expect(stats.totalAnswered).toBe(3)
    expect(stats.correctRate).toBe(33)
    expect(stats.wrongCount).toBe(1)
    expect(stats.byDomain).toEqual([
      { domain: 'Quality Systems', answered: 1, correct: 0, accuracy: 0 },
      { domain: 'Regulatory Strategy', answered: 1, correct: 1, accuracy: 100 },
    ])
    expect(getWrongQuestionIds(attempts)).toEqual(['q-multiple'])
  })
})

describe('question pack helpers', () => {
  it('accepts a valid placeholder question pack and exposes filter values', () => {
    expect(validateQuestionPack(validPack)).toEqual([])
    expect(getAvailableFilters(questions)).toEqual({
      packIds: [],
      domains: ['Quality Systems', 'Regulatory Strategy'],
      difficulties: ['easy', 'medium'],
      tags: ['510k', 'CAPA', 'predicate', 'QMS'],
    })
  })

  it('reports duplicate ids and mismatched answers', () => {
    const badPack: QuestionPack = {
      ...validPack,
      questions: [
        questions[0],
        {
          ...questions[0],
          type: 'multiple',
          correctOptionIds: ['A'],
        },
      ],
    }

    expect(validateQuestionPack(badPack)).toEqual([
      'Duplicate question id: q-single',
      'Question q-single is multiple-choice but has fewer than two correct answers.',
    ])
  })
})
