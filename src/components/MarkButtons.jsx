import { useState } from 'react'
import { Check, CircleHelp, Flag, MessageCircleQuestion } from 'lucide-react'
import { removeMark, upsertMark } from '../lib/day'

const MARKS = [
  { type: 'understood', label: '懂了', icon: Check },
  { type: 'unsure', label: '不确定', icon: CircleHelp },
  { type: 'question', label: '想问', icon: MessageCircleQuestion },
  { type: 'important', label: '重要', icon: Flag },
]

export default function MarkButtons({
  marks,
  targetType,
  targetId,
  targetLabel,
  excerpt,
  onChange,
  compact = false,
}) {
  const targetMarks = marks.filter(
    (mark) => mark.targetType === targetType && mark.targetId === targetId,
  )
  const [note, setNote] = useState(targetMarks.find((mark) => mark.note)?.note || '')

  function toggleMark(markType) {
    const active = targetMarks.some((mark) => mark.markType === markType)
    if (active) {
      onChange(removeMark(marks, targetType, targetId, markType))
      return
    }

    onChange(
      upsertMark(marks, {
        targetType,
        targetId,
        targetLabel,
        markType,
        excerpt,
        note,
        createdAt: new Date().toISOString(),
      }),
    )
  }

  function saveNote() {
    if (!targetMarks.length) return
    let next = marks
    for (const mark of targetMarks) {
      next = upsertMark(next, { ...mark, note })
    }
    onChange(next)
  }

  return (
    <div className={`mark-area ${compact ? 'is-compact' : ''}`}>
      <div className="mark-buttons" aria-label={`标记 ${targetLabel}`}>
        {MARKS.map(({ type, label, icon: Icon }) => {
          const active = targetMarks.some((mark) => mark.markType === type)
          return (
            <button
              className={active ? `mark-${type} is-active` : ''}
              key={type}
              onClick={() => toggleMark(type)}
              type="button"
              aria-pressed={active}
            >
              <Icon size={17} />
              {label}
            </button>
          )
        })}
      </div>
      <input
        aria-label={`${targetLabel} 标记备注`}
        className="mark-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={saveNote}
        placeholder="标记备注（可选）"
      />
    </div>
  )
}
