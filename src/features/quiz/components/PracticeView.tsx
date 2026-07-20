import { RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Question, QuizAttempt } from '../types'
import QuestionPanel from './QuestionPanel'

type PracticeViewProps = {
  title: string
  description: string
  questions: Question[]
  emptyTitle: string
  emptyMessage: string
  isStarred: (questionId: string) => boolean
  latestAttemptsByQuestionId: Map<string, QuizAttempt>
  onToggleStar: (questionId: string) => void
  onAnswer: (question: Question, selectedOptionIds: string[]) => {
    isCorrect: boolean
    selectedOptionIds: string[]
    correctOptionIds: string[]
  }
}

export default function PracticeView({
  title,
  description,
  questions,
  emptyTitle,
  emptyMessage,
  isStarred,
  latestAttemptsByQuestionId,
  onToggleStar,
  onAnswer,
}: PracticeViewProps) {
  const [index, setIndex] = useState(0)
  const safeIndex = questions.length ? Math.min(index, questions.length - 1) : 0
  const activeQuestion = questions[safeIndex]

  const positionLabel = useMemo(() => {
    if (!questions.length) return 'No questions'
    return `Question ${safeIndex + 1} of ${questions.length}`
  }, [questions.length, safeIndex])

  function nextQuestion() {
    if (!questions.length) return
    setIndex((current) => (current + 1) % questions.length)
  }

  function restart() {
    setIndex(0)
  }

  if (!questions.length) {
    return (
      <section className="quiz-empty-panel">
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="quiz-practice-view">
      <div className="quiz-section-head">
        <div>
          <p className="quiz-eyebrow">{title}</p>
          <h1>{description}</h1>
        </div>
        <button type="button" onClick={restart} title="Restart this set" aria-label="Restart this set">
          <RotateCcw size={18} />
        </button>
      </div>

      <QuestionPanel
        key={activeQuestion.id}
        question={activeQuestion}
        positionLabel={positionLabel}
        isStarred={isStarred(activeQuestion.id)}
        latestAttempt={latestAttemptsByQuestionId.get(activeQuestion.id)}
        onToggleStar={onToggleStar}
        onSubmit={onAnswer}
        onNext={nextQuestion}
        nextLabel={safeIndex + 1 === questions.length ? 'Loop to first' : 'Next question'}
      />
    </section>
  )
}
