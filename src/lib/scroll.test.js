import { describe, expect, it, vi } from 'vitest'
import { scrollContainerToTop } from './scroll'

describe('scrollContainerToTop', () => {
  it('uses the internal scroll container before the window fallback', () => {
    const container = { scrollTo: vi.fn() }
    const fallback = { scrollTo: vi.fn() }

    expect(scrollContainerToTop(container, fallback)).toBe(true)
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(fallback.scrollTo).not.toHaveBeenCalled()
  })

  it('uses the fallback only when there is no usable internal container', () => {
    const fallback = { scrollTo: vi.fn() }

    expect(scrollContainerToTop(null, fallback, 'smooth')).toBe(false)
    expect(fallback.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
