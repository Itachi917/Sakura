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
  GARTIC_PHONE_PROMPTS,
  type QuizQuestionData,
  type AudioGuessQuestionData,
  type ZoomGuessQuestionData,
  type SilhouetteQuestionData,
  type EmojiRiddleData,
  type DrawingWordData,
  type GarticPhoneChain,
  type GarticPhoneTurn,
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

  // Pick drawing words for Gartic-style choice (3 words to choose from)
  const words = getDrawingWordsForSession(currentSettings)
  const shuffledChoices = shuffleArray([...words]).slice(0, 3)
  const selectedWord = shuffledChoices[0] || DRAWING_WORDS[0]

  const roundDuration = 60
  const now = Date.now()

  return {
    ...currentSettings,
    game_mode: 'draw_it_guess_it',
    question_index: roundIndex,
    drawer_id: randomDrawer?.id || null,
    drawer_nickname: randomDrawer?.nickname || 'الرسام',
    drawn_participant_ids: newDrawnIds,
    word_choices: shuffledChoices,
    drawer_has_chosen_word: false,
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
  } else if (targetActivity === 'draw_it_guess_it') {
    baseSettings.drawing_words = shuffleArray(getDrawingWordsForSession(currentSettings))
    baseSettings.round_duration = 60
  } else if (targetActivity === 'gartic_phone') {
    baseSettings.phone_phase = 'prompt'
    baseSettings.round_duration = 45
    baseSettings.current_album_index = 0
    baseSettings.chains = {}
    baseSettings.submissions = {}
  } else if (['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(targetActivity)) {
    baseSettings.quiz_questions = shuffleArray(getQuizQuestionsForActivity(targetActivity, currentSettings))
  }

  return {
    activity_type: targetActivity as ActivityType,
    settings: baseSettings,
  }
}

/**
 * Initializes a Gartic Phone game session state
 */
export function initGarticPhoneSettings(participants: SessionParticipant[]): Record<string, unknown> {
  const now = Date.now()
  const roundDuration = 45 // 45s for writing prompt
  const chains: Record<string, GarticPhoneChain> = {}

  participants.forEach((p) => {
    chains[p.id] = {
      id: `chain-${p.id}`,
      ownerId: p.id,
      ownerNickname: p.nickname,
      turns: [],
    }
  })

  return {
    game_mode: 'gartic_phone',
    phone_phase: 'prompt', // 'prompt' | 'drawing' | 'description' | 'album'
    round_duration: roundDuration,
    round_start_time: now,
    round_deadline: new Date(now + roundDuration * 1000).toISOString(),
    chains,
    submissions: {},
    current_album_index: 0,
  }
}

/**
 * Advances the Gartic Phone game to the next phase:
 * prompt -> drawing -> description -> album showcase
 */
export function advanceGarticPhonePhase(
  currentSettings: Record<string, unknown>,
  participants: SessionParticipant[]
): Record<string, unknown> {
  const phase = (currentSettings.phone_phase as string) || 'prompt'
  const chains = { ...((currentSettings.chains as Record<string, GarticPhoneChain>) || {}) }
  const submissions = (currentSettings.submissions as Record<string, string>) || {}
  const now = Date.now()
  const N = Math.max(1, participants.length)

  // Ensure every participant has a chain entry
  participants.forEach((p) => {
    if (!chains[p.id]) {
      chains[p.id] = {
        id: `chain-${p.id}`,
        ownerId: p.id,
        ownerNickname: p.nickname,
        turns: [],
      }
    }
  })

  if (phase === 'prompt') {
    // Collect prompt submissions into each chain
    participants.forEach((p, idx) => {
      const fallbackPrompt =
        GARTIC_PHONE_PROMPTS[idx % GARTIC_PHONE_PROMPTS.length]?.prompt_ar ||
        'لوفي يأكل رامن مع ناروتو في مسقط'
      const promptText = submissions[p.id] || fallbackPrompt
      const chain = chains[p.id]
      if (chain) {
        chain.turns = [
          {
            participantId: p.id,
            nickname: p.nickname,
            type: 'prompt',
            content: promptText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]
      }
    })

    const drawDuration = 70 // 70s for drawing
    return {
      ...currentSettings,
      phone_phase: 'drawing',
      round_duration: drawDuration,
      round_start_time: now,
      round_deadline: new Date(now + drawDuration * 1000).toISOString(),
      chains,
      submissions: {},
    }
  } else if (phase === 'drawing') {
    // Collect drawing submissions into each chain
    participants.forEach((p, idx) => {
      // Participant p drew for owner of chain (idx - 1 + N) % N
      const targetOwner = participants[(idx - 1 + N) % N]
      const chain = targetOwner ? chains[targetOwner.id] : null
      const drawingData = submissions[p.id] || ''

      if (chain) {
        chain.turns.push({
          participantId: p.id,
          nickname: p.nickname,
          type: 'drawing',
          content: drawingData,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      }
    })

    const descDuration = 45 // 45s for describing
    return {
      ...currentSettings,
      phone_phase: 'description',
      round_duration: descDuration,
      round_start_time: now,
      round_deadline: new Date(now + descDuration * 1000).toISOString(),
      chains,
      submissions: {},
    }
  } else if (phase === 'description') {
    // Collect description submissions into each chain
    participants.forEach((p, idx) => {
      const targetOwner = participants[(idx - (N > 2 ? 2 : 1) + N) % N]
      const chain = targetOwner ? chains[targetOwner.id] : null
      const descText =
        submissions[p.id] ||
        (targetOwner?.nickname ? `رسمة جميلة بواسطة ${targetOwner.nickname}` : 'رسمة أنمي غامضة')

      if (chain) {
        chain.turns.push({
          participantId: p.id,
          nickname: p.nickname,
          type: 'description',
          content: descText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      }
    })

    return {
      ...currentSettings,
      phone_phase: 'album',
      chains,
      submissions: {},
      current_album_index: 0,
      round_deadline: undefined,
    }
  }

  return currentSettings
}

/**
 * Determines what task a player needs to do in the current Gartic Phone phase
 */
export function getAssignedGarticTask(
  participantId: string,
  participants: SessionParticipant[],
  settings: Record<string, unknown>
): {
  phase: 'prompt' | 'drawing' | 'description' | 'album'
  targetPrompt?: string
  targetDrawing?: string
  targetOwnerNickname?: string
} {
  const phase = (settings.phone_phase as 'prompt' | 'drawing' | 'description' | 'album') || 'prompt'
  const chains = (settings.chains as Record<string, GarticPhoneChain>) || {}
  const N = Math.max(1, participants.length)
  const myIndex = participants.findIndex((p) => p.id === participantId)

  if (phase === 'drawing') {
    const targetOwner = participants[(myIndex - 1 + N) % N]
    const chain = targetOwner ? chains[targetOwner.id] : null
    const firstTurn = chain?.turns?.find((t) => t.type === 'prompt')
    return {
      phase: 'drawing',
      targetPrompt: firstTurn?.content || 'ارسم شخصية أنمي في موقف مضحك!',
      targetOwnerNickname: targetOwner?.nickname || 'زميلك',
    }
  }

  if (phase === 'description') {
    const targetOwner = participants[(myIndex - (N > 2 ? 2 : 1) + N) % N]
    const chain = targetOwner ? chains[targetOwner.id] : null
    const drawTurn = chain?.turns?.slice().reverse().find((t) => t.type === 'drawing')
    return {
      phase: 'description',
      targetDrawing: drawTurn?.content || '',
      targetOwnerNickname: targetOwner?.nickname || 'زميلك',
    }
  }

  return { phase }
}

