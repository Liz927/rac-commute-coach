import { describe, expect, it } from 'vitest'
import { parseLearningPackage } from './learningPackage'

const samplePackage = `---RAC_DAY_PACKAGE_V1---
day: 3
title: RAC Day 3｜510(k)：Predicate 与 Substantial Equivalence
packId: rac-device-day-003
domain: Premarket
tags: 510k,predicate,substantial-equivalence,intended-use
difficulty: easy
---CONTENT---
# RAC Day 3｜510(k)：Predicate 与 Substantial Equivalence

## S0｜今天的目标
理解 predicate 和 SE。

Answer: B
Explanation: 不应该出现在阅读页。
---QUESTIONS_JSON---
[
  {
    "id": "rac-d3-q001",
    "type": "single_choice",
    "stem": "510(k) 中 predicate device 最准确的理解是？",
    "options": [
      {"key": "A", "text": "任意同类产品"},
      {"key": "B", "text": "已合法上市、用于 substantial equivalence 比较的参比器械"},
      {"key": "C", "text": "企业内部研发样机"},
      {"key": "D", "text": "临床试验用对照药"}
    ],
    "answer": "B",
    "explanation": "Predicate device 是 legally marketed device。",
    "tags": ["510k", "predicate"]
  }
]
---END---`

describe('parseLearningPackage', () => {
  it('parses metadata, sanitized content, and normalizes quiz questions', () => {
    const result = parseLearningPackage(samplePackage)

    expect(result.meta).toEqual({
      day: 3,
      title: 'RAC Day 3｜510(k)：Predicate 与 Substantial Equivalence',
      packId: 'rac-device-day-003',
      domain: 'Premarket',
      tags: ['510k', 'predicate', 'substantial-equivalence', 'intended-use'],
      difficulty: 'easy',
    })
    expect(result.contentMarkdown).toContain('## S0｜今天的目标')
    expect(result.sanitizedContentMarkdown).not.toMatch(/Answer:|Explanation:/)
    expect(result.questions).toEqual([
      {
        id: 'rac-d3-q001',
        packId: 'rac-device-day-003',
        type: 'single',
        domain: 'Premarket',
        tags: ['510k', 'predicate'],
        difficulty: 'easy',
        prompt: '510(k) 中 predicate device 最准确的理解是？',
        options: [
          { id: 'A', text: '任意同类产品' },
          { id: 'B', text: '已合法上市、用于 substantial equivalence 比较的参比器械' },
          { id: 'C', text: '企业内部研发样机' },
          { id: 'D', text: '临床试验用对照药' },
        ],
        correctOptionIds: ['B'],
        explanation: 'Predicate device 是 legally marketed device。',
      },
    ])
  })

  it('generates packId and missing question ids when needed', () => {
    const result = parseLearningPackage(`---RAC_DAY_PACKAGE_V1---
day: 8
title: RAC Day 8｜Controls
---CONTENT---
# RAC Day 8｜Controls
---QUESTIONS_JSON---
[
  {
    "stem": "Controls 最好理解为？",
    "options": [
      {"key": "A", "text": "单个实验"},
      {"key": "B", "text": "控制要求组合"}
    ],
    "answer": "B",
    "explanation": "Controls 是控制要求组合。"
  }
]
---END---`)

    expect(result.meta.packId).toBe('rac-day-8')
    expect(result.questions[0]).toMatchObject({
      id: 'rac-day-8-q001',
      packId: 'rac-day-8',
      domain: 'General',
      tags: ['general'],
      difficulty: 'medium',
    })
  })

  it('blocks duplicate ids inside one package', () => {
    expect(() =>
      parseLearningPackage(`---RAC_DAY_PACKAGE_V1---
title: Duplicate
packId: duplicate-pack
---CONTENT---
# Duplicate
---QUESTIONS_JSON---
[
  {"id":"dup","stem":"A?","options":[{"key":"A","text":"A"},{"key":"B","text":"B"}],"answer":"A","explanation":"A"},
  {"id":"dup","stem":"B?","options":[{"key":"A","text":"A"},{"key":"B","text":"B"}],"answer":"B","explanation":"B"}
]
---END---`),
    ).toThrow('question.id 重复')
  })

  it('reports invalid questions JSON without partial import', () => {
    expect(() =>
      parseLearningPackage(`---RAC_DAY_PACKAGE_V1---
title: Bad JSON
packId: bad-json
---CONTENT---
# Bad
---QUESTIONS_JSON---
[{bad json]
---END---`),
    ).toThrow('QUESTIONS_JSON 不是合法 JSON')
  })
})
