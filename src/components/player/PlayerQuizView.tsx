'use client'

import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  Tv,
  HelpCircle,
  Eye,
} from 'lucide-react'
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
  const isSilhouetteMode = session.activity_type === 'whos_that_character'
  const hasCommittedScore = useRef(false)

  // Question on device toggle (defaults to true if set in session settings or user preference)
  const [showOnDevice, setShowOnDevice] = useState<boolean>(() => {
    if ((session.settings as Record<string, unknown>)?.show_questions_on_device) return true
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sakura_player_show_question')
      if (saved !== null) return saved === 'true'
    }
    return true
  })

  const toggleShowOnDevice = () => {
    const next = !showOnDevice
    setShowOnDevice(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakura_player_show_question', String(next))
    }
  }

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [answeredAt, setAnsweredAt] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(currentQuestion?.time_limit_seconds || 20)

  // Reset state on question change
  useEffect(() => {
    setSelectedOptionId(null)
    setAnsweredAt(null)
    setEarnedPoints(0)
    setTimeLeft(currentQuestion?.time_limit_seconds || 20)
    hasCommittedScore.current = false
  }, [questionIndex, currentQuestion?.time_limit_seconds])

  // Commit score to database ONLY when round finishes (reveal phase starts)
  // This prevents players from learning if their answer was correct prematurely!
  useEffect(() => {
    if (isRevealPhase && earnedPoints > 0 && !hasCommittedScore.current) {
      hasCommittedScore.current = true
      supabase
        .from('session_participants')
        .update({
          score: (participant.score || 0) + earnedPoints,
        })
        .eq('id', participant.id)
        .then(() => {})
    }
  }, [isRevealPhase, earnedPoints, participant.id, participant.score, supabase])

  // Countdown timer on player device
  useEffect(() => {
    if (session.status !== 'question_active') return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [session.status, questionIndex])

  // Handle selecting an answer
  const handleSelectOption = async (optionId: string) => {
    if (selectedOptionId || isRevealPhase || session.status !== 'question_active' || timeLeft <= 0) return

    sound.playClick()
    setSelectedOptionId(optionId)
    setIsSubmitting(true)
    const now = Date.now()
    setAnsweredAt(now)

    try {
      // Find selected option
      const selectedOpt = currentQuestion?.options.find(o => o.id === optionId)
      const isCorrect = !!selectedOpt?.is_correct

      // Calculate score with speed bonus (awarded only upon reveal)
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
    } catch (err) {
      console.error('Answer submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const correctOption = currentQuestion?.options.find(o => o.is_correct)
  const userWasCorrect = selectedOptionId && selectedOptionId === correctOption?.id

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between h-full py-2 animate-fade-in">
      {/* Header with question count, on-device toggle, and timer */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-pink-300 font-bold mb-2">
          <span>{`السؤال ${questionIndex + 1} من ${questions.length}`}</span>

          <div className="flex items-center gap-2">
            {/* On-device Question & Media toggle button */}
            <button
              type="button"
              onClick={toggleShowOnDevice}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-pink-200 border border-pink-400/30 flex items-center gap-1.5 transition-colors"
              title={showOnDevice ? (isRtl ? 'إخفاء تفاصيل السؤال' : 'Compact mode') : (isRtl ? 'عرض السؤال على شاشتي' : 'Show question on screen')}
            >
              {showOnDevice ? <Smartphone size={13} className="text-pink-300" /> : <Tv size={13} className="text-pink-300" />}
              <span>{showOnDevice ? (isRtl ? 'السؤال على شاشتي 📱' : 'On Screen 📱') : (isRtl ? 'البروجكتر فقط 📽️' : 'Projector Only 📽️')}</span>
            </button>

            <span
              className={`font-mono px-3 py-1 rounded-full text-xs font-black transition-all ${
                timeLeft <= 5 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-pink-500/20 text-pink-300'
              }`}
            >
              ⏱️ {timeLeft}s
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-pink-500 to-rose-400'
            }`}
            style={{ width: `${Math.max(0, (timeLeft / (currentQuestion?.time_limit_seconds || 20)) * 100)}%` }}
          />
        </div>

        {/* Question Details on Device (when showOnDevice is active) */}
        {showOnDevice && (
          <div className="p-3.5 rounded-2xl bg-black/40 border border-pink-500/20 backdrop-blur-md mb-2 animate-fade-in">
            {/* Optional Media (Silhouette Clue / Anime Image) */}
            {currentQuestion?.media_url && (
              <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden bg-gradient-to-tr from-pink-950/40 to-purple-950/40 border border-pink-400/30 mb-3 flex items-center justify-center">
                <img
                  src={currentQuestion.media_url}
                  alt="Question Clue"
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    isSilhouetteMode && !isRevealPhase
                      ? 'brightness-0 contrast-200'
                      : 'brightness-100 contrast-100'
                  }`}
                />
                {isSilhouetteMode && !isRevealPhase && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <HelpCircle size={32} className="text-pink-300 animate-bounce" />
                  </div>
                )}
              </div>
            )}

            {/* Arabic Question Text */}
            <h3 className="text-sm sm:text-base font-bold text-white text-center leading-snug">
              {currentQuestion?.question_text_ar || currentQuestion?.question_text}
            </h3>
            {/* Optional English Subtitle */}
            {currentQuestion?.question_text && currentQuestion?.question_text !== currentQuestion?.question_text_ar && (
              <p className="text-xs text-pink-200/60 text-center mt-1">
                {currentQuestion.question_text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ANSWER CHOICES OR CONFIRMATION */}
      {!isRevealPhase ? (
        <div className="flex-1 flex flex-col justify-center">
          {selectedOptionId ? (
            /* LOCKED IN CONFIRMATION */
            <div className="text-center p-8 rounded-3xl bg-pink-950/50 border-2 border-pink-400/40 backdrop-blur-xl animate-scale-in shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/20 border border-pink-400/50 flex items-center justify-center text-pink-300 mb-4 animate-pulse">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                تم تسجيل إجابتك! 🌸
              </h3>
              <p className="text-xs text-pink-200/70">
                في انتظار انتهاء الوقت وظهور النتيجة على شاشة العرض...
              </p>
            </div>
          ) : timeLeft <= 0 ? (
            /* TIME EXPIRED BEFORE ANSWERING */
            <div className="text-center p-8 rounded-3xl bg-rose-950/40 border-2 border-rose-400/40 backdrop-blur-xl animate-scale-in shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-300 mb-4 animate-pulse">
                <Clock size={36} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                انتهى الوقت! ⏱️
              </h3>
              <p className="text-xs text-rose-200/70">
                لم يتم اختيار إجابة قبل انتهاء المؤقت. استعد للسؤال التالي!
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
                    disabled={isSubmitting || session.status !== 'question_active' || timeLeft <= 0}
                    className={`min-h-[85px] sm:min-h-[105px] rounded-2xl ${theme.bg} ${theme.hover} ${theme.active} border-2 ${theme.border} text-white shadow-xl flex flex-col items-center justify-center p-2.5 text-center transition-transform active:scale-95 disabled:opacity-50 w-full overflow-hidden`}
                  >
                    <span className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-black text-base mb-1.5 shrink-0">
                      {theme.label}
                    </span>
                    <span className="font-bold text-xs sm:text-sm leading-snug break-words max-w-full px-1">
                      {opt.text_ar || opt.text}
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
                ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                : 'bg-rose-950/60 border-rose-400 text-rose-200'
            }`}
          >
            {userWasCorrect ? (
              <>
                <CheckCircle2 size={56} className="text-emerald-400 mx-auto mb-3 animate-bounce" />
                <h3 className="text-3xl font-black text-white mb-1">
                  إجابة صحيحة! 🎉
                </h3>
                <div className="font-mono text-2xl font-bold text-emerald-300 mt-2">
                  +{earnedPoints} pts
                </div>
              </>
            ) : (
              <>
                <XCircle size={56} className="text-rose-400 mx-auto mb-3 animate-pulse" />
                <h3 className="text-3xl font-black text-white mb-1">
                  {selectedOptionId ? 'إجابة خاطئة! 💔' : 'انتهى الوقت دون إجابة! ⌛'}
                </h3>
                <p className="text-sm text-rose-200/90 mt-2 font-medium">
                  {`الإجابة الصحيحة كانت: ${correctOption?.text_ar || correctOption?.text}`}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
