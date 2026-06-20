import { ArrowLeft, ClipboardCheck, Eraser, Eye, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import questionPackJson from '../features/quiz/data/questions.json'
import { loadImportedQuestions } from '../features/quiz/lib/storage'
import { getPackageQuestionPreview, parseLearningPackage } from '../lib/learningPackage'

const starterText = `RAC_DAY_PACKAGE_V2_START
META_START
day: 3
title: RAC Day 3｜510(k)：Predicate 与 Substantial Equivalence
packId: rac-device-day-003
domain: Premarket
tags: 510k,predicate,substantial-equivalence,intended-use
difficulty: easy
META_END
CONTENT_START
# RAC Day 3｜510(k)：Predicate 与 Substantial Equivalence

## S0｜今天的目标
...
CONTENT_END
QUESTIONS_JSON_START
[
  {
    "id": "rac-d3-q001",
    "type": "single_choice",
    "stem": "510(k) 中 predicate device 最准确的理解是？",
    "options": [
      {"key": "A", "text": "任意同类产品"},
      {"key": "B", "text": "已合法上市、用于 substantial equivalence 比较的参比器械"}
    ],
    "answer": "B",
    "explanation": "Predicate device 是 510(k) 中用于证明 substantial equivalence 的 legally marketed device。"
  }
]
QUESTIONS_JSON_END
RAC_DAY_PACKAGE_V2_END`

function countCharacters(value) {
  return value.replace(/\s/g, '').length
}

export default function PackageImportScreen({
  days,
  onCancel,
  onImportPackage,
  onOpenDay,
  onOpenQuiz,
}) {
  const [rawText, setRawText] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const importedQuestionIds = useMemo(
    () => new Set(loadImportedQuestions().map((question) => question.id)),
    [],
  )
  const bundledQuestionIds = useMemo(
    () => new Set((questionPackJson.questions || []).map((question) => question.id)),
    [],
  )

  function buildPreview(parsed) {
    const existingDay = days.find(
      (day) =>
        (parsed.meta.packId && day.packId === parsed.meta.packId) ||
        day.title === parsed.meta.title,
    )
    const duplicateIds = parsed.questions
      .map((question) => question.id)
      .filter((id) => importedQuestionIds.has(id) || bundledQuestionIds.has(id))

    return {
      parsed,
      existingDay,
      duplicateIds,
      questionPreview: getPackageQuestionPreview(parsed.questions),
    }
  }

  function parsePreview() {
    setError('')
    setResult(null)
    try {
      const parsed = parseLearningPackage(rawText)
      setPreview(buildPreview(parsed))
    } catch (parseError) {
      setPreview(null)
      setError(parseError.message)
    }
  }

  function confirmImport() {
    if (!preview) return
    const mode = preview.existingDay
      ? window.confirm(
        `已发现已有 Day：${preview.existingDay.title}\n\n选择“确定”更新已有 Day；选择“取消”创建副本。`,
      )
        ? 'update'
        : 'copy'
      : 'create'
    const importResult = onImportPackage(preview.parsed, { mode })
    setResult(importResult)
    setPreview(buildPreview(preview.parsed))
  }

  function clearAll() {
    setRawText('')
    setPreview(null)
    setError('')
    setResult(null)
  }

  return (
    <main className="screen package-import-screen">
      <header className="page-header">
        <button className="icon-button" type="button" onClick={onCancel} aria-label="返回">
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">IMPORT PACKAGE</p>
          <h1>导入学习包</h1>
        </div>
      </header>

      <section className="package-import-panel">
        <label>
          <span>粘贴完整 RAC_DAY_PACKAGE_V2 文本</span>
          <small>推荐使用 V2 格式，避免手机复制时短横线丢失；旧 V1 仍可导入。</small>
          <textarea
            value={rawText}
            onChange={(event) => {
              setRawText(event.target.value)
              setPreview(null)
              setResult(null)
              setError('')
            }}
            placeholder={starterText}
          />
        </label>
        <div className="package-import-actions">
          <button type="button" onClick={parsePreview} disabled={!rawText.trim()}>
            <Eye size={18} /> 解析预览
          </button>
          <button type="button" onClick={confirmImport} disabled={!preview}>
            <ClipboardCheck size={18} /> 确认导入
          </button>
          <button type="button" onClick={clearAll}>
            <Eraser size={18} /> 清空
          </button>
        </div>
        {error && <p className="status-message error" role="alert">解析失败：{error}</p>}
      </section>

      {preview && (
        <section className="package-preview-card">
          <p className="eyebrow">PREVIEW</p>
          <h2>{preview.parsed.meta.title}</h2>
          <dl>
            <div><dt>packId</dt><dd>{preview.parsed.meta.packId}</dd></div>
            <div><dt>domain</dt><dd>{preview.parsed.meta.domain || 'General'}</dd></div>
            <div><dt>tags</dt><dd>{preview.parsed.meta.tags.join(', ') || 'general'}</dd></div>
            <div><dt>difficulty</dt><dd>{preview.parsed.meta.difficulty || 'medium'}</dd></div>
            <div><dt>正文长度</dt><dd>{countCharacters(preview.parsed.contentMarkdown)} 字</dd></div>
            <div><dt>题目数量</dt><dd>{preview.parsed.questions.length} 道</dd></div>
            <div>
              <dt>Day 行为</dt>
              <dd>{preview.existingDay ? `将更新：${preview.existingDay.title}` : '将创建新 Day'}</dd>
            </div>
            <div>
              <dt>重复题目</dt>
              <dd>{preview.duplicateIds.length ? preview.duplicateIds.join(', ') : '无'}</dd>
            </div>
          </dl>
          <div className="question-preview-list">
            {preview.questionPreview.map((question) => (
              <article key={question.id}>
                <strong>{question.id}</strong>
                <span>{question.stem}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {result && (
        <section className="import-result-card">
          <p className="eyebrow">IMPORTED</p>
          <h2>{result.dayTitle}</h2>
          <p>
            已{result.dayAction === 'updated' ? '更新' : '创建'} Day。新增题目 {result.addedQuestions} 道，
            更新题目 {result.updatedQuestions} 道。
          </p>
          <p>
            packId: {result.packId}。解析题目 {result.parsedQuestions} 道，当前包内共 {result.totalQuestionsForPack} 道。
          </p>
          {result.parsedQuestions > 0 && result.totalQuestionsForPack === 0 && (
            <p className="status-message error">题目解析成功，但没有保存到该 packId。请重新导入。</p>
          )}
          <div className="package-import-actions">
            <button type="button" onClick={() => onOpenDay(result.dayId)}>
              <PlayCircle size={18} /> 去阅读
            </button>
            <button type="button" onClick={onOpenQuiz}>
              <PlayCircle size={18} /> 去做题
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
