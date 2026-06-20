import {
  getQuestionAnswer,
  getQuestionNumber,
  getQuestionOptions,
  getQuestionStem,
} from './day'
import { parseMarkdown } from './markdown'
import { notifyLocalDataChanged } from './localChanges'

export const STORAGE_KEY = 'rac-commute-coach-data'
export const DATA_VERSION = 1

function normalizeQuestion(question, index) {
  const answer = getQuestionAnswer(question)
  return {
    id: question.id || `imported-question-${index + 1}`,
    number: getQuestionNumber(question, index + 1),
    title: question.title || '默想题',
    stem: getQuestionStem(question),
    options: getQuestionOptions(question),
    answer: ['A', 'B', 'C', 'D'].includes(answer)
      ? answer
      : 'A',
    explanation: question.explanation || '',
    userAnswer: ['A', 'B', 'C', 'D'].includes(question.userAnswer)
      ? question.userAnswer
      : undefined,
    isUnsure: Boolean(question.isUnsure),
    wantsToAsk: Boolean(question.wantsToAsk),
    isImportant: Boolean(question.isImportant),
    showAnswer: Boolean(question.showAnswer),
    note: question.note || '',
    source: question.source || 'manual',
  }
}

function normalizeSectionNote(note, index) {
  const now = new Date().toISOString()
  return {
    id: note.id || `imported-section-note-${index + 1}`,
    sectionId: note.sectionId || '',
    sectionTitle: note.sectionTitle || '',
    note: note.note || '',
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || note.createdAt || now,
  }
}

function normalizeQuestionNote(note, index) {
  const now = new Date().toISOString()
  return {
    id: note.id || `imported-question-note-${index + 1}`,
    questionId: note.questionId || '',
    questionLabel: note.questionLabel || '',
    note: note.note || '',
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || note.createdAt || now,
  }
}

function normalizeQuickNote(note, index) {
  const now = new Date().toISOString()
  const tag = ['question', 'unsure', 'important', 'general'].includes(note.tag)
    ? note.tag
    : 'general'
  return {
    id: note.id || `imported-quick-note-${index + 1}`,
    text: note.text || '',
    tag,
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || note.createdAt || now,
  }
}

function normalizeDay(day, index) {
  const now = new Date().toISOString()
  const id = day.id || `imported-day-${index + 1}`
  const parsed = parseMarkdown(day.contentMarkdown || '', id)
  const importedQuestions = Array.isArray(day.questions)
    ? day.questions.map((question, questionIndex) => normalizeQuestion(question, questionIndex))
    : []
  const parsedQuestions = parsed.questions.map((question, questionIndex) =>
    normalizeQuestion(question, questionIndex),
  )
  const questions = importedQuestions.length ? importedQuestions : parsedQuestions

  return {
    id,
    dayNumber: Number(day.dayNumber) || index + 1,
    title: day.title || '',
    packId: day.packId || '',
    domain: day.domain || '',
    tags: Array.isArray(day.tags) ? day.tags : [],
    contentMarkdown: parsed.contentWithoutQuestions,
    completed: Boolean(day.completed),
    notes: day.notes || '',
    freeNotes: day.freeNotes || '',
    quickDraft: day.quickDraft || '',
    reviewDraft: day.reviewDraft || '',
    sections: parsed.sections.length ? parsed.sections : Array.isArray(day.sections) ? day.sections : [],
    questions,
    marks: Array.isArray(day.marks) ? day.marks : [],
    sectionNotes: Array.isArray(day.sectionNotes)
      ? day.sectionNotes.map(normalizeSectionNote)
      : [],
    questionNotes: Array.isArray(day.questionNotes)
      ? day.questionNotes.map(normalizeQuestionNote)
      : [],
    quickNotes: Array.isArray(day.quickNotes)
      ? day.quickNotes.map(normalizeQuickNote).filter((note) => note.text.trim())
      : [],
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
    quizQuestions: Array.isArray(payload.quizQuestions)
      ? payload.quizQuestions
      : Array.isArray(payload.quiz?.importedQuestions)
        ? payload.quiz.importedQuestions
        : [],
    quizProgress: payload.quizProgress || payload.quiz?.progress || null,
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
  notifyLocalDataChanged()
}

export function makeExportPayload(days, quizData = {}) {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    days: days.map((day, index) => normalizeDay(day, index)),
    quizQuestions: quizData.quizQuestions || [],
    quizProgress: quizData.quizProgress || null,
  }
}
