import type { GameSession, SessionParticipant } from '@/types/database'
import {
  DRAWING_WORDS,
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  AUDIO_GUESS_QUESTIONS,
  type QuizQuestionData,
  type AudioGuessQuestionData,
} from './gameData'

/**
 * Extracts question index from session settings JSON
 */
export function getQuestionIndex(session: GameSession | null): number {
  if (!session || !session.settings) return 0
  const settings = session.settings as Record<string, unknown>
  return typeof settings.question_index === 'number' ? settings.question_index : 0
}

/**
 * Extracts avatar emoji for a participant
 */
export function getParticipantAvatar(participant: SessionParticipant | null): string {
  if (!participant) return '🌸'
  if (participant.guest_token && participant.guest_token.length <= 4) {
    return participant.guest_token
  }
  return '🌸'
}

/**
 * Generates a valid 6-digit room PIN matching '^\d{6}$'
 */
export function generateNumericPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Prepares settings for a Draw & Guess round:
 * - Randomly picks a drawer who hasn't drawn yet in this cycle
 * - Selects the secret word and its aliases
 * - Initializes the 60-second round timer and solvers list
 */
export function prepareDrawItRound(
  session: GameSession | null,
  participants: SessionParticipant[],
  roundIndex: number
): Record<string, unknown> {
  const currentSettings = (session?.settings as Record<string, unknown>) || {}
  const drawnIds = Array.isArray(currentSettings.drawn_participant_ids)
    ? (currentSettings.drawn_participant_ids as string[])
    : []

  // Filter participants who have not drawn yet
  let available = participants.filter((p) => !drawnIds.includes(p.id))
  let newDrawnIds = drawnIds

  if (available.length === 0 && participants.length > 0) {
    // Everyone has drawn once — start a new cycle!
    available = [...participants]
    newDrawnIds = []
  }

  // Pick random drawer from available candidates
  const randomDrawer =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : participants[0] || null

  if (randomDrawer) {
    newDrawnIds = [...newDrawnIds, randomDrawer.id]
  }

  // Pick drawing word
  const wordIndex = roundIndex % DRAWING_WORDS.length
  const selectedWord = DRAWING_WORDS[wordIndex]

  const roundDuration = 60
  const now = Date.now()

  return {
    ...currentSettings,
    question_index: roundIndex,
    drawer_id: randomDrawer?.id || null,
    drawer_nickname: randomDrawer?.nickname || 'الرسام',
    drawn_participant_ids: newDrawnIds,
    drawing_word: selectedWord.word,
    drawing_word_ar: selectedWord.word_ar,
    drawing_category: selectedWord.category,
    drawing_category_ar: selectedWord.category_ar,
    drawing_aliases: selectedWord.aliases || [],
    round_start_time: now,
    round_duration: roundDuration,
    round_deadline: new Date(now + roundDuration * 1000).toISOString(),
    solved_participant_ids: [],
    revealed_word: false,
  }
}

/**
 * Skribbl-style masked hint: shows blanks with spaces,
 * and reveals letter hints as timer elapses (e.g. 50% and 75% elapsed).
 */
export function getMaskedWordHint(
  word: string,
  elapsedSeconds: number,
  totalSeconds: number
): string {
  if (!word) return '_ _ _ _ _'

  const chars = Array.from(word)
  const isArabic = /[\u0600-\u06FF]/.test(word)
  const elapsedRatio = totalSeconds > 0 ? elapsedSeconds / totalSeconds : 0

  // Reveal first letter when 50% elapsed
  // Reveal middle letter when 75% elapsed
  return chars
    .map((ch, idx) => {
      if (ch === ' ' || ch === '-' || ch === "'") return '  '
      if (idx === 0 && elapsedRatio >= 0.5) return ch
      if (idx === Math.floor(chars.length / 2) && elapsedRatio >= 0.75) return ch
      return isArabic ? 'ـ' : '_'
    })
    .join(' ')
}

/**
 * Loads quiz questions for an activity, checking session settings first,
 * then localStorage for admin customizations, and finally falling back to defaults.
 */
export function getQuizQuestionsForActivity(
  activityType: string,
  sessionSettings?: Record<string, unknown> | null
): QuizQuestionData[] {
  // 1. Session payload
  if (sessionSettings) {
    const customQs = sessionSettings.quiz_questions
    if (Array.isArray(customQs) && customQs.length > 0) {
      return customQs as QuizQuestionData[]
    }
  }

  // 2. Local storage customizations
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(`sakura_custom_questions_${activityType}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as QuizQuestionData[]
        }
      }
    } catch {}
  }

  // 3. Defaults
  if (activityType === 'whos_that_character') return WHOS_THAT_CHARACTER_QUESTIONS
  if (activityType === 'spacetoon_nostalgia') return SPACETOON_NOSTALGIA_QUESTIONS
  if (activityType === 'anime_expert_exam') return ANIME_EXPERT_EXAM_QUESTIONS
  return WHOS_THAT_CHARACTER_QUESTIONS
}

/**
 * Loads Audio Guess questions, checking session settings, localStorage, and defaults.
 */
export function getAudioQuestionsForSession(
  sessionSettings?: Record<string, unknown> | null
): AudioGuessQuestionData[] {
  if (sessionSettings) {
    const customQs = sessionSettings.audio_questions
    if (Array.isArray(customQs) && customQs.length > 0) {
      return customQs as AudioGuessQuestionData[]
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sakura_audio_guess_questions')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as AudioGuessQuestionData[]
        }
      }
    } catch {}
  }

  return AUDIO_GUESS_QUESTIONS
}
