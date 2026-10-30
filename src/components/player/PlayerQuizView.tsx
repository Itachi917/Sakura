'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import type { QuizQuestionData } from '@/lib/gameData'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getQuestionIndex } from '@/lib/gameHelpers'

interface PlayerQuizViewProps {
  session: GameSession
  participant: SessionParticipant
  questions: QuizQuestionData[]
  locale?: string
}

const BUTTON_THEMES = [
  { id: 'opt-a', label: 'A', bg: 'bg-rose-600', hover: 'hover:bg-rose-500', active: 'active:bg-rose-700', border: 'border-rose-400' },
  { id: 'opt-b', label: 'B', bg: 'bg-blue-600', hover: 'hover:bg-blue-500', active: 'active:bg-blue-700', border: 'border-blue-400' },
  { id: 'opt-c', label: 'C', bg: 'bg-amber-600', hover: 'hover:bg-amber-500', active: 'active:bg-amber-700', border: 'border-amber-400' },
  { id: 'opt-d', label: 'D', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-500', active: 'active:bg-emerald-700', border: 'border-emerald-400' },
]

export default function PlayerQuizView({
  session,
  participant,
  questions,
  locale = 'en',
}: PlayerQuizViewProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'
  const questionIndex = getQuestionIndex(session)
  const currentQuestion = questions[questionIndex] || questions[0]
  const isRevealPhase = ['answer_reveal', 'round_results'].includes(session.status)

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [answeredAt, setAnsweredAt] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState<number>(0)

  // Reset state on question change
  useEffect(() => {
    setSelectedOptionId(null)
    setAnsweredAt(null)
    setEarnedPoints(0)
  }, [questionIndex])

  // Handle selecting an answer
  const handleSelectOption = async (optionId: string) => {
    if (selectedOptionId || isRevealPhase || session.status !== 'question_active') return

    sound.playClick()
    setSelectedOptionId(optionId)
    setIsSubmitting(true)
    const now = Date.now()
    setAnsweredAt(now)

    try {
      // Find selected option
      const selectedOpt = currentQuestion?.options.find(o => o.id === optionId)
      const isCorrect = !!selectedOpt?.is_correct

      // Calculate score with speed bonus
      let pointsAwarded = 0
      if (isCorrect) {
        pointsAwarded = currentQuestion?.points || 1000
        setEarnedPoints(pointsAwarded)
      }

      // Record answer in participant_answers
      const dummyQuestionId = '00000000-0000-0000-0000-000000000000'
      await supabase.from('participant_answers').insert({
        session_id: session.id,
        participant_id: participant.id,
        question_id: session.current_question_id || dummyQuestionId,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        submitted_at: new Date().toISOString(),
        answer_payload: { optionId, questionIndex },
      })

      // Update total score if points awarded
      if (pointsAwarded > 0) {
        await supabase
          .from('session_participants')
          .update({
            score: (participant.score || 0) + pointsAwarded,
          })
          .eq('id', participant.id)
      }
    } catch (err) {
      console.error('Answer submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const correctOption = currentQuestion?.options.find(o => o.is_correct)
  const userWasCorrect = selectedOptionId && selectedOptionId === correctOption?.id

  return (
    <div className="w-full max-w-md flex flex-col justify-between h-full py-2 animate-fade-in">
      {/* Question tracker */}
      <div className="text-center mb-4">
        <span className="text-xs uppercase tracking-wider text-pink-300/80 font-bold">
          {isRtl ? `السؤال ${questionIndex + 1} من ${questions.length}` : `Question ${questionIndex + 1} of ${questions.length}`}
        </span>
      </div>

      {/* ANSWER LOCKED OR ACTIVE CHOICES */}
      {!isRevealPhase ? (
        <div className="flex-1 flex flex-col justify-center">
          {selectedOptionId ? (
            /* LOCKED IN CONFIRMATION */
            <div className="text-center p-8 rounded-3xl bg-pink-950/40 border-2 border-pink-400/30 backdrop-blur-xl animate-scale-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300 mb-4 animate-pulse">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                {isRtl ? 'تم تثبيت إجابتك! 🌸' : 'Answer Locked In! 🌸'}
              </h3>
              <p className="text-xs text-pink-200/70">
                {isRtl
                  ? 'انتظر انتهاء المؤقت وظهور النتيجة على شاشة العرض'
                  : 'Waiting for the round timer to reveal results on the projector...'}
              </p>
            </div>
          ) : (
            /* 4 BIG TACTILE BUTTONS */
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {currentQuestion?.options.map((opt, idx) => {
                const theme = BUTTON_THEMES[idx % BUTTON_THEMES.length]
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={isSubmitting || session.status !== 'question_active'}
                    className={`h-36 sm:h-40 rounded-3xl ${theme.bg} ${theme.hover} ${theme.active} border-2 ${theme.border} text-white shadow-xl flex flex-col items-center justify-center p-3 text-center transition-transform active:scale-95 disabled:opacity-50`}
                  >
                    <span className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center font-black text-xl mb-2">
                      {theme.label}
                    </span>
                    <span className="font-bold text-sm sm:text-base leading-tight line-clamp-2">
                      {isRtl ? opt.text_ar : opt.text}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* REVEAL RESULT SCREEN */
        <div className="flex-1 flex flex-col justify-center animate-slide-up">
          <div
            className={`p-8 rounded-3xl border-2 text-center backdrop-blur-xl shadow-2xl ${
              userWasCorrect
                ? 'bg-emerald-950/50 border-emerald-400 text-emerald-200'
                : 'bg-rose-950/50 border-rose-400 text-rose-200'
            }`}
          >
            {userWasCorrect ? (
              <>
                <CheckCircle2 size={56} className="text-emerald-400 mx-auto mb-3 animate-bounce" />
                <h3 className="text-3xl font-black text-white mb-1">
                  {isRtl ? 'إجابة صحيحة! 🎉' : 'Correct! 🎉'}
                </h3>
                <div className="font-mono text-2xl font-bold text-emerald-300 mt-2">
                  +{earnedPoints} pts
                </div>
              </>
            ) : (
              <>
                <XCircle size={56} className="text-rose-400 mx-auto mb-3 animate-pulse" />
                <h3 className="text-3xl font-black text-white mb-1">
                  {isRtl ? 'إجابة خاطئة! 💔' : 'Not Quite! 💔'}
                </h3>
                <p className="text-xs text-rose-300/80 mt-2">
                  {isRtl
                    ? `الإجابة الصحيحة كانت: ${correctOption?.text_ar || correctOption?.text}`
                    : `Correct answer: ${correctOption?.text}`}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
