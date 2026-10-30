'use client'

import { useRef, useEffect, useState } from 'react'
import { Palette, MessageSquare, Clock } from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'

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
  timestamp: string
}

export default function ProjectorDraw({
  session,
  participants,
  locale = 'en',
}: ProjectorDrawProps) {
  const isRtl = locale === 'ar'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const supabase = createClient()

  const [guesses, setGuesses] = useState<GuessMessage[]>([])
  const [wordHint, setWordHint] = useState<string>('_ _ _ _ _')
  const [timeLeft, setTimeLeft] = useState<number>(60)

  // Clear canvas helper
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

  useEffect(() => {
    clearCanvas()

    const channel = supabase
      .channel(`draw_stream_${session.id}`)
      .on('broadcast', { event: 'draw_stroke' }, payload => {
        drawStroke(payload.payload)
      })
      .on('broadcast', { event: 'clear_canvas' }, () => {
        clearCanvas()
      })
      .on('broadcast', { event: 'new_guess' }, payload => {
        const guess = payload.payload as GuessMessage
        setGuesses(prev => [guess, ...prev.slice(0, 15)])
        if (guess.isCorrect) {
          sound.playCorrect()
        }
      })
      .on('broadcast', { event: 'update_hint' }, payload => {
        if (payload.payload.hint) {
          setWordHint(payload.payload.hint)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id])

  return (
    <div className="w-full max-w-6xl flex flex-col items-center gap-6 py-2 animate-fade-in">
      {/* Top Banner: Word Hint & Timer */}
      <div className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-black/40 border border-pink-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Palette className="text-pink-400" size={24} />
          <div>
            <span className="text-xs uppercase tracking-wider text-pink-300 font-bold block">
              {isRtl ? 'الكلمة السرية (تلميح):' : 'Secret Word Hint:'}
            </span>
            <span className="font-mono text-3xl font-black tracking-widest text-white">
              {wordHint}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/15 border border-pink-400/30 text-pink-200">
          <Clock size={18} />
          <span className="font-mono text-2xl font-bold">{timeLeft}s</span>
        </div>
      </div>

      {/* Main Split Stage: Canvas (Left/Center) + Live Guess Ticker (Right) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Display */}
        <div className="lg:col-span-2 aspect-[4/3] rounded-3xl overflow-hidden border-2 border-pink-500/30 shadow-2xl bg-[#1c1026] relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Live Guess Ticker */}
        <div className="h-[450px] lg:h-auto rounded-3xl bg-black/40 border border-pink-500/20 p-5 flex flex-col backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 text-pink-300 font-bold text-sm uppercase tracking-wider mb-4 border-b border-pink-500/15 pb-2">
            <MessageSquare size={16} />
            <span>{isRtl ? 'تخمينات الحضور الحية' : 'Live Audience Guesses'}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-none">
            {guesses.length > 0 ? (
              guesses.map(g => (
                <div
                  key={g.id}
                  className={`p-3 rounded-xl border text-sm transition-all animate-slide-up ${
                    g.isCorrect
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-white/5 border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs opacity-75 mb-0.5">
                    <span className="font-semibold text-pink-300">{g.nickname}</span>
                    <span>{g.timestamp}</span>
                  </div>
                  <div className="text-base">{g.text}</div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-pink-300/40 p-4">
                {isRtl
                  ? 'بانتظار تخمينات اللاعبين عبر هواتفهم...'
                  : 'Waiting for players to submit guesses on their phones...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
