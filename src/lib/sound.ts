// ============================================================
// SAKURA WEB AUDIO SOUND SYNTHESIZER
// Zero external assets required — pure Web Audio API synthesis
// Supports: correct chime, error buzz, timer tick, strike,
// button tap, and victory fanfare.
// ============================================================

class SoundManager {
  private ctx: AudioContext | null = null
  private enabled: boolean = true

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setEnabled(val: boolean) {
    this.enabled = val
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  // Soft tactile UI tap
  public playClick() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.05)
  }

  // Correct answer chime (harmonic two-tone)
  public playCorrect() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = now + idx * 0.08

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.35)
    })
  }

  // Incorrect / Error buzzer
  public playWrong() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.linearRampToValueAtTime(110, now + 0.3)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.3)
  }

  // Timer countdown tick
  public playTick(isUrgent: boolean = false) {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(isUrgent ? 950 : 650, now)

    gain.gain.setValueAtTime(isUrgent ? 0.2 : 0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.06)
  }

  // Sakura Feud strike buzzer (dramatic harsh X sound)
  public playStrike() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Dual discordant saws
    ;[130, 185].forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.5)
    })
  }

  // Sakura Feud face-off buzzer press
  public playBuzzer() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.setValueAtTime(880, now + 0.1)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.3)
  }

  // Victory / Final results fanfare
  public playFanfare() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Celebratory sequence: C4, G4, C5, E5, G5
    const fanfareNotes = [
      { f: 261.63, d: 0.15, s: 0 },
      { f: 392.0, d: 0.15, s: 0.15 },
      { f: 523.25, d: 0.2, s: 0.3 },
      { f: 659.25, d: 0.2, s: 0.5 },
      { f: 783.99, d: 0.5, s: 0.7 },
    ]

    fanfareNotes.forEach(({ f, d, s }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = now + s

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, startTime)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + d)
    })
  }

  // Card reveal swoosh / flip sound
  public playReveal() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  }

  // Tension heartbeat (double low thump: lub-dub)
  public playHeartbeat() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const beats = [0, 0.22]

    beats.forEach(offset => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = now + offset

      osc.type = 'sine'
      osc.frequency.setValueAtTime(65, startTime)
      osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.18)

      gain.gain.setValueAtTime(0.35, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.18)
    })
  }

  // Suspense Drumroll leading to a crash
  public playDrumroll() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const steps = 18

    for (let i = 0; i < steps; i++) {
      const time = now + i * 0.08
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(140 + Math.random() * 40, time)

      const vol = 0.05 + (i / steps) * 0.25
      gain.gain.setValueAtTime(vol, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + 0.07)
    }

    // Final crash
    const crashTime = now + steps * 0.08
    const crashOsc = ctx.createOscillator()
    const crashGain = ctx.createGain()
    crashOsc.type = 'sawtooth'
    crashOsc.frequency.setValueAtTime(300, crashTime)
    crashOsc.frequency.exponentialRampToValueAtTime(60, crashTime + 0.6)
    crashGain.gain.setValueAtTime(0.4, crashTime)
    crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 0.6)
    crashOsc.connect(crashGain)
    crashGain.connect(ctx.destination)
    crashOsc.start(crashTime)
    crashOsc.stop(crashTime + 0.6)
  }

  // Crowd applause / cheering simulation
  public playApplause() {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const clapsCount = 24

    for (let i = 0; i < clapsCount; i++) {
      const clapTime = now + Math.random() * 1.5
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400 + Math.random() * 600, clapTime)

      gain.gain.setValueAtTime(0.12 + Math.random() * 0.1, clapTime)
      gain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(clapTime)
      osc.stop(clapTime + 0.08)
    }
  }
}

export const sound = new SoundManager()
