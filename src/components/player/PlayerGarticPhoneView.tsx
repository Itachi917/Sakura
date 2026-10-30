'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Send,
  Brush,
  PaintBucket,
  Eraser,
  Undo2,
  RotateCcw,
  Clock,
  CheckCircle2,
  Dices,
  Eye,
  Smile,
  Flame,
  Laugh,
  Heart,
  ThumbsUp,
  Skull,
} from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { GARTIC_PHONE_PROMPTS, type GarticPhoneChain } from '@/lib/gameData'
import { getAssignedGarticTask } from '@/lib/gameHelpers'

interface PlayerGarticPhoneViewProps {
  session: GameSession
  participant: SessionParticipant
  locale?: string
}

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

  let r = 0, g = 0, b = 0, a = 255
  if (fillColorHex.startsWith('#')) {
    const hex = fillColorHex.slice(1)
    if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  }

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

export default function PlayerGarticPhoneView({
  session,
  participant,
  locale = 'en',
}: PlayerGarticPhoneViewProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const settings = useMemo(
    () => (session.settings as Record<string, unknown>) || {},
    [session.settings]
  )

  const phase = (settings.phone_phase as 'prompt' | 'drawing' | 'description' | 'album') || 'prompt'
  const roundDuration = typeof settings.round_duration === 'number' ? settings.round_duration : 45
  const roundDeadline = settings.round_deadline as string | undefined
  const chains = (settings.chains as Record<string, GarticPhoneChain>) || {}
  const albumIdx = typeof settings.current_album_index === 'number' ? settings.current_album_index : 0

  // Canonical participant order
  const participants = useMemo(() => {
    let order = (settings.participant_order as string[]) || []
    if (!order || order.length === 0) {
      order = Object.keys(chains)
    }
    return order.map((pId) => ({
      id: pId,
      nickname: chains[pId]?.ownerNickname || 'Player',
      session_id: session.id,
      joined_at: new Date().toISOString(),
      score: 0,
      is_host: false,
    })) as unknown as SessionParticipant[]
  }, [settings.participant_order, chains, session.id])

  // Assigned task for this player
  const task = useMemo(() => {
    return getAssignedGarticTask(participant.id, participants, settings)
  }, [participant.id, participants, settings])

  // Timer calculation
  const calculateTimeLeft = useCallback(() => {
    if (!roundDeadline) return roundDuration
    const diff = Math.ceil((new Date(roundDeadline).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(roundDuration, diff))
  }, [roundDeadline, roundDuration])

  const [timeLeft, setTimeLeft] = useState<number>(calculateTimeLeft)
  const isTimeExpired = timeLeft <= 0

  // Local submission states
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [textInput, setTextInput] = useState('')

  // Drawing state
  const [activeTool, setActiveTool] = useState<'brush' | 'fill' | 'eraser'>('brush')
  const [selectedColor, setSelectedColor] = useState('#FFFFFF')
  const [brushSize, setBrushSize] = useState(7)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastCoord, setLastCoord] = useState<{ x: number; y: number } | null>(null)
  const [undoStack, setUndoStack] = useState<ImageData[]>([])

  // Reset state when phase changes
  useEffect(() => {
    setHasSubmitted(false)
    setTextInput('')
    setUndoStack([])
    setTimeLeft(calculateTimeLeft())

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1c1026'
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }, [phase, calculateTimeLeft])

  // Working Countdown Timer
  useEffect(() => {
    if (phase === 'album' || !roundDeadline) return

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining <= 5 && remaining > 0 && !hasSubmitted) {
        sound.playTick()
      }

      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [roundDeadline, phase, hasSubmitted, calculateTimeLeft])

  // Auto-submit when time expires
  useEffect(() => {
    if (isTimeExpired && !hasSubmitted && phase !== 'album') {
      handleSubmitCurrentPhase()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeExpired, hasSubmitted, phase])

  // Canvas Undo Helpers
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

  const handleClear = () => {
    saveUndoSnapshot()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1c1026'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

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
    }
  }

  // Pointer & Touch Handlers
  const handleCanvasInteractionStart = (clientX: number, clientY: number) => {
    if (isTimeExpired || hasSubmitted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height

    if (activeTool === 'fill') {
      saveUndoSnapshot()
      const ctx = canvas.getContext('2d')
      if (ctx) {
        executeFloodFill(ctx, x * canvas.width, y * canvas.height, selectedColor)
      }
      return
    }

    saveUndoSnapshot()
    setLastCoord({ x, y })
    setIsDrawing(true)
  }

  const handleCanvasInteractionMove = (clientX: number, clientY: number) => {
    if (!isDrawing || !lastCoord || isTimeExpired || hasSubmitted || activeTool === 'fill') return
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

    setLastCoord({ x: currX, y: currY })
  }

  const handleCanvasInteractionEnd = () => {
    setIsDrawing(false)
    setLastCoord(null)
  }

  // Random prompt generator
  const handleRandomPrompt = () => {
    sound.playClick()
    const randomItem = GARTIC_PHONE_PROMPTS[Math.floor(Math.random() * GARTIC_PHONE_PROMPTS.length)]
    setTextInput(isRtl ? randomItem.prompt_ar : randomItem.prompt)
  }

  // Submit current phase content
  const handleSubmitCurrentPhase = async () => {
    if (hasSubmitted) return
    sound.playCorrect()
    setHasSubmitted(true)

    let contentToSubmit = textInput.trim()

    if (phase === 'prompt') {
      // Use strictly what the player typed; only if totally empty, use generic prompt
      if (!contentToSubmit) {
        contentToSubmit = isRtl ? 'شخصية أنمي في موقف كوميدي مضحك' : 'An anime character in a funny situation'
      }
    } else if (phase === 'drawing') {
      if (canvasRef.current) {
        try {
          contentToSubmit = canvasRef.current.toDataURL('image/webp', 0.7)
          if (!contentToSubmit || contentToSubmit.length < 50) {
            contentToSubmit = canvasRef.current.toDataURL('image/png', 0.7)
          }
        } catch {
          contentToSubmit = canvasRef.current.toDataURL('image/png')
        }
      } else {
        contentToSubmit = ''
      }
    } else if (phase === 'description') {
      if (!contentToSubmit) {
        contentToSubmit = isRtl ? 'رسمة غامضة ومضحكة' : 'A funny mystery drawing'
      }
    }

    // 1. Submit to Next.js server route (atomic JSONB update)
    try {
      await fetch('/api/game/gartic-phone/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          participantId: participant.id,
          phase,
          content: contentToSubmit,
          nickname: participant.nickname,
        }),
      })
    } catch (e) {
      console.warn('API submission failed, falling back to direct update:', e)
      // Fallback: direct Supabase update
      try {
        const { data: latestSess } = await supabase
          .from('game_sessions')
          .select('settings')
          .eq('id', session.id)
          .single()
        const currentSettings = (latestSess?.settings as Record<string, unknown>) || session.settings || {}
        const currentSubmissions = { ...((currentSettings.submissions as Record<string, unknown>) || {}) }
        currentSubmissions[participant.id] = {
          phase,
          content: contentToSubmit,
          nickname: participant.nickname,
          submittedAt: Date.now(),
        }
        await supabase
          .from('game_sessions')
          .update({
            settings: { ...currentSettings, submissions: currentSubmissions } as any,
          })
          .eq('id', session.id)
      } catch (err2) {
        console.error('Fallback direct update error:', err2)
      }
    }

    // 2. Broadcast submission over Realtime Channel for instant UI feedback
    try {
      await supabase.channel(`gartic_phone_${session.id}`).send({
        type: 'broadcast',
        event: 'phase_submission',
        payload: {
          participantId: participant.id,
          nickname: participant.nickname,
          phase,
          content: contentToSubmit,
        },
      })
    } catch (e) {
      console.warn('Error broadcasting gartic phone submission:', e)
    }
  }

  // Send fun floating reaction during album presentation
  const handleSendReaction = async (emoji: string) => {
    sound.playClick()
    try {
      await supabase.channel(`gartic_phone_${session.id}`).send({
        type: 'broadcast',
        event: 'phone_reaction',
        payload: {
          emoji,
          participantNickname: participant.nickname,
        },
      })
    } catch {}
  }

  // Current active album chain for review
  const activeChain = useMemo(() => {
    const order = (settings.participant_order as string[]) || []
    if (order.length > 0) {
      const activeOwnerId = order[albumIdx % order.length]
      if (activeOwnerId && chains[activeOwnerId]) {
        return chains[activeOwnerId]
      }
    }
    const chainList = Object.values(chains)
    return chainList[albumIdx % (chainList.length || 1)] || null
  }, [chains, albumIdx, settings.participant_order])

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full py-2 animate-fade-in pb-12 select-none">
      {/* ── TOP GARTIC PHONE HEADER ── */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1c1026]/90 border border-pink-500/20 shadow-lg backdrop-blur-md mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-600/30 border border-pink-400/40 flex items-center justify-center text-pink-300 shadow-md">
            <span>📞</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">
                {phase === 'prompt'
                  ? (isRtl ? 'هاتف جارتك: كتابة الفكرة ✍️' : 'Gartic Phone: Write Prompt ✍️')
                  : phase === 'drawing'
                  ? (isRtl ? 'هاتف جارتك: ارسم العبارة 🎨' : 'Gartic Phone: Draw It 🎨')
                  : phase === 'description'
                  ? (isRtl ? 'هاتف جارتك: خمن واكتب الوصف 🧐' : 'Gartic Phone: Describe It 🧐')
                  : (isRtl ? 'معرض الذكريات والألبوم 📜' : 'Gartic Phone: Album Showcase 📜')}
              </span>
            </div>
            <div className="text-[11px] text-pink-200/70 font-semibold">
              {phase === 'album'
                ? (isRtl ? 'شاهد واستمتع بالضحك على الشاشة!' : 'Watch the projector showcase!')
                : hasSubmitted
                ? (isRtl ? 'تم إرسال إجابتك بنجاح ✅' : 'Submitted! Waiting for peers ✅')
                : (isRtl ? 'دورك التفاعلي الآن' : 'Your turn right now')}
            </div>
          </div>
        </div>

        {/* Live Timer */}
        {phase !== 'album' && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-sm transition-all ${
              timeLeft <= 10 && !hasSubmitted
                ? 'bg-rose-500/30 border-rose-500/60 text-rose-200 animate-pulse'
                : 'bg-pink-500/15 border-pink-400/30 text-pink-200'
            }`}
          >
            <Clock size={15} />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* ── PHASE 1: WRITE INITIAL PROMPT ── */}
      {phase === 'prompt' && (
        <div className="flex-1 flex flex-col justify-between gap-3 p-4 rounded-3xl bg-[#1d0e2e]/90 border border-pink-500/20 backdrop-blur-xl shadow-2xl my-2">
          <div>
            <div className="text-center mb-4">
              <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider block mb-1">
                {isRtl ? 'الخطوة الأولى 📜' : 'Step 1 📜'}
              </span>
              <h3 className="text-lg font-black text-white">
                {isRtl
                  ? 'اكتب جملة أو سيناريو أنمي مضحك وغريب!'
                  : 'Write a crazy & funny anime sentence!'}
              </h3>
              <p className="text-xs text-pink-200/70 mt-1">
                {isRtl
                  ? 'سيتعين على لاعب آخر رسم فكرتك دون أن يعرف من كتبها!'
                  : 'Another player will have to draw this sentence!'}
              </p>
            </div>

            {hasSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/15 border-2 border-emerald-400/40 text-center animate-fade-in my-6">
                <CheckCircle2 size={36} className="text-emerald-300 mx-auto mb-2 animate-bounce" />
                <h4 className="font-black text-white text-base">
                  {isRtl ? 'تم إرسال فكرتك بنجاح! 🌸' : 'Prompt submitted successfully! 🌸'}
                </h4>
                <p className="text-xs text-emerald-200 mt-1 font-semibold">
                  &ldquo;{textInput}&rdquo;
                </p>
                <p className="text-[11px] text-pink-300/60 mt-3">
                  {isRtl ? 'انتظر انتهاء بقية اللاعبين لتبدأ مرحلة الرسم!' : 'Waiting for others to start drawing!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value.slice(0, 100))}
                  placeholder={
                    isRtl
                      ? 'مثال: لوفي يأكل رامن مع ناروتو وغوكو في برج إيفل...'
                      : 'e.g. Luffy eating ramen with Goku and Naruto in Paris...'
                  }
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-black/60 border-2 border-pink-500/30 focus:border-pink-400 text-white text-sm outline-none resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleRandomPrompt}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Dices size={15} />
                    <span>{isRtl ? '🎲 فكرة عشوائية' : '🎲 Random Prompt'}</span>
                  </button>

                  <span className="text-[11px] text-pink-300/60 font-mono">
                    {textInput.length} / 100
                  </span>
                </div>
              </div>
            )}
          </div>

          {!hasSubmitted && (
            <button
              type="button"
              onClick={handleSubmitCurrentPhase}
              disabled={!textInput.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send size={16} className={isRtl ? 'rotate-180' : ''} />
              <span>{isRtl ? 'إرسال الفكرة وجاهز للرسم 🚀' : 'Submit Prompt & Ready 🚀'}</span>
            </button>
          )}
        </div>
      )}

      {/* ── PHASE 2: DRAW THE PROMPT ── */}
      {phase === 'drawing' && (
        <div className="flex-1 flex flex-col justify-between gap-2.5">
          {/* Target prompt banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/25 via-pink-500/20 to-purple-500/25 border-2 border-pink-400/40 text-center shadow-lg">
            <div className="flex items-center justify-between text-[10px] text-pink-300 font-bold mb-1">
              <span>{isRtl ? 'المطلوب رسمه 🎨:' : 'Draw what you read 🎨:'}</span>
              <span className="text-purple-200">✍️ {task.authorNickname || task.targetOwnerNickname || 'زميلك'}</span>
            </div>
            <p className="font-black text-base lg:text-lg text-white leading-snug">
              &ldquo;{task.targetPrompt || (isRtl ? 'ارسم فكرة مضحكة!' : 'Draw something funny!')}&rdquo;
            </p>
          </div>

          {/* Interactive Canvas */}
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

            {hasSubmitted && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 size={40} className="text-emerald-400 mb-2 animate-bounce" />
                <span className="text-base font-black text-white">
                  {isRtl ? 'تم إرسال رسمتك بنجاح! 🎨' : 'Drawing submitted! 🎨'}
                </span>
                <span className="text-xs text-pink-300 mt-1">
                  {isRtl ? 'انتظر بقية اللاعبين لتبدأ مرحلة التخمين' : 'Waiting for others to guess your drawing'}
                </span>
              </div>
            )}
          </div>

          {/* Tools bar */}
          {!hasSubmitted && (
            <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-black/50 border border-pink-500/20 backdrop-blur-md">
              <div className="flex items-center justify-between pb-1.5 border-b border-pink-500/10">
                <div className="flex items-center gap-1">
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

                  <button
                    type="button"
                    onClick={() => setActiveTool('fill')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      activeTool === 'fill'
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'bg-white/5 text-pink-300 hover:bg-white/10'
                    }`}
                  >
                    <PaintBucket size={14} />
                    <span>{isRtl ? 'تعبئة' : 'Fill'}</span>
                  </button>

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

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-pink-300 transition-all"
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

              {/* 15 Colors */}
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
                    className={`w-6 h-6 rounded-full shrink-0 transition-transform border border-black/40 ${
                      activeTool !== 'eraser' && selectedColor === color
                        ? 'scale-125 ring-2 ring-pink-400 shadow-md'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              {/* Sizes and Submit */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
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

                <button
                  type="button"
                  onClick={handleSubmitCurrentPhase}
                  className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-xs shadow-md active:scale-95"
                >
                  {isRtl ? 'تمت الرسمة! إرسال ✅' : 'Done Drawing! Send ✅'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: DESCRIBE THE DRAWING ── */}
      {phase === 'description' && (
        <div className="flex-1 flex flex-col justify-between gap-3 p-4 rounded-3xl bg-[#1d0e2e]/90 border border-pink-500/20 backdrop-blur-xl shadow-2xl my-2">
          <div>
            <div className="text-center mb-3">
              <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider block mb-0.5">
                {isRtl ? 'الخطوة الثالثة 🧐' : 'Step 3 🧐'}
              </span>
              <h3 className="text-base font-black text-white">
                {isRtl ? 'ماذا ترى في هذه الرسمة؟ اكتب وصفك أو تخمينك!' : 'What do you see? Describe this drawing!'}
              </h3>
            </div>

            {/* Display Assigned Drawing */}
            <div className="flex items-center justify-between text-xs font-mono font-bold text-pink-300 mb-1.5 px-1">
              <span>{isRtl ? 'رسمة زميلك المطلوب تخمينها:' : 'Peer drawing to describe:'}</span>
              <span className="text-pink-200">🎨 {task.authorNickname || 'الرسام'}</span>
            </div>
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/40 bg-[#1c1026] shadow-xl mb-3 flex items-center justify-center">
              {task.targetDrawing ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.targetDrawing}
                  alt="Received drawing to describe"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4 text-pink-300/50 text-xs">
                  {isRtl ? 'رسمة بسيطة قيد العرض...' : 'Drawing on display...'}
                </div>
              )}
            </div>

            {hasSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-400/40 text-center animate-fade-in">
                <CheckCircle2 size={28} className="text-emerald-300 mx-auto mb-1 animate-bounce" />
                <h4 className="font-black text-white text-sm">
                  {isRtl ? 'وصل وصفك بنجاح! 📜' : 'Description submitted! 📜'}
                </h4>
                <p className="text-xs text-emerald-200 mt-1 font-semibold">
                  &ldquo;{textInput}&rdquo;
                </p>
                <p className="text-[10px] text-pink-300/60 mt-1">
                  {isRtl ? 'استعد للضحك، سنعرض الألبوم الكامل بعد قليل!' : 'Get ready for the hilarious album reveal!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value.slice(0, 100))}
                  placeholder={isRtl ? 'اكتب وصفك للرسمة هنا...' : 'Type your description here...'}
                  className="w-full p-3 rounded-2xl bg-black/60 border-2 border-pink-500/30 focus:border-pink-400 text-white text-sm outline-none"
                />
              </div>
            )}
          </div>

          {!hasSubmitted && (
            <button
              type="button"
              onClick={handleSubmitCurrentPhase}
              disabled={!textInput.trim()}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send size={16} className={isRtl ? 'rotate-180' : ''} />
              <span>{isRtl ? 'إرسال الوصف 📜' : 'Submit Description 📜'}</span>
            </button>
          )}
        </div>
      )}

      {/* ── PHASE 4: ALBUM PRESENTATION ── */}
      {phase === 'album' && (
        <div className="flex-1 flex flex-col justify-between gap-3 p-4 rounded-3xl bg-[#1d0e2e]/90 border border-pink-500/20 backdrop-blur-xl shadow-2xl my-2 text-center animate-fade-in">
          <div>
            <div className="text-center mb-3">
              <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider block mb-0.5">
                {isRtl ? 'ألبوم الذكريات المضحك 🎉' : 'Hilarious Album Showcase 🎉'}
              </span>
              <h3 className="text-base font-black text-white">
                {activeChain
                  ? (isRtl ? `ألبوم فكرة: ${activeChain.ownerNickname} 🌸` : `Chain by: ${activeChain.ownerNickname} 🌸`)
                  : (isRtl ? 'معرض الألبوم المباشر' : 'Live Album Showcase')}
              </h3>
              <p className="text-xs text-pink-200/70">
                {isRtl ? 'انظر إلى شاشة العرض الرئيسية وشارك بتفاعلاتك الحية!' : 'Watch the main projector and send live reactions!'}
              </p>
            </div>

            {/* Quick Chain preview */}
            {activeChain && activeChain.turns.length > 0 && (
              <div className="space-y-2 p-3 rounded-2xl bg-black/40 border border-pink-500/20 text-start max-h-64 overflow-y-auto">
                {activeChain.turns.map((turn, tIdx) => (
                  <div key={tIdx} className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                    <span className="font-bold text-pink-300 text-[11px] block">
                      {turn.type === 'prompt'
                        ? (isRtl ? `1. الفكرة الأصلية (${turn.nickname}):` : `1. Original Prompt (${turn.nickname}):`)
                        : turn.type === 'drawing'
                        ? (isRtl ? `2. الرسمة (${turn.nickname}):` : `2. Drawing (${turn.nickname}):`)
                        : (isRtl ? `3. الوصف والتخمين (${turn.nickname}):` : `3. Description (${turn.nickname}):`)}
                    </span>
                    {turn.type === 'drawing' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={turn.content}
                        alt="Turn drawing"
                        className="w-full h-32 object-contain rounded-lg mt-1 bg-black/60"
                      />
                    ) : (
                      <p className="text-white text-xs mt-0.5 font-bold">
                        &ldquo;{turn.content}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Live Reaction Bursts */}
          <div className="p-3 rounded-2xl bg-black/50 border border-pink-500/20">
            <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider block mb-2">
              {isRtl ? 'أرسل تفاعلك لشاشة العرض الكبيرة 📡:' : 'Burst live reactions onto projector 📡:'}
            </span>
            <div className="flex items-center justify-around gap-2">
              {[
                { emoji: '😂', label: 'Laugh' },
                { emoji: '🌸', label: 'Sakura' },
                { emoji: '🎨', label: 'Art' },
                { emoji: '💀', label: 'Dead' },
                { emoji: '🔥', label: 'Fire' },
                { emoji: '👏', label: 'Clap' },
              ].map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => handleSendReaction(r.emoji)}
                  className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-pink-600/30 border border-pink-500/20 hover:border-pink-400 text-xl flex items-center justify-center transition-all active:scale-125 shadow-md"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
