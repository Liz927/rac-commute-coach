export const LOCAL_DATA_CHANGED = 'rac-local-data-changed'

export function notifyLocalDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LOCAL_DATA_CHANGED))
}
