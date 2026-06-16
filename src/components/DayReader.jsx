import { ArrowLeft, Check, Clipboard, Edit3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { buildQuestionPackage } from '../lib/package'
import { parseMarkdown } from '../lib/markdown'
import MarkButtons from './MarkButtons'
import QuestionCard from './QuestionCard'

function SectionContent({ section, day, onUpdate }) {
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
  const sections = (day.sections?.length ? day.sections : parsed.sections).filter(
    (section) => !/^Q\d+$/i.test(section.label),
  )
  const packageText = buildQuestionPackage(day)

  async function copyPackage() {
    await navigator.clipboard.writeText(packageText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
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

      <article className="reading-paper">
        {sections.length ? (
          sections.map((section) => (
            <SectionContent key={section.id} section={section} day={day} onUpdate={onUpdate} />
          ))
        ) : (
          <div className="markdown-body standalone-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{day.contentMarkdown}</ReactMarkdown>
          </div>
        )}

        {!!day.questions.length && (
          <section className="questions-section">
            <div className="reading-heading">
              <span>QUIZ</span>
              <h2>默想题</h2>
            </div>
            {day.questions.map((question) => (
              <QuestionCard
                key={question.id}
                day={day}
                question={question}
                onUpdate={onUpdate}
              />
            ))}
          </section>
        )}

        <section className="recovery-section">
          <p className="eyebrow">EVENING REVIEW</p>
          <h2>把今天卡住的地方带回去</h2>
          <p>想问、不确定、答错题和自由备注，会自动整理成一段可复制文本。</p>
          <button className="primary-button" type="button" onClick={() => setShowPackage(true)}>
            生成今日问题包
          </button>
        </section>

        {showPackage && (
          <section className="package-panel">
            <div className="section-heading">
              <h2>今日问题包</h2>
              <button type="button" onClick={() => setShowPackage(false)}>收起</button>
            </div>
            <textarea readOnly value={packageText} aria-label="今日问题包文本" />
            <button className="primary-button" type="button" onClick={copyPackage}>
              {copied ? <Check size={19} /> : <Clipboard size={19} />}
              {copied ? '已复制' : '一键复制'}
            </button>
          </section>
        )}
      </article>
    </main>
  )
}
