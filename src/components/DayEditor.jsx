import { ArrowLeft, FileScan, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AUDIO_SCRIPT_OPTIONS, normalizeAudioScripts } from '../lib/audioScripts'
import { createEmptyQuestion, mergeParsedQuestions } from '../lib/day'
import { parseMarkdown } from '../lib/markdown'

const OPTION_KEYS = ['A', 'B', 'C', 'D']

export default function DayEditor({ initialDay, onSave, onCancel }) {
  const [day, setDay] = useState(() => ({
    ...structuredClone(initialDay),
    audioScripts: normalizeAudioScripts(initialDay.audioScripts),
  }))
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

  function applyParsing() {
    setDay((current) => ({
      ...current,
      dayNumber: parsed.dayNumber ?? current.dayNumber,
      title: current.title || parsed.topicTitle || parsed.title,
      sections: parsed.sections,
      questions: mergeParsedQuestions(current.questions, parsed.questions),
    }))
  }

  function updateAudioScript(key, value) {
    setDay((current) => ({
      ...current,
      audioScripts: {
        ...normalizeAudioScripts(current.audioScripts),
        [key]: value,
      },
    }))
  }

  function submit(event) {
    event.preventDefault()
    const latest = parseMarkdown(day.contentMarkdown, day.id)
    const manualTitle = day.title.trim()
    onSave({
      ...day,
      dayNumber: latest.dayNumber ?? (Number(day.dayNumber) || 1),
      title: manualTitle || latest.topicTitle || latest.title || '未命名主题',
      audioScripts: normalizeAudioScripts(day.audioScripts),
      sections: latest.sections,
      questions: mergeParsedQuestions(day.questions, latest.questions),
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
          Markdown 学习材料
          <textarea
            className="markdown-input"
            value={day.contentMarkdown}
            onChange={(event) => setDay({ ...day, contentMarkdown: event.target.value })}
            placeholder="# RAC Day 1｜主题&#10;&#10;## S1｜今日一句话&#10;&#10;..."
          />
        </label>

        <div className="parse-panel">
          <div>
            <strong>识别预览</strong>
            <span>{parsed.sections.length} 个段落 · {parsed.questions.length} 道题</span>
          </div>
          <button type="button" onClick={applyParsing}>
            <FileScan size={18} /> 解析 Markdown
          </button>
        </div>

        <section className="audio-script-editor">
          <div className="section-heading">
            <div>
              <h2>音频陪读脚本</h2>
              <p>本地浏览器朗读使用，不会生成音频文件或上传。</p>
            </div>
          </div>
          {AUDIO_SCRIPT_OPTIONS.map((option) => (
            <label key={option.key}>
              {option.label}
              <textarea
                value={day.audioScripts?.[option.key] || ''}
                onChange={(event) => updateAudioScript(option.key, event.target.value)}
                placeholder={
                  option.key === 'casualScript'
                    ? '适合通勤闲聊复盘的自然口吻脚本...'
                    : option.key === 'termsScript'
                      ? '术语卡、定义、对比关系...'
                      : '考点速记、易错点、考试触发词...'
                }
              />
            </label>
          ))}
        </section>

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
              <h2>手工题目</h2>
              <p>自动解析不合适时，可在这里补充或修改。</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDay((current) => ({
                  ...current,
                  questions: [
                    ...current.questions,
                    createEmptyQuestion(current.questions.length + 1),
                  ],
                }))
              }
            >
              <Plus size={18} /> 添加题目
            </button>
          </div>

          {day.questions.map((question) => (
            <fieldset className="question-editor" key={question.id}>
              <legend>{question.label}</legend>
              <div className="question-editor-head">
                <input
                  aria-label="题目标签"
                  value={question.label}
                  onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                />
                <button
                  type="button"
                  aria-label={`删除 ${question.label}`}
                  onClick={() =>
                    setDay((current) => ({
                      ...current,
                      questions: current.questions.filter((item) => item.id !== question.id),
                    }))
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <textarea
                value={question.question}
                onChange={(event) => updateQuestion(question.id, { question: event.target.value })}
                placeholder="题目内容"
              />
              {OPTION_KEYS.map((key) => (
                <label className="option-edit" key={key}>
                  <span>{key}</span>
                  <input
                    value={question.options[key]}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        options: { ...question.options, [key]: event.target.value },
                      })
                    }
                    placeholder={`选项 ${key}`}
                  />
                </label>
              ))}
              <label>
                正确答案
                <select
                  value={question.correctAnswer}
                  onChange={(event) =>
                    updateQuestion(question.id, { correctAnswer: event.target.value })
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
          ))}
        </section>

        <button className="primary-button save-button" type="submit">
          <Save size={19} /> 保存 Day
        </button>
      </form>
    </main>
  )
}
