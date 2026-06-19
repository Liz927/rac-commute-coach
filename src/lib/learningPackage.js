import { parseMarkdown } from './markdown'

const PACKAGE_START = '---RAC_DAY_PACKAGE_V1---'
const CONTENT_MARKER = '---CONTENT---'
const QUESTIONS_MARKER = '---QUESTIONS_JSON---'
const END_MARKER = '---END---'
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const VALID_OPTION_KEYS = ['A', 'B', 'C', 'D']

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `package-${Date.now()}`
}

function parseMeta(metaText) {
  return metaText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((meta, line) => {
      const separatorIndex = line.indexOf(':')
      if (separatorIndex < 0) return meta
      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()
      return { ...meta, [key]: value }
    }, {})
}

function markerIndex(rawText, marker) {
  const index = rawText.indexOf(marker)
  if (index < 0) {
    throw new Error(`学习包缺少 ${marker}`)
  }
  return index
}

function normalizeDifficulty(value) {
  return VALID_DIFFICULTIES.includes(value) ? value : undefined
}

function normalizeType(type, correctOptionIds) {
  if (type === 'multiple' || type === 'multiple_choice') return 'multiple'
  if (type === 'single' || type === 'single_choice') return 'single'
  return correctOptionIds.length > 1 ? 'multiple' : 'single'
}

function normalizeOptions(question, questionId) {
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`题目 ${questionId} 至少需要两个选项`)
  }

  return question.options.map((option) => {
    const id = String(option.id || option.key || '').trim().toUpperCase()
    if (!id) {
      throw new Error(`题目 ${questionId} 有选项缺少 key/id`)
    }
    return {
      id,
      text: String(option.text || '').trim(),
    }
  })
}

function normalizeAnswers(question, options, questionId) {
  const rawAnswers = question.correctOptionIds || question.answers || question.answer
  const answers = Array.isArray(rawAnswers) ? rawAnswers : [rawAnswers]
  const optionIds = new Set(options.map((option) => option.id))
  const normalized = answers
    .map((answer) => String(answer || '').trim().toUpperCase())
    .filter(Boolean)

  if (!normalized.length) {
    throw new Error(`题目 ${questionId} 缺少答案`)
  }

  normalized.forEach((answer) => {
    if (!optionIds.has(answer)) {
      throw new Error(`题目 ${questionId} 的答案 ${answer} 不在选项中`)
    }
  })

  return normalized
}

function normalizeQuizQuestion(question, index, meta) {
  const id = String(question.id || `${meta.packId}-q${String(index + 1).padStart(3, '0')}`).trim()
  const options = normalizeOptions(question, id)
  const correctOptionIds = normalizeAnswers(question, options, id)
  const tags = normalizeTags(question.tags).length ? normalizeTags(question.tags) : meta.tags

  return {
    id,
    packId: question.packId || meta.packId,
    type: normalizeType(question.type, correctOptionIds),
    domain: question.domain || meta.domain || 'General',
    tags: tags.length ? tags : ['general'],
    difficulty: normalizeDifficulty(question.difficulty) || meta.difficulty || 'medium',
    prompt: String(question.prompt || question.stem || '').trim(),
    options,
    correctOptionIds,
    explanation: String(question.explanation || '').trim(),
  }
}

export function parseLearningPackage(rawText = '') {
  const raw = String(rawText || '').trim()
  const startIndex = markerIndex(raw, PACKAGE_START)
  const contentIndex = markerIndex(raw, CONTENT_MARKER)
  const questionsIndex = markerIndex(raw, QUESTIONS_MARKER)
  const endIndex = markerIndex(raw, END_MARKER)

  if (!(startIndex < contentIndex && contentIndex < questionsIndex && questionsIndex < endIndex)) {
    throw new Error('学习包分区顺序不正确')
  }

  const metaRaw = raw.slice(startIndex + PACKAGE_START.length, contentIndex).trim()
  const contentMarkdown = raw.slice(contentIndex + CONTENT_MARKER.length, questionsIndex).trim()
  const questionsRaw = raw.slice(questionsIndex + QUESTIONS_MARKER.length, endIndex).trim()
  const rawMeta = parseMeta(metaRaw)
  const title = rawMeta.title?.trim()

  if (!title) {
    throw new Error('学习包缺少 title')
  }

  const day = rawMeta.day ? Number(rawMeta.day) : undefined
  const packId = rawMeta.packId?.trim() || `rac-day-${day || slugify(title)}`
  const meta = {
    day: Number.isFinite(day) ? day : undefined,
    title,
    packId,
    domain: rawMeta.domain?.trim() || undefined,
    tags: normalizeTags(rawMeta.tags),
    difficulty: normalizeDifficulty(rawMeta.difficulty?.trim()),
  }

  let parsedQuestions
  try {
    parsedQuestions = JSON.parse(questionsRaw)
  } catch (error) {
    throw new Error(`QUESTIONS_JSON 不是合法 JSON：${error.message}`)
  }

  if (!Array.isArray(parsedQuestions)) {
    throw new Error('QUESTIONS_JSON 必须是数组')
  }

  const questions = parsedQuestions.map((question, index) =>
    normalizeQuizQuestion(question, index, meta),
  )
  const ids = new Set()
  questions.forEach((question) => {
    if (ids.has(question.id)) {
      throw new Error(`同一学习包内 question.id 重复：${question.id}`)
    }
    ids.add(question.id)
    if (!question.prompt) {
      throw new Error(`题目 ${question.id} 缺少 stem/prompt`)
    }
  })

  return {
    version: 'RAC_DAY_PACKAGE_V1',
    meta,
    contentMarkdown,
    sanitizedContentMarkdown: parseMarkdown(contentMarkdown, packId).contentWithoutQuestions,
    questions,
  }
}

export function getPackageQuestionPreview(questions, limit = 3) {
  return questions.slice(0, limit).map((question) => ({
    id: question.id,
    stem: question.prompt,
  }))
}
