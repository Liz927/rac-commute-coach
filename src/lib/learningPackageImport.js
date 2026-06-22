import { createEmptyDay } from './day'
import { parseMarkdown } from './markdown'

export function formatImportSuccess({ dayAction, dayTitle, totalQuestionsForPack }) {
  const action = dayAction === 'updated' ? '已更新' : '已创建'
  return `导入成功：${action}「${dayTitle}」，共 ${totalQuestionsForPack} 道题。`
}

export function findPackageDay(days, parsedPackage) {
  return days.find(
    (day) =>
      (parsedPackage.meta.packId && day.packId === parsedPackage.meta.packId) ||
      day.title === parsedPackage.meta.title,
  )
}

export function applyLearningPackageToDays(days, parsedPackage, { mode = 'create', now } = {}) {
  const timestamp = now || new Date().toISOString()
  const existingDay = findPackageDay(days, parsedPackage)
  const shouldUpdate = existingDay && mode === 'update'
  const nextNumber =
    parsedPackage.meta.day ||
    (days.length ? Math.max(...days.map((day) => Number(day.dayNumber) || 0)) + 1 : 1)
  const baseDay = shouldUpdate ? existingDay : createEmptyDay(nextNumber, timestamp)
  const nextPackId = shouldUpdate || mode !== 'copy'
    ? parsedPackage.meta.packId
    : `${parsedPackage.meta.packId}-copy-${Date.now()}`
  const sanitized = parseMarkdown(parsedPackage.sanitizedContentMarkdown, baseDay.id)
  const nextDay = {
    ...baseDay,
    dayNumber: parsedPackage.meta.day || baseDay.dayNumber,
    title: mode === 'copy' ? `${parsedPackage.meta.title}（副本）` : parsedPackage.meta.title,
    packId: nextPackId,
    domain: parsedPackage.meta.domain || '',
    tags: parsedPackage.meta.tags || [],
    difficulty: parsedPackage.meta.difficulty || '',
    contentMarkdown: sanitized.contentWithoutQuestions,
    sections: sanitized.sections,
    questions: [],
    updatedAt: timestamp,
    createdAt: baseDay.createdAt || timestamp,
  }

  const nextDays = shouldUpdate
    ? days.map((day) => (day.id === nextDay.id ? nextDay : day))
    : [...days, nextDay]

  return {
    days: nextDays.sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber)),
    day: nextDay,
    dayAction: shouldUpdate ? 'updated' : 'created',
  }
}
