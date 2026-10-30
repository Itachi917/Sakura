'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { Palette, MessageSquare, Clock, Sparkles, CheckCircle2, Trophy } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getMaskedWordHint, prepareDrawItRound } from '@/lib/gameHelpers'

interface ProjectorDrawProps {
  session: GameSession
  participants: SessionParticipant[]
  locale?: string
}

interface StrokeData {
  prevX: number
  prevY: number
  currX: number
  currY: number
  color: string
  size: number
}

interface GuessMessage {
  id: string
  nickname: string
  text: string
  isCorrect: boolean
  points?: number
  timestamp: string
}

interface RoundSolver {
  participantId?: string
  nickname: string
  points: number
  elapsedSeconds: number
}

export default function ProjectorDraw({
  session,
  participants,
  locale = 'en',
}: ProjectorDrawProps) {
  const isRtl = locale === 'ar'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const supabase = createClient()

  const settings = useMemo(
    () => (session.settings as Record<string, unknown>) || {},
    [session.settings]
  )

  const drawerId = (settings.drawer_id as string) || null
  const drawerNickname = (settings.drawer_nickname as string) || (isRtl ? 'الرسّام' : 'Drawer')
  const secretWord = (settings.drawing_word as string) || 'Kunai'
  const secretWordAr = (settings.drawing_word_ar as string) || 'كوناي'
  const category = (settings.drawing_category as string) || 'Ninja Weapon'
  const categoryAr = (settings.drawing_category_ar as string) || 'سلاح نينجا'
  const roundDuration = typeof settings.round_duration === 'number' ? settings.round_duration : 60
  const roundDeadline = settings.round_deadline as string | undefined

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  // Guessers count
  const totalGuessers = Math.max(1, participants.filter((p) => p.id !== drawerId).length)

  // Timer calculation
  const calculateTimeLeft = () => {
    if (!roundDeadline) return roundDuration
    const diff = Math.ceil((new Date(roundDeadline).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(roundDuration, diff))
  }

  const [timeLeft, setTimeLeft] = useState<number>(calculateTimeLeft)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [guesses, setGuesses] = useState<GuessMessage[]>([])
  const [solvers, setSolvers] = useState<RoundSolver[]>([])

  // Ensure drawer is initialized if missing
  useEffect(() => {
    if (session.status === 'question_active' && !drawerId && participants.length > 0) {
      const newSettings = prepareDrawItRound(session, participants, 0)
      supabase
        .from('game_sessions')
        .update({
          settings: newSettings as unknown as import('@/types/database').Json,
        })
        .eq('id', session.id)
        .then(() => {})
    }
  }, [session.status, drawerId, participants, session.id, supabase])

  // Clear Canvas helper
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1c1026'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Draw incoming stroke
  const drawStroke = (stroke: StrokeData) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(stroke.prevX * canvas.width, stroke.prevY * canvas.height)
    ctx.lineTo(stroke.currX * canvas.width, stroke.currY * canvas.height)
    ctx.stroke()
  }

  // Reset when a new round / word starts
  useEffect(() => {
    clearCanvas()
    setGuesses([])
    setSolvers([])
    setElapsedSeconds(0)
    setTimeLeft(calculateTimeLeft())
  }, [settings.round_start_time, settings.drawing_word])

  // Working Countdown Timer
  useEffect(() => {
    if (isRevealed) return

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      setElapsedSeconds(roundDuration - remaining)

      // Audio cues for urgency
      if (remaining <= 5 && remaining > 0) {
        sound.playTick()
      }

      // Time expired
      if (remaining <= 0) {
        clearInterval(timer)
        sound.playBuzzer()
        // Automatically transition to reveal
        supabase
          .from('game_sessions')
          .update({ status: 'answer_reveal' })
          .eq('id', session.id)
          .then(() => {})
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [roundDeadline, isRevealed, session.id, roundDuration])

  // Realtime Drawing & Guess stream subscription
  useEffect(() => {
    const channel = supabase
      .channel(`draw_stream_${session.id}`)
      .on('broadcast', { event: 'draw_stroke' }, (payload) => {
        drawStroke(payload.payload)
      })
      .on('broadcast', { event: 'clear_canvas' }, () => {
        clearCanvas()
      })
      .on('broadcast', { event: 'new_guess' }, (payload) => {
        const guess = payload.payload as GuessMessage
        setGuesses((prev) => [guess, ...prev.slice(0, 30)])

        if (guess.isCorrect) {
          sound.playCorrect()
          sound.playFanfare()

          setSolvers((prev) => {
            if (prev.some((s) => s.nickname === guess.nickname)) return prev
            const newSolvers = [
              ...prev,
              {
                nickname: guess.nickname,
                points: guess.points || 400,
                elapsedSeconds,
              },
            ]

            // If all guessers have solved, finish round early!
            if (newSolvers.length >= totalGuessers && totalGuessers > 0) {
              setTimeout(() => {
                supabase
                  .from('game_sessions')
                  .update({ status: 'answer_reveal' })
                  .eq('id', session.id)
                  .then(() => {})
              }, 1200)
            }

            return newSolvers
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, elapsedSeconds, totalGuessers, supabase])

  // Word hint string
  const activeWord = isRtl ? secretWordAr : secretWord
  const maskedHint = getMaskedWordHint(activeWord, elapsedSeconds, roundDuration)

  return (
    <div className="w-full max-w-6xl flex flex-col items-center gap-5 py-2 animate-fade-in">
      {/* ── TOP HUD: Drawer, Word Hint, Category & Functional Timer ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-3xl bg-[#1a0f28]/90 border border-pink-500/20 backdrop-blur-xl shadow-2xl">
        {/* Drawer Profile & Category */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-600/30 border border-pink-400/40 flex items-center justify-center text-pink-300 shadow-lg">
            <Palette size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-pink-300/80 font-bold">
                {isRtl ? 'الرسّام الحالي:' : 'Current Drawer:'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-xs font-black">
                {drawerNickname}
              </span>
            </div>
            <div className="text-xs text-purple-300/80 mt-0.5 flex items-center gap-1.5">
              <span>🏷️</span>
              <span className="font-semibold">{isRtl ? categoryAr : category}</span>
              <span className="text-pink-400/50">({isRtl ? category : categoryAr})</span>
            </div>
          </div>
        </div>

        {/* Word Mask / Secret Word Reveal */}
        <div className="text-center px-4 py-2 rounded-2xl bg-black/40 border border-pink-500/15">
          <span className="text-[11px] uppercase tracking-wider text-pink-300/80 font-bold block mb-1">
            {isRevealed
              ? isRtl ? 'الكلمة المطلوبة كانت 🎉' : 'The Secret Word Was 🎉'
              : isRtl ? 'خمّن الكلمة 💡' : 'Guess the Word 💡'}
          </span>
          {isRevealed ? (
            <div className="flex items-center justify-center gap-2 animate-scale-in">
              <span className="font-bold text-2xl lg:text-3xl text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                {secretWordAr}
              </span>
              <span className="text-lg lg:text-xl text-pink-300 font-semibold">
                ({secretWord})
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl lg:text-3xl font-black tracking-[0.3em] text-white">
                {maskedHint}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-pink-200/70 font-mono">
                {activeWord.replace(/[\s-]/g, '').length} {isRtl ? 'أحرف' : 'letters'}
              </span>
            </div>
          )}
        </div>

        {/* Working Live Timer */}
        <div
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border transition-all ${
            timeLeft <= 10 && !isRevealed
              ? 'bg-rose-500/25 border-rose-500/60 text-rose-200 animate-pulse scale-105 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'bg-pink-500/15 border-pink-400/30 text-pink-200 shadow-md'
          }`}
        >
          <Clock size={22} className={timeLeft <= 10 && !isRevealed ? 'text-rose-400' : 'text-pink-300'} />
          <div className="flex flex-col">
            <span className="font-mono text-2xl font-black tracking-wider leading-none">
              {timeLeft}s
            </span>
            <span className="text-[10px] text-pink-300/70 uppercase font-semibold">
              {isRevealed ? (isRtl ? 'انتهت' : 'Ended') : (isRtl ? 'متبقي' : 'Left')}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN STAGE: Canvas Display (Left) + Skribbl Chat Feed (Right) ── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Display */}
        <div className="lg:col-span-2 aspect-[4/3] rounded-3xl overflow-hidden border-2 border-pink-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-[#1c1026] relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full object-contain"
          />

          {/* Reveal Overlay on Canvas */}
          {isRevealed && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between backdrop-blur-[2px] animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>
                  {isRtl
                    ? `انتهت الجولة! الكلمة: ${secretWordAr} (${secretWord})`
                    : `Round Ended! The word was ${secretWord}`}
                </span>
              </div>
              <div className="text-xs text-pink-200 font-medium">
                {solvers.length} / {totalGuessers} {isRtl ? 'نجحوا في التخمين' : 'guessed correctly'}
              </div>
            </div>
          )}
        </div>

        {/* Live Guess Ticker / Skribbl Chat Feed */}
        <div className="h-[460px] rounded-3xl bg-[#1a0f28]/90 border border-pink-500/20 p-5 flex flex-col backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between text-pink-300 font-bold text-sm uppercase tracking-wider mb-3 border-b border-pink-500/15 pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span>{isRtl ? 'تخمينات اللاعبين الحية' : 'Live Player Guesses'}</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {solvers.length} / {totalGuessers}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none flex flex-col-reverse">
            {guesses.length > 0 ? (
              guesses.map((g) => (
                <div
                  key={g.id}
                  className={`p-3 rounded-2xl border text-sm transition-all animate-slide-up ${
                    g.isCorrect
                      ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border-emerald-400/60 text-emerald-200 font-bold shadow-lg shadow-emerald-900/20'
                      : 'bg-white/5 border-white/10 text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs opacity-75 mb-1">
                    <span className="font-bold text-pink-300 flex items-center gap-1">
                      {g.isCorrect ? '🌟' : '💬'} {g.nickname}
                    </span>
                    <span className="text-[10px] text-pink-200/50">{g.timestamp}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {g.isCorrect ? (
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        {isRtl ? 'خمّن الكلمة بنجاح!' : 'Guessed the word!'}
                        {g.points ? ` (+${g.points})` : ''}
                      </span>
                    ) : (
                      g.text
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-pink-300/40 p-4 gap-2">
                <Sparkles size={24} className="text-pink-400/30 animate-pulse" />
                <span>
                  {isRtl
                    ? 'بانتظار تخمينات اللاعبين عبر هواتفهم...'
                    : 'Waiting for players to submit guesses on their phones...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SOLVERS PODIUM BAR ── */}
      {solvers.length > 0 && (
        <div className="w-full px-6 py-3 rounded-2xl bg-[#1a0f28]/80 border border-pink-500/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xl">
          <div className="flex items-center gap-2 text-pink-300 font-bold text-xs uppercase tracking-wider">
            <Trophy size={16} className="text-yellow-400" />
            <span>{isRtl ? 'أبطال التخمين في هذه الجولة:' : 'Round Solvers:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {solvers.map((s, idx) => (
              <div
                key={s.nickname + idx}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold shadow-sm"
              >
                <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨'}</span>
                <span>{s.nickname}</span>
                <span className="text-emerald-400 font-mono">+{s.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
