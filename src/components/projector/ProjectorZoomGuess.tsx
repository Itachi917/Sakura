'use client'

import { useState, useEffect } from 'react'
import {
  ZoomIn,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Trophy,
  Users,
  Award,
  Crown,
} from 'lucide-react'
import { sound } from '@/lib/sound'
import type { ZoomGuessQuestionData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface ProjectorZoomGuessProps {
  session: GameSession
  participants: SessionParticipant[]
  currentQuestion: ZoomGuessQuestionData
  questionIndex: number
  totalQuestions: number
  locale?: string
}

interface LiveSolver {
  participantId: string
  nickname: string
  points: number
  elapsedSeconds: number
}

export default function ProjectorZoomGuess({
  session,
  participants,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: ProjectorZoomGuessProps) {
  const isRtl = locale === 'ar'

  // Question & Session status
  const totalSeconds = currentQuestion.total_time_seconds || 40
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [solvers, setSolvers] = useState<LiveSolver[]>([])
  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  // Zoom scale: 0-10s: 4.5x, 10-20s: 3.2x, 20-30s: 2.1x, 30-40s: 1.4x, 40s+: 1.0x
  const currentInterval = Math.min(4, Math.floor(elapsedSeconds / 10))
  const zoomScales = [4.5, 3.2, 2.1, 1.4, 1.0]
  const currentZoomScale = isRevealed ? 1.0 : zoomScales[currentInterval]
  const nextZoomSeconds = isRevealed || currentInterval >= 4 ? 0 : 10 - (elapsedSeconds % 10)

  // Current potential points ticker
  const potentialPoints = Math.max(
    200,
    Math.round(
      currentQuestion.base_points *
        Math.max(0.2, (totalSeconds - elapsedSeconds) / totalSeconds)
    )
  )

  // Reset when question changes
  useEffect(() => {
    setElapsedSeconds(0)
    setSolvers([])
  }, [currentQuestion.id, questionIndex])

  // Timer interval on projector
  useEffect(() => {
    if (isRevealed) return

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
  }, [isRevealed, totalSeconds])

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-8 animate-fade-in relative z-10">
      {/* ── TOP BANNER: Session HUD ── */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-[#1d0b2e]/90 border border-pink-400/30 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-xl shadow-lg shadow-pink-500/20">
            🔍
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-pink-300 tracking-wider">
              <span>{isRtl ? 'عدسة ساكورا — خمن بالزووم' : 'Sakura Lens — Zoom & Guess'}</span>
              <span>•</span>
              <span>
                {isRtl
                  ? `السؤال ${questionIndex + 1} / ${totalQuestions}`
                  : `Question ${questionIndex + 1} / ${totalQuestions}`}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {isRtl ? 'من صاحب الصورة؟ خمن أسرع لتحصد نقاطاً أعلى!' : 'Who is this character? Faster answers win more points!'}
            </h2>
          </div>
        </div>

        {/* Live Points & Zoom Countdown Ticker */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-black/50 border border-pink-500/30 flex items-center gap-2">
            <Clock size={16} className="text-pink-400 animate-spin" />
            <div className="text-end font-mono">
              <div className="text-[10px] text-pink-300 font-bold uppercase">
                {isRtl ? 'التصغير القادم' : 'Next Zoom Out'}
              </div>
              <div className="text-sm font-black text-white">
                {nextZoomSeconds > 0 ? `${nextZoomSeconds}s` : isRtl ? 'مكشوفة' : 'Full'}
              </div>
            </div>
          </div>

          <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-2 border-amber-400/40 flex items-center gap-2 shadow-lg shadow-amber-500/20">
            <Zap size={20} className="text-amber-400 animate-bounce" />
            <div className="font-mono text-end">
              <div className="text-[10px] text-amber-300 font-black uppercase">
                {isRtl ? 'النقاط الحالية' : 'Max Points'}
              </div>
              <div className="text-lg font-black text-amber-200 leading-none">
                {potentialPoints} PTS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CINEMA STAGE: Zooming Image & Live Solvers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 items-center flex-1 min-h-[460px]">
        {/* Central Zooming Screen (lg:col-span-8) */}
        <div className="lg:col-span-8 h-full flex flex-col justify-center">
          <div className="relative rounded-3xl overflow-hidden border-4 border-pink-400/50 bg-black shadow-[0_0_60px_rgba(229,106,159,0.3)] aspect-[16/10] sm:aspect-[16/9] w-full flex items-center justify-center">
            {/* Zooming Picture Container */}
            <div className="w-full h-full overflow-hidden relative flex items-center justify-center">
              <img
                src={currentQuestion.image_url}
                alt="Zoom Guesser Target"
                className="w-full h-full object-cover transition-transform duration-1000 ease-out select-none"
                style={{
                  transform: `scale(${currentZoomScale})`,
                  transformOrigin: currentQuestion.focus_point || '50% 30%',
                }}
              />
            </div>

            {/* Corner Zoom Factor Indicator */}
            <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-pink-200 flex items-center gap-2 z-10 shadow-lg">
              <ZoomIn size={16} className="text-pink-400" />
              <span>{currentZoomScale.toFixed(1)}x ZOOM LEVEL</span>
            </div>

            {/* Revealed Banner */}
            {isRevealed && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent p-8 text-center z-20 animate-slide-up">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs font-black uppercase mb-2">
                  <Sparkles size={14} />
                  <span>{isRtl ? 'كشف الشخصية' : 'Character Revealed'}</span>
                </div>
                <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
                  {isRtl ? currentQuestion.character_name_ar : currentQuestion.character_name}
                </h3>
                <p className="text-sm sm:text-base text-pink-200/80 font-bold">
                  {isRtl
                    ? `من أنمي: ${currentQuestion.anime_origin_ar}`
                    : `From Anime: ${currentQuestion.anime_origin}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live Leaderboard & Solvers Sidebar (lg:col-span-4) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-between rounded-3xl bg-[#1d0b2e]/80 border border-pink-500/20 p-5 shadow-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-pink-500/20 mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-400" />
                <span className="font-black text-white text-sm uppercase tracking-wider">
                  {isRtl ? 'المتصدرون المباشرون' : 'Live Solvers & Roster'}
                </span>
              </div>
              <span className="text-xs font-mono text-pink-300 font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20">
                {participants.length} {isRtl ? 'لاعب' : 'Players'}
              </span>
            </div>

            {/* Hint Box */}
            <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-400/20 mb-4">
              <div className="text-[10px] uppercase font-black tracking-wider text-pink-300 mb-1">
                💡 {isRtl ? 'تلميح' : 'Clue'}
              </div>
              <p className="text-xs text-pink-100/80 leading-relaxed font-semibold">
                {isRtl ? currentQuestion.hint_ar : currentQuestion.hint}
              </p>
            </div>

            {/* Participants / Solvers list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {participants.slice(0, 7).map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-pink-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-pink-300/60 w-5">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {p.nickname}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-black text-amber-300">
                    {p.score || 0} pts
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room PIN Footer for late arrivals */}
          <div className="mt-4 pt-3 border-t border-pink-500/20 flex items-center justify-between text-xs">
            <span className="text-pink-200/60">{isRtl ? 'رمز الغرفة:' : 'Room PIN:'}</span>
            <span className="font-mono font-black text-pink-300 tracking-widest text-base">
              {session.room_pin}
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM STAGE STEPPERS ── */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#180927]/90 border border-pink-500/20">
        {[
          { label: isRtl ? 'المرحلة 1: زووم خارق (4.5x)' : 'Stage 1: Extreme Zoom (4.5x)', stage: 0 },
          { label: isRtl ? 'المرحلة 2: زووم عالٍ (3.2x)' : 'Stage 2: High Zoom (3.2x)', stage: 1 },
          { label: isRtl ? 'المرحلة 3: زووم متوسط (2.1x)' : 'Stage 3: Medium Zoom (2.1x)', stage: 2 },
          { label: isRtl ? 'المرحلة 4: زووم طفيف (1.4x)' : 'Stage 4: Mild Zoom (1.4x)', stage: 3 },
          { label: isRtl ? 'المرحلة 5: كشف كامل (1.0x)' : 'Stage 5: Full Reveal (1.0x)', stage: 4 },
        ].map((s) => {
          const isActive = currentInterval === s.stage && !isRevealed
          const isPassed = currentInterval > s.stage || isRevealed

          return (
            <div
              key={s.stage}
              className={`flex-1 py-2 px-2 rounded-xl text-center text-xs font-black border transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-300 shadow-xl shadow-pink-500/40 scale-105'
                  : isPassed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-pink-200/40 border-white/5'
              }`}
            >
              {s.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
