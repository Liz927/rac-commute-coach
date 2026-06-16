import { Eye, EyeOff, HelpCircle } from 'lucide-react'
import MarkButtons from './MarkButtons'

const OPTION_KEYS = ['A', 'B', 'C', 'D']

export default function QuestionCard({ day, question, onUpdate }) {
  const answered = Boolean(question.userAnswer)
  const isCorrect = answered && question.userAnswer === question.correctAnswer

  function updateQuestion(patch) {
    onUpdate({
      ...day,
      questions: day.questions.map((item) =>
        item.id === question.id ? { ...item, ...patch } : item,
      ),
    })
  }

  return (
    <article className="question-card">
      <div className="question-label">{question.label} · 默想题</div>
      <h3>{question.question || '未填写题目'}</h3>
      <div className="answer-grid">
        {OPTION_KEYS.map((key) => {
          const selected = question.userAnswer === key
          const revealedCorrect = question.showAnswer && question.correctAnswer === key
          const revealedWrong = question.showAnswer && selected && !isCorrect
          return (
            <button
              className={[
                selected ? 'is-selected' : '',
                revealedCorrect ? 'is-correct' : '',
                revealedWrong ? 'is-wrong' : '',
              ].join(' ')}
              key={key}
              type="button"
              onClick={() => updateQuestion({ userAnswer: key })}
            >
              <strong>{key}</strong>
              <span>{question.options[key] || `选项 ${key}`}</span>
            </button>
          )
        })}
      </div>

      <div className="question-actions">
        <button
          className={question.isUnsure ? 'is-active' : ''}
          type="button"
          onClick={() => updateQuestion({ isUnsure: !question.isUnsure })}
        >
          <HelpCircle size={19} /> 不确定
        </button>
        <button
          type="button"
          onClick={() => updateQuestion({ showAnswer: !question.showAnswer })}
        >
          {question.showAnswer ? <EyeOff size={19} /> : <Eye size={19} />}
          {question.showAnswer ? '隐藏答案' : '显示答案'}
        </button>
      </div>

      {question.showAnswer && (
        <div className={`answer-reveal ${isCorrect ? 'correct' : answered ? 'wrong' : ''}`}>
          <strong>正确答案：{question.correctAnswer || '未设置'}</strong>
          {answered && <span>{isCorrect ? '回答正确' : `你的答案：${question.userAnswer}`}</span>}
          <p>{question.explanation || '暂无解释。'}</p>
        </div>
      )}

      <MarkButtons
        compact
        marks={day.marks}
        targetType="question"
        targetId={question.id}
        targetLabel={`D${day.dayNumber}-${question.label}`}
        excerpt={question.question}
        onChange={(marks) => onUpdate({ ...day, marks })}
      />
    </article>
  )
}
