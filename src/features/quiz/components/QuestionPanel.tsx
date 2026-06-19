import { CheckCircle2, Circle, Square, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Question } from '../types'
import { formatCorrectAnswer } from '../lib/quiz'

type AnswerResult = {
  isCorrect: boolean
  selectedOptionIds: string[]
  correctOptionIds: string[]
}

type QuestionPanelProps = {
  question: Question
  positionLabel: string
  isStarred: boolean
  onToggleStar: (questionId: string) => void
  onSubmit: (question: Question, selectedOptionIds: string[]) => AnswerResult
  onNext?: () => void
  nextLabel?: string
}

export default function QuestionPanel({
  question,
  positionLabel,
  isStarred,
  onToggleStar,
  onSubmit,
  onNext,
  nextLabel = 'Next question',
}: QuestionPanelProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [result, setResult] = useState<AnswerResult | null>(null)

  useEffect(() => {
    setSelectedOptionIds([])
    setResult(null)
  }, [question.id])

  const selectedIds = useMemo(() => new Set(selectedOptionIds), [selectedOptionIds])
  const correctIds = useMemo(() => new Set(result?.correctOptionIds || []), [result])

  function toggleOption(optionId: string) {
    if (result) return
    if (question.type === 'single') {
      setSelectedOptionIds([optionId])
      return
    }

    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    )
  }

  function submitAnswer() {
    if (!selectedOptionIds.length) return
    setResult(onSubmit(question, selectedOptionIds))
  }

  return (
    <article className="quiz-question-panel">
      <div className="quiz-question-topline">
        <span>{positionLabel}</span>
        <button
          className={isStarred ? 'quiz-star is-active' : 'quiz-star'}
          type="button"
          onClick={() => onToggleStar(question.id)}
          aria-label={isStarred ? 'Unstar question' : 'Star question'}
          title={isStarred ? 'Unstar question' : 'Star question'}
        >
          <Star size={20} fill={isStarred ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="quiz-question-meta">
        <span>{question.domain}</span>
        <span>{question.difficulty}</span>
        <span>{question.type === 'multiple' ? 'Multiple choice' : 'Single choice'}</span>
      </div>

      <h2>{question.prompt}</h2>

      <div className="quiz-option-list">
        {question.options.map((option) => {
          const isSelected = selectedIds.has(option.id)
          const isCorrect = correctIds.has(option.id)
          const isWrong = Boolean(result && isSelected && !isCorrect)
          const Icon = question.type === 'multiple' ? Square : Circle

          return (
            <button
              className={[
                'quiz-option',
                isSelected ? 'is-selected' : '',
                isCorrect ? 'is-correct' : '',
                isWrong ? 'is-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
            >
              <span className="quiz-option-marker">
                {isSelected ? <CheckCircle2 size={19} /> : <Icon size={18} />}
              </span>
              <strong>{option.id}</strong>
              <span>{option.text}</span>
            </button>
          )
        })}
      </div>

      {result ? (
        <section className={result.isCorrect ? 'quiz-reveal is-correct' : 'quiz-reveal is-wrong'}>
          <strong>{result.isCorrect ? 'Correct' : 'Not yet'}</strong>
          <span>Answer: {formatCorrectAnswer(question)}</span>
          <p>{question.explanation}</p>
        </section>
      ) : null}

      <div className="quiz-card-actions">
        <button
          className="quiz-primary-action"
          type="button"
          disabled={!selectedOptionIds.length || Boolean(result)}
          onClick={submitAnswer}
        >
          Submit
        </button>
        {onNext ? (
          <button className="quiz-secondary-action" type="button" onClick={onNext}>
            {nextLabel}
          </button>
        ) : null}
      </div>
    </article>
  )
}
