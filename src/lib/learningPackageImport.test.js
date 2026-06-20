import { describe, expect, it } from 'vitest'
import { parseLearningPackage } from './learningPackage'
import { applyLearningPackageToDays } from './learningPackageImport'

function makeParsedPackage(packId = 'rac-device-day-010') {
  return parseLearningPackage(`---RAC_DAY_PACKAGE_V1---
day: 10
title: RAC Day 10｜Import Test
packId: ${packId}
domain: Premarket
tags: 510k
difficulty: easy
---CONTENT---
# RAC Day 10｜Import Test

## S0｜目标
阅读正文。

Answer: B
Explanation: 兜底隐藏。
---QUESTIONS_JSON---
[
  {
    "id": "${packId}-q001",
    "stem": "题目？",
    "options": [{"key":"A","text":"A"},{"key":"B","text":"B"}],
    "answer": "B",
    "explanation": "解释。"
  }
]
---END---`)
}

describe('applyLearningPackageToDays', () => {
  it('creates a Day with package metadata and sanitized reading content', () => {
    const parsed = makeParsedPackage()
    const result = applyLearningPackageToDays([], parsed, {
      mode: 'create',
      now: '2026-06-19T00:00:00.000Z',
    })

    expect(result.dayAction).toBe('created')
    expect(result.days).toHaveLength(1)
    expect(result.day).toMatchObject({
      dayNumber: 10,
      title: 'RAC Day 10｜Import Test',
      packId: 'rac-device-day-010',
      domain: 'Premarket',
      tags: ['510k'],
      difficulty: 'easy',
      questions: [],
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z',
    })
    expect(result.day.contentMarkdown).toContain('## S0｜目标')
    expect(result.day.contentMarkdown).not.toMatch(/Answer:|Explanation:/)
  })

  it('updates an existing matching Day while preserving notes', () => {
    const parsed = makeParsedPackage()
    const result = applyLearningPackageToDays(
      [
        {
          id: 'existing-day',
          dayNumber: 10,
          title: 'Old',
          packId: 'rac-device-day-010',
          notes: 'keep me',
          createdAt: '2026-06-18T00:00:00.000Z',
        },
      ],
      parsed,
      { mode: 'update', now: '2026-06-19T00:00:00.000Z' },
    )

    expect(result.dayAction).toBe('updated')
    expect(result.days).toHaveLength(1)
    expect(result.day).toMatchObject({
      id: 'existing-day',
      title: 'RAC Day 10｜Import Test',
      notes: 'keep me',
      createdAt: '2026-06-18T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z',
    })
  })
})
