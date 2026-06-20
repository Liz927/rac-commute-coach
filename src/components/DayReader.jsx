import { ArrowLeft, Check, Clipboard, Edit3, ListTree, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { buildQuestionPackage } from '../lib/package'
import { upsertQuickNote, upsertSectionNote } from '../lib/day'
import { getLinkedDayQuestions } from '../lib/dayQuestions'
import { parseMarkdown } from '../lib/markdown'
import InlineNote from './InlineNote'
import MarkButtons from './MarkButtons'
import QuestionCard from './QuestionCard'
import QuickNoteBar from './QuickNoteBar'

const QUICK_NOTE_TAGS = [
  { value: 'general', label: '普通' },
  { value: 'question', label: '想问' },
  { value: 'unsure', label: '不确定' },
  { value: 'important', label: '重要' },
]

function getSectionTone(label = '') {
  const normalized = label.trim().toUpperCase()
  if (normalized.startsWith('T')) return 'is-terms'
  if (normalized.startsWith('R')) return 'is-review'
  if (normalized.startsWith('S')) return 'is-study'
  return 'is-general'
}

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
      <details id={section.id} className="term-section visual-map-card is-terms" open>
        <summary>
          <span>{section.label}</span>
          {section.title}
        </summary>
        <div className="markdown-body">{body}</div>
      </details>
    )
  }

  return (
    <section
      id={section.id}
      className={`reading-section visual-map-card ${getSectionTone(section.label)}`}
    >
      <div className="reading-heading">
        <span>{section.label}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="markdown-body">{body}</div>
    </section>
  )
}

function ReaderLookup({ sections, query, isOpen, onToggle, onQueryChange, onJump }) {
  const normalizedQuery = query.trim().toLowerCase()
  const matches = normalizedQuery
    ? sections.filter((section) =>
      `${section.label}\n${section.title}\n${section.content}`.toLowerCase().includes(normalizedQuery),
    )
    : sections

  return (
    <aside className={`reader-lookup ${isOpen ? 'is-open' : ''}`} aria-label="目录与搜索">
      <button className="reader-lookup-toggle" type="button" onClick={onToggle}>
        <ListTree size={18} />
        <span>目录 / 搜索</span>
        <small>{sections.length} 段</small>
      </button>
      <div className="reader-lookup-panel">
        <label className="reader-lookup-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜本 Day：predicate / S2 / controls"
          />
        </label>
        <nav className="reader-toc" aria-label="当前 Day 目录">
          {matches.length ? (
            matches.map((section) => (
              <button key={section.id} type="button" onClick={() => onJump(section.id)}>
                <span>{section.label}</span>
                <strong>{section.title}</strong>
              </button>
            ))
          ) : (
            <p>没有匹配的段落。</p>
          )}
        </nav>
      </div>
    </aside>
  )
}

function QuickNotesList({ day, onUpdate }) {
  const notes = day.quickNotes || []
  if (!notes.length) return <p className="quick-notes-empty">还没有随手记录的问题。</p>

  function updateNote(note, patch) {
    onUpdate({
      ...day,
      quickNotes: upsertQuickNote(notes, { ...note, ...patch }),
    })
  }

  function deleteNote(id) {
    onUpdate({
      ...day,
      quickNotes: notes.filter((note) => note.id !== id),
    })
  }

  return (
    <div className="quick-notes-list">
      {notes.map((note) => (
        <article className="quick-note-item" key={note.id}>
          <textarea
            aria-label="编辑快速疑问"
            value={note.text}
            onChange={(event) => updateNote(note, { text: event.target.value })}
          />
          <div className="quick-note-item-actions">
            <select
              aria-label="快速疑问标签"
              value={note.tag || 'general'}
              onChange={(event) => updateNote(note, { tag: event.target.value })}
            >
              {QUICK_NOTE_TAGS.map((tag) => (
                <option key={tag.value} value={tag.value}>{tag.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => deleteNote(note.id)}>删除</button>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function DayReader({ day, allQuizQuestions = [], onBack, onEdit, onUpdate }) {
  const [activeTab, setActiveTab] = useState('reading')
  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupQuery, setLookupQuery] = useState('')
  const [showPackage, setShowPackage] = useState(false)
  const [copied, setCopied] = useState(false)
  const parsed = useMemo(() => parseMarkdown(day.contentMarkdown, day.id), [day])
  const questions = useMemo(
    () => getLinkedDayQuestions(day, allQuizQuestions),
    [day, allQuizQuestions],
  )
  const packageDay = useMemo(
    () => ({
      ...day,
      questions,
    }),
    [day, questions],
  )
  const sections = (day.contentMarkdown ? parsed.sections : day.sections || []).filter(
    (section) => !/^Q\d+$/i.test(section.label),
  )
  const generatedPackageText = useMemo(() => buildQuestionPackage(packageDay), [packageDay])
  const [packageDraft, setPackageDraft] = useState(() => day.reviewDraft || generatedPackageText)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.log('[RAC parser] content length', parsed.contentWithoutQuestions.length)
    console.log('[RAC parser] questions', parsed.questions)
    if (/^#{2,3}\s*Q\d+/im.test(day.contentMarkdown || '') && parsed.questions.length === 0) {
      console.warn('[RAC parser] Found Q headings but parsed 0 questions')
    }
  }, [day.id, parsed.questions.length, parsed.contentWithoutQuestions])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.log('[Day Detail] day', day)
    console.log('[Day Detail] day.packId', day.packId)
    console.log('[Day Detail] allQuizQuestions count', allQuizQuestions.length)
    console.log('[Day Detail] matched questions', questions.length)
  }, [day, allQuizQuestions.length, questions.length])

  useEffect(() => {
    setPackageDraft(day.reviewDraft || generatedPackageText)
  }, [day.id, day.reviewDraft])

  async function copyPackage() {
    await navigator.clipboard.writeText(packageDraft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function updateEffectiveDay(nextDay) {
    onUpdate(nextDay)
  }

  function openPackage() {
    setPackageDraft(generatedPackageText)
    setShowPackage(true)
  }

  function regeneratePackage() {
    if (!window.confirm('重新生成会覆盖你当前手动编辑的问题包内容，继续吗？')) return
    setPackageDraft(generatedPackageText)
  }

  function savePackageDraft() {
    onUpdate({ ...day, reviewDraft: packageDraft })
  }

  function saveFreeNotes(note) {
    onUpdate({ ...day, freeNotes: note })
  }

  function updateReaderDay(nextDay) {
    onUpdate(nextDay)
  }

  function updateLinkedQuestionState(questionId, patch) {
    onUpdate({
      ...day,
      questionStates: {
        ...(day.questionStates || {}),
        [questionId]: {
          ...(day.questionStates || {})[questionId],
          ...patch,
        },
      },
    })
  }

  const freeNoteCount = (day.freeNotes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length

  function jumpToSection(sectionId) {
    setActiveTab('reading')
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

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

      <div className="reader-tabs" role="tablist" aria-label="Day 内容切换">
        <button
          className={activeTab === 'reading' ? 'is-active' : ''}
          type="button"
          role="tab"
          aria-selected={activeTab === 'reading'}
          onClick={() => setActiveTab('reading')}
        >
          阅读
        </button>
        <button
          className={activeTab === 'questions' ? 'is-active' : ''}
          type="button"
          role="tab"
          aria-selected={activeTab === 'questions'}
          onClick={() => setActiveTab('questions')}
        >
          默想题 {questions.length ? `(${questions.length})` : ''}
        </button>
      </div>

      <div className="reader-content-shell">
        {activeTab === 'reading' && sections.length ? (
          <ReaderLookup
            sections={sections}
            query={lookupQuery}
            isOpen={lookupOpen}
            onToggle={() => setLookupOpen((current) => !current)}
            onQueryChange={setLookupQuery}
            onJump={jumpToSection}
          />
        ) : null}

        <article className="reading-paper">
          {activeTab === 'reading' && (
            <>
            {sections.length ? (
              sections.map((section) => (
                <SectionContent
                  key={section.id}
                  section={section}
                  day={day}
                  onUpdate={updateEffectiveDay}
                />
              ))
            ) : (
              <div className="markdown-body standalone-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {parsed.contentWithoutQuestions}
                </ReactMarkdown>
              </div>
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
                  value={day.freeNotes || ''}
                  onSave={saveFreeNotes}
                  minRows={5}
                />
                <div className="quick-notes-panel">
                  <div className="quick-notes-panel-head">
                    <strong>随手疑问</strong>
                    <span>{(day.quickNotes || []).length} 条</span>
                  </div>
                  <QuickNotesList day={day} onUpdate={updateReaderDay} />
                </div>
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
            </>
          )}

          {activeTab === 'questions' && (
            <section className="questions-section">
            <div className="reading-heading">
              <span>QUIZ</span>
              <h2>默想题</h2>
            </div>
            {questions.length ? (
              questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  day={day}
                  question={question}
                  onUpdate={updateEffectiveDay}
                  onStateChange={day.packId ? updateLinkedQuestionState : undefined}
                />
              ))
            ) : (
              <div className="empty-questions-panel">
                {day.packId
                  ? `当前 Day 已关联 packId: ${day.packId}，但题库中没有找到该 packId 的题目。请检查导入是否写入 Quiz question bank。`
                  : '当前 Day 没有 packId，无法关联题库。'}
              </div>
            )}
            </section>
          )}

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
      </div>
      <QuickNoteBar day={day} onUpdate={updateReaderDay} />
    </main>
  )
}
