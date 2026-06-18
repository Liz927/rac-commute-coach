import { ArrowLeft, FileScan, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  OPTION_KEYS,
  createEmptyQuestion,
  getQuestionAnswer,
  getQuestionLabel,
  getQuestionOptions,
  getQuestionStem,
  mergeParsedQuestions,
  updateQuestionOption,
} from '../lib/day'
import { parseMarkdown } from '../lib/markdown'

export default function DayEditor({ initialDay, onSave, onCancel }) {
  const [day, setDay] = useState(() => structuredClone(initialDay))
  const [extractMessage, setExtractMessage] = useState('')
  const parsed = useMemo(
    () => parseMarkdown(day.contentMarkdown, day.id),
    [day.contentMarkdown, day.id],
  )

  function updateQuestion(id, patch) {
    setDay((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    }))
  }

  function renumberQuestions(questions) {
    return questions.map((question, index) => ({
      ...question,
      number: index + 1,
    }))
  }

  function extractQuestionsFromMarkdown() {
    const latest = parseMarkdown(day.contentMarkdown, day.id)
    setDay((current) => ({
      ...current,
      dayNumber: latest.dayNumber ?? current.dayNumber,
      title: current.title || latest.topicTitle || latest.title,
      contentMarkdown: latest.contentWithoutQuestions,
      sections: latest.sections,
      questions: renumberQuestions(mergeParsedQuestions(current.questions, latest.questions)),
    }))
    setExtractMessage(
      latest.questions.length
        ? `成功提取 ${latest.questions.length} 道题，正文里的 Q 区块已移除。`
        : '没有识别到可提取的题目，可以在下方手动添加。',
    )
  }

  function addQuestion() {
    setDay((current) => ({
      ...current,
      questions: [...current.questions, createEmptyQuestion(current.questions.length + 1)],
    }))
  }

  function deleteQuestion(id) {
    setDay((current) => ({
      ...current,
      questions: renumberQuestions(current.questions.filter((item) => item.id !== id)),
    }))
  }

  function moveQuestion(id, direction) {
    setDay((current) => {
      const index = current.questions.findIndex((question) => question.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.questions.length) return current
      const questions = [...current.questions]
      const [item] = questions.splice(index, 1)
      questions.splice(nextIndex, 0, item)
      return { ...current, questions: renumberQuestions(questions) }
    })
  }

  function submit(event) {
    event.preventDefault()
    const latest = parseMarkdown(day.contentMarkdown, day.id)
    const manualTitle = day.title.trim()
    const questions = renumberQuestions(mergeParsedQuestions(day.questions, latest.questions))
    onSave({
      ...day,
      contentMarkdown: latest.contentWithoutQuestions,
      dayNumber: latest.dayNumber ?? (Number(day.dayNumber) || 1),
      title: manualTitle || latest.topicTitle || latest.title || '未命名主题',
      sections: latest.sections,
      questions,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <main className="screen editor-screen">
      <header className="page-header">
        <button className="icon-button" type="button" onClick={onCancel} aria-label="返回">
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">DAY EDITOR</p>
          <h1>{initialDay.title ? '编辑学习日' : '新增学习日'}</h1>
        </div>
      </header>

      <form onSubmit={submit} className="editor-form">
        <div className="field-row">
          <label>
            Day 编号
            <input
              min="1"
              step="any"
              type="number"
              value={day.dayNumber}
              onChange={(event) => setDay({ ...day, dayNumber: event.target.value })}
            />
          </label>
          <label className="completion-field">
            <input
              type="checkbox"
              checked={day.completed}
              onChange={(event) => setDay({ ...day, completed: event.target.checked })}
            />
            标记为已完成
          </label>
        </div>

        <label>
          标题
          <input
            value={day.title}
            onChange={(event) => setDay({ ...day, title: event.target.value })}
            placeholder="例如：510(k) vs De Novo vs PMA"
          />
        </label>

        <label>
          正文 Markdown
          <small className="field-hint">
            正文区只放阅读内容，不建议放 Q1/Q2 默想题。题目请在下方题目区单独添加。
          </small>
          <textarea
            className="markdown-input"
            value={day.contentMarkdown}
            onChange={(event) => setDay({ ...day, contentMarkdown: event.target.value })}
            placeholder="# RAC Day 1｜主题&#10;&#10;## S1｜今日一句话&#10;&#10;..."
          />
        </label>

        <div className="parse-panel">
          <div>
            <strong>旧 Markdown 迁移</strong>
            <span>{parsed.sections.length} 个段落 · 可提取 {parsed.questions.length} 道题</span>
          </div>
          <button type="button" onClick={extractQuestionsFromMarkdown}>
            <FileScan size={18} /> 从正文中提取默想题
          </button>
        </div>
        {extractMessage && <p className="parse-message">{extractMessage}</p>}

        <label>
          自由备注
          <textarea
            value={day.notes}
            onChange={(event) => setDay({ ...day, notes: event.target.value })}
            placeholder="晚上回收时一并导出"
          />
        </label>

        <section className="manual-questions">
          <div className="section-heading">
            <div>
              <h2>题目区</h2>
              <p>题目会单独保存和渲染，不再混在 Markdown 正文里。</p>
            </div>
            <button type="button" onClick={addQuestion}>
              <Plus size={18} /> 添加题目
            </button>
          </div>

          {day.questions.map((question, index) => {
            const label = getQuestionLabel(question, index + 1)
            const options = getQuestionOptions(question)
            return (
            <fieldset className="question-editor" key={question.id}>
              <legend>{label}｜{question.title || '默想题'}</legend>
              <div className="question-editor-head">
                <input
                  aria-label="题目类型"
                  value={question.title || ''}
                  onChange={(event) => updateQuestion(question.id, { title: event.target.value })}
                  placeholder="默想题 / 情景题 / 术语题"
                />
                <button type="button" onClick={() => moveQuestion(question.id, -1)}>上移</button>
                <button type="button" onClick={() => moveQuestion(question.id, 1)}>下移</button>
                <button
                  type="button"
                  aria-label={`删除 ${label}`}
                  onClick={() => deleteQuestion(question.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <textarea
                value={getQuestionStem(question)}
                onChange={(event) => updateQuestion(question.id, { stem: event.target.value })}
                placeholder="题干 stem"
              />
              {options.map((option) => (
                <label className="option-edit" key={option.key}>
                  <span>{option.key}</span>
                  <input
                    value={option.text}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        options: updateQuestionOption(question, option.key, event.target.value),
                      })
                    }
                    placeholder={`选项 ${option.key}`}
                  />
                </label>
              ))}
              <label>
                正确答案
                <select
                  value={getQuestionAnswer(question)}
                  onChange={(event) =>
                    updateQuestion(question.id, { answer: event.target.value })
                  }
                >
                  {OPTION_KEYS.map((key) => <option key={key}>{key}</option>)}
                </select>
              </label>
              <label>
                解释
                <textarea
                  value={question.explanation}
                  onChange={(event) =>
                    updateQuestion(question.id, { explanation: event.target.value })
                  }
                />
              </label>
            </fieldset>
            )
          })}
        </section>

        <button className="primary-button save-button" type="submit">
          <Save size={19} /> 保存 Day
        </button>
      </form>
    </main>
  )
}
