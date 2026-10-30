'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ZoomIn,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  Eye,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { evaluateZoomGuess } from '@/lib/fuzzyMatch'
import type { ZoomGuessQuestionData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface PlayerZoomGuessViewProps {
  session: GameSession
  participant: SessionParticipant
  currentQuestion: ZoomGuessQuestionData
  questionIndex: number
  totalQuestions: number
  locale?: string
}

export default function PlayerZoomGuessView({
  session,
  participant,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: PlayerZoomGuessViewProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'

  // Guess input and status
  const [guessInput, setGuessInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSolved, setHasSolved] = useState(false)
  const [solvedPoints, setSolvedPoints] = useState(0)
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'close' | 'wrong'
    text: string
  } | null>(null)

  // Timer & Zoom stage
  // Total time default 40s (4 intervals of 10s)
  const totalSeconds = currentQuestion.total_time_seconds || 40
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const isRevealed = session.status === 'answer_reveal' || session.status === 'round_results' || session.status === 'final_results'

  // Calculate current zoom level
  // 0-10s: 4.5x, 10-20s: 3.2x, 20-30s: 2.1x, 30-40s: 1.4x, 40s+: 1.0x
  const currentInterval = Math.min(4, Math.floor(elapsedSeconds / 10))
  const zoomScales = [4.5, 3.2, 2.1, 1.4, 1.0]
  const currentZoomScale = isRevealed ? 1.0 : zoomScales[currentInterval]
  const nextZoomSeconds = isRevealed || currentInterval >= 4 ? 0 : 10 - (elapsedSeconds % 10)

  // Dynamic points: decay smoothly from 1000 to 200
  const potentialPoints = Math.max(
    200,
    Math.round(
      currentQuestion.base_points *
        Math.max(0.2, (totalSeconds - elapsedSeconds) / totalSeconds)
    )
  )

  // Reset when question changes
  useEffect(() => {
    setGuessInput('')
    setHasSolved(false)
    setSolvedPoints(0)
    setFeedback(null)
    setElapsedSeconds(0)
  }, [currentQuestion.id, questionIndex])

  // Timer interval
  useEffect(() => {
    if (hasSolved || isRevealed) return

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= totalSeconds) {
          clearInterval(timer)
          return totalSeconds
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [hasSolved, isRevealed, totalSeconds])

  // Handle Guess Submission
  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guessInput.trim() || hasSolved || isRevealed || isSubmitting) return

    setIsSubmitting(true)
    const rawGuess = guessInput.trim()

    const result = evaluateZoomGuess(
      rawGuess,
      currentQuestion.character_name,
      currentQuestion.character_name_ar,
      currentQuestion.aliases
    )

    if (result.isCorrect) {
      sound.playCorrect()
      sound.playFanfare()
      setHasSolved(true)
      setSolvedPoints(potentialPoints)
      setFeedback({
        type: 'correct',
        text: isRtl ? result.feedback_ar : result.feedback,
      })

      // Update participant score in Supabase
      try {
        const newScore = (participant.score || 0) + potentialPoints
        await supabase
          .from('session_participants')
          .update({ score: newScore })
          .eq('id', participant.id)

        // Broadcast solve event to host & projector
        const channel = supabase.channel(`game-${session.id}`)
        await channel.send({
          type: 'broadcast',
          event: 'zoom_solve',
          payload: {
            participantId: participant.id,
            nickname: participant.nickname,
            points: potentialPoints,
            elapsedSeconds,
            questionId: currentQuestion.id,
          },
        })
      } catch (err) {
        console.error('Error saving score:', err)
      }
    } else if (result.isClose) {
      sound.playClick()
      setFeedback({
        type: 'close',
        text: isRtl ? result.feedback_ar : result.feedback,
      })
    } else {
      sound.playWrong()
      setFeedback({
        type: 'wrong',
        text: isRtl ? result.feedback_ar : result.feedback,
      })
    }

    setIsSubmitting(false)
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 animate-fade-in pb-12">
      {/* ── TOP HUD: Question counter & Live Points ── */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1e0e2d]/80 border border-pink-500/20 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse" />
          <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">
            {isRtl
              ? `السؤال ${questionIndex + 1} من ${totalQuestions}`
              : `Question ${questionIndex + 1} of ${totalQuestions}`}
          </span>
        </div>

        {/* Dynamic points counter */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/30">
          <Zap size={14} className="text-amber-300 animate-bounce" />
          <span className="text-xs font-mono font-black text-amber-200">
            {hasSolved
              ? `+${solvedPoints} PTS`
              : `${potentialPoints} PTS`}
          </span>
        </div>
      </div>

      {/* ── ZOOM VIEWPORT CONTAINER ── */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-pink-400/40 bg-black shadow-2xl aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center">
        {/* The zooming image */}
        <div className="w-full h-full overflow-hidden relative flex items-center justify-center">
          <img
            src={currentQuestion.image_url}
            alt="Mystery Character"
            className="w-full h-full object-cover transition-transform duration-1000 ease-out select-none pointer-events-none"
            style={{
              transform: `scale(${currentZoomScale})`,
              transformOrigin: currentQuestion.focus_point || '50% 30%',
            }}
          />
        </div>

        {/* Ambient Corner Sakura Watermarks */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold text-pink-200 flex items-center gap-1.5 z-10">
          <ZoomIn size={12} className="text-pink-400" />
          <span>{currentZoomScale.toFixed(1)}x ZOOM</span>
        </div>

        {/* Stage / Countdown badge */}
        {!isRevealed && !hasSolved && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-pink-400/30 text-[11px] font-mono font-bold text-pink-300 flex items-center gap-1.5 z-10">
            <Clock size={12} className="text-pink-400 animate-spin" />
            <span>
              {nextZoomSeconds > 0
                ? isRtl
                  ? `تصغير خلال ${nextZoomSeconds}ث`
                  : `Zoom out in ${nextZoomSeconds}s`
                : isRtl
                ? 'كامل الصورة مكشوف'
                : 'Fully Revealed'}
            </span>
          </div>
        )}

        {/* Solved Overlay */}
        {hasSolved && (
          <div className="absolute inset-0 bg-emerald-950/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-20 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 text-3xl mb-3 shadow-lg shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">
              {isRtl ? 'إجابة عبقرية وصحيحة!' : 'Awesome Guess! Correct!'}
            </h3>
            <p className="text-emerald-300 font-mono font-black text-xl mb-2">
              +{solvedPoints} {isRtl ? 'نقطة سريعة' : 'Speed Points'}
            </p>
            <p className="text-xs text-pink-100/70 max-w-sm">
              {isRtl
                ? `الشخصية: ${currentQuestion.character_name_ar} (${currentQuestion.anime_origin_ar})`
                : `Character: ${currentQuestion.character_name} (${currentQuestion.anime_origin})`}
            </p>
          </div>
        )}

        {/* Revealed Overlay (Host revealed, if player didn't solve) */}
        {isRevealed && !hasSolved && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-5 text-center z-20">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold uppercase mb-1">
              <Eye size={12} />
              <span>{isRtl ? 'الإجابة المعتمدة' : 'Answer Revealed'}</span>
            </div>
            <h4 className="text-xl font-black text-white">
              {isRtl ? currentQuestion.character_name_ar : currentQuestion.character_name}
            </h4>
            <p className="text-xs text-pink-200/70">
              {isRtl ? currentQuestion.anime_origin_ar : currentQuestion.anime_origin}
            </p>
          </div>
        )}
      </div>

      {/* ── ZOOM PROGRESSION TRACKER ── */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-1">
        {[
          { label: isRtl ? 'زووم خارق (4.5x)' : 'Extreme (4.5x)', stage: 0 },
          { label: isRtl ? 'زووم عالٍ (3.2x)' : 'High (3.2x)', stage: 1 },
          { label: isRtl ? 'زووم متوسط (2.1x)' : 'Medium (2.1x)', stage: 2 },
          { label: isRtl ? 'زووم طفيف (1.4x)' : 'Mild (1.4x)', stage: 3 },
          { label: isRtl ? 'الصورة كاملة (1.0x)' : 'Full (1.0x)', stage: 4 },
        ].map((s) => {
          const isActive = currentInterval === s.stage && !isRevealed
          const isPassed = currentInterval > s.stage || isRevealed

          return (
            <div
              key={s.stage}
              className={`flex-1 py-1.5 px-1 rounded-xl text-center text-[10px] font-bold border transition-all ${
                isActive
                  ? 'bg-pink-500 text-white border-pink-300 shadow-lg shadow-pink-500/30 scale-105'
                  : isPassed
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/5 text-pink-200/40 border-white/5'
              }`}
            >
              <div className="truncate">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* ── FEEDBACK ALERTS ── */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all animate-shake ${
            feedback.type === 'correct'
              ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-200'
              : feedback.type === 'close'
              ? 'bg-amber-950/70 border-amber-400/60 text-amber-200 shadow-lg shadow-amber-500/20'
              : 'bg-rose-950/50 border-rose-400/40 text-rose-200'
          }`}
        >
          {feedback.type === 'correct' ? (
            <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
          ) : feedback.type === 'close' ? (
            <Zap size={24} className="text-amber-400 animate-bounce shrink-0" />
          ) : (
            <AlertCircle size={24} className="text-rose-400 shrink-0" />
          )}

          <div className="text-sm font-bold leading-snug">
            {feedback.text}
          </div>
        </div>
      )}

      {/* ── PLAYER GUESS INPUT FORM ── */}
      {!hasSolved && !isRevealed && (
        <form onSubmit={handleSubmitGuess} className="flex flex-col gap-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder={
                isRtl
                  ? 'اكتب اسم الشخصية هنا (بالعربي أو الإنجليزي)...'
                  : 'Type character name (English or Arabic)...'
              }
              autoFocus
              disabled={isSubmitting}
              className="w-full py-4 pl-4 pr-32 sm:pr-36 rounded-2xl bg-[#241334] border-2 border-pink-400/40 text-white placeholder-pink-200/40 text-base sm:text-lg font-bold focus:outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-500/20 shadow-xl transition-all"
            />

            <button
              type="submit"
              disabled={!guessInput.trim() || isSubmitting}
              className="absolute right-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
            >
              <Send size={15} />
              <span>{isRtl ? 'إرسال' : 'Guess'}</span>
            </button>
          </div>

          {/* Quick Clue Banner */}
          <div className="flex items-center justify-between text-[11px] text-pink-200/60 px-2">
            <span>
              💡 {isRtl ? currentQuestion.hint_ar : currentQuestion.hint}
            </span>
            <span className="font-mono text-pink-300">
              {isRtl ? 'السرعة تمنحك نقاطاً أكثر!' : 'Speed grants maximum score!'}
            </span>
          </div>
        </form>
      )}
    </div>
  )
}
