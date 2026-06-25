import { Eye, EyeOff, HelpCircle } from 'lucide-react'
import {
  getQuestionAnswer,
  getQuestionLabel,
  getQuestionOptions,
  getQuestionStem,
  selectQuestionAnswerPatch,
  upsertQuestionNote,
} from '../lib/day'
import InlineNote from './InlineNote'
import MarkButtons from './MarkButtons'

export default function QuestionCard({ day, question, onUpdate, onStateChange }) {
  const label = getQuestionLabel(question)
  const stem = getQuestionStem(question)
  const answer = getQuestionAnswer(question)
  const options = getQuestionOptions(question)
  const answered = Boolean(question.userAnswer)
  const answerVisible = Boolean(question.showAnswer)
  const isCorrect = answered && question.userAnswer === answer
  const questionNote =
    (day.questionNotes || []).find((note) => note.questionId === question.id)?.note ||
    question.note ||
    ''

  function updateQuestion(patch) {
    if (onStateChange) {
      onStateChange(question.id, patch)
      return
    }
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
        questionLabel: label,
        note,
      }),
    })
  }

  return (
    <article className="question-card">
      <div className="question-label">{label}｜{question.title || '默想题'}</div>
      <h3>{stem || '未填写题目'}</h3>
      <div className="answer-grid">
        {options.map((option) => {
          const key = option.key
          const selected = question.userAnswer === key
          const revealedCorrect = answerVisible && answer === key
          const revealedWrong = answerVisible && selected && !isCorrect
          return (
            <button
              className={[
                selected ? 'is-selected' : '',
                revealedCorrect ? 'is-correct' : '',
                revealedWrong ? 'is-wrong' : '',
              ].join(' ')}
              key={key}
              type="button"
              onClick={() => updateQuestion(selectQuestionAnswerPatch(key))}
            >
              <strong>{key}</strong>
              <span>{option.text || `选项 ${key}`}</span>
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
          onClick={() => updateQuestion({ showAnswer: !answerVisible })}
        >
          {answerVisible ? <EyeOff size={19} /> : <Eye size={19} />}
          {answerVisible ? '隐藏答案' : '显示答案'}
        </button>
      </div>

      {answerVisible && (
        <div className={`answer-reveal ${isCorrect ? 'correct' : answered ? 'wrong' : ''}`}>
          <strong>正确答案：{answer || '未设置'}</strong>
          {answered && (
            <span>
              你选择了 {question.userAnswer}，正确答案是 {answer}
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
        targetLabel={`D${day.dayNumber}-${label}`}
        excerpt={stem}
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
