import { parseMarkdown } from './markdown'

const V1_MARKERS = {
  version: 'RAC_DAY_PACKAGE_V1',
  content: 'CONTENT',
  questions: 'QUESTIONS_JSON',
  end: 'END',
}
const V2_MARKERS = {
  start: 'RAC_DAY_PACKAGE_V2_START',
  metaStart: 'META_START',
  metaEnd: 'META_END',
  contentStart: 'CONTENT_START',
  contentEnd: 'CONTENT_END',
  questionsStart: 'QUESTIONS_JSON_START',
  questionsEnd: 'QUESTIONS_JSON_END',
  end: 'RAC_DAY_PACKAGE_V2_END',
}
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']

function markerRegex(name) {
  return new RegExp(`^\\s*-+\\s*${name}\\s*-+\\s*$`, 'gmi')
}

function v2MarkerRegex(name) {
  return new RegExp(`^\\s*${name}\\s*$`, 'gmi')
}

function isCodeFence(line) {
  return /^\s*```[^\n]*$/.test(line)
}

function canonicalizeMarkerLine(line) {
  const match = line.match(
    /^\s*-+\s*(RAC_DAY_PACKAGE_V1|CONTENT|QUESTIONS_JSON|END)\s*-+\s*$/i,
  )
  return match ? `---${match[1].toUpperCase()}---` : line
}

export function normalizePackageText(rawText = '') {
  const normalized = String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2013\u2014\u2015\uFF0D]/g, '-')
    .trim()

  const lines = normalized.split('\n')
  if (isCodeFence(lines[0])) lines.shift()
  if (isCodeFence(lines.at(-1))) lines.pop()

  return lines.map(canonicalizeMarkerLine).join('\n').trim()
}

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

function findMarker(rawText, name, fromIndex = 0) {
  const regex = markerRegex(name)
  regex.lastIndex = fromIndex
  const match = regex.exec(rawText)
  return match ? { index: match.index, length: match[0].length } : null
}

function findV2Marker(rawText, name, fromIndex = 0) {
  const regex = v2MarkerRegex(name)
  regex.lastIndex = fromIndex
  const match = regex.exec(rawText)
  return match ? { index: match.index, length: match[0].length } : null
}

function findAllMarkers(rawText, markers, findMarkerByName) {
  return Object.fromEntries(
    Object.entries(markers).map(([key, name]) => [key, findMarkerByName(rawText, name)]),
  )
}

function missingMarkerError(name, markers, markerNames, normalized) {
  const detected = Object.entries(markers)
    .filter(([, marker]) => marker)
    .map(([key]) => markerNames[key])
  const preview = normalized.slice(0, 100).replace(/\n/g, '\\n') || '（空）'
  const found = detected.length ? detected.join('/') : '无'
  return new Error(
    `未找到 ${name}。已检测到 ${found}。文本开头预览：“${preview}”。请确认是否复制完整。`,
  )
}

function logPackageParseFailure(normalized, markers) {
  if (!import.meta.env.DEV) return
  console.log('[Package Import] normalized prefix:', normalized.slice(0, 300))
  console.log('[Package Import] markers:', Object.fromEntries(
    Object.entries(markers).map(([key, marker]) => [key, Boolean(marker)]),
  ))
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
  const questionTags = normalizeTags(question.tags)
  const tags = questionTags.length ? questionTags : meta.tags

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

function parsePackageBlocks({ version, metaRaw, contentMarkdown, questionsRaw }) {
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
    version,
    meta,
    contentMarkdown,
    sanitizedContentMarkdown: parseMarkdown(contentMarkdown, packId).contentWithoutQuestions,
    questions,
  }
}

function parseV1Package(normalized, detectedMarkers) {
  const start = detectedMarkers.version
  if (!start) {
    throw missingMarkerError(V1_MARKERS.version, detectedMarkers, V1_MARKERS, normalized)
  }

  const content = findMarker(normalized, V1_MARKERS.content, start.index + start.length)
  if (!content) {
    throw missingMarkerError(V1_MARKERS.content, detectedMarkers, V1_MARKERS, normalized)
  }

  const questionsMarker = findMarker(
    normalized,
    V1_MARKERS.questions,
    content.index + content.length,
  )
  if (!questionsMarker) {
    throw missingMarkerError(V1_MARKERS.questions, detectedMarkers, V1_MARKERS, normalized)
  }

  const end = findMarker(normalized, V1_MARKERS.end, questionsMarker.index + questionsMarker.length)
  if (!end) {
    throw missingMarkerError(V1_MARKERS.end, detectedMarkers, V1_MARKERS, normalized)
  }

  return parsePackageBlocks({
    version: 'RAC_DAY_PACKAGE_V1',
    metaRaw: normalized.slice(start.index + start.length, content.index).trim(),
    contentMarkdown: normalized.slice(content.index + content.length, questionsMarker.index).trim(),
    questionsRaw: normalized.slice(questionsMarker.index + questionsMarker.length, end.index).trim(),
  })
}

function requireV2Marker(normalized, detectedMarkers, key, fromIndex = 0) {
  const marker = findV2Marker(normalized, V2_MARKERS[key], fromIndex)
  if (!marker) {
    throw missingMarkerError(V2_MARKERS[key], detectedMarkers, V2_MARKERS, normalized)
  }
  return marker
}

function parseV2Package(normalized, detectedMarkers) {
  const start = detectedMarkers.start
  if (!start) {
    throw missingMarkerError(V2_MARKERS.start, detectedMarkers, V2_MARKERS, normalized)
  }

  const metaStart = requireV2Marker(normalized, detectedMarkers, 'metaStart', start.index + start.length)
  const metaEnd = requireV2Marker(normalized, detectedMarkers, 'metaEnd', metaStart.index + metaStart.length)
  const contentStart = requireV2Marker(normalized, detectedMarkers, 'contentStart', metaEnd.index + metaEnd.length)
  const contentEnd = requireV2Marker(normalized, detectedMarkers, 'contentEnd', contentStart.index + contentStart.length)
  const questionsStart = requireV2Marker(normalized, detectedMarkers, 'questionsStart', contentEnd.index + contentEnd.length)
  const questionsEnd = requireV2Marker(normalized, detectedMarkers, 'questionsEnd', questionsStart.index + questionsStart.length)
  const end = requireV2Marker(normalized, detectedMarkers, 'end', questionsEnd.index + questionsEnd.length)

  return parsePackageBlocks({
    version: 'RAC_DAY_PACKAGE_V2',
    metaRaw: normalized.slice(metaStart.index + metaStart.length, metaEnd.index).trim(),
    contentMarkdown: normalized.slice(contentStart.index + contentStart.length, contentEnd.index).trim(),
    questionsRaw: normalized.slice(questionsStart.index + questionsStart.length, questionsEnd.index).trim(),
  })
}

export function parseLearningPackage(rawText = '') {
  const normalized = normalizePackageText(rawText)
  const v2Markers = findAllMarkers(normalized, V2_MARKERS, findV2Marker)
  const v1Markers = findAllMarkers(normalized, V1_MARKERS, findMarker)
  const shouldParseV2 = Object.values(v2Markers).some(Boolean)
  const selectedMarkers = shouldParseV2 ? v2Markers : v1Markers

  try {
    return shouldParseV2
      ? parseV2Package(normalized, v2Markers)
      : parseV1Package(normalized, v1Markers)
  } catch (error) {
    logPackageParseFailure(normalized, selectedMarkers)
    throw error
  }
}

export function getPackageQuestionPreview(questions, limit = 3) {
  return questions.slice(0, limit).map((question) => ({
    id: question.id,
    stem: question.prompt,
  }))
}
