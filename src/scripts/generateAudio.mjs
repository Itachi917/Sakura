import fs from 'fs'
import path from 'path'

// High-fidelity PCM WAV Generator for Anime OSTs
// Creates polyphonic musical previews for the Guess the OST game.

const SAMPLE_RATE = 22050

function noteToFreq(note) {
  const notes = {
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'Ab5': 830.61, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98,
    'REST': 0
  }
  return notes[note] || 0
}

function synthesizeTrack(notesList, bpm = 120, instrument = 'synth') {
  const beatDuration = 60 / bpm
  const totalDuration = notesList.reduce((acc, n) => acc + (n.dur * beatDuration), 0) + 1.0 // tail
  const totalSamples = Math.floor(totalDuration * SAMPLE_RATE)
  const buffer = new Float32Array(totalSamples)

  let currentTime = 0

  for (const n of notesList) {
    const durSec = n.dur * beatDuration
    const noteStartSample = Math.floor(currentTime * SAMPLE_RATE)
    const noteSamples = Math.floor(durSec * SAMPLE_RATE)
    const freq = noteToFreq(n.note)

    if (freq > 0) {
      for (let s = 0; s < noteSamples && (noteStartSample + s) < totalSamples; s++) {
        const t = s / SAMPLE_RATE
        const progress = s / noteSamples

        // ADSR Envelope
        let env = 1.0
        const attackTime = 0.03
        const releaseTime = 0.08
        if (t < attackTime) {
          env = t / attackTime
        } else if (progress > 0.85) {
          env = Math.max(0, 1.0 - ((progress - 0.85) / 0.15))
        }

        // Vibrato
        const vibrato = Math.sin(2 * Math.PI * 5 * t) * (instrument === 'flute' ? 3.5 : 2.0)
        const currentFreq = freq + vibrato

        // Multi-harmonic waveform
        let sample = 0
        if (instrument === 'flute') {
          // Pure sine + soft second harmonic (bamboo shakuhachi style)
          sample = Math.sin(2 * Math.PI * currentFreq * t) * 0.7 +
                   Math.sin(2 * Math.PI * currentFreq * 2 * t) * 0.2 +
                   Math.sin(2 * Math.PI * currentFreq * 3 * t) * 0.1
        } else if (instrument === 'piano') {
          // Fast decay, bright harmonics
          const decay = Math.exp(-t * 3.5)
          sample = (Math.sin(2 * Math.PI * currentFreq * t) * 0.6 +
                    Math.sin(2 * Math.PI * currentFreq * 2 * t) * 0.25 +
                    Math.sin(2 * Math.PI * currentFreq * 3 * t) * 0.15) * decay
        } else if (instrument === 'brass') {
          // Rich saw/square mix
          sample = Math.sin(2 * Math.PI * currentFreq * t) * 0.5 +
                   (Math.sin(2 * Math.PI * currentFreq * 2 * t) > 0 ? 0.25 : -0.25) +
                   Math.sin(2 * Math.PI * currentFreq * 3 * t) * 0.15
        } else {
          // Warm 90s anime synth
          sample = Math.sin(2 * Math.PI * currentFreq * t) * 0.55 +
                   Math.sin(2 * Math.PI * currentFreq * 2 * t) * 0.25 +
                   Math.sin(2 * Math.PI * currentFreq * 4 * t) * 0.12
        }

        // Sub bass layer for depth
        const subBass = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.2

        buffer[noteStartSample + s] += (sample + subBass) * env * 0.45
      }
    }
    currentTime += durSec
  }

  // Create 16-bit PCM WAV File
  const byteRate = SAMPLE_RATE * 2
  const blockAlign = 2
  const dataSize = totalSamples * 2
  const wavBuffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  wavBuffer.write('RIFF', 0)
  wavBuffer.writeUInt32LE(36 + dataSize, 4)
  wavBuffer.write('WAVE', 8)

  // fmt chunk
  wavBuffer.write('fmt ', 12)
  wavBuffer.writeUInt32LE(16, 16)
  wavBuffer.writeUInt16LE(1, 20) // PCM format
  wavBuffer.writeUInt16LE(1, 22) // Mono
  wavBuffer.writeUInt32LE(SAMPLE_RATE, 24)
  wavBuffer.writeUInt32LE(byteRate, 28)
  wavBuffer.writeUInt16LE(blockAlign, 32)
  wavBuffer.writeUInt16LE(16, 34) // 16 bits per sample

  // data chunk
  wavBuffer.write('data', 36)
  wavBuffer.writeUInt32LE(dataSize, 40)

  // Normalize and write samples
  let maxAmp = 0.0001
  for (let i = 0; i < totalSamples; i++) {
    const val = Math.abs(buffer[i])
    if (val > maxAmp) maxAmp = val
  }
  const scale = 0.85 / maxAmp

  let offset = 44
  for (let i = 0; i < totalSamples; i++) {
    const clamped = Math.max(-1.0, Math.min(1.0, buffer[i] * scale))
    const pcm = Math.floor(clamped * 32767)
    wavBuffer.writeInt16LE(pcm, offset)
    offset += 2
  }

  return wavBuffer
}

// Iconic melody score definitions
const tracks = {
  // 1. Detective Conan (Saxophone detective theme)
  conan: {
    bpm: 130,
    instrument: 'brass',
    notes: [
      { note: 'D4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'Bb4', dur: 0.5 },
      { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'F#4', dur: 0.75 }, { note: 'G4', dur: 0.25 },
      { note: 'A4', dur: 1.0 }, { note: 'D4', dur: 1.0 },
      { note: 'REST', dur: 0.25 },
      { note: 'D4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'Bb4', dur: 0.5 },
      { note: 'C5', dur: 0.5 }, { note: 'Bb4', dur: 0.5 }, { note: 'A4', dur: 0.75 }, { note: 'Bb4', dur: 0.25 },
      { note: 'G4', dur: 2.0 },
    ]
  },
  // 2. Naruto (Sadness and Sorrow)
  naruto: {
    bpm: 95,
    instrument: 'flute',
    notes: [
      { note: 'A4', dur: 1.0 }, { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 1.0 },
      { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 1.5 },
      { note: 'E4', dur: 1.0 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'C5', dur: 1.0 },
      { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 1.5 }, { note: 'A4', dur: 2.0 }
    ]
  },
  // 3. Attack on Titan (Guren no Yumiya)
  aot: {
    bpm: 138,
    instrument: 'brass',
    notes: [
      { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 1.0 },
      { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 1.0 },
      { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 1.0 },
      { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 2.0 }
    ]
  },
  // 4. One Piece (We Are!)
  onepiece: {
    bpm: 142,
    instrument: 'brass',
    notes: [
      { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
      { note: 'A4', dur: 1.0 }, { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'D4', dur: 1.0 },
      { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 1.0 }, { note: 'G4', dur: 1.5 },
      { note: 'A4', dur: 1.0 }, { note: 'C5', dur: 2.0 }
    ]
  },
  // 5. Death Note (L's Theme)
  deathnote: {
    bpm: 122,
    instrument: 'piano',
    notes: [
      { note: 'A4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 0.5 },
      { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G#4', dur: 0.5 },
      { note: 'E4', dur: 0.5 }, { note: 'G#4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 0.5 },
      { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 1.5 }
    ]
  },
  // 6. Dragon Ball Z (Cha-La Head-Cha-La)
  dragonball: {
    bpm: 140,
    instrument: 'synth',
    notes: [
      { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'D5', dur: 1.0 },
      { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'B4', dur: 1.0 },
      { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
      { note: 'A4', dur: 1.0 }, { note: 'B4', dur: 2.0 }
    ]
  },
  // 7. Hunter x Hunter (Departure!)
  hxh: {
    bpm: 136,
    instrument: 'synth',
    notes: [
      { note: 'E4', dur: 0.5 }, { note: 'F#4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 },
      { note: 'B4', dur: 1.0 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'F#4', dur: 1.0 },
      { note: 'E4', dur: 0.5 }, { note: 'B4', dur: 1.0 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 2.0 }
    ]
  },
  // 8. Demon Slayer (Gurenge)
  demonslayer: {
    bpm: 135,
    instrument: 'synth',
    notes: [
      { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
      { note: 'A4', dur: 1.0 }, { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 1.0 },
      { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 1.0 }, { note: 'A4', dur: 2.0 }
    ]
  },
  // 9. Jujutsu Kaisen (Kaikai Kitan)
  jujutsu: {
    bpm: 138,
    instrument: 'synth',
    notes: [
      { note: 'D4', dur: 0.5 }, { note: 'F4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 },
      { note: 'C5', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
      { note: 'D4', dur: 0.5 }, { note: 'F4', dur: 0.5 }, { note: 'G4', dur: 1.0 }, { note: 'A4', dur: 2.0 }
    ]
  },
  // 10. Spacetoon Digimon (أبطال الديجيتال - في فخ غريب وقعنا)
  spacetoon_digimon: {
    bpm: 126,
    instrument: 'synth',
    notes: [
      { note: 'F4', dur: 0.75 }, { note: 'G4', dur: 0.25 }, { note: 'Ab4', dur: 0.5 }, { note: 'Bb4', dur: 0.5 },
      { note: 'C5', dur: 1.0 }, { note: 'Bb4', dur: 0.5 }, { note: 'Ab4', dur: 0.5 }, { note: 'G4', dur: 1.0 },
      { note: 'F4', dur: 0.5 }, { note: 'C5', dur: 1.0 }, { note: 'Bb4', dur: 0.5 }, { note: 'Ab4', dur: 2.0 }
    ]
  },
  // 11. Spacetoon Remi (دروب ريمي - أنت الأمان)
  spacetoon_remi: {
    bpm: 88,
    instrument: 'flute',
    notes: [
      { note: 'D4', dur: 1.0 }, { note: 'E4', dur: 0.5 }, { note: 'F4', dur: 1.0 }, { note: 'G4', dur: 0.5 },
      { note: 'A4', dur: 1.5 }, { note: 'G4', dur: 0.5 }, { note: 'F4', dur: 1.0 }, { note: 'E4', dur: 0.5 },
      { note: 'D4', dur: 2.0 }, { note: 'A3', dur: 1.0 }, { note: 'D4', dur: 2.5 }
    ]
  },
  // 12. Spacetoon Hazim Al-Ra'ad (هزيم الرعد - أبرقي أرعدي)
  spacetoon_hazim: {
    bpm: 132,
    instrument: 'brass',
    notes: [
      { note: 'G4', dur: 0.5 }, { note: 'Bb4', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 1.0 },
      { note: 'Eb5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 1.0 }, { note: 'Bb4', dur: 0.5 },
      { note: 'G4', dur: 1.0 }, { note: 'D5', dur: 1.0 }, { note: 'C5', dur: 2.0 }
    ]
  },
  // 13. Grendizer (مغامرات الفضاء غرندايزر - علي علي بطل فليد)
  grendizer: {
    bpm: 130,
    instrument: 'brass',
    notes: [
      { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 1.0 },
      { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 1.0 }, { note: 'G4', dur: 0.5 },
      { note: 'E4', dur: 1.0 }, { note: 'B4', dur: 1.0 }, { note: 'A4', dur: 2.0 }
    ]
  },
  // 14. Neon Genesis Evangelion (Cruel Angel's Thesis)
  evangelion: {
    bpm: 128,
    instrument: 'synth',
    notes: [
      { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'Eb4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
      { note: 'G4', dur: 1.0 }, { note: 'F4', dur: 0.5 }, { note: 'Eb4', dur: 0.5 }, { note: 'D4', dur: 1.0 },
      { note: 'C4', dur: 0.5 }, { note: 'G4', dur: 1.0 }, { note: 'Ab4', dur: 0.5 }, { note: 'G4', dur: 2.0 }
    ]
  },
  // 15. Tokyo Ghoul (Unravel)
  tokyoghoul: {
    bpm: 134,
    instrument: 'piano',
    notes: [
      { note: 'A4', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'E5', dur: 1.0 },
      { note: 'G5', dur: 0.5 }, { note: 'F#5', dur: 0.5 }, { note: 'E5', dur: 1.0 }, { note: 'D5', dur: 0.5 },
      { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 2.0 }
    ]
  }
}

const outDir = path.resolve('public/audio/ost')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

console.log('Generating authentic anime OST audio files...')
for (const [key, config] of Object.entries(tracks)) {
  const wavBuffer = synthesizeTrack(config.notes, config.bpm, config.instrument)
  const filePath = path.join(outDir, `${key}.wav`)
  fs.writeFileSync(filePath, wavBuffer)
  console.log(`✓ Generated ${key}.wav (${(wavBuffer.length / 1024).toFixed(1)} KB)`)
}
console.log('Done! All anime OST tracks successfully generated in public/audio/ost/.')

