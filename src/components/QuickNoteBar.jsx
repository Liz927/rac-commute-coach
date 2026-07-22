import { MessageCircleQuestion, Pencil, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createQuickNote, getNotesForDay, upsertQuickNote } from '../lib/day'
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

function getDraftKey(day) {
  return `rac.quickDraft.v1:${day?.id || 'day'}:${day?.packId || 'no-pack'}`
}

function readStoredDraft(day) {
  try {
    return globalThis.localStorage?.getItem(getDraftKey(day)) ?? null
  } catch {
    return null
  }
}

function writeStoredDraft(day, value) {
  try {
    globalThis.localStorage?.setItem(getDraftKey(day), value)
  } catch {
    // localStorage can be unavailable; keep the in-memory draft.
  }
}

function clearStoredDraft(day) {
  try {
    globalThis.localStorage?.removeItem(getDraftKey(day))
  } catch {
    // no-op
  }
}

function getInitialDraft(day) {
  const stored = readStoredDraft(day)
  return stored !== null ? stored : day.quickDraft || ''
}

export default function QuickNoteBar({ day, onUpdate, getReadingContext }) {
  const initialDraft = getInitialDraft(day)
  const [expanded, setExpanded] = useState(Boolean(initialDraft))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState(initialDraft)
  const [committedNotes, setCommittedNotes] = useState(() => getNotesForDay(day))
  const dayRef = useRef(day)
  const onUpdateRef = useRef(onUpdate)
  const getReadingContextRef = useRef(getReadingContext)
  const draftRef = useRef(initialDraft)
  const textareaRef = useRef(null)
  const draftDayIdRef = useRef(day.id)
  const isFocusedRef = useRef(false)
  const isComposingRef = useRef(false)
  const writerRef = useRef(null)
  const quickNotes = committedNotes
  const canAdd = Boolean(draft.trim())

  if (!writerRef.current) {
    writerRef.current = createDeferredDraftWriter((value) => {
      writeStoredDraft(dayRef.current, value)
    })
  }

  function persistDraftToDay(value) {
    const currentDay = dayRef.current
    writeStoredDraft(currentDay, value)
    if ((currentDay.quickDraft || '') === value) return
    onUpdateRef.current((latestDay) => {
      if (latestDay.id !== currentDay.id) return latestDay
      const nextDay = { ...latestDay, quickDraft: value }
      dayRef.current = nextDay
      return nextDay
    })
  }

  useEffect(() => {
    dayRef.current = day
    onUpdateRef.current = onUpdate
    getReadingContextRef.current = getReadingContext
    setCommittedNotes(getNotesForDay(day))
    const savedDraft = getInitialDraft(day)
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
  }, [day, onUpdate, getReadingContext])

  useEffect(() => {
    function flushDraftBeforeLeave(event) {
      if (event.type === 'pagehide' || document.visibilityState === 'hidden') {
        writerRef.current?.flush(draftRef.current)
        persistDraftToDay(draftRef.current)
      }
    }

    document.addEventListener('visibilitychange', flushDraftBeforeLeave)
    window.addEventListener('pagehide', flushDraftBeforeLeave)
    return () => {
      document.removeEventListener('visibilitychange', flushDraftBeforeLeave)
      window.removeEventListener('pagehide', flushDraftBeforeLeave)
      writerRef.current?.flush(draftRef.current)
      persistDraftToDay(draftRef.current)
    }
  }, [])

  function setLocalDraft(value) {
    draftRef.current = value
    setDraft(value)
  }

  function updateDraft(value, { flush = false } = {}) {
    setExpanded(true)
    setLocalDraft(value)
    if (flush) {
      writerRef.current.flush(value)
      persistDraftToDay(value)
    } else {
      writerRef.current.schedule(value)
    }
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
    const value = event.currentTarget.value
    setLocalDraft(value)
    writerRef.current.flush(value)
  }

  function handleBlur() {
    isFocusedRef.current = false
    if (!isComposingRef.current) {
      writerRef.current.flush(draftRef.current)
      persistDraftToDay(draftRef.current)
    }
  }

  function updateNote(note, patch) {
    setCommittedNotes((currentNotes) => upsertQuickNote(currentNotes, { ...note, ...patch }))
    onUpdate((currentDay) => ({
      ...currentDay,
      quickNotes: upsertQuickNote(currentDay.quickNotes || [], { ...note, ...patch }),
    }))
  }

  function deleteNote(id) {
    setCommittedNotes((currentNotes) => currentNotes.filter((note) => note.id !== id))
    onUpdate((currentDay) => ({
      ...currentDay,
      quickNotes: (currentDay.quickNotes || []).filter((note) => note.id !== id),
    }))
  }

  function commitDraft({ collapse = true } = {}) {
    const submittedText = textareaRef.current?.value ?? draftRef.current
    if (!submittedText.trim()) {
      if (collapse) setExpanded(false)
      return false
    }
    writerRef.current.cancel()
    clearStoredDraft(dayRef.current)
    const context =
      typeof getReadingContextRef.current === 'function' ? getReadingContextRef.current() : {}
    const currentDay = dayRef.current
    const note = createQuickNote(submittedText, 'general', new Date().toISOString(), {
      dayId: currentDay.id || '',
      packId: currentDay.packId || '',
      ...context,
    })
    setCommittedNotes((currentNotes) => [...currentNotes, note])
    onUpdateRef.current((currentDay) => {
      const nextDay = {
        ...currentDay,
        quickDraft: '',
        quickNotes: [...(currentDay.quickNotes || []), note],
      }
      dayRef.current = nextDay
      return nextDay
    })
    setLocalDraft('')
    if (collapse) setExpanded(false)
    setDrawerOpen(true)
    setMessage('已加入问题包')
    window.setTimeout(() => setMessage(''), 1500)
    return true
  }

  function addNote() {
    commitDraft()
  }

  function collapseNoteBar() {
    commitDraft()
  }

  function preventBlurBeforeAction(event) {
    event.preventDefault()
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
                      <>
                        {(note.sourceSectionTitle || note.sourceSection) && (
                          <small className="quick-note-source">
                            {note.sourceSectionTitle || note.sourceSection}
                          </small>
                        )}
                        <p>{note.text}</p>
                      </>
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
          <button
            className="quick-note-ghost"
            type="button"
            onPointerDown={preventBlurBeforeAction}
            onMouseDown={preventBlurBeforeAction}
            onClick={collapseNoteBar}
          >
            <X size={18} /> 收起
          </button>
        )}
        <button
          className="quick-note-add"
          type="button"
          onPointerDown={preventBlurBeforeAction}
          onMouseDown={preventBlurBeforeAction}
          onClick={addNote}
          disabled={!canAdd}
        >
          {expanded ? '加入问题包' : '加入'}
        </button>
      </div>
      {expanded && draft && (
        <button
          className="quick-note-clear"
          type="button"
          onPointerDown={preventBlurBeforeAction}
          onMouseDown={preventBlurBeforeAction}
          onClick={() => updateDraft('', { flush: true })}
        >
          清空
        </button>
      )}
    </div>
  )
}
