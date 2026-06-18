import { MessageCircleQuestion, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { createQuickNote, upsertQuickNote } from '../lib/day'

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
  const draft = day.quickDraft || ''
  const quickNotes = day.quickNotes || []
  const canAdd = Boolean(draft.trim())

  function updateDraft(value) {
    setExpanded(true)
    onUpdate({ ...day, quickDraft: value })
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
    if (!canAdd) return
    onUpdate({
      ...day,
      quickDraft: '',
      quickNotes: [...quickNotes, createQuickNote(draft)],
    })
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
          aria-label="快速疑问记录"
          rows={expanded ? 3 : 1}
          value={draft}
          onClick={() => setExpanded(true)}
          onFocus={() => setExpanded(true)}
          onChange={(event) => updateDraft(event.target.value)}
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
        <button className="quick-note-clear" type="button" onClick={() => updateDraft('')}>
          清空
        </button>
      )}
    </div>
  )
}
