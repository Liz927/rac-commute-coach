import { AlertTriangle, BookMarked, Filter, Heart, LineChart, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuizStore } from '../hooks/useQuizStore'
import PracticeView from './PracticeView'
import QuestionFilters from './QuestionFilters'
import QuestionListView from './QuestionListView'
import StatsView from './StatsView'

type QuizTab = 'practice' | 'wrong' | 'favorites' | 'stats'

const tabs = [
  { id: 'practice', label: 'Practice', icon: Target },
  { id: 'wrong', label: 'Wrong', icon: BookMarked },
  { id: 'favorites', label: 'Stars', icon: Heart },
  { id: 'stats', label: 'Stats', icon: LineChart },
] as const

export default function QuizScreen() {
  const [activeTab, setActiveTab] = useState<QuizTab>('practice')
  const quiz = useQuizStore()

  const activeContent = useMemo(() => {
    if (activeTab === 'wrong') {
      return (
        <PracticeView
          title="Wrong answer book"
          description="Retry the questions that still need attention."
          questions={quiz.wrongQuestions}
          emptyTitle="No wrong questions right now"
          emptyMessage="Missed questions will appear here automatically after you submit an answer."
          isStarred={quiz.isStarred}
          latestAttemptsByQuestionId={quiz.latestAttemptsByQuestionId}
          onToggleStar={quiz.toggleStar}
          onAnswer={quiz.answerQuestion}
        />
      )
    }

    if (activeTab === 'favorites') {
      return (
        <QuestionListView
          title="Favorites"
          description="Questions you want to revisit."
          questions={quiz.favoriteQuestions}
          emptyTitle="No favorites yet"
          emptyMessage="Tap the star on any question to keep it here."
          isStarred={quiz.isStarred}
          onToggleStar={quiz.toggleStar}
        />
      )
    }

    if (activeTab === 'stats') {
      return (
        <StatsView
          totalQuestions={quiz.questions.length}
          stats={quiz.stats}
          onReset={quiz.resetQuizProgress}
        />
      )
    }

    return (
      <PracticeView
        title="Practice mode"
        description="One focused RAC device question at a time."
        questions={quiz.filteredQuestions}
        emptyTitle="No questions match these filters"
        emptyMessage="Relax one filter to continue practicing."
        isStarred={quiz.isStarred}
        latestAttemptsByQuestionId={quiz.latestAttemptsByQuestionId}
        onToggleStar={quiz.toggleStar}
        onAnswer={quiz.answerQuestion}
      />
    )
  }, [activeTab, quiz])

  return (
    <main className="quiz-screen">
      <header className="quiz-hero">
        <div>
          <p className="quiz-eyebrow">RAC Device Quiz 2.0</p>
          <h1>Daily exam reps, commute-friendly.</h1>
          <p>
            Local-only practice with placeholder questions, wrong-answer review, favorites,
            filters, and progress saved on this device.
          </p>
        </div>
        <div className="quiz-bank-badge">
          <strong>{quiz.questions.length}</strong>
          <span>questions</span>
        </div>
      </header>

      {quiz.validationErrors.length ? (
        <section className="quiz-validation-warning">
          <AlertTriangle size={18} />
          <span>{quiz.validationErrors[0]}</span>
        </section>
      ) : null}

      <section className="quiz-pack-note">
        <strong>{quiz.questionPack.title}</strong>
        <span>
          Pack ID: {quiz.questionPack.packId}. Imported daily packages are stored locally and merge
          with the bundled starter bank.
        </span>
      </section>

      <nav className="quiz-tabs" aria-label="Quiz sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            className={activeTab === id ? 'is-active' : ''}
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'practice' ? (
        <div className="quiz-filter-wrap">
          <div className="quiz-filter-title">
            <Filter size={18} />
            <strong>Filters</strong>
          </div>
          <QuestionFilters
            filters={quiz.filters}
            availableFilters={quiz.availableFilters}
            onChange={quiz.setFilters}
          />
        </div>
      ) : null}

      {activeContent}
    </main>
  )
}
