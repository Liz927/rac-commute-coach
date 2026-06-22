import { useEffect, useRef, useState } from 'react'
import {
  clearDeletedDayTombstones,
  markDayDeleted,
  markDaysDeleted,
  saveDeletedDays,
} from '../lib/dayDeletions'
import { loadDays, saveDays } from '../lib/storage'

export function useDays() {
  const [days, setDays] = useState(loadDays)
  const daysRef = useRef(days)

  useEffect(() => {
    daysRef.current = days
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
    markDayDeleted(id)
    setDays((current) => current.filter((day) => day.id !== id))
  }

  function clearDays() {
    markDaysDeleted(daysRef.current.map((day) => day.id))
    setDays([])
  }

  function replaceDays(nextDays, deletedDays) {
    if (Array.isArray(deletedDays)) saveDeletedDays(deletedDays)
    else clearDeletedDayTombstones(nextDays.map((day) => day.id))
    setDays(nextDays)
  }

  return { days, setDays, saveDay, updateDay, deleteDay, clearDays, replaceDays }
}
