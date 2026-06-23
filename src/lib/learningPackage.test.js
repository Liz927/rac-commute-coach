import { describe, expect, it } from 'vitest'
import { normalizePackageText, parseLearningPackage } from './learningPackage'

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

  it('accepts a package copied from a fenced mobile chat response', () => {
    const copiedPackage = `

说明文字不会进入学习包。
\`\`\`text
  —RAC_DAY_PACKAGE_V1—
day: 9
title: RAC Day 9｜Mobile paste
  –CONTENT–
# RAC Day 9｜Mobile paste
  －QUESTIONS_JSON－
[
  {
    "stem": "Mobile parser?",
    "options": [{"key":"A","text":"Works"},{"key":"B","text":"Fails"}],
    "answer": "A",
    "explanation": "It accepts normalized markers."
  }
]
  —END—
\`\`\`
`

    const result = parseLearningPackage(copiedPackage)

    expect(result.meta).toMatchObject({
      day: 9,
      title: 'RAC Day 9｜Mobile paste',
      packId: 'rac-day-9',
    })
    expect(result.contentMarkdown).toBe('# RAC Day 9｜Mobile paste')
    expect(result.questions).toHaveLength(1)
  })

  it('normalizes only package marker lines while preserving markdown content', () => {
    const normalized = normalizePackageText(`\`\`\`text\r\n —CONTENT— \r\n# Keep — this dash\r\n —END— \r\n\`\`\``)

    expect(normalized).toBe('---CONTENT---\n# Keep - this dash\n---END---')
  })

  it('explains which markers are missing when the package copy is incomplete', () => {
    expect(() =>
      parseLearningPackage(`\n---CONTENT---\ntitle: Incomplete\n---QUESTIONS_JSON---\n[]\n---END---`),
    ).toThrow('未找到 RAC_DAY_PACKAGE_V1。已检测到 CONTENT/QUESTIONS_JSON/END。')
  })

  it('parses a V2 package with underscore-only markers', () => {
    const result = parseLearningPackage(`
RAC_DAY_PACKAGE_V2_START
META_START
day: 11
title: RAC Day 11｜V2 import
packId: rac-device-day-011
domain: Premarket
tags: 510k,predicate
difficulty: easy
META_END
CONTENT_START
# RAC Day 11｜V2 import

## S1｜正文
V2 keeps mobile copy simple.
CONTENT_END
QUESTIONS_JSON_START
[
  {
    "id": "rac-d11-q001",
    "type": "single_choice",
    "stem": "Does V2 work?",
    "options": [{"key":"A","text":"Yes"},{"key":"B","text":"No"}],
    "answer": "A",
    "explanation": "V2 avoids dash markers."
  }
]
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END
`)

    expect(result.version).toBe('RAC_DAY_PACKAGE_V2')
    expect(result.meta).toMatchObject({
      day: 11,
      packId: 'rac-device-day-011',
      title: 'RAC Day 11｜V2 import',
    })
    expect(result.contentMarkdown).toContain('## S1｜正文')
    expect(result.questions[0].id).toBe('rac-d11-q001')
  })

  it('normalizes smart quotes only inside the V2 questions JSON', () => {
    const packageText = `
RAC_DAY_PACKAGE_V2_START
META_START
title: iOS quote check
META_END
CONTENT_START
# Content “must stay untouched”
CONTENT_END
QUESTIONS_JSON_START
[
  {“id”: “rac-d004-q001”, “type”: “single_choice”, “stem”: “测试题目”, “options”: [{“key”: “A”, “text”: “选项 A”},{“key”: “B”, “text”: “选项 B”},{“key”: “C”, “text”: “选项 C”},{“key”: “D”, “text”: “选项 D”}], “answer”: “B”, “explanation”: “测试解释”}
]
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END
`

    const result = parseLearningPackage(packageText)

    expect(result.questionsJsonNormalized).toBe(true)
    expect(result.questions[0]).toMatchObject({
      id: 'rac-d004-q001',
      prompt: '测试题目',
      correctOptionIds: ['B'],
    })
    expect(result.contentMarkdown).toContain('“must stay untouched”')
  })

  it('reports the remaining JSON error with a nearby snippet after quote normalization', () => {
    expect(() => parseLearningPackage(`
RAC_DAY_PACKAGE_V2_START
META_START
title: Broken after normalize
META_END
CONTENT_START
# Content
CONTENT_END
QUESTIONS_JSON_START
[{“id”: “q1”,}]
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END
`)).toThrow('附近片段')
  })

  it('prefers a V2 package when V1 markers are also present', () => {
    const result = parseLearningPackage(`
---RAC_DAY_PACKAGE_V1---
title: Ignore V1
---CONTENT---
# Old content
---QUESTIONS_JSON---
[]
---END---

RAC_DAY_PACKAGE_V2_START
META_START
title: Prefer V2
META_END
CONTENT_START
# New content
CONTENT_END
QUESTIONS_JSON_START
[]
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END
`)

    expect(result.version).toBe('RAC_DAY_PACKAGE_V2')
    expect(result.meta.title).toBe('Prefer V2')
    expect(result.contentMarkdown).toBe('# New content')
  })

  it('reports a missing V2 marker with the detected V2 markers', () => {
    expect(() =>
      parseLearningPackage(`
RAC_DAY_PACKAGE_V2_START
META_START
title: Incomplete V2
CONTENT_START
# Incomplete
CONTENT_END
QUESTIONS_JSON_START
[]
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END
`),
    ).toThrow('未找到 META_END。已检测到 RAC_DAY_PACKAGE_V2_START/META_START/CONTENT_START')
  })
})
