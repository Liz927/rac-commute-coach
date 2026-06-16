import { describe, expect, it } from 'vitest'
import { EMPTY_AUDIO_SCRIPTS, normalizeAudioScripts } from './audioScripts'

describe('audio script helpers', () => {
  it('fills the three supported script slots', () => {
    expect(normalizeAudioScripts()).toEqual(EMPTY_AUDIO_SCRIPTS)
  })

  it('keeps only string script values', () => {
    expect(
      normalizeAudioScripts({
        casualScript: 'casual',
        termsScript: 42,
        examScript: 'exam',
        ignored: 'not exported',
      }),
    ).toEqual({
      casualScript: 'casual',
      termsScript: '',
      examScript: 'exam',
    })
  })
})
