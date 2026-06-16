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
      questions: [],
      sections: [],
      marks: [],
      notes: '',
      completed: false,
    })
  })

  it('rejects payloads without a days array', () => {
    expect(() => normalizeImport({ version: 1 })).toThrow('备份文件缺少 days 数组')
  })
})
