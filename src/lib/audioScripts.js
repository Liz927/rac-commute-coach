export const EMPTY_AUDIO_SCRIPTS = {
  casualScript: '',
  termsScript: '',
  examScript: '',
}

export const AUDIO_SCRIPT_OPTIONS = [
  { key: 'casualScript', label: '闲聊版', actionLabel: '听闲聊版' },
  { key: 'termsScript', label: '术语版', actionLabel: '听术语版' },
  { key: 'examScript', label: '考点版', actionLabel: '听考点版' },
]

export function normalizeAudioScripts(audioScripts = {}) {
  return Object.fromEntries(
    Object.keys(EMPTY_AUDIO_SCRIPTS).map((key) => [
      key,
      typeof audioScripts?.[key] === 'string' ? audioScripts[key] : '',
    ]),
  )
}
