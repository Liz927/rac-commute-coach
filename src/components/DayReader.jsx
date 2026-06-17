import { ArrowLeft, Check, Clipboard, Edit3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { buildQuestionPackage } from '../lib/package'
import { mergeParsedQuestions, upsertSectionNote } from '../lib/day'
import { parseMarkdown } from '../lib/markdown'
import InlineNote from './InlineNote'
import MarkButtons from './MarkButtons'
import QuestionCard from './QuestionCard'

function SectionContent({ section, day, onUpdate }) {
  const sectionNote =
    (day.sectionNotes || []).find((note) => note.sectionId === section.id)?.note || ''

  function saveSectionNote(note) {
    onUpdate({
      ...day,
      sectionNotes: upsertSectionNote(day.sectionNotes || [], {
        sectionId: section.id,
        sectionTitle: section.title,
        note,
      }),
    })
  }

  const body = (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
      <MarkButtons
        marks={day.marks}
        targetType="section"
        targetId={section.id}
        targetLabel={`D${day.dayNumber}-${section.label}`}
        excerpt={section.title}
        onChange={(marks) => onUpdate({ ...day, marks })}
      />
      <InlineNote
        buttonLabel="记一句"
        placeholder="这里想问什么？随手记一句即可"
        value={sectionNote}
        onSave={saveSectionNote}
      />
    </>
  )

  if (section.collapsible) {
    return (
      <details className="term-section" open>
        <summary>
          <span>{section.label}</span>
          {section.title}
        </summary>
        <div className="markdown-body">{body}</div>
      </details>
    )
  }

  return (
    <section className="reading-section">
      <div className="reading-heading">
        <span>{section.label}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="markdown-body">{body}</div>
    </section>
  )
}

export default function DayReader({ day, onBack, onEdit, onUpdate }) {
  const [showPackage, setShowPackage] = useState(false)
  const [copied, setCopied] = useState(false)
  const parsed = useMemo(() => parseMarkdown(day.contentMarkdown, day.id), [day])
  const questions = useMemo(
    () => mergeParsedQuestions(day.questions || [], parsed.questions),
    [day.questions, parsed.questions],
  )
  const effectiveDay = useMemo(
    () => ({
      ...day,
      questions,
    }),
    [day, questions],
  )
  const sections = (day.contentMarkdown ? parsed.sections : day.sections || []).filter(
    (section) => !/^Q\d+$/i.test(section.label),
  )
  const generatedPackageText = useMemo(() => buildQuestionPackage(effectiveDay), [effectiveDay])
  const [packageDraft, setPackageDraft] = useState(() => day.reviewDraft || generatedPackageText)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.log(
      `[RAC parser] day=${day.id} questions=${parsed.questions.length} contentHasAnswer=${/Answer\s*:|Explanation\s*:/i.test(parsed.contentWithoutQuestions)}`,
    )
  }, [day.id, parsed.questions.length, parsed.contentWithoutQuestions])

  useEffect(() => {
    setPackageDraft(day.reviewDraft || generatedPackageText)
  }, [day.id, day.reviewDraft])

  async function copyPackage() {
    await navigator.clipboard.writeText(packageDraft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function updateEffectiveDay(nextDay) {
    onUpdate({ ...nextDay, questions: nextDay.questions || [] })
  }

  function openPackage() {
    setPackageDraft(day.reviewDraft || generatedPackageText)
    setShowPackage(true)
  }

  function regeneratePackage() {
    if (!window.confirm('重新生成会覆盖你当前手动编辑的问题包内容，继续吗？')) return
    setPackageDraft(generatedPackageText)
  }

  function savePackageDraft() {
    onUpdate({ ...effectiveDay, reviewDraft: packageDraft })
  }

  function saveFreeNotes(note) {
    onUpdate({ ...effectiveDay, freeNotes: note })
  }

  const freeNoteCount = (effectiveDay.freeNotes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length

  return (
    <main className="reader-screen">
      <header className="reader-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="返回">
          <ArrowLeft />
        </button>
        <div>
          <span>DAY {day.dayNumber}</span>
          <h1>{day.title}</h1>
        </div>
        <button className="icon-button" type="button" onClick={onEdit} aria-label="编辑">
          <Edit3 />
        </button>
      </header>

      <div className="reader-progress">
        <button
          className={day.completed ? 'is-complete' : ''}
          type="button"
          onClick={() => onUpdate({ ...day, completed: !day.completed })}
        >
          <Check size={18} /> {day.completed ? '今日已完成' : '标记今日完成'}
        </button>
      </div>

      <article className="reading-paper">
        {sections.length ? (
          sections.map((section) => (
            <SectionContent
              key={section.id}
              section={section}
              day={effectiveDay}
              onUpdate={updateEffectiveDay}
            />
          ))
        ) : (
          <div className="markdown-body standalone-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {parsed.contentWithoutQuestions || day.contentMarkdown}
            </ReactMarkdown>
          </div>
        )}

        {!!questions.length && (
          <section className="questions-section">
            <div className="reading-heading">
              <span>QUIZ</span>
              <h2>默想题</h2>
            </div>
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                day={effectiveDay}
                question={question}
                onUpdate={updateEffectiveDay}
              />
            ))}
          </section>
        )}

        <section className="free-notes-section">
          <details>
            <summary>
              <span>我的自由备注</span>
              <small>{freeNoteCount ? `已记录 ${freeNoteCount} 条` : '未记录'}</small>
            </summary>
            <InlineNote
              buttonLabel="编辑自由备注"
              savedLabel="有内容"
              placeholder={`controls 和 evidence 的区别还是有点混
De Novo 和 PMA 的边界想再问
这段和我 BRCA CE 经历可以怎么对应`}
              value={effectiveDay.freeNotes || ''}
              onSave={saveFreeNotes}
              minRows={5}
            />
          </details>
        </section>

        <section className="recovery-section">
          <p className="eyebrow">EVENING REVIEW</p>
          <h2>把今天卡住的地方带回去</h2>
          <p>想问、不确定、答错题和自由备注，会自动整理成一段可复制文本。</p>
          <button className="primary-button" type="button" onClick={openPackage}>
            生成今日问题包
          </button>
        </section>

        {showPackage && (
          <section className="package-panel">
            <div className="section-heading">
              <h2>今日问题包</h2>
              <button type="button" onClick={() => setShowPackage(false)}>收起</button>
            </div>
            <textarea
              value={packageDraft}
              onChange={(event) => setPackageDraft(event.target.value)}
              aria-label="今日问题包文本"
            />
            <div className="package-actions">
              <button type="button" onClick={regeneratePackage}>
                重新生成
              </button>
              <button type="button" onClick={savePackageDraft}>
                保存为今日备注
              </button>
              <button className="primary-button" type="button" onClick={copyPackage}>
                {copied ? <Check size={19} /> : <Clipboard size={19} />}
                {copied ? '已复制' : '一键复制'}
              </button>
            </div>
          </section>
        )}
      </article>
    </main>
  )
}
