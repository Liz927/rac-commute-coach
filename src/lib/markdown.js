const HEADING_RE = /^##\s+(.+?)\s*$/
const OPTION_RE = /^([A-D])[.、)]\s*(.+?)\s*$/
const ANSWER_RE = /^Answer\s*:\s*([A-D])\s*$/i
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

function parseQuestion(section, dayId) {
  if (!/^Q\d+$/i.test(section.label)) return null

  const lines = section.content.split('\n')
  const optionIndex = lines.findIndex((line) => OPTION_RE.test(line.trim()))
  if (optionIndex < 0) return null

  const options = {}
  let correctAnswer = ''
  let explanation = ''
  let explanationStarted = false

  for (const rawLine of lines.slice(optionIndex)) {
    const line = rawLine.trim()
    const optionMatch = line.match(OPTION_RE)
    const answerMatch = line.match(ANSWER_RE)
    const explanationMatch = line.match(EXPLANATION_RE)

    if (optionMatch) {
      options[optionMatch[1]] = optionMatch[2]
      explanationStarted = false
    } else if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase()
      explanationStarted = false
    } else if (explanationMatch) {
      explanation = explanationMatch[1]
      explanationStarted = true
    } else if (explanationStarted && line) {
      explanation = `${explanation}\n${line}`.trim()
    }
  }

  if (!['A', 'B', 'C', 'D'].every((key) => options[key])) return null

  return {
    id: `${dayId}-${section.label.toLowerCase()}`,
    label: section.label.toUpperCase(),
    question: lines.slice(0, optionIndex).join('\n').trim(),
    options,
    correctAnswer,
    explanation,
    userAnswer: undefined,
    isUnsure: false,
    showAnswer: false,
    source: 'parsed',
  }
}

export function parseMarkdown(markdown = '', dayId = 'day') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const titleLine = lines.find((line) => /^#\s+/.test(line))
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : ''
  const titleMetadata = parseDayTitle(title)
  const sections = []
  let current = null

  for (const line of lines) {
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
    sections: normalizedSections,
    questions: normalizedSections
      .map((section) => parseQuestion(section, dayId))
      .filter(Boolean),
  }
}
