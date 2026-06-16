import { normalizeAudioScripts } from './audioScripts'

export const STORAGE_KEY = 'rac-commute-coach-data'
export const DATA_VERSION = 1

function normalizeQuestion(question, index) {
  return {
    id: question.id || `imported-question-${index + 1}`,
    label: question.label || `Q${index + 1}`,
    question: question.question || '',
    options: {
      A: question.options?.A || '',
      B: question.options?.B || '',
      C: question.options?.C || '',
      D: question.options?.D || '',
    },
    correctAnswer: ['A', 'B', 'C', 'D'].includes(question.correctAnswer)
      ? question.correctAnswer
      : 'A',
    explanation: question.explanation || '',
    userAnswer: ['A', 'B', 'C', 'D'].includes(question.userAnswer)
      ? question.userAnswer
      : undefined,
    isUnsure: Boolean(question.isUnsure),
    showAnswer: Boolean(question.showAnswer),
    source: question.source || 'manual',
  }
}

function normalizeDay(day, index) {
  const now = new Date().toISOString()
  return {
    id: day.id || `imported-day-${index + 1}`,
    dayNumber: Number(day.dayNumber) || index + 1,
    title: day.title || '',
    contentMarkdown: day.contentMarkdown || '',
    completed: Boolean(day.completed),
    notes: day.notes || '',
    reviewDraft: day.reviewDraft || '',
    audioScripts: normalizeAudioScripts(day.audioScripts),
    sections: Array.isArray(day.sections) ? day.sections : [],
    questions: Array.isArray(day.questions)
      ? day.questions.map((question, questionIndex) => normalizeQuestion(question, questionIndex))
      : [],
    marks: Array.isArray(day.marks) ? day.marks : [],
    createdAt: day.createdAt || now,
    updatedAt: day.updatedAt || now,
  }
}

export function normalizeImport(payload) {
  if (!payload || !Array.isArray(payload.days)) {
    throw new Error('备份文件缺少 days 数组')
  }

  return {
    version: DATA_VERSION,
    exportedAt: payload.exportedAt || new Date().toISOString(),
    days: payload.days.map(normalizeDay),
  }
}

export function loadDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalizeImport(JSON.parse(raw)).days
  } catch {
    return []
  }
}

export function saveDays(days) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, exportedAt: new Date().toISOString(), days }),
  )
}

export function makeExportPayload(days) {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    days,
  }
}
