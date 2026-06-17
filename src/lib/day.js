function makeId(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyQuestion(index = 1) {
  return {
    id: makeId('question'),
    label: `Q${index}`,
    title: '默想题',
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A',
    explanation: '',
    userAnswer: undefined,
    isUnsure: false,
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
    contentMarkdown: '',
    completed: false,
    notes: '',
    freeNotes: '',
    reviewDraft: '',
    sections: [],
    questions: [],
    marks: [],
    sectionNotes: [],
    questionNotes: [],
    createdAt: now,
    updatedAt: now,
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
      (question) => question.userAnswer === question.correctAnswer,
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
  const existingByLabel = new Map(existing.map((question) => [question.label, question]))
  const mergedParsed = parsed.map((question) => {
    const previous = existingById.get(question.id) || existingByLabel.get(question.label)
    return previous
      ? {
          ...question,
          userAnswer: previous.userAnswer,
          isUnsure: previous.isUnsure,
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
