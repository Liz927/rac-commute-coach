function questionNumber(question, fallback) {
  if (Number(question.number)) return Number(question.number)
  const match = String(question.id || '').match(/q0*(\d+)/i)
  return match ? Number(match[1]) : fallback
}

export function getLinkedDayQuestions(day, allQuizQuestions = []) {
  if (!day.packId) return day.questions || []

  const states = day.questionStates || {}
  return allQuizQuestions
    .filter((question) => question.packId === day.packId)
    .sort((left, right) => questionNumber(left, 0) - questionNumber(right, 0))
    .map((question, index) => {
      const state = states[question.id] || {}
      return {
        id: question.id,
        number: questionNumber(question, index + 1),
        title: '默想题',
        stem: question.prompt || '',
        options: (question.options || []).map((option) => ({
          key: option.key || option.id,
          text: option.text || '',
        })),
        answer: question.answer || question.correctOptionIds?.[0] || 'A',
        explanation: question.explanation || '',
        ...state,
        showAnswer: state.showAnswer ?? Boolean(state.userAnswer),
      }
    })
}

export function getDayQuizAction(day, allQuizQuestions = []) {
  if (!day.packId) {
    return { enabled: false, questionCount: 0, reason: 'missing-pack' }
  }

  const questionCount = allQuizQuestions.filter((question) => question.packId === day.packId).length
  return {
    enabled: questionCount > 0,
    questionCount,
    reason: questionCount ? '' : 'no-questions',
  }
}
