import { MessageCircleQuestion, Pencil, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { appendQuickNoteToDay, upsertQuickNote } from '../lib/day'
import { createDeferredDraftWriter, shouldSyncDraftFromDay } from '../lib/deferredDraft'

const TAGS = [
  { value: 'general', label: '备注' },
  { value: 'question', label: '想问' },
  { value: 'unsure', label: '不确定' },
  { value: 'important', label: '重要' },
]

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function tagLabel(tag = 'general') {
  return TAGS.find((item) => item.value === tag)?.label || '备注'
}

export default function QuickNoteBar({ day, onUpdate }) {
  const [expanded, setExpanded] = useState(Boolean(day.quickDraft))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState(day.quickDraft || '')
  const dayRef = useRef(day)
  const onUpdateRef = useRef(onUpdate)
  const draftRef = useRef(day.quickDraft || '')
  const textareaRef = useRef(null)
  const draftDayIdRef = useRef(day.id)
  const isFocusedRef = useRef(false)
  const isComposingRef = useRef(false)
  const writerRef = useRef(null)
  const quickNotes = day.quickNotes || []
  const canAdd = Boolean(draft.trim())

  if (!writerRef.current) {
    writerRef.current = createDeferredDraftWriter((value) => {
      const currentDay = dayRef.current
      if ((currentDay.quickDraft || '') === value) return
      onUpdateRef.current({ ...currentDay, quickDraft: value })
    })
  }

  useEffect(() => {
    dayRef.current = day
    onUpdateRef.current = onUpdate
    const savedDraft = day.quickDraft || ''
    const shouldSync = shouldSyncDraftFromDay({
      currentDayId: draftDayIdRef.current,
      nextDayId: day.id,
      isFocused: isFocusedRef.current,
      isComposing: isComposingRef.current,
      localValue: draftRef.current,
      savedValue: savedDraft,
    })
    draftDayIdRef.current = day.id
    if (shouldSync) {
      draftRef.current = savedDraft
      setDraft(savedDraft)
    }
  }, [day, onUpdate])

  useEffect(() => () => writerRef.current?.cancel(), [])

  function setLocalDraft(value) {
    draftRef.current = value
    setDraft(value)
  }

  function updateDraft(value, { flush = false } = {}) {
    setExpanded(true)
    setLocalDraft(value)
    if (flush) writerRef.current.flush(value)
    else writerRef.current.schedule(value)
  }

  function handleDraftChange(event) {
    const value = event.currentTarget.value
    setLocalDraft(value)
    const isComposing = isComposingRef.current || event.nativeEvent.isComposing
    if (!isComposing) writerRef.current.schedule(value)
  }

  function handleCompositionStart() {
    isComposingRef.current = true
    writerRef.current.cancel()
  }

  function handleCompositionEnd(event) {
    isComposingRef.current = false
    updateDraft(event.currentTarget.value, { flush: true })
  }

  function handleBlur() {
    isFocusedRef.current = false
    if (!isComposingRef.current) writerRef.current.flush(draftRef.current)
  }

  function updateNote(note, patch) {
    onUpdate({
      ...day,
      quickNotes: upsertQuickNote(quickNotes, { ...note, ...patch }),
    })
  }

  function deleteNote(id) {
    onUpdate({
      ...day,
      quickNotes: quickNotes.filter((note) => note.id !== id),
    })
  }

  function addNote() {
    const submittedText = textareaRef.current?.value ?? draftRef.current
    if (!submittedText.trim()) return
    writerRef.current.cancel()
    const currentDay = dayRef.current
    onUpdateRef.current(appendQuickNoteToDay(currentDay, submittedText))
    setLocalDraft('')
    setExpanded(false)
    setDrawerOpen(true)
    setMessage('已加入问题包')
    window.setTimeout(() => setMessage(''), 1500)
  }

  return (
    <div className={`quick-note-bar ${expanded ? 'is-expanded' : ''}`}>
      {message && <div className="quick-note-toast" role="status">{message}</div>}

      <button
        className="quick-note-count"
        type="button"
        onClick={() => setDrawerOpen((open) => !open)}
        aria-expanded={drawerOpen}
      >
        <MessageCircleQuestion size={17} aria-hidden="true" />
        {quickNotes.length ? `已记 ${quickNotes.length} 条` : '已记 0 条'}
        {draft.trim() && <span>有未加入草稿</span>}
      </button>

      {drawerOpen && (
        <section className="quick-note-drawer" aria-label="已记录的快速疑问">
          <div className="quick-note-drawer-head">
            <strong>已记录的疑问</strong>
            <button type="button" onClick={() => setDrawerOpen(false)}>收起</button>
          </div>
          {quickNotes.length ? (
            <div className="quick-note-drawer-list">
              {quickNotes.map((note) => {
                const isEditing = editingId === note.id
                return (
                  <article className="quick-note-drawer-item" key={note.id}>
                    <div className="quick-note-meta">
                      <span>{tagLabel(note.tag)}</span>
                      <time>{formatTime(note.createdAt)}</time>
                    </div>
                    {isEditing ? (
                      <textarea
                        aria-label="编辑快速疑问"
                        value={note.text}
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        inputMode="text"
                        onChange={(event) => updateNote(note, { text: event.target.value })}
                      />
                    ) : (
                      <p>{note.text}</p>
                    )}
                    <div className="quick-note-drawer-actions">
                      <button type="button" onClick={() => setEditingId(isEditing ? '' : note.id)}>
                        <Pencil size={15} /> {isEditing ? '完成' : '编辑'}
                      </button>
                      <button type="button" onClick={() => updateNote(note, { tag: 'question' })}>
                        标为想问
                      </button>
                      <button type="button" onClick={() => updateNote(note, { tag: 'unsure' })}>
                        标为不确定
                      </button>
                      <button type="button" onClick={() => updateNote(note, { tag: 'important' })}>
                        标为重要
                      </button>
                      <button type="button" onClick={() => deleteNote(note.id)}>删除</button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="quick-note-drawer-empty">还没有加入的问题。输入后点“加入问题包”。</p>
          )}
        </section>
      )}

      <div className="quick-note-inner">
        <textarea
          ref={textareaRef}
          aria-label="快速疑问记录"
          rows={expanded ? 3 : 1}
          value={draft}
          onClick={() => setExpanded(true)}
          onFocus={() => {
            isFocusedRef.current = true
            setExpanded(true)
          }}
          onChange={handleDraftChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={handleBlur}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          placeholder="随手记一个疑问…"
        />
        {expanded && (
          <button className="quick-note-ghost" type="button" onClick={() => setExpanded(false)}>
            <X size={18} /> 收起
          </button>
        )}
        <button className="quick-note-add" type="button" onClick={addNote} disabled={!canAdd}>
          {expanded ? '加入问题包' : '加入'}
        </button>
      </div>
      {expanded && draft && (
        <button className="quick-note-clear" type="button" onClick={() => updateDraft('', { flush: true })}>
          清空
        </button>
      )}
    </div>
  )
}
