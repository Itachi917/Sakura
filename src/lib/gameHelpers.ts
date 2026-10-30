import type { GameSession, SessionParticipant } from '@/types/database'

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
