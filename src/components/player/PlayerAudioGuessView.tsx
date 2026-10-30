'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Music,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Sparkles,
  Headphones,
  Zap,
} from 'lucide-react'
import { sound } from '@/lib/sound'
import { createClient } from '@/lib/supabase/client'
import { evaluateZoomGuess } from '@/lib/fuzzyMatch'
import type { AudioGuessQuestionData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface PlayerAudioGuessViewProps {
  session: GameSession
  participant: SessionParticipant
  currentQuestion: AudioGuessQuestionData
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

export default function PlayerAudioGuessView({
  session,
  participant,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: PlayerAudioGuessViewProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const showOnDevice = (session.settings as Record<string, unknown>)?.show_questions_on_device !== false

  const totalSeconds = currentQuestion.total_time_seconds || 30
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [guessInput, setGuessInput] = useState('')
  const [hasSolved, setHasSolved] = useState(false)
  const [solvedPoints, setSolvedPoints] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'close' | 'wrong'; text: string } | null>(null)

  const hasCommittedScore = useRef(false)

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  const timeLeft = Math.max(0, totalSeconds - elapsedSeconds)
  const isTimeExpired = timeLeft <= 0

  // Kahoot potential points ticker
  const maxPoints = currentQuestion.base_points || 1000
  const speedRatio = Math.max(0, Math.min(1, elapsedSeconds / totalSeconds))
  const potentialPoints = Math.max(
    Math.round(maxPoints * 0.5),
    Math.round((1 - speedRatio / 2) * maxPoints)
  )

  // Reset when question changes
  useEffect(() => {
    setElapsedSeconds(0)
    setGuessInput('')
    setHasSolved(false)
    setSolvedPoints(0)
    setSelectedOptionId(null)
    setFeedback(null)
    hasCommittedScore.current = false
    setIsPlayingAudio(false)

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => {
          // Autoplay blocked by browser until user touches button
          setIsPlayingAudio(false)
        })
    }
  }, [currentQuestion.id, questionIndex])

  // Timer countdown
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

  // Commit score to database once round finishes/reveal phase starts
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

  // Toggle local audio playback
  const togglePlayAudio = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlayingAudio) {
      audio.pause()
      setIsPlayingAudio(false)
    } else {
      audio
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => {})
    }
  }

  // Handle Multiple-Choice Option Click
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

      // Broadcast solve
      try {
        await supabase.channel(`audio_stream_${session.id}`).send({
          type: 'broadcast',
          event: 'audio_solve',
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

  // Handle Freeform Text Guess
  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanGuess = guessInput.trim()
    if (!cleanGuess || hasSolved || isRevealed || isTimeExpired) return

    setGuessInput('')

    const result = evaluateZoomGuess(
      cleanGuess,
      currentQuestion.answer,
      currentQuestion.answer_ar,
      currentQuestion.aliases
    )

    if (result.isCorrect) {
      sound.playCorrect()
      sound.playFanfare()
      setHasSolved(true)
      setSolvedPoints(potentialPoints)
      setFeedback({
        type: 'correct',
        text: isRtl ? `🎉 إجابة صحيحة ورائعة! (+${potentialPoints} نقطة ⚡)` : `🎉 Awesome! (+${potentialPoints} pts ⚡)`,
      })

      // Broadcast solve
      try {
        await supabase.channel(`audio_stream_${session.id}`).send({
          type: 'broadcast',
          event: 'audio_solve',
          payload: {
            participantId: participant.id,
            nickname: participant.nickname,
            points: potentialPoints,
            elapsedSeconds,
          },
        })
      } catch {}
    } else if (result.isClose) {
      sound.playClick()
      setFeedback({
        type: 'close',
        text: isRtl ? '🔥 قريب جداً! قاربت على الإجابة!' : "🔥 Very close! You're almost there!",
      })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      sound.playWrong()
      setFeedback({
        type: 'wrong',
        text: isRtl ? '❌ تخمين غير صحيح، جرّب مجدداً' : '❌ Not quite, keep trying!',
      })
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between h-full py-2 animate-fade-in pb-12">
      {/* Hidden local audio element */}
      <audio
        ref={audioRef}
        src={currentQuestion.audio_url}
        preload="auto"
        onEnded={() => setIsPlayingAudio(false)}
        onPlay={() => setIsPlayingAudio(true)}
        onPause={() => setIsPlayingAudio(false)}
      />

      {/* ── TOP HUD: Question counter & Live Speed Points ── */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1e0e2d]/80 border border-pink-500/20 shadow-lg backdrop-blur-md mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
          <span className="text-xs uppercase tracking-wider text-pink-300 font-extrabold">
            {isRtl ? 'المقطع' : 'Track'} {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Live speed points ticker */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/30 text-amber-300 font-mono text-xs font-black">
          <Zap size={14} className="text-amber-400 animate-pulse" />
          <span>{hasSolved ? solvedPoints : potentialPoints} PTS</span>
        </div>

        {/* Live Timer */}
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

      {/* ── QUESTION CARD & INTERACTIVE AUDIO PLAYER ── */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div className="p-5 rounded-3xl bg-[#190d26]/90 border border-pink-500/25 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-3">
          {/* Animated sound equalizer bars */}
          <div className="flex items-center justify-center gap-1.5 h-10 mb-1">
            {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50].map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-gradient-to-t from-pink-500 to-rose-400 rounded-full transition-all duration-300"
                style={{
                  height: isPlayingAudio ? `${Math.max(20, (h * (1 + (i % 3) * 0.2)) % 100)}%` : '15%',
                  opacity: isPlayingAudio ? 1 : 0.35,
                }}
              />
            ))}
          </div>

          <h3 className="text-lg lg:text-xl font-black text-white leading-snug">
            {showOnDevice
              ? (isRtl ? currentQuestion.title_ar : currentQuestion.title)
              : (isRtl ? 'استمع وخمّن الأنمي صاحب هذا الأوست 🎵' : 'Listen & Guess the Anime OST 🎵')}
          </h3>

          {showOnDevice && currentQuestion.hint && (
            <p className="text-xs text-pink-200/70">
              💡 {isRtl ? currentQuestion.hint_ar : currentQuestion.hint}
            </p>
          )}

          {/* Primary High-Visibility Audio Player Button */}
          <div className="pt-2 border-t border-white/10 flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={togglePlayAudio}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 ${
                isPlayingAudio
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white ring-2 ring-pink-300 shadow-pink-500/40'
                  : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-500 text-white animate-pulse shadow-purple-600/30'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Pause size={18} />
                  <span>{isRtl ? 'إيقاف الصوت مؤقتاً ⏸️' : 'Pause Audio ⏸️'}</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <Headphones size={18} />
                  <span>{isRtl ? 'تشغيل المقطع الصوتي في هاتفي 🎧' : 'Play Track on My Phone 🎧'}</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-pink-300/70 font-mono">
              {isPlayingAudio
                ? (isRtl ? '🔊 الصوت يعمل الآن على هاتفك...' : '🔊 Audio is playing on your phone...')
                : (isRtl ? 'اضغط للاستماع إذا لم يبدأ الصوت تلقائياً 🎵' : 'Tap to play track locally 🎵')}
            </span>
          </div>
        </div>

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

        {/* ── ANSWER INPUT / MULTIPLE CHOICE ── */}
        {hasSolved ? (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/60 text-center animate-fade-in shadow-2xl">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2 animate-bounce" />
            <h4 className="font-black text-xl text-white">
              {isRtl ? 'إجابة صحيحة! 🎉' : 'Correct Answer! 🎉'}
            </h4>
            <div className="font-mono text-2xl font-black text-emerald-300 mt-1">
              +{solvedPoints} {isRtl ? 'نقطة ⚡' : 'PTS ⚡'}
            </div>
            <p className="text-xs text-pink-200/70 mt-2">
              {isRtl ? 'شاهد النتيجة على شاشة العرض واستعد للتالي!' : 'Watch the projector and get ready for next!'}
            </p>
          </div>
        ) : isRevealed || isTimeExpired ? (
          <div className="p-6 rounded-3xl bg-black/60 border border-pink-500/20 text-center">
            <span className="text-2xl mb-1 block">⌛</span>
            <h4 className="text-base font-black text-white">
              {isRtl ? 'انتهى وقت السؤال!' : "Time's Up!"}
            </h4>
            <p className="text-xs text-pink-300 font-bold mt-1">
              {isRtl
                ? `الأنمي الصحيح: ${currentQuestion.answer_ar} (${currentQuestion.answer})`
                : `The anime was: ${currentQuestion.answer}`}
            </p>
          </div>
        ) : currentQuestion.options && currentQuestion.options.length > 0 ? (
          /* Multiple Choice Options */
          <div className="grid grid-cols-2 gap-3 w-full">
            {currentQuestion.options.map((opt, idx) => {
              const theme = BUTTON_THEMES[idx % BUTTON_THEMES.length]
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={!!selectedOptionId || isTimeExpired || isRevealed}
                  className={`min-h-[80px] rounded-2xl ${theme.bg} ${theme.hover} ${theme.active} border-2 ${theme.border} text-white shadow-xl flex flex-col items-center justify-center p-2.5 text-center transition-transform active:scale-95 disabled:opacity-50`}
                >
                  <span className="w-7 h-7 rounded-full bg-black/30 flex items-center justify-center font-black text-xs mb-1">
                    {theme.label}
                  </span>
                  <span className="font-bold text-xs sm:text-sm leading-snug break-words">
                    {isRtl ? opt.text_ar || opt.text : opt.text}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          /* Freeform Text Guess */
          <form onSubmit={handleSubmitGuess} className="flex gap-2">
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder={isRtl ? 'اكتب اسم الأنمي هنا...' : 'Type anime name here...'}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[rgba(15,8,22,0.7)] border-2 border-[rgba(244,167,197,0.3)] focus:border-[var(--sakura-pink)] text-white text-sm focus:outline-none"
              autoComplete="off"
              disabled={isTimeExpired || isRevealed}
            />
            <button
              type="submit"
              disabled={!guessInput.trim() || isTimeExpired || isRevealed}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send size={16} className={isRtl ? 'rotate-180' : ''} />
              <span>{isRtl ? 'إرسال' : 'Guess'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

