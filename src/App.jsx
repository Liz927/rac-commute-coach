import { useMemo, useState } from 'react'
import BackupScreen from './components/BackupScreen'
import BottomNav from './components/BottomNav'
import DayEditor from './components/DayEditor'
import DayList from './components/DayList'
import DayReader from './components/DayReader'
import { useDays } from './hooks/useDays'
import { createEmptyDay } from './lib/day'

export default function App() {
  const { days, setDays, saveDay, updateDay, deleteDay } = useDays()
  const [view, setView] = useState({ name: 'days', dayId: null })
  const selectedDay = useMemo(
    () => days.find((day) => day.id === view.dayId),
    [days, view.dayId],
  )

  function openAdd() {
    const nextNumber = days.length ? Math.max(...days.map((day) => day.dayNumber)) + 1 : 1
    const draft = createEmptyDay(nextNumber)
    setView({ name: 'editor', dayId: draft.id, draft })
  }

  function navigate(target) {
    if (target === 'add') openAdd()
    else setView({ name: target, dayId: null })
  }

  if (view.name === 'reader' && selectedDay) {
    return (
      <DayReader
        day={selectedDay}
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

  return (
    <div className="app-shell">
      {view.name === 'backup' ? (
        <BackupScreen days={days} onImport={setDays} onClear={() => setDays([])} />
      ) : (
        <DayList
          days={days}
          onOpen={(dayId) => setView({ name: 'reader', dayId })}
          onEdit={(dayId) => setView({ name: 'editor', dayId })}
          onDelete={deleteDay}
          onAdd={openAdd}
        />
      )}
      <BottomNav active={view.name === 'backup' ? 'backup' : 'days'} onNavigate={navigate} />
    </div>
  )
}
