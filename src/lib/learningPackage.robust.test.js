import { describe, expect, it } from 'vitest'
import { parseLearningPackage, sanitizeQuestionsJsonText } from './learningPackage'

function questionJson(overrides = {}) {
  return JSON.stringify([
    {
      id: 'D10-Q1',
      type: 'single_choice',
      stem: 'What is the best answer?',
      options: [
        { key: 'A', text: 'A option' },
        { key: 'B', text: 'B option' },
        { key: 'C', text: 'C option' },
        { key: 'D', text: 'D option' },
      ],
      answer: 'B',
      explanation: 'Because B is correct.',
      ...overrides,
    },
  ], null, 2)
}

function v2Package({ meta, content = '# Test content', questions = questionJson() }) {
  return `
RAC_DAY_PACKAGE_V2_START
META_START
${meta}
META_END
CONTENT_START
${content}
CONTENT_END
QUESTIONS_JSON_START
${questions}
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END
`
}

describe('robust RAC_DAY_PACKAGE_V2 parsing', () => {
  it('accepts standard key:value V2 meta', () => {
    const result = parseLearningPackage(v2Package({
      meta: `
day: 10
title: test
packId: rac-device-day-010
domain: Premarket
tags: endpoint,biomarker
difficulty: medium
`,
    }))

    expect(result.meta).toMatchObject({
      day: 10,
      title: 'test',
      packId: 'rac-device-day-010',
      domain: 'Premarket',
      tags: ['endpoint', 'biomarker'],
      difficulty: 'medium',
    })
    expect(result.questions).toHaveLength(1)
  })

  it('accepts legacy JSON object V2 meta', () => {
    const result = parseLearningPackage(v2Package({
      meta: `{
  "dayId": "day10",
  "packId": "rac-device-day10-clinical-endpoint-biomarker-claim",
  "version": "RAC_DAY_PACKAGE_V2",
  "title": "RAC Day 10 | Clinical Endpoint"
}`,
    }))

    expect(result.meta).toMatchObject({
      day: 10,
      title: 'RAC Day 10 | Clinical Endpoint',
      packId: 'rac-device-day10-clinical-endpoint-biomarker-claim',
    })
  })

  it('merges mixed key:value and legacy JSON meta with key:value taking priority', () => {
    const result = parseLearningPackage(v2Package({
      meta: `title: Key Value Title
{
  "dayId": "day10",
  "packId": "rac-device-day-010-json-pack",
  "title": "JSON Title"
}`,
    }))

    expect(result.meta).toMatchObject({
      day: 10,
      title: 'Key Value Title',
      packId: 'rac-device-day-010-json-pack',
    })
  })

  it('repairs smart quotes used as JSON structural quotes', () => {
    const result = parseLearningPackage(v2Package({
      meta: 'title: smart quote test',
      questions: `[
  {
    “id”: “D10-Q1”,
    “type”: “single_choice”,
    “stem”: “What is “CDx” in this sentence?”,
    “options”: [
      {“key”: “A”, “text”: “A option”},
      {“key”: “B”, “text”: “B option”},
      {“key”: “C”, “text”: “C option”},
      {“key”: “D”, “text”: “D option”}
    ],
    “answer”: “B”,
    “explanation”: “Keep inner “CDx” quotes readable.”
  }
]`,
    }))

    expect(result.questionsJsonNormalized).toBe(true)
    expect(result.questions[0]).toMatchObject({
      id: 'D10-Q1',
      prompt: 'What is “CDx” in this sentence?',
      correctOptionIds: ['B'],
    })
  })

  it('removes markdown fences around QUESTIONS_JSON', () => {
    const result = parseLearningPackage(v2Package({
      meta: 'title: fenced json',
      questions: `\`\`\`json
${questionJson()}
\`\`\``,
    }))

    expect(result.questions[0].id).toBe('D10-Q1')
  })

  it('reports invalid JSON with line, column, and nearby context', () => {
    expect(() => parseLearningPackage(v2Package({
      meta: 'title: bad json',
      questions: `[
  {
    "id": "D10-Q1",
    从这里坏掉
  }
]`,
    }))).toThrow(/QUESTIONS_JSON 不是合法 JSON.*第 4 行.*从这里坏掉/s)
  })

  it('validates question schema with question id context', () => {
    expect(() => parseLearningPackage(v2Package({
      meta: 'title: bad schema',
      questions: questionJson({ answer: 'E' }),
    }))).toThrow(/answer 非法.*D10-Q1/)
  })

  it('accepts AI object-style options by normalizing them to option rows', () => {
    const result = parseLearningPackage(v2Package({
      meta: 'title: object options',
      questions: JSON.stringify([
        {
          id: 'D10-Q2',
          type: 'single_choice',
          stem: 'Object options?',
          options: {
            A: 'A option',
            B: 'B option',
            C: 'C option',
            D: 'D option',
          },
          answer: 'B',
          explanation: 'Object options were normalized.',
        },
      ]),
    }))

    expect(result.questions[0].options).toEqual([
      { id: 'A', text: 'A option' },
      { id: 'B', text: 'B option' },
      { id: 'C', text: 'C option' },
      { id: 'D', text: 'D option' },
    ])
  })

  it('exposes sanitized JSON text for direct parser diagnostics', () => {
    expect(sanitizeQuestionsJsonText('```json\n[{“id”: “q1”}]\n```').text)
      .toBe('[{"id": "q1"}]')
  })
})
