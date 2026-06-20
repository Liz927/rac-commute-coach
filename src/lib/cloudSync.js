import { onAuthStateChanged, signInWithRedirect, signOut } from 'firebase/auth'
import { doc, onSnapshot, runTransaction } from 'firebase/firestore'
import { loadImportedQuestions, loadQuizProgress, saveImportedQuestions, saveQuizProgress } from '../features/quiz/lib/storage'
import { firebaseAuth, firebaseDb, googleProvider } from './firebase'
import { mergeSyncPayloads, toFirestoreSafe } from './cloudSyncData'
import { makeExportPayload, normalizeImport } from './storage'

const CLOUD_DOCUMENT = 'state'
const CLOUD_SCHEMA_VERSION = 1
const DEVICE_ID_KEY = 'rac.cloud-sync-device-id.v1'

function makeDeviceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getCloudDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const next = makeDeviceId()
  localStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

export function createLocalSyncPayload(days) {
  return makeExportPayload(days, {
    quizQuestions: loadImportedQuestions(),
    quizProgress: loadQuizProgress(),
  })
}

export function applySyncPayload(payload, setDays) {
  const normalized = normalizeImport(payload)
  setDays(normalized.days)
  saveImportedQuestions(normalized.quizQuestions || [])
  saveQuizProgress(normalized.quizProgress || { attempts: [], starredQuestionIds: [] })
}

function syncDocument(userId) {
  return doc(firebaseDb, 'users', userId, 'sync', CLOUD_DOCUMENT)
}

function serializeError(error) {
  if (error?.code === 'permission-denied') {
    return '云端权限尚未配置。请按 Firebase 规则说明完成 Firestore Rules 设置。'
  }
  if (error?.code === 'auth/unauthorized-domain') {
    return '当前网址未获授权。请在 Firebase Authentication 的 Authorized domains 中添加 liz927.github.io。'
  }
  if (error?.code === 'auth/operation-not-allowed') {
    return 'Firebase 还没有启用 Google 登录。'
  }
  return error?.message || '云同步暂时不可用。'
}

export function startGoogleSignIn() {
  return signInWithRedirect(firebaseAuth, googleProvider)
}

export function startGoogleSignOut() {
  return signOut(firebaseAuth)
}

export function watchGoogleAuth(onUser, onError) {
  return onAuthStateChanged(firebaseAuth, onUser, onError)
}

export function watchCloudPayload(userId, onPayload, onError) {
  return onSnapshot(
    syncDocument(userId),
    (snapshot) => onPayload(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}

export async function syncCloudPayload(userId, localPayload, deviceId) {
  return runTransaction(firebaseDb, async (transaction) => {
    const reference = syncDocument(userId)
    const snapshot = await transaction.get(reference)
    const remotePayload = snapshot.exists() ? snapshot.data().payload || {} : {}
    const mergedPayload = mergeSyncPayloads(localPayload, remotePayload)

    transaction.set(reference, {
      schemaVersion: CLOUD_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceId,
      payload: toFirestoreSafe(mergedPayload),
    })

    return mergedPayload
  })
}

export function mergeCloudPayloads(localPayload, remotePayload) {
  return mergeSyncPayloads(localPayload, remotePayload)
}

export { serializeError }
