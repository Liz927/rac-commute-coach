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
    expect(result.sections).toHaveLength(2)
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
        number: 1,
        stem: '哪条路径通常用于无合法 predicate 的低中风险新器械？',
        options: [
          { key: 'A', text: '510(k)' },
          { key: 'B', text: 'De Novo' },
          { key: 'C', text: 'PMA' },
          { key: 'D', text: 'HDE' },
        ],
        answer: 'B',
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
      number: 9,
      answer: 'C',
      explanation: '解释 9',
    })
  })

  it('removes parsed question blocks from reading sections so answers are not exposed', () => {
    const result = parseMarkdown(
      `# RAC Day 1.5｜FDA Pathway 词汇补丁

## S1｜Class 和 pathway

Class 不会机械决定 pathway，但会强烈影响 pathway。

## Q1｜默想题

Class 和 pathway 的关系，最准确的是：

A. Class 会机械决定唯一 pathway
B. Class 和 pathway 完全无关
C. Class 反映风险和控制强度，会强烈影响 pathway，但还要看 predicate、controls、exemption 等因素
D. Pathway 只由市场部决定

Answer: C

Explanation: Class 是风险和控制强度，pathway 是上市程序。两者强相关，但不是机械一一对应。

## Q2｜默想题

Controls 在 FDA device 分类语境里，最好理解为：

A. 只等于临床试验
B. 只等于法规条文
C. 监管为了合理保证安全有效而设置的一整套控制要求，可能包括 QMS、labeling、测试、证据和上市后动作
D. 只等于等效实验

Answer: C

Explanation: Controls 是监管控制包，不是单一实验或单一法规。实验和文件通常是证明 controls 被满足的 evidence。`,
      'day-1-5',
    )

    expect(result.sections).toHaveLength(1)
    expect(result.sections[0].label).toBe('S1')
    expect(result.sections[0].content).not.toMatch(/Answer:|Explanation:|A\./)
    expect(result.contentWithoutQuestions).not.toMatch(/Answer:|Explanation:|## Q[12]/)
    expect(result.questions).toHaveLength(2)
    expect(result.questions[0]).toMatchObject({
      id: 'day-1-5-q1',
      number: 1,
      title: '默想题',
      answer: 'C',
      options: [
        { key: 'A', text: 'Class 会机械决定唯一 pathway' },
        { key: 'B', text: 'Class 和 pathway 完全无关' },
        { key: 'C', text: 'Class 反映风险和控制强度，会强烈影响 pathway，但还要看 predicate、controls、exemption 等因素' },
        { key: 'D', text: 'Pathway 只由市场部决定' },
      ],
    })
  })

  it('parses half-pipe, bare, and level-three question headings', () => {
    const result = parseMarkdown(
      `# RAC Day 2｜Quiz

## S1｜正文

正文。

### Q1 | 默想题

题目一

A. A1
B. B1
C. C1
D. D1

Answer: A

Explanation: 解释一

## Q2

题目二

A. A2
B. B2
C. C2
D. D2

Answer: D

Explanation: 解释二`,
      'day-2',
    )

    expect(result.sections).toHaveLength(1)
    expect(result.questions).toHaveLength(2)
    expect(result.questions[0]).toMatchObject({ number: 1, title: '默想题' })
    expect(result.questions[1]).toMatchObject({ number: 2, title: '默想题', answer: 'D' })
    expect(result.sections[0].content).not.toContain('Q1')
  })

  it('parses real Chinese Q blocks and removes answer text from reading markdown', () => {
    const result = parseMarkdown(
      `# RAC Day 1.5｜FDA Pathway 词汇补丁

## S1｜Class 和 pathway

Class 不会机械决定 pathway，但会强烈影响 pathway。

## Q1｜默想题

Class 和 pathway 的关系，最准确的是：

A. Class 会机械决定唯一 pathway${'  '}
B. Class 和 pathway 完全无关${'  '}
C. Class 反映风险和控制强度，会强烈影响 pathway，但还要看 predicate、controls、exemption 等因素${'  '}
D. Pathway 只由市场部决定

Answer: C

Explanation: Class 是风险和控制强度，pathway 是上市程序。两者强相关，但不是机械一一对应。

### Q2 | 默想题

Controls 在 FDA device 分类语境里，最好理解为：

A、只等于临床试验
B、只等于法规条文
C、监管为了合理保证安全有效而设置的一整套控制要求
D、只等于等效实验

正确答案：C

解析：Controls 是监管控制包，不是单一实验或单一法规。

## R｜晚上回收问题

整理问题包。`,
      'day-real',
    )

    expect(result.questions).toHaveLength(2)
    expect(result.questions[0]).toMatchObject({
      id: 'day-real-q1',
      number: 1,
      title: '默想题',
      stem: 'Class 和 pathway 的关系，最准确的是：',
      answer: 'C',
      explanation: 'Class 是风险和控制强度，pathway 是上市程序。两者强相关，但不是机械一一对应。',
      options: [
        { key: 'A', text: 'Class 会机械决定唯一 pathway' },
        { key: 'B', text: 'Class 和 pathway 完全无关' },
        { key: 'C', text: 'Class 反映风险和控制强度，会强烈影响 pathway，但还要看 predicate、controls、exemption 等因素' },
        { key: 'D', text: 'Pathway 只由市场部决定' },
      ],
    })
    expect(result.questions[1]).toMatchObject({
      id: 'day-real-q2',
      number: 2,
      answer: 'C',
      explanation: 'Controls 是监管控制包，不是单一实验或单一法规。',
    })
    expect(result.contentWithoutQuestions).toContain('## S1｜Class 和 pathway')
    expect(result.contentWithoutQuestions).toContain('## R｜晚上回收问题')
    expect(result.contentWithoutQuestions).not.toMatch(/## Q\d|Answer:|Explanation:|正确答案：|解析：|A[.、]/)
  })
})
