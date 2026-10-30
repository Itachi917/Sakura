'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Trophy,
  Users,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Eye,
  Brush,
  MessageSquare,
  Flame,
  Volume2,
} from 'lucide-react'
import type { GameSession, SessionParticipant } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import { getParticipantAvatar, advanceGarticPhonePhase } from '@/lib/gameHelpers'
import type { GarticPhoneChain } from '@/lib/gameData'

interface ProjectorGarticPhoneProps {
  session: GameSession
  participants: SessionParticipant[]
  locale?: string
}

interface FloatingReaction {
  id: string
  emoji: string
  nickname: string
  left: number
}

export default function ProjectorGarticPhone({
  session,
  participants,
  locale = 'en',
}: ProjectorGarticPhoneProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()

  const settings = useMemo(
    () => (session.settings as Record<string, unknown>) || {},
    [session.settings]
  )

  const phase = (settings.phone_phase as 'prompt' | 'drawing' | 'description' | 'album') || 'prompt'
  const roundDuration = typeof settings.round_duration === 'number' ? settings.round_duration : 45
  const roundDeadline = settings.round_deadline as string | undefined
  const chains = (settings.chains as Record<string, GarticPhoneChain>) || {}

  // Local submissions tracking
  const [submissions, setSubmissions] = useState<Record<string, string>>(
    () => (settings.submissions as Record<string, string>) || {}
  )

  // Album presentation state
  const [albumIdx, setAlbumIdx] = useState<number>(
    typeof settings.current_album_index === 'number' ? settings.current_album_index : 0
  )
  const [slideStep, setSlideStep] = useState<number>(0) // 0 = Prompt, 1 = Prompt + Drawing, 2 = Full Chain

  // Floating reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])

  // Timer calculation
  const calculateTimeLeft = () => {
    if (!roundDeadline) return roundDuration
    const diff = Math.ceil((new Date(roundDeadline).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(roundDuration, diff))
  }

  const [timeLeft, setTimeLeft] = useState<number>(calculateTimeLeft)

  // Chain list for album presentation
  const chainList = useMemo(() => {
    return Object.values(chains)
  }, [chains])

  const currentChain = useMemo(() => {
    if (chainList.length === 0) return null
    return chainList[albumIdx % chainList.length] || null
  }, [chainList, albumIdx])

  // Reset slide step when album chain changes
  useEffect(() => {
    setSlideStep(0)
  }, [albumIdx])

  // Working Countdown Timer
  useEffect(() => {
    if (phase === 'album' || !roundDeadline) return

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining <= 5 && remaining > 0) {
        sound.playTick()
      }

      if (remaining <= 0) {
        clearInterval(timer)
        sound.playBuzzer()
        handleAutoAdvancePhase()
      }
    }, 1000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundDeadline, phase])

  // Auto-advance phase when time expires or all players submit
  const handleAutoAdvancePhase = async () => {
    const updatedSettings = advanceGarticPhonePhase(
      {
        ...settings,
        submissions,
      },
      participants
    )

    sound.playFanfare()
    await supabase
      .from('game_sessions')
      .update({
        settings: updatedSettings as unknown as import('@/types/database').Json,
      })
      .eq('id', session.id)

    setSubmissions({})
  }

  // Realtime listener for submissions & reactions
  useEffect(() => {
    const channel = supabase
      .channel(`gartic_phone_${session.id}`)
      .on('broadcast', { event: 'phase_submission' }, (payload) => {
        const { participantId, content } = payload.payload
        setSubmissions((prev: Record<string, string>) => {
          const updated: Record<string, string> = { ...prev, [participantId]: content }

          // If all active participants have submitted, auto-advance phase!
          const allSubmitted = participants.length > 0 && participants.every((p) => updated[p.id])
          if (allSubmitted && phase !== 'album') {
            setTimeout(() => {
              handleAutoAdvancePhase()
            }, 800)
          }

          return updated
        })
      })
      .on('broadcast', { event: 'phone_reaction' }, (payload) => {
        const { emoji, participantNickname } = payload.payload
        const reaction: FloatingReaction = {
          id: `${Date.now()}-${Math.random()}`,
          emoji,
          nickname: participantNickname || '',
          left: Math.random() * 80 + 10, // 10% to 90%
        }

        setFloatingReactions((prev) => [...prev.slice(-15), reaction])
        sound.playClick()

        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id))
        }, 3500)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, participants, phase])

  // Host manual phase advance
  const handleManualAdvancePhase = async () => {
    sound.playClick()
    await handleAutoAdvancePhase()
  }

  // Album presentation navigation
  const handleNextSlide = () => {
    sound.playClick()
    if (!currentChain) return
    const maxSteps = currentChain.turns.length - 1
    if (slideStep < maxSteps) {
      setSlideStep((prev) => prev + 1)
      sound.playFanfare()
    } else {
      // Advance to next album chain
      handleNextAlbum()
    }
  }

  const handlePrevSlide = () => {
    sound.playClick()
    if (slideStep > 0) {
      setSlideStep((prev) => prev - 1)
    } else if (albumIdx > 0) {
      setAlbumIdx((prev) => prev - 1)
    }
  }

  const handleNextAlbum = async () => {
    sound.playFanfare()
    const nextIdx = (albumIdx + 1) % (chainList.length || 1)
    setAlbumIdx(nextIdx)
    setSlideStep(0)

    await supabase
      .from('game_sessions')
      .update({
        settings: {
          ...settings,
          current_album_index: nextIdx,
        } as unknown as import('@/types/database').Json,
      })
      .eq('id', session.id)
  }

  const submittedCount = Object.keys(submissions).length

  return (
    <div className="w-full max-w-[1500px] flex flex-col items-center gap-4 py-2 animate-fade-in relative select-none">
      {/* Floating live reaction bursts from audience phones */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.left}%` }}
            className="absolute bottom-10 animate-float-up text-4xl sm:text-5xl drop-shadow-lg flex flex-col items-center"
          >
            <span>{r.emoji}</span>
            <span className="text-[10px] text-white/70 font-bold bg-black/60 px-1.5 py-0.5 rounded-full mt-1">
              {r.nickname}
            </span>
          </div>
        ))}
      </div>

      {/* ── TOP HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-3xl bg-[#1a0f28]/95 border-2 border-pink-500/25 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-600/30 border border-pink-400/40 flex items-center justify-center text-3xl shadow-xl">
            <span>📞</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-pink-300/80 font-bold">
                {isRtl ? 'لعبة هاتف جارتك (Gartic Phone)' : 'Gartic Phone: The Telephone Game'}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-100 text-xs font-black">
                {phase === 'prompt'
                  ? (isRtl ? '1. كتابة الفكرة ✍️' : '1. Write Prompts ✍️')
                  : phase === 'drawing'
                  ? (isRtl ? '2. مرحلة الرسم 🎨' : '2. Drawing Phase 🎨')
                  : phase === 'description'
                  ? (isRtl ? '3. وصف الرسومات 🧐' : '3. Guess / Describe 🧐')
                  : (isRtl ? '4. معرض الألبوم والضحك 🎉' : '4. Album Showcase 🎉')}
              </span>
            </div>
            <div className="text-xs text-purple-200/90 mt-1 font-bold">
              {phase === 'prompt'
                ? (isRtl ? 'كل لاعب يكتب جملة أو سيناريو أنمي في هاتفه' : 'Everyone is writing a secret anime prompt')
                : phase === 'drawing'
                ? (isRtl ? 'الجميع يرسم الفكرة التي استلمها من زميله' : 'Everyone is drawing the prompt they received')
                : phase === 'description'
                ? (isRtl ? 'الجميع يخمن ويصف الرسمة التي استلمها' : 'Everyone is describing the drawing they see')
                : (isRtl ? 'عرض نتائج السلسلة المضحكة على الشاشة الكبيرة!' : 'Watch how the sentences transformed!')}
            </div>
          </div>
        </div>

        {/* Phase Action Controls / Timer */}
        <div className="flex items-center gap-3">
          {phase !== 'album' ? (
            <>
              {/* Ready status pill */}
              <div className="px-4 py-2 rounded-2xl bg-white/5 border border-pink-500/20 flex items-center gap-2 text-xs font-bold text-pink-200">
                <Users size={15} />
                <span>
                  {submittedCount} / {participants.length} {isRtl ? 'أنهوا الإرسال' : 'ready'}
                </span>
              </div>

              {/* Timer */}
              <div
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-mono font-black text-xl transition-all ${
                  timeLeft <= 10
                    ? 'bg-rose-500/30 border-rose-500 text-rose-200 animate-pulse scale-105'
                    : 'bg-pink-500/20 border-pink-400/40 text-pink-100'
                }`}
              >
                <Clock size={20} />
                <span>{timeLeft}s</span>
              </div>

              {/* Advance Phase Button */}
              <button
                type="button"
                onClick={handleManualAdvancePhase}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 text-white font-extrabold text-xs shadow-lg shadow-pink-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>{isRtl ? 'المرحلة التالية ⏭️' : 'Next Phase ⏭️'}</span>
              </button>
            </>
          ) : (
            /* Album Navigation Controls */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 font-bold text-xs flex items-center gap-1 border border-pink-500/20"
              >
                <ChevronLeft size={16} />
                <span>{isRtl ? 'السابق' : 'Prev'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextSlide}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-black text-xs shadow-lg shadow-pink-500/30 flex items-center gap-1.5 active:scale-95"
              >
                <span>{slideStep === (currentChain?.turns.length || 1) - 1 ? (isRtl ? 'الألبوم التالي ⏭️' : 'Next Album ⏭️') : (isRtl ? 'الخطوة التالية ➡️' : 'Next Step ➡️')}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── STAGES: PHASES 1, 2, 3 (ACTIVE PLAYING PARTICIPANTS GRID) ── */}
      {phase !== 'album' && (
        <div className="w-full rounded-3xl bg-[#140820]/90 border-2 border-pink-500/30 backdrop-blur-xl p-8 shadow-2xl min-h-[540px] flex flex-col justify-between">
          <div>
            <div className="text-center mb-8">
              <span className="text-4xl mb-2 inline-block animate-bounce">
                {phase === 'prompt' ? '✍️' : phase === 'drawing' ? '🎨' : '🧐'}
              </span>
              <h3 className="text-3xl font-black text-white">
                {phase === 'prompt'
                  ? (isRtl ? 'اللاعبون يكتبون أفكارهم على هواتفهم الآن...' : 'Players are typing their anime prompts...')
                  : phase === 'drawing'
                  ? (isRtl ? 'اللاعبون يرسمون العبارات التي وصلتهم الآن!' : 'Players are drawing on their screens!')
                  : (isRtl ? 'اللاعبون يخمنون ما في الرسومات الآن!' : 'Players are guessing what the drawings mean!')}
              </h3>
              <p className="text-sm text-pink-200/70 mt-1">
                {isRtl
                  ? 'ستتحول الشاشة للألبوم النهائي فور انتهاء الوقت أو اكتمال إرسال الجميع!'
                  : 'The grand album presentation will reveal once everyone submits or time expires!'}
              </p>
            </div>

            {/* Participants Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
              {participants.map((p) => {
                const isReady = Boolean(submissions[p.id])

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
                      isReady
                        ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100 shadow-lg scale-105'
                        : 'bg-white/5 border-white/10 text-pink-200/70'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-2xl mb-2">
                      {getParticipantAvatar(p)}
                    </div>
                    <span className="font-bold text-xs truncate w-full text-white">
                      {p.nickname}
                    </span>
                    <span className="text-[11px] font-bold mt-1">
                      {isReady ? (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>{isRtl ? 'جاهز ✅' : 'Ready ✅'}</span>
                        </span>
                      ) : (
                        <span className="text-amber-300 animate-pulse">
                          {phase === 'prompt'
                            ? isRtl ? 'يكتب...' : 'Typing...'
                            : phase === 'drawing'
                            ? isRtl ? 'يرسم...' : 'Drawing...'
                            : isRtl ? 'يخمن...' : 'Guessing...'}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-center text-xs text-pink-300/50 pt-4 border-t border-pink-500/15">
            {isRtl ? '🌸 نادي ساكورا للأنمي • جامعة صحار' : '🌸 Sakura Anime Club • Sohar University'}
          </div>
        </div>
      )}

      {/* ── STAGE 4: THE GRAND ALBUM PRESENTATION SHOWCASE ── */}
      {phase === 'album' && currentChain && (
        <div className="w-full rounded-3xl bg-[#140820]/95 border-2 border-pink-500/30 backdrop-blur-xl p-8 shadow-2xl min-h-[580px] flex flex-col justify-between animate-scale-in">
          <div>
            {/* Album Chain Header */}
            <div className="flex items-center justify-between pb-4 border-b border-pink-500/20 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/30 to-purple-600/30 border border-pink-400/40 flex items-center justify-center text-2xl shadow-lg">
                  🌸
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-black text-white">
                    {isRtl
                      ? `سلسلة فكرة: ${currentChain.ownerNickname} 🎉`
                      : `Story Chain by: ${currentChain.ownerNickname} 🎉`}
                  </h3>
                  <span className="text-xs text-pink-300/80 font-bold">
                    {isRtl ? `الألبوم ${albumIdx + 1} من أصل ${chainList.length}` : `Album ${albumIdx + 1} of ${chainList.length}`}
                  </span>
                </div>
              </div>

              {/* Progress Steps Indicators */}
              <div className="flex items-center gap-2">
                {currentChain.turns.map((_, tIdx) => (
                  <span
                    key={tIdx}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      tIdx <= slideStep
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 scale-110 shadow-md shadow-pink-500/40'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Slide-by-slide Transformation Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
              {/* Step 1: Original Prompt */}
              {currentChain.turns[0] && (
                <div
                  className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all duration-500 ${
                    slideStep >= 0
                      ? 'bg-purple-950/60 border-purple-400 shadow-xl shadow-purple-900/30 scale-[1.02]'
                      : 'opacity-20 bg-white/5 border-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300 mb-3">
                      <span>1. {isRtl ? 'الفكرة الأصلية' : 'Original Prompt'}</span>
                      <span>✍️ {currentChain.turns[0].nickname}</span>
                    </div>
                    <p className="text-lg lg:text-xl font-black text-white leading-relaxed">
                      &ldquo;{currentChain.turns[0].content}&rdquo;
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-purple-500/20 text-[11px] text-purple-300/70 font-semibold">
                    {isRtl ? 'هنا بدأت القصة!' : 'Where it all started!'}
                  </div>
                </div>
              )}

              {/* Step 2: The Drawing */}
              {currentChain.turns[1] && (
                <div
                  className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all duration-500 ${
                    slideStep >= 1
                      ? 'bg-pink-950/60 border-pink-400 shadow-xl shadow-pink-900/30 scale-[1.02]'
                      : 'opacity-20 bg-white/5 border-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-pink-300 mb-3">
                      <span>2. {isRtl ? 'الرسمة التوضيحية' : 'The Drawing'}</span>
                      <span>🎨 {currentChain.turns[1].nickname}</span>
                    </div>

                    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-pink-500/40 bg-[#1c1026] flex items-center justify-center shadow-inner">
                      {slideStep >= 1 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentChain.turns[1].content}
                          alt="Telephone Drawing"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-3xl text-pink-300/30">🎨 ???</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-pink-500/20 text-[11px] text-pink-300/70 font-semibold">
                    {isRtl ? 'رسمة تم رسمها في 70 ثانية!' : 'Illustrated in 70 seconds!'}
                  </div>
                </div>
              )}

              {/* Step 3: Final Description */}
              {currentChain.turns[2] && (
                <div
                  className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all duration-500 ${
                    slideStep >= 2
                      ? 'bg-emerald-950/60 border-emerald-400 shadow-xl shadow-emerald-900/30 scale-[1.02]'
                      : 'opacity-20 bg-white/5 border-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300 mb-3">
                      <span>3. {isRtl ? 'التخمين النهائي' : 'Final Guess'}</span>
                      <span>🧐 {currentChain.turns[2].nickname}</span>
                    </div>
                    {slideStep >= 2 ? (
                      <p className="text-lg lg:text-xl font-black text-emerald-200 leading-relaxed">
                        &ldquo;{currentChain.turns[2].content}&rdquo;
                      </p>
                    ) : (
                      <div className="h-20 flex items-center justify-center text-emerald-300/30 text-2xl font-black">
                        🔒 {isRtl ? 'مخفي حالياً' : 'Hidden'}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-300/70 font-semibold">
                    {isRtl ? 'كيف تحولت الفكرة في النهاية! 😂' : 'What it ended up becoming! 😂'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-pink-500/15">
            <span className="text-xs text-pink-300/70 font-bold flex items-center gap-1.5">
              <span>📱</span>
              <span>{isRtl ? 'أرسل تفاعلاتك الضاحكة من هاتفك الآن لتظهر على الشاشة!' : 'Send live emoji reactions from your phone!'}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 font-bold text-xs"
              >
                {isRtl ? '⬅️ تراجع' : '⬅️ Back'}
              </button>

              <button
                type="button"
                onClick={handleNextSlide}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 text-white font-extrabold text-xs shadow-lg shadow-pink-500/30"
              >
                {slideStep === (currentChain.turns.length - 1)
                  ? (isRtl ? 'الألبوم التالي ⏭️' : 'Next Story ⏭️')
                  : (isRtl ? 'كشف الخطوة التالية 👁️' : 'Reveal Next Step 👁️')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
