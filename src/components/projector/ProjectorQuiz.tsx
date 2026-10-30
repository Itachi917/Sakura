'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, XCircle, Sparkles, HelpCircle } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import type { QuizQuestionData } from '@/lib/gameData'
import { sound } from '@/lib/sound'
import { getQuestionIndex } from '@/lib/gameHelpers'

interface ProjectorQuizProps {
  session: GameSession
  participants: SessionParticipant[]
  questions: QuizQuestionData[]
  locale?: string
}

const OPTION_THEMES = [
  { letter: 'A', bg: 'bg-rose-500/15', border: 'border-rose-400/40', text: 'text-rose-300', dot: 'bg-rose-500' },
  { letter: 'B', bg: 'bg-blue-500/15', border: 'border-blue-400/40', text: 'text-blue-300', dot: 'bg-blue-500' },
  { letter: 'C', bg: 'bg-amber-500/15', border: 'border-amber-400/40', text: 'text-amber-300', dot: 'bg-amber-500' },
  { letter: 'D', bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', text: 'text-emerald-300', dot: 'bg-emerald-500' },
]

export default function ProjectorQuiz({
  session,
  participants,
  questions,
  locale = 'en',
}: ProjectorQuizProps) {
  const isRtl = locale === 'ar'
  const questionIndex = getQuestionIndex(session)
  const currentQuestion = questions[questionIndex] || questions[0]
  const isRevealPhase = ['answer_reveal', 'round_results'].includes(session.status)
  const isSilhouetteMode = session.activity_type === 'whos_that_character'

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(currentQuestion?.time_limit_seconds || 20)

  useEffect(() => {
    setTimeLeft(currentQuestion?.time_limit_seconds || 20)
  }, [questionIndex, currentQuestion?.time_limit_seconds])

  useEffect(() => {
    if (session.status !== 'question_active') return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        if (prev <= 5) {
          sound.playTick(true)
        } else if (prev <= 10) {
          sound.playTick(false)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [session.status, questionIndex])

  if (!currentQuestion) return null

  const timerPct = Math.max(0, Math.min(100, (timeLeft / (currentQuestion.time_limit_seconds || 20)) * 100))

  return (
    <div className="w-full max-w-6xl flex flex-col items-center justify-between gap-6 py-2 animate-fade-in">
      {/* Top Meta Header: Question counter & Circular Timer */}
      <div className="w-full flex items-center justify-between px-4">
        {/* Question Counter Badge */}
        <div className="flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-sm font-extrabold tracking-wide">
            {isRtl ? `السؤال ${questionIndex + 1} من ${questions.length}` : `Question ${questionIndex + 1} of ${questions.length}`}
          </span>
          <span className="text-xs text-pink-200/50 font-medium">
            +{currentQuestion.points} {isRtl ? 'نقطة' : 'pts'}
          </span>
        </div>

        {/* Dynamic Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/10"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`transition-all duration-1000 ${
                  timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-amber-400' : 'text-pink-400'
                }`}
                strokeDasharray={`${timerPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span
              className={`absolute font-mono text-xl font-black ${
                timeLeft <= 5 ? 'text-red-400 animate-ping' : 'text-white'
              }`}
            >
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Main Question Display Box */}
      <div className="w-full p-6 sm:p-8 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center gap-8">
        {/* Optional Media (Silhouette Image for Who's That Character or Spacetoon Retro Frame) */}
        {currentQuestion.media_url && (
          <div className="shrink-0 relative w-60 h-60 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-gradient-to-tr from-pink-950/40 to-purple-950/40 border-2 border-pink-400/30 shadow-xl flex items-center justify-center">
            {/* The Image with dynamic reveal transition */}
            <img
              src={currentQuestion.media_url}
              alt="Question Clue"
              className={`w-full h-full object-cover transition-all duration-1000 ${
                isSilhouetteMode && !isRevealPhase
                  ? 'brightness-0 contrast-200'
                  : 'brightness-100 contrast-100'
              }`}
            />
            {isSilhouetteMode && !isRevealPhase && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                <HelpCircle size={48} className="text-pink-300/70 animate-bounce" />
              </div>
            )}
            {isSilhouetteMode && isRevealPhase && (
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-pink-500 text-white font-bold text-xs uppercase shadow-md animate-scale-in">
                REVEALED!
              </div>
            )}
          </div>
        )}

        {/* Question Text */}
        <div className="flex-1 text-center md:text-start">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-4">
            {isRtl ? currentQuestion.question_text_ar : currentQuestion.question_text}
          </h2>
          {/* Secondary language subtitle */}
          <p className="text-sm sm:text-base text-pink-200/60 font-medium leading-relaxed">
            {isRtl ? currentQuestion.question_text : currentQuestion.question_text_ar}
          </p>
        </div>
      </div>

      {/* Answer Options Grid (2x2) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQuestion.options.map((option, idx) => {
          const theme = OPTION_THEMES[idx % OPTION_THEMES.length]
          const isCorrect = option.is_correct

          let cardStyle = `${theme.bg} ${theme.border} text-white`
          if (isRevealPhase) {
            if (isCorrect) {
              cardStyle = 'bg-emerald-500/25 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
            } else {
              cardStyle = 'opacity-35 bg-black/30 border-white/5 text-gray-400'
            }
          }

          return (
            <div
              key={option.id}
              className={`flex items-center gap-4 p-5 sm:p-6 rounded-2xl border-2 backdrop-blur-md transition-all duration-500 ${cardStyle}`}
            >
              {/* Option Letter Tag */}
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${
                  isRevealPhase && isCorrect
                    ? 'bg-emerald-500 text-white shadow-md'
                    : `${theme.dot} text-white`
                }`}
              >
                {isRevealPhase && isCorrect ? <CheckCircle2 size={24} /> : theme.letter}
              </div>

              {/* Option Text */}
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold truncate">
                  {isRtl ? option.text_ar : option.text}
                </div>
                <div className="text-xs sm:text-sm text-pink-200/50 truncate">
                  {isRtl ? option.text : option.text_ar}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Answer Reveal Explanation Card */}
      {isRevealPhase && (currentQuestion.explanation || currentQuestion.explanation_ar) && (
        <div className="w-full p-5 rounded-2xl bg-pink-950/40 border border-pink-400/30 backdrop-blur-md animate-slide-up flex items-start gap-3 shadow-xl">
          <Sparkles size={24} className="text-pink-300 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-pink-300 block mb-1">
              {isRtl ? 'المعلومة الكاملة والتفسير:' : 'Fact & Explanation:'}
            </span>
            <p className="text-sm sm:text-base text-pink-100 font-medium">
              {isRtl ? currentQuestion.explanation_ar : currentQuestion.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
