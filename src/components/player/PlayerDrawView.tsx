'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import {
  Palette,
  Send,
  RotateCcw,
  Brush,
  Sparkles,
  Clock,
  CheckCircle2,
  Eraser,
  Trophy,
  AlertCircle,
} from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getMaskedWordHint } from '@/lib/gameHelpers'
import { evaluateZoomGuess } from '@/lib/fuzzyMatch'

interface PlayerDrawViewProps {
  session: GameSession
  participant: SessionParticipant
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

const PALETTE = [
  '#F4A7C5', // Sakura Pink
  '#FFFFFF', // White
  '#1c1026', // Dark Plum (Canvas Eraser match)
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#A855F7', // Purple
]

export default function PlayerDrawView({
  session,
  participant,
  locale = 'en',
}: PlayerDrawViewProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Settings from session
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
  const aliases = useMemo(
    () => (Array.isArray(settings.drawing_aliases) ? (settings.drawing_aliases as string[]) : []),
    [settings.drawing_aliases]
  )
  const roundDuration = typeof settings.round_duration === 'number' ? settings.round_duration : 60
  const roundDeadline = settings.round_deadline as string | undefined

  // Strict Skribbl role: Server determines who draws and who guesses
  const isDrawer = Boolean(drawerId && participant.id === drawerId)

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  // Timer calculation
  const calculateTimeLeft = () => {
    if (!roundDeadline) return roundDuration
    const diff = Math.ceil((new Date(roundDeadline).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(roundDuration, diff))
  }

  const [timeLeft, setTimeLeft] = useState<number>(calculateTimeLeft)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const isTimeExpired = timeLeft <= 0

  // Drawing state (for drawer)
  const [selectedColor, setSelectedColor] = useState('#F4A7C5')
  const [brushSize, setBrushSize] = useState(5)
  const [isEraser, setIsEraser] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastCoord, setLastCoord] = useState<{ x: number; y: number } | null>(null)
  const [drawerSolvers, setDrawerSolvers] = useState<string[]>([])
  const [drawerEarnedPoints, setDrawerEarnedPoints] = useState<number>(0)

  // Guessing state (for guessers)
  const [guessInput, setGuessInput] = useState('')
  const [hasSolved, setHasSolved] = useState(false)
  const [solvedPoints, setSolvedPoints] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'close' | 'wrong'; text: string } | null>(null)
  const [recentGuesses, setRecentGuesses] = useState<GuessMessage[]>([])

  const hasCommittedScore = useRef(false)

  // Reset states on round change
  useEffect(() => {
    setHasSolved(false)
    setSolvedPoints(0)
    setFeedback(null)
    setDrawerSolvers([])
    setDrawerEarnedPoints(0)
    setGuessInput('')
    setRecentGuesses([])
    hasCommittedScore.current = false
    setElapsedSeconds(0)
    setTimeLeft(calculateTimeLeft())

    // Clear drawer canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1c1026'
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    // Clear mirror canvas
    if (mirrorCanvasRef.current) {
      const ctx = mirrorCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1c1026'
        ctx.fillRect(0, 0, mirrorCanvasRef.current.width, mirrorCanvasRef.current.height)
      }
    }
  }, [settings.round_start_time, settings.drawing_word])

  // Working Countdown Timer
  useEffect(() => {
    if (isRevealed) return

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      setElapsedSeconds(roundDuration - remaining)

      if (remaining <= 5 && remaining > 0 && !hasSolved && !isDrawer) {
        sound.playTick()
      }

      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [roundDeadline, isRevealed, roundDuration, hasSolved, isDrawer])

  // Commit points on reveal phase
  useEffect(() => {
    if (isRevealed && !hasCommittedScore.current) {
      const pointsToAdd = isDrawer ? drawerEarnedPoints : (hasSolved ? solvedPoints : 0)
      if (pointsToAdd > 0) {
        hasCommittedScore.current = true
        supabase
          .from('session_participants')
          .update({ score: (participant.score || 0) + pointsToAdd })
          .eq('id', participant.id)
          .then(() => {})
      }
    }
  }, [isRevealed, isDrawer, drawerEarnedPoints, hasSolved, solvedPoints, participant.id, participant.score, supabase])

  // Clear Canvas helper (drawer)
  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1c1026'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    supabase.channel(`draw_stream_${session.id}`).send({
      type: 'broadcast',
      event: 'clear_canvas',
      payload: {},
    })
  }

  // Draw incoming stroke on mirror canvas (for guessers)
  const drawMirrorStroke = (stroke: StrokeData) => {
    const canvas = mirrorCanvasRef.current
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

  // Realtime channel for strokes and guesses
  useEffect(() => {
    const channel = supabase
      .channel(`draw_stream_${session.id}`)
      .on('broadcast', { event: 'draw_stroke' }, (payload) => {
        if (!isDrawer) {
          drawMirrorStroke(payload.payload)
        }
      })
      .on('broadcast', { event: 'clear_canvas' }, () => {
        if (!isDrawer && mirrorCanvasRef.current) {
          const ctx = mirrorCanvasRef.current.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#1c1026'
            ctx.fillRect(0, 0, mirrorCanvasRef.current.width, mirrorCanvasRef.current.height)
          }
        }
      })
      .on('broadcast', { event: 'new_guess' }, (payload) => {
        const guess = payload.payload as GuessMessage
        setRecentGuesses((prev) => [guess, ...prev.slice(0, 10)])

        if (guess.isCorrect) {
          if (isDrawer) {
            sound.playFanfare()
            setDrawerSolvers((prev) => (prev.includes(guess.nickname) ? prev : [...prev, guess.nickname]))
            setDrawerEarnedPoints((prev) => prev + 150)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, isDrawer, supabase])

  // Touch & Mouse Handlers for Drawer Canvas
  const startDrawing = (clientX: number, clientY: number) => {
    if (isRevealed || isTimeExpired) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    setLastCoord({ x, y })
    setIsDrawing(true)
  }

  const drawMove = (clientX: number, clientY: number) => {
    if (!isDrawing || !lastCoord || isRevealed || isTimeExpired) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const currX = (clientX - rect.left) / rect.width
    const currY = (clientY - rect.top) / rect.height

    const strokeColor = isEraser ? '#1c1026' : selectedColor
    const activeSize = isEraser ? brushSize * 2.5 : brushSize

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = activeSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lastCoord.x * canvas.width, lastCoord.y * canvas.height)
      ctx.lineTo(currX * canvas.width, currY * canvas.height)
      ctx.stroke()
    }

    // Stream stroke to projector and other players
    supabase.channel(`draw_stream_${session.id}`).send({
      type: 'broadcast',
      event: 'draw_stroke',
      payload: {
        prevX: lastCoord.x,
        prevY: lastCoord.y,
        currX,
        currY,
        color: strokeColor,
        size: activeSize,
      },
    })

    setLastCoord({ x: currX, y: currY })
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setLastCoord(null)
  }

  // Handle Guess Submission (Guesser)
  const handleSendGuess = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanGuess = guessInput.trim()
    if (!cleanGuess || hasSolved || isRevealed || isTimeExpired) return

    setGuessInput('')

    // Evaluate guess using Skribbl / fuzzy match rules
    const result = evaluateZoomGuess(
      cleanGuess,
      secretWord,
      secretWordAr,
      aliases
    )

    if (result.isCorrect) {
      sound.playCorrect()
      sound.playFanfare()

      // Calculate speed points: faster = more points
      const potential = Math.max(150, Math.round(500 * (Math.max(1, timeLeft) / roundDuration)))
      setHasSolved(true)
      setSolvedPoints(potential)
      setFeedback({
        type: 'correct',
        text: isRtl
          ? `🎉 أحسنت! إجابة صحيحة وممتازة (+${potential} نقطة)`
          : `🎉 Correct! Awesome job (+${potential} pts)`,
      })

      // Broadcast solve to room (hides word in chat)
      await supabase.channel(`draw_stream_${session.id}`).send({
        type: 'broadcast',
        event: 'new_guess',
        payload: {
          id: crypto.randomUUID(),
          nickname: participant.nickname,
          text: isRtl ? 'خمّن الكلمة بنجاح!' : 'Guessed the word!',
          isCorrect: true,
          points: potential,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      })
    } else if (result.isClose) {
      sound.playClick()
      setFeedback({
        type: 'close',
        text: isRtl ? '🔥 قريب جداً! قاربت على الحل!' : "🔥 Very close! You're almost there!",
      })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      sound.playWrong()
      setFeedback({
        type: 'wrong',
        text: isRtl ? '❌ تخمين غير صحيح، جرّب مجدداً' : '❌ Not quite, keep guessing!',
      })
      setTimeout(() => setFeedback(null), 2500)

      // Broadcast incorrect guess to chat ticker
      await supabase.channel(`draw_stream_${session.id}`).send({
        type: 'broadcast',
        event: 'new_guess',
        payload: {
          id: crypto.randomUUID(),
          nickname: participant.nickname,
          text: cleanGuess,
          isCorrect: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      })
    }
  }

  // Active word and masked representation
  const activeWord = isRtl ? secretWordAr : secretWord
  const maskedHint = getMaskedWordHint(activeWord, elapsedSeconds, roundDuration)

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between h-full py-2 animate-fade-in pb-12">
      {/* ── TOP ROLE & TIMER HEADER ── */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1c1026]/90 border border-pink-500/20 shadow-lg backdrop-blur-md mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300">
            <Palette size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-pink-300/80 font-bold">
                {isDrawer
                  ? isRtl ? 'أنت الرسّام 🎨' : 'You are Drawing 🎨'
                  : isRtl ? `الرسّام: ${drawerNickname} 🎨` : `Drawer: ${drawerNickname} 🎨`}
              </span>
            </div>
            <div className="text-[11px] text-pink-200/70">
              {isRtl ? categoryAr : category}
            </div>
          </div>
        </div>

        {/* Working Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm transition-all ${
            timeLeft <= 10 && !isRevealed
              ? 'bg-rose-500/30 border-rose-500/60 text-rose-200 animate-pulse'
              : 'bg-pink-500/15 border-pink-400/30 text-pink-200'
          }`}
        >
          <Clock size={15} />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* ── DRAWER INTERFACE ── */}
      {isDrawer ? (
        <div className="flex-1 flex flex-col justify-between gap-3">
          {/* Secret Word Prompt (Drawer Eyes Only) */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 border-2 border-pink-400/40 text-center shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold block mb-0.5">
              {isRtl ? 'كلمتك السرية للرسم (ارسمها الآن!):' : 'Your Secret Word to Draw:'}
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-black text-xl lg:text-2xl text-white">
                {secretWordAr}
              </span>
              <span className="text-sm font-semibold text-pink-300">
                ({secretWord})
              </span>
            </div>
          </div>

          {/* Touch Drawing Canvas */}
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/40 bg-[#1c1026] touch-none shadow-2xl relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full h-full object-contain cursor-crosshair"
              onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
              onMouseMove={(e) => drawMove(e.clientX, e.clientY)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                if (e.touches[0]) startDrawing(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) drawMove(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchEnd={stopDrawing}
            />

            {/* Expired Overlay */}
            {(isRevealed || isTimeExpired) && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                <span className="text-2xl mb-1">⌛</span>
                <span className="text-lg font-black text-white">
                  {isRtl ? 'انتهى وقت الجولة!' : "Round Time's Up!"}
                </span>
                <span className="text-xs text-pink-300 mt-1">
                  {isRtl
                    ? `نجح ${drawerSolvers.length} لاعبين في تخمين رسمتك (+${drawerEarnedPoints} نقطة لك)`
                    : `${drawerSolvers.length} players guessed your drawing (+${drawerEarnedPoints} pts)`}
                </span>
              </div>
            )}
          </div>

          {/* Drawing Tools: Palette, Eraser, Brush, Clear */}
          <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-black/40 border border-pink-500/15">
            {/* Color Palette */}
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color)
                      setIsEraser(false)
                    }}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      !isEraser && selectedColor === color ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80'
                    }`}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>

              {/* Eraser Toggle */}
              <button
                onClick={() => setIsEraser((prev) => !prev)}
                className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                  isEraser
                    ? 'bg-pink-600 text-white border-pink-400 shadow-md scale-105'
                    : 'bg-white/5 text-pink-300 border-pink-500/20 hover:bg-white/10'
                }`}
              >
                <Eraser size={14} />
                <span>{isRtl ? 'ممحاة' : 'Eraser'}</span>
              </button>
            </div>

            {/* Brush Sizes & Clear */}
            <div className="flex items-center justify-between border-t border-pink-500/10 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-pink-300 font-bold uppercase">
                  {isRtl ? 'الفرشاة:' : 'Brush:'}
                </span>
                {[
                  { label: isRtl ? 'صغيرة' : 'S', size: 3 },
                  { label: isRtl ? 'وسط' : 'M', size: 7 },
                  { label: isRtl ? 'كبيرة' : 'L', size: 14 },
                ].map((b) => (
                  <button
                    key={b.size}
                    onClick={() => setBrushSize(b.size)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      brushSize === b.size
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'bg-white/5 text-pink-300/70 hover:bg-white/10'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleClear}
                className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <RotateCcw size={13} />
                <span>{isRtl ? 'مسح الكل' : 'Clear'}</span>
              </button>
            </div>
          </div>

          {/* Solvers notification ticker for drawer */}
          {drawerSolvers.length > 0 && (
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-300" />
                <span>
                  {isRtl
                    ? `خمّنها (${drawerSolvers.length}): ${drawerSolvers.slice(-2).join('، ')}`
                    : `Guessed by (${drawerSolvers.length}): ${drawerSolvers.slice(-2).join(', ')}`}
                </span>
              </div>
              <span className="font-mono text-emerald-300">+{drawerEarnedPoints}</span>
            </div>
          )}
        </div>
      ) : (
        /* ── GUESSER INTERFACE ── */
        <div className="flex-1 flex flex-col justify-between gap-3">
          {/* Masked Word Hint */}
          <div className="p-3 rounded-2xl bg-black/40 border border-pink-500/20 text-center">
            <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold block mb-1">
              {isRevealed
                ? isRtl ? 'الكلمة المطلوبة كانت 🎉' : 'The Word Was 🎉'
                : isRtl ? 'تلميح الحروف 💡' : 'Word Hint 💡'}
            </span>
            {isRevealed ? (
              <div className="flex items-center justify-center gap-2">
                <span className="font-bold text-xl text-emerald-300">{secretWordAr}</span>
                <span className="text-sm text-pink-300 font-semibold">({secretWord})</span>
              </div>
            ) : (
              <div className="font-mono text-2xl font-black tracking-[0.25em] text-white">
                {maskedHint}
              </div>
            )}
          </div>

          {/* Live Mirror Canvas of Drawer's Strokes */}
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/30 bg-[#1c1026] shadow-xl relative">
            <canvas
              ref={mirrorCanvasRef}
              width={400}
              height={300}
              className="w-full h-full object-contain pointer-events-none"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 border border-pink-500/20 text-[10px] text-pink-300 font-bold">
              {isRtl ? 'بث حي من الرسّام 📡' : 'Live Stream 📡'}
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl border text-center text-xs font-bold animate-scale-in ${
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

          {/* Solved Card or Guess Input Form */}
          {hasSolved ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/60 text-center animate-fade-in shadow-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-black text-white text-base">
                {isRtl ? 'لقد خمّنت الكلمة بنجاح! 🎉' : 'You guessed the word! 🎉'}
              </h4>
              <p className="text-xs text-emerald-300 font-mono font-bold mt-1">
                +{solvedPoints} {isRtl ? 'نقطة تضاف لرصيدك' : 'points awarded'}
              </p>
              <p className="text-[11px] text-pink-200/60 mt-1">
                {isRtl ? 'شاهد تخمينات زملائك على شاشة العرض' : 'Watch your peers on the projector'}
              </p>
            </div>
          ) : isRevealed || isTimeExpired ? (
            <div className="p-4 rounded-2xl bg-black/50 border border-pink-500/20 text-center">
              <span className="text-xl">⌛</span>
              <p className="text-xs font-bold text-pink-200 mt-1">
                {isRtl
                  ? `انتهى الوقت! الكلمة كانت: ${secretWordAr} (${secretWord})`
                  : `Time's up! The word was: ${secretWord}`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendGuess} className="flex gap-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={isRtl ? 'اكتب تخمينك هنا...' : 'Type your guess here...'}
                className="flex-1 py-3 px-4 rounded-2xl bg-[rgba(15,8,22,0.7)] border-2 border-[rgba(244,167,197,0.3)] focus:border-[var(--sakura-pink)] text-white text-sm focus:outline-none"
                autoComplete="off"
                disabled={isTimeExpired || isRevealed}
              />
              <button
                type="submit"
                disabled={!guessInput.trim() || isTimeExpired || isRevealed}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send size={16} className={isRtl ? 'rotate-180' : ''} />
                <span>{isRtl ? 'إرسال' : 'Guess'}</span>
              </button>
            </form>
          )}

          {/* Recent guess ticker */}
          {recentGuesses.length > 0 && !hasSolved && (
            <div className="flex items-center gap-1 text-[11px] text-pink-300/60 truncate px-1">
              <span className="font-bold">{isRtl ? 'آخر تخمين:' : 'Latest:'}</span>
              <span className="text-white truncate">
                {recentGuesses[0]?.nickname}: {recentGuesses[0]?.isCorrect ? '🌟 خمّن الكلمة' : recentGuesses[0]?.text}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
