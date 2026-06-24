export function createDeferredDraftWriter(write, delay = 450) {
  let timerId = null

  function clearTimer() {
    if (timerId === null) return
    clearTimeout(timerId)
    timerId = null
  }

  return {
    schedule(value) {
      clearTimer()
      timerId = setTimeout(() => {
        timerId = null
        write(value)
      }, delay)
    },
    flush(value) {
      clearTimer()
      write(value)
    },
    cancel() {
      clearTimer()
    },
  }
}

export function shouldSyncDraftFromDay({
  currentDayId,
  nextDayId,
  isFocused,
  isComposing,
  localValue,
  savedValue,
}) {
  if (currentDayId !== nextDayId) return true
  if (isFocused || isComposing) return false
  return localValue !== savedValue
}
