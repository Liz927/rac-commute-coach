import { useEffect, useState } from 'react'
import { loadDays, saveDays } from '../lib/storage'

export function useDays() {
  const [days, setDays] = useState(loadDays)

  useEffect(() => {
    saveDays(days)
  }, [days])

  function saveDay(nextDay) {
    setDays((current) => {
      const exists = current.some((day) => day.id === nextDay.id)
      const next = exists
        ? current.map((day) => (day.id === nextDay.id ? nextDay : day))
        : [...current, nextDay]
      return next.sort((a, b) => a.dayNumber - b.dayNumber)
    })
  }

  function updateDay(id, updater) {
    setDays((current) =>
      current.map((day) =>
        day.id === id
          ? { ...updater(day), updatedAt: new Date().toISOString() }
          : day,
      ),
    )
  }

  function deleteDay(id) {
    setDays((current) => current.filter((day) => day.id !== id))
  }

  return { days, setDays, saveDay, updateDay, deleteDay }
}
