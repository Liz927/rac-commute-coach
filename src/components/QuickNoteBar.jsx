import { MessageCircleQuestion, X } from 'lucide-react'
import { useState } from 'react'
import { createQuickNote } from '../lib/day'

export default function QuickNoteBar({ day, onUpdate }) {
  const [expanded, setExpanded] = useState(Boolean(day.quickDraft))
  const [message, setMessage] = useState('')
  const draft = day.quickDraft || ''
  const canAdd = Boolean(draft.trim())

  function updateDraft(value) {
    setExpanded(true)
    onUpdate({ ...day, quickDraft: value })
  }

  function addNote() {
    if (!canAdd) return
    onUpdate({
      ...day,
      quickDraft: '',
      quickNotes: [...(day.quickNotes || []), createQuickNote(draft)],
    })
    setExpanded(false)
    setMessage('已加入今日问题包')
    window.setTimeout(() => setMessage(''), 1500)
  }

  return (
    <div className={`quick-note-bar ${expanded ? 'is-expanded' : ''}`}>
      {message && <div className="quick-note-toast" role="status">{message}</div>}
      <div className="quick-note-inner">
        <MessageCircleQuestion size={19} aria-hidden="true" />
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
