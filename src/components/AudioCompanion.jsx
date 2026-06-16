import { Pause, Play, RotateCcw, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AUDIO_SCRIPT_OPTIONS, normalizeAudioScripts } from '../lib/audioScripts'

const RATE_OPTIONS = [0.8, 1, 1.25, 1.5]

function getSpeechSynthesis() {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis || null
}

function getStatusText(status) {
  if (status.mode === 'playing') return `正在播放${status.label}`
  if (status.mode === 'paused') return `已暂停${status.label}`
  if (status.mode === 'empty') return `${status.label}还没有脚本文本`
  if (status.mode === 'unsupported') return '当前浏览器不支持语音朗读'
  return '选择一个版本开始陪读'
}

export default function AudioCompanion({ audioScripts }) {
  const scripts = useMemo(() => normalizeAudioScripts(audioScripts), [audioScripts])
  const synthRef = useRef(getSpeechSynthesis())
  const utteranceRef = useRef(null)
  const canceledRef = useRef(false)
  const [rate, setRate] = useState(1)
  const [voices, setVoices] = useState([])
  const [voiceURI, setVoiceURI] = useState('')
  const [status, setStatus] = useState({ mode: 'idle', key: null, label: '' })
  const supported = Boolean(synthRef.current)

  useEffect(() => {
    const synth = synthRef.current
    if (!synth) {
      setStatus({ mode: 'unsupported', key: null, label: '' })
      return undefined
    }

    function refreshVoices() {
      setVoices(synth.getVoices())
    }

    refreshVoices()
    synth.addEventListener?.('voiceschanged', refreshVoices)
    synth.onvoiceschanged = refreshVoices

    return () => {
      synth.removeEventListener?.('voiceschanged', refreshVoices)
      if (synth.onvoiceschanged === refreshVoices) synth.onvoiceschanged = null
      canceledRef.current = true
      synth.cancel()
    }
  }, [])

  function stopSpeech(nextStatus = { mode: 'idle', key: null, label: '' }) {
    const synth = synthRef.current
    if (!synth) return
    canceledRef.current = true
    synth.cancel()
    utteranceRef.current = null
    setStatus(nextStatus)
  }

  function playScript(option) {
    const synth = synthRef.current
    if (!synth) {
      setStatus({ mode: 'unsupported', key: null, label: '' })
      return
    }

    const text = scripts[option.key].trim()
    if (!text) {
      stopSpeech({ mode: 'empty', key: option.key, label: option.label })
      return
    }

    stopSpeech({ mode: 'playing', key: option.key, label: option.label })
    canceledRef.current = false
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI)
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.onend = () => {
      if (!canceledRef.current) setStatus({ mode: 'idle', key: null, label: '' })
    }
    utterance.onerror = () => {
      if (!canceledRef.current) setStatus({ mode: 'idle', key: null, label: '' })
    }
    utteranceRef.current = utterance
    synth.speak(utterance)
  }

  function pauseSpeech() {
    const synth = synthRef.current
    if (!synth || status.mode !== 'playing') return
    synth.pause()
    setStatus((current) => ({ ...current, mode: 'paused' }))
  }

  function resumeSpeech() {
    const synth = synthRef.current
    if (!synth || status.mode !== 'paused') return
    synth.resume()
    setStatus((current) => ({ ...current, mode: 'playing' }))
  }

  return (
    <section className="audio-panel" aria-label="音频陪读">
      <div className="audio-panel-head">
        <div>
          <p className="eyebrow">AUDIO 2.0</p>
          <h2>通勤陪读</h2>
        </div>
        <span className={`audio-status is-${status.mode}`} role="status">
          {getStatusText(status)}
        </span>
      </div>

      <div className="audio-script-grid">
        {AUDIO_SCRIPT_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={status.key === option.key && status.mode === 'playing' ? 'is-playing' : ''}
            type="button"
            onClick={() => playScript(option)}
            disabled={!supported}
          >
            <Play size={20} />
            {option.actionLabel}
          </button>
        ))}
      </div>

      <div className="audio-controls">
        <button type="button" onClick={pauseSpeech} disabled={status.mode !== 'playing'}>
          <Pause size={19} /> 暂停
        </button>
        <button type="button" onClick={resumeSpeech} disabled={status.mode !== 'paused'}>
          <RotateCcw size={19} /> 继续
        </button>
        <button type="button" onClick={() => stopSpeech()} disabled={status.mode === 'idle'}>
          <Square size={18} /> 停止
        </button>
      </div>

      <div className="audio-settings">
        <label>
          语速
          <select
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            disabled={!supported}
          >
            {RATE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}x
              </option>
            ))}
          </select>
        </label>

        {voices.length > 0 && (
          <label>
            声音
            <select
              value={voiceURI}
              onChange={(event) => setVoiceURI(event.target.value)}
              disabled={!supported}
            >
              <option value="">浏览器默认</option>
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  )
}
