import { CheckCircle2, ChevronRight, Edit3, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getDayStats, getOverallStats } from '../lib/day'

export default function DayList({ days, onOpen, onEdit, onDelete, onAdd }) {
  const [query, setQuery] = useState('')
  const stats = getOverallStats(days)
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const matches = keyword
      ? days.filter((day) =>
        `${day.title}\n${day.contentMarkdown}`.toLowerCase().includes(keyword),
      )
      : days
    return [...matches].sort((a, b) => Number(b.dayNumber) - Number(a.dayNumber))
  }, [days, query])

  return (
    <main className="screen days-screen">
      <header className="hero">
        <div>
          <p className="eyebrow">RAC COMMUTE COACH</p>
          <h1>通勤学习簿</h1>
          <p>把昨晚的材料，变成今天路上的进度。</p>
        </div>
        <div className="hero-stamp" aria-hidden="true">RAC</div>
      </header>

      <section className="summary-grid" aria-label="总进度">
        <div>
          <strong>{stats.completedDays}/{stats.totalDays}</strong>
          <span>已完成 Day</span>
        </div>
        <div>
          <strong>{stats.answered}</strong>
          <span>已做题</span>
        </div>
        <div>
          <strong>{stats.accuracy === null ? '—' : `${stats.accuracy}%`}</strong>
          <span>正确率</span>
        </div>
      </section>

      <label className="search-box">
        <Search size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题或正文关键词"
        />
      </label>

      <div className="section-heading">
        <h2>学习日</h2>
        <span>{filtered.length} 篇</span>
      </div>

      {filtered.length ? (
        <div className="day-list">
          {filtered.map((day) => {
            const dayStats = getDayStats(day)
            return (
              <article className="day-card" key={day.id}>
                <button className="day-card-main" type="button" onClick={() => onOpen(day.id)}>
                  <span className="day-number">DAY {day.dayNumber}</span>
                  <span className="day-title">{day.title || '未命名主题'}</span>
                  <span className="day-meta">
                    {day.completed && <CheckCircle2 size={16} />}
                    {day.completed ? '已完成' : '学习中'} · 题目 {dayStats.answered}/
                    {dayStats.totalQuestions}
                  </span>
                  <span className="day-marks">
                    想问 {dayStats.marks.question} / 不确定 {dayStats.marks.unsure} / 重要{' '}
                    {dayStats.marks.important}
                  </span>
                  <ChevronRight className="day-chevron" size={22} />
                </button>
                <div className="day-card-actions">
                  <button type="button" onClick={() => onEdit(day.id)}>
                    <Edit3 size={17} /> 编辑
                  </button>
                  <button
                    className="danger-text"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`删除 Day ${day.dayNumber}？此操作无法撤销。`)) {
                        onDelete(day.id)
                      }
                    }}
                  >
                    <Trash2 size={17} /> 删除
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <section className="empty-state">
          <span>01</span>
          <h2>{days.length ? '没有匹配的 Day' : '从第一个 Day 开始'}</h2>
          <p>{days.length ? '换个关键词试试。' : '粘贴今晚准备好的 Markdown，明天路上继续。'}</p>
          {!days.length && <button onClick={onAdd}>新增 Day</button>}
        </section>
      )}
    </main>
  )
}
