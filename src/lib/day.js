function makeId(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const OPTION_KEYS = ['A', 'B', 'C', 'D']

function timestamp(value) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

export function getQuestionNumber(question, fallback = 1) {
  if (Number(question.number)) return Number(question.number)
  const labelMatch = String(question.label || '').match(/\d+/)
  return labelMatch ? Number(labelMatch[0]) : fallback
}

export function getQuestionLabel(question, fallback = 1) {
  return `Q${getQuestionNumber(question, fallback)}`
}

export function getQuestionStem(question) {
  return question.stem ?? question.question ?? ''
}

export function getQuestionAnswer(question) {
  return question.answer ?? question.correctAnswer ?? 'A'
}

export function getQuestionOptions(question) {
  if (Array.isArray(question.options)) {
    const byKey = new Map(question.options.map((option) => [option.key, option.text || '']))
    return OPTION_KEYS.map((key) => ({ key, text: byKey.get(key) || '' }))
  }

  return OPTION_KEYS.map((key) => ({ key, text: question.options?.[key] || '' }))
}

export function updateQuestionOption(question, key, text) {
  return getQuestionOptions(question).map((option) =>
    option.key === key ? { ...option, text } : option,
  )
}

export function createEmptyQuestion(index = 1) {
  return {
    id: makeId('question'),
    number: index,
    title: '默想题',
    stem: '',
    options: OPTION_KEYS.map((key) => ({ key, text: '' })),
    answer: 'A',
    explanation: '',
    userAnswer: undefined,
    isUnsure: false,
    wantsToAsk: false,
    isImportant: false,
    showAnswer: false,
    note: '',
    source: 'manual',
  }
}

export function createEmptyDay(dayNumber = 1, now = new Date().toISOString()) {
  return {
    id: makeId('day'),
    dayNumber,
    title: '',
    packId: '',
    domain: '',
    tags: [],
    difficulty: '',
    contentMarkdown: '',
    completed: false,
    notes: '',
    freeNotes: '',
    quickDraft: '',
    reviewDraft: '',
    sections: [],
    questions: [],
    marks: [],
    sectionNotes: [],
    questionNotes: [],
    questionStates: {},
    quickNotes: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createQuickNote(
  text,
  tag = 'general',
  now = new Date().toISOString(),
  context = {},
) {
  const normalizedText = text.trim()
  return {
    id: makeId('quick-note'),
    text: normalizedText,
    content: normalizedText,
    dayId: context.dayId || '',
    packId: context.packId || '',
    sourceSection: context.sourceSection || '',
    sourceSectionId: context.sourceSectionId || '',
    sourceSectionTitle: context.sourceSectionTitle || context.sourceSection || '',
    scrollTop: Number.isFinite(Number(context.scrollTop)) ? Number(context.scrollTop) : undefined,
    tag: ['question', 'unsure', 'important', 'general'].includes(tag) ? tag : 'general',
    syncStatus: context.syncStatus || 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

export function appendQuickNoteToDay(
  day,
  text,
  tag = 'general',
  now = new Date().toISOString(),
  context = {},
) {
  const note = createQuickNote(text, tag, now, {
    dayId: day.id || '',
    packId: day.packId || '',
    ...context,
  })
  return {
    ...day,
    quickDraft: '',
    quickNotes: [
      ...(day.quickNotes || []),
      note,
    ],
  }
}

function noteText(note) {
  return String(note?.content ?? note?.text ?? '').trim()
}

export function getNotesForDay(day, notes = day.quickNotes || []) {
  return notes
    .filter((note) => noteText(note))
    .filter((note) => {
      const matchesDay = !note.dayId || note.dayId === day.id
      const matchesPack = !note.packId || !day.packId || note.packId === day.packId
      return matchesDay && matchesPack
    })
}

export function getQuickNoteCount(day) {
  return getNotesForDay(day).length
}

function normalizeQuickNote(note) {
  const content = noteText(note)
  return {
    ...note,
    text: note.text ?? content,
    content: note.content ?? content,
    syncStatus: note.syncStatus || 'pending',
  }
}

export function upsertQuickNote(quickNotes = [], nextNote) {
  const now = new Date().toISOString()
  const found = quickNotes.some((note) => note.id === nextNote.id)
  const updatedNotes = quickNotes.map((note) =>
    note.id === nextNote.id
      ? {
          ...note,
          text: nextNote.text ?? nextNote.content ?? note.text,
          content: nextNote.content ?? nextNote.text ?? note.content ?? note.text,
          tag: nextNote.tag ?? note.tag,
          dayId: nextNote.dayId ?? note.dayId,
          packId: nextNote.packId ?? note.packId,
          sourceSection: nextNote.sourceSection ?? note.sourceSection,
          sourceSectionId: nextNote.sourceSectionId ?? note.sourceSectionId,
          sourceSectionTitle: nextNote.sourceSectionTitle ?? note.sourceSectionTitle,
          scrollTop: nextNote.scrollTop ?? note.scrollTop,
          syncStatus: nextNote.syncStatus ?? note.syncStatus ?? 'pending',
          updatedAt: now,
        }
      : note,
  )

  if (found) return updatedNotes
  return [
    ...updatedNotes,
    {
      ...nextNote,
      text: nextNote.text ?? nextNote.content ?? '',
      content: nextNote.content ?? nextNote.text ?? '',
      syncStatus: nextNote.syncStatus || 'pending',
      createdAt: nextNote.createdAt || now,
      updatedAt: nextNote.updatedAt || now,
    },
  ]
}

export function mergeQuickNotes(localNotes = [], remoteNotes = []) {
  const merged = new Map()
  remoteNotes.map(normalizeQuickNote).forEach((note) => merged.set(note.id, note))
  localNotes.map(normalizeQuickNote).forEach((localNote) => {
    const remoteNote = merged.get(localNote.id)
    if (!remoteNote || timestamp(localNote.updatedAt) >= timestamp(remoteNote.updatedAt)) {
      merged.set(localNote.id, {
        ...remoteNote,
        ...localNote,
        syncStatus: localNote.syncStatus || remoteNote?.syncStatus || 'pending',
      })
      return
    }
    merged.set(localNote.id, {
      ...localNote,
      ...remoteNote,
      syncStatus: remoteNote.syncStatus || localNote.syncStatus || 'pending',
    })
  })
  return Array.from(merged.values())
}

export function selectQuestionAnswerPatch(answerKey) {
  return {
    userAnswer: answerKey,
    showAnswer: true,
  }
}

export function upsertSectionNote(sectionNotes = [], nextNote) {
  const now = new Date().toISOString()
  const index = sectionNotes.findIndex((note) => note.sectionId === nextNote.sectionId)
  if (index < 0) {
    return [
      ...sectionNotes,
      {
        id: makeId('section-note'),
        sectionId: nextNote.sectionId,
        sectionTitle: nextNote.sectionTitle || '',
        note: nextNote.note || '',
        createdAt: now,
        updatedAt: now,
      },
    ]
  }

  return sectionNotes.map((note, noteIndex) =>
    noteIndex === index
      ? {
          ...note,
          sectionTitle: nextNote.sectionTitle ?? note.sectionTitle,
          note: nextNote.note ?? note.note,
          updatedAt: now,
        }
      : note,
  )
}

export function upsertQuestionNote(questionNotes = [], nextNote) {
  const now = new Date().toISOString()
  const index = questionNotes.findIndex((note) => note.questionId === nextNote.questionId)
  if (index < 0) {
    return [
      ...questionNotes,
      {
        id: makeId('question-note'),
        questionId: nextNote.questionId,
        questionLabel: nextNote.questionLabel || '',
        note: nextNote.note || '',
        createdAt: now,
        updatedAt: now,
      },
    ]
  }

  return questionNotes.map((note, noteIndex) =>
    noteIndex === index
      ? {
          ...note,
          questionLabel: nextNote.questionLabel ?? note.questionLabel,
          note: nextNote.note ?? note.note,
          updatedAt: now,
        }
      : note,
  )
}

export function getDayStats(day) {
  const questions = day.questions || []
  const marks = day.marks || []
  const answeredQuestions = questions.filter((question) => question.userAnswer)

  return {
    answered: answeredQuestions.length,
    totalQuestions: questions.length,
    correct: answeredQuestions.filter(
      (question) => question.userAnswer === getQuestionAnswer(question),
    ).length,
    marks: {
      question: marks.filter((mark) => mark.markType === 'question').length,
      unsure: marks.filter((mark) => mark.markType === 'unsure').length,
      important: marks.filter((mark) => mark.markType === 'important').length,
      understood: marks.filter((mark) => mark.markType === 'understood').length,
    },
  }
}

export function getOverallStats(days) {
  const perDay = days.map(getDayStats)
  const answered = perDay.reduce((sum, stats) => sum + stats.answered, 0)
  const correct = perDay.reduce((sum, stats) => sum + stats.correct, 0)

  return {
    completedDays: days.filter((day) => day.completed).length,
    totalDays: days.length,
    answered,
    correct,
    accuracy: answered ? Math.round((correct / answered) * 100) : null,
  }
}

export function mergeParsedQuestions(existing = [], parsed = []) {
  const existingById = new Map(existing.map((question) => [question.id, question]))
  const existingByLabel = new Map(
    existing.map((question, index) => [getQuestionLabel(question, index + 1), question]),
  )
  const mergedParsed = parsed.map((question) => {
    const previous =
      existingById.get(question.id) ||
      existingByLabel.get(getQuestionLabel(question, question.number || 1))
    return previous
      ? {
          ...question,
          userAnswer: previous.userAnswer,
          isUnsure: previous.isUnsure,
          wantsToAsk: previous.wantsToAsk,
          isImportant: previous.isImportant,
          showAnswer: previous.showAnswer,
          title: question.title || previous.title,
          note: previous.note || question.note,
        }
      : question
  })
  const manualQuestions = existing.filter((question) => question.source === 'manual')
  return [...mergedParsed, ...manualQuestions]
}

export function upsertMark(marks, nextMark) {
  const index = marks.findIndex(
    (mark) =>
      mark.targetType === nextMark.targetType &&
      mark.targetId === nextMark.targetId &&
      mark.markType === nextMark.markType,
  )

  if (index < 0) return [...marks, { ...nextMark, id: makeId('mark') }]
  return marks.map((mark, markIndex) =>
    markIndex === index
      ? { ...mark, note: nextMark.note ?? mark.note, excerpt: nextMark.excerpt ?? mark.excerpt }
      : mark,
  )
}

export function removeMark(marks, targetType, targetId, markType) {
  return marks.filter(
    (mark) =>
      !(
        mark.targetType === targetType &&
        mark.targetId === targetId &&
        mark.markType === markType
      ),
  )
}
