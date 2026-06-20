import { useMemo, useState } from 'react'
import AddScreen from './components/AddScreen'
import BackupScreen from './components/BackupScreen'
import BottomNav from './components/BottomNav'
import DayEditor from './components/DayEditor'
import DayList from './components/DayList'
import DayReader from './components/DayReader'
import PackageImportScreen from './components/PackageImportScreen'
import {
  loadImportedQuestions,
  mergeImportedQuestions,
  saveImportedQuestions,
} from './features/quiz/lib/storage'
import QuizScreen from './features/quiz/components/QuizScreen'
import { useDays } from './hooks/useDays'
import { useCloudSync } from './hooks/useCloudSync'
import { createEmptyDay } from './lib/day'
import { applyLearningPackageToDays } from './lib/learningPackageImport'

export default function App() {
  const { days, setDays, saveDay, updateDay, deleteDay } = useDays()
  const cloudSync = useCloudSync(days, setDays)
  const allQuizQuestions = useMemo(() => loadImportedQuestions(), [days])
  const [view, setView] = useState({ name: 'days', dayId: null })
  const selectedDay = useMemo(
    () => days.find((day) => day.id === view.dayId),
    [days, view.dayId],
  )

  function openAdd() {
    setView({ name: 'add', dayId: null })
  }

  function openNewDayEditor() {
    const nextNumber = days.length ? Math.max(...days.map((day) => day.dayNumber)) + 1 : 1
    const draft = createEmptyDay(nextNumber)
    setView({ name: 'editor', dayId: draft.id, draft })
  }

  function navigate(target) {
    if (target === 'add') openAdd()
    else setView({ name: target, dayId: null })
  }

  function importLearningPackage(parsedPackage, { mode }) {
    if (import.meta.env.DEV && parsedPackage.version === 'RAC_DAY_PACKAGE_V2') {
      console.log('[Import V2] meta', parsedPackage.meta)
      console.log('[Import V2] parsed questions', parsedPackage.questions.length)
      console.log('[Import V2] normalized questions', parsedPackage.questions)
    }
    const dayImport = applyLearningPackageToDays(days, parsedPackage, { mode })
    setDays(dayImport.days)

    const mergedQuestions = mergeImportedQuestions(loadImportedQuestions(), parsedPackage.questions)
    saveImportedQuestions(mergedQuestions.questions)
    const totalQuestionsForPack = mergedQuestions.questions.filter(
      (question) => question.packId === parsedPackage.meta.packId,
    ).length
    if (import.meta.env.DEV && parsedPackage.version === 'RAC_DAY_PACKAGE_V2') {
      console.log(
        '[Import V2] saved questions for packId',
        parsedPackage.meta.packId,
        totalQuestionsForPack,
      )
    }

    return {
      dayId: dayImport.day.id,
      dayTitle: dayImport.day.title,
      dayAction: dayImport.dayAction,
      addedQuestions: mergedQuestions.added,
      updatedQuestions: mergedQuestions.updated,
      packId: parsedPackage.meta.packId,
      parsedQuestions: parsedPackage.questions.length,
      totalQuestionsForPack,
    }
  }

  if (view.name === 'reader' && selectedDay) {
    return (
      <DayReader
        day={selectedDay}
        allQuizQuestions={allQuizQuestions}
        onBack={() => setView({ name: 'days', dayId: null })}
        onEdit={() => setView({ name: 'editor', dayId: selectedDay.id })}
        onUpdate={(nextDay) => updateDay(nextDay.id, () => nextDay)}
      />
    )
  }

  if (view.name === 'editor') {
    const editingDay = selectedDay || view.draft
    return (
      <DayEditor
        initialDay={editingDay}
        onCancel={() => setView({ name: 'days', dayId: null })}
        onSave={(day) => {
          saveDay(day)
          setView({ name: 'reader', dayId: day.id })
        }}
      />
    )
  }

  if (view.name === 'add') {
    return (
      <div className="app-shell">
        <AddScreen
          onNewDay={openNewDayEditor}
          onImportPackage={() => setView({ name: 'packageImport', dayId: null })}
        />
        <BottomNav active="add" onNavigate={navigate} />
      </div>
    )
  }

  if (view.name === 'packageImport') {
    return (
      <div className="app-shell">
        <PackageImportScreen
          days={days}
          onCancel={() => setView({ name: 'add', dayId: null })}
          onImportPackage={importLearningPackage}
          onOpenDay={(dayId) => setView({ name: 'reader', dayId })}
          onOpenQuiz={() => setView({ name: 'quiz', dayId: null })}
        />
        <BottomNav active="add" onNavigate={navigate} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      {view.name === 'quiz' ? (
        <QuizScreen />
      ) : view.name === 'backup' ? (
        <BackupScreen
          days={days}
          onImport={setDays}
          onClear={() => setDays([])}
          cloudSync={cloudSync}
        />
      ) : (
        <DayList
          days={days}
          onOpen={(dayId) => setView({ name: 'reader', dayId })}
          onEdit={(dayId) => setView({ name: 'editor', dayId })}
          onDelete={deleteDay}
          onAdd={openAdd}
        />
      )}
      <BottomNav
        active={view.name === 'backup' || view.name === 'quiz' ? view.name : 'days'}
        onNavigate={navigate}
      />
    </div>
  )
}
