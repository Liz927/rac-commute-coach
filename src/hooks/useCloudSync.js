import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applySyncPayload,
  createLocalSyncPayload,
  fetchCloudPayload,
  getCloudDeviceId,
  mergeCloudPayloads,
  serializeError,
  startGoogleSignIn,
  startGoogleSignOut,
  uploadCloudPayload,
  watchCloudPayload,
  watchGoogleAuth,
} from '../lib/cloudSync'
import { LOCAL_DATA_CHANGED } from '../lib/localChanges'

export function useCloudSync(days, setDays) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('未登录')
  const [error, setError] = useState('')
  const daysRef = useRef(days)
  const userRef = useRef(null)
  const applyingRemoteRef = useRef(false)
  const uploadTimerRef = useRef(null)
  const unsubscribeCloudRef = useRef(null)
  const deviceIdRef = useRef(null)

  useEffect(() => {
    daysRef.current = days
  }, [days])

  const applyRemotePayload = useCallback((payload) => {
    applyingRemoteRef.current = true
    applySyncPayload(payload, setDays)
    window.setTimeout(() => {
      applyingRemoteRef.current = false
    }, 1000)
  }, [setDays])

  const syncNow = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser || applyingRemoteRef.current) return

    setError('')
    setStatus('正在同步…')
    try {
      await uploadCloudPayload(
        currentUser.uid,
        createLocalSyncPayload(daysRef.current),
        deviceIdRef.current || getCloudDeviceId(),
      )
      setStatus(`已同步 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (syncError) {
      setError(serializeError(syncError))
      setStatus('同步失败')
    }
  }, [])

  const scheduleSync = useCallback(() => {
    if (!userRef.current || applyingRemoteRef.current) return
    window.clearTimeout(uploadTimerRef.current)
    uploadTimerRef.current = window.setTimeout(syncNow, 900)
  }, [syncNow])

  useEffect(() => {
    const unsubscribe = watchGoogleAuth(async (nextUser) => {
      unsubscribeCloudRef.current?.()
      userRef.current = nextUser
      setUser(nextUser)
      setError('')

      if (!nextUser) {
        setStatus('未登录')
        return
      }

      deviceIdRef.current = getCloudDeviceId()
      setStatus('正在读取云端数据…')
      try {
        const remotePayload = await fetchCloudPayload(nextUser.uid)
        const localPayload = createLocalSyncPayload(daysRef.current)
        const mergedPayload = remotePayload
          ? mergeCloudPayloads(localPayload, remotePayload)
          : localPayload
        if (remotePayload) applyRemotePayload(mergedPayload)
        await uploadCloudPayload(nextUser.uid, mergedPayload, deviceIdRef.current)
        setStatus('已开启自动同步')
      } catch (syncError) {
        setError(serializeError(syncError))
        setStatus('云端连接失败')
      }

      unsubscribeCloudRef.current = watchCloudPayload(
        nextUser.uid,
        async (remoteState) => {
          if (!remoteState?.payload || remoteState.updatedBy === deviceIdRef.current) return
          try {
            const mergedPayload = mergeCloudPayloads(
              createLocalSyncPayload(daysRef.current),
              remoteState.payload,
            )
            applyRemotePayload(mergedPayload)
            await uploadCloudPayload(nextUser.uid, mergedPayload, deviceIdRef.current)
            setStatus('已从另一台设备同步')
          } catch (syncError) {
            setError(serializeError(syncError))
            setStatus('同步失败')
          }
        },
        (syncError) => {
          setError(serializeError(syncError))
          setStatus('云端监听失败')
        },
      )
    }, (authError) => {
      setError(serializeError(authError))
      setStatus('登录状态读取失败')
    })

    return () => {
      unsubscribe()
      unsubscribeCloudRef.current?.()
      window.clearTimeout(uploadTimerRef.current)
    }
  }, [applyRemotePayload])

  useEffect(() => {
    window.addEventListener(LOCAL_DATA_CHANGED, scheduleSync)
    return () => window.removeEventListener(LOCAL_DATA_CHANGED, scheduleSync)
  }, [scheduleSync])

  useEffect(() => {
    scheduleSync()
  }, [days, scheduleSync])

  const signIn = useCallback(async () => {
    setError('')
    setStatus('正在跳转至 Google 登录…')
    try {
      await startGoogleSignIn()
    } catch (authError) {
      setError(serializeError(authError))
      setStatus('登录失败')
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await startGoogleSignOut()
    } catch (authError) {
      setError(serializeError(authError))
      setStatus('退出失败')
    }
  }, [])

  return {
    user,
    status,
    error,
    signIn,
    signOut,
    syncNow,
  }
}
