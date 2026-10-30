'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, Send, CheckCircle2, Zap } from 'lucide-react'
import { sound } from '@/lib/sound'
import { createClient } from '@/lib/supabase/client'
import { evaluateZoomGuess } from '@/lib/fuzzyMatch'
import type { EmojiRiddleData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface PlayerEmojiRiddleViewProps {
  session: GameSession
  participant: SessionParticipant
  currentQuestion: EmojiRiddleData
  questionIndex: number
  totalQuestions: number
  locale?: string
}

const BUTTON_THEMES = [
  { bg: 'bg-rose-600', hover: 'hover:bg-rose-500', active: 'active:bg-rose-700', border: 'border-rose-400', label: '▲' },
  { bg: 'bg-blue-600', hover: 'hover:bg-blue-500', active: 'active:bg-blue-700', border: 'border-blue-400', label: '◆' },
  { bg: 'bg-amber-600', hover: 'hover:bg-amber-500', active: 'active:bg-amber-700', border: 'border-amber-400', label: '●' },
  { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-500', active: 'active:bg-emerald-700', border: 'border-emerald-400', label: '■' },
]

export default function PlayerEmojiRiddleView({
  session,
  participant,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: PlayerEmojiRiddleViewProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()

  const showOnDevice = (session.settings as Record<string, unknown>)?.show_questions_on_device !== false
  const totalSeconds = currentQuestion.total_time_seconds || 20

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [guessInput, setGuessInput] = useState('')
  const [hasSolved, setHasSolved] = useState(false)
  const [solvedPoints, setSolvedPoints] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'close' | 'wrong'; text: string } | null>(null)

  const hasCommittedScore = useRef(false)

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  const timeLeft = Math.max(0, totalSeconds - elapsedSeconds)
  const isTimeExpired = timeLeft === 0

  const speedRatio = Math.max(0, Math.min(1, elapsedSeconds / totalSeconds))
  const maxPoints = currentQuestion.base_points || 1000
  const potentialPoints = Math.max(
    Math.round(maxPoints * 0.5),
    Math.round((1 - speedRatio / 2) * maxPoints)
  )

  useEffect(() => {
    setElapsedSeconds(0)
    setGuessInput('')
    setHasSolved(false)
    setSolvedPoints(0)
    setSelectedOptionId(null)
    setFeedback(null)
    hasCommittedScore.current = false
  }, [currentQuestion.id, questionIndex])

  useEffect(() => {
    if (hasSolved || isRevealed) return

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= totalSeconds - 1) {
          clearInterval(timer)
          return totalSeconds
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [hasSolved, isRevealed, totalSeconds])

  useEffect(() => {
    if (isRevealed && hasSolved && solvedPoints > 0 && !hasCommittedScore.current) {
      hasCommittedScore.current = true
      supabase
        .from('session_participants')
        .update({ score: (participant.score || 0) + solvedPoints })
        .eq('id', participant.id)
        .then(() => {})
    }
  }, [isRevealed, hasSolved, solvedPoints, participant.id, participant.score, supabase])

  const handleSelectOption = async (optionId: string) => {
    if (selectedOptionId || hasSolved || isRevealed || isTimeExpired) return
    sound.playClick()
    setSelectedOptionId(optionId)

    const opt = currentQuestion.options?.find((o) => o.id === optionId)
    const isCorrect = !!opt?.is_correct

    if (isCorrect) {
      sound.playCorrect()
      sound.playFanfare()
      setHasSolved(true)
      setSolvedPoints(potentialPoints)
      setFeedback({
        type: 'correct',
        text: isRtl ? `🎉 إجابة صحيحة! (+${potentialPoints} نقطة ⚡)` : `🎉 Correct! (+${potentialPoints} pts ⚡)`,
      })

      try {
        await supabase.channel(`emoji_stream_${session.id}`).send({
          type: 'broadcast',
          event: 'emoji_solve',
          payload: {
            participantId: participant.id,
            nickname: participant.nickname,
            points: potentialPoints,
            elapsedSeconds,
          },
        })
      } catch {}
    } else {
      sound.playWrong()
      setFeedback({
        type: 'wrong',
        text: isRtl ? '❌ إجابة خاطئة!' : '❌ Incorrect choice!',
      })
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guessInput.trim() || hasSolved || isRevealed || isTimeExpired) return

    const result = evaluateZoomGuess(
      guessInput,
      currentQuestion.answer,
      currentQuestion.answer_ar,
      currentQuestion.aliases || []
    )

    if (result.isCorrect) {
      sound.playCorrect()
      sound.playFanfare()
      setHasSolved(true)
      setSolvedPoints(potentialPoints)
      setFeedback({
        type: 'correct',
        text: isRtl ? `🎉 أحسنت! (+${potentialPoints} نقطة ⚡)` : `🎉 Brilliant! (+${potentialPoints} pts ⚡)`,
      })

      try {
        await supabase.channel(`emoji_stream_${session.id}`).send({
          type: 'broadcast',
          event: 'emoji_solve',
          payload: {
            participantId: participant.id,
            nickname: participant.nickname,
            points: potentialPoints,
            elapsedSeconds,
          },
        })
      } catch {}
    } else if (result.isClose) {
      sound.playTick(true)
      setFeedback({
        type: 'close',
        text: isRtl ? '🔥 قريب جداً! قاربت على الحل!' : "🔥 Very close! Keep going!",
      })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      sound.playWrong()
      setFeedback({
        type: 'wrong',
        text: isRtl ? '❌ تخمين غير صحيح، جرّب مجدداً' : '❌ Not quite, keep guessing!',
      })
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between h-full py-2 animate-fade-in pb-12">
      {/* ── TOP HUD ── */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1e0e2d]/80 border border-pink-500/20 shadow-lg backdrop-blur-md mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
          <span className="text-xs uppercase tracking-wider text-pink-300 font-extrabold">
            {isRtl ? 'اللغز' : 'Riddle'} {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/30 text-amber-300 font-mono text-xs font-black">
          <Zap size={14} className="text-amber-400 animate-pulse" />
          <span>{hasSolved ? solvedPoints : potentialPoints} PTS</span>
        </div>

        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-xl border font-mono text-xs font-bold ${
            timeLeft <= 5 && !isRevealed
              ? 'bg-rose-500/30 border-rose-500 text-rose-200 animate-pulse'
              : 'bg-white/5 border-white/10 text-pink-200'
          }`}
        >
          <Clock size={13} />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* ── EMOJIS CARD OR PROJECTOR NOTICE ── */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {!showOnDevice ? (
          <div className="p-6 rounded-3xl bg-[#190d26]/90 border border-pink-500/20 text-center shadow-2xl">
            <span className="text-4xl mb-3 block animate-bounce">🎭</span>
            <h3 className="text-xl font-black text-white">
              {isRtl ? 'انظر لشاشة العرض لقراءة رموز الإيموجي 📽️' : 'Watch the projector screen for emojis! 📽️'}
            </h3>
            <p className="text-xs text-pink-200/70 mt-1">
              {isRtl ? 'خمّن الأنمي المستهدف بأسرع ما يمكن!' : 'Decipher the anime riddle as fast as possible!'}
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#190d26]/90 border border-pink-500/20 text-center shadow-2xl relative">
            <span className="text-xs uppercase tracking-widest text-pink-300/80 font-bold mb-2 block">
              {isRtl ? 'خمّن الأنمي من الرموز:' : 'Guess from these emojis:'}
            </span>
            <div className="text-5xl my-4 tracking-widest animate-bounce">
              {currentQuestion.emojis}
            </div>
            <p className="text-xs text-pink-200/80 mt-2 font-bold">
              💡 {isRtl ? currentQuestion.hint_ar : currentQuestion.hint}
            </p>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl border text-center text-xs font-bold animate-scale-in shadow-lg ${
              feedback.type === 'correct'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : feedback.type === 'close'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-rose-500/20 border-rose-400 text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Success Banner */}
        {hasSolved && !isRevealed && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-center animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
            <span className="text-sm font-black text-emerald-200 block">
              {isRtl ? 'تم حل لغز الإيموجي بنجاح! 🎉' : 'Emoji Riddle Decoded! 🎉'}
            </span>
            <span className="text-xs text-emerald-300/80">
              {isRtl ? 'انتظر انتهاء المؤقت لاحتساب نقاطك في الترتيب العام' : 'Score will be added upon reveal'}
            </span>
          </div>
        )}
      </div>

      {/* ── ANSWER INPUT ── */}
      <div className="mt-auto pt-3">
        {currentQuestion.options && currentQuestion.options.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const theme = BUTTON_THEMES[idx % BUTTON_THEMES.length]
              const isSelected = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={!!selectedOptionId || hasSolved || isRevealed || isTimeExpired}
                  className={`p-4 rounded-2xl font-bold text-white text-xs sm:text-sm border-2 transition-all flex items-center justify-center gap-2 min-h-[64px] shadow-lg active:scale-95 ${
                    isSelected ? 'ring-4 ring-white scale-105' : ''
                  } ${theme.bg} ${theme.hover} ${theme.border} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="opacity-70 font-mono">{theme.label}</span>
                  <span>{showOnDevice ? (isRtl ? opt.text_ar : opt.text) : theme.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder={isRtl ? 'اكتب اسم الأنمي هنا...' : 'Type anime name here...'}
              disabled={hasSolved || isRevealed || isTimeExpired}
              className="flex-1 p-3.5 rounded-2xl bg-black/60 border border-pink-400/40 text-white placeholder-pink-300/40 text-xs sm:text-sm font-bold focus:outline-none focus:border-pink-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!guessInput.trim() || hasSolved || isRevealed || isTimeExpired}
              className="px-5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-bold flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all shadow-lg"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
