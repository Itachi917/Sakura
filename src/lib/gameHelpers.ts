import type { GameSession, SessionParticipant, ActivityType } from '@/types/database'
import {
  DRAWING_WORDS,
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  AUDIO_GUESS_QUESTIONS,
  ZOOM_GUESS_QUESTIONS,
  SILHOUETTE_QUESTIONS,
  EMOJI_RIDDLE_QUESTIONS,
  LIVE_POLL_QUESTIONS,
  type QuizQuestionData,
  type AudioGuessQuestionData,
  type ZoomGuessQuestionData,
  type SilhouetteQuestionData,
  type EmojiRiddleData,
  type LivePollData,
  type DrawingWordData,
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
 * Shuffles an array in random order using Fisher-Yates algorithm.
 * Guarantees fair permutation with zero duplicates.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
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

  // Pick drawing word from session settings or custom words
  const words = getDrawingWordsForSession(currentSettings)
  const wordIndex = roundIndex % (words.length || 1)
  const selectedWord = words[wordIndex] || DRAWING_WORDS[0]

  const roundDuration = 60
  const now = Date.now()

  return {
    ...currentSettings,
    game_mode: 'draw_it_guess_it',
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

/**
 * Loads Zoom & Guess questions
 */
export function getZoomQuestionsForSession(
  sessionSettings?: Record<string, unknown> | null
): ZoomGuessQuestionData[] {
  if (sessionSettings) {
    const customQs = sessionSettings.zoom_questions
    if (Array.isArray(customQs) && customQs.length > 0) {
      return customQs as ZoomGuessQuestionData[]
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sakura_zoom_guess_questions')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as ZoomGuessQuestionData[]
        }
      }
    } catch {}
  }

  return ZOOM_GUESS_QUESTIONS
}

/**
 * Loads Silhouette Guess questions
 */
export function getSilhouetteQuestionsForSession(
  sessionSettings?: Record<string, unknown> | null
): SilhouetteQuestionData[] {
  if (sessionSettings) {
    const customQs = sessionSettings.silhouette_questions
    if (Array.isArray(customQs) && customQs.length > 0) {
      return customQs as SilhouetteQuestionData[]
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sakura_silhouette_questions')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as SilhouetteQuestionData[]
        }
      }
    } catch {}
  }

  return SILHOUETTE_QUESTIONS
}

/**
 * Loads Anime Emoji Riddle questions
 */
export function getEmojiRiddleQuestionsForSession(
  sessionSettings?: Record<string, unknown> | null
): EmojiRiddleData[] {
  if (sessionSettings) {
    const customQs = sessionSettings.emoji_questions
    if (Array.isArray(customQs) && customQs.length > 0) {
      return customQs as EmojiRiddleData[]
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sakura_emoji_questions')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as EmojiRiddleData[]
        }
      }
    } catch {}
  }

  return EMOJI_RIDDLE_QUESTIONS
}

/**
 * Loads Live Audience Poll questions
 */
export function getLivePollQuestionsForSession(
  sessionSettings?: Record<string, unknown> | null
): LivePollData[] {
  if (sessionSettings) {
    const customQs = sessionSettings.poll_questions
    if (Array.isArray(customQs) && customQs.length > 0) {
      return customQs as LivePollData[]
    }
  }

  return LIVE_POLL_QUESTIONS
}

/**
 * Loads Draw & Guess words, checking session settings, localStorage, and defaults.
 */
export function getDrawingWordsForSession(
  sessionSettings?: Record<string, unknown> | null
): DrawingWordData[] {
  if (sessionSettings) {
    const customWords = sessionSettings.drawing_words
    if (Array.isArray(customWords) && customWords.length > 0) {
      return customWords as DrawingWordData[]
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sakura_draw_words')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as DrawingWordData[]
        }
      }
    } catch {}
  }

  return DRAWING_WORDS
}

/**
 * Seamlessly transitions an existing live session to a new game mode
 * WITHOUT regenerating room PIN or kicking connected participants!
 * All questions are fairly shuffled using Fisher-Yates to prevent repeats.
 */
export function prepareGameSwitchSettings(
  targetActivity: ActivityType | string,
  currentSettings?: Record<string, unknown> | null
): {
  activity_type: ActivityType
  settings: Record<string, unknown>
} {
  const showOnDevice = currentSettings?.show_questions_on_device !== false

  const baseSettings: Record<string, unknown> = {
    question_index: 0,
    game_mode: targetActivity,
    show_questions_on_device: showOnDevice,
  }

  if (targetActivity === 'audio_guess') {
    baseSettings.audio_questions = shuffleArray(getAudioQuestionsForSession(currentSettings))
  } else if (targetActivity === 'zoom_guess') {
    baseSettings.zoom_questions = shuffleArray(getZoomQuestionsForSession(currentSettings))
  } else if (targetActivity === 'silhouette_guess') {
    baseSettings.silhouette_questions = shuffleArray(getSilhouetteQuestionsForSession(currentSettings))
  } else if (targetActivity === 'emoji_riddle') {
    baseSettings.emoji_questions = shuffleArray(getEmojiRiddleQuestionsForSession(currentSettings))
  } else if (targetActivity === 'live_poll') {
    baseSettings.poll_questions = shuffleArray(getLivePollQuestionsForSession(currentSettings))
    baseSettings.poll_votes = {}
  } else if (targetActivity === 'draw_it_guess_it') {
    baseSettings.drawing_words = shuffleArray(getDrawingWordsForSession(currentSettings))
    baseSettings.round_duration = 60
  } else if (['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(targetActivity)) {
    baseSettings.quiz_questions = shuffleArray(getQuizQuestionsForActivity(targetActivity, currentSettings))
  }

  return {
    activity_type: targetActivity as ActivityType,
    settings: baseSettings,
  }
}
