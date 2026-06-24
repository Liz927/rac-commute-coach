export function scrollContainerToTop(container, fallback, behavior = 'auto') {
  if (container && typeof container.scrollTo === 'function') {
    container.scrollTo({ top: 0, behavior })
    return true
  }

  fallback?.scrollTo?.({ top: 0, behavior })
  return false
}
