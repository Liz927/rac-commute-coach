function timestamp(value) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

function mergeById(localItems = [], remoteItems = [], chooseItem) {
  const merged = new Map(remoteItems.map((item) => [item.id, item]))
  localItems.forEach((localItem) => {
    const remoteItem = merged.get(localItem.id)
    merged.set(localItem.id, remoteItem ? chooseItem(localItem, remoteItem) : localItem)
  })
  return Array.from(merged.values())
}

function attemptKey(attempt) {
  return [
    attempt.questionId,
    Array.isArray(attempt.selectedOptionIds) ? attempt.selectedOptionIds.join(',') : '',
    attempt.isCorrect ? 'correct' : 'incorrect',
    attempt.answeredAt,
  ].join('|')
}

export function toFirestoreSafe(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => toFirestoreSafe(item))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toFirestoreSafe(item)]),
    )
  }
  return value
}

export function mergeSyncPayloads(localPayload = {}, remotePayload = {}) {
  const days = mergeById(localPayload.days, remotePayload.days, (localDay, remoteDay) =>
    timestamp(localDay.updatedAt) >= timestamp(remoteDay.updatedAt) ? localDay : remoteDay,
  )
  const quizQuestions = mergeById(
    localPayload.quizQuestions,
    remotePayload.quizQuestions,
    (localQuestion) => localQuestion,
  )
  const allAttempts = [
    ...(remotePayload.quizProgress?.attempts || []),
    ...(localPayload.quizProgress?.attempts || []),
  ]
  const attempts = Array.from(
    new Map(allAttempts.map((attempt) => [attemptKey(attempt), attempt])).values(),
  )
  const starredQuestionIds = Array.from(new Set([
    ...(remotePayload.quizProgress?.starredQuestionIds || []),
    ...(localPayload.quizProgress?.starredQuestionIds || []),
  ]))

  return {
    version: 1,
    days,
    quizQuestions,
    quizProgress: { attempts, starredQuestionIds },
  }
}
