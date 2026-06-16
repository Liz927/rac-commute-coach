import { describe, expect, it } from 'vitest'
import { buildQuestionPackage } from './package'

describe('buildQuestionPackage', () => {
  it('groups question marks, uncertainty, wrong answers, and notes', () => {
    const text = buildQuestionPackage({
      dayNumber: 4,
      title: '510(k) vs De Novo',
      notes: '比较 substantial equivalence 和 classification。',
      marks: [
        {
          targetLabel: 'D4-S2',
          markType: 'question',
          excerpt: '核心概念',
          note: 'predicate 到底如何选？',
        },
        {
          targetLabel: 'D4-Q1',
          markType: 'unsure',
          excerpt: 'De Novo 的适用情形',
          note: '',
        },
      ],
      questions: [
        {
          id: 'q1',
          label: 'Q1',
          question: 'De Novo 什么时候用？',
          correctAnswer: 'B',
          explanation: '用于无合法 predicate 的低中风险新器械。',
          isUnsure: true,
        },
        {
          label: 'Q2',
          question: '哪条路径风险最高？',
          userAnswer: 'A',
          correctAnswer: 'C',
          explanation: 'PMA 通常用于 III 类器械。',
        },
      ],
    })

    expect(text).toContain('RAC Day 4 回收问题：')
    expect(text).toContain('D4-S2：核心概念')
    expect(text).toContain('D4-Q1：De Novo 的适用情形')
    expect(text).toContain('D4-Q1：De Novo 什么时候用？')
    expect(text).toContain('我的答案：A')
    expect(text).toContain('四、我的自由备注')
    expect(text).toContain('比较 substantial equivalence 和 classification。')
  })
})
