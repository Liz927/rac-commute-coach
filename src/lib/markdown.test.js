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

  it('extracts decimal day number and topic title from the first heading', () => {
    const result = parseMarkdown(
      '# RAC Day 1.5｜FDA Pathway 词汇补丁：Class / Controls / 510(k) / De Novo / PMA',
      'day-1-5',
    )

    expect(result.dayNumber).toBe(1.5)
    expect(result.topicTitle).toBe('FDA Pathway 词汇补丁：Class / Controls / 510(k) / De Novo / PMA')
  })

  it('parses Q1-Q9 blocks into separate questions', () => {
    const manyQuestions = Array.from({ length: 9 }, (_, index) => {
      const number = index + 1
      return `## Q${number}｜默想题

题目 ${number}
A. Alpha
B. Beta
C. Gamma
D. Delta
Answer: C
Explanation: 解释 ${number}`
    }).join('\n\n')

    const result = parseMarkdown(`# RAC Day 9｜Quiz\n\n${manyQuestions}`, 'day-9')

    expect(result.questions).toHaveLength(9)
    expect(result.questions[8]).toMatchObject({
      id: 'day-9-q9',
      label: 'Q9',
      correctAnswer: 'C',
      explanation: '解释 9',
    })
  })
})
