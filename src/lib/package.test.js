import { describe, expect, it } from 'vitest'
import { appendQuickNoteToDay } from './day'
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
    expect(text).toContain('四、我边阅读边记录的自由备注')
    expect(text).toContain('比较 substantial equivalence 和 classification。')
  })

  it('includes inline reading notes in the proper package sections', () => {
    const text = buildQuestionPackage({
      dayNumber: 5,
      title: 'Inline notes',
      freeNotes: '全局备注：controls 还要再问。',
      quickNotes: [
        {
          text: 'quick 想问：predicate 怎么选？',
          tag: 'question',
        },
        {
          text: 'quick 重要：Class III 和 PMA 对齐复盘。',
          tag: 'important',
        },
      ],
      marks: [
        {
          targetType: 'section',
          targetId: 's1',
          targetLabel: 'D5-S1',
          markType: 'question',
          excerpt: 'Section one',
        },
        {
          targetType: 'question',
          targetId: 'q2',
          targetLabel: 'D5-Q2',
          markType: 'important',
          excerpt: 'Important question',
        },
      ],
      sectionNotes: [
        {
          sectionId: 's1',
          sectionTitle: 'Section one',
          note: 'section 标记备注应该跟随想问。',
        },
        {
          sectionId: 's2',
          sectionTitle: 'Section two',
          note: '没有标记的 section note 进入自由备注。',
        },
      ],
      questionNotes: [
        {
          questionId: 'q1',
          questionLabel: 'Q1',
          note: '错题备注：为什么不是 PMA？',
        },
        {
          questionId: 'q2',
          questionLabel: 'Q2',
          note: '重要题备注。',
        },
        {
          questionId: 'q3',
          questionLabel: 'Q3',
          note: '没有标记的 question note 进入自由备注。',
        },
      ],
      questions: [
        {
          id: 'q1',
          label: 'Q1',
          question: '错题题干',
          userAnswer: 'A',
          correctAnswer: 'C',
          explanation: '解释内容',
        },
        {
          id: 'q2',
          label: 'Q2',
          question: 'Important question',
          correctAnswer: 'B',
          explanation: '解释',
        },
        {
          id: 'q3',
          label: 'Q3',
          question: 'Unmarked question',
          correctAnswer: 'D',
          explanation: '解释',
        },
      ],
    })

    expect(text).toContain('一、我标记为【想问】的内容')
    expect(text).toContain('D5-S1：Section one')
    expect(text).toContain('我的备注：section 标记备注应该跟随想问。')
    expect(text).toContain('三、我答错的题')
    expect(text).toContain('我的备注：错题备注：为什么不是 PMA？')
    expect(text).toContain('四、我边阅读边记录的自由备注')
    expect(text).toContain('[quickNote] 【想问】 quick 想问：predicate 怎么选？')
    expect(text).toContain('[quickNote] 【重要】 quick 重要：Class III 和 PMA 对齐复盘。')
    expect(text).toContain('全局备注：controls 还要再问。')
    expect(text).toContain('D5-S2：Section two')
    expect(text).toContain('D5-Q3：没有标记的 question note 进入自由备注。')
    expect(text).toContain('五、我标记为【重要】的内容')
    expect(text).toContain('D5-Q2：Important question')
    expect(text).toContain('我的备注：重要题备注。')
  })

  it('includes a quick note added immediately before package generation', () => {
    const day = appendQuickNoteToDay(
      {
        id: 'day-7',
        dayNumber: 7,
        title: 'Day 7 topic',
        packId: 'rac-device-day-007',
        quickNotes: [],
        marks: [],
        questions: [],
      },
      'special controls / cutoff / LoQ',
      'general',
      '2026-06-25T00:00:00.000Z',
      {
        sourceSectionTitle: 'S6｜AP 和 bioanalysis workflow 的关系',
      },
    )

    expect(buildQuestionPackage(day)).toContain('special controls / cutoff / LoQ')
    expect(buildQuestionPackage(day)).toContain('[S6｜AP 和 bioanalysis workflow 的关系]')
  })

  it('filters quick notes to the current Day and pack when generating a package', () => {
    const text = buildQuestionPackage({
      id: 'day-7',
      dayNumber: 7,
      title: 'Day 7 topic',
      packId: 'rac-device-day-007',
      quickNotes: [
        {
          id: 'day-6-note',
          dayId: 'day-6',
          packId: 'rac-device-day-006',
          text: 'Day 6 only',
          content: 'Day 6 only',
        },
        {
          id: 'day-7-note',
          dayId: 'day-7',
          packId: 'rac-device-day-007',
          text: 'Day 7 only',
          content: 'Day 7 only',
        },
      ],
      marks: [],
      questions: [],
    })

    expect(text).toContain('Day 7 only')
    expect(text).not.toContain('Day 6 only')
  })
})
