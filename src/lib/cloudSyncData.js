import { mergeQuickNotes } from './day'

function timestamp(value) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

function mergeDays(localDay, remoteDay) {
  const localIsNewer = timestamp(localDay.updatedAt) >= timestamp(remoteDay.updatedAt)
  const baseDay = localIsNewer ? localDay : remoteDay
  return {
    ...baseDay,
    quickNotes: mergeQuickNotes(localDay.quickNotes || [], remoteDay.quickNotes || []),
    bookmarks: mergeById(
      localDay.bookmarks || [],
      remoteDay.bookmarks || [],
      (localBookmark, remoteBookmark) =>
        timestamp(localBookmark.updatedAt) >= timestamp(remoteBookmark.updatedAt)
          ? localBookmark
          : remoteBookmark,
    ),
  }
}

function mergeById(localItems = [], remoteItems = [], chooseItem) {
  const merged = new Map(remoteItems.map((item) => [item.id, item]))
  localItems.forEach((localItem) => {
    const remoteItem = merged.get(localItem.id)
    merged.set(localItem.id, remoteItem ? chooseItem(localItem, remoteItem) : localItem)
  })
  return Array.from(merged.values())
}

function mergeDeletedDays(localDeletedDays = [], remoteDeletedDays = []) {
  return mergeById(localDeletedDays, remoteDeletedDays, (localItem, remoteItem) =>
    timestamp(localItem.deletedAt) >= timestamp(remoteItem.deletedAt) ? localItem : remoteItem,
  )
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
  const deletedDays = mergeDeletedDays(localPayload.deletedDays, remotePayload.deletedDays)
  const deletedDayIds = new Set(deletedDays.map((item) => item.id))
  const days = mergeById(localPayload.days, remotePayload.days, mergeDays)
    .filter((day) => !deletedDayIds.has(day.id))
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
    deletedDays,
    quizQuestions,
    quizProgress: { attempts, starredQuestionIds },
  }
}
