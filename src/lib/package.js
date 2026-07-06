import { getNotesForDay, getQuestionAnswer, getQuestionLabel, getQuestionStem } from './day'

function noteText(note) {
  return note?.trim() || ''
}

function findSectionNote(day, sectionId) {
  return (day.sectionNotes || []).find((note) => note.sectionId === sectionId)
}

function findQuestionNote(day, questionId) {
  return (day.questionNotes || []).find((note) => note.questionId === questionId)
}

function getMarkNote(day, mark) {
  const inlineNote =
    mark.targetType === 'section'
      ? findSectionNote(day, mark.targetId)?.note
      : findQuestionNote(day, mark.targetId)?.note
  return noteText(mark.note) || noteText(inlineNote)
}

function formatMarks(day, marks, emptyText) {
  if (!marks.length) return emptyText

  return marks
    .map((mark, index) => {
      const note = getMarkNote(day, mark)
      const noteLine = note ? `\n   我的备注：${note}` : ''
      return `${index + 1}. ${mark.targetLabel}：${mark.excerpt || '未填写摘要'}${noteLine}`
    })
    .join('\n')
}

function questionLabel(day, question) {
  return `D${day.dayNumber}-${getQuestionLabel(question)}`
}

function sectionNoteLabel(day, note) {
  const idTail = note.sectionId?.split('-').filter(Boolean).pop()
  const label = idTail ? idTail.toUpperCase() : note.sectionTitle || 'SECTION'
  return `D${day.dayNumber}-${label}`
}

function quickNoteTagLabel(tag) {
  if (tag === 'question') return '【想问】 '
  if (tag === 'unsure') return '【不确定】 '
  if (tag === 'important') return '【重要】 '
  return ''
}

function quickNoteSourceLabel(note) {
  const source = note.sourceSectionTitle || note.sourceSection || ''
  return source ? `[${source}] ` : ''
}

export function buildQuestionPackage(day) {
  const flaggedQuestionMarks = (day.questions || [])
    .filter((question) => question.wantsToAsk)
    .map((question) => ({
      targetLabel: questionLabel(day, question),
      targetType: 'question',
      targetId: question.id,
      excerpt: getQuestionStem(question),
      note: findQuestionNote(day, question.id)?.note || question.note || '',
    }))
  const questionMarks = [
    ...(day.marks || []).filter((mark) => mark.markType === 'question'),
    ...flaggedQuestionMarks,
  ]
  const markedUnsure = (day.marks || []).filter((mark) => mark.markType === 'unsure')
  const unsureQuestionMarks = (day.questions || [])
    .filter((question) => question.isUnsure)
    .map((question) => ({
      targetLabel: questionLabel(day, question),
      targetType: 'question',
      targetId: question.id,
      excerpt: getQuestionStem(question),
      note: findQuestionNote(day, question.id)?.note || question.note || '',
    }))
  const unsureMarks = [...markedUnsure, ...unsureQuestionMarks]
  const importantQuestionMarks = (day.questions || [])
    .filter((question) => question.isImportant)
    .map((question) => ({
      targetLabel: questionLabel(day, question),
      targetType: 'question',
      targetId: question.id,
      excerpt: getQuestionStem(question),
      note: findQuestionNote(day, question.id)?.note || question.note || '',
    }))
  const importantMarks = [
    ...(day.marks || []).filter((mark) => mark.markType === 'important'),
    ...importantQuestionMarks,
  ]
  const wrongQuestions = (day.questions || []).filter(
    (question) =>
      question.userAnswer && getQuestionAnswer(question) && question.userAnswer !== getQuestionAnswer(question),
  )
  const wrongText = wrongQuestions.length
    ? wrongQuestions
        .map((question, index) => {
          const questionNote = noteText(findQuestionNote(day, question.id)?.note || question.note)
          const noteLine = questionNote ? `\n   我的备注：${questionNote}` : ''
          return `${index + 1}. ${getQuestionLabel(question)}\n   题目：${getQuestionStem(question)}\n   我的答案：${question.userAnswer}\n   正确答案：${getQuestionAnswer(question)}\n   解释：${question.explanation || '暂无解释'}${noteLine}`
        })
        .join('\n')
    : '无'
  const assignedMarkTypes = new Set(['question', 'unsure', 'important'])
  const assignedTargets = new Set(
    (day.marks || [])
      .filter((mark) => assignedMarkTypes.has(mark.markType))
      .map((mark) => `${mark.targetType}:${mark.targetId}`),
  )
  const wrongQuestionIds = new Set(wrongQuestions.map((question) => question.id))
  const freeNoteLines = [
    ...getNotesForDay(day)
      .map((note) =>
        `[quickNote] ${quickNoteTagLabel(note.tag)}${quickNoteSourceLabel(note)}${noteText(note.content || note.text)}`,
      ),
    noteText(day.freeNotes),
    noteText(day.notes),
    ...(day.sectionNotes || [])
      .filter((note) => noteText(note.note))
      .filter((note) => !assignedTargets.has(`section:${note.sectionId}`))
      .map((note) => `${sectionNoteLabel(day, note)}：${note.sectionTitle || note.sectionId}\n   我的备注：${note.note.trim()}`),
    ...(day.questionNotes || [])
      .filter((note) => noteText(note.note))
      .filter((note) => !assignedTargets.has(`question:${note.questionId}`))
      .filter((note) => !wrongQuestionIds.has(note.questionId))
      .map((note) => `D${day.dayNumber}-${note.questionLabel || note.questionId}：${note.note.trim()}`),
  ].filter(Boolean)

  return `RAC Day ${day.dayNumber} 回收问题：

今日学习主题：${day.title || '未命名主题'}

一、我标记为【想问】的内容

${formatMarks(day, questionMarks, '无')}

二、我标记为【不确定】的内容

${formatMarks(day, unsureMarks, '无')}

三、我答错的题

${wrongText}

四、我边阅读边记录的自由备注

${freeNoteLines.length ? freeNoteLines.map((line, index) => `${index + 1}. ${line}`).join('\n') : '无'}

五、我标记为【重要】的内容

${formatMarks(day, importantMarks, '无')}`
}
