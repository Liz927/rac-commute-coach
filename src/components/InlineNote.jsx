import { useEffect, useRef, useState } from 'react'

export default function InlineNote({
  buttonLabel = '备注',
  savedLabel = '已备注',
  placeholder,
  value = '',
  onSave,
  minRows = 3,
}) {
  const [open, setOpen] = useState(Boolean(value))
  const [draft, setDraft] = useState(value)
  const [status, setStatus] = useState(value ? '已保存' : '')
  const didMount = useRef(false)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    setDraft(value)
    setOpen(Boolean(value))
    setStatus(value ? '已保存' : '')
  }, [value])

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return undefined
    }

    setStatus('保存中…')
    const timer = window.setTimeout(() => {
      onSaveRef.current(draft)
      setStatus('已保存')
    }, 500)

    return () => window.clearTimeout(timer)
  }, [draft])

  function saveNow() {
    onSaveRef.current(draft)
    setStatus('已保存')
  }

  return (
    <div className="inline-note">
      <button
        className={value.trim() ? 'has-note' : ''}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        {buttonLabel}
        {value.trim() && <span>{savedLabel}</span>}
      </button>
      {open && (
        <div className="inline-note-editor">
          <textarea
            rows={minRows}
            value={draft}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="text"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
          />
          <div className="inline-note-footer">
            <span role="status">{status}</span>
            <button type="button" onClick={saveNow}>
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
