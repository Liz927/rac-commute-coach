import { BarChart3 } from 'lucide-react'
import type { DomainStat } from '../types'

type StatsViewProps = {
  totalQuestions: number
  stats: {
    totalAnswered: number
    correctRate: number
    wrongCount: number
    byDomain: DomainStat[]
  }
  onReset: () => void
}

export default function StatsView({ totalQuestions, stats, onReset }: StatsViewProps) {
  return (
    <section className="quiz-stats-view">
      <div className="quiz-section-head">
        <div>
          <p className="quiz-eyebrow">Stats</p>
          <h1>Your current signal</h1>
        </div>
        <BarChart3 size={28} />
      </div>

      <div className="quiz-stat-grid">
        <div>
          <strong>{stats.totalAnswered}</strong>
          <span>Answered</span>
        </div>
        <div>
          <strong>{stats.correctRate}%</strong>
          <span>Correct rate</span>
        </div>
        <div>
          <strong>{stats.wrongCount}</strong>
          <span>Wrong book</span>
        </div>
        <div>
          <strong>{totalQuestions}</strong>
          <span>Question bank</span>
        </div>
      </div>

      <div className="quiz-domain-panel">
        <h2>Accuracy by domain</h2>
        {stats.byDomain.length ? (
          <div className="quiz-domain-list">
            {stats.byDomain.map((item) => (
              <div className="quiz-domain-row" key={item.domain}>
                <div>
                  <strong>{item.domain}</strong>
                  <span>
                    {item.correct}/{item.answered} latest correct
                  </span>
                </div>
                <div className="quiz-domain-meter" aria-label={`${item.domain} accuracy ${item.accuracy}%`}>
                  <span style={{ width: `${item.accuracy}%` }} />
                </div>
                <b>{item.accuracy}%</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="quiz-muted">Answer a few questions to build a domain map.</p>
        )}
      </div>

      <button className="quiz-reset-button" type="button" onClick={onReset}>
        Reset quiz progress
      </button>
    </section>
  )
}
