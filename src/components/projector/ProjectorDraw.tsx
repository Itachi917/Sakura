'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import {
  Palette,
  MessageSquare,
  Clock,
  Sparkles,
  CheckCircle2,
  Trophy,
  Users,
  Flame,
  Brush,
} from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getMaskedWordHint, prepareDrawItRound } from '@/lib/gameHelpers'
import { getParticipantAvatar } from '@/lib/gameHelpers'

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
  isClose?: boolean
  points?: number
  timestamp: string
}

interface RoundSolver {
  participantId?: string
  nickname: string
  points: number
  elapsedSeconds: number
}

// Canvas Flood Fill (BFS) Helper for Projector
function executeFloodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string
) {
  const canvas = ctx.canvas
  const width = canvas.width
  const height = canvas.height
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  const x0 = Math.round(Math.max(0, Math.min(width - 1, startX)))
  const y0 = Math.round(Math.max(0, Math.min(height - 1, startY)))
  const startIdx = (y0 * width + x0) * 4

  const targetR = data[startIdx]
  const targetG = data[startIdx + 1]
  const targetB = data[startIdx + 2]
  const targetA = data[startIdx + 3]

  // Parse Hex to RGBA
  let r = 0, g = 0, b = 0, a = 255
  if (fillColorHex.startsWith('#')) {
    const hex = fillColorHex.slice(1)
    if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  }

  // Same color check
  if (
    Math.abs(targetR - r) < 10 &&
    Math.abs(targetG - g) < 10 &&
    Math.abs(targetB - b) < 10 &&
    Math.abs(targetA - a) < 10
  ) {
    return
  }

  const matchTarget = (idx: number) => {
    return (
      Math.abs(data[idx] - targetR) < 32 &&
      Math.abs(data[idx + 1] - targetG) < 32 &&
      Math.abs(data[idx + 2] - targetB) < 32 &&
      Math.abs(data[idx + 3] - targetA) < 32
    )
  }

  const stack: [number, number][] = [[x0, y0]]
  const visited = new Uint8Array(width * height)

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue
    const vIdx = cy * width + cx
    if (visited[vIdx]) continue
    visited[vIdx] = 1

    const pixelIdx = (cy * width + cx) * 4
    if (matchTarget(pixelIdx)) {
      data[pixelIdx] = r
      data[pixelIdx + 1] = g
      data[pixelIdx + 2] = b
      data[pixelIdx + 3] = a

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
    }
  }

  ctx.putImageData(imgData, 0, 0)
}

export default function ProjectorDraw({
  session,
  participants,
  locale = 'en',
}: ProjectorDrawProps) {
  const isRtl = locale === 'ar'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)
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
  const drawerHasChosenWord = Boolean(settings.drawer_has_chosen_word)

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  // Guessers count
  const totalGuessers = Math.max(1, participants.filter((p) => p.id !== drawerId).length)

  // Timer calculation
  const calculateTimeLeft = useCallback(() => {
    if (!roundDeadline) return roundDuration
    const diff = Math.ceil((new Date(roundDeadline).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(roundDuration, diff))
  }, [roundDeadline, roundDuration])

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
  }, [session.status, drawerId, participants, session.id, supabase, session])

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
    ctx.lineWidth = stroke.size * 2 // Scaled for 800x600 canvas
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
  }, [settings.round_start_time, settings.drawing_word, calculateTimeLeft])

  // Working Countdown Timer
  useEffect(() => {
    if (isRevealed || !drawerHasChosenWord) return

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
        supabase
          .from('game_sessions')
          .update({ status: 'answer_reveal' })
          .eq('id', session.id)
          .then(() => {})
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [roundDeadline, isRevealed, session.id, roundDuration, drawerHasChosenWord, calculateTimeLeft, supabase])

  // Realtime Drawing & Guess stream subscription
  useEffect(() => {
    const channel = supabase
      .channel(`draw_stream_${session.id}`)
      .on('broadcast', { event: 'draw_stroke' }, (payload) => {
        drawStroke(payload.payload)
      })
      .on('broadcast', { event: 'flood_fill' }, (payload) => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            executeFloodFill(
              ctx,
              payload.payload.x * canvasRef.current.width,
              payload.payload.y * canvasRef.current.height,
              payload.payload.color
            )
          }
        }
      })
      .on('broadcast', { event: 'canvas_snapshot' }, (payload) => {
        if (canvasRef.current && payload.payload.dataUrl) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const img = new Image()
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0)
            }
            img.src = payload.payload.dataUrl
          }
        }
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

            // If all active guessers have solved, finish round early!
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

  // Sorted participants for the live leaderboard
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [participants])

  return (
    <div className="w-full max-w-[1500px] flex flex-col items-center gap-4 py-2 animate-fade-in select-none">
      {/* ── TOP HUD: Drawer, Word Hint, Category & Gartic Timer ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-3xl bg-[#1a0f28]/95 border-2 border-pink-500/25 backdrop-blur-xl shadow-2xl">
        {/* Drawer Profile & Category */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-600/30 border border-pink-400/40 flex items-center justify-center text-pink-300 shadow-xl">
            <Palette size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-pink-300/80 font-bold">
                {isRtl ? 'الرسّام الحالي:' : 'Current Drawer:'}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-100 text-sm font-black">
                {drawerNickname}
              </span>
            </div>
            <div className="text-xs text-purple-200/90 mt-1 flex items-center gap-1.5 font-bold">
              <span>🏷️</span>
              <span>{isRtl ? categoryAr : category}</span>
              <span className="text-pink-400/60 font-mono">({isRtl ? category : categoryAr})</span>
            </div>
          </div>
        </div>

        {/* Word Mask / Secret Word Reveal */}
        <div className="text-center px-6 py-2.5 rounded-2xl bg-black/50 border border-pink-500/20 min-w-[280px]">
          <span className="text-[11px] uppercase tracking-wider text-pink-300/80 font-bold block mb-1">
            {isRevealed
              ? (isRtl ? 'الكلمة المطلوبة كانت 🎉' : 'The Secret Word Was 🎉')
              : (isRtl ? 'تلميح الحروف (خمن الكلمة) 💡' : 'Word Hint 💡')}
          </span>
          {isRevealed ? (
            <div className="flex items-center justify-center gap-3">
              <span className="font-black text-2xl lg:text-3xl text-emerald-300">
                {secretWordAr}
              </span>
              <span className="text-lg text-pink-300 font-semibold font-mono">
                ({secretWord})
              </span>
            </div>
          ) : drawerHasChosenWord ? (
            <div className="font-mono text-3xl font-black tracking-[0.3em] text-white">
              {maskedHint}
            </div>
          ) : (
            <div className="text-sm text-pink-300 font-bold animate-pulse">
              {isRtl ? 'جارٍ اختيار الكلمة...' : 'Choosing word...'}
            </div>
          )}
        </div>

        {/* Gartic-style Live Timer & Solvers Count */}
        <div className="flex items-center gap-3">
          {/* Solvers count */}
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center gap-2 text-xs font-bold text-emerald-300">
            <CheckCircle2 size={16} />
            <span>
              {solvers.length} / {totalGuessers} {isRtl ? 'خمّنوا الكلمة' : 'solved'}
            </span>
          </div>

          {/* Timer Clock */}
          <div
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-mono font-black text-xl transition-all ${
              timeLeft <= 10 && !isRevealed && drawerHasChosenWord
                ? 'bg-rose-500/30 border-rose-500 text-rose-200 animate-pulse scale-105'
                : 'bg-pink-500/20 border-pink-400/40 text-pink-100'
            }`}
          >
            <Clock size={20} />
            <span>{drawerHasChosenWord ? `${timeLeft}s` : '...'}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN GARTIC STAGE: 3-COLUMN LAYOUT ── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN: LIVE LEADERBOARD (3 COLS) */}
        <div className="lg:col-span-3 rounded-3xl bg-[#170a24]/90 border border-pink-500/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-2xl h-[560px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-pink-500/15 mb-3">
              <span className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-400" />
                <span>{isRtl ? 'المتصدرون المباشرون' : 'Live Podium'}</span>
              </span>
              <span className="text-xs font-mono text-pink-200/60 font-bold">
                {participants.length} {isRtl ? 'لاعب' : 'players'}
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1 scrollbar-none">
              {sortedParticipants.map((p, idx) => {
                const hasSolved = solvers.some((s) => s.nickname === p.nickname)
                const isCurrentDrawer = p.id === drawerId

                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                      hasSolved
                        ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-100 shadow-md scale-[1.01]'
                        : isCurrentDrawer
                        ? 'bg-pink-900/40 border-pink-400 text-white shadow-md'
                        : 'bg-white/5 border-white/5 text-pink-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-black text-pink-400 w-4 text-center">
                        #{idx + 1}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-400/20 flex items-center justify-center text-sm">
                        {getParticipantAvatar(p)}
                      </div>
                      <span className="font-bold truncate max-w-[90px]">
                        {p.nickname}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentDrawer && (
                        <span className="px-1.5 py-0.5 rounded-md bg-pink-500/30 text-pink-200 font-bold text-[10px] flex items-center gap-1">
                          <Palette size={10} />
                          <span>{isRtl ? 'يرسم' : 'Draws'}</span>
                        </span>
                      )}
                      {hasSolved && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          <span>{isRtl ? 'حزر' : 'Solved'}</span>
                        </span>
                      )}
                      <span className="font-mono font-black text-pink-200">
                        {p.score || 0}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: CANVAS STAGE (6 COLS) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#140820] border-2 border-pink-500/30 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center aspect-[4/3] h-[560px]">
          {/* Waiting screen while drawer chooses word */}
          {!drawerHasChosenWord && (
            <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-pink-500/20 border-2 border-pink-400/40 text-pink-300 flex items-center justify-center animate-bounce shadow-2xl">
                <Brush size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-1">
                  {isRtl ? `الرسّام (${drawerNickname}) يختار كلمة الآن...` : `Drawer (${drawerNickname}) is choosing a word...`}
                </h3>
                <p className="text-sm text-pink-200/70">
                  {isRtl ? 'الرسم والبث سيبدأ على هذه الشاشة فور الاختيار!' : 'Live drawing begins right after selection!'}
                </p>
              </div>
            </div>
          )}

          {/* Actual 800x600 Drawing Canvas */}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Expired / Reveal Overlay */}
          {(isRevealed || timeLeft <= 0) && drawerHasChosenWord && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 animate-scale-in z-20">
              <span className="text-4xl mb-2">🎉</span>
              <span className="text-xs uppercase tracking-widest text-pink-300 font-bold">
                {isRtl ? 'الكلمة المطلوبة كانت:' : 'The Word Was:'}
              </span>
              <h2 className="text-3xl lg:text-5xl font-black text-emerald-300 mt-1 mb-2">
                {secretWordAr}
              </h2>
              <p className="text-lg text-pink-200 font-mono font-bold mb-4">
                ({secretWord})
              </p>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-white max-w-sm">
                {solvers.length > 0 ? (
                  <span>
                    {isRtl
                      ? `👏 نجح ${solvers.length} لاعبين في تخمين الرسمة! وأسرعهم: ${solvers[0]?.nickname}`
                      : `👏 ${solvers.length} players guessed it! Fastest: ${solvers[0]?.nickname}`}
                  </span>
                ) : (
                  <span>
                    {isRtl ? '😅 لم يتمكن أحد من تخمين الكلمة هذه الجولة!' : '😅 No one guessed the word this round!'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: GARTIC.IO LIVE CHAT STREAM (3 COLS) */}
        <div className="lg:col-span-3 rounded-3xl bg-[#170a24]/90 border border-pink-500/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-2xl h-[560px]">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-pink-500/15 mb-3">
              <span className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-pink-400" />
                <span>{isRtl ? 'شات التخمينات المباشر' : 'Live Guess Chat'}</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none flex flex-col-reverse">
              <div ref={chatBottomRef} />
              {guesses.length > 0 ? (
                guesses.map((g) => (
                  <div
                    key={g.id}
                    className={`p-2 rounded-xl text-xs transition-all animate-slide-up ${
                      g.isCorrect
                        ? 'bg-emerald-950/80 border border-emerald-400 text-emerald-200 font-black shadow-lg shadow-emerald-900/30'
                        : g.isClose
                        ? 'bg-amber-950/80 border border-amber-400 text-amber-200 font-bold'
                        : 'bg-white/5 border border-white/5 text-pink-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5 text-[10px] text-pink-300/60 font-mono">
                      <span className="font-bold text-pink-300">{g.nickname}</span>
                      <span>{g.timestamp}</span>
                    </div>

                    {g.isCorrect ? (
                      <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs">
                        <CheckCircle2 size={13} />
                        <span>{isRtl ? '🎉 حزر الكلمة بنجاح!' : '🎉 Guessed the word!'}</span>
                        {g.points && (
                          <span className="font-mono text-[11px] text-emerald-400">
                            (+{g.points})
                          </span>
                        )}
                      </div>
                    ) : g.isClose ? (
                      <div className="flex items-center gap-1 text-amber-300 font-bold text-xs">
                        <Flame size={13} />
                        <span>{isRtl ? '🔥 قريب جداً من الكلمة!' : '🔥 Very close to the word!'}</span>
                      </div>
                    ) : (
                      <p className="text-white text-xs break-words">{g.text}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-pink-300/40 space-y-2">
                  <MessageSquare size={24} className="opacity-40" />
                  <p className="text-xs italic">
                    {isRtl ? 'التخمينات ستظهر هنا مباشرة...' : 'Player guesses will appear here...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
