import { useEffect, useMemo, useState } from 'react'
import questionPackJson from '../data/questions.json'
import type { Question, QuestionPack, QuizFilters, QuizProgress } from '../types'
import {
  EMPTY_FILTERS,
  buildStats,
  evaluateAnswer,
  filterQuestions,
  getAvailableFilters,
  getWrongQuestionIds,
  validateQuestionPack,
} from '../lib/quiz'
import {
  loadImportedQuestions,
  loadQuizProgress,
  saveQuizProgress,
} from '../lib/storage'

const questionPack = questionPackJson as QuestionPack
const bundledQuestions = questionPack.questions as Question[]

function mergeQuestionSources(bundled: Question[], imported: Question[]) {
  const byId = new Map<string, Question>()
  bundled.forEach((question) => byId.set(question.id, question))
  imported.forEach((question) => byId.set(question.id, question))
  return Array.from(byId.values())
}

export function useQuizStore() {
  const [progress, setProgress] = useState<QuizProgress>(() => loadQuizProgress())
  const [importedQuestions] = useState<Question[]>(() => loadImportedQuestions())
  const [filters, setFilters] = useState<QuizFilters>(EMPTY_FILTERS)

  useEffect(() => {
    saveQuizProgress(progress)
  }, [progress])

  const questions = useMemo(
    () => mergeQuestionSources(bundledQuestions, importedQuestions),
    [importedQuestions],
  )
  const activeQuestionPack = useMemo(
    () => ({
      ...questionPack,
      title: importedQuestions.length
        ? 'RAC Device Quiz Bank'
        : questionPack.title,
      isPlaceholder: !importedQuestions.length && questionPack.isPlaceholder,
      questions,
    }),
    [importedQuestions.length, questions],
  )
  const validationErrors = useMemo(() => validateQuestionPack(activeQuestionPack), [activeQuestionPack])
  const filteredQuestions = useMemo(() => filterQuestions(questions, filters), [filters, questions])
  const availableFilters = useMemo(() => getAvailableFilters(questions), [questions])
  const stats = useMemo(() => buildStats(questions, progress.attempts), [progress.attempts, questions])

  const wrongQuestionIds = useMemo(
    () => new Set(getWrongQuestionIds(progress.attempts)),
    [progress.attempts],
  )
  const starredQuestionIds = useMemo(
    () => new Set(progress.starredQuestionIds),
    [progress.starredQuestionIds],
  )

  function answerQuestion(question: Question, selectedOptionIds: string[]) {
    const result = evaluateAnswer(question, selectedOptionIds)
    setProgress((current) => ({
      ...current,
      attempts: [
        ...current.attempts,
        {
          questionId: question.id,
          selectedOptionIds: result.selectedOptionIds,
          isCorrect: result.isCorrect,
          answeredAt: new Date().toISOString(),
        },
      ],
    }))
    return result
  }

  function toggleStar(questionId: string) {
    setProgress((current) => {
      const nextStarred = new Set(current.starredQuestionIds)
      if (nextStarred.has(questionId)) nextStarred.delete(questionId)
      else nextStarred.add(questionId)
      return {
        ...current,
        starredQuestionIds: Array.from(nextStarred),
      }
    })
  }

  function resetQuizProgress() {
    setProgress({ attempts: [], starredQuestionIds: [] })
  }

  return {
    questionPack: activeQuestionPack,
    questions,
    importedQuestions,
    filteredQuestions,
    availableFilters,
    filters,
    setFilters,
    validationErrors,
    progress,
    stats,
    wrongQuestions: questions.filter((question) => wrongQuestionIds.has(question.id)),
    favoriteQuestions: questions.filter((question) => starredQuestionIds.has(question.id)),
    isStarred: (questionId: string) => starredQuestionIds.has(questionId),
    answerQuestion,
    toggleStar,
    resetQuizProgress,
  }
}
