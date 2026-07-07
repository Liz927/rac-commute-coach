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
const VALID_ANSWERS = ['A', 'B', 'C', 'D']

function markerRegex(name) {
  return new RegExp(`^\\s*-+\\s*${name}\\s*-+\\s*$`, 'gmi')
}

function v2MarkerRegex(name) {
  return new RegExp(`^\\s*${name}\\s*$`, 'gmi')
}

function isCodeFence(line = '') {
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

function parseKeyValueMeta(metaText) {
  return metaText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((meta, line) => {
      if (line.startsWith('{') || line.startsWith('}')) return meta
      const separatorIndex = line.indexOf(':')
      if (separatorIndex < 0) return meta
      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()
      return { ...meta, [key]: value }
    }, {})
}

function extractDayNumber(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : undefined
}

function parseMetaJsonObject(metaText) {
  const start = metaText.indexOf('{')
  const end = metaText.lastIndexOf('}')
  if (start < 0 || end <= start) return {}

  const jsonText = sanitizeJsonLikeText(metaText.slice(start, end + 1), { extract: 'object' }).text
  try {
    const parsed = JSON.parse(jsonText)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

function parseMeta(metaText) {
  const keyValueMeta = parseKeyValueMeta(metaText)
  const jsonMeta = parseMetaJsonObject(metaText)
  return {
    ...jsonMeta,
    ...keyValueMeta,
  }
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

function hasSmartJsonQuotes(raw = '') {
  return /[\u201C\u201D\u201E\u201F\uFF02\u2018\u2019]/.test(raw)
}

function stripMarkdownFence(raw = '') {
  const lines = String(raw || '').replace(/\r\n?/g, '\n').replace(/\uFEFF/g, '').trim().split('\n')
  if (isCodeFence(lines[0])) lines.shift()
  if (isCodeFence(lines.at(-1))) lines.pop()
  return lines.join('\n').trim()
}

function extractJsonContainer(raw, extract = 'array') {
  const text = stripMarkdownFence(raw)
  const startChar = extract === 'object' ? '{' : '['
  const endChar = extract === 'object' ? '}' : ']'
  const start = text.indexOf(startChar)
  const end = text.lastIndexOf(endChar)
  if (start >= 0 && end > start) return text.slice(start, end + 1).trim()
  return text.trim()
}

function nextNonWhitespace(text, index) {
  for (let cursor = index + 1; cursor < text.length; cursor += 1) {
    if (!/\s/.test(text[cursor])) return text[cursor]
  }
  return ''
}

function isQuoteLike(char) {
  return /["\u201C\u201D\u201E\u201F\uFF02\u2018\u2019]/.test(char)
}

function normalizeStructuralQuotes(raw) {
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]

    if (!inString) {
      if (isQuoteLike(char)) {
        output += '"'
        inString = true
      } else {
        output += char
      }
      continue
    }

    if (escaped) {
      output += char
      escaped = false
      continue
    }

    if (char === '\\') {
      output += char
      escaped = true
      continue
    }

    if (isQuoteLike(char)) {
      const next = nextNonWhitespace(raw, index)
      if (!next || [':', ',', '}', ']'].includes(next)) {
        output += '"'
        inString = false
      } else {
        output += char
      }
      continue
    }

    output += char
  }

  return output
}

function sanitizeJsonLikeText(raw = '', { extract = 'array' } = {}) {
  const withoutFence = extractJsonContainer(raw, extract)
  return {
    text: normalizeStructuralQuotes(withoutFence).trim(),
    hadSmartQuotes: hasSmartJsonQuotes(withoutFence),
    previewRaw: String(raw || '').slice(0, 500),
  }
}

export function normalizeJsonText(raw = '') {
  return sanitizeJsonLikeText(raw).text
}

export function sanitizeQuestionsJsonText(raw = '') {
  return sanitizeJsonLikeText(raw, { extract: 'array' })
}

function getLineColumn(text, position) {
  const before = text.slice(0, Math.max(0, position))
  const lines = before.split('\n')
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  }
}

function formatJsonParseError(error, jsonText) {
  const message = String(error?.message || '')
  const positionMatch = message.match(/position\s+(\d+)/i)
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  const position = positionMatch ? Number(positionMatch[1]) : 0
  const location = lineColumnMatch
    ? { line: Number(lineColumnMatch[1]), column: Number(lineColumnMatch[2]) }
    : getLineColumn(jsonText, position)
  const previewStart = Math.max(0, position - 24)
  const preview = jsonText
    .slice(previewStart, Math.min(jsonText.length, position + 25))
    .replace(/\n/g, '\\n')
  return `QUESTIONS_JSON 不是合法 JSON：${message}。错误位置：第 ${location.line} 行，第 ${location.column} 个字符。附近片段：${preview}`
}

function parseQuestionsJson(questionsRaw) {
  const sanitized = sanitizeQuestionsJsonText(questionsRaw)
  try {
    return {
      parsedQuestions: JSON.parse(sanitized.text),
      questionsJsonNormalized: sanitized.hadSmartQuotes || sanitized.text !== String(questionsRaw || '').trim(),
      normalizedQuestionsRaw: sanitized.text,
    }
  } catch (error) {
    throw new Error(formatJsonParseError(error, sanitized.text))
  }
}

function questionError(questionId, type, message) {
  return new Error(`${type}：题目 ${questionId} ${message}`)
}

function normalizeOptions(question, questionId) {
  const rawOptions =
    !Array.isArray(question.options) && question.options && typeof question.options === 'object'
      ? Object.entries(question.options).map(([key, text]) => ({ key, text }))
      : question.options

  if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
    throw questionError(questionId, 'options 格式错误', '至少需要两个选项')
  }

  return rawOptions.map((option, index) => {
    if (!option || typeof option !== 'object') {
      throw questionError(questionId, 'options 格式错误', `第 ${index + 1} 个选项不是对象`)
    }
    const id = String(option.id || option.key || '').trim().toUpperCase()
    if (!id) {
      throw questionError(questionId, '缺少字段', `第 ${index + 1} 个选项缺少 key/id`)
    }
    if (!String(option.text || '').trim()) {
      throw questionError(questionId, '缺少字段', `选项 ${id} 缺少 text`)
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
    throw questionError(questionId, '缺少字段', '缺少 answer')
  }

  normalized.forEach((answer) => {
    if (!VALID_ANSWERS.includes(answer)) {
      throw questionError(questionId, 'answer 非法', `answer ${answer} 不属于 A/B/C/D`)
    }
    if (!optionIds.has(answer)) {
      throw questionError(questionId, 'answer 非法', `answer ${answer} 不在 options 中`)
    }
  })

  return normalized
}

function validateQuestionShape(question, questionId) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw questionError(questionId, '题目格式错误', '必须是对象')
  }
  if (question.type && !['single_choice', 'single', 'multiple_choice', 'multiple'].includes(question.type)) {
    throw questionError(questionId, 'type 非法', `type ${question.type} 不支持`)
  }
  if (!String(question.prompt || question.stem || '').trim()) {
    throw questionError(questionId, '缺少字段', '缺少 stem')
  }
  if (!String(question.explanation || '').trim()) {
    throw questionError(questionId, '缺少字段', '缺少 explanation')
  }
}

function normalizeQuizQuestion(question, index, meta) {
  const id = String(question?.id || `${meta.packId}-q${String(index + 1).padStart(3, '0')}`).trim()
  validateQuestionShape(question, id)
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

function buildMeta(rawMeta) {
  const title = String(rawMeta.title || '').trim()
  if (!title) {
    throw new Error('学习包缺少 title，请检查 META_START 到 META_END 内容')
  }

  const day = extractDayNumber(rawMeta.day ?? rawMeta.dayNumber ?? rawMeta.dayId)
  const packId = String(rawMeta.packId || '').trim() || `rac-day-${day || slugify(title)}`

  return {
    day: Number.isFinite(day) ? day : undefined,
    title,
    packId,
    domain: String(rawMeta.domain || '').trim() || undefined,
    tags: normalizeTags(rawMeta.tags),
    difficulty: normalizeDifficulty(String(rawMeta.difficulty || '').trim()),
  }
}

function buildDebugPreview(metaRaw, contentMarkdown, questionsRaw, normalizedQuestionsRaw = '') {
  return [
    '查看解析片段：',
    `META 原文：\n${String(metaRaw || '').slice(0, 500)}`,
    `CONTENT 前 200 字符：\n${String(contentMarkdown || '').slice(0, 200)}`,
    `QUESTIONS_JSON 原文前 500 字符：\n${String(questionsRaw || '').slice(0, 500)}`,
    normalizedQuestionsRaw
      ? `QUESTIONS_JSON 清洗后前 500 字符：\n${String(normalizedQuestionsRaw).slice(0, 500)}`
      : '',
  ].filter(Boolean).join('\n\n')
}

function parsePackageBlocks({ version, metaRaw, contentMarkdown, questionsRaw }) {
  const rawMeta = parseMeta(metaRaw)
  const meta = buildMeta(rawMeta)

  let parsedQuestions
  let questionsJsonNormalized = false
  let normalizedQuestionsRaw = ''
  try {
    const parsed = parseQuestionsJson(questionsRaw)
    parsedQuestions = parsed.parsedQuestions
    questionsJsonNormalized = parsed.questionsJsonNormalized
    normalizedQuestionsRaw = parsed.normalizedQuestionsRaw
  } catch (error) {
    error.debugPreview = buildDebugPreview(metaRaw, contentMarkdown, questionsRaw)
    throw error
  }

  if (!Array.isArray(parsedQuestions)) {
    const error = new Error('QUESTIONS_JSON schema 错误：questions 必须是 Array')
    error.debugPreview = buildDebugPreview(metaRaw, contentMarkdown, questionsRaw, normalizedQuestionsRaw)
    throw error
  }

  let questions
  try {
    questions = parsedQuestions.map((question, index) =>
      normalizeQuizQuestion(question, index, meta),
    )
  } catch (error) {
    error.debugPreview = buildDebugPreview(metaRaw, contentMarkdown, questionsRaw, normalizedQuestionsRaw)
    throw error
  }

  const ids = new Set()
  questions.forEach((question) => {
    if (ids.has(question.id)) {
      const error = new Error(`同一学习包内 question.id 重复：${question.id}`)
      error.debugPreview = buildDebugPreview(metaRaw, contentMarkdown, questionsRaw, normalizedQuestionsRaw)
      throw error
    }
    ids.add(question.id)
  })

  return {
    version,
    meta,
    contentMarkdown,
    sanitizedContentMarkdown: parseMarkdown(contentMarkdown, meta.packId).contentWithoutQuestions,
    questions,
    questionsJsonNormalized,
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
  requireV2Marker(normalized, detectedMarkers, 'end', questionsEnd.index + questionsEnd.length)

  try {
    return parsePackageBlocks({
      version: 'RAC_DAY_PACKAGE_V2',
      metaRaw: normalized.slice(metaStart.index + metaStart.length, metaEnd.index).trim(),
      contentMarkdown: normalized.slice(contentStart.index + contentStart.length, contentEnd.index).trim(),
      questionsRaw: normalized.slice(questionsStart.index + questionsStart.length, questionsEnd.index).trim(),
    })
  } catch (error) {
    if (!error.debugPreview) {
      error.debugPreview = buildDebugPreview(
        normalized.slice(metaStart.index + metaStart.length, metaEnd.index).trim(),
        normalized.slice(contentStart.index + contentStart.length, contentEnd.index).trim(),
        normalized.slice(questionsStart.index + questionsStart.length, questionsEnd.index).trim(),
      )
    }
    throw error
  }
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
