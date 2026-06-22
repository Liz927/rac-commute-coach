import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDeferredDraftWriter } from './deferredDraft'

describe('createDeferredDraftWriter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes only the settled draft after the debounce window', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const writer = createDeferredDraftWriter(write, 400)

    writer.schedule('控')
    writer.schedule('控制')
    vi.advanceTimersByTime(399)
    expect(write).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(write).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledWith('控制')
  })

  it('flushes the completed IME value once without keeping a stale timer', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const writer = createDeferredDraftWriter(write, 400)

    writer.schedule('控')
    writer.flush('控制')
    vi.advanceTimersByTime(400)

    expect(write).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledWith('控制')
  })
})
