import { describe, expect, it } from 'vitest'
import { makeExportPayload, normalizeImport } from './storage'

describe('normalizeImport', () => {
  it('accepts an exported payload and fills optional arrays', () => {
    const result = normalizeImport({
      version: 1,
      days: [{ id: 'd1', dayNumber: 1, title: 'Intro', contentMarkdown: '# Intro' }],
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
      sectionNotes: [],
      questionNotes: [],
      completed: false,
    })
    expect(result.days[0]).not.toHaveProperty('audioScripts')
    expect(result.days[0]).not.toHaveProperty('audioFiles')
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
    const result = makeExportPayload([
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
    ])

    expect(result.days[0]).not.toHaveProperty('audioFiles')
    expect(result.days[0]).not.toHaveProperty('audioScripts')
    expect(JSON.stringify(result)).not.toContain('not allowed in JSON')
    expect(JSON.stringify(result)).not.toContain('casual.mp3')
  })

  it('rejects payloads without a days array', () => {
    expect(() => normalizeImport({ version: 1 })).toThrow('备份文件缺少 days 数组')
  })
})
