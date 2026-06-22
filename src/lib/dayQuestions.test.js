import { describe, expect, it } from 'vitest'
import { getDayQuizAction } from './dayQuestions'
import { getLinkedDayQuestions } from './dayQuestions'

describe('getLinkedDayQuestions', () => {
  it('maps the global Quiz bank for the current Day pack and restores saved interaction state', () => {
    const questions = getLinkedDayQuestions(
      {
        packId: 'rac-device-day-003',
        questions: [],
        questionStates: {
          'rac-d3-q002': { userAnswer: 'C', showAnswer: true, isUnsure: true },
        },
      },
      [
        {
          id: 'rac-d3-q010',
          packId: 'rac-device-day-003',
          prompt: 'Later question',
          options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }],
          correctOptionIds: ['B'],
          explanation: 'Because B.',
        },
        {
          id: 'rac-d3-q002',
          packId: 'rac-device-day-003',
          prompt: 'Earlier question',
          options: [{ id: 'A', text: 'A' }, { id: 'C', text: 'C' }],
          correctOptionIds: ['C'],
          explanation: 'Because C.',
        },
        {
          id: 'other-pack-q001',
          packId: 'other-pack',
          prompt: 'Ignore me',
          options: [],
          correctOptionIds: [],
        },
      ],
    )

    expect(questions).toHaveLength(2)
    expect(questions.map((question) => question.id)).toEqual(['rac-d3-q002', 'rac-d3-q010'])
    expect(questions[0]).toMatchObject({
      number: 2,
      stem: 'Earlier question',
      answer: 'C',
      userAnswer: 'C',
      showAnswer: true,
      isUnsure: true,
    })
    expect(questions[0].options).toEqual([{ key: 'A', text: 'A' }, { key: 'C', text: 'C' }])
  })

  it('uses legacy Day questions when no packId exists', () => {
    const legacyQuestions = [{ id: 'legacy-q', stem: 'Legacy question' }]
    expect(getLinkedDayQuestions({ questions: legacyQuestions }, [])).toBe(legacyQuestions)
  })

  it('enables the reading completion action only when the Day has matching pack questions', () => {
    expect(getDayQuizAction({ packId: 'rac-device-day-003' }, [
      { id: 'rac-d3-q001', packId: 'rac-device-day-003' },
      { id: 'other-q001', packId: 'other-pack' },
    ])).toEqual({ enabled: true, questionCount: 1, reason: '' })

    expect(getDayQuizAction({ packId: 'rac-device-day-003' }, [])).toMatchObject({
      enabled: false,
      questionCount: 0,
      reason: 'no-questions',
    })
    expect(getDayQuizAction({}, [])).toMatchObject({
      enabled: false,
      questionCount: 0,
      reason: 'missing-pack',
    })
  })
})
