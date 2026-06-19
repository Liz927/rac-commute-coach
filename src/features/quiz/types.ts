export type QuestionType = 'single' | 'multiple'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export type QuestionOption = {
  id: string
  text: string
}

export type Question = {
  id: string
  packId?: string
  type: QuestionType
  domain: string
  tags: string[]
  difficulty: QuestionDifficulty
  prompt: string
  options: QuestionOption[]
  correctOptionIds: string[]
  explanation: string
  placeholder?: boolean
}

export type QuestionPack = {
  packId: string
  version: number
  title: string
  source: string
  isPlaceholder?: boolean
  questions: Question[]
}

export type QuizAttempt = {
  questionId: string
  selectedOptionIds: string[]
  isCorrect: boolean
  answeredAt: string
}

export type QuizProgress = {
  attempts: QuizAttempt[]
  starredQuestionIds: string[]
}

export type QuizFilters = {
  packId: string
  domain: string
  difficulty: string
  tag: string
}

export type DomainStat = {
  domain: string
  answered: number
  correct: number
  accuracy: number
}
