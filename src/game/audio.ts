const MUTE_KEY = 'nova-muted'

export type SoundKind = 'strike' | 'crit' | 'buy' | 'warp' | 'contract'

let muted = false
let ctx: AudioContext | null = null

try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  muted = false
}

function audio(): AudioContext | null {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function isMuted(): boolean {
  return muted
}

export function toggleMute(): boolean {
  muted = !muted
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Private browsing — keep the choice in memory.
  }
  return muted
}

function tone(
  audioCtx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
) {
  const osc = audioCtx.createOscillator()
  const amp = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(amp)
  amp.connect(audioCtx.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

export function play(kind: SoundKind): void {
  if (muted) return
  const audioCtx = audio()
  if (!audioCtx) return
  const t = audioCtx.currentTime
  switch (kind) {
    case 'strike':
      tone(audioCtx, 180, t, 0.06, 'square', 0.04)
      tone(audioCtx, 90, t, 0.08, 'triangle', 0.05)
      break
    case 'crit':
      tone(audioCtx, 420, t, 0.1, 'square', 0.05)
      tone(audioCtx, 630, t + 0.05, 0.12, 'triangle', 0.045)
      break
    case 'buy':
      tone(audioCtx, 320, t, 0.08, 'sine', 0.045)
      tone(audioCtx, 480, t + 0.07, 0.1, 'sine', 0.04)
      break
    case 'warp':
      tone(audioCtx, 140, t, 0.22, 'sawtooth', 0.035)
      tone(audioCtx, 280, t + 0.12, 0.28, 'triangle', 0.04)
      tone(audioCtx, 560, t + 0.28, 0.32, 'sine', 0.035)
      break
    case 'contract':
      tone(audioCtx, 520, t, 0.12, 'sine', 0.05)
      tone(audioCtx, 780, t + 0.1, 0.16, 'sine', 0.04)
      break
  }
}
