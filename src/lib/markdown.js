const PIPE_RE = /[\uFF5C|]/
const HEADING_RE = /^##\s+(.+?)\s*$/
const ANY_HEADING_RE = /^#{1,3}\s+.+?\s*$/
const SECTION_HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/
const QUESTION_HEADING_RE = /^#{2,3}\s*Q(\d+)(?:\s*[\uFF5C|]\s*(.+?))?\s*$/i
const OPTION_RE = /^([A-D])[\.\u3001]\s*(.+?)\s*$/i
const ANSWER_RE = /^(?:Answer|\u7B54\u6848|\u6B63\u786E\u7B54\u6848)\s*[:\uFF1A]\s*([A-D])\s*$/i
const EXPLANATION_RE = /^(?:Explanation|\u89E3\u6790|\u89E3\u91CA)\s*[:\uFF1A]\s*(.*)$/i
const DAY_TITLE_RE = /^RAC\s+Day\s+(\d+(?:\.\d+)?)\s*[\uFF5C|]\s*(.+)$/i

function cleanLine(line = '') {
  return line.trim().replace(/\s{2,}$/, '')
}

function splitHeading(rawHeading, fallbackLabel) {
  const parts = rawHeading.split(PIPE_RE, 2).map((part) => part.trim())
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
  const optionStart = trimmed.search(/[A-D][\.\u3001]\s+/i)
  if (optionStart < 0) return [line]

  const prefix = trimmed.slice(0, optionStart).trim()
  const optionText = trimmed.slice(optionStart)
  const parts = optionText
    .split(/(?=\s*[A-D][\.\u3001]\s+)/i)
    .map((part) => part.trim())
    .filter(Boolean)
  return prefix ? [prefix, ...parts] : parts
}

function parseQuestionBlock(headingLine, contentLines, dayId) {
  const headingMatch = headingLine.match(QUESTION_HEADING_RE)
  if (!headingMatch) return null

  const number = Number(headingMatch[1])
  const title = headingMatch[2]?.trim() || '\u9ED8\u60F3\u9898'
  const lines = contentLines.flatMap(splitInlineOptions)
  const optionIndex = lines.findIndex((line) => OPTION_RE.test(line.trim()))
  if (optionIndex < 0) return null

  const options = {}
  let currentOption = ''
  let correctAnswer = ''
  let explanation = ''
  let explanationStarted = false

  for (const rawLine of lines.slice(optionIndex)) {
    const line = cleanLine(rawLine)
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
    id: `${dayId}-q${number}`,
    number,
    title,
    stem: lines.slice(0, optionIndex).map(cleanLine).filter(Boolean).join('\n').trim(),
    options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: options[key] })),
    answer: correctAnswer,
    explanation,
    userAnswer: undefined,
    isUnsure: false,
    wantsToAsk: false,
    isImportant: false,
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
      if (ANSWER_RE.test(line.trim()) || EXPLANATION_RE.test(line.trim())) continue
      contentLines.push(line)
      continue
    }

    const questionLines = []
    let cursor = index + 1

    while (cursor < lines.length) {
      const nextLine = lines[cursor]
      if (ANY_HEADING_RE.test(nextLine)) break
      questionLines.push(nextLine)
      cursor += 1
    }

    const question = parseQuestionBlock(line, questionLines, dayId)
    if (question) {
      questions.push(question)
    }
    index = cursor - 1
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
        collapsible: /^T\b/i.test(heading.label) || /\u672F\u8BED\u5361/.test(headingMatch[1]),
      }
    } else if (current) {
      current.content += `${line}\n`
    }
  }

  if (current) sections.push(current)
  const normalizedSections = sections
    .filter((section) => !QUESTION_HEADING_RE.test(`## ${section.heading}`))
    .map((section) => ({
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
