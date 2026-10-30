'use client'

import { useRef, useState, useEffect } from 'react'
import { Palette, Send, RotateCcw, Brush, Sparkles } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'

interface PlayerDrawViewProps {
  session: GameSession
  participant: SessionParticipant
  locale?: string
}

const PALETTE = ['#F4A7C5', '#FFFFFF', '#E05263', '#3B82F6', '#10B981', '#F59E0B']

export default function PlayerDrawView({
  session,
  participant,
  locale = 'en',
}: PlayerDrawViewProps) {
  const supabase = createClient()
  const isRtl = locale === 'ar'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isDrawer, setIsDrawer] = useState(false)
  const [guessInput, setGuessInput] = useState('')
  const [selectedColor, setSelectedColor] = useState('#F4A7C5')
  const [brushSize, setBrushSize] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastCoord, setLastCoord] = useState<{ x: number; y: number } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Clear Canvas helper
  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    supabase.channel(`draw_stream_${session.id}`).send({
      type: 'broadcast',
      event: 'clear_canvas',
      payload: {},
    })
  }

  // Touch & Mouse Drawing Handlers
  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    setLastCoord({ x, y })
    setIsDrawing(true)
  }

  const drawMove = (clientX: number, clientY: number) => {
    if (!isDrawing || !lastCoord) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const currX = (clientX - rect.left) / rect.width
    const currY = (clientY - rect.top) / rect.height

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lastCoord.x * canvas.width, lastCoord.y * canvas.height)
      ctx.lineTo(currX * canvas.width, currY * canvas.height)
      ctx.stroke()
    }

    // Stream stroke
    supabase.channel(`draw_stream_${session.id}`).send({
      type: 'broadcast',
      event: 'draw_stroke',
      payload: {
        prevX: lastCoord.x,
        prevY: lastCoord.y,
        currX,
        currY,
        color: selectedColor,
        size: brushSize,
      },
    })

    setLastCoord({ x: currX, y: currY })
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setLastCoord(null)
  }

  // Handle Guess Submission
  const handleSendGuess = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanGuess = guessInput.trim()
    if (!cleanGuess) return

    sound.playClick()
    setGuessInput('')

    // Broadcast guess to projector
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

    setFeedback(isRtl ? 'تم إرسال تخمينك! 🌸' : 'Guess submitted! 🌸')
    setTimeout(() => setFeedback(null), 1500)
  }

  return (
    <div className="w-full max-w-md flex flex-col justify-between h-full py-2 animate-fade-in">
      {/* Role Toggle for physical club flexibility */}
      <div className="flex items-center justify-between mb-3 bg-black/40 p-1.5 rounded-2xl border border-pink-500/20">
        <button
          onClick={() => setIsDrawer(false)}
          className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all ${
            !isDrawer ? 'bg-pink-600 text-white shadow-md' : 'text-pink-300/60'
          }`}
        >
          {isRtl ? 'أنا أخمّن 🎯' : 'I am Guessing 🎯'}
        </button>
        <button
          onClick={() => setIsDrawer(true)}
          className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all ${
            isDrawer ? 'bg-pink-600 text-white shadow-md' : 'text-pink-300/60'
          }`}
        >
          {isRtl ? 'أنا أرسم 🎨' : 'I am Drawing 🎨'}
        </button>
      </div>

      {isDrawer ? (
        /* DRAWER CANVAS INTERFACE */
        <div className="flex-1 flex flex-col justify-between">
          <div className="mb-2 p-2 rounded-xl bg-pink-500/15 border border-pink-400/30 text-center">
            <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold block">
              {isRtl ? 'كلمتك للرسم (سرية):' : 'Your Secret Word to Draw:'}
            </span>
            <span className="font-bold text-lg text-white">Kunai (كوناي) 🗡️</span>
          </div>

          {/* Touch Canvas */}
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-pink-500/30 bg-[#1c1026] touch-none shadow-xl">
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full h-full object-contain"
              onMouseDown={e => startDrawing(e.clientX, e.clientY)}
              onMouseMove={e => drawMove(e.clientX, e.clientY)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={e => {
                if (e.touches[0]) startDrawing(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchMove={e => {
                if (e.touches[0]) drawMove(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Color & Brush Controls */}
          <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-pink-500/15">
            <div className="flex items-center gap-1.5">
              {PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-white shadow-md' : ''
                  }`}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>

            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300 border border-pink-500/20 text-xs font-semibold flex items-center gap-1"
            >
              <RotateCcw size={14} />
              <span>{isRtl ? 'مسح' : 'Clear'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* GUESSER INTERFACE */
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 mx-auto mb-3 animate-pulse">
              <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-black text-white">
              {isRtl ? 'انظر إلى شاشة العرض وخمّن!' : 'Watch the Projector & Guess!'}
            </h3>
            <p className="text-xs text-pink-200/70 mt-1">
              {isRtl
                ? 'اكتب ما يعبر عنه الرسم في الخانة أدناه بأسرع ما يمكن'
                : 'Type what you think is being drawn as fast as you can'}
            </p>
          </div>

          {feedback && (
            <div className="mb-3 p-2 rounded-xl bg-pink-500/20 border border-pink-400/30 text-center text-xs font-bold text-pink-200 animate-scale-in">
              {feedback}
            </div>
          )}

          <form onSubmit={handleSendGuess} className="space-y-3">
            <input
              type="text"
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
              placeholder={isRtl ? 'اكتب تخمينك هنا...' : 'Type your guess here...'}
              className="w-full py-3.5 px-4 rounded-2xl bg-[rgba(15,8,22,0.6)] border-2 border-[rgba(244,167,197,0.3)] focus:border-[var(--sakura-pink)] text-white text-base focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-base shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Send size={18} className={isRtl ? 'rotate-180' : ''} />
              <span>{isRtl ? 'إرسال التخمين 🚀' : 'Submit Guess 🚀'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
