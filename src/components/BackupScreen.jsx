import { ArrowDownToLine, ArrowUpFromLine, Database, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { makeExportPayload, normalizeImport } from '../lib/storage'
import {
  loadImportedQuestions,
  loadQuizProgress,
  saveImportedQuestions,
  saveQuizProgress,
} from '../features/quiz/lib/storage'

export default function BackupScreen({ days, onImport, onClear }) {
  const inputRef = useRef(null)
  const [message, setMessage] = useState('')

  function exportData() {
    const payload = makeExportPayload(days, {
      quizQuestions: loadImportedQuestions(),
      quizProgress: loadQuizProgress(),
    })
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `rac-commute-coach-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('备份文件已导出。')
  }

  async function importData(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const payload = normalizeImport(JSON.parse(await file.text()))
      if (!window.confirm(`导入将替换当前 ${days.length} 个 Day，继续吗？`)) return
      onImport(payload.days)
      saveImportedQuestions(payload.quizQuestions || [])
      if (payload.quizProgress) saveQuizProgress(payload.quizProgress)
      setMessage(`已恢复 ${payload.days.length} 个 Day，${(payload.quizQuestions || []).length} 道导入题。`)
    } catch (error) {
      setMessage(`导入失败：${error.message}`)
    } finally {
      event.target.value = ''
    }
  }

  function clearAll() {
    if (!window.confirm('第一次确认：确定要清空全部学习数据吗？')) return
    if (!window.confirm('第二次确认：清空后只能通过 JSON 备份恢复。继续？')) return
    onClear()
    setMessage('全部数据已清空。')
  }

  return (
    <main className="screen backup-screen">
      <header className="page-title">
        <p className="eyebrow">LOCAL DATA</p>
        <h1>备份与恢复</h1>
        <p>所有数据只保存在这台设备的浏览器中。建议定期导出。</p>
      </header>

      <section className="backup-card">
        <Database size={30} />
        <div>
          <strong>{days.length} 个 Day</strong>
          <span>当前本地数据</span>
        </div>
      </section>

      <section className="backup-actions">
        <button type="button" onClick={exportData}>
          <ArrowDownToLine />
          <span><strong>Export JSON</strong><small>下载全部 Day、答题和标记</small></span>
        </button>
        <button type="button" onClick={() => inputRef.current?.click()}>
          <ArrowUpFromLine />
          <span><strong>Import JSON</strong><small>从备份文件恢复并替换当前数据</small></span>
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={importData}
        />
      </section>

      <section className="danger-zone">
        <div>
          <h2>清空本地数据</h2>
          <p>这会删除所有 Day、答题记录和标记，并进行两次确认。</p>
        </div>
        <button type="button" onClick={clearAll}>
          <Trash2 size={18} /> Clear all data
        </button>
      </section>

      {message && <p className="status-message" role="status">{message}</p>}
    </main>
  )
}
