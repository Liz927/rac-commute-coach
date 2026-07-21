import { describe, expect, it } from 'vitest'
import { makeExportPayload, normalizeImport } from './storage'

describe('normalizeImport', () => {
  it('accepts an exported payload and fills optional arrays', () => {
    const result = normalizeImport({
      version: 1,
      days: [{
        id: 'd1',
        dayNumber: 1,
        title: 'Intro',
        packId: 'rac-device-day-001',
        difficulty: 'easy',
        questionStates: { 'rac-d1-q001': { userAnswer: 'B', showAnswer: true } },
        contentMarkdown: '# Intro',
      }],
    })

    expect(result.days[0]).toMatchObject({
      id: 'd1',
      dayNumber: 1,
      title: 'Intro',
      questions: [],
      sections: [],
      marks: [],
      notes: '',
      freeNotes: '',
      quickDraft: '',
      sectionNotes: [],
      questionNotes: [],
      quickNotes: [],
      completed: false,
      packId: 'rac-device-day-001',
      difficulty: 'easy',
      questionStates: {
        'rac-d1-q001': expect.objectContaining({ userAnswer: 'B', showAnswer: true }),
      },
    })
    expect(result.days[0]).not.toHaveProperty('audioScripts')
    expect(result.days[0]).not.toHaveProperty('audioFiles')
    expect(result.quizQuestions).toEqual([])
    expect(result.quizProgress).toBeNull()
  })

  it('ignores legacy Day audio fields while keeping text study data', () => {
    const result = normalizeImport({
      version: 1,
      days: [
        {
          id: 'd2',
          dayNumber: 2,
          reviewDraft: 'RAC Day 2 回收问题草稿',
          freeNotes: '全局自由备注',
          quickDraft: '还没加入的问题草稿',
      quickNotes: [
            {
              id: 'qn1',
              text: 'quick note one',
              content: 'quick note one',
              dayId: 'd2',
              packId: 'pack-2',
              tag: 'question',
              createdAt: '2026-06-18T00:00:00.000Z',
            },
            { text: 'quick note two', tag: 'bad-tag' },
          ],
          sectionNotes: [{ sectionId: 's1', sectionTitle: 'S1', note: 'section note' }],
          questionNotes: [{ questionId: 'q1', questionLabel: 'Q1', note: 'question note' }],
          audioScripts: {
            casualScript: '今天通勤先复盘 FDA device classification。',
            termsScript: 'Predicate device: 对比器械。',
            examScript: 'PMA 风险最高，De Novo 处理无 predicate 的新型器械。',
          },
          audioFiles: {
            casualAudio: {
              audioFileId: 'casual-id',
              name: 'casual.mp3',
              type: 'audio/mpeg',
              size: 123,
              updatedAt: '2026-06-17T00:00:00.000Z',
              blob: 'not allowed in JSON',
            },
          },
        },
      ],
    })

    expect(result.days[0].reviewDraft).toBe('RAC Day 2 回收问题草稿')
    expect(result.days[0].freeNotes).toBe('全局自由备注')
    expect(result.days[0].quickDraft).toBe('还没加入的问题草稿')
    expect(result.days[0].quickNotes).toEqual([
      expect.objectContaining({
        id: 'qn1',
        text: 'quick note one',
        content: 'quick note one',
        dayId: 'd2',
        packId: 'pack-2',
        tag: 'question',
        createdAt: '2026-06-18T00:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'imported-quick-note-2',
        text: 'quick note two',
        tag: 'general',
      }),
    ])
    expect(result.days[0].sectionNotes[0]).toMatchObject({
      sectionId: 's1',
      sectionTitle: 'S1',
      note: 'section note',
    })
    expect(result.days[0].questionNotes[0]).toMatchObject({
      questionId: 'q1',
      questionLabel: 'Q1',
      note: 'question note',
    })
    expect(result.days[0]).not.toHaveProperty('audioScripts')
    expect(result.days[0]).not.toHaveProperty('audioFiles')
  })

  it('does not export legacy Day audio metadata or large file payloads', () => {
    const result = makeExportPayload(
      [
        {
          id: 'd4',
          dayNumber: 4,
          audioFiles: {
            casualAudio: {
              audioFileId: 'casual-id',
              name: 'casual.mp3',
              type: 'audio/mpeg',
              size: 123,
              updatedAt: '2026-06-17T00:00:00.000Z',
              blob: 'not allowed in JSON',
              file: { tooLarge: true },
            },
          },
        },
      ],
      {
        quizQuestions: [{ id: 'q1', prompt: 'Question?' }],
        quizProgress: { attempts: [], starredQuestionIds: ['q1'] },
      },
    )

    expect(result.days[0]).not.toHaveProperty('audioFiles')
    expect(result.days[0]).not.toHaveProperty('audioScripts')
    expect(result.quizQuestions).toEqual([{ id: 'q1', prompt: 'Question?' }])
    expect(result.quizProgress).toEqual({ attempts: [], starredQuestionIds: ['q1'] })
    expect(JSON.stringify(result)).not.toContain('not allowed in JSON')
    expect(JSON.stringify(result)).not.toContain('casual.mp3')
  })

  it('imports quiz question bank and quiz progress from backups', () => {
    const result = normalizeImport({
      version: 1,
      days: [],
      quizQuestions: [{ id: 'q1', prompt: 'Question?' }],
      quizProgress: { attempts: [], starredQuestionIds: ['q1'] },
    })

    expect(result.quizQuestions).toEqual([{ id: 'q1', prompt: 'Question?' }])
    expect(result.quizProgress).toEqual({ attempts: [], starredQuestionIds: ['q1'] })
  })

  it('exports and imports Day reading bookmarks', () => {
    const payload = makeExportPayload([
      {
        id: 'day-9',
        dayNumber: 9,
        title: 'Bookmark test',
        packId: 'rac-device-day-009',
        contentMarkdown: '# Bookmark test',
        bookmarks: [
          {
            id: 'bookmark-s6',
            dayId: 'day-9',
            packId: 'rac-device-day-009',
            headingId: 'day-9-s6',
            headingText: 'S6 | Evidence',
            sectionId: 'day-9-s6',
            sectionTitle: 'Evidence',
            sectionLabel: 'S6',
            scrollTop: 1200,
            createdAt: '2026-07-21T00:00:00.000Z',
            updatedAt: '2026-07-21T00:00:00.000Z',
          },
        ],
      },
    ])

    expect(payload.days[0].bookmarks).toEqual([
      expect.objectContaining({
        id: 'bookmark-s6',
        sectionId: 'day-9-s6',
        sectionTitle: 'Evidence',
        scrollTop: 1200,
      }),
    ])
    expect(normalizeImport(payload).days[0].bookmarks).toEqual(payload.days[0].bookmarks)
  })

  it('migrates legacy markdown question blocks into structured questions on import', () => {
    const result = normalizeImport({
      version: 1,
      days: [
        {
          id: 'legacy-day',
          dayNumber: 6,
          title: 'Legacy quiz',
          contentMarkdown: `# RAC Day 6｜Legacy quiz

## S1｜正文

这里只是阅读正文。

## Q1｜默想题

哪一个说法正确？

A. 错误选项
B. 正确选项
C. 其他选项
D. 其他选项

Answer: B

Explanation: 这是解释。`,
        },
      ],
    })

    expect(result.days[0].contentMarkdown).toContain('## S1｜正文')
    expect(result.days[0].contentMarkdown).not.toMatch(/## Q1|Answer:|Explanation:/)
    expect(result.days[0].questions).toEqual([
      expect.objectContaining({
        id: 'legacy-day-q1',
        number: 1,
        stem: '哪一个说法正确？',
        answer: 'B',
        explanation: '这是解释。',
        options: [
          { key: 'A', text: '错误选项' },
          { key: 'B', text: '正确选项' },
          { key: 'C', text: '其他选项' },
          { key: 'D', text: '其他选项' },
        ],
      }),
    ])
  })

  it('rejects payloads without a days array', () => {
    expect(() => normalizeImport({ version: 1 })).toThrow('备份文件缺少 days 数组')
  })
})
