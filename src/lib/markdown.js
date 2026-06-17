const HEADING_RE = /^##\s+(.+?)\s*$/
const ANY_HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/
const QUESTION_HEADING_RE = /^(#{2,3})\s+(Q\d+)(?:\s*[｜|]\s*(.+?))?\s*$/i
const OPTION_RE = /^([A-D])[.、)]\s*(.+?)\s*$/
const ANSWER_RE = /^Answer\s*:\s*([A-D])\b.*$/i
const EXPLANATION_RE = /^Explanation\s*:\s*(.*)$/i
const DAY_TITLE_RE = /^RAC\s+Day\s+(\d+(?:\.\d+)?)\s*[｜|]\s*(.+)$/i

function splitHeading(rawHeading, fallbackLabel) {
  const parts = rawHeading.split(/[｜|]/, 2).map((part) => part.trim())
  if (parts.length === 2) {
    return { label: parts[0], title: parts[1] }
  }

  return { label: fallbackLabel, title: parts[0] }
}

export function parseDayTitle(title = '') {
  const match = title.trim().match(DAY_TITLE_RE)
  if (!match) {
    return { dayNumber: undefined, topicTitle: title.trim() }
  }

  return {
    dayNumber: Number(match[1]),
    topicTitle: match[2].trim(),
  }
}

function splitInlineOptions(line) {
  const trimmed = line.trim()
  if (!OPTION_RE.test(trimmed)) return [line]
  return trimmed
    .split(/(?=\s+[A-D][.、)]\s+)/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseQuestionBlock(headingLine, contentLines, dayId) {
  const headingMatch = headingLine.match(QUESTION_HEADING_RE)
  if (!headingMatch) return null

  const label = headingMatch[2].toUpperCase()
  const title = headingMatch[3]?.trim() || '默想题'
  const lines = contentLines.flatMap(splitInlineOptions)
  const optionIndex = lines.findIndex((line) => OPTION_RE.test(line.trim()))
  if (optionIndex < 0) return null

  const options = {}
  let currentOption = ''
  let correctAnswer = ''
  let explanation = ''
  let explanationStarted = false

  for (const rawLine of lines.slice(optionIndex)) {
    const line = rawLine.trim()
    const optionMatch = line.match(OPTION_RE)
    const answerMatch = line.match(ANSWER_RE)
    const explanationMatch = line.match(EXPLANATION_RE)

    if (optionMatch) {
      currentOption = optionMatch[1].toUpperCase()
      options[currentOption] = optionMatch[2].trim()
      explanationStarted = false
    } else if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase()
      currentOption = ''
      explanationStarted = false
    } else if (explanationMatch) {
      explanation = explanationMatch[1].trim()
      currentOption = ''
      explanationStarted = true
    } else if (explanationStarted && line) {
      explanation = `${explanation}\n${line}`.trim()
    } else if (currentOption && line) {
      options[currentOption] = `${options[currentOption]} ${line}`.trim()
    }
  }

  if (!['A', 'B', 'C', 'D'].every((key) => options[key])) return null

  return {
    id: `${dayId}-${label.toLowerCase()}`,
    label,
    title,
    question: lines.slice(0, optionIndex).join('\n').trim(),
    options,
    correctAnswer,
    explanation,
    userAnswer: undefined,
    isUnsure: false,
    showAnswer: false,
    note: '',
    source: 'parsed',
  }
}

export function parseMarkdownToSectionsAndQuestions(markdown = '', dayId = 'day') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const titleLine = lines.find((line) => /^#\s+/.test(line))
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : ''
  const titleMetadata = parseDayTitle(title)
  const contentLines = []
  const questions = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const questionHeading = line.match(QUESTION_HEADING_RE)

    if (!questionHeading) {
      contentLines.push(line)
      continue
    }

    const level = questionHeading[1].length
    const questionLines = []
    let cursor = index + 1

    while (cursor < lines.length) {
      const nextLine = lines[cursor]
      const nextQuestionHeading = nextLine.match(QUESTION_HEADING_RE)
      const nextHeading = nextLine.match(ANY_HEADING_RE)
      const endsCurrentQuestion =
        Boolean(nextQuestionHeading) ||
        (Boolean(nextHeading) && nextHeading[1].length <= level)

      if (endsCurrentQuestion) break
      questionLines.push(nextLine)
      cursor += 1
    }

    const question = parseQuestionBlock(line, questionLines, dayId)
    if (question) {
      questions.push(question)
      index = cursor - 1
    } else {
      contentLines.push(line, ...questionLines)
      index = cursor - 1
    }
  }

  const contentWithoutQuestions = contentLines.join('\n').trim()
  const sections = []
  let current = null

  for (const line of contentWithoutQuestions.split('\n')) {
    const headingMatch = line.match(HEADING_RE)
    if (headingMatch) {
      if (current) sections.push(current)
      const heading = splitHeading(headingMatch[1], `S${sections.length + 1}`)
      current = {
        id: `${dayId}-${heading.label.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')}`,
        label: heading.label,
        title: heading.title,
        heading: headingMatch[1].trim(),
        content: '',
        collapsible: /术语卡/.test(headingMatch[1]),
      }
    } else if (current) {
      current.content += `${line}\n`
    }
  }

  if (current) sections.push(current)
  const normalizedSections = sections.map((section) => ({
    ...section,
    content: section.content.trim(),
  }))

  return {
    title,
    dayNumber: titleMetadata.dayNumber,
    topicTitle: titleMetadata.topicTitle,
    contentWithoutQuestions,
    sections: normalizedSections,
    questions,
  }
}

export function parseMarkdown(markdown = '', dayId = 'day') {
  return parseMarkdownToSectionsAndQuestions(markdown, dayId)
}
