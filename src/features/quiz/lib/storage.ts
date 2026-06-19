import type { Question, QuizProgress } from '../types'

export const QUIZ_PROGRESS_KEY = 'rac.quiz.progress.v1'
export const QUIZ_QUESTION_BANK_KEY = 'rac.quiz.importedQuestions.v1'

export type QuizStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => unknown
}

export const EMPTY_PROGRESS: QuizProgress = {
  attempts: [],
  starredQuestionIds: [],
}

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const VALID_TYPES = ['single', 'multiple']

function normalizeProgress(value: Partial<QuizProgress> | null): QuizProgress {
  return {
    attempts: Array.isArray(value?.attempts) ? value.attempts : [],
    starredQuestionIds: Array.isArray(value?.starredQuestionIds) ? value.starredQuestionIds : [],
  }
}

export function loadQuizProgress(storage: QuizStorage = localStorage): QuizProgress {
  try {
    const raw = storage.getItem(QUIZ_PROGRESS_KEY)
    if (!raw) return EMPTY_PROGRESS
    return normalizeProgress(JSON.parse(raw))
  } catch {
    return EMPTY_PROGRESS
  }
}

export function saveQuizProgress(
  progress: QuizProgress,
  storage: QuizStorage = localStorage,
) {
  storage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(normalizeProgress(progress)))
}

function normalizeQuestion(question: Partial<Question>, index: number): Question | null {
  const id = String(question.id || `imported-quiz-question-${index + 1}`).trim()
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) => ({
          id: String(option.id || '').trim().toUpperCase(),
          text: String(option.text || '').trim(),
        }))
        .filter((option) => option.id && option.text)
    : []
  const correctOptionIds = Array.isArray(question.correctOptionIds)
    ? question.correctOptionIds.map((optionId) => String(optionId).trim().toUpperCase()).filter(Boolean)
    : []
  const type = VALID_TYPES.includes(question.type || '') ? question.type : 'single'
  const difficulty = VALID_DIFFICULTIES.includes(question.difficulty || '')
    ? question.difficulty
    : 'medium'

  if (!id || !question.prompt || !options.length || !correctOptionIds.length) return null

  return {
    id,
    packId: question.packId || '',
    type,
    domain: question.domain || 'General',
    tags: Array.isArray(question.tags) && question.tags.length ? question.tags : ['general'],
    difficulty,
    prompt: question.prompt,
    options,
    correctOptionIds,
    explanation: question.explanation || '',
    placeholder: question.placeholder,
  } as Question
}

export function normalizeImportedQuestions(questions: unknown): Question[] {
  if (!Array.isArray(questions)) return []
  const seen = new Set<string>()
  return questions
    .map((question, index) => normalizeQuestion(question as Partial<Question>, index))
    .filter((question): question is Question => Boolean(question))
    .filter((question) => {
      if (seen.has(question.id)) return false
      seen.add(question.id)
      return true
    })
}

export function loadImportedQuestions(storage: QuizStorage = localStorage): Question[] {
  try {
    const raw = storage.getItem(QUIZ_QUESTION_BANK_KEY)
    if (!raw) return []
    return normalizeImportedQuestions(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveImportedQuestions(
  questions: Question[],
  storage: QuizStorage = localStorage,
) {
  storage.setItem(QUIZ_QUESTION_BANK_KEY, JSON.stringify(normalizeImportedQuestions(questions)))
}

export function mergeImportedQuestions(existing: Question[], incoming: Question[]) {
  const existingById = new Map(existing.map((question) => [question.id, question]))
  let added = 0
  let updated = 0

  incoming.forEach((question) => {
    if (existingById.has(question.id)) updated += 1
    else added += 1
    existingById.set(question.id, question)
  })

  return {
    questions: Array.from(existingById.values()).sort((a, b) => a.id.localeCompare(b.id)),
    added,
    updated,
  }
}
