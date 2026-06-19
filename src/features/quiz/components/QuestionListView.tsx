import { Star } from 'lucide-react'
import type { Question } from '../types'

type QuestionListViewProps = {
  title: string
  description: string
  questions: Question[]
  emptyTitle: string
  emptyMessage: string
  isStarred: (questionId: string) => boolean
  onToggleStar: (questionId: string) => void
}

export default function QuestionListView({
  title,
  description,
  questions,
  emptyTitle,
  emptyMessage,
  isStarred,
  onToggleStar,
}: QuestionListViewProps) {
  if (!questions.length) {
    return (
      <section className="quiz-empty-panel">
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="quiz-list-view">
      <div className="quiz-section-head">
        <div>
          <p className="quiz-eyebrow">{title}</p>
          <h1>{description}</h1>
        </div>
      </div>
      <div className="quiz-question-list">
        {questions.map((question) => (
          <article className="quiz-list-card" key={question.id}>
            <div>
              <span>{question.domain}</span>
              <h2>{question.prompt}</h2>
              <p>
                {question.difficulty} · {question.type === 'multiple' ? 'multiple' : 'single'} ·{' '}
                {question.tags.join(', ')}
              </p>
            </div>
            <button
              className={isStarred(question.id) ? 'quiz-star is-active' : 'quiz-star'}
              type="button"
              onClick={() => onToggleStar(question.id)}
              aria-label={isStarred(question.id) ? 'Unstar question' : 'Star question'}
              title={isStarred(question.id) ? 'Unstar question' : 'Star question'}
            >
              <Star size={20} fill={isStarred(question.id) ? 'currentColor' : 'none'} />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
