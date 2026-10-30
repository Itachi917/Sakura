'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
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
  PaintBucket,
  Undo2,
  HelpCircle,
  Eye,
  Flame,
} from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getMaskedWordHint } from '@/lib/gameHelpers'
import { evaluateZoomGuess } from '@/lib/fuzzyMatch'
import type { DrawingWordData } from '@/lib/gameData'

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
  isClose?: boolean
  points?: number
  timestamp: string
}

// 15 Classic Gartic.io Colors
const GARTIC_PALETTE = [
  '#000000', // Black
  '#4B5563', // Dark Gray
  '#9CA3AF', // Light Gray
  '#FFFFFF', // White
  '#EF4444', // Red
  '#991B1B', // Dark Red
  '#F97316', // Orange
  '#FACC15', // Yellow
  '#22C55E', // Green
  '#15803D', // Dark Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EC4899', // Sakura Pink
  '#78350F', // Brown
]

const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 7 },
  { label: 'L', size: 14 },
  { label: 'XL', size: 24 },
]

// Canvas Flood Fill (BFS) Helper
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

  // Gartic.io: 3 word choices for drawer
  const wordChoices = useMemo(() => {
    if (Array.isArray(settings.word_choices) && settings.word_choices.length > 0) {
      return settings.word_choices as DrawingWordData[]
    }
    return []
  }, [settings.word_choices])

  const drawerHasChosenWord = Boolean(settings.drawer_has_chosen_word)

  // Strict Skribbl/Gartic role
  const isDrawer = Boolean(drawerId && participant.id === drawerId)

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  // Timer calculation
  const calculateTimeLeft = useCallback(() => {
    if (!roundDeadline) return roundDuration
    const diff = Math.ceil((new Date(roundDeadline).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(roundDuration, diff))
  }, [roundDeadline, roundDuration])

  const [timeLeft, setTimeLeft] = useState<number>(calculateTimeLeft)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const isTimeExpired = timeLeft <= 0

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<'brush' | 'fill' | 'eraser'>('brush')
  const [selectedColor, setSelectedColor] = useState('#FFFFFF')
  const [brushSize, setBrushSize] = useState(7)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastCoord, setLastCoord] = useState<{ x: number; y: number } | null>(null)
  const [undoStack, setUndoStack] = useState<ImageData[]>([])
  const [drawerSolvers, setDrawerSolvers] = useState<string[]>([])
  const [drawerEarnedPoints, setDrawerEarnedPoints] = useState<number>(0)

  // Guessing state
  const [guessInput, setGuessInput] = useState('')
  const [hasSolved, setHasSolved] = useState(false)
  const [solvedPoints, setSolvedPoints] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'close' | 'wrong'; text: string } | null>(null)
  const [recentGuesses, setRecentGuesses] = useState<GuessMessage[]>([])

  const hasCommittedScore = useRef(false)

  // Save current canvas state to undo stack
  const saveUndoSnapshot = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setUndoStack((prev) => [...prev.slice(-8), snap])
    } catch {}
  }

  // Clear Canvas helper
  const handleClear = () => {
    saveUndoSnapshot()
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

  // Undo last action
  const handleUndo = () => {
    if (undoStack.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newStack = [...undoStack]
    const previousState = newStack.pop()
    setUndoStack(newStack)

    if (previousState) {
      ctx.putImageData(previousState, 0, 0)
      const dataUrl = canvas.toDataURL()
      supabase.channel(`draw_stream_${session.id}`).send({
        type: 'broadcast',
        event: 'canvas_snapshot',
        payload: { dataUrl },
      })
    }
  }

  // Reset round state
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
    setUndoStack([])
    setTimeLeft(calculateTimeLeft())

    // Clear canvases
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1c1026'
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    if (mirrorCanvasRef.current) {
      const ctx = mirrorCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1c1026'
        ctx.fillRect(0, 0, mirrorCanvasRef.current.width, mirrorCanvasRef.current.height)
      }
    }
  }, [settings.round_start_time, settings.drawing_word, calculateTimeLeft])

  // Working Countdown Timer
  useEffect(() => {
    if (isRevealed || !drawerHasChosenWord) return

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
  }, [roundDeadline, isRevealed, roundDuration, hasSolved, isDrawer, drawerHasChosenWord, calculateTimeLeft])

  // Commit points on reveal
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

  // Mirror Stroke Drawer
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

  // Realtime channel subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`draw_stream_${session.id}`)
      .on('broadcast', { event: 'draw_stroke' }, (payload) => {
        if (!isDrawer) drawMirrorStroke(payload.payload)
      })
      .on('broadcast', { event: 'flood_fill' }, (payload) => {
        if (!isDrawer && mirrorCanvasRef.current) {
          const ctx = mirrorCanvasRef.current.getContext('2d')
          if (ctx) {
            executeFloodFill(
              ctx,
              payload.payload.x * mirrorCanvasRef.current.width,
              payload.payload.y * mirrorCanvasRef.current.height,
              payload.payload.color
            )
          }
        }
      })
      .on('broadcast', { event: 'canvas_snapshot' }, (payload) => {
        if (!isDrawer && mirrorCanvasRef.current) {
          const canvas = mirrorCanvasRef.current
          const ctx = canvas.getContext('2d')
          if (ctx && payload.payload.dataUrl) {
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
        setRecentGuesses((prev) => [guess, ...prev.slice(0, 15)])

        if (guess.isCorrect) {
          if (isDrawer) {
            sound.playFanfare()
            setDrawerSolvers((prev) => (prev.includes(guess.nickname) ? prev : [...prev, guess.nickname]))
            setDrawerEarnedPoints((prev) => prev + 120)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, isDrawer, supabase])

  // Drawer chooses a word
  const handleSelectWord = async (chosen: DrawingWordData) => {
    sound.playClick()
    const now = Date.now()
    const newDeadline = new Date(now + roundDuration * 1000).toISOString()

    const updatedSettings = {
      ...settings,
      drawing_word: chosen.word,
      drawing_word_ar: chosen.word_ar,
      drawing_category: chosen.category,
      drawing_category_ar: chosen.category_ar,
      drawing_aliases: chosen.aliases || [],
      drawer_has_chosen_word: true,
      round_start_time: now,
      round_deadline: newDeadline,
    }

    await supabase
      .from('game_sessions')
      .update({
        settings: updatedSettings as unknown as import('@/types/database').Json,
      })
      .eq('id', session.id)

    await supabase.channel(`draw_stream_${session.id}`).send({
      type: 'broadcast',
      event: 'word_selected',
      payload: {
        drawing_word: chosen.word,
        drawing_word_ar: chosen.word_ar,
        drawing_category: chosen.category,
        drawing_category_ar: chosen.category_ar,
      },
    })
  }

  // Pointer & Touch Handlers
  const handleCanvasInteractionStart = (clientX: number, clientY: number) => {
    if (isRevealed || isTimeExpired || !drawerHasChosenWord) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height

    if (activeTool === 'fill') {
      saveUndoSnapshot()
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const pixelX = x * canvas.width
        const pixelY = y * canvas.height
        executeFloodFill(ctx, pixelX, pixelY, selectedColor)

        supabase.channel(`draw_stream_${session.id}`).send({
          type: 'broadcast',
          event: 'flood_fill',
          payload: { x, y, color: selectedColor },
        })
      }
      return
    }

    saveUndoSnapshot()
    setLastCoord({ x, y })
    setIsDrawing(true)
  }

  const handleCanvasInteractionMove = (clientX: number, clientY: number) => {
    if (!isDrawing || !lastCoord || isRevealed || isTimeExpired || activeTool === 'fill') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const currX = (clientX - rect.left) / rect.width
    const currY = (clientY - rect.top) / rect.height

    const strokeColor = activeTool === 'eraser' ? '#1c1026' : selectedColor
    const activeSize = activeTool === 'eraser' ? brushSize * 2.5 : brushSize

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

  const handleCanvasInteractionEnd = () => {
    setIsDrawing(false)
    setLastCoord(null)
  }

  // Guesser Guess Submission
  const handleSendGuess = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanGuess = guessInput.trim()
    if (!cleanGuess || hasSolved || isRevealed || isTimeExpired || !drawerHasChosenWord) return

    setGuessInput('')

    const result = evaluateZoomGuess(
      cleanGuess,
      secretWord,
      secretWordAr,
      aliases
    )

    if (result.isCorrect) {
      sound.playCorrect()
      sound.playFanfare()

      const potential = Math.max(150, Math.round(500 * (Math.max(1, timeLeft) / roundDuration)))
      setHasSolved(true)
      setSolvedPoints(potential)
      setFeedback({
        type: 'correct',
        text: isRtl
          ? `🎉 أحسنت! إجابة صحيحة وممتازة (+${potential} نقطة)`
          : `🎉 Correct! Awesome job (+${potential} pts)`,
      })

      // Broadcast solve (never reveal the word in chat!)
      await supabase.channel(`draw_stream_${session.id}`).send({
        type: 'broadcast',
        event: 'new_guess',
        payload: {
          id: crypto.randomUUID(),
          nickname: participant.nickname,
          text: isRtl ? 'حزر الكلمة بنجاح! 🌟' : 'Guessed the word! 🌟',
          isCorrect: true,
          points: potential,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      })
    } else if (result.isClose) {
      sound.playClick()
      setFeedback({
        type: 'close',
        text: isRtl ? '🔥 قريب جداً من الإجابة!' : "🔥 Very close! You're almost there!",
      })
      setTimeout(() => setFeedback(null), 3000)

      // Broadcast close warning to chat
      await supabase.channel(`draw_stream_${session.id}`).send({
        type: 'broadcast',
        event: 'new_guess',
        payload: {
          id: crypto.randomUUID(),
          nickname: participant.nickname,
          text: isRtl ? 'قريب جداً من الكلمة! 🔥' : 'is very close! 🔥',
          isCorrect: false,
          isClose: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      })
    } else {
      sound.playWrong()
      setFeedback({
        type: 'wrong',
        text: isRtl ? '❌ تخمين غير صحيح، جرّb مجدداً' : '❌ Not quite, keep guessing!',
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      })
    }
  }

  const activeWord = isRtl ? secretWordAr : secretWord
  const maskedHint = getMaskedWordHint(activeWord, elapsedSeconds, roundDuration)

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full py-2 animate-fade-in pb-12 select-none">
      {/* ── TOP ROLE & GARTIC TIMER HUD ── */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c1026]/90 border border-pink-500/20 shadow-lg backdrop-blur-md mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-600/30 border border-pink-400/40 flex items-center justify-center text-pink-300 shadow-md">
            <Palette size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">
                {isDrawer
                  ? (isRtl ? 'أنت الرسّام 🎨' : 'You are Drawing 🎨')
                  : (isRtl ? `الرسّام: ${drawerNickname} 🎨` : `Drawer: ${drawerNickname} 🎨`)}
              </span>
            </div>
            <div className="text-[11px] text-pink-200/70 font-semibold">
              🏷️ {isRtl ? categoryAr : category}
            </div>
          </div>
        </div>

        {/* Live Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-sm transition-all ${
            timeLeft <= 10 && !isRevealed && drawerHasChosenWord
              ? 'bg-rose-500/30 border-rose-500/60 text-rose-200 animate-pulse'
              : 'bg-pink-500/15 border-pink-400/30 text-pink-200'
          }`}
        >
          <Clock size={15} />
          <span>{drawerHasChosenWord ? `${timeLeft}s` : '...'}</span>
        </div>
      </div>

      {/* ── GARTIC.IO DRAWER: WORD SELECTION OVERLAY ── */}
      {isDrawer && !drawerHasChosenWord && (
        <div className="flex-1 flex flex-col justify-center items-center p-4 rounded-3xl bg-[#1d0e2e]/95 border-2 border-pink-500/30 backdrop-blur-xl shadow-2xl my-2 text-center animate-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-400/40 text-pink-300 flex items-center justify-center mb-3 mx-auto">
            <Palette size={32} />
          </div>
          <h3 className="text-xl font-black text-white mb-1">
            {isRtl ? 'دورك في الرسم! اختر كلمة 🎨' : 'Your Turn to Draw! Choose a Word 🎨'}
          </h3>
          <p className="text-xs text-pink-200/70 mb-5">
            {isRtl
              ? 'اختر كلمة من الخيارات التالية لتبدأ بالرسم لبقية اللاعبين:'
              : 'Pick one of the words below to begin drawing for contestants:'}
          </p>

          <div className="w-full grid grid-cols-1 gap-2.5 max-w-sm mb-4">
            {(wordChoices.length > 0 ? wordChoices : [{ word: 'Kunai', word_ar: 'كوناي', category: 'Ninja', category_ar: 'نينجا', difficulty: 'easy' as const }]).map((wc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectWord(wc)}
                className="w-full p-4 rounded-2xl bg-white/5 hover:bg-pink-600/30 border-2 border-pink-500/30 hover:border-pink-400 text-start flex items-center justify-between transition-all active:scale-95 group shadow-lg"
              >
                <div>
                  <span className="text-base font-black text-white group-hover:text-pink-100 block">
                    {wc.word_ar}
                  </span>
                  <span className="text-xs font-mono text-pink-300/80">
                    {wc.word}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      wc.difficulty === 'easy'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : wc.difficulty === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {wc.difficulty}
                  </span>
                  <span className="text-[10px] text-pink-200/60 font-semibold">
                    {isRtl ? wc.category_ar : wc.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── GARTIC.IO GUESSER: WAITING FOR WORD SELECTION ── */}
      {!isDrawer && !drawerHasChosenWord && (
        <div className="flex-1 flex flex-col justify-center items-center p-6 rounded-3xl bg-[#1d0e2e]/90 border border-pink-500/20 backdrop-blur-xl shadow-2xl my-2 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-pink-500/20 border border-pink-400/30 text-pink-300 flex items-center justify-center mb-4 mx-auto animate-bounce">
            <Brush size={32} />
          </div>
          <h3 className="text-xl font-black text-white mb-2">
            {isRtl ? `الرسّام (${drawerNickname}) يختار الكلمة...` : `Drawer (${drawerNickname}) is choosing a word...`}
          </h3>
          <p className="text-xs text-pink-200/70 max-w-xs leading-relaxed">
            {isRtl
              ? 'استعد وركّز جيداً، سيبدأ البث الحي للرسم فور اختيار الكلمة!'
              : 'Get ready to guess! The live drawing stream starts in moments.'}
          </p>
        </div>
      )}

      {/* ── GARTIC.IO DRAWER INTERFACE ── */}
      {isDrawer && drawerHasChosenWord && (
        <div className="flex-1 flex flex-col justify-between gap-2.5">
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

          {/* Interactive Touch/Pointer Drawing Canvas */}
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/40 bg-[#1c1026] touch-none shadow-2xl relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className={`w-full h-full object-contain ${
                activeTool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'
              }`}
              onMouseDown={(e) => handleCanvasInteractionStart(e.clientX, e.clientY)}
              onMouseMove={(e) => handleCanvasInteractionMove(e.clientX, e.clientY)}
              onMouseUp={handleCanvasInteractionEnd}
              onMouseLeave={handleCanvasInteractionEnd}
              onTouchStart={(e) => {
                if (e.touches[0]) handleCanvasInteractionStart(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) handleCanvasInteractionMove(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchEnd={handleCanvasInteractionEnd}
            />

            {/* Expired Overlay */}
            {(isRevealed || isTimeExpired) && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                <span className="text-3xl mb-1">⌛</span>
                <span className="text-lg font-black text-white">
                  {isRtl ? 'انتهت الجولة!' : "Round Finished!"}
                </span>
                <span className="text-xs text-pink-300 mt-1 font-bold">
                  {isRtl
                    ? `خمّن رسمتك ${drawerSolvers.length} لاعبين (+${drawerEarnedPoints} نقطة لك)`
                    : `${drawerSolvers.length} players guessed your drawing (+${drawerEarnedPoints} pts)`}
                </span>
              </div>
            )}
          </div>

          {/* Complete Gartic.io Tools Bar */}
          <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-black/50 border border-pink-500/20 backdrop-blur-md">
            {/* Tool Modes & Actions */}
            <div className="flex items-center justify-between pb-1.5 border-b border-pink-500/10">
              <div className="flex items-center gap-1">
                {/* Brush */}
                <button
                  type="button"
                  onClick={() => setActiveTool('brush')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    activeTool === 'brush'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-white/5 text-pink-300 hover:bg-white/10'
                  }`}
                >
                  <Brush size={14} />
                  <span>{isRtl ? 'فرشاة' : 'Brush'}</span>
                </button>

                {/* Flood Fill Bucket */}
                <button
                  type="button"
                  onClick={() => setActiveTool('fill')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    activeTool === 'fill'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-white/5 text-pink-300 hover:bg-white/10'
                  }`}
                  title={isRtl ? 'سطل التعبئة' : 'Paint Bucket'}
                >
                  <PaintBucket size={14} />
                  <span>{isRtl ? 'تعبئة' : 'Fill'}</span>
                </button>

                {/* Eraser */}
                <button
                  type="button"
                  onClick={() => setActiveTool('eraser')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    activeTool === 'eraser'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-white/5 text-pink-300 hover:bg-white/10'
                  }`}
                >
                  <Eraser size={14} />
                  <span>{isRtl ? 'ممحاة' : 'Eraser'}</span>
                </button>
              </div>

              {/* Undo & Clear */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-pink-300 transition-all"
                  title={isRtl ? 'تراجع' : 'Undo'}
                >
                  <Undo2 size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <RotateCcw size={13} />
                  <span>{isRtl ? 'مسح' : 'Clear'}</span>
                </button>
              </div>
            </div>

            {/* 15 Gartic.io Color Swatches */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {GARTIC_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color)
                    if (activeTool === 'eraser') setActiveTool('brush')
                  }}
                  style={{ backgroundColor: color }}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0 transition-transform border border-black/40 ${
                    activeTool !== 'eraser' && selectedColor === color
                      ? 'scale-125 ring-2 ring-pink-400 shadow-md'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-pink-300 font-bold uppercase">
                {isRtl ? 'الحجم:' : 'Size:'}
              </span>
              <div className="flex items-center gap-1.5">
                {BRUSH_SIZES.map((b) => (
                  <button
                    key={b.size}
                    type="button"
                    onClick={() => setBrushSize(b.size)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      brushSize === b.size
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'bg-white/5 text-pink-300/70 hover:bg-white/10'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Solvers notification ticker for drawer */}
          {drawerSolvers.length > 0 && (
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-300" />
                <span>
                  {isRtl
                    ? `خمّنها (${drawerSolvers.length}): ${drawerSolvers.slice(-3).join('، ')}`
                    : `Guessed by (${drawerSolvers.length}): ${drawerSolvers.slice(-3).join(', ')}`}
                </span>
              </div>
              <span className="font-mono text-emerald-300 font-black">+{drawerEarnedPoints} PTS</span>
            </div>
          )}
        </div>
      )}

      {/* ── GARTIC.IO GUESSER INTERFACE ── */}
      {!isDrawer && drawerHasChosenWord && (
        <div className="flex-1 flex flex-col justify-between gap-2.5">
          {/* Masked Word Hint */}
          <div className="p-2.5 rounded-2xl bg-black/40 border border-pink-500/20 text-center">
            <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold block mb-0.5">
              {isRevealed
                ? (isRtl ? 'الكلمة المطلوبة كانت 🎉' : 'The Secret Word Was 🎉')
                : (isRtl ? 'تلميح الحروف 💡' : 'Word Hint 💡')}
            </span>
            {isRevealed ? (
              <div className="flex items-center justify-center gap-2">
                <span className="font-black text-xl text-emerald-300">{secretWordAr}</span>
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
            <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/70 border border-pink-500/30 text-[10px] text-pink-300 font-bold flex items-center gap-1 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{isRtl ? 'بث حي من الرسّام 🎨' : 'Live Stream 🎨'}</span>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-2 rounded-xl border text-center text-xs font-bold animate-scale-in ${
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

          {/* Solved Lounge or Guess Input Form */}
          {hasSolved ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/60 text-center animate-fade-in shadow-xl">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="font-black text-white text-sm">
                {isRtl ? 'لقد حزرت الكلمة بنجاح! 🎉' : 'You guessed the word! 🎉'}
              </h4>
              <p className="text-xs text-emerald-300 font-mono font-bold">
                +{solvedPoints} {isRtl ? 'نقطة أضيفت لرصيدك' : 'points awarded'}
              </p>
              <p className="text-[11px] text-pink-200/60 mt-1">
                {isRtl ? '🤫 استمتع بمشاهدة الرسمة دون حرق الإجابة لزملائك' : 'Enjoy watching the drawing without spoiling it for others!'}
              </p>
            </div>
          ) : isRevealed || isTimeExpired ? (
            <div className="p-3 rounded-2xl bg-black/50 border border-pink-500/20 text-center">
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

          {/* Gartic-style Live Chat Ticker */}
          <div className="max-h-24 overflow-y-auto rounded-xl bg-black/40 border border-pink-500/15 p-2 space-y-1 text-xs">
            {recentGuesses.length > 0 ? (
              recentGuesses.slice(0, 5).map((g) => (
                <div key={g.id} className="flex items-center justify-between text-[11px] truncate">
                  {g.isCorrect ? (
                    <span className="text-emerald-300 font-black">
                      🎉 {g.nickname} {isRtl ? 'حزر الكلمة!' : 'guessed the word!'}
                    </span>
                  ) : g.isClose ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Flame size={12} />
                      {g.nickname} {isRtl ? 'قريب جداً من الكلمة!' : 'is very close!'}
                    </span>
                  ) : (
                    <span className="text-pink-100">
                      <strong className="text-pink-300">{g.nickname}:</strong> {g.text}
                    </span>
                  )}
                  <span className="text-[10px] text-pink-300/40 font-mono">{g.timestamp}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-pink-300/40 text-center italic">
                {isRtl ? 'لا توجد تخمينات بعد، كن أول من يخمن!' : 'No guesses yet, be the first!'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
