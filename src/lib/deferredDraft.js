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
