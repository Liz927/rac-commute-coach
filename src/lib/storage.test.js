import { describe, expect, it } from 'vitest'
import { normalizeImport } from './storage'

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
      audioScripts: {
        casualScript: '',
        termsScript: '',
        examScript: '',
      },
      questions: [],
      sections: [],
      marks: [],
      notes: '',
      completed: false,
    })
  })

  it('keeps imported Day audio scripts', () => {
    const result = normalizeImport({
      version: 1,
      days: [
        {
          id: 'd2',
          dayNumber: 2,
          reviewDraft: 'RAC Day 2 回收问题草稿',
          audioScripts: {
            casualScript: '今天通勤先复盘 FDA device classification。',
            termsScript: 'Predicate device: 对比器械。',
            examScript: 'PMA 风险最高，De Novo 处理无 predicate 的新型器械。',
          },
        },
      ],
    })

    expect(result.days[0].reviewDraft).toBe('RAC Day 2 回收问题草稿')
    expect(result.days[0].audioScripts).toEqual({
      casualScript: '今天通勤先复盘 FDA device classification。',
      termsScript: 'Predicate device: 对比器械。',
      examScript: 'PMA 风险最高，De Novo 处理无 predicate 的新型器械。',
    })
  })

  it('rejects payloads without a days array', () => {
    expect(() => normalizeImport({ version: 1 })).toThrow('备份文件缺少 days 数组')
  })
})
