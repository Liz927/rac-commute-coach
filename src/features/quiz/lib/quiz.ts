import type { DomainStat, Question, QuestionPack, QuizAttempt, QuizFilters } from '../types'

export const EMPTY_FILTERS: QuizFilters = {
  packId: 'all',
  domain: 'all',
  difficulty: 'all',
  tag: 'all',
}

function sortedUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function sameOptionSet(left: string[], right: string[]) {
  const leftSorted = [...left].sort()
  const rightSorted = [...right].sort()
  return (
    leftSorted.length === rightSorted.length &&
    leftSorted.every((value, index) => value === rightSorted[index])
  )
}

export function evaluateAnswer(question: Question, selectedOptionIds: string[]) {
  const normalizedSelection = sortedUnique(selectedOptionIds)
  const correctOptionIds = sortedUnique(question.correctOptionIds)

  return {
    questionId: question.id,
    selectedOptionIds: normalizedSelection,
    correctOptionIds,
    isCorrect: sameOptionSet(normalizedSelection, correctOptionIds),
  }
}

export function shouldAutoSubmitAnswer(question: Question) {
  return question.type === 'single'
}

export function formatCorrectAnswer(question: Question) {
  const correctIds = new Set(question.correctOptionIds)
  return question.options
    .filter((option) => correctIds.has(option.id))
    .map((option) => `${option.id}. ${option.text}`)
    .join('; ')
}

export function getLatestAttempts(attempts: QuizAttempt[]) {
  const latestByQuestion = new Map<string, QuizAttempt>()
  attempts.forEach((attempt) => {
    const current = latestByQuestion.get(attempt.questionId)
    if (!current || attempt.answeredAt >= current.answeredAt) {
      latestByQuestion.set(attempt.questionId, attempt)
    }
  })
  return latestByQuestion
}

export function getWrongQuestionIds(attempts: QuizAttempt[]) {
  return Array.from(getLatestAttempts(attempts).values())
    .filter((attempt) => !attempt.isCorrect)
    .map((attempt) => attempt.questionId)
    .sort((a, b) => a.localeCompare(b))
}

export function buildStats(questions: Question[], attempts: QuizAttempt[]) {
  const totalAnswered = attempts.length
  const totalCorrect = attempts.filter((attempt) => attempt.isCorrect).length
  const latestAttempts = getLatestAttempts(attempts)
  const domainStats = new Map<string, { answered: number; correct: number }>()

  questions.forEach((question) => {
    const attempt = latestAttempts.get(question.id)
    if (!attempt) return
    const current = domainStats.get(question.domain) || { answered: 0, correct: 0 }
    current.answered += 1
    if (attempt.isCorrect) current.correct += 1
    domainStats.set(question.domain, current)
  })

  const byDomain: DomainStat[] = Array.from(domainStats.entries())
    .map(([domain, value]) => ({
      domain,
      answered: value.answered,
      correct: value.correct,
      accuracy: value.answered ? Math.round((value.correct / value.answered) * 100) : 0,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain))

  return {
    totalAnswered,
    correctRate: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    wrongCount: getWrongQuestionIds(attempts).length,
    byDomain,
  }
}

export function getAvailableFilters(questions: Question[]) {
  return {
    packIds: sortedUnique(questions.map((question) => question.packId || '')),
    domains: sortedUnique(questions.map((question) => question.domain)),
    difficulties: sortedUnique(questions.map((question) => question.difficulty)),
    tags: sortedUnique(questions.flatMap((question) => question.tags)),
  }
}

export function filterQuestions(questions: Question[], filters: QuizFilters) {
  return questions.filter((question) => {
    const matchesPack = filters.packId === 'all' || question.packId === filters.packId
    const matchesDomain = filters.domain === 'all' || question.domain === filters.domain
    const matchesDifficulty =
      filters.difficulty === 'all' || question.difficulty === filters.difficulty
    const matchesTag = filters.tag === 'all' || question.tags.includes(filters.tag)

    return matchesPack && matchesDomain && matchesDifficulty && matchesTag
  })
}

export function validateQuestionPack(pack: QuestionPack) {
  const errors: string[] = []
  const ids = new Set<string>()

  if (!pack.packId) errors.push('Question pack is missing packId.')
  if (!pack.title) errors.push('Question pack is missing title.')
  if (!Array.isArray(pack.questions)) {
    return [...errors, 'Question pack is missing questions.']
  }

  pack.questions.forEach((question) => {
    if (ids.has(question.id)) errors.push(`Duplicate question id: ${question.id}`)
    ids.add(question.id)

    if (!question.domain) errors.push(`Question ${question.id} is missing domain.`)
    if (!question.prompt) errors.push(`Question ${question.id} is missing prompt.`)
    if (!question.explanation) errors.push(`Question ${question.id} is missing explanation.`)
    if (!Array.isArray(question.tags) || question.tags.length === 0) {
      errors.push(`Question ${question.id} needs at least one tag.`)
    }
    if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
      errors.push(`Question ${question.id} has an invalid difficulty.`)
    }
    if (!['single', 'multiple'].includes(question.type)) {
      errors.push(`Question ${question.id} has an invalid type.`)
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`Question ${question.id} needs at least two options.`)
    }

    const optionIds = new Set((question.options || []).map((option) => option.id))
    question.correctOptionIds.forEach((optionId) => {
      if (!optionIds.has(optionId)) {
        errors.push(`Question ${question.id} answer ${optionId} is not an option.`)
      }
    })

    if (question.type === 'single' && question.correctOptionIds.length !== 1) {
      errors.push(`Question ${question.id} is single-choice but does not have exactly one answer.`)
    }
    if (question.type === 'multiple' && question.correctOptionIds.length < 2) {
      errors.push(`Question ${question.id} is multiple-choice but has fewer than two correct answers.`)
    }
  })

  return errors
}
