import { describe, expect, it } from 'vitest'
import { parseMarkdown } from './markdown'

const markdown = `# RAC Day 4｜510(k) vs De Novo vs PMA

## S1｜今日一句话

先判断风险，再选择路径。

## T｜术语卡

**Predicate device**：谓词器械。

## Q1｜默想题

哪条路径通常用于无合法 predicate 的低中风险新器械？
A. 510(k)
B. De Novo
C. PMA
D. HDE
Answer: B
Explanation: De Novo 用于此类新器械分类请求。`

describe('parseMarkdown', () => {
  it('splits level-two headings into stable sections', () => {
    const result = parseMarkdown(markdown, 'day-4')

    expect(result.title).toBe('RAC Day 4｜510(k) vs De Novo vs PMA')
    expect(result.sections).toHaveLength(3)
    expect(result.sections[0]).toMatchObject({
      id: 'day-4-s1',
      label: 'S1',
      title: '今日一句话',
      collapsible: false,
    })
    expect(result.sections[1].collapsible).toBe(true)
  })

  it('extracts A-D questions, answer, and explanation', () => {
    const result = parseMarkdown(markdown, 'day-4')

    expect(result.questions).toEqual([
      expect.objectContaining({
        id: 'day-4-q1',
        label: 'Q1',
        question: '哪条路径通常用于无合法 predicate 的低中风险新器械？',
        options: {
          A: '510(k)',
          B: 'De Novo',
          C: 'PMA',
          D: 'HDE',
        },
        correctAnswer: 'B',
        explanation: 'De Novo 用于此类新器械分类请求。',
      }),
    ])
  })
})
