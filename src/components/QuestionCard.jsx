import { Eye, EyeOff, HelpCircle } from 'lucide-react'
import { upsertQuestionNote } from '../lib/day'
import InlineNote from './InlineNote'
import MarkButtons from './MarkButtons'

const OPTION_KEYS = ['A', 'B', 'C', 'D']

export default function QuestionCard({ day, question, onUpdate }) {
  const answered = Boolean(question.userAnswer)
  const isCorrect = answered && question.userAnswer === question.correctAnswer
  const questionNote =
    (day.questionNotes || []).find((note) => note.questionId === question.id)?.note ||
    question.note ||
    ''

  function updateQuestion(patch) {
    onUpdate({
      ...day,
      questions: day.questions.map((item) =>
        item.id === question.id ? { ...item, ...patch } : item,
      ),
    })
  }

  function saveQuestionNote(note) {
    onUpdate({
      ...day,
      questionNotes: upsertQuestionNote(day.questionNotes || [], {
        questionId: question.id,
        questionLabel: question.label,
        note,
      }),
    })
  }

  return (
    <article className="question-card">
      <div className="question-label">{question.label}｜{question.title || '默想题'}</div>
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
          {answered && (
            <span>
              你选了 {question.userAnswer}，正确答案是 {question.correctAnswer}
              {isCorrect ? '。回答正确。' : '。'}
            </span>
          )}
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
      <InlineNote
        buttonLabel="备注/想问一句"
        placeholder="这题哪里不懂？比如：为什么不是 PMA？"
        value={questionNote}
        onSave={saveQuestionNote}
      />
    </article>
  )
}
