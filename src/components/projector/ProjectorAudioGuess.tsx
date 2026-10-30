'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  CheckCircle2,
  Trophy,
  Music,
  Headphones,
} from 'lucide-react'
import { sound } from '@/lib/sound'
import { createClient } from '@/lib/supabase/client'
import type { AudioGuessQuestionData } from '@/lib/gameData'
import type { GameSession, SessionParticipant } from '@/types/database'

interface ProjectorAudioGuessProps {
  session: GameSession
  participants: SessionParticipant[]
  currentQuestion: AudioGuessQuestionData
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

export default function ProjectorAudioGuess({
  session,
  participants,
  currentQuestion,
  questionIndex,
  totalQuestions,
  locale = 'en',
}: ProjectorAudioGuessProps) {
  const isRtl = locale === 'ar'
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const totalSeconds = currentQuestion.total_time_seconds || 30
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [solvers, setSolvers] = useState<LiveSolver[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const isRevealed =
    session.status === 'answer_reveal' ||
    session.status === 'round_results' ||
    session.status === 'final_results'

  const timeLeft = Math.max(0, totalSeconds - elapsedSeconds)

  // Reset states when question changes
  useEffect(() => {
    setElapsedSeconds(0)
    setSolvers([])
    setIsPlaying(false)

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }, [currentQuestion.id, questionIndex])

  // Play audio on mount
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
    }
  }, [])

  // Timer interval on projector with auto-reveal on timeout
  useEffect(() => {
    if (isRevealed) {
      if (audioRef.current && !isPlaying) {
        // Stop audio upon reveal
      }
      return
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= totalSeconds - 1) {
          clearInterval(timer)
          sound.playBuzzer()
          // Automatically advance to answer_reveal when time expires
          supabase
            .from('game_sessions')
            .update({ status: 'answer_reveal' })
            .eq('id', session.id)
            .then(() => {})
          return totalSeconds
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRevealed, totalSeconds, session.id, supabase, isPlaying])

  // Listen for solver broadcasts
  useEffect(() => {
    const channel = supabase
      .channel(`audio_stream_${session.id}`)
      .on('broadcast', { event: 'audio_solve' }, (payload) => {
        const solver = payload.payload as LiveSolver
        setSolvers((prev) => {
          if (prev.some((s) => s.participantId === solver.participantId)) return prev
          return [...prev, solver]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, supabase])

  // Audio control toggles
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {})
    }
  }

  const handleReplay = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {})
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-6 py-2 animate-fade-in">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentQuestion.audio_url}
        preload="auto"
        autoPlay
        playsInline
      />

      {/* ── TOP HUD: Question Counter, Category & Timer ── */}
      <div className="w-full flex items-center justify-between px-6 py-4 rounded-3xl bg-[#1c0f2a]/90 border border-pink-500/20 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-600/30 border border-pink-400/30 flex items-center justify-center text-pink-300 shadow-md">
            <Music size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-pink-300 font-bold">
                {isRtl ? 'المقطع الصوتي' : 'Audio Track'} {questionIndex + 1} / {totalQuestions}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-200 text-xs font-bold border border-pink-400/20">
                {isRtl ? currentQuestion.anime_origin_ar : currentQuestion.anime_origin}
              </span>
            </div>
            <h3 className="text-base lg:text-lg font-black text-white mt-0.5">
              {isRtl ? currentQuestion.title_ar : currentQuestion.title}
            </h3>
          </div>
        </div>

        {/* Kahoot-Style Speed Timer */}
        <div
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all ${
            timeLeft <= 5 && !isRevealed
              ? 'bg-rose-500/30 border-rose-500/60 text-rose-200 animate-pulse scale-105 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'bg-pink-500/15 border-pink-400/30 text-pink-200 shadow-md'
          }`}
        >
          <Clock size={20} className={timeLeft <= 5 && !isRevealed ? 'text-rose-400' : 'text-pink-300'} />
          <span className="font-mono text-2xl font-black">{timeLeft}s</span>
        </div>
      </div>

      {/* ── MAIN STAGE: Visualizer & Audio Stage ── */}
      <div className="w-full rounded-3xl bg-gradient-to-b from-[#1a0f28] to-[#12081d] border-2 border-pink-500/30 p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
        {/* Ambient glow backgrounds */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

        {isRevealed ? (
          /* REVEAL SCREEN */
          <div className="w-full flex flex-col items-center text-center animate-scale-in z-10 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)] mb-1">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold block">
                {isRtl ? 'الإجابة الصحيحة 🎉' : 'Correct Answer 🎉'}
              </span>
              <h2 className="text-3xl lg:text-5xl font-black text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                {currentQuestion.answer_ar}
              </h2>
              <div className="text-lg lg:text-xl text-pink-300 font-semibold">
                ({currentQuestion.answer})
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-lg text-xs lg:text-sm text-pink-200/80">
              <span className="font-bold text-pink-300">💡 {isRtl ? 'التلميح:' : 'Clue:'} </span>
              <span>{isRtl ? currentQuestion.hint_ar : currentQuestion.hint}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
              <Trophy size={16} />
              <span>
                {solvers.length} / {participants.length} {isRtl ? 'عرفوا الإجابة بنجاح' : 'solved correctly'}
              </span>
            </div>
          </div>
        ) : (
          /* PLAYING / AUDIO VISUALIZER SCREEN */
          <div className="w-full flex flex-col items-center justify-center z-10 space-y-6">
            {/* Equalizer Wave Animation */}
            <div className="flex items-end justify-center gap-2 h-32 w-full max-w-md px-4">
              {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 50, 100, 60, 75, 40].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height: isPlaying ? `${h}%` : '15%',
                    transition: 'height 180ms ease',
                    animationDelay: `${i * 70}ms`,
                  }}
                  className={`flex-1 rounded-full transition-all ${
                    isPlaying
                      ? 'bg-gradient-to-t from-pink-600 via-rose-500 to-amber-300 shadow-[0_0_12px_rgba(244,167,197,0.5)] animate-pulse'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Audio Prompt & Controls */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/15 border border-pink-400/30 text-pink-200 text-xs font-bold">
                <Headphones size={15} />
                <span>
                  {isPlaying
                    ? isRtl ? 'المقطع الصوتي قيد التشغيل الآن 🎵' : 'Audio is playing now 🎵'
                    : isRtl ? 'المقطع الصوتي متوقف مؤقتاً' : 'Audio is paused'}
                </span>
              </div>
              <p className="text-sm text-pink-200/70 font-medium max-w-md">
                {isRtl
                  ? 'استمع جيداً للنغمة وخمّن الأنمي عبر هاتفك بأسرع ما يمكن!'
                  : 'Listen closely to the audio track and guess the anime on your phone!'}
              </p>
            </div>

            {/* Quick Projector Audio Bar */}
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-black/40 border border-pink-500/20 backdrop-blur-md">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
              </button>

              <button
                onClick={handleReplay}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 border border-pink-500/20 flex items-center justify-center transition-colors"
                title="Replay from start"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 border border-pink-500/20 flex items-center justify-center transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LIVE SOLVERS TICKER ── */}
      {solvers.length > 0 && (
        <div className="w-full px-6 py-4 rounded-2xl bg-[#1c0f2a]/80 border border-pink-500/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xl">
          <div className="flex items-center gap-2 text-pink-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={16} className="text-amber-400" />
            <span>{isRtl ? 'الأسرع في تخمين الأوست:' : 'Fastest Solvers:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {solvers.map((s, idx) => (
              <div
                key={s.participantId}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold shadow-sm animate-scale-in"
              >
                <span>{idx === 0 ? '⚡ 🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨'}</span>
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
